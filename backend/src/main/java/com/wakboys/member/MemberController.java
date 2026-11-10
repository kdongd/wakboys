package com.wakboys.member;

import com.wakboys.auth.MemberPrincipal;
import com.wakboys.common.ApiException;
import com.wakboys.common.Kst;
import com.wakboys.dues.DuesService;
import com.wakboys.media.MediaRepository;
import com.wakboys.social.CommentRepository;
import com.wakboys.social.PostRepository;
import com.wakboys.trip.TripRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MemberController {

    private final MemberRepository memberRepository;
    private final MediaRepository mediaRepository;
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final TripRepository tripRepository;
    private final DuesService duesService;

    public record MemberCard(MemberDto member, boolean linked, Integer birthMonth, Integer birthDay) {
        static MemberCard of(Member m) {
            return new MemberCard(MemberDto.of(m), m.isLinked(), m.getBirthMonth(), m.getBirthDay());
        }
    }

    public record Stats(long photos, long videos, long comments, long posts, long trips, boolean duesPerfect) {}

    public record MemberDetail(MemberCard card, Stats stats) {}

    public record BirthdayRequest(@Min(1) @Max(12) Integer birthMonth, @Min(1) @Max(31) Integer birthDay) {}

    @GetMapping("/me")
    public MemberCard me(@AuthenticationPrincipal MemberPrincipal me) {
        return MemberCard.of(memberRepository.findById(me.id()).orElseThrow());
    }

    @PatchMapping("/me")
    @Transactional
    public MemberCard updateMe(@AuthenticationPrincipal MemberPrincipal me,
                               @RequestBody @jakarta.validation.Valid BirthdayRequest req) {
        if ((req.birthMonth() == null) != (req.birthDay() == null)) {
            throw ApiException.badRequest("월과 일을 함께 입력해주세요");
        }
        if (req.birthMonth() != null) {
            try {
                LocalDate.of(2024, req.birthMonth(), req.birthDay());
            } catch (java.time.DateTimeException e) {
                throw ApiException.badRequest("없는 날짜예요");
            }
        }
        Member m = memberRepository.findById(me.id()).orElseThrow();
        m.setBirthday(req.birthMonth(), req.birthDay());
        return MemberCard.of(m);
    }

    @GetMapping("/members")
    public List<MemberCard> members() {
        return memberRepository.findAllByOrderBySortOrderAsc().stream().map(MemberCard::of).toList();
    }

    @GetMapping("/members/{slug}")
    public MemberDetail member(@PathVariable String slug) {
        Member m = memberRepository.findBySlug(slug).orElseThrow(() -> ApiException.notFound("멤버"));
        Stats stats = new Stats(
                mediaRepository.countByUploaderIdAndKind(m.getId(), "PHOTO"),
                mediaRepository.countByUploaderIdAndKind(m.getId(), "VIDEO"),
                commentRepository.countByAuthorId(m.getId()),
                postRepository.countByAuthorId(m.getId()),
                tripRepository.countByStartDateLessThanEqual(Kst.today()),
                duesService.isPerfect(m.getId()));
        return new MemberDetail(MemberCard.of(m), stats);
    }
}
