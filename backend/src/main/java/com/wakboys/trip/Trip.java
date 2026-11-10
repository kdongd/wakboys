package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "trip")
@Getter
@Setter
@NoArgsConstructor
public class Trip {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int year;
    private String season;
    private String title;
    private String destination;
    private Double lat;
    private Double lng;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long settleReceiverId;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
