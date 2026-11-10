package com.wakboys.dues;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DuesPaymentRepository extends JpaRepository<DuesPayment, Long> {

    Optional<DuesPayment> findByMemberIdAndYm(Long memberId, String ym);

    List<DuesPayment> findByYmBetween(String from, String to);

    List<DuesPayment> findByYm(String ym);

    List<DuesPayment> findByMemberId(Long memberId);

    @Query("select coalesce(sum(p.amount), 0) from DuesPayment p")
    long totalAmount();

    @Query("select coalesce(sum(p.amount), 0) from DuesPayment p where p.ym = :ym")
    long totalForMonth(String ym);
}
