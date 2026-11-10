package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlaceRepository extends JpaRepository<Place, Long> {

    List<Place> findByTripIdOrderByIdAsc(Long tripId);

    long countByTripId(Long tripId);
}
