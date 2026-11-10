package com.wakboys.trip;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.Kst;
import com.wakboys.media.MediaRepository;
import com.wakboys.media.MediaService;
import com.wakboys.member.Member;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final PollRepository pollRepository;
    private final ItineraryItemRepository itineraryRepository;
    private final PlaceRepository placeRepository;
    private final ChecklistItemRepository checklistRepository;
    private final ChecklistCheckRepository checkRepository;
    private final TripExpenseRepository expenseRepository;
    private final MediaRepository mediaRepository;
    private final MediaService mediaService;
    private final MemberDirectory members;
    private final PushService pushService;

    /**
     * edition: series number in chronological order (1 = first trip ever).
     * status: TBD (no dates), UPCOMING, ONGOING, DONE.
     */
    public record TripDto(Long id, int year, String season, String title, String destination,
                          LocalDate startDate, LocalDate endDate, int edition, String status, Long dday,
                          long mediaCount, List<String> coverThumbs, MemberDto receiver, Double lat, Double lng) {}

    public record Progress(int done, int total) {}

    public record TripDetail(TripDto trip, long openPolls, long itineraryCount, long placeCount,
                             Progress checklist, long expenseTotal) {}

    public record TripRequest(Integer year, String season, String title, String destination,
                              LocalDate startDate, LocalDate endDate, Double lat, Double lng) {}

    @Transactional(readOnly = true)
    public List<TripDto> list() {
        List<Trip> trips = sorted();
        Map<Long, Integer> editions = editions(trips);
        List<TripDto> out = new ArrayList<>();
        for (int i = trips.size() - 1; i >= 0; i--) {
            out.add(toDto(trips.get(i), editions));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public TripDto get(Long id) {
        return toDto(find(id), editions(sorted()));
    }

    @Transactional(readOnly = true)
    public TripDetail detail(Long id) {
        Trip t = find(id);
        long openPolls = pollRepository.findByTripIdOrderByIdDesc(id).stream().filter(Poll::isOpen).count();
        return new TripDetail(toDto(t, editions(sorted())), openPolls,
                itineraryRepository.countByTripId(id), placeRepository.countByTripId(id),
                checklistProgress(id),
                expenseRepository.findByTripIdOrderByIdAsc(id).stream().mapToLong(TripExpense::getAmount).sum());
    }

    /** Nearest trip that hasn't ended yet (or the latest TBD one). */
    @Transactional(readOnly = true)
    public Optional<TripDto> next() {
        LocalDate today = Kst.today();
        List<Trip> trips = sorted();
        Map<Long, Integer> editions = editions(trips);
        return trips.stream()
                .filter(t -> t.getEndDate() == null || !t.getEndDate().isBefore(today))
                .min(Comparator.comparing((Trip t) -> t.getStartDate() == null ? LocalDate.MAX : t.getStartDate()))
                .map(t -> toDto(t, editions));
    }

    /** Most recent trip that already has photos/videos. */
    @Transactional(readOnly = true)
    public Optional<TripDto> latestWithMedia() {
        List<Trip> trips = sorted();
        Map<Long, Integer> editions = editions(trips);
        for (int i = trips.size() - 1; i >= 0; i--) {
            if (mediaRepository.countByTripId(trips.get(i).getId()) > 0) {
                return Optional.of(toDto(trips.get(i), editions));
            }
        }
        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public Progress checklistProgress(Long tripId) {
        List<ChecklistItem> items = checklistRepository.findByTripIdOrderByIdAsc(tripId);
        if (items.isEmpty()) {
            return new Progress(0, 0);
        }
        Map<Long, Long> checks = new HashMap<>();
        checkRepository.findByItemIdIn(items.stream().map(ChecklistItem::getId).toList())
                .forEach(c -> checks.merge(c.getItemId(), 1L, Long::sum));
        long linked = members.all().stream().filter(Member::isLinked).count();
        int done = 0;
        for (ChecklistItem i : items) {
            boolean complete = "EACH".equals(i.getKind())
                    ? checks.getOrDefault(i.getId(), 0L) >= Math.max(1, linked)
                    : i.isDone();
            if (complete) done++;
        }
        return new Progress(done, items.size());
    }

    @Transactional
    public TripDto create(MemberPrincipal me, TripRequest req) {
        validate(req, true);
        if (tripRepository.findByYearAndSeason(req.year(), req.season()).isPresent()) {
            throw ApiException.badRequest("이미 있는 시즌이에요");
        }
        Trip t = new Trip();
        apply(t, req);
        t.setCreatedBy(me.id());
        tripRepository.save(t);
        pushService.sendToAllExcept(me.id(), "새 에디션 등장 ✈️",
                t.getYear() + " " + seasonKo(t.getSeason()) + " 「" + t.getTitle() + "」이 만들어졌어요", "/trips/" + t.getId());
        return get(t.getId());
    }

    @Transactional
    public TripDto update(Long id, TripRequest req) {
        validate(req, false);
        Trip t = find(id);
        if (req.year() != null || req.season() != null) {
            int y = req.year() != null ? req.year() : t.getYear();
            String s = req.season() != null ? req.season() : t.getSeason();
            tripRepository.findByYearAndSeason(y, s).filter(o -> !o.getId().equals(id)).ifPresent(o -> {
                throw ApiException.badRequest("이미 있는 시즌이에요");
            });
        }
        apply(t, req);
        return get(id);
    }

    @Transactional
    public void delete(MemberPrincipal me, Long id) {
        me.requireAdmin();
        Trip t = find(id);
        mediaService.deleteAllForTrip(t.getId());
        tripRepository.delete(t);
    }

    public Trip find(Long id) {
        return tripRepository.findById(id).orElseThrow(() -> ApiException.notFound("여행"));
    }

    private void apply(Trip t, TripRequest r) {
        if (r.year() != null) t.setYear(r.year());
        if (r.season() != null) t.setSeason(r.season());
        if (r.title() != null) t.setTitle(r.title().trim());
        if (r.destination() != null) t.setDestination(r.destination().isBlank() ? null : r.destination().trim());
        if (r.startDate() != null) t.setStartDate(r.startDate());
        if (r.endDate() != null) t.setEndDate(r.endDate());
        if (r.lat() != null && r.lng() != null) {
            if (r.lat() < 32 || r.lat() > 39.5 || r.lng() < 124 || r.lng() > 132) {
                throw ApiException.badRequest("지도 위치가 국내 범위를 벗어났어요");
            }
            t.setLat(r.lat());
            t.setLng(r.lng());
        }
        if (t.getStartDate() != null && t.getEndDate() != null && t.getEndDate().isBefore(t.getStartDate())) {
            throw ApiException.badRequest("끝나는 날이 시작일보다 빨라요");
        }
    }

    private void validate(TripRequest r, boolean create) {
        if (create && (r.year() == null || r.season() == null || r.title() == null || r.title().isBlank())) {
            throw ApiException.badRequest("연도, 시즌, 제목은 필수예요");
        }
        if (r.season() != null && !Set.of("SUMMER", "WINTER").contains(r.season())) {
            throw ApiException.badRequest("시즌은 SUMMER 또는 WINTER예요");
        }
        if (r.year() != null && (r.year() < 2000 || r.year() > 2100)) {
            throw ApiException.badRequest("연도를 확인해주세요");
        }
        if (r.title() != null && r.title().length() > 60) {
            throw ApiException.badRequest("제목은 60자까지예요");
        }
    }

    private List<Trip> sorted() {
        List<Trip> trips = new ArrayList<>(tripRepository.findAll());
        trips.sort(Comparator.comparingInt(Trip::getYear).thenComparingInt(t -> "SUMMER".equals(t.getSeason()) ? 0 : 1));
        return trips;
    }

    private Map<Long, Integer> editions(List<Trip> sorted) {
        Map<Long, Integer> m = new HashMap<>();
        for (int i = 0; i < sorted.size(); i++) {
            m.put(sorted.get(i).getId(), i + 1);
        }
        return m;
    }

    private TripDto toDto(Trip t, Map<Long, Integer> editions) {
        LocalDate today = Kst.today();
        String status;
        Long dday = null;
        if (t.getStartDate() == null) {
            status = "TBD";
        } else if (today.isBefore(t.getStartDate())) {
            status = "UPCOMING";
            dday = ChronoUnit.DAYS.between(today, t.getStartDate());
        } else if (t.getEndDate() == null || !today.isAfter(t.getEndDate())) {
            status = "ONGOING";
            dday = 0L;
        } else {
            status = "DONE";
        }
        return new TripDto(t.getId(), t.getYear(), t.getSeason(), t.getTitle(), t.getDestination(),
                t.getStartDate(), t.getEndDate(), editions.getOrDefault(t.getId(), 0), status, dday,
                mediaRepository.countByTripId(t.getId()), mediaService.coverThumbs(t.getId(), 4),
                members.dto(receiverId(t)), t.getLat(), t.getLng());
    }

    /** Who collects the settlement: chosen receiver, else the 총무, else the 운영자. */
    public Long receiverId(Trip t) {
        if (t.getSettleReceiverId() != null) {
            return t.getSettleReceiverId();
        }
        List<Member> all = members.all();
        return all.stream().filter(Member::isTreasurer).findFirst()
                .or(() -> all.stream().filter(Member::isAdmin).findFirst())
                .map(Member::getId).orElse(null);
    }

    static String seasonKo(String season) {
        return "SUMMER".equals(season) ? "여름" : "겨울";
    }
}
