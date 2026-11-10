package com.wakboys.auth;

import com.wakboys.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private static final String TYPE = "typ";

    private final SecretKey key;
    private final Duration accessTtl;

    public JwtService(AppProperties props) {
        this.key = Keys.hmacShaKeyFor(props.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.accessTtl = Duration.ofMinutes(props.jwt().accessTtlMinutes());
    }

    public String accessToken(Long memberId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(memberId))
                .claim(TYPE, "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key)
                .compact();
    }

    /** Short-lived token proving "this Kakao account logged in but isn't linked yet". */
    public String signupToken(long kakaoId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(kakaoId))
                .claim(TYPE, "signup")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(Duration.ofMinutes(15))))
                .signWith(key)
                .compact();
    }

    public Optional<Long> parseAccess(String token) {
        return parse(token, "access");
    }

    public Optional<Long> parseSignup(String token) {
        return parse(token, "signup");
    }

    private Optional<Long> parse(String token, String type) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            if (!type.equals(c.get(TYPE, String.class))) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(c.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
