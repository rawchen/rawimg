package com.rawchen.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.rawchen.service.MusicService;
import com.rawchen.util.NetEaseCryptoUtil;
import com.rawchen.vo.MusicLyricVO;
import com.rawchen.vo.MusicUrlVO;
import com.rawchen.vo.MusicVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 网易云音乐服务实现
 *
 * @author RawChen
 */
@Slf4j
@Service
public class MusicServiceImpl implements MusicService {

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    private static final String BASE_URL = "https://music.163.com";
    private static final String PLAYLIST_CACHE_PREFIX = "music:playlist:";

    /**
     * 获取请求头
     */
    private Map<String, String> getHeaders(String musicU) {
        Map<String, String> headers = new HashMap<>();
        String deviceId = NetEaseCryptoUtil.generateDeviceId();
        String timestamp = String.valueOf(System.currentTimeMillis());
        String requestId = timestamp + String.format("%04d", (int) (Math.random() * 1000));

        headers.put("User-Agent", "Mozilla/5.0 (Linux; Android 11; M2007J3SC Build/RKQ1.200826.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36 NeteaseMusic/8.7.01");
        headers.put("Referer", "music.163.com");
        headers.put("Cookie", String.format("osver=android; appver=8.7.01; os=android; deviceId=%s; channel=netease; requestId=%s; __remember_me=true; MUSIC_U=%s", deviceId, requestId, StrUtil.isBlank(musicU) ? "" : musicU));
        headers.put("Content-Type", "application/x-www-form-urlencoded");
        headers.put("Accept", "*/*");
        headers.put("Accept-Language", "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7");
        return headers;
    }

    /**
     * 发送EAPI请求
     */
    private JSONObject sendEapiRequest(String apiPath, Map<String, Object> body, String musicU) {
        try {
            String eapiPath = apiPath.replace("/api/", "/eapi/");
            String url = BASE_URL + eapiPath;
            String bodyJson = JSONUtil.toJsonStr(body);
            String params = NetEaseCryptoUtil.eapiEncrypt(apiPath, bodyJson);

            log.debug("EAPI请求: url={}, apiPath={}, body={}", url, apiPath, bodyJson);

            Map<String, String> headers = getHeaders(musicU);
            HttpResponse response = HttpRequest.post(url)
                    .headerMap(headers, true)
                    .body("params=" + params)
                    .timeout(20000)
                    .execute();

            String result = response.body();
            log.debug("EAPI响应状态: {}", response.getStatus());

            if (result.contains("\"code\":")) {
                JSONObject jsonObj = JSONUtil.parseObj(result);
                int code = jsonObj.getInt("code", -1);
                if (code != 200 && code != -1) {
                    log.warn("EAPI返回错误码: {}, 消息: {}", code, jsonObj.getStr("message"));
                }
            }

            return JSONUtil.parseObj(result);
        } catch (Exception e) {
            log.error("发送EAPI请求失败: path={}", apiPath, e);
            return new JSONObject();
        }
    }

