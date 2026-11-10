package com.wakboys.push;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "push_subscription")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long memberId;
    private String endpoint;
    private String p256dh;
    private String auth;
    private Instant createdAt;

    public PushSubscription(Long memberId, String endpoint, String p256dh, String auth) {
        this.memberId = memberId;
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
        this.createdAt = Instant.now();
    }

    public void reassign(Long memberId, String p256dh, String auth) {
        this.memberId = memberId;
        this.p256dh = p256dh;
        this.auth = auth;
    }
}
