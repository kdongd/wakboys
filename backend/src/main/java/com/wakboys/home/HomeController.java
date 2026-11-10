package com.wakboys.home;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.Kst;
import com.wakboys.dues.DuesService;
import com.wakboys.media.MediaService;
import com.wakboys.member.Member;
import com.wakboys.member.MemberDirectory;
import com.wakboys.member.MemberDto;
import com.wakboys.social.PostService;
import com.wakboys.trip.PollService;
import com.wakboys.trip.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.MonthDay;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** One call for the whole home screen. */
@RestController
@RequestMapping("/api/home")
@RequiredArgsConstructor
public class HomeController {

    private final TripService tripService;
    private final PollService pollService;
    private final DuesService duesService;
    private final MediaService mediaService;
    private final PostService postService;
    private final MemberDirectory members;

    public record NextTrip(TripService.TripDto trip, long openPolls, TripService.Progress checklist) {}

    public record Dues(String ym, int monthlyAmount, List<MemberDto> paid, List<MemberDto> unpaid) {}

    public record Memories(TripService.TripDto trip, List<MediaService.MediaDto> media) {}

    public record Birthday(MemberDto member, int month, int day, long dday) {}

    public record Home(NextTrip nextTrip, Dues dues, List<TripService.TripDto> shelf, Memories memories,
                       List<Birthday> birthdays, List<PostService.PostDto> posts) {}

    @GetMapping
    @Transactional(readOnly = true)
    public Home home(@AuthenticationPrincipal MemberPrincipal me) {
        NextTrip next = tripService.next()
                .map(t -> new NextTrip(t, pollService.openCount(t.id()), tripService.checklistProgress(t.id())))
                .orElse(null);

        DuesService.MonthStatus month = duesService.monthStatus(Kst.thisMonth());
        Dues dues = new Dues(month.ym(), duesService.configDto().monthlyAmount(), month.paid(), month.unpaid());

        List<TripService.TripDto> shelf = tripService.list().stream()
                .filter(t -> next == null || !t.id().equals(next.trip().id()))
                .limit(8)
                .toList();

        Memories memories = tripService.latestWithMedia()
                .map(t -> new Memories(t, mediaService.latest(me, t.id(), 6)))
                .orElse(null);

        return new Home(next, dues, shelf, memories, birthdays(45), postService.latest(me, 3));
    }

    private List<Birthday> birthdays(int withinDays) {
        LocalDate today = Kst.today();
        List<Birthday> out = new ArrayList<>();
        for (Member m : members.all()) {
            if (m.getBirthMonth() == null || m.getBirthDay() == null) {
                continue;
            }
            MonthDay md = MonthDay.of(m.getBirthMonth(), m.getBirthDay());
            LocalDate next = md.isValidYear(today.getYear()) ? md.atYear(today.getYear()) : LocalDate.of(today.getYear(), 3, 1);
            if (next.isBefore(today)) {
                next = md.isValidYear(today.getYear() + 1) ? md.atYear(today.getYear() + 1) : LocalDate.of(today.getYear() + 1, 3, 1);
            }
            long dday = ChronoUnit.DAYS.between(today, next);
            if (dday <= withinDays) {
                out.add(new Birthday(MemberDto.of(m), m.getBirthMonth(), m.getBirthDay(), dday));
            }
        }
        out.sort(Comparator.comparingLong(Birthday::dday));
        return out;
    }
}
