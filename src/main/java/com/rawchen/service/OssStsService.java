package com.rawchen.service;

import com.rawchen.vo.StsTokenVO;

/**
 * OSS STS服务接口
 */
public interface OssStsService {

    /**
     * 获取STS临时凭证
     *
     * @return STS临时凭证
     */
    StsTokenVO getStsToken();
}
