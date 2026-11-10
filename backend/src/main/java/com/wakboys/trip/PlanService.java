package com.wakboys.trip;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/** 일정 / 장소 / 준비물 */
@Service
@RequiredArgsConstructor
public class PlanService {

    private static final Set<String> PLACE_CATEGORIES = Set.of("FOOD", "CAFE", "SIGHT", "STAY", "BAR", "ETC");

    private final TripService tripService;
    private final ItineraryItemRepository itineraryRepository;
    private final PlaceRepository placeRepository;
    private final ChecklistItemRepository checklistRepository;
    private final ChecklistCheckRepository checkRepository;
    private final MemberDirectory members;

    // ---------------- itinerary ----------------

    public record ItineraryDto(Long id, int dayNo, String startTime, String title, String memo) {
        static ItineraryDto of(ItineraryItem i) {
            return new ItineraryDto(i.getId(), i.getDayNo(), i.getStartTime(), i.getTitle(), i.getMemo());
        }
    }

    public record ItineraryRequest(Integer dayNo, String startTime, String title, String memo) {}

    @Transactional(readOnly = true)
    public List<ItineraryDto> itinerary(Long tripId) {
        List<ItineraryItem> items = new ArrayList<>(itineraryRepository.findByTripId(tripId));
        items.sort(Comparator.comparingInt(ItineraryItem::getDayNo)
                .thenComparing(i -> i.getStartTime() == null ? "99:99" : i.getStartTime())
                .thenComparingInt(ItineraryItem::getSort)
                .thenComparing(ItineraryItem::getId));
        return items.stream().map(ItineraryDto::of).toList();
    }

    @Transactional
    public ItineraryDto addItinerary(MemberPrincipal me, Long tripId, ItineraryRequest r) {
        tripService.find(tripId);
        if (r.dayNo() == null || r.dayNo() < 1 || r.dayNo() > 30 || blank(r.title())) {
            throw ApiException.badRequest("일차와 내용을 입력해주세요");
        }
        ItineraryItem i = new ItineraryItem();
        i.setTripId(tripId);
        i.setCreatedBy(me.id());
        applyItinerary(i, r);
        return ItineraryDto.of(itineraryRepository.save(i));
    }

    @Transactional
    public ItineraryDto updateItinerary(Long id, ItineraryRequest r) {
        ItineraryItem i = itineraryRepository.findById(id).orElseThrow(() -> ApiException.notFound("일정"));
        applyItinerary(i, r);
        return ItineraryDto.of(i);
    }

    @Transactional
    public void deleteItinerary(Long id) {
        itineraryRepository.deleteById(id);
    }

    private void applyItinerary(ItineraryItem i, ItineraryRequest r) {
        if (r.dayNo() != null) i.setDayNo(r.dayNo());
        if (r.startTime() != null) {
            String t = r.startTime().trim();
            if (!t.isEmpty() && !t.matches("([01]\\d|2[0-3]):[0-5]\\d")) {
                throw ApiException.badRequest("시간은 HH:mm 형식이에요");
            }
            i.setStartTime(t.isEmpty() ? null : t);
        }
        if (r.title() != null) i.setTitle(trim(r.title(), 100));
        if (r.memo() != null) i.setMemo(r.memo().isBlank() ? null : trim(r.memo(), 500));
    }

    // ---------------- places ----------------

    public record PlaceDto(Long id, String name, String category, String address, String url, String memo,
                           Double lat, Double lng, boolean visited, MemberDto createdBy) {}

    public record PlaceRequest(String name, String category, String address, String url, String memo,
                               Double lat, Double lng, Boolean visited) {}

    @Transactional(readOnly = true)
    public List<PlaceDto> places(Long tripId) {
        Map<Long, MemberDto> dto = members.dtoMap();
        return placeRepository.findByTripIdOrderByIdAsc(tripId).stream().map(p -> toDto(p, dto)).toList();
    }

    @Transactional
    public PlaceDto addPlace(MemberPrincipal me, Long tripId, PlaceRequest r) {
        tripService.find(tripId);
        if (blank(r.name())) {
            throw ApiException.badRequest("장소 이름을 입력해주세요");
        }
        Place p = new Place();
        p.setTripId(tripId);
        p.setCreatedBy(me.id());
        p.setCategory("ETC");
        applyPlace(p, r);
        return toDto(placeRepository.save(p), members.dtoMap());
    }

    @Transactional
    public PlaceDto updatePlace(Long id, PlaceRequest r) {
        Place p = placeRepository.findById(id).orElseThrow(() -> ApiException.notFound("장소"));
        applyPlace(p, r);
        return toDto(p, members.dtoMap());
    }

    @Transactional
    public void deletePlace(Long id) {
        placeRepository.deleteById(id);
    }

    private void applyPlace(Place p, PlaceRequest r) {
        if (r.name() != null) p.setName(trim(r.name(), 100));
        if (r.category() != null) {
            if (!PLACE_CATEGORIES.contains(r.category())) throw ApiException.badRequest("카테고리를 확인해주세요");
            p.setCategory(r.category());
        }
        if (r.address() != null) p.setAddress(r.address().isBlank() ? null : trim(r.address(), 200));
        if (r.url() != null) p.setUrl(r.url().isBlank() ? null : trim(r.url(), 500));
        if (r.memo() != null) p.setMemo(r.memo().isBlank() ? null : trim(r.memo(), 500));
        if (r.lat() != null) p.setLat(r.lat());
        if (r.lng() != null) p.setLng(r.lng());
        if (r.visited() != null) p.setVisited(r.visited());
    }

