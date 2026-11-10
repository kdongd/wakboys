package com.wakboys.dues;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface DuesExpenseRepository extends JpaRepository<DuesExpense, Long> {

    List<DuesExpense> findAllByOrderBySpentOnDescIdDesc(Pageable pageable);

    @Query("select coalesce(sum(e.amount), 0) from DuesExpense e")
    long totalAmount();

    @Query("select coalesce(sum(e.amount), 0) from DuesExpense e where e.spentOn between :from and :to")
    long totalBetween(LocalDate from, LocalDate to);
}
