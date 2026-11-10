package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {

    long countByStartDateLessThanEqual(LocalDate date);

    Optional<Trip> findByYearAndSeason(int year, String season);
}
