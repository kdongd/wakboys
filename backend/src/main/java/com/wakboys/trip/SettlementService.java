package com.wakboys.trip;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.member.Member;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.Instant;
import java.util.*;

/**
 * 여행 정산. Money actually moves in KakaoPay/bank; the app only records it.
 * Everyone owes an equal share (rounded up to 10원). Transfers go through one receiver
 * (보통 총무): people who paid less than their share send to the receiver, people who
 * paid more get the difference back from the receiver. Senders tick "보냈어요".
 */
@Service
@RequiredArgsConstructor
public class SettlementService {

    private final TripService tripService;
    private final TripExpenseRepository expenseRepository;
    private final SettlementTransferRepository transferRepository;
    private final MemberDirectory members;
    private final PushService pushService;

    public record ExpenseDto(Long id, String title, int amount, MemberDto paidBy, MemberDto createdBy, Instant createdAt) {}

    public record MemberLine(MemberDto member, long paid, long share, long net) {}

    /** changed = amount was ticked earlier but expenses changed since, so re-check. */
    public record TransferDto(MemberDto from, MemberDto to, long amount, boolean sent, Instant sentAt,
                              Integer sentAmount, boolean changed) {}

    public record Settlement(MemberDto receiver, String bankInfo, long total, long share, int headcount,
                             List<ExpenseDto> expenses, List<MemberLine> members, List<TransferDto> transfers,
                             int sentCount) {}

    public record ExpenseRequest(String title, Integer amount, Long paidBy) {}

    @Transactional(readOnly = true)
    public Settlement get(Long tripId, String bankInfo) {
        Trip trip = tripService.find(tripId);
        Long receiverId = tripService.receiverId(trip);
        List<Member> all = members.all();
        Map<Long, MemberDto> dto = members.dtoMap();
        List<TripExpense> expenses = expenseRepository.findByTripIdOrderByIdAsc(tripId);

        long total = expenses.stream().mapToLong(TripExpense::getAmount).sum();
        int headcount = all.size();
        long share = headcount == 0 ? 0 : ((total + headcount - 1) / headcount + 9) / 10 * 10;
        Map<Long, Long> paid = new HashMap<>();
        expenses.forEach(e -> paid.merge(e.getPaidBy(), (long) e.getAmount(), Long::sum));

        List<MemberLine> lines = new ArrayList<>();
        for (Member m : all) {
            long p = paid.getOrDefault(m.getId(), 0L);
            lines.add(new MemberLine(dto.get(m.getId()), p, total == 0 ? 0 : share, total == 0 ? 0 : p - share));
        }

        Map<String, SettlementTransfer> marks = new HashMap<>();
        transferRepository.findByTripId(tripId).forEach(t -> marks.put(t.getFromMemberId() + ":" + t.getToMemberId(), t));

        List<TransferDto> transfers = new ArrayList<>();
        if (receiverId != null && total > 0) {
            for (MemberLine l : lines) {
                Long id = l.member().id();
                if (id.equals(receiverId) || l.net() == 0) {
                    continue;
                }
                Long from = l.net() < 0 ? id : receiverId;
                Long to = l.net() < 0 ? receiverId : id;
                long amount = Math.abs(l.net());
                SettlementTransfer mark = marks.get(from + ":" + to);
                transfers.add(new TransferDto(dto.get(from), dto.get(to), amount, mark != null,
                        mark == null ? null : mark.getSentAt(), mark == null ? null : mark.getAmount(),
                        mark != null && mark.getAmount() != amount));
            }
        }
        int sentCount = (int) transfers.stream().filter(TransferDto::sent).count();
        return new Settlement(dto.get(receiverId), bankInfo, total, total == 0 ? 0 : share, headcount,
                expenses.stream().map(e -> new ExpenseDto(e.getId(), e.getTitle(), e.getAmount(), dto.get(e.getPaidBy()),
                        dto.get(e.getCreatedBy()), e.getCreatedAt())).toList(),
                lines, transfers, sentCount);
    }

    @Transactional
    public ExpenseDto addExpense(MemberPrincipal me, Long tripId, ExpenseRequest r) {
        tripService.find(tripId);
        if (r.title() == null || r.title().isBlank() || r.title().length() > 100) {
            throw ApiException.badRequest("항목 이름을 확인해주세요");
        }
        if (r.amount() == null || r.amount() <= 0 || r.amount() > 100_000_000) {
            throw ApiException.badRequest("금액을 확인해주세요");
        }
        Long paidBy = r.paidBy() == null ? me.id() : members.get(r.paidBy()).getId();
        TripExpense e = new TripExpense();
        e.setTripId(tripId);
        e.setTitle(r.title().trim());
        e.setAmount(r.amount());
        e.setPaidBy(paidBy);
        e.setCreatedBy(me.id());
        expenseRepository.save(e);
        Map<Long, MemberDto> dto = members.dtoMap();
        return new ExpenseDto(e.getId(), e.getTitle(), e.getAmount(), dto.get(paidBy), dto.get(me.id()), e.getCreatedAt());
    }

    @Transactional
    public void deleteExpense(MemberPrincipal me, Long expenseId) {
        TripExpense e = expenseRepository.findById(expenseId).orElseThrow(() -> ApiException.notFound("경비"));
        if (!me.admin() && !me.canManageMoney() && !me.id().equals(e.getCreatedBy()) && !me.id().equals(e.getPaidBy())) {
            throw ApiException.forbidden("등록한 사람이나 총무만 지울 수 있어요");
        }
        expenseRepository.delete(e);
    }

    @Transactional
    public void setReceiver(MemberPrincipal me, Long tripId, Long memberId) {
        me.requireMoneyManager();
        Trip t = tripService.find(tripId);
        t.setSettleReceiverId(memberId == null ? null : members.get(memberId).getId());
    }

    @Transactional
    public void markSent(MemberPrincipal me, Long tripId, Long fromId, Long toId, String bankInfo) {
        if (!me.id().equals(fromId) && !me.admin()) {
            throw ApiException.forbidden("보낸 사람만 체크할 수 있어요");
        }
        TransferDto t = get(tripId, bankInfo).transfers().stream()
                .filter(x -> x.from().id().equals(fromId) && x.to().id().equals(toId))
                .findFirst()
                .orElseThrow(() -> ApiException.badRequest("보낼 금액이 없어요"));
        SettlementTransfer mark = transferRepository.findByTripIdAndFromMemberIdAndToMemberId(tripId, fromId, toId)
                .orElseGet(SettlementTransfer::new);
        mark.setTripId(tripId);
        mark.setFromMemberId(fromId);
        mark.setToMemberId(toId);
        mark.setAmount((int) t.amount());
        mark.setSentAt(Instant.now());
        transferRepository.save(mark);
        pushService.send(List.of(toId), "💸 정산 도착",
                t.from().name() + "님이 " + NumberFormat.getInstance(Locale.KOREA).format(t.amount()) + "원 보냈어요",
                "/trips/" + tripId + "?tab=settle");
    }

    @Transactional
    public void unmarkSent(MemberPrincipal me, Long tripId, Long fromId, Long toId) {
        if (!me.id().equals(fromId) && !me.admin()) {
            throw ApiException.forbidden("보낸 사람만 바꿀 수 있어요");
        }
        transferRepository.findByTripIdAndFromMemberIdAndToMemberId(tripId, fromId, toId)
                .ifPresent(transferRepository::delete);
    }
}
