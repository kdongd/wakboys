package com.wakboys.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String baseUrl,
        boolean devLogin,
        Jwt jwt,
        boolean cookieSecure,
        Kakao kakao,
        R2 r2,
        Push push
) {
    public record Jwt(String secret, long accessTtlMinutes, long refreshTtlDays) {}

    public record Kakao(String restApiKey, String clientSecret, String jsKey) {}

    public record R2(String accountId, String accessKeyId, String secretAccessKey, String bucket, String publicBaseUrl) {
        public boolean configured() {
            return notBlank(accountId) && notBlank(accessKeyId) && notBlank(secretAccessKey) && notBlank(bucket);
        }
    }

    public record Push(String publicKey, String privateKey, String subject) {
        public boolean configured() {
            return notBlank(publicKey) && notBlank(privateKey);
        }
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
