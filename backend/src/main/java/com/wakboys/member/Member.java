package com.wakboys.member;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String slug;
    private String name;
    private String themeColor;
    private int sortOrder;
    private Long kakaoId;
    private String inviteCode;

    @Column(name = "is_admin")
    private boolean admin;

    @Column(name = "is_treasurer")
    private boolean treasurer;

    private Integer birthMonth;
    private Integer birthDay;
    private Instant linkedAt;

    public boolean isLinked() {
        return kakaoId != null;
    }

    public void link(long kakaoId) {
        this.kakaoId = kakaoId;
        this.inviteCode = null;
        this.linkedAt = Instant.now();
    }

    public void unlink(String newInviteCode) {
        this.kakaoId = null;
        this.linkedAt = null;
        this.inviteCode = newInviteCode;
    }

    public void setInviteCode(String inviteCode) {
        this.inviteCode = inviteCode;
    }

    public void setTreasurer(boolean treasurer) {
        this.treasurer = treasurer;
    }

    public void setBirthday(Integer month, Integer day) {
        this.birthMonth = month;
        this.birthDay = day;
    }

    public boolean canManageMoney() {
        return treasurer || admin;
    }
}
