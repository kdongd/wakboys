package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ChecklistCheckRepository extends JpaRepository<ChecklistCheck, Long> {

    List<ChecklistCheck> findByItemIdIn(Collection<Long> itemIds);

    Optional<ChecklistCheck> findByItemIdAndMemberId(Long itemId, Long memberId);
}
