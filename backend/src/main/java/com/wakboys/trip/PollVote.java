package com.wakboys.trip;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "poll_vote")
@Getter
@Setter
@NoArgsConstructor
public class PollVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long pollId;
    private Long optionId;
    private Long memberId;
    private Instant createdAt = Instant.now();
}
