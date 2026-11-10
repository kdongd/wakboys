package com.wakboys.social;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReactionRepository extends JpaRepository<Reaction, Long> {

    List<Reaction> findByTargetTypeAndTargetIdInOrderByIdAsc(String targetType, Collection<Long> targetIds);

    Optional<Reaction> findByTargetTypeAndTargetIdAndMemberId(String targetType, Long targetId, Long memberId);

    @Modifying
    @Query("delete from Reaction r where r.targetType = :type and r.targetId = :id")
    void deleteForTarget(String type, Long id);
}
