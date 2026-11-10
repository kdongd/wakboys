package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {

    List<PollVote> findByPollIdIn(Collection<Long> pollIds);

    @Modifying
    @Query("delete from PollVote v where v.pollId = :pollId and v.memberId = :memberId")
    void deleteMine(Long pollId, Long memberId);
}
