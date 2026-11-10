package com.wakboys.dues;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.Kst;
import com.wakboys.member.Member;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.push.PushService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DuesService {

    private final DuesConfigRepository configRepository;
    private final DuesPaymentRepository paymentRepository;
    private final DuesExpenseRepository expenseRepository;
    private final MemberDirectory members;
    private final PushService pushService;

    public record ConfigDto(int monthlyAmount, long initialBalance, String bankInfo, String startYm) {
        static ConfigDto of(DuesConfig c) {
            return new ConfigDto(c.getMonthlyAmount(), c.getInitialBalance(), c.getBankInfo(), c.getStartYm());
        }
    }

    public record PaymentDto(Long memberId, String ym, int amount) {}

    public record ExpenseDto(Long id, String title, int amount, LocalDate spentOn, MemberDto createdBy) {}

    public record Overview(ConfigDto config, long balance, long monthIncome, long monthExpense,
                           String currentYm, List<String> months, List<MemberDto> members,
                           List<PaymentDto> payments, List<ExpenseDto> expenses) {}

    public record MonthStatus(String ym, List<MemberDto> paid, List<MemberDto> unpaid) {}

    @Transactional(readOnly = true)
    public Overview overview(int year) {
        DuesConfig c = config();
        YearMonth now = Kst.thisMonth();
        YearMonth start = YearMonth.parse(c.getStartYm());
        YearMonth from = max(start, YearMonth.of(year, 1));
        YearMonth to = min(now, YearMonth.of(year, 12));
        List<String> months = new ArrayList<>();
        for (YearMonth ym = from; !ym.isAfter(to); ym = ym.plusMonths(1)) {
            months.add(ym.toString());
        }
        List<PaymentDto> payments = months.isEmpty() ? List.of()
                : paymentRepository.findByYmBetween(months.get(0), months.get(months.size() - 1)).stream()
                .map(p -> new PaymentDto(p.getMemberId(), p.getYm(), p.getAmount())).toList();
        return new Overview(
                ConfigDto.of(c),
                balance(),
                paymentRepository.totalForMonth(now.toString()),
                expenseRepository.totalBetween(now.atDay(1), now.atEndOfMonth()),
                now.toString(),
                months,
                members.all().stream().map(MemberDto::of).toList(),
                payments,
                expenses(30));
    }

    @Transactional(readOnly = true)
    public long balance() {
        return config().getInitialBalance() + paymentRepository.totalAmount() - expenseRepository.totalAmount();
    }

    @Transactional(readOnly = true)
    public MonthStatus monthStatus(YearMonth ym) {
        Set<Long> paid = paymentRepository.findByYm(ym.toString()).stream()
                .map(DuesPayment::getMemberId).collect(Collectors.toSet());
        List<MemberDto> p = new ArrayList<>();
        List<MemberDto> u = new ArrayList<>();
        for (Member m : members.all()) {
            (paid.contains(m.getId()) ? p : u).add(MemberDto.of(m));
        }
        return new MonthStatus(ym.toString(), p, u);
    }

    /** "회비 개근": every month from the start month through last month is paid. */
    @Transactional(readOnly = true)
    public boolean isPerfect(Long memberId) {
        YearMonth start = YearMonth.parse(config().getStartYm());
        YearMonth last = Kst.thisMonth().minusMonths(1);
        Set<String> paid = paymentRepository.findByMemberId(memberId).stream()
                .map(DuesPayment::getYm).collect(Collectors.toSet());
        for (YearMonth ym = start; !ym.isAfter(last); ym = ym.plusMonths(1)) {
            if (!paid.contains(ym.toString())) {
                return false;
            }
        }
        return true;
    }

    @Transactional
    public PaymentDto setPaid(MemberPrincipal me, Long memberId, String ym, boolean paid) {
        me.requireMoneyManager();
        YearMonth month;
        try {
            month = YearMonth.parse(ym);
        } catch (Exception e) {
            throw ApiException.badRequest("월 형식은 YYYY-MM 이에요");
        }
        Member target = members.get(memberId);
        Optional<DuesPayment> existing = paymentRepository.findByMemberIdAndYm(memberId, month.toString());
        if (!paid) {
            existing.ifPresent(paymentRepository::delete);
            return null;
        }
        if (existing.isPresent()) {
            DuesPayment p = existing.get();
            return new PaymentDto(p.getMemberId(), p.getYm(), p.getAmount());
        }
        DuesPayment saved = paymentRepository.save(
                new DuesPayment(memberId, month.toString(), config().getMonthlyAmount(), me.id()));
        if (!target.getId().equals(me.id())) {
            pushService.send(List.of(target.getId()), "회비 확인 완료",
                    month.getMonthValue() + "월 회비 납부가 확인됐어요 👍", "/dues");
        }
        return new PaymentDto(saved.getMemberId(), saved.getYm(), saved.getAmount());
    }

    @Transactional
    public ExpenseDto addExpense(MemberPrincipal me, String title, int amount, LocalDate spentOn) {
        me.requireMoneyManager();
        if (amount <= 0) {
            throw ApiException.badRequest("금액을 확인해주세요");
        }
        DuesExpense e = expenseRepository.save(new DuesExpense(title.trim(), amount, spentOn == null ? Kst.today() : spentOn, me.id()));
        return toDto(e, members.dtoMap());
    }

    @Transactional
    public void deleteExpense(MemberPrincipal me, Long id) {
        me.requireMoneyManager();
        expenseRepository.deleteById(id);
    }

    @Transactional
    public ConfigDto updateConfig(MemberPrincipal me, Integer monthlyAmount, Long initialBalance, String bankInfo, String startYm) {
        me.requireMoneyManager();
        if (startYm != null) {
            try {
                YearMonth.parse(startYm);
            } catch (Exception e) {
                throw ApiException.badRequest("시작 월 형식은 YYYY-MM 이에요");
            }
        }
        if (monthlyAmount != null && monthlyAmount <= 0) {
            throw ApiException.badRequest("월 회비를 확인해주세요");
        }
        DuesConfig c = config();
        c.update(monthlyAmount, initialBalance, bankInfo, startYm);
        return ConfigDto.of(c);
    }

    @Transactional(readOnly = true)
    public List<ExpenseDto> expenses(int limit) {
        Map<Long, MemberDto> dto = members.dtoMap();
        return expenseRepository.findAllByOrderBySpentOnDescIdDesc(PageRequest.of(0, limit)).stream()
                .map(e -> toDto(e, dto)).toList();
    }

    @Transactional(readOnly = true)
    public ConfigDto configDto() {
        return ConfigDto.of(config());
    }

    private DuesConfig config() {
        return configRepository.findById(1).orElseThrow();
    }

    private static ExpenseDto toDto(DuesExpense e, Map<Long, MemberDto> dto) {
        return new ExpenseDto(e.getId(), e.getTitle(), e.getAmount(), e.getSpentOn(), dto.get(e.getCreatedBy()));
    }

    private static YearMonth max(YearMonth a, YearMonth b) {
        return a.isAfter(b) ? a : b;
    }

    private static YearMonth min(YearMonth a, YearMonth b) {
        return a.isBefore(b) ? a : b;
    }
}
