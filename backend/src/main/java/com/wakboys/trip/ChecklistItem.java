package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "checklist_item")
@Getter
@Setter
@NoArgsConstructor
public class ChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private String title;
    private String kind;
    private Long assigneeId;
    private boolean done;
    private Long doneBy;
    private Instant doneAt;
    private Long createdBy;
    private Instant createdAt = Instant.now();
}
