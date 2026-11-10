package com.wakboys.auth;

import com.wakboys.member.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Reads the bearer token and loads the member fresh from the DB on every request,
 * so a changed role (총무 granted/revoked) or an unlinked account takes effect immediately.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final MemberRepository memberRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            jwtService.parseAccess(header.substring(7))
                    .flatMap(memberRepository::findById)
                    .filter(m -> m.isLinked())
                    .ifPresent(m -> {
                        MemberPrincipal p = MemberPrincipal.of(m);
                        List<SimpleGrantedAuthority> roles = new ArrayList<>();
                        roles.add(new SimpleGrantedAuthority("ROLE_MEMBER"));
                        if (p.admin()) roles.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                        if (p.treasurer()) roles.add(new SimpleGrantedAuthority("ROLE_TREASURER"));
                        SecurityContextHolder.getContext()
                                .setAuthentication(new UsernamePasswordAuthenticationToken(p, null, roles));
                    });
        }
        chain.doFilter(req, res);
    }
}
