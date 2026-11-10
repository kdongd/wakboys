package com.wakboys.media;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.TargetType;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import com.wakboys.social.SocialService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;
    private final StorageService storage;
    private final SocialService socialService;
    private final MemberDirectory members;
    private final PushService pushService;
    private final com.wakboys.trip.TripRepository tripRepository;

    public record MediaDto(Long id, Long tripId, Long postId, String kind, String url, String thumbUrl,
                           Integer width, Integer height, Integer durationSec, MemberDto uploader,
                           Instant createdAt, SocialService.Social social) {}

    public record MediaPage(List<MediaDto> items, Long nextCursor) {}

    public record MediaViewer(MediaDto media, Long prevId, Long nextId) {}

    public record NewMedia(String key, String thumbKey, String contentType, Integer width, Integer height,
                           Long size, Integer durationSec) {}

    @Transactional
    public List<MediaDto> addToTrip(MemberPrincipal me, Long tripId, List<NewMedia> items) {
        var trip = tripRepository.findById(tripId).orElseThrow(() -> ApiException.notFound("여행"));
        List<Media> saved = save(me, items, tripId, null);
        long photos = saved.stream().filter(m -> "PHOTO".equals(m.getKind())).count();
        long videos = saved.size() - photos;
        String what = photos > 0 && videos > 0 ? "사진 " + photos + "장, 영상 " + videos + "개"
                : photos > 0 ? "사진 " + photos + "장" : "영상 " + videos + "개";
        pushService.sendToAllExcept(me.id(), "📸 " + trip.getTitle(), me.name() + "님이 " + what + "을 올렸어요",
                "/trips/" + tripId + "?tab=archive");
        return toDtos(saved, me.id());
    }

    /** Used by posts: media rows attached to a post instead of a trip. */
    @Transactional
    public List<Media> saveForPost(MemberPrincipal me, Long postId, List<NewMedia> items) {
        return save(me, items, null, postId);
    }

    private List<Media> save(MemberPrincipal me, List<NewMedia> items, Long tripId, Long postId) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        if (items.size() > 50) {
            throw ApiException.badRequest("한 번에 50개까지 올릴 수 있어요");
        }
        String prefix = "u/" + me.id() + "/";
        List<Media> out = new ArrayList<>();
        for (NewMedia n : items) {
            if (n.key() == null || !n.key().startsWith(prefix)) {
                throw ApiException.badRequest("업로드 정보가 올바르지 않아요");
            }
            if (n.thumbKey() != null && !n.thumbKey().startsWith(prefix)) {
                throw ApiException.badRequest("업로드 정보가 올바르지 않아요");
            }
            if (!storage.exists(n.key())) {
                throw ApiException.badRequest("업로드가 끝나지 않은 파일이 있어요");
            }
            Media m = new Media();
            m.setTripId(tripId);
            m.setPostId(postId);
            m.setUploaderId(me.id());
            m.setObjectKey(n.key());
            m.setThumbKey(n.thumbKey() != null && storage.exists(n.thumbKey()) ? n.thumbKey() : null);
            m.setContentType(n.contentType());
            m.setKind(n.contentType() != null && n.contentType().startsWith("video/") ? "VIDEO" : "PHOTO");
            m.setWidth(n.width());
            m.setHeight(n.height());
            m.setSizeBytes(n.size());
            m.setDurationSec(n.durationSec());
            out.add(mediaRepository.save(m));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public MediaPage page(MemberPrincipal me, Long tripId, Long before, int size) {
        int s = Math.min(Math.max(size, 1), 100);
        List<Media> rows = before == null
                ? mediaRepository.findByTripIdOrderByIdDesc(tripId, PageRequest.of(0, s + 1))
                : mediaRepository.findByTripIdAndIdLessThanOrderByIdDesc(tripId, before, PageRequest.of(0, s + 1));
        Long next = null;
        if (rows.size() > s) {
            rows = new ArrayList<>(rows.subList(0, s));
            next = rows.get(rows.size() - 1).getId();
        }
        return new MediaPage(toDtos(rows, me.id()), next);
    }

    @Transactional(readOnly = true)
    public MediaViewer viewer(MemberPrincipal me, Long id) {
        Media m = find(id);
        Long prev = null, next = null;
        if (m.getTripId() != null) {
            // grid is newest-first, so "next" (swipe left) is the older one
            next = mediaRepository.findFirstByTripIdAndIdLessThanOrderByIdDesc(m.getTripId(), id).map(Media::getId).orElse(null);
            prev = mediaRepository.findFirstByTripIdAndIdGreaterThanOrderByIdAsc(m.getTripId(), id).map(Media::getId).orElse(null);
        }
        return new MediaViewer(toDtos(List.of(m), me.id()).get(0), prev, next);
    }

    @Transactional(readOnly = true)
    public List<MediaDto> latest(MemberPrincipal me, Long tripId, int limit) {
        return toDtos(mediaRepository.findByTripIdOrderByIdDesc(tripId, PageRequest.of(0, limit)), me.id());
    }

    @Transactional(readOnly = true)
    public List<String> coverThumbs(Long tripId, int limit) {
        return mediaRepository.findByTripIdOrderByIdDesc(tripId, PageRequest.of(0, limit * 3)).stream()
                .filter(m -> "PHOTO".equals(m.getKind()) || m.getThumbKey() != null)
                .limit(limit)
                .map(m -> storage.url(m.getThumbKey() != null ? m.getThumbKey() : m.getObjectKey()))
                .toList();
    }

    @Transactional
    public void delete(MemberPrincipal me, Long id) {
        Media m = find(id);
        me.requireOwnerOrAdmin(m.getUploaderId());
        removeAll(List.of(m));
    }

    @Transactional
    public void deleteAllForTrip(Long tripId) {
        removeAll(mediaRepository.findByTripId(tripId));
    }

    @Transactional
    public void deleteAllForPost(Long postId) {
        removeAll(mediaRepository.findByPostId(postId));
    }

    private void removeAll(List<Media> list) {
        for (Media m : list) {
            socialService.deleteFor(TargetType.MEDIA, m.getId());
            storage.delete(m.getObjectKey());
            storage.delete(m.getThumbKey());
            mediaRepository.delete(m);
        }
    }

    public List<MediaDto> toDtos(List<Media> rows, Long me) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<Long, SocialService.Social> social = socialService.summaries(TargetType.MEDIA,
                rows.stream().map(Media::getId).toList(), me);
        Map<Long, MemberDto> dto = members.dtoMap();
        return rows.stream().map(m -> new MediaDto(m.getId(), m.getTripId(), m.getPostId(), m.getKind(),
                storage.url(m.getObjectKey()),
                storage.url(m.getThumbKey() != null ? m.getThumbKey() : ("PHOTO".equals(m.getKind()) ? m.getObjectKey() : null)),
                m.getWidth(), m.getHeight(), m.getDurationSec(), dto.get(m.getUploaderId()), m.getCreatedAt(),
                social.get(m.getId()))).toList();
    }

    private Media find(Long id) {
        return mediaRepository.findById(id).orElseThrow(() -> ApiException.notFound("사진"));
    }
}
