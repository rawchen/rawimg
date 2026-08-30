import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  message,
  Spin,
  Image,
  Pagination,
  Empty,
  InputNumber,
  Modal,
  Button,
  Input,
} from 'antd';
import {
  SearchOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  AppstoreOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { musicApi, musicCoverApi, ImageTaskRecord } from '@/api';
import PlayerComponent from '@/components/PlayerComponent';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import musicCoverImage from '@/assets/image-music/music_cover.jpg';
import useFancybox from '@/hooks/useFancybox';
import { Fancybox } from '@fancyapps/ui';
import '@fancyapps/ui/dist/fancybox/fancybox.css';
import { addOssThumbnailStyle } from '@/lib/utils';
// Force recompile

const { Search } = Input;

// 页面标题闪烁 hook
function useTitleFlash() {
  const flashRef = useRef<number | null>(null);
  const originalTitle = useRef<string>(document.title);
  const isFlashing = useRef(false);

  const startFlash = useCallback((status: 'done' | 'error' = 'done') => {
    if (document.hasFocus()) return;
    if (isFlashing.current) return;
    isFlashing.current = true;
    originalTitle.current = document.title;

    const successText = '✅';
    const errorText = '❌';
    let showIcon = false;
    const flash = () => {
      if (!isFlashing.current) return;
      document.title = showIcon
        ? status === 'done'
          ? successText
          : errorText
        : '音乐封面';
      showIcon = !showIcon;
      flashRef.current = window.setTimeout(flash, 600);
    };
    flash();
  }, []);

  const stopFlash = useCallback(() => {
    if (!isFlashing.current) return;
    isFlashing.current = false;
    if (flashRef.current) {
      clearTimeout(flashRef.current);
      flashRef.current = null;
    }
    document.title = originalTitle.current;
  }, []);

  useEffect(() => {
    const handleFocus = () => stopFlash();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        stopFlash();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopFlash();
    };
  }, [stopFlash]);

  return { startFlash };
}

// 风格选项
const styleOptions = [
  { value: 'auto', label: '自动' },
  { value: 'anime', label: '动漫' },
  { value: 'watercolor', label: '水彩' },
  { value: 'realistic', label: '真实' },
  { value: 'abstract', label: '抽象' },
  { value: 'minimalist', label: '简约' },
];

interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  url?: string;
  lrc?: string;
}

const ImageMusicPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { startFlash } = useTitleFlash();
  const [fancyboxRef] = useFancybox();

  // 音乐相关状态
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  // 用户配置
  const [musicU, setMusicU] = useState('');
  const [playlistId, setPlaylistId] = useState('');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 图片生成相关状态
  const [selectedStyle, setSelectedStyle] = useState('auto');
  const [selectedModel, setSelectedModel] = useState('gpt-image-2');
  const [includeLyric, setIncludeLyric] = useState(false); // 是否包含歌词，默认为标题模式
  const [generateN, setGenerateN] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // 生成历史
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<ImageTaskRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [selectedHistory, setSelectedHistory] = useState<ImageTaskRecord | null>(null);
  const [historyDetailModalVisible, setHistoryDetailModalVisible] = useState(false);

  // 登录弹窗
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 加载播放列表
  const loadPlaylistWithId = useCallback(async (id: string, u: string) => {
    if (!id) {
      message.warning('请先配置播放列表ID');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await musicApi.playlist(id, u);
      // console.log('播放列表:', response);
      // axios拦截器已经提取了data.data，response直接就是数组或对象
      const songs = Array.isArray(response) ? response : (response?.list || []);
      setPlaylist(songs);
      if (songs.length > 0) {
        message.success(`已加载 ${songs.length} 首歌曲`);
      } else {
        message.warning('播放列表为空');
      }
    } catch (error) {
      console.error('加载播放列表失败:', error);
      message.error('加载播放列表失败');
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // 刷新播放列表
  const handleRefreshPlaylist = useCallback(async () => {
    if (!playlistId) {
      message.warning('请先配置播放列表ID');
      return;
    }

    setRefreshing(true);
    try {
      const response = await musicApi.refreshPlaylist(playlistId, musicU);
      const songs = Array.isArray(response) ? response : (response?.list || []);
      setPlaylist(songs);
      if (songs.length > 0) {
        message.success(`已刷新并加载 ${songs.length} 首歌曲`);
      } else {
        message.warning('播放列表为空');
      }
    } catch (error) {
      console.error('刷新播放列表失败:', error);
      message.error('刷新播放列表失败');
    } finally {
      setRefreshing(false);
    }
  }, [playlistId, musicU]);

  // 从localStorage加载用户配置，并加载播放列表
  useEffect(() => {
    const savedMusicU = localStorage.getItem('music_u');
    const savedPlaylistId = localStorage.getItem('playlist_id');
    
    if (savedMusicU) setMusicU(savedMusicU);
    
    // 如果localStorage有播放列表ID，使用它；否则使用默认值
    const finalPlaylistId = savedPlaylistId || '471071972';
    setPlaylistId(finalPlaylistId);
    
    // 如果没有保存的播放列表ID，设置默认值到localStorage
    if (!savedPlaylistId) {
      localStorage.setItem('playlist_id', finalPlaylistId);
    }
    
    // 自动加载播放列表
    if (finalPlaylistId) {
      loadPlaylistWithId(finalPlaylistId, savedMusicU || '');
    }
  }, [loadPlaylistWithId]);

  // 保存用户配置到localStorage
  const saveUserConfig = () => {
    localStorage.setItem('music_u', musicU);
    localStorage.setItem('playlist_id', playlistId);
    message.success('配置已保存');
    setSettingsModalVisible(false);
    // 如果有播放列表ID，加载播放列表
    if (playlistId) {
      loadPlaylist();
    }
  };

  // 搜索歌曲
  const handleSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await musicApi.search(keyword, 30, musicU);
      console.log('搜索结果:', response);
      // axios拦截器已经提取了data.data，response直接就是数组或对象
      const songs = Array.isArray(response) ? response : (response?.list || []);
      setSearchResults(songs);
      if (songs.length === 0) {
        message.info('未找到相关歌曲');
      } else {
        message.success(`找到 ${songs.length} 首歌曲`);
      }
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败，请稍后重试');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadPlaylist = async () => {
    await loadPlaylistWithId(playlistId, musicU);
  };

  // 播放歌曲
  const handlePlaySong = async (song: Song) => {
    setCurrentSong(song);
  };

  // 生成音乐封面
  const handleGenerate = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!currentSong) {
      message.warning('请先选择要生成封面的歌曲');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await musicCoverApi.createAsync(
        currentSong.id,
        currentSong.name,
        includeLyric,
        selectedStyle,
        selectedModel,
        generateN
      );

      console.log('生成任务:', response);
      if (response) {
        message.success(`已提交生成任务，预计消耗 ¥${response.cost}`);
        // 开始轮询任务状态
        pollTaskStatus(response.taskId);
      }
    } catch (error: any) {
      message.error(error.message || '生成失败，请稍后重试');
      setIsGenerating(false);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = async (taskId: string) => {
    const maxAttempts = 120; // 最多轮询2分钟
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await musicCoverApi.getResult(taskId);
        console.log('任务状态:', response);
        if (response) {
          const { status, imageUrl } = response;

          if (status === 'done' && imageUrl) {
            // 生成成功
            const urls = imageUrl.split(',');
            setGeneratedImages(urls);
            setIsGenerating(false);
            startFlash('done');
            message.success('音乐封面生成成功！');
            // 刷新历史
            loadHistory(1);
            return;
          } else if (status === 'error') {
            // 生成失败
            setIsGenerating(false);
            startFlash('error');
            message.error('生成失败，请稍后重试');
            return;
          } else if (status === 'pending') {
            // 继续轮询
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(poll, 1000);
            } else {
              setIsGenerating(false);
              message.warning('生成超时，请稍后查看历史记录');
            }
          }
        }
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setIsGenerating(false);
          message.error('查询任务状态失败');
        }
      }
    };

    poll();
  };

  // 加载生成历史
  const loadHistory = useCallback(async (page: number = 1) => {
    if (!user) return;

    setHistoryLoading(true);
    try {
      const response = await musicCoverApi.getHistory(page, 12);
      console.log('历史记录:', response);
      if (response && response.records) {
        setHistoryRecords(response.records);
        setHistoryTotal(response.total || 0);
        setHistoryPage(page);
      }
    } catch (error: any) {
      console.error('加载历史失败:', error);
      message.error(error.message || '加载历史记录失败');
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // 打开历史记录模态框时加载历史
  useEffect(() => {
    if (historyModalVisible && user) {
      loadHistory(1);
    }
  }, [historyModalVisible, user, loadHistory]);

  // 格式化耗时显示（秒）
  const formatDurationFromSeconds = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainSeconds = Math.floor(seconds % 60);
      return `${minutes}m${remainSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainMinutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h${remainMinutes}m`;
    }
  };

  // 格式化耗时显示（毫秒）
  const formatDuration = (durationMs: number | null | undefined): string | null => {
    if (!durationMs) return null;
    return formatDurationFromSeconds(durationMs / 1000);
  };

  // 计算pending任务的实时耗时
  const getPendingElapsed = (createTime: string): string => {
    const elapsedMs = Date.now() - new Date(createTime).getTime();
    return formatDurationFromSeconds(elapsedMs / 1000);
  };

  // 格式化日期显示
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const currentYear = now.getFullYear();
    const dateYear = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    if (dateYear === currentYear) {
      return `${month}/${day}`;
    } else {
      return `${dateYear}/${month}/${day}`;
    }
  };

  // 确保URL有https前缀
  const ensureHttpsUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return "https://" + url;
  };

  return (
    <>
      <div className="flex-1 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* 左侧：图片展示区 */}
            <div className="lg:w-[41%] order-2 lg:order-1">
              {/* 标题区域 */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                  AI 音乐封面
                </h1>
                <p className="text-gray-500 text-sm md:text-base">
                  为你的音乐创作独特的封面艺术
                </p>
              </div>
              {/* 图片展示 */}
              {(() => {
                const hasMultipleImages = generatedImages.length > 1;

                return (
                  <div
                    className={`relative w-full rounded-2xl bg-gray-200 shadow-lg ${hasMultipleImages ? "overflow-visible" : "overflow-hidden"}`}
                    style={{ aspectRatio: "1/1" }}
                  >
                    {generatedImages.length > 0 ? (
                      hasMultipleImages ? (
                        // 多图重叠效果 - 扑克牌样式
                        <div className="relative w-full h-full">
                          {generatedImages.slice(0, Math.min(generatedImages.length, 4)).map((url, index) => (
                            <div
                              key={index}
                              className="absolute transition-transform hover:scale-105 cursor-pointer"
                              style={{
                                width: "94%",
                                height: "94%",
                                left: `${index * 2}%`,
                                top: `${index * 2}%`,
                                zIndex: generatedImages.length - index,
                              }}
                              onClick={() => {
                                // 使用 Fancybox 打开灯箱
                                Fancybox.show(
                                  generatedImages.map((imgUrl) => ({
                                    src: imgUrl,
                                    type: "image" as const,
                                  })),
                                  {
                                    startIndex: index,
                                    Carousel: {
                                      Thumbs: {
                                        type: 'classic' as const,
                                        Carousel: {
                                          vertical: true,
                                          center: (ref: any) => {
                                            return ref.getTotalSlideDim() > ref.getViewportDim();
                                          },
                                        },
                                      },
                                    },
                                  }
                                );
                              }}
                            >
                              <img
                                src={addOssThumbnailStyle(ensureHttpsUrl(url)) || ""}
                                alt={`封面 ${index + 1}`}
                                className="w-full h-full object-cover rounded-lg shadow-lg"
                              />
                            </div>
                          ))}

                          {/* 图片数量标签 */}
                          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg z-10 flex items-center gap-1">
                            <AppstoreOutlined />
                            {generatedImages.length} 张图片
                          </div>
                        </div>
                      ) : (
                        // 单图显示
                        <Image
                          src={generatedImages[0]}
                          alt="音乐封面"
                          className="w-full h-full object-contain"
                          rootClassName="w-full h-full"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                          preview={{
                            mask: <div className="text-white">点击预览</div>,
                          }}
                        />
                      )
                    ) : (
                      <>
                        <Image
                          src={musicCoverImage}
                          alt="示例封面"
                          className="w-full h-full object-contain"
                          rootClassName="w-full h-full"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                          preview={false}
                        />
                        {/* 示例标签 */}
                        <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-2 py-1 rounded z-10 pointer-events-none">
                          示例
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* 风格选择 + 提示词模式 + 生成数量 */}
              <div className="flex flex-wrap items-center gap-2 pt-4">
                {styleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStyle(option.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                      selectedStyle === option.value
                        ? "bg-orange-100 border-orange-500 text-orange-600"
                        : "bg-white border-gray-200 text-gray-700 hover:border-orange-300"
                    }`}
                  >
                    <span className="text-sm">{option.label}</span>
                  </button>
                ))}
                {/* 提示词模式滑动开关 */}
                <div className="flex items-center gap-2 ml-2">
                  <div className="relative flex items-center rounded-lg p-1 bg-white">
                    {/* 滑动指示器 */}
                    <div
                      className="absolute top-1 bottom-1 rounded transition-all duration-200 bg-orange-500"
                      style={{
                        width: "calc(50% - 4px)",
                        left: includeLyric ? "calc(50% + 0px)" : "4px",
                      }}
                    />
                    {["标题", "歌词"].map((label, index) => (
                      <button
                        key={label}
                        onClick={() => setIncludeLyric(index === 1)}
                        className={`relative z-10 px-3 py-1 text-sm font-medium transition-colors ${
                          (index === 1 ? includeLyric : !includeLyric)
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：音乐播放器和控制区 */}
            <div className="lg:w-[56%] order-1 lg:order-2 flex flex-col gap-4">
              {/* 音乐封面生成卡片 */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">音乐封面生成</h3>
                  <div className="flex items-center gap-3">
                    {/* 生成数量 */}
                    <div className="flex items-center gap-1 ml-1">
                      <span className="text-sm text-gray-600">数量</span>
                      <InputNumber
                        min={1}
                        max={10}
                        value={generateN}
                        onChange={value => setGenerateN(value || 1)}
                        size="small"
                        className="w-14"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!isAuthenticated) {
                          setShowAuthModal(true);
                          return;
                        }
                        setHistoryModalVisible(true);
                      }}
                      className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <HistoryOutlined/>
                      生成历史
                    </button>
                    <button
                      onClick={() => setSettingsModalVisible(true)}
                      className="text-sm text-gray-500 hover:text-orange-600 flex items-center gap-1"
                    >
                      <SettingOutlined/>
                      音乐配置
                    </button>
                    {/* 模型切换开关 */}
                    <div className="flex items-center gap-2">
                      <div
                        onClick={() =>
                          !isGenerating &&
                          setSelectedModel(
                            selectedModel === "gpt-image-2"
                              ? "gemini-2.5-flash-image"
                              : "gpt-image-2",
                          )
                        }
                        className={`relative flex items-center w-[68px] h-7 rounded-full transition-colors ${
                          isGenerating
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        } ${selectedModel === "gpt-image-2" ? "bg-orange-500" : "bg-purple-500"}`}
                      >
                        <span
                          className={`absolute text-xs font-medium transition-all select-none ${
                            selectedModel === "gpt-image-2"
                              ? "left-2 text-white"
                              : "left-8 text-white"
                          }`}
                        >
                          {selectedModel === "gpt-image-2" ? "GPT" : "Nano"}
                        </span>
                        <div
                          className={`absolute w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ease-in-out ${
                            selectedModel === "gpt-image-2"
                              ? "translate-x-[2.75rem]"
                              : "translate-x-1"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  搜索歌曲，播放后生成专属封面
                </p>
                {/* 搜索框 */}
                <Search
                  placeholder="搜索歌曲、歌手"
                  allowClear
                  enterButton={searchLoading ? <LoadingOutlined/> : <SearchOutlined/>}
                  size="large"
                  onSearch={handleSearch}
                  value={searchKeyword}
                  onChange={e => {
                    const value = e.target.value;
                    setSearchKeyword(value);
                    // 清空搜索框时清空搜索结果
                    if (!value.trim()) {
                      setSearchResults([]);
                    }
                  }}
                />
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="bg-white rounded-xl py-4 pl-4 pr-2 shadow-sm max-h-[350px] overflow-y-auto">
                  <div className="space-y-2">
                    {searchResults.map((song: Song) => (
                      <div
                        key={song.id}
                        onClick={() => handlePlaySong(song)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                          currentSong?.id === song.id
                            ? "bg-orange-50 border-2 border-orange-500"
                            : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={song.pic}
                            alt={song.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded opacity-0 hover:opacity-100 transition-opacity">
                            <PlayCircleOutlined className="text-white text-xl" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{song.name}</div>
                          <div className="text-sm text-gray-500 truncate">{song.artist}</div>
                        </div>
                        <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          歌曲
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 音乐播放器 */}
              {(currentSong || (searchResults.length === 0 && playlist.length > 0)) && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <PlayerComponent
                    songs={
                      searchResults.length > 0 && currentSong
                        ? [currentSong]
                        : (playlist.length > 0 ? playlist : (currentSong ? [currentSong] : []))
                    }
                    currentSongId={currentSong?.id}
                    musicU={musicU}
                    onSongSelect={handlePlaySong}
                  />
                </div>
              )}

              {/* 生成控制 */}
              <Button
                type="primary"
                size="large"
                block
                loading={isGenerating}
                onClick={handleGenerate}
                disabled={!currentSong}
                className="h-12 text-base font-medium"
              >
                {isGenerating ? '生成中...' : '生成封面'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 生成历史模态框 */}
      <Modal
        title="生成历史"
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={900}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin indicator={<LoadingOutlined />} />
          </div>
        ) : historyRecords.length > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              {historyRecords.map((item: ImageTaskRecord) => {
                // 解析结果图片URL列表
                const imageUrls = item.resultImageUrl ? item.resultImageUrl.split(',').filter(Boolean) : [];
                const firstImageUrl = imageUrls[0] || null;

                return (
                  <div
                    key={item.id}
                    style={{
                      cursor: 'pointer',
                      border: '1px solid #f0f0f0',
                      borderRadius: 8,
                      overflow: 'hidden',
                      transition: 'all 0.3s',
                    }}
                    onClick={() => {
                      if (imageUrls.length > 0) {
                        // 使用 Fancybox 打开灯箱
                        Fancybox.show(
                          imageUrls.map((url: string) => ({
                            src: url,
                            type: "image" as const,
                          })),
                          {
                            startIndex: 0,
                            Carousel: {
                              Thumbs: {
                                type: 'classic' as const,
                                Carousel: {
                                  vertical: true,
                                  center: (ref: any) => {
                                    return ref.getTotalSlideDim() > ref.getViewportDim();
                                  },
                                },
                              },
                            },
                          }
                        );
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '100%', background: '#f5f5f5' }}>
                      {firstImageUrl ? (
                        <img
                          src={addOssThumbnailStyle(
                            ensureHttpsUrl(firstImageUrl),
                          ) || ""}
                          alt={item.songName || '封面'}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999',
                        }}>
                          无图片
                        </div>
                      )}
                      {/* 多图数量标签 */}
                      {imageUrls.length > 1 && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(0, 0, 0, 0.6)',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                        }}>
                          {imageUrls.length} 张
                        </div>
                      )}
                      {/* 状态标签 */}
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                      }}>
                        {item.status === 'done' && (
                          <span style={{
                            background: '#52c41a',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}>
                            完成
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span style={{
                            background: '#ff4d4f',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}>
                            失败
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span style={{
                            background: '#faad14',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                          }}>
                            进行中
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      {/* 名称: 歌曲名 + · + 歌手名 */}
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.songName && item.artistName 
                          ? `${item.songName} · ${item.artistName}` 
                          : (item.songName || '音乐封面')}
                      </div>
                      {/* 日期 */}
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                        {formatDate(item.createTime)}
                      </div>
                      {/* 耗时 */}
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                        {item.status === 'pending' 
                          ? getPendingElapsed(item.createTime)
                          : formatDuration(item.duration)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {historyTotal > 12 && (
              <Pagination
                current={historyPage}
                total={historyTotal}
                pageSize={12}
                onChange={(page) => loadHistory(page)}
                style={{ textAlign: 'center' }}
              />
            )}
          </>
        ) : (
          <Empty description="暂无生成历史" />
        )}
      </Modal>

      {/* 历史详情模态框 */}
      <Modal
        title={selectedHistory?.songName && selectedHistory?.artistName 
          ? `${selectedHistory.songName} · ${selectedHistory.artistName}` 
          : (selectedHistory?.songName || '音乐封面')}
        open={historyDetailModalVisible}
        onCancel={() => setHistoryDetailModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedHistory && (
          <div>
            {/* 多图展示 */}
            {selectedHistory.resultImageUrl && (
              <div style={{ marginBottom: 16 }}>
                {(() => {
                  const imageUrls = selectedHistory.resultImageUrl!.split(',').filter(Boolean);
                  if (imageUrls.length === 0) return null;
                  
                  if (imageUrls.length === 1) {
                    return (
                      <img
                        src={imageUrls[0]}
                        alt={selectedHistory.songName || '封面'}
                        style={{ width: '100%', borderRadius: 8, cursor: 'pointer' }}
                        onClick={() => {
                          Fancybox.show(
                            imageUrls.map((url: string) => ({
                              src: url,
                              type: "image" as const,
                            })),
                            {
                              startIndex: 0,
                              Carousel: {
                                Toolbar: {
                                  display: {
                                    left: ["infobar"],
                                    middle: [],
                                    right: ["slideshow", "fullscreen", "thumbs", "close"],
                                  },
                                },
                              },
                            }
                          );
                        }}
                      />
                    );
                  } else {
                    // 多图堆叠展示
                    return (
                      <div className="relative w-full h-80 mb-4">
                        {imageUrls.slice(0, Math.min(imageUrls.length, 4)).map((url: string, index: number) => (
                          <div
                            key={index}
                            className="absolute transition-transform hover:scale-105 cursor-pointer"
                            style={{
                              width: "94%",
                              height: "94%",
                              left: `${index * 2}%`,
                              top: `${index * 2}%`,
                              zIndex: imageUrls.length - index,
                            }}
                            onClick={() => {
                              Fancybox.show(
                                imageUrls.map((imgUrl: string) => ({
                                  src: imgUrl,
                                  type: "image" as const,
                                })),
                                {
                                  startIndex: index,
                                  Carousel: {
                                    Toolbar: {
                                      display: {
                                        left: ["infobar"],
                                        middle: [],
                                        right: ["slideshow", "fullscreen", "thumbs", "close"],
                                      },
                                    },
                                  },
                                }
                              );
                            }}
                          >
                            <img
                              src={addOssThumbnailStyle(ensureHttpsUrl(url)) || ""}
                              alt={`封面 ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg shadow-lg"
                            />
                          </div>
                        ))}
                        {/* 图片数量标签 */}
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg z-10 flex items-center gap-1">
                          <AppstoreOutlined />
                          {imageUrls.length} 张图片
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
            
            {/* 详细信息 */}
            <div style={{ marginBottom: 12 }}>
              <strong>歌曲：</strong>{selectedHistory.songName || '未知'}
            </div>
            {selectedHistory.artistName && (
              <div style={{ marginBottom: 12 }}>
                <strong>歌手：</strong>{selectedHistory.artistName}
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <strong>状态：</strong>
              {selectedHistory.status === 'done' && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />}
              {selectedHistory.status === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f', marginLeft: 8 }} />}
              {selectedHistory.status === 'pending' && <ClockCircleOutlined style={{ color: '#faad14', marginLeft: 8 }} />}
              <span style={{ marginLeft: 8 }}>
                {selectedHistory.status === 'done' ? '完成' : selectedHistory.status === 'error' ? '失败' : '进行中'}
              </span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>创建时间：</strong>{formatDate(selectedHistory.createTime)}
            </div>
            {selectedHistory.duration && (
              <div style={{ marginBottom: 12 }}>
                <strong>耗时：</strong>{formatDuration(selectedHistory.duration)}
              </div>
            )}
            
            {/* 下载按钮 */}
            {selectedHistory.resultImageUrl && (
              <div style={{ marginTop: 16 }}>
                {selectedHistory.resultImageUrl.split(',').filter(Boolean).map((url: string, index: number) => (
                  <Button
                    key={index}
                    type={index === 0 ? 'primary' : 'default'}
                    href={url}
                    target="_blank"
                    download
                    style={{ marginRight: 8, marginBottom: 8 }}
                  >
                    下载图片 {index + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 配置模态框 */}
      <Modal
        title="网易云音乐配置"
        open={settingsModalVisible}
        onCancel={() => setSettingsModalVisible(false)}
        onOk={saveUserConfig}
        okText="保存"
        cancelText="取消"
        width={500}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">MUSIC_U</label>
            <Input
              placeholder="网易云音乐用户token"
              value={musicU}
              onChange={e => setMusicU(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">用于解锁VIP歌曲以及30秒限制</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">播放列表ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="播放列表ID"
                value={playlistId}
                onChange={e => setPlaylistId(e.target.value)}
                className="flex-1"
              />
              <Button
                type="primary"
                loading={refreshing}
                onClick={handleRefreshPlaylist}
                icon={<SyncOutlined />}
              >
                刷新缓存
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">播放列表ID，默认为作者喜欢 471071972</p>
          </div>
        </div>
      </Modal>

      {/* 登录弹窗 */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
};

export { ImageMusicPage };