    @Override
    public List<MusicVO> search(String keyword, Integer limit, String musicU) {
        if (limit == null || limit <= 0) {
            limit = 30;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("s", keyword);
        body.put("type", 1);
        body.put("limit", limit);
        body.put("total", "true");
        body.put("offset", 0);

        JSONObject result = sendEapiRequest("/api/cloudsearch/pc", body, musicU);

        List<MusicVO> list = new ArrayList<>();
        if (result.containsKey("result")) {
            JSONObject resultObj = result.getJSONObject("result");
            if (resultObj != null && resultObj.containsKey("songs")) {
                JSONArray songs = resultObj.getJSONArray("songs");
                for (int i = 0; i < songs.size(); i++) {
                    JSONObject song = songs.getJSONObject(i);
                    MusicVO vo = convertSongJsonToVO(song);
                    if (vo != null && StrUtil.isNotBlank(vo.getId())) {
                        MusicUrlVO urlVo = url(vo.getId(), 320, musicU);
                        if (urlVo != null && StrUtil.isNotBlank(urlVo.getUrl())) {
                            vo.setUrl(urlVo.getUrl());
                        }
                    }
                    if (vo != null) {
                        list.add(vo);
                    }
                }
            }
        }

        return list;
    }

    @Override
    public MusicVO song(String id, String musicU) {
        Map<String, Object> body = new HashMap<>();
        body.put("c", "[{\"id\":" + id + ",\"v\":0}]");

        JSONObject result = sendEapiRequest("/api/v3/song/detail/", body, musicU);

        if (result.containsKey("songs")) {
            JSONArray songs = result.getJSONArray("songs");
            if (songs != null && !songs.isEmpty()) {
                JSONObject song = songs.getJSONObject(0);
                MusicVO vo = convertSongJsonToVO(song);
                if (vo != null) {
                    MusicUrlVO urlVo = url(id, 320, musicU);
                    if (urlVo != null) {
                        vo.setUrl(urlVo.getUrl());
                    }
                    vo.setLrc("/api/music/lyric/" + id + "/text");
                }
                return vo;
            }
        }

        return null;
    }

    @Override
    public MusicUrlVO url(String id, Integer br, String musicU) {
        if (br == null || br <= 0) {
            br = 320;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("ids", "[" + id + "]");
        body.put("br", br * 1000);

        JSONObject result = sendEapiRequest("/api/song/enhance/player/url", body, musicU);

        MusicUrlVO vo = new MusicUrlVO();
        if (result.containsKey("data")) {
            JSONArray data = result.getJSONArray("data");
            if (data != null && !data.isEmpty()) {
                JSONObject urlInfo = data.getJSONObject(0);
                vo.setUrl(urlInfo.getStr("url"));
                vo.setSize(urlInfo.getLong("size"));
                vo.setBr(urlInfo.getInt("br") != null ? urlInfo.getInt("br") / 1000 : br);
            }
        }

        return vo;
    }

    @Override
    public MusicLyricVO lyric(String id, String musicU) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", id);
        body.put("os", "linux");
        body.put("lv", -1);
        body.put("kv", -1);
        body.put("tv", -1);

        JSONObject result = sendEapiRequest("/api/song/lyric", body, musicU);

        MusicLyricVO vo = new MusicLyricVO();
        if (result.containsKey("lrc")) {
            JSONObject lrc = result.getJSONObject("lrc");
            if (lrc != null) {
                vo.setLyric(lrc.getStr("lyric"));
            }
        }
        if (result.containsKey("tlyric")) {
            JSONObject tlyric = result.getJSONObject("tlyric");
            if (tlyric != null) {
                vo.setTlyric(tlyric.getStr("lyric"));
            }
        }

        return vo;
    }

    @Override
    public List<MusicVO> playlist(String id, String musicU) {
        // 尝试从缓存获取
        String cacheKey = PLAYLIST_CACHE_PREFIX + id;
        String cachedData = redisTemplate.opsForValue().get(cacheKey);

        if (cachedData != null) {
            log.info("从缓存获取播放列表: {}", id);
            return JSONUtil.toList(cachedData, MusicVO.class);
        }

        // 缓存不存在，调用API获取
        Map<String, Object> body = new HashMap<>();
        body.put("s", 0);
        body.put("id", id);
        body.put("n", 1000);
        body.put("t", 0);

        JSONObject result = sendEapiRequest("/api/v6/playlist/detail", body, musicU);

        List<MusicVO> list = new ArrayList<>();
        if (result.containsKey("playlist")) {
            JSONObject playlist = result.getJSONObject("playlist");
            if (playlist != null && playlist.containsKey("tracks")) {
                JSONArray tracks = playlist.getJSONArray("tracks");
                
                // 收集所有歌曲ID
                List<String> ids = new ArrayList<>();
                for (int i = 0; i < tracks.size(); i++) {
                    JSONObject song = tracks.getJSONObject(i);
                    MusicVO vo = convertSongJsonToVO(song);
                    if (vo != null && StrUtil.isNotBlank(vo.getId())) {
                        ids.add(vo.getId());
                        vo.setLrc("/api/music/lyric/" + vo.getId() + "/text");
                        list.add(vo);
                    }
                }
                
                // 批量获取播放链接（每100首一批）
                if (!ids.isEmpty()) {
                    Map<String, String> urlMap = batchGetUrls(ids, musicU);
                    // 将播放链接设置到歌曲对象中
                    for (MusicVO vo : list) {
                        String songUrl = urlMap.get(vo.getId());
                        if (StrUtil.isNotBlank(songUrl)) {
                            vo.setUrl(songUrl);
                        }
                    }
                }
            }
        }

        // 存入缓存（永久保存，只能手动刷新）
        if (!list.isEmpty()) {
            redisTemplate.opsForValue().set(cacheKey, JSONUtil.toJsonStr(list));
            log.info("播放列表已缓存: {}, 永久保存", id);
        }

        return list;
    }
    
    /**
     * 批量获取歌曲播放链接
     */
    private Map<String, String> batchGetUrls(List<String> ids, String musicU) {
        Map<String, String> urlMap = new HashMap<>();
        
        // 每批100首
        int batchSize = 100;
        for (int i = 0; i < ids.size(); i += batchSize) {
            int end = Math.min(i + batchSize, ids.size());
            List<String> batch = ids.subList(i, end);
            
            Map<String, Object> body = new HashMap<>();
            body.put("ids", JSONUtil.toJsonStr(batch));
            body.put("br", 320000);

            JSONObject result = sendEapiRequest("/api/song/enhance/player/url", body, musicU);

            if (result.containsKey("data")) {
                JSONArray data = result.getJSONArray("data");
                if (data != null) {
                    for (int j = 0; j < data.size(); j++) {
                        JSONObject urlInfo = data.getJSONObject(j);
                        String songId = String.valueOf(urlInfo.get("id"));
                        String url = urlInfo.getStr("url");
                        if (StrUtil.isNotBlank(songId) && StrUtil.isNotBlank(url)) {
                            urlMap.put(songId, url);
                        }
                    }
                }
            }
        }
        
        return urlMap;
    }

    /**
     * 将网易云音乐歌曲JSON转换为MusicVO
     */
    private MusicVO convertSongJsonToVO(JSONObject song) {
        if (song == null) {
            return null;
        }

        MusicVO vo = new MusicVO();

        Object idObj = song.get("id");
        vo.setId(idObj != null ? String.valueOf(idObj) : null);

        vo.setName(song.getStr("name"));

        JSONArray artists = song.getJSONArray("ar");
        if (artists == null) {
            artists = song.getJSONArray("artists");
        }
        if (artists != null && !artists.isEmpty()) {
            String artistNames = artists.stream()
                    .map(obj -> {
                        if (obj instanceof JSONObject) {
                            return ((JSONObject) obj).getStr("name");
                        }
                        return "";
                    })
                    .filter(StrUtil::isNotBlank)
                    .collect(Collectors.joining(", "));
            vo.setArtist(artistNames);
        }

        JSONObject album = song.getJSONObject("al");
        if (album == null) {
            album = song.getJSONObject("album");
        }
        if (album != null) {
            vo.setAlbum(album.getStr("name"));

            String picUrl = album.getStr("picUrl");
            if (StrUtil.isBlank(picUrl)) {
                Object picIdObj = album.get("pic_str");
                if (picIdObj == null) {
                    picIdObj = album.get("pic");
                }
                if (picIdObj != null) {
                    picUrl = "https://p3.music.126.net/" + NetEaseCryptoUtil.encryptId(String.valueOf(picIdObj)) + "/" + picIdObj + ".jpg";
                }
            }
            vo.setPic(picUrl);
        }

        return vo;
    }

    /**
     * 清除播放列表缓存
     */
    public void clearPlaylistCache(String id) {
        String cacheKey = PLAYLIST_CACHE_PREFIX + id;
        Boolean deleted = redisTemplate.delete(cacheKey);
        log.info("清除播放列表缓存: {}, 结果: {}", id, deleted);
    }
}
