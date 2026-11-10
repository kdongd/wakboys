package com.wakboys.dues;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.Kst;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/dues")
@RequiredArgsConstructor
public class DuesController {

    private final DuesService duesService;

    public record PaymentRequest(@NotNull Long memberId, @NotBlank String ym, boolean paid) {}

    public record ExpenseRequest(@NotBlank @Size(max = 100) String title, @Positive int amount, LocalDate spentOn) {}

    public record ConfigRequest(Integer monthlyAmount, Long initialBalance, @Size(max = 100) String bankInfo, String startYm) {}

    @GetMapping
    public DuesService.Overview overview(@RequestParam(required = false) Integer year) {
        return duesService.overview(year == null ? Kst.today().getYear() : year);
    }

    @PutMapping("/payments")
    public DuesService.PaymentDto setPaid(@AuthenticationPrincipal MemberPrincipal me, @RequestBody @Valid PaymentRequest req) {
        return duesService.setPaid(me, req.memberId(), req.ym(), req.paid());
    }

    @PostMapping("/expenses")
    public DuesService.ExpenseDto addExpense(@AuthenticationPrincipal MemberPrincipal me, @RequestBody @Valid ExpenseRequest req) {
        return duesService.addExpense(me, req.title(), req.amount(), req.spentOn());
    }

    @DeleteMapping("/expenses/{id}")
    public void deleteExpense(@AuthenticationPrincipal MemberPrincipal me, @PathVariable Long id) {
        duesService.deleteExpense(me, id);
    }

    @PatchMapping("/config")
    public DuesService.ConfigDto config(@AuthenticationPrincipal MemberPrincipal me, @RequestBody @Valid ConfigRequest req) {
        return duesService.updateConfig(me, req.monthlyAmount(), req.initialBalance(), req.bankInfo(), req.startYm());
    }
}
