package com.wakboys.dues;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "dues_expense")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuesExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private int amount;
    private LocalDate spentOn;
    private Long createdBy;
    private Instant createdAt;

    public DuesExpense(String title, int amount, LocalDate spentOn, Long createdBy) {
        this.title = title;
        this.amount = amount;
        this.spentOn = spentOn;
        this.createdBy = createdBy;
        this.createdAt = Instant.now();
    }
}
