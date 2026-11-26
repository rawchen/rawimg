package com.rawchen.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.rawchen.dto.PageResponse;
import com.rawchen.entity.MaterialAsset;
import com.rawchen.entity.R;
import com.rawchen.service.ClothesPromptService;
import com.rawchen.service.MaterialLibraryService;
import com.rawchen.vo.MaterialCategoryVO;
import com.rawchen.vo.MaterialStyleVO;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 素材库（人物/服装/姿态）前台查询接口
 */
@Slf4j
@RestController
@RequestMapping("/api/material-library")
@RequiredArgsConstructor
public class MaterialLibraryController {

    private final MaterialLibraryService materialLibraryService;
    private final ClothesPromptService clothesPromptService;

    /**
     * 分类列表
     *
     * @param groupType   大类(portrait/costume/pose)，可空
     * @param libraryType 子库，可空
     */
    @GetMapping("/categories")
    public R<List<MaterialCategoryVO>> categories(
            @RequestParam(value = "groupType", required = false) String groupType,
            @RequestParam(value = "libraryType", required = false) String libraryType) {
        return R.ok(materialLibraryService.listCategories(groupType, libraryType, false));
    }

    /**
     * 素材列表（分页）
     */
    @GetMapping("/assets")
    public R<PageResponse<MaterialAsset>> assets(
            @RequestParam(value = "groupType", required = false) String groupType,
            @RequestParam(value = "libraryType", required = false) String libraryType,
            @RequestParam(value = "categoryCode", required = false) String categoryCode,
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "page", defaultValue = "1") Integer page,
            @RequestParam(value = "size", defaultValue = "24") Integer size) {

        int safeSize = size == null || size <= 0 ? 24 : Math.min(size, 200);
        int safePage = page == null || page <= 0 ? 1 : page;

        IPage<MaterialAsset> result = materialLibraryService.pageAssets(
                groupType, libraryType, categoryCode, keyword, null, safePage, safeSize);

        return R.ok(PageResponse.of(result, safePage));
    }

    /**
     * 素材详情
     */
    @GetMapping("/asset/{id}")
    public R<MaterialAsset> asset(@PathVariable("id") Long id) {
        MaterialAsset asset = materialLibraryService.getById(id);
        if (asset == null) {
            return R.notFound("素材不存在");
        }
        return R.ok(asset);
    }

    /**
     * 换装风格列表（前端下拉框）
     */
    @GetMapping("/styles")
    public R<List<MaterialStyleVO>> styles() {
        return R.ok(clothesPromptService.listStyles());
    }

    /**
     * 提示词预览（根据素材 + 风格拼接）
     */
    @PostMapping("/prompt/preview")
    public R<PromptPreviewResponse> previewPrompt(@RequestBody PromptPreviewRequest request) {
        MaterialAsset person = request.getPersonAssetId() == null ? null
                : materialLibraryService.getById(request.getPersonAssetId());
        MaterialAsset costume = request.getCostumeAssetId() == null ? null
                : materialLibraryService.getById(request.getCostumeAssetId());
        MaterialAsset pose = request.getPoseAssetId() == null ? null
                : materialLibraryService.getById(request.getPoseAssetId());

        String prompt = clothesPromptService.buildPrompt(request.getStyleCode(), person, costume, pose);

        PromptPreviewResponse response = new PromptPreviewResponse();
        response.setPrompt(prompt);
        response.setPersonImageUrl(person == null ? null : person.getFullUrl());
        response.setCostumeImageUrl(costume == null ? null : costume.getFullUrl());
        response.setPoseImageUrl(pose == null ? null : pose.getFullUrl());
        return R.ok(response);
    }

    /**
     * 提示词预览请求
     */
    @Data
    public static class PromptPreviewRequest {
        private Long personAssetId;
        private Long costumeAssetId;
        private Long poseAssetId;
        private String styleCode;
    }

    /**
     * 提示词预览响应
     */
    @Data
    public static class PromptPreviewResponse {
        private String prompt;
        private String personImageUrl;
        private String costumeImageUrl;
        private String poseImageUrl;
    }
}
