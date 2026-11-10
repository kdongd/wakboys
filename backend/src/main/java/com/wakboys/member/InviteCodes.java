package com.wakboys.member;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;

/**
 * One personal invite code per character. Each code is bound to exactly one member,
 * so nobody can pick someone else's character by mistake.
 * On startup, any unlinked member without a code gets one, and unlinked codes are logged
 * so the admin can sign up the very first time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class InviteCodes implements ApplicationRunner {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final MemberRepository memberRepository;

    public static String generate() {
        StringBuilder sb = new StringBuilder("WAK-");
        for (int i = 0; i < 6; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (Member m : memberRepository.findAllByOrderBySortOrderAsc()) {
            if (m.isLinked()) {
                continue;
            }
            if (m.getInviteCode() == null) {
                m.setInviteCode(generate());
            }
            log.info("[invite] {} ({}) -> {}", m.getName(), m.getSlug(), m.getInviteCode());
        }
    }
}
