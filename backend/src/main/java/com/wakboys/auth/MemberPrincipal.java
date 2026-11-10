package com.wakboys.auth;

import com.wakboys.common.ApiException;
import com.wakboys.member.Member;

public record MemberPrincipal(Long id, String slug, String name, boolean admin, boolean treasurer) {

    public static MemberPrincipal of(Member m) {
        return new MemberPrincipal(m.getId(), m.getSlug(), m.getName(), m.isAdmin(), m.isTreasurer());
    }

    public boolean canManageMoney() {
        return admin || treasurer;
    }

    public void requireMoneyManager() {
        if (!canManageMoney()) {
            throw ApiException.forbidden("총무만 할 수 있어요");
        }
    }

    public void requireAdmin() {
        if (!admin) {
            throw ApiException.forbidden("운영자만 할 수 있어요");
        }
    }

    /** Authors can edit their own things; the admin can clean up anything. */
    public void requireOwnerOrAdmin(Long ownerId) {
        if (!admin && !id.equals(ownerId)) {
            throw ApiException.forbidden("작성자만 할 수 있어요");
        }
    }
}
