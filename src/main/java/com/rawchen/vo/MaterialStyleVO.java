package com.rawchen.vo;

import lombok.Data;

/**
 * 换装风格VO
 * <p>
 * 用于 AI 智能换装页的风格下拉框，stylePrompt 为拼接进最终提示词的风格描述。
 */
@Data
public class MaterialStyleVO {

    /**
     * 风格编码
     */
    private String code;

    /**
     * 风格名称（中文）
     */
    private String name;

    /**
     * 风格描述（拼接进提示词）
     */
    private String stylePrompt;

    /**
     * 是否写实真人风格（决定提示词里写"真实人物照片"还是"完整人物图像"）
     */
    private Boolean realistic;
}
