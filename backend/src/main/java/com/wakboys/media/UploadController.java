package com.wakboys.media;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private static final long MAX_IMAGE = 25L * 1024 * 1024;
    private static final long MAX_VIDEO = 500L * 1024 * 1024;

    private final StorageService storage;

    public record FileRequest(String contentType, long size) {}

    public record PresignRequest(List<FileRequest> files) {}

    public record Slot(String key, String uploadUrl, String thumbKey, String thumbUploadUrl) {}

    /** Every file gets an original slot and a thumbnail slot (the browser makes a small webp). */
    @PostMapping("/presign")
    public List<Slot> presign(@AuthenticationPrincipal MemberPrincipal me, @RequestBody PresignRequest req) {
        if (req.files() == null || req.files().isEmpty() || req.files().size() > 50) {
            throw ApiException.badRequest("한 번에 50개까지 올릴 수 있어요");
        }
        List<Slot> slots = new ArrayList<>();
        for (FileRequest f : req.files()) {
            String ct = f.contentType() == null ? "" : f.contentType().toLowerCase();
            boolean image = ct.startsWith("image/");
            boolean video = ct.startsWith("video/");
            if (!image && !video) {
                throw ApiException.badRequest("사진과 영상만 올릴 수 있어요");
            }
            if (f.size() <= 0 || f.size() > (image ? MAX_IMAGE : MAX_VIDEO)) {
                throw ApiException.badRequest(image ? "사진은 25MB까지예요" : "영상은 500MB까지예요");
            }
            String base = "u/" + me.id() + "/" + Year.now().getValue() + "/" + UUID.randomUUID();
            String key = base + "." + ext(ct);
            String thumbKey = base + "_t.webp";
            slots.add(new Slot(key, storage.presignPut(key, ct), thumbKey, storage.presignPut(thumbKey, "image/webp")));
        }
        return slots;
    }

    // ---- local dev storage (disabled when R2 is configured) ----

    @PutMapping("/local/**")
    public void putLocal(HttpServletRequest req) throws IOException {
        storage.writeLocal(keyOf(req), req.getInputStream());
    }

    @GetMapping("/local/**")
    public ResponseEntity<Resource> getLocal(HttpServletRequest req) {
        Path p = storage.readLocal(keyOf(req));
        if (!Files.exists(p)) {
            return ResponseEntity.notFound().build();
        }
        Resource r = new FileSystemResource(p);
        return ResponseEntity.ok()
                .contentType(MediaTypeFactory.getMediaType(r).orElse(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM))
                .body(r);
    }

    private static String keyOf(HttpServletRequest req) {
        String uri = req.getRequestURI();
        return uri.substring(uri.indexOf("/api/uploads/local/") + "/api/uploads/local/".length());
    }

    static String ext(String contentType) {
        return switch (contentType) {
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            case "image/gif" -> "gif";
            case "image/heic" -> "heic";
            case "image/heif" -> "heif";
            case "video/mp4" -> "mp4";
            case "video/quicktime" -> "mov";
            case "video/webm" -> "webm";
            default -> contentType.startsWith("video/") ? "mp4" : "bin";
        };
    }
}
