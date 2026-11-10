package com.wakboys.member;

/** Minimal member info used everywhere a person is shown (avatar, name, badge). */
public record MemberDto(Long id, String slug, String name, String themeColor, boolean treasurer, boolean admin) {

    public static MemberDto of(Member m) {
        return new MemberDto(m.getId(), m.getSlug(), m.getName(), m.getThemeColor(), m.isTreasurer(), m.isAdmin());
    }
}
