package com.wakboys.dues;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "dues_payment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuesPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long memberId;
    private String ym;
    private int amount;
    private Long checkedBy;
    private Instant checkedAt;

    public DuesPayment(Long memberId, String ym, int amount, Long checkedBy) {
        this.memberId = memberId;
        this.ym = ym;
        this.amount = amount;
        this.checkedBy = checkedBy;
        this.checkedAt = Instant.now();
    }
}
