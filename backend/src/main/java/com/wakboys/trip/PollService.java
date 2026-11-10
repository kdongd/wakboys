package com.wakboys.trip;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PollService {

    private static final Set<String> CATEGORIES = Set.of("DESTINATION", "DATE", "STAY", "ETC");

    private final TripService tripService;
    private final PollRepository pollRepository;
    private final PollOptionRepository optionRepository;
    private final PollVoteRepository voteRepository;
    private final MemberDirectory members;
    private final PushService pushService;

    public record OptionDto(Long id, String label, List<Long> voterIds) {}

    public record PollDto(Long id, Long tripId, String category, String question, boolean multiple,
                          Instant closesAt, boolean open, MemberDto createdBy, List<OptionDto> options,
                          List<Long> myOptionIds, int voterCount, List<Long> leadingOptionIds) {}

    public record PollRequest(String category, String question, Boolean multiple, Instant closesAt, List<String> options) {}

    @Transactional(readOnly = true)
    public List<PollDto> list(MemberPrincipal me, Long tripId) {
        return toDtos(pollRepository.findByTripIdOrderByIdDesc(tripId), me.id());
    }

    @Transactional
    public PollDto create(MemberPrincipal me, Long tripId, PollRequest r) {
        Trip trip = tripService.find(tripId);
        if (r.question() == null || r.question().isBlank()) {
            throw ApiException.badRequest("질문을 입력해주세요");
        }
        String category = r.category() == null ? "ETC" : r.category();
        if (!CATEGORIES.contains(category)) {
            throw ApiException.badRequest("투표 종류를 확인해주세요");
        }
        List<String> labels = r.options() == null ? List.of()
                : r.options().stream().filter(s -> s != null && !s.isBlank()).map(String::trim).distinct().toList();
        if (labels.size() < 2) {
            throw ApiException.badRequest("선택지는 2개 이상이어야 해요");
        }
        Poll p = new Poll();
        p.setTripId(tripId);
        p.setCategory(category);
        p.setQuestion(r.question().trim());
        p.setMultiple(Boolean.TRUE.equals(r.multiple()));
        p.setClosesAt(r.closesAt());
        p.setCreatedBy(me.id());
        pollRepository.save(p);
        for (int i = 0; i < labels.size(); i++) {
            PollOption o = new PollOption();
            o.setPollId(p.getId());
            o.setLabel(labels.get(i));
            o.setSort(i);
            o.setCreatedBy(me.id());
            optionRepository.save(o);
        }
        pushService.sendToAllExcept(me.id(), "🗳️ 새 투표", trip.getTitle() + " · " + p.getQuestion(), "/trips/" + tripId + "?tab=vote");
        return one(p, me.id());
    }

    @Transactional
    public PollDto vote(MemberPrincipal me, Long pollId, List<Long> optionIds) {
        Poll p = find(pollId);
        if (!p.isOpen()) {
            throw ApiException.badRequest("마감된 투표예요");
        }
        List<Long> chosen = optionIds == null ? List.of() : optionIds.stream().distinct().toList();
        if (!p.isMultiple() && chosen.size() > 1) {
            throw ApiException.badRequest("하나만 고를 수 있어요");
        }
        Set<Long> valid = new HashSet<>(optionRepository.findByPollId(pollId).stream().map(PollOption::getId).toList());
        if (!valid.containsAll(chosen)) {
            throw ApiException.badRequest("없는 선택지예요");
        }
        voteRepository.deleteMine(pollId, me.id());
        voteRepository.flush();
        for (Long optionId : chosen) {
            PollVote v = new PollVote();
            v.setPollId(pollId);
            v.setOptionId(optionId);
            v.setMemberId(me.id());
            voteRepository.save(v);
        }
        return one(p, me.id());
    }

    @Transactional
    public PollDto addOption(MemberPrincipal me, Long pollId, String label) {
        Poll p = find(pollId);
        if (!p.isOpen()) {
            throw ApiException.badRequest("마감된 투표예요");
        }
        if (label == null || label.isBlank() || label.length() > 100) {
            throw ApiException.badRequest("선택지를 확인해주세요");
        }
        List<PollOption> existing = optionRepository.findByPollId(pollId);
        if (existing.stream().anyMatch(o -> o.getLabel().equalsIgnoreCase(label.trim()))) {
            throw ApiException.badRequest("이미 있는 선택지예요");
        }
        PollOption o = new PollOption();
        o.setPollId(pollId);
        o.setLabel(label.trim());
        o.setSort(existing.size());
        o.setCreatedBy(me.id());
        optionRepository.save(o);
        return one(p, me.id());
    }

    @Transactional
    public PollDto close(MemberPrincipal me, Long pollId) {
        Poll p = find(pollId);
        me.requireOwnerOrAdmin(p.getCreatedBy());
        p.setClosed(true);
        return one(p, me.id());
    }

    @Transactional
    public void delete(MemberPrincipal me, Long pollId) {
        Poll p = find(pollId);
        me.requireOwnerOrAdmin(p.getCreatedBy());
        pollRepository.delete(p);
    }

    @Transactional(readOnly = true)
    public long openCount(Long tripId) {
        return pollRepository.findByTripIdOrderByIdDesc(tripId).stream().filter(Poll::isOpen).count();
    }

    private Poll find(Long id) {
        return pollRepository.findById(id).orElseThrow(() -> ApiException.notFound("투표"));
    }

    private PollDto one(Poll p, Long me) {
        return toDtos(List.of(p), me).get(0);
    }

    private List<PollDto> toDtos(List<Poll> polls, Long me) {
        if (polls.isEmpty()) {
            return List.of();
        }
        List<Long> ids = polls.stream().map(Poll::getId).toList();
        Map<Long, List<PollOption>> options = new HashMap<>();
        optionRepository.findByPollIdInOrderBySortAscIdAsc(ids)
                .forEach(o -> options.computeIfAbsent(o.getPollId(), k -> new ArrayList<>()).add(o));
        Map<Long, List<Long>> votersByOption = new HashMap<>();
        Map<Long, Set<Long>> votersByPoll = new HashMap<>();
        for (PollVote v : voteRepository.findByPollIdIn(ids)) {
            votersByOption.computeIfAbsent(v.getOptionId(), k -> new ArrayList<>()).add(v.getMemberId());
            votersByPoll.computeIfAbsent(v.getPollId(), k -> new HashSet<>()).add(v.getMemberId());
        }
        Map<Long, MemberDto> dto = members.dtoMap();
        List<PollDto> out = new ArrayList<>();
        for (Poll p : polls) {
            List<OptionDto> opts = new ArrayList<>();
            List<Long> mine = new ArrayList<>();
            int max = 0;
            for (PollOption o : options.getOrDefault(p.getId(), List.of())) {
                List<Long> voters = votersByOption.getOrDefault(o.getId(), List.of());
                opts.add(new OptionDto(o.getId(), o.getLabel(), voters));
                if (voters.contains(me)) mine.add(o.getId());
                max = Math.max(max, voters.size());
            }
            final int top = max;
            List<Long> leading = top == 0 ? List.of()
                    : opts.stream().filter(o -> o.voterIds().size() == top).map(OptionDto::id).toList();
            out.add(new PollDto(p.getId(), p.getTripId(), p.getCategory(), p.getQuestion(), p.isMultiple(),
                    p.getClosesAt(), p.isOpen(), dto.get(p.getCreatedBy()), opts, mine,
                    votersByPoll.getOrDefault(p.getId(), Set.of()).size(), leading));
        }
        return out;
    }
}
