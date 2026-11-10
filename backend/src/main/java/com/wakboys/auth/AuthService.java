package com.wakboys.auth;

import com.wakboys.common.ApiException;
import com.wakboys.config.AppProperties;
import com.wakboys.member.Member;
import com.wakboys.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final MemberRepository memberRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final KakaoClient kakaoClient;
    private final AppProperties props;

    public record Session(Member member, String accessToken, String refreshToken) {}

    /** Either a logged-in session, or a signup token when this Kakao account isn't linked yet. */
    public record KakaoResult(Session session, String signupToken) {}

    @Transactional
    public KakaoResult kakaoLogin(String code, String redirectUri) {
        long kakaoId = kakaoClient.fetchKakaoId(code, redirectUri);
        Optional<Member> linked = memberRepository.findByKakaoId(kakaoId);
        if (linked.isPresent()) {
            return new KakaoResult(issue(linked.get()), null);
        }
        return new KakaoResult(null, jwtService.signupToken(kakaoId));
    }

    @Transactional(readOnly = true)
    public Member previewInvite(String signupToken, String code) {
        requireSignup(signupToken);
        return findInvite(code);
    }

    @Transactional
    public Session confirmInvite(String signupToken, String code) {
        long kakaoId = requireSignup(signupToken);
        if (memberRepository.findByKakaoId(kakaoId).isPresent()) {
            throw ApiException.badRequest("이미 다른 캐릭터에 연결된 카카오 계정이에요");
        }
        Member member = findInvite(code);
        member.link(kakaoId);
        return issue(member);
    }

    @Transactional
    public Session devLogin(String slug) {
        if (!props.devLogin()) {
            throw ApiException.notFound("페이지");
        }
        Member m = memberRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("멤버"));
        if (!m.isLinked()) {
            m.link(-m.getId());
        }
        return issue(m);
    }

    /** Rotates the refresh token: the old one is consumed, a new one is returned (sliding 30 days). */
    @Transactional
    public Session refresh(String rawRefreshToken) {
        if (rawRefreshToken == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요");
        }
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash(rawRefreshToken))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요"));
        refreshTokenRepository.delete(stored);
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요");
        }
        Member m = memberRepository.findById(stored.getMemberId())
                .filter(Member::isLinked)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "다시 로그인해주세요"));
        return issue(m);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null) {
            refreshTokenRepository.findByTokenHash(hash(rawRefreshToken)).ifPresent(refreshTokenRepository::delete);
        }
    }

    @Scheduled(cron = "0 0 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void purgeExpired() {
        refreshTokenRepository.deleteExpired(Instant.now());
    }

    private Session issue(Member m) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant exp = Instant.now().plus(Duration.ofDays(props.jwt().refreshTtlDays()));
        refreshTokenRepository.save(new RefreshToken(m.getId(), hash(raw), exp));
        return new Session(m, jwtService.accessToken(m.getId()), raw);
    }

    private long requireSignup(String signupToken) {
        return jwtService.parseSignup(signupToken)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "시간이 지났어요. 카카오 로그인부터 다시 해주세요"));
    }

    private Member findInvite(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        if (!normalized.startsWith("WAK-")) {
            normalized = "WAK-" + normalized;
        }
        return memberRepository.findByInviteCode(normalized)
                .filter(m -> !m.isLinked())
                .orElseThrow(() -> ApiException.badRequest("유효하지 않은 초대 코드예요"));
    }

    static String hash(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
