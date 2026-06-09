package com.rawchen.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName(value = "sys_user", autoResultMap = true)
public class SysUser extends BaseEntity {

    private String username;

    private String password;

    private String email;

    private String nickname;

    private String avatar;

    @TableField("role")
    private UserRole role = UserRole.USER;

    @TableField("vip")
    private Boolean vip = false;

    @TableField("vip_expire_time")
    private LocalDateTime vipExpireTime;

    @TableField("vip_level")
    private String vipLevel;

    @TableField("daily_download_count")
    private Integer dailyDownloadCount = 0;

    @TableField("daily_download_reset_time")
    private LocalDateTime dailyDownloadResetTime;

    private Integer points;

    @TableField("total_points")
    private Integer totalPoints;

    @TableField("status")
    private UserStatus status = UserStatus.NORMAL;

    @TableField("last_active_time")
    private LocalDateTime lastActiveTime;

    private LocalDateTime lastLoginTime;

    public enum UserRole {
        ADMIN, STAFF, USER
    }

    public enum UserStatus {
        NORMAL(1), BANNED(0);

        @EnumValue
        private final int value;

        UserStatus(int value) {
            this.value = value;
        }
    }

    public enum VipLevel {
        WEEK("WEEK", "周卡", 2),
        MONTH("MONTH", "月卡", 5),
        YEAR("YEAR", "年卡", 10);

        private final String code;
        private final String name;
        private final int dailyLimit;

        VipLevel(String code, String name, int dailyLimit) {
            this.code = code;
            this.name = name;
            this.dailyLimit = dailyLimit;
        }

        public String getCode() {
            return code;
        }

        public String getName() {
            return name;
        }

        public int getDailyLimit() {
            return dailyLimit;
        }

        public static VipLevel fromDays(int days) {
            if (days <= 7) return WEEK;
            if (days <= 30) return MONTH;
            return YEAR;
        }

        public static VipLevel fromCode(String code) {
            for (VipLevel level : values()) {
                if (level.code.equals(code)) {
                    return level;
                }
            }
            return null;
        }
    }
}
