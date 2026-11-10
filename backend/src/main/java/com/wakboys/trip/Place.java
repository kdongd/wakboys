package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "place")
@Getter
@Setter
@NoArgsConstructor
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String name;
    private String category;
    private String address;
    private String url;
    private String memo;
    private Double lat;
    private Double lng;
    private boolean visited;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
