package com.wakboys.trip;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.dues.DuesService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;
    private final PlanService planService;
    private final PollService pollService;
    private final SettlementService settlementService;
    private final DuesService duesService;

    // ---- trips ----

    @GetMapping("/trips")
    public List<TripService.TripDto> trips() {
        return tripService.list();
    }

    @PostMapping("/trips")
    public TripService.TripDto create(@AuthenticationPrincipal MemberPrincipal me, @RequestBody TripService.TripRequest req) {
        return tripService.create(me, req);
    }

    @GetMapping("/trips/{id}")
    public TripService.TripDetail trip(@PathVariable Long id) {
        return tripService.detail(id);
    }

    @PatchMapping("/trips/{id}")
    public TripService.TripDto update(@PathVariable Long id, @RequestBody TripService.TripRequest req) {
        return tripService.update(id, req);
    }

    @DeleteMapping("/trips/{id}")
    public void delete(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        tripService.delete(me, id);
    }

    // ---- polls ----

    public record VoteRequest(List<Long> optionIds) {}

    public record OptionRequest(String label) {}

    @GetMapping("/trips/{id}/polls")
    public List<PollService.PollDto> polls(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        return pollService.list(me, id);
    }

    @PostMapping("/trips/{id}/polls")
    public PollService.PollDto createPoll(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                          @RequestBody PollService.PollRequest req) {
        return pollService.create(me, id, req);
    }

    @PostMapping("/polls/{id}/vote")
    public PollService.PollDto vote(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id, @RequestBody VoteRequest req) {
        return pollService.vote(me, id, req.optionIds());
    }

    @PostMapping("/polls/{id}/options")
    public PollService.PollDto addOption(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id, @RequestBody OptionRequest req) {
        return pollService.addOption(me, id, req.label());
    }

    @PostMapping("/polls/{id}/close")
    public PollService.PollDto close(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        return pollService.close(me, id);
    }

    @DeleteMapping("/polls/{id}")
    public void deletePoll(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        pollService.delete(me, id);
    }

    // ---- itinerary ----

    @GetMapping("/trips/{id}/itinerary")
    public List<PlanService.ItineraryDto> itinerary(@PathVariable Long id) {
        return planService.itinerary(id);
    }

    @PostMapping("/trips/{id}/itinerary")
    public PlanService.ItineraryDto addItinerary(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                                 @RequestBody PlanService.ItineraryRequest req) {
        return planService.addItinerary(me, id, req);
    }

    @PatchMapping("/itinerary/{id}")
    public PlanService.ItineraryDto updateItinerary(@PathVariable Long id, @RequestBody PlanService.ItineraryRequest req) {
        return planService.updateItinerary(id, req);
    }

    @DeleteMapping("/itinerary/{id}")
    public void deleteItinerary(@PathVariable Long id) {
        planService.deleteItinerary(id);
    }

    // ---- places ----

    @GetMapping("/trips/{id}/places")
    public List<PlanService.PlaceDto> places(@PathVariable Long id) {
        return planService.places(id);
    }

    @PostMapping("/trips/{id}/places")
    public PlanService.PlaceDto addPlace(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                         @RequestBody PlanService.PlaceRequest req) {
        return planService.addPlace(me, id, req);
    }

    @PatchMapping("/places/{id}")
    public PlanService.PlaceDto updatePlace(@PathVariable Long id, @RequestBody PlanService.PlaceRequest req) {
        return planService.updatePlace(id, req);
    }

    @DeleteMapping("/places/{id}")
    public void deletePlace(@PathVariable Long id) {
        planService.deletePlace(id);
    }

    // ---- checklist ----

    @GetMapping("/trips/{id}/checklist")
    public List<PlanService.ChecklistDto> checklist(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        return planService.checklist(me, id);
    }

    @PostMapping("/trips/{id}/checklist")
    public PlanService.ChecklistDto addChecklist(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                                 @RequestBody PlanService.ChecklistRequest req) {
        return planService.addChecklist(me, id, req);
    }

    @PatchMapping("/checklist/{id}")
    public PlanService.ChecklistDto updateChecklist(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                                    @RequestBody PlanService.ChecklistRequest req) {
        return planService.updateChecklist(me, id, req);
    }

    @PostMapping("/checklist/{id}/toggle")
    public PlanService.ChecklistDto toggleChecklist(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        return planService.toggleChecklist(me, id);
    }

    @DeleteMapping("/checklist/{id}")
    public void deleteChecklist(@PathVariable Long id) {
        planService.deleteChecklist(id);
    }

    // ---- settlement ----

    public record ReceiverRequest(Long memberId) {}

    public record TransferRequest(Long fromId, Long toId) {}

    @GetMapping("/trips/{id}/settlement")
    public SettlementService.Settlement settlement(@PathVariable Long id) {
        return settlementService.get(id, duesService.configDto().bankInfo());
    }

    @PostMapping("/trips/{id}/expenses")
    public SettlementService.ExpenseDto addExpense(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                                                   @RequestBody SettlementService.ExpenseRequest req) {
        return settlementService.addExpense(me, id, req);
    }

    @DeleteMapping("/trip-expenses/{id}")
    public void deleteExpense(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        settlementService.deleteExpense(me, id);
    }

    @PutMapping("/trips/{id}/settlement/receiver")
    public void receiver(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id, @RequestBody ReceiverRequest req) {
        settlementService.setReceiver(me, id, req.memberId());
    }

    @PostMapping("/trips/{id}/settlement/sent")
    public void sent(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id, @RequestBody TransferRequest req) {
        settlementService.markSent(me, id, req.fromId(), req.toId(), duesService.configDto().bankInfo());
    }

    @DeleteMapping("/trips/{id}/settlement/sent")
    public void unsent(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id,
                       @RequestParam Long fromId, @RequestParam Long toId) {
        settlementService.unmarkSent(me, id, fromId, toId);
    }
}
