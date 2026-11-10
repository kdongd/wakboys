package com.wakboys.member;

import com.wakboys.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Only 8 rows ever exist, so lookups load the full table instead of joining everywhere. */
@Component
@RequiredArgsConstructor
public class MemberDirectory {

    private final MemberRepository memberRepository;

    public List<Member> all() {
        return memberRepository.findAllByOrderBySortOrderAsc();
    }

    public Map<Long, MemberDto> dtoMap() {
        return all().stream().collect(Collectors.toMap(Member::getId, MemberDto::of, (a, b) -> a, java.util.LinkedHashMap::new));
    }

    public Map<Long, Member> map() {
        return all().stream().collect(Collectors.toMap(Member::getId, Function.identity()));
    }

    public Member get(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> ApiException.notFound("멤버"));
    }

    public MemberDto dto(Long id) {
        return id == null ? null : MemberDto.of(get(id));
    }
}
