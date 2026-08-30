package com.rawchen.service;

import com.rawchen.vo.MusicLyricVO;
import com.rawchen.vo.MusicUrlVO;
import com.rawchen.vo.MusicVO;

import java.util.List;

/**
 * 音乐服务接口
 *
 * @author RawChen
 */
public interface MusicService {

    /**
     * 搜索歌曲
     *
     * @param keyword 关键词
     * @param limit   限制数量
     * @param musicU  用户token
     * @return 歌曲列表
     */
    List<MusicVO> search(String keyword, Integer limit, String musicU);

    /**
     * 获取歌曲详情
     *
     * @param id     歌曲ID
     * @param musicU 用户token
     * @return 歌曲信息
     */
    MusicVO song(String id, String musicU);

    /**
     * 获取歌曲播放链接
     *
     * @param id     歌曲ID
     * @param br     码率
     * @param musicU 用户token
     * @return 播放链接
     */
    MusicUrlVO url(String id, Integer br, String musicU);

    /**
     * 获取歌词
     *
     * @param id     歌曲ID
     * @param musicU 用户token
     * @return 歌词
     */
    MusicLyricVO lyric(String id, String musicU);

    /**
     * 获取歌单
     *
     * @param id         歌单ID
     * @param musicU     用户token
     * @return 歌曲列表
     */
    List<MusicVO> playlist(String id, String musicU);

    /**
     * 清除播放列表缓存
     *
     * @param id 歌单ID
     */
    void clearPlaylistCache(String id);
}
