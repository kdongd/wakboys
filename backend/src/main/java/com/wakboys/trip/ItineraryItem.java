package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "itinerary_item")
@Getter
@Setter
@NoArgsConstructor
public class ItineraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private int dayNo;
    private String startTime;
    private String title;
    private String memo;
    private int sort;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