    private static PlaceDto toDto(Place p, Map<Long, MemberDto> dto) {
        return new PlaceDto(p.getId(), p.getName(), p.getCategory(), p.getAddress(), p.getUrl(), p.getMemo(),
                p.getLat(), p.getLng(), p.isVisited(), dto.get(p.getCreatedBy()));
    }

    // ---------------- checklist ----------------

    /** SHARED: one thing for the group (someone brings it). EACH: everyone brings their own. */
    public record ChecklistDto(Long id, String title, String kind, MemberDto assignee, boolean done,
                               MemberDto doneBy, List<Long> checkedMemberIds, boolean mine) {}

    public record ChecklistRequest(String title, String kind, Long assigneeId, Boolean clearAssignee) {}

    @Transactional(readOnly = true)
    public List<ChecklistDto> checklist(MemberPrincipal me, Long tripId) {
        List<ChecklistItem> items = checklistRepository.findByTripIdOrderByIdAsc(tripId);
        Map<Long, List<Long>> checks = new HashMap<>();
        if (!items.isEmpty()) {
            checkRepository.findByItemIdIn(items.stream().map(ChecklistItem::getId).toList())
                    .forEach(c -> checks.computeIfAbsent(c.getItemId(), k -> new ArrayList<>()).add(c.getMemberId()));
        }
        Map<Long, MemberDto> dto = members.dtoMap();
        return items.stream().map(i -> toDto(i, checks.getOrDefault(i.getId(), List.of()), dto, me.id())).toList();
    }

    @Transactional
    public ChecklistDto addChecklist(MemberPrincipal me, Long tripId, ChecklistRequest r) {
        tripService.find(tripId);
        if (blank(r.title())) {
            throw ApiException.badRequest("준비물을 입력해주세요");
        }
        ChecklistItem i = new ChecklistItem();
        i.setTripId(tripId);
        i.setCreatedBy(me.id());
        i.setKind("SHARED");
        applyChecklist(i, r);
        checklistRepository.save(i);
        return toDto(i, List.of(), members.dtoMap(), me.id());
    }

    @Transactional
    public ChecklistDto updateChecklist(MemberPrincipal me, Long id, ChecklistRequest r) {
        ChecklistItem i = checklistRepository.findById(id).orElseThrow(() -> ApiException.notFound("준비물"));
        applyChecklist(i, r);
        return toDto(i, checkedIds(i.getId()), members.dtoMap(), me.id());
    }

    @Transactional
    public ChecklistDto toggleChecklist(MemberPrincipal me, Long id) {
        ChecklistItem i = checklistRepository.findById(id).orElseThrow(() -> ApiException.notFound("준비물"));
        if ("EACH".equals(i.getKind())) {
            checkRepository.findByItemIdAndMemberId(id, me.id()).ifPresentOrElse(checkRepository::delete, () -> {
                ChecklistCheck c = new ChecklistCheck();
                c.setItemId(id);
                c.setMemberId(me.id());
                checkRepository.save(c);
            });
        } else {
            i.setDone(!i.isDone());
            i.setDoneBy(i.isDone() ? me.id() : null);
            i.setDoneAt(i.isDone() ? Instant.now() : null);
        }
        checkRepository.flush();
        return toDto(i, checkedIds(id), members.dtoMap(), me.id());
    }

    @Transactional
    public void deleteChecklist(Long id) {
        checklistRepository.deleteById(id);
    }

    private List<Long> checkedIds(Long itemId) {
        return checkRepository.findByItemIdIn(List.of(itemId)).stream().map(ChecklistCheck::getMemberId).toList();
    }

    private void applyChecklist(ChecklistItem i, ChecklistRequest r) {
        if (r.title() != null) i.setTitle(trim(r.title(), 100));
        if (r.kind() != null) {
            if (!Set.of("SHARED", "EACH").contains(r.kind())) throw ApiException.badRequest("종류를 확인해주세요");
            i.setKind(r.kind());
        }
        if (Boolean.TRUE.equals(r.clearAssignee())) {
            i.setAssigneeId(null);
        } else if (r.assigneeId() != null) {
            members.get(r.assigneeId());
            i.setAssigneeId(r.assigneeId());
        }
    }

    private static ChecklistDto toDto(ChecklistItem i, List<Long> checked, Map<Long, MemberDto> dto, Long me) {
        boolean each = "EACH".equals(i.getKind());
        return new ChecklistDto(i.getId(), i.getTitle(), i.getKind(), dto.get(i.getAssigneeId()),
                i.isDone(), dto.get(i.getDoneBy()), checked,
                each ? checked.contains(me) : Objects.equals(i.getAssigneeId(), me));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String trim(String s, int max) {
        String t = s.trim();
        if (t.length() > max) {
            throw ApiException.badRequest(max + "자까지 입력할 수 있어요");
        }
        return t;
    }
}
