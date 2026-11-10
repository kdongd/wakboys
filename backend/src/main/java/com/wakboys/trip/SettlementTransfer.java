package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "settlement_transfer")
@Getter
@Setter
@NoArgsConstructor
public class SettlementTransfer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private Long fromMemberId;
    private Long toMemberId;
    private int amount;
    private Instant sentAt = Instant.now();
}
