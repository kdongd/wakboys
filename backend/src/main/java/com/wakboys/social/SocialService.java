package com.wakboys.social;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.TargetType;
import com.wakboys.media.Media;
import com.wakboys.media.MediaRepository;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Comments and character reactions on photos/videos and posts.
 * A reaction is one of the standard keys; the frontend shows the reacting member's own
 * expression image for that key (e.g. 이재호's "angry" slot shows his 현타 face).
 */
@Service
@RequiredArgsConstructor
public class SocialService {

    public static final Set<String> REACTIONS = Set.of("happy", "cool", "surprised", "angry");

    private final CommentRepository commentRepository;
    private final ReactionRepository reactionRepository;
    private final MediaRepository mediaRepository;
    private final PostRepository postRepository;
    private final MemberDirectory members;
    private final PushService pushService;

    public record ReactionDto(Long memberId, String reaction) {}

    public record Social(int commentCount, List<ReactionDto> reactions, String mine) {}

    public record CommentDto(Long id, MemberDto author, String body, Instant createdAt) {}

    @Transactional(readOnly = true)
    public Map<Long, Social> summaries(TargetType type, List<Long> ids, Long me) {
        Map<Long, Social> out = new HashMap<>();
        if (ids.isEmpty()) {
            return out;
        }
        Map<Long, Integer> counts = new HashMap<>();
        for (Object[] row : commentRepository.countGrouped(type.name(), ids)) {
            counts.put((Long) row[0], ((Number) row[1]).intValue());
        }
        Map<Long, List<ReactionDto>> reactions = new HashMap<>();
        Map<Long, String> mine = new HashMap<>();
        for (Reaction r : reactionRepository.findByTargetTypeAndTargetIdInOrderByIdAsc(type.name(), ids)) {
            reactions.computeIfAbsent(r.getTargetId(), k -> new ArrayList<>()).add(new ReactionDto(r.getMemberId(), r.getReaction()));
            if (r.getMemberId().equals(me)) {
                mine.put(r.getTargetId(), r.getReaction());
            }
        }
        for (Long id : ids) {
            out.put(id, new Social(counts.getOrDefault(id, 0), reactions.getOrDefault(id, List.of()), mine.get(id)));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public Social summary(TargetType type, Long id, Long me) {
        return summaries(type, List.of(id), me).get(id);
    }

    /** reaction == null removes mine. Tapping the same one again also removes it (handled by the client). */
    @Transactional
    public Social react(MemberPrincipal me, TargetType type, Long id, String reaction) {
        requireTarget(type, id);
        Optional<Reaction> existing = reactionRepository.findByTargetTypeAndTargetIdAndMemberId(type.name(), id, me.id());
        if (reaction == null || reaction.isBlank()) {
            existing.ifPresent(reactionRepository::delete);
        } else {
            if (!REACTIONS.contains(reaction)) {
                throw ApiException.badRequest("없는 리액션이에요");
            }
            Reaction r = existing.orElseGet(Reaction::new);
            r.setTargetType(type.name());
            r.setTargetId(id);
            r.setMemberId(me.id());
            r.setReaction(reaction);
            r.setCreatedAt(Instant.now());
            reactionRepository.save(r);
        }
        reactionRepository.flush();
        return summary(type, id, me.id());
    }

    @Transactional(readOnly = true)
    public List<CommentDto> comments(TargetType type, Long id) {
        Map<Long, MemberDto> dto = members.dtoMap();
        return commentRepository.findByTargetTypeAndTargetIdOrderByIdAsc(type.name(), id).stream()
                .map(c -> new CommentDto(c.getId(), dto.get(c.getAuthorId()), c.getBody(), c.getCreatedAt()))
                .toList();
    }

    @Transactional
    public CommentDto addComment(MemberPrincipal me, TargetType type, Long id, String body) {
        Target t = requireTarget(type, id);
        if (body == null || body.isBlank()) {
            throw ApiException.badRequest("댓글을 입력해주세요");
        }
        if (body.length() > 1000) {
            throw ApiException.badRequest("댓글은 1000자까지예요");
        }
        Comment c = new Comment();
        c.setTargetType(type.name());
        c.setTargetId(id);
        c.setAuthorId(me.id());
        c.setBody(body.trim());
        commentRepository.save(c);
        if (!t.ownerId().equals(me.id())) {
            String preview = c.getBody().length() > 40 ? c.getBody().substring(0, 40) + "…" : c.getBody();
            pushService.send(List.of(t.ownerId()), "💬 " + me.name() + "님의 댓글", preview, t.url());
        }
        return new CommentDto(c.getId(), members.dto(me.id()), c.getBody(), c.getCreatedAt());
    }

    @Transactional
    public void deleteComment(MemberPrincipal me, Long commentId) {
        Comment c = commentRepository.findById(commentId).orElseThrow(() -> ApiException.notFound("댓글"));
        me.requireOwnerOrAdmin(c.getAuthorId());
        commentRepository.delete(c);
    }

    @Transactional
    public void deleteFor(TargetType type, Long id) {
        commentRepository.deleteForTarget(type.name(), id);
        reactionRepository.deleteForTarget(type.name(), id);
    }

    private record Target(Long ownerId, String url) {}

    private Target requireTarget(TargetType type, Long id) {
        return switch (type) {
            case MEDIA -> {
                Media m = mediaRepository.findById(id).orElseThrow(() -> ApiException.notFound("사진"));
                String url = m.getTripId() != null ? "/trips/" + m.getTripId() + "?media=" + m.getId() : "/feed?post=" + m.getPostId();
                yield new Target(m.getUploaderId(), url);
            }
            case POST -> {
                Post p = postRepository.findById(id).orElseThrow(() -> ApiException.notFound("글"));
                yield new Target(p.getAuthorId(), "/feed?post=" + p.getId());
            }
            default -> throw ApiException.badRequest("지원하지 않는 대상이에요");
        };
    }
}
