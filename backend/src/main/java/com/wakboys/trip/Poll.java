package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "poll")
@Getter
@Setter
@NoArgsConstructor
public class Poll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String category;
    private String question;
    private boolean multiple;
    private Instant closesAt;
    private boolean closed;
    private Long createdBy;
    private Instant createdAt = Instant.now();

    public boolean isOpen() {
        return !closed && (closesAt == null || closesAt.isAfter(Instant.now()));
    }
}
