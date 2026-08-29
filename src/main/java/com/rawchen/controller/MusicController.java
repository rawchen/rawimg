package com.rawchen.controller;

import com.rawchen.entity.R;
import com.rawchen.service.MusicService;
import com.rawchen.vo.MusicLyricVO;
import com.rawchen.vo.MusicUrlVO;
import com.rawchen.vo.MusicVO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.List;

/**
 * 音乐控制器
 *
 * @author RawChen
 */
@RestController
@RequestMapping("/api/music")
public class MusicController {

    @Autowired
    private MusicService musicService;

    /**
     * 搜索歌曲
     */
    @GetMapping("/search")
    public R search(@RequestParam String keyword,
                    @RequestParam(defaultValue = "30") Integer limit,
                    HttpServletRequest request) {
        String musicU = getMusicU(request);
        List<MusicVO> list = musicService.search(keyword, limit, musicU);
        list.forEach(this::convertUrlToHttps);
        return R.ok("list", list);
    }

    /**
     * 获取歌曲详情
     */
    @GetMapping("/song/{id}")
    public R song(@PathVariable String id, HttpServletRequest request) {
        String musicU = getMusicU(request);
        MusicVO vo = musicService.song(id, musicU);
        convertUrlToHttps(vo);
        return R.ok("song", vo);
    }

    /**
     * 获取歌曲播放链接
     */
    @GetMapping("/url/{id}")
    public R url(@PathVariable String id,
                 @RequestParam(defaultValue = "320") Integer br,
                 HttpServletRequest request) {
        String musicU = getMusicU(request);
        MusicUrlVO vo = musicService.url(id, br, musicU);
        convertUrlToHttps(vo);
        return R.ok("url", vo);
    }

    /**
     * 获取歌词 (JSON格式)
     */
    @GetMapping("/lyric/{id}")
    public R lyric(@PathVariable String id, HttpServletRequest request) {
        String musicU = getMusicU(request);
        MusicLyricVO vo = musicService.lyric(id, musicU);
        return R.ok("lyric", vo);
    }

    /**
     * 获取歌词 (纯文本格式)
     */
    @GetMapping("/lyric/{id}/text")
    @ResponseBody
    public String lyricText(@PathVariable String id, HttpServletRequest request) {
        String musicU = getMusicU(request);
        MusicLyricVO vo = musicService.lyric(id, musicU);
        if (vo != null && vo.getLyric() != null) {
            return vo.getLyric();
        }
        return "";
    }

    /**
     * 获取歌单
     */
    @GetMapping("/playlist/{id}")
    public R playlist(@PathVariable String id, HttpServletRequest request) {
        String musicU = getMusicU(request);
        List<MusicVO> list = musicService.playlist(id, musicU);
        list.forEach(this::convertUrlToHttps);
        return R.ok("list", list);
    }

    /**
     * 从请求头或参数中获取music_u
     */
    private String getMusicU(HttpServletRequest request) {
        String musicU = request.getHeader("X-Music-U");
        if (musicU == null || musicU.isEmpty()) {
            musicU = request.getParameter("music_u");
        }
        return musicU != null ? musicU : "";
    }

    /**
     * 将 MusicVO 中的 url 和 pic 字段从 http 替换为 https
     */
    private void convertUrlToHttps(MusicVO vo) {
        if (vo != null) {
            if (vo.getUrl() != null && vo.getUrl().startsWith("http://")) {
                vo.setUrl(vo.getUrl().replace("http://", "https://"));
            }
            if (vo.getPic() != null && vo.getPic().startsWith("http://")) {
                vo.setPic(vo.getPic().replace("http://", "https://"));
            }
        }
    }

    /**
     * 将 MusicUrlVO 中的 url 字段从 http 替换为 https
     */
    private void convertUrlToHttps(MusicUrlVO vo) {
        if (vo != null && vo.getUrl() != null && vo.getUrl().startsWith("http://")) {
            vo.setUrl(vo.getUrl().replace("http://", "https://"));
        }
    }
}
