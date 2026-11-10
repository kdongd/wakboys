package com.wakboys.member;

import com.wakboys.auth.RefreshTokenRepository;
import com.wakboys.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

/** 운영자(admin) only — guarded by /api/admin/** in SecurityConfig. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final MemberRepository memberRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    public record AdminMember(MemberDto member, boolean linked, String inviteCode, Instant linkedAt) {
        static AdminMember of(Member m) {
            return new AdminMember(MemberDto.of(m), m.isLinked(), m.getInviteCode(), m.getLinkedAt());
        }
    }

    public record TreasurerRequest(boolean value) {}

    @GetMapping("/members")
    public List<AdminMember> members() {
        return memberRepository.findAllByOrderBySortOrderAsc().stream().map(AdminMember::of).toList();
    }

    @PostMapping("/members/{id}/treasurer")
    @Transactional
    public AdminMember treasurer(@PathVariable Long id, @RequestBody TreasurerRequest req) {
        Member m = find(id);
        m.setTreasurer(req.value());
        return AdminMember.of(m);
    }

    /** Detaches the Kakao account (wrong signup, new Kakao account). Records stay with the character. */
    @PostMapping("/members/{id}/unlink")
    @Transactional
    public AdminMember unlink(@PathVariable Long id) {
        Member m = find(id);
        if (m.isAdmin()) {
            throw ApiException.badRequest("운영자 본인 연결은 해제할 수 없어요");
        }
        m.unlink(InviteCodes.generate());
        refreshTokenRepository.deleteByMemberId(m.getId());
        return AdminMember.of(m);
    }

    @PostMapping("/members/{id}/invite-code")
    @Transactional
    public AdminMember regenerate(@PathVariable Long id) {
        Member m = find(id);
        if (m.isLinked()) {
            throw ApiException.badRequest("이미 가입한 멤버예요. 먼저 연결을 해제해주세요");
        }
        m.setInviteCode(InviteCodes.generate());
        return AdminMember.of(m);
    }

    private Member find(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> ApiException.notFound("멤버"));
    }
}
