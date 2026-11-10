package com.wakboys.social;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "reaction")
@Getter
@Setter
@NoArgsConstructor
public class Reaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String targetType;
    private Long targetId;
    private Long memberId;
    private String reaction;
    private Instant createdAt = Instant.now();
}
