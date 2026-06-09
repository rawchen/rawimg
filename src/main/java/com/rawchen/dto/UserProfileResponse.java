package com.rawchen.dto;

import com.rawchen.entity.SysUser;
import lombok.Data;
import org.springframework.beans.BeanUtils;

import java.time.LocalDateTime;

@Data
public class UserProfileResponse {
    private Long id;
    private String username;
    private String nickname;
    private String email;
    private String avatar;
    private SysUser.UserRole role;
    private Boolean vip;
    private LocalDateTime vipExpireTime;
    private String vipLevel;
    private Integer dailyDownloadCount;
    private Integer dailyDownloadLimit;
    private Integer points;
    private LocalDateTime createTime;
    private LocalDateTime lastLoginTime;
    private SysUser.UserStatus status;

    public static UserProfileResponse from(SysUser user) {
        UserProfileResponse response = new UserProfileResponse();
        BeanUtils.copyProperties(user, response);

        if (user.getVipLevel() != null) {
            SysUser.VipLevel level = SysUser.VipLevel.fromCode(user.getVipLevel());
            if (level != null) {
                response.setVipLevel(level.getCode());
                response.setDailyDownloadLimit(level.getDailyLimit());
                response.setDailyDownloadCount(user.getDailyDownloadCount());
            }
        }

        return response;
    }
}
