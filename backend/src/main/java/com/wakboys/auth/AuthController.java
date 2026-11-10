package com.wakboys.auth;

import com.wakboys.config.AppProperties;
import com.wakboys.member.MemberDto;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    static final String COOKIE = "wak_rt";

    private final AuthService authService;
    private final AppProperties props;

    public record KakaoRequest(@NotBlank String code, @NotBlank String redirectUri) {}

    public record InviteRequest(@NotBlank String signupToken, @NotBlank String code) {}

    public record DevLoginRequest(@NotBlank String slug) {}

    /** status: OK (logged in) or NEED_INVITE (first login, ask for the personal invite code). */
    public record LoginResponse(String status, String accessToken, MemberDto member, String signupToken) {}

    public record InvitePreview(MemberDto member) {}

    @PostMapping("/kakao")
    public LoginResponse kakao(@RequestBody @jakarta.validation.Valid KakaoRequest req, HttpServletResponse res) {
        AuthService.KakaoResult r = authService.kakaoLogin(req.code(), req.redirectUri());
        if (r.session() == null) {
            return new LoginResponse("NEED_INVITE", null, null, r.signupToken());
        }
        return ok(r.session(), res);
    }

    @PostMapping("/invite/preview")
    public InvitePreview preview(@RequestBody @jakarta.validation.Valid InviteRequest req) {
        return new InvitePreview(MemberDto.of(authService.previewInvite(req.signupToken(), req.code())));
    }

    @PostMapping("/invite/confirm")
    public LoginResponse confirm(@RequestBody @jakarta.validation.Valid InviteRequest req, HttpServletResponse res) {
        return ok(authService.confirmInvite(req.signupToken(), req.code()), res);
    }

    @PostMapping("/dev-login")
    public LoginResponse devLogin(@RequestBody @jakarta.validation.Valid DevLoginRequest req, HttpServletResponse res) {
        return ok(authService.devLogin(req.slug()), res);
    }

    @PostMapping("/refresh")
    public LoginResponse refresh(@CookieValue(name = COOKIE, required = false) String rt, HttpServletResponse res) {
        try {
            return ok(authService.refresh(rt), res);
        } catch (RuntimeException e) {
            clearCookie(res);
            throw e;
        }
    }

    @PostMapping("/logout")
    public void logout(@CookieValue(name = COOKIE, required = false) String rt, HttpServletResponse res) {
        authService.logout(rt);
        clearCookie(res);
    }

    @GetMapping("/config")
    public java.util.Map<String, Object> config() {
        return java.util.Map.of(
                "kakaoRestApiKey", props.kakao().restApiKey() == null ? "" : props.kakao().restApiKey(),
                "kakaoJsKey", props.kakao().jsKey() == null ? "" : props.kakao().jsKey(),
                "devLogin", props.devLogin());
    }

    private LoginResponse ok(AuthService.Session s, HttpServletResponse res) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE, s.refreshToken())
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(Duration.ofDays(props.jwt().refreshTtlDays()))
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return new LoginResponse("OK", s.accessToken(), MemberDto.of(s.member()), null);
    }

    private void clearCookie(HttpServletResponse res) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE, "")
                .httpOnly(true)
                .secure(props.cookieSecure())
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(0)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
