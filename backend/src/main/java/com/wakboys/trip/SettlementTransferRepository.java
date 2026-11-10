package com.wakboys.trip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SettlementTransferRepository extends JpaRepository<SettlementTransfer, Long> {

    List<SettlementTransfer> findByTripId(Long tripId);

    Optional<SettlementTransfer> findByTripIdAndFromMemberIdAndToMemberId(Long tripId, Long from, Long to);
}
