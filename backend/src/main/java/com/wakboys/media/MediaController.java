package com.wakboys.media;

import com.wakboys.auth.MemberPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    public record AddRequest(List<MediaService.NewMedia> items) {}

    @GetMapping("/trips/{id}/media")
    public MediaService.MediaPage page(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                       @RequestParam(required = false) Long before,
                                       @RequestParam(defaultValue = "60") int size) {
        return mediaService.page(me, id, before, size);
    }

    @PostMapping("/trips/{id}/media")
    public List<MediaService.MediaDto> add(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                           @RequestBody AddRequest req) {
        return mediaService.addToTrip(me, id, req.items());
    }

    @GetMapping("/media/{id}")
    public MediaService.MediaViewer one(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        return mediaService.viewer(me, id);
    }

    @DeleteMapping("/media/{id}")
    public void delete(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        mediaService.delete(me, id);
    }
}
