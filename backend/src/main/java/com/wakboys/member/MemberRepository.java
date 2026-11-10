package com.wakboys.member;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByKakaoId(Long kakaoId);

    Optional<Member> findByInviteCode(String inviteCode);

    Optional<Member> findBySlug(String slug);

    List<Member> findAllByOrderBySortOrderAsc();

    List<Member> findByTreasurerTrue();
}
