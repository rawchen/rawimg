package com.rawchen.dto;

import lombok.Data;

@Data
public class DashboardStatsResponse {
    private long totalGalleries;
    private long totalUsers;
    private long totalVipUsers;
    private long yesterdayGalleries;
    private long yesterdayLikes;
    private long yesterdayComments;
    private long yesterdayUsers;
    private long uniqueVisitors30Days;
    private long totalAccess30Days;
}
