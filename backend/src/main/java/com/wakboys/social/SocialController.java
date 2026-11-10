package com.wakboys.social;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.TargetType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SocialController {

    private final PostService postService;
    private final SocialService socialService;

    public record BodyRequest(String body) {}

    public record CommentRequest(String type, Long id, String body) {}

    public record ReactionRequest(String type, Long id, String reaction) {}

    // ---- posts ----

    @GetMapping("/posts")
    public PostService.PostPage posts(@AuthenticationPrincipal MemberPrincipal me,
                                      @RequestParam(required = false) Long before,
                                      @RequestParam(defaultValue = "20") int size) {
        return postService.page(me, before, size);
    }

    @GetMapping("/posts/{id}")
    public PostService.PostDto post(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        return postService.get(me, id);
    }

    @PostMapping("/posts")
    public PostService.PostDto create(@AuthenticationPrincipal MemberPrincipal me, @RequestBody PostService.PostRequest req) {
        return postService.create(me, req);
    }

    @PatchMapping("/posts/{id}")
    public PostService.PostDto update(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id, @RequestBody BodyRequest req) {
        return postService.update(me, id, req.body());
    }

    @DeleteMapping("/posts/{id}")
    public void delete(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        postService.delete(me, id);
    }

    // ---- comments ----

    @GetMapping("/comments")
    public List<SocialService.CommentDto> comments(@RequestParam String type, @RequestParam Long id) {
        return socialService.comments(type(type), id);
    }

    @PostMapping("/comments")
    public SocialService.CommentDto addComment(@AuthenticationPrincipal MemberPrincipal me, @RequestBody CommentRequest req) {
        return socialService.addComment(me, type(req.type()), req.id(), req.body());
    }

    @DeleteMapping("/comments/{id}")
    public void deleteComment(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        socialService.deleteComment(me, id);
    }

    // ---- reactions ----

    @PutMapping("/reactions")
    public SocialService.Social react(@AuthenticationPrincipal MemberPrincipal me, @RequestBody ReactionRequest req) {
        return socialService.react(me, type(req.type()), req.id(), req.reaction());
    }

    private static TargetType type(String s) {
        try {
            TargetType t = TargetType.valueOf(s == null ? "" : s.toUpperCase());
            if (t == TargetType.COMMENT) throw new IllegalArgumentException();
            return t;
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("대상을 확인해주세요");
        }
    }
}
