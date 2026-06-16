package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.service.OssStsService;
import com.rawchen.vo.StsTokenVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * OSS控制器
 */
@Slf4j
@RestController
@RequestMapping("/api/oss")
@RequiredArgsConstructor
public class OssController {

    private final OssStsService ossStsService;

    /**
     * 获取STS临时凭证
     *
     * @return STS临时凭证
     */
    @GetMapping("/sts-token")
    public R<StsTokenVO> getStsToken() {
        try {
            StsTokenVO token = ossStsService.getStsToken();
            return R.ok(token);
        } catch (Exception e) {
            log.error("获取STS临时凭证失败: {}", e.getMessage());
            return R.fail("获取STS临时凭证失败: " + e.getMessage());
        }
    }
}
