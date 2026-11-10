package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItineraryItemRepository extends JpaRepository<ItineraryItem, Long> {

    List<ItineraryItem> findByTripId(Long tripId);

    long countByTripId(Long tripId);
}
