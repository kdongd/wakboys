package com.wakboys.push;

import com.wakboys.auth.MemberPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {

    private final PushService pushService;

    public record Keys(@NotBlank String p256dh, @NotBlank String auth) {}

    public record SubscribeRequest(@NotBlank String endpoint, @NotNull @Valid Keys keys) {}

    public record EndpointRequest(@NotBlank String endpoint) {}

    @GetMapping("/public-key")
    public Map<String, Object> publicKey() {
        return Map.of("enabled", pushService.enabled(), "publicKey", pushService.enabled() ? pushService.publicKey() : "");
    }

    @GetMapping("/status")
    public Map<String, Object> status(@AuthenticationPrincipal MemberPrincipal me) {
        return Map.of("subscribed", pushService.hasSubscription(me.id()));
    }

    @PostMapping("/subscribe")
    public void subscribe(@AuthenticationPrincipal MemberPrincipal me, @RequestBody @Valid SubscribeRequest req) {
        pushService.subscribe(me.id(), req.endpoint(), req.keys().p256dh(), req.keys().auth());
    }

    @PostMapping("/unsubscribe")
    public void unsubscribe(@RequestBody @Valid EndpointRequest req) {
        pushService.unsubscribe(req.endpoint());
    }

    @PostMapping("/test")
    public Map<String, Integer> test(@AuthenticationPrincipal MemberPrincipal me) {
        int sent = pushService.deliver(List.of(me.id()), "알림 테스트", "와크보이즈 알림이 잘 와요 👍", "/");
        return Map.of("sent", sent);
    }
}
