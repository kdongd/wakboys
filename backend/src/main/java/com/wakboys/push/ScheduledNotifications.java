package com.wakboys.push;

import com.wakboys.common.Kst;
import com.wakboys.member.Member;
import com.wakboys.member.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Render Starter keeps the instance running, so in-app scheduling is reliable
 * (no external cron needed).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledNotifications {

    private final PushService pushService;
    private final MemberRepository memberRepository;

    /** Last day of every month, 20:00 KST — to all 8. */
    @Scheduled(cron = "0 0 20 L * *", zone = "Asia/Seoul")
    public void monthEndDuesReminder() {
        List<Long> all = memberRepository.findAll().stream().filter(Member::isLinked).map(Member::getId).toList();
        int sent = pushService.deliver(all, "와크보이즈 회비",
                "혹시 이번달 회비를 깜빡하진 않으셨나요?", "/dues");
        log.info("[push] month-end dues reminder sent to {} devices", sent);
    }

    /** 09:00 KST on someone's birthday — to everyone else. */
    @Scheduled(cron = "0 0 9 * * *", zone = "Asia/Seoul")
    public void birthdays() {
        LocalDate today = Kst.today();
        List<Member> members = memberRepository.findAll();
        for (Member m : members) {
            if (m.getBirthMonth() != null && m.getBirthMonth() == today.getMonthValue()
                    && m.getBirthDay() != null && m.getBirthDay() == today.getDayOfMonth()) {
                List<Long> others = members.stream()
                        .filter(Member::isLinked)
                        .map(Member::getId)
                        .filter(id -> !id.equals(m.getId()))
                        .toList();
                pushService.deliver(others, "🎂 생일 축하!", "오늘은 " + m.getName() + " 생일이에요. 축하 한마디 남겨주세요", "/members/" + m.getSlug());
            }
        }
    }
}
