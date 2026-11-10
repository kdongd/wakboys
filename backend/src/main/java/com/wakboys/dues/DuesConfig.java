package com.wakboys.dues;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "dues_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuesConfig {

    @Id
    private Integer id;

    private int monthlyAmount;
    private long initialBalance;
    private String bankInfo;
    private String startYm;

    public void update(Integer monthlyAmount, Long initialBalance, String bankInfo, String startYm) {
        if (monthlyAmount != null) this.monthlyAmount = monthlyAmount;
        if (initialBalance != null) this.initialBalance = initialBalance;
        if (bankInfo != null) this.bankInfo = bankInfo.isBlank() ? null : bankInfo.trim();
        if (startYm != null) this.startYm = startYm;
    }
}
