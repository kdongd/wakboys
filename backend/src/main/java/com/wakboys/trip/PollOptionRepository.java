package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface PollOptionRepository extends JpaRepository<PollOption, Long> {

    List<PollOption> findByPollIdInOrderBySortAscIdAsc(Collection<Long> pollIds);

    List<PollOption> findByPollId(Long pollId);
}
