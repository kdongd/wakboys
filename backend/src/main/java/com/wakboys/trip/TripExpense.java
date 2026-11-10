package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "trip_expense")
@Getter
@Setter
@NoArgsConstructor
public class TripExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String title;
    private int amount;
    private Long paidBy;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
