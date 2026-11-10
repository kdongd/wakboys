package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {

    List<ChecklistItem> findByTripIdOrderByIdAsc(Long tripId);
}
