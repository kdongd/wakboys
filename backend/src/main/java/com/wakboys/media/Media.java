package com.wakboys.media;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "media")
@Getter
@Setter
@NoArgsConstructor
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long tripId;
    private Long postId;
    private Long uploaderId;
    private String objectKey;
    private String thumbKey;
    private String contentType;
    private String kind;
    private Integer width;
    private Integer height;
    private Long sizeBytes;
    private Integer durationSec;
    private Instant createdAt = Instant.now();
}
