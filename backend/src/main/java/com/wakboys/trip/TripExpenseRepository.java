package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripExpenseRepository extends JpaRepository<TripExpense, Long> {

    List<TripExpense> findByTripIdOrderByIdAsc(Long tripId);
}
