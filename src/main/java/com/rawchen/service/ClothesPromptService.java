package com.rawchen.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rawchen.entity.MaterialAsset;
import com.rawchen.vo.MaterialStyleVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 换装提示词拼接服务
 * <p>
 * 负责：换装风格定义（供前端下拉框使用）+ 三参考图（人物/服装/姿态）提示词模板拼接。
 * 提示词模板形如：
 * <pre>
 * 请根据提供的 3 张参考图，生成一张完整的真实人物照片：
 * • 人物：图1中的人物，保持其脸型、五官、发型（中长发）和发色一致。……
 * • 服装：让人物穿上图2中展示的整套服装和配饰（参考名称：……），每件单品的颜色、款式、面料与配饰都以图2为准，名称仅作辅助说明。
 * • 姿势：按照图3中人体模型的动作和镜头角度摆姿势（站立・单手抚后脑，正面）；……
 * • 风格：写实商业摄影级质感，85mm 人像镜头，……
 * 画面中没有任何文字、标志或水印。
 * </pre>
 * <p>
 * 当选择「无预设（跟随参考图）」时，不追加「• 风格：」段落，整体画风完全跟随参考图。
 */
@Slf4j
@Service
public class ClothesPromptService {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * 风格定义（有序，前端按此顺序展示下拉框，第一项为「无预设（跟随参考图）」）
     */
    private static final List<MaterialStyleVO> STYLES = buildStyles();

    /**
     * 默认风格
     */
    public static final String DEFAULT_STYLE_CODE = "realistic_portrait";

    /**
     * 无预设（跟随参考图）编码：不追加风格描述，画风跟随参考图
     */
    public static final String NO_STYLE_CODE = "none";

    /**
     * 获取全部风格
     */
    public List<MaterialStyleVO> listStyles() {
        List<MaterialStyleVO> result = new ArrayList<>(STYLES.size());
        for (MaterialStyleVO style : STYLES) {
            MaterialStyleVO copy = new MaterialStyleVO();
            copy.setCode(style.getCode());
            copy.setName(style.getName());
            copy.setStylePrompt(style.getStylePrompt());
            copy.setRealistic(style.getRealistic());
            result.add(copy);
        }
        return result;
    }

    /**
     * 根据编码获取风格，未知编码回退到默认风格（写实人像写真）
     */
    public MaterialStyleVO getStyle(String code) {
        if (StringUtils.hasText(code)) {
            for (MaterialStyleVO style : STYLES) {
                if (style.getCode().equals(code)) {
                    return style;
                }
            }
        }
        for (MaterialStyleVO style : STYLES) {
            if (DEFAULT_STYLE_CODE.equals(style.getCode())) {
                return style;
            }
        }
        return STYLES.get(0);
    }

    /**
     * 拼接最终提示词
     *
     * @param styleCode 风格编码
     * @param person   人物素材（可为 null，表示用户自己上传的人物图）
     * @param costume  服装素材（可为 null）
     * @param pose     姿态素材（可为 null）
     * @return 最终提示词
     */
    public String buildPrompt(String styleCode, MaterialAsset person, MaterialAsset costume, MaterialAsset pose) {
        MaterialStyleVO style = getStyle(styleCode);
        boolean realistic = Boolean.TRUE.equals(style.getRealistic());
        // 无预设：画风完全跟随参考图，不追加风格段落
        boolean noPreset = NO_STYLE_CODE.equals(style.getCode());

        StringBuilder sb = new StringBuilder();

        // ---------- 开头 ----------
        sb.append(realistic
                ? "请根据提供的 3 张参考图，生成一张完整的真实人物照片：\n"
                : "请根据提供的 3 张参考图，生成一张完整的人物图像：\n");

        // ---------- 人物 ----------
        String hair = resolveHair(person);
        sb.append("• 人物：图1中的人物，保持其脸型、五官、发型");
        if (hair != null) {
            sb.append("（").append(hair).append("）");
        }
        sb.append("和发色一致。人物的肤色必须与图一人物一致，所有裸露皮肤（包括服装镂空处露出的皮肤）")
                .append("必须与脸部肤色统一，");
        if (noPreset) {
            sb.append("统一后的肤色与质感与图1人物保持一致。\n");
        } else {
            sb.append("统一后的肤色与质感按风格要求呈现。\n");
        }

        // ---------- 服装 ----------
        sb.append("• 服装：让人物穿上图2中展示的整套服装和配饰");
        String costumeTitle = resolveCostumeTitle(costume);
        if (costumeTitle != null) {
            sb.append("（参考名称：").append(costumeTitle).append("）");
        }
        sb.append("，每件单品的颜色、款式、面料与配饰都以图2为准，名称仅作辅助说明。\n");

        // ---------- 姿势 ----------
        sb.append("• 姿势：按照图3中人体模型的动作和镜头角度摆姿势");
        String poseDesc = resolvePoseDescription(pose);
        if (poseDesc != null) {
            sb.append("（").append(poseDesc).append("）");
        }
        sb.append("；图3只是动作示意，");
        if (noPreset) {
            sb.append("最终画面中的人物以图1的形象为准，穿着图2的服装。\n");
        } else if (realistic) {
            sb.append("最终画面中的人物是真人，皮肤真实自然，穿着图2的服装。\n");
        } else {
            sb.append("最终画面中的人物需符合所选风格，穿着图2的服装。\n");
        }

        // ---------- 风格（无预设时不追加） ----------
        if (!noPreset && StringUtils.hasText(style.getStylePrompt())) {
            sb.append("• 风格：").append(style.getStylePrompt()).append("\n");
        }

        // ---------- 结尾 ----------
        sb.append("画面中没有任何文字、标志或水印。");

        return sb.toString();
    }

