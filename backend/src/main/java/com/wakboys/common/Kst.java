package com.wakboys.common;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

public final class Kst {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private Kst() {}

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    public static YearMonth thisMonth() {
        return YearMonth.now(ZONE);
    }
}
