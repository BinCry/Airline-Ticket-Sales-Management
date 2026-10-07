package com.qlvmb.airticket.domain.dto;

import java.util.List;

public record MyLoyaltyResponse(
    String membershipTier,
    int pointBalance,
    int lifetimePoints,
    int availableVoucherCount,
    List<MyLoyaltyLedgerItemResponse> recentEntries,
    String nextTier,
    Integer nextTierMinPoints,
    int pointsToNextTier,
    double progressPercent
) {
}