    /**
     * 解析人物素材的发型（分类名即发长）
     */
    private String resolveHair(MaterialAsset person) {
        if (person == null) {
            return null;
        }
        String hair = readExtra(person, "hair");
        if (StringUtils.hasText(hair)) {
            return hair;
        }
        if (StringUtils.hasText(person.getCategoryName())) {
            return person.getCategoryName();
        }
        return null;
    }

    /**
     * 解析服装素材标题
     */
    private String resolveCostumeTitle(MaterialAsset costume) {
        if (costume == null || !StringUtils.hasText(costume.getTitle())) {
            return null;
        }
        return costume.getTitle();
    }

    /**
     * 解析姿态描述：姿势类型・姿势名称，镜头角度
     */
    private String resolvePoseDescription(MaterialAsset pose) {
        if (pose == null) {
            return null;
        }
        Map<String, Object> extra = parseExtra(pose.getExtra());
        String poseType = stringValue(extra.get("poseType"));
        String poseName = StringUtils.hasText(pose.getTitle()) ? pose.getTitle() : stringValue(extra.get("poseName"));
        String angle = stringValue(extra.get("angle"));

        List<String> parts = new ArrayList<>();
        if (StringUtils.hasText(poseType) && StringUtils.hasText(poseName)) {
            parts.add(poseType + "・" + poseName);
        } else if (StringUtils.hasText(poseName)) {
            parts.add(poseName);
        } else if (StringUtils.hasText(poseType)) {
            parts.add(poseType);
        }
        if (StringUtils.hasText(angle)) {
            parts.add(angle);
        }
        if (parts.isEmpty()) {
            return null;
        }
        return String.join("，", parts);
    }

    private String readExtra(MaterialAsset asset, String key) {
        Map<String, Object> extra = parseExtra(asset.getExtra());
        return stringValue(extra.get(key));
    }

    private Map<String, Object> parseExtra(String json) {
        if (!StringUtils.hasText(json)) {
            return Collections.emptyMap();
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<Map<String, Object>>() {
            });
        } catch (Exception e) {
            log.warn("解析素材扩展信息失败: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value);
        return StringUtils.hasText(text) ? text : null;
    }

    private static List<MaterialStyleVO> buildStyles() {
        List<MaterialStyleVO> styles = new ArrayList<>();

        // 第一项：无预设（跟随参考图），不追加风格描述
        styles.add(style(NO_STYLE_CODE, "无预设（跟随参考图）", false, ""));

        styles.add(style("realistic_portrait", "写实人像写真", true,
                "写实商业摄影级质感，85mm 人像镜头，自然柔和光影，真实肌肤纹理与织物细节，8k 高清画质。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("magazine", "日韩杂志画报", true,
                "日韩时尚穿搭杂志画报风格，干净极简摄影棚背景，高级色调，突出人物颜值与服装剪裁。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("film_retro", "复古胶片写真", true,
                "35mm 富士胶片摄影质感，轻微胶片颗粒，柔和复古暖调，自然街拍光影与电影呼吸感。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("game_2_5d", "2.5D 游戏原画立绘", false,
                "2.5D 半写实高精度游戏角色原画，唯美厚涂光影，精致五官与华丽布料金属质感。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("anime_jp", "日系二次元插画", false,
                "日系精致二次元插画风格，细腻赛璐璐与厚涂光影过渡，动漫角色立绘质感，色彩通透干净。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("shinkai_movie", "新海诚感动画电影", false,
                "动画电影级画面质感，清澈高饱和光影，细腻体积光与发丝高光，干净唯美的动漫色彩。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("manga_mono", "日式黑白漫画网点", false,
                "日本黑白漫画原稿风格，利落精准的G笔线稿，细腻漫画网点纸阴影与层次对比。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("game_3d", "3D 次世代角色渲染", false,
                "Unreal Engine 5 / Octane Render 次世代 3D 角色渲染，细腻次表面散射肌肤材质，电影级布光。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("figure_3d", "3D 潮玩手办质感", false,
                "高品质 PVC 涂装完成品手办质感，柔和摄影棚柔光箱布光，精致材质高光与微距景深。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("cyberpunk", "赛博朋克霓虹", false,
                "赛博朋克科幻视觉风格，雨夜霓虹冷暖双色轮廓光，未来感材质反光与电影级氛围。 人物比例协调，手部与五官自然，光影统一。"));
        styles.add(style("character_sheet", "角色设定集立绘（纯白底）", false,
                "标准角色设定集全身立绘，纯白干净无杂物背景，均匀漫反射布光，清晰展示全身服装结构与配饰细节。 人物比例协调，手部与五官自然，光影统一。"));

        return styles;
    }

    private static MaterialStyleVO style(String code, String name, boolean realistic, String stylePrompt) {
        MaterialStyleVO vo = new MaterialStyleVO();
        vo.setCode(code);
        vo.setName(name);
        vo.setRealistic(realistic);
        vo.setStylePrompt(stylePrompt);
        return vo;
    }
}
