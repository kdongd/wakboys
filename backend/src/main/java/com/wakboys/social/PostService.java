package com.wakboys.social;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.TargetType;
import com.wakboys.media.Media;
import com.wakboys.media.MediaRepository;
import com.wakboys.media.MediaService;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/** 소식 피드 */
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final MediaRepository mediaRepository;
    private final MediaService mediaService;
    private final SocialService socialService;
    private final MemberDirectory members;
    private final PushService pushService;

    public record PostDto(Long id, MemberDto author, String body, Instant createdAt, boolean edited,
                          List<MediaService.MediaDto> media, SocialService.Social social) {}

    public record PostPage(List<PostDto> items, Long nextCursor) {}

    public record PostRequest(String body, List<MediaService.NewMedia> media) {}

    @Transactional(readOnly = true)
    public PostPage page(MemberPrincipal me, Long before, int size) {
        int s = Math.min(Math.max(size, 1), 50);
        List<Post> rows = before == null
                ? postRepository.findAllByOrderByIdDesc(PageRequest.of(0, s + 1))
                : postRepository.findByIdLessThanOrderByIdDesc(before, PageRequest.of(0, s + 1));
        Long next = null;
        if (rows.size() > s) {
            rows = new ArrayList<>(rows.subList(0, s));
            next = rows.get(rows.size() - 1).getId();
        }
        return new PostPage(toDtos(rows, me.id()), next);
    }

    @Transactional(readOnly = true)
    public PostDto get(MemberPrincipal me, Long id) {
        return toDtos(List.of(find(id)), me.id()).get(0);
    }

    @Transactional
    public PostDto create(MemberPrincipal me, PostRequest r) {
        boolean hasMedia = r.media() != null && !r.media().isEmpty();
        String body = r.body() == null ? "" : r.body().trim();
        if (body.isEmpty() && !hasMedia) {
            throw ApiException.badRequest("내용을 입력해주세요");
        }
        if (body.length() > 3000) {
            throw ApiException.badRequest("3000자까지 쓸 수 있어요");
        }
        Post p = new Post();
        p.setAuthorId(me.id());
        p.setBody(body);
        postRepository.save(p);
        mediaService.saveForPost(me, p.getId(), r.media());
        String preview = body.isEmpty() ? "사진을 올렸어요" : (body.length() > 50 ? body.substring(0, 50) + "…" : body);
        pushService.sendToAllExcept(me.id(), "📰 " + me.name(), preview, "/feed?post=" + p.getId());
        return get(me, p.getId());
    }

    @Transactional
    public PostDto update(MemberPrincipal me, Long id, String body) {
        Post p = find(id);
        if (!p.getAuthorId().equals(me.id())) {
            throw ApiException.forbidden("작성자만 고칠 수 있어요");
        }
        if (body == null || body.length() > 3000) {
            throw ApiException.badRequest("내용을 확인해주세요");
        }
        p.setBody(body.trim());
        p.setUpdatedAt(Instant.now());
        return get(me, id);
    }

    @Transactional
    public void delete(MemberPrincipal me, Long id) {
        Post p = find(id);
        me.requireOwnerOrAdmin(p.getAuthorId());
        mediaService.deleteAllForPost(id);
        socialService.deleteFor(TargetType.POST, id);
        postRepository.delete(p);
    }

    @Transactional(readOnly = true)
    public List<PostDto> latest(MemberPrincipal me, int limit) {
        return toDtos(postRepository.findAllByOrderByIdDesc(PageRequest.of(0, limit)), me.id());
    }

    private Post find(Long id) {
        return postRepository.findById(id).orElseThrow(() -> ApiException.notFound("글"));
    }

    private List<PostDto> toDtos(List<Post> rows, Long me) {
        if (rows.isEmpty()) {
            return List.of();
        }
        List<Long> ids = rows.stream().map(Post::getId).toList();
        Map<Long, List<Media>> media = new HashMap<>();
        mediaRepository.findByPostIdInOrderByIdAsc(ids).forEach(m -> media.computeIfAbsent(m.getPostId(), k -> new ArrayList<>()).add(m));
        Map<Long, SocialService.Social> social = socialService.summaries(TargetType.POST, ids, me);
        Map<Long, MemberDto> dto = members.dtoMap();
        return rows.stream().map(p -> new PostDto(p.getId(), dto.get(p.getAuthorId()), p.getBody(), p.getCreatedAt(),
                p.getUpdatedAt().isAfter(p.getCreatedAt().plusSeconds(5)),
                mediaService.toDtos(media.getOrDefault(p.getId(), List.of()), me),
                social.get(p.getId()))).toList();
    }
}
