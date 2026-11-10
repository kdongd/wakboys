package com.wakboys.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wakboys.config.AppProperties;
import com.wakboys.member.Member;
import com.wakboys.member.MemberRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Security;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/** Web Push (VAPID). Silently does nothing when VAPID keys aren't configured. */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushService {

    private final AppProperties props;
    private final PushSubscriptionRepository repository;
    private final MemberRepository memberRepository;
    private final ObjectMapper objectMapper;

    private nl.martijndwars.webpush.PushService client;

    @PostConstruct
    void init() {
        if (!props.push().configured()) {
            log.info("[push] VAPID keys not set — push notifications disabled");
            return;
        }
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            client = new nl.martijndwars.webpush.PushService(
                    props.push().publicKey(), props.push().privateKey(), props.push().subject());
        } catch (Exception e) {
            log.error("[push] failed to initialise VAPID client", e);
        }
    }

    public boolean enabled() {
        return client != null;
    }

    public String publicKey() {
        return props.push().publicKey();
    }

    @Transactional
    public void subscribe(Long memberId, String endpoint, String p256dh, String auth) {
        repository.findByEndpoint(endpoint).ifPresentOrElse(
                s -> s.reassign(memberId, p256dh, auth),
                () -> repository.save(new PushSubscription(memberId, endpoint, p256dh, auth)));
    }

    @Transactional
    public void unsubscribe(String endpoint) {
        repository.deleteByEndpoint(endpoint);
    }

    @Transactional(readOnly = true)
    public boolean hasSubscription(Long memberId) {
        return repository.existsByMemberId(memberId);
    }

    /** Everyone except the person who did the thing. */
    @Async
    public void sendToAllExcept(Long actorId, String title, String body, String url) {
        List<Long> ids = memberRepository.findAll().stream()
                .filter(Member::isLinked)
                .map(Member::getId)
                .filter(id -> !id.equals(actorId))
                .toList();
        deliver(ids, title, body, url);
    }

    @Async
    public void send(Collection<Long> memberIds, String title, String body, String url) {
        deliver(memberIds, title, body, url);
    }

    /** Synchronous variant for scheduled jobs and the test button. */
    public int deliver(Collection<Long> memberIds, String title, String body, String url) {
        if (client == null || memberIds.isEmpty()) {
            return 0;
        }
        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of("title", title, "body", body, "url", url == null ? "/" : url));
        } catch (Exception e) {
            return 0;
        }
        int sent = 0;
        for (PushSubscription s : repository.findByMemberIdIn(memberIds)) {
            try {
                var res = client.send(new Notification(s.getEndpoint(), s.getP256dh(), s.getAuth(), payload));
                int code = res.getStatusLine().getStatusCode();
                if (code == 404 || code == 410) {
                    repository.delete(s); // subscription expired on the browser side
                } else if (code < 300) {
                    sent++;
                } else {
                    log.warn("[push] {} -> HTTP {}", s.getMemberId(), code);
                }
            } catch (Exception e) {
                log.warn("[push] send failed for member {}: {}", s.getMemberId(), e.getMessage());
            }
        }
        return sent;
    }
}
