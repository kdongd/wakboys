package com.wakboys.push;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByMemberIdIn(Collection<Long> memberIds);

    boolean existsByMemberId(Long memberId);

    @Modifying
    @Query("delete from PushSubscription s where s.endpoint = :endpoint")
    void deleteByEndpoint(String endpoint);
}
