package com.wakboys.media;

import com.wakboys.common.ApiException;
import com.wakboys.config.AppProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

/**
 * Cloudflare R2 (S3-compatible). The browser uploads directly with a presigned PUT,
 * so large videos never pass through the Render instance.
 * When R2 isn't configured (local dev), files are stored under ./local-uploads instead.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    private static final Path LOCAL_DIR = Path.of("local-uploads");

    private final AppProperties props;

    private S3Client s3;
    private S3Presigner presigner;

    @PostConstruct
    void init() {
        AppProperties.R2 r2 = props.r2();
        if (!r2.configured()) {
            log.info("[storage] R2 not configured — using local disk ({})", LOCAL_DIR.toAbsolutePath());
            return;
        }
        URI endpoint = URI.create("https://" + r2.accountId() + ".r2.cloudflarestorage.com");
        StaticCredentialsProvider creds = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(r2.accessKeyId(), r2.secretAccessKey()));
        S3Configuration cfg = S3Configuration.builder().pathStyleAccessEnabled(true).build();
        s3 = S3Client.builder().endpointOverride(endpoint).region(Region.of("auto"))
                .credentialsProvider(creds).serviceConfiguration(cfg).build();
        presigner = S3Presigner.builder().endpointOverride(endpoint).region(Region.of("auto"))
                .credentialsProvider(creds).serviceConfiguration(cfg).build();
    }

    public boolean remote() {
        return s3 != null;
    }

    public String presignPut(String key, String contentType) {
        if (!remote()) {
            return "/api/uploads/local/" + key;
        }
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(props.r2().bucket()).key(key).contentType(contentType)
                .cacheControl("public, max-age=31536000, immutable")
                .build();
        return presigner.presignPutObject(b -> b.signatureDuration(Duration.ofMinutes(30)).putObjectRequest(put))
                .url().toString();
    }

    /** Public URL when a public bucket / custom domain is set, otherwise a 12h presigned GET. */
    public String url(String key) {
        if (key == null) {
            return null;
        }
        if (!remote()) {
            return "/api/uploads/local/" + key;
        }
        String base = props.r2().publicBaseUrl();
        if (base != null && !base.isBlank()) {
            return (base.endsWith("/") ? base : base + "/") + key;
        }
        GetObjectRequest get = GetObjectRequest.builder().bucket(props.r2().bucket()).key(key).build();
        return presigner.presignGetObject(b -> b.signatureDuration(Duration.ofHours(12)).getObjectRequest(get))
                .url().toString();
    }

    public boolean exists(String key) {
        if (!remote()) {
            return Files.exists(localPath(key));
        }
        try {
            s3.headObject(HeadObjectRequest.builder().bucket(props.r2().bucket()).key(key).build());
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.warn("[storage] head {} failed: {}", key, e.getMessage());
            return false;
        }
    }

    public void delete(String key) {
        if (key == null) {
            return;
        }
        try {
            if (remote()) {
                s3.deleteObject(DeleteObjectRequest.builder().bucket(props.r2().bucket()).key(key).build());
            } else {
                Files.deleteIfExists(localPath(key));
            }
        } catch (Exception e) {
            log.warn("[storage] delete {} failed: {}", key, e.getMessage());
        }
    }

    // ---- local dev only ----

    public void writeLocal(String key, InputStream in) throws IOException {
        if (remote()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "not found");
        }
        Path p = localPath(key);
        Files.createDirectories(p.getParent());
        Files.copy(in, p, StandardCopyOption.REPLACE_EXISTING);
    }

    public Path readLocal(String key) {
        if (remote()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "not found");
        }
        return localPath(key);
    }

    private Path localPath(String key) {
        if (!key.matches("[A-Za-z0-9/_.-]+") || key.contains("..")) {
            throw ApiException.badRequest("bad key");
        }
        return LOCAL_DIR.resolve(key).normalize();
    }
}
