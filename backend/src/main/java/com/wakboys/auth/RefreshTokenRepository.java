package com.wakboys.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("delete from RefreshToken r where r.memberId = :memberId")
    void deleteByMemberId(Long memberId);

    @Modifying
    @Query("delete from RefreshToken r where r.expiresAt < :now")
    void deleteExpired(Instant now);
}
