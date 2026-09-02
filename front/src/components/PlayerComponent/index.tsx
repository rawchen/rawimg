import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { musicApi } from '@/api';
import './index.css';

interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  url?: string;
  lrc?: string;
}

interface PlayerComponentProps {
  songs: Song[];
  currentSongId?: string;
  musicU?: string;
  onSongChange?: (song: Song) => void;
  onSongSelect?: (song: Song) => void;
}

const PlayerComponent: React.FC<PlayerComponentProps> = ({ songs, currentSongId, musicU, onSongChange, onSongSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('player-volume');
    return savedVolume ? parseFloat(savedVolume) : 0.6;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [showLyric, setShowLyric] = useState(false);
  const [lyricsCache, setLyricsCache] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isVolumeDragging, setIsVolumeDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const volumeSliderRef = useRef<HTMLDivElement | null>(null);
  const isPlayingRef = useRef(false); // 保存最新的播放状态
  const currentIndexRef = useRef(0); // 保存最新的歌曲索引
  const songsRef = useRef<Song[]>([]); // 保存最新的歌曲列表
  const musicURef = useRef<string | undefined>(undefined); // 保存最新的musicU

  // 同步播放状态到ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 同步其他状态到ref
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    musicURef.current = musicU;
  }, [musicU]);

  // 根据currentSongId找到对应索引并自动播放
  useEffect(() => {
    if (currentSongId && songs.length > 0) {
      const index = songs.findIndex(s => s.id === currentSongId);
      if (index !== -1 && index !== currentIndex) {
        setCurrentIndex(index);
        // 自动开始播放
        setIsPlaying(true);
      }
    }
  }, [currentSongId, songs]);

  // 创建音频元素（只在组件挂载时创建一次）
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // 立即应用缓存的音量
    const savedVolume = localStorage.getItem('player-volume');
    const initialVolume = savedVolume ? parseFloat(savedVolume) : 0.6;
    audio.volume = initialVolume;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      setCurrentIndex(prev => {
        if (prev < songsRef.current.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return 0;
        }
      });
    };

    // 处理播放错误（URL过期等）
    const handleError = async () => {
      console.error('音频播放错误，尝试重新获取URL');
      const currentSong = songsRef.current[currentIndexRef.current];
      if (currentSong && currentSong.id) {
        try {
          const response = await musicApi.url(currentSong.id, undefined, musicURef.current);
          if (response && response.url && audioRef.current) {
            audioRef.current.src = response.url;
            // 如果之前是播放状态，重新播放
            if (isPlayingRef.current) {
              audioRef.current.play().catch(() => {
                setIsPlaying(false);
              });
            }
          }
        } catch (err) {
          console.error('重新获取URL失败:', err);
          setIsPlaying(false);
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []); // 空依赖项，只在组件挂载时执行一次

  // 切换歌曲时更新音频源（每次都调用API获取新的播放链接，避免URL过期）
  useEffect(() => {
    if (!audioRef.current || songs.length === 0) return;

    const currentSong = songs[currentIndex];
    if (currentSong) {
      // 每次切换歌曲都调用API获取新的播放链接
      musicApi.url(currentSong.id, undefined, musicU).then((response: any) => {
        if (response && response.url && audioRef.current) {
          audioRef.current.src = response.url;
          if (onSongChange) {
            onSongChange(currentSong);
          }
          // 如果当前是播放状态，设置新音频源后立即播放
          if (isPlayingRef.current) {
            audioRef.current.play().catch(() => {
              setIsPlaying(false);
            });
          }
        }
      }).catch((err: any) => {
        console.error('获取播放链接失败:', err);
        setIsPlaying(false);
      });
    }
    // 注意：不要将 isPlaying 加入依赖项，否则暂停/播放会重新加载音频
  }, [currentIndex, songs, onSongChange, musicU]);

  // 播放状态变化时控制播放/暂停
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // 音量变化时只更新音量，不重新加载音频
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
    // 拖动过程中不频繁写 localStorage，拖动结束后再保存
    if (!isMuted && !isVolumeDragging) {
      localStorage.setItem('player-volume', volume.toString());
    }
  }, [volume, isMuted, isVolumeDragging]);

  // 获取歌词
  useEffect(() => {
    if (!songs.length || currentIndex >= songs.length) return;

    const currentSong = songs[currentIndex];
    const lrcUrl = currentSong?.lrc;

    if (!lrcUrl) return;
    if (lyricsCache[lrcUrl]) return;

    const fetchLyric = async () => {
      try {
        const response = await fetch(lrcUrl);
        const lyricText = await response.text();
        setLyricsCache(prev => ({ ...prev, [lrcUrl]: lyricText }));
      } catch (err) {
        console.error('获取歌词失败:', err);
        setLyricsCache(prev => ({ ...prev, [lrcUrl]: '' }));
      }
    };

    fetchLyric();
  }, [songs, currentIndex, lyricsCache]);

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  }, [isPlaying]);

  // 进度条点击
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  // 进度条拖动
  const getTimeFromX = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * duration;
  }, [duration]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0]?.clientX);
    if (clientX) {
      const newTime = getTimeFromX(clientX);
      setDragTime(newTime);
    }
  }, [getTimeFromX]);

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'clientX' in e ? e.clientX : (e.touches && e.touches[0]?.clientX);
      if (clientX) {
        const newTime = getTimeFromX(clientX);
        setDragTime(newTime);
      }
    };

    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
      const clientX = 'clientX' in e ? e.clientX : (e.changedTouches && e.changedTouches[0]?.clientX);
      if (audioRef.current && clientX) {
        const newTime = getTimeFromX(clientX);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, getTimeFromX]);

  // 音量调整：根据横坐标计算音量（0~1）
  const getVolumeFromX = useCallback((clientX: number) => {
    if (!volumeSliderRef.current) return null;
    const rect = volumeSliderRef.current.getBoundingClientRect();
    if (rect.width <= 0) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const applyVolume = useCallback((value: number) => {
    setVolume(value);
    setIsMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }, []);

  // 按下音量条即开始连续拖动
  const handleVolumeDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX;
    if (clientX === undefined) return;
    const value = getVolumeFromX(clientX);
    if (value === null) return;
    applyVolume(value);
    setIsVolumeDragging(true);
  }, [getVolumeFromX, applyVolume]);

  // 拖动过程中持续跟随鼠标/手指更新音量
  useEffect(() => {
    if (!isVolumeDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX;
      if (clientX === undefined) return;
      const value = getVolumeFromX(clientX);
      if (value !== null) {
        applyVolume(value);
      }
    };

    const handleEnd = () => setIsVolumeDragging(false);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
    };
  }, [isVolumeDragging, getVolumeFromX, applyVolume]);

  // 切换歌曲
  const playSong = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    if (onSongSelect && songs[index]) {
      onSongSelect(songs[index]);
    }
  }, [songs, onSongSelect]);

  // 格式化时间
  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 解析歌词
  const parseLyric = (lrc: string) => {
    if (!lrc) return [];
    const lines = lrc.split('\n');
    const result: Array<{ time: number; text: string }> = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    for (const line of lines) {
      const matches = [...line.matchAll(timeRegex)];
      if (matches.length > 0) {
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          for (const match of matches) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const ms = parseInt(match[3]);
            const time = minutes * 60 + seconds + ms / (match[3].length === 2 ? 100 : 1000);
            result.push({ time, text });
          }
        }
      }
    }
    return result.sort((a, b) => a.time - b.time);
  };

  const currentSong = songs[currentIndex];
  const lrcUrl = currentSong?.lrc;
  const lyricText = lrcUrl ? (lyricsCache[lrcUrl] || '') : '';
  const lyrics = parseLyric(lyricText);
  const displayTime = isDragging ? dragTime : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const getCurrentLyricIndex = () => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        return i;
      }
    }
    return -1;
  };

  const currentLyricIndex = getCurrentLyricIndex();

  if (songs.length === 0) return null;

  return (
    <div className="music-player">
      {/* 歌词区域 */}
      {showLyric && lyrics.length > 0 && (
        <div className="lyric-panel">
          <div className="lyric-body" style={{ transform: `translateY(${6 - currentLyricIndex * 3}em)` }}>
            {lyrics.map((line, index) => (
              <span key={index} className={`lyric-line ${index === currentLyricIndex ? 'active' : ''}`}>
                {line.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 控制区域 */}
      <div className="player-controls">
        <div className="player-left">
          <div className="song-info">
            <div className="song-cover">
              {currentSong?.pic && <img src={currentSong.pic} alt={currentSong.name} />}
            </div>
            <div className="song-meta">
              <div className="song-name">{currentSong?.name || '未知歌曲'}</div>
              <div className="song-artist">{currentSong?.artist || '未知歌手'}</div>
            </div>
          </div>
          <div className="play-button" onClick={togglePlay}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </div>
        </div>

        <div className="player-center">
          <div className="progress-bar">
            <div className="progress-track" ref={progressBarRef} onClick={handleProgressClick}>
              <div className={`progress-fill ${isDragging ? 'dragging' : ''}`} style={{ width: `${progress}%` }}>
                <div className="progress-handle" onMouseDown={handleDragStart} onTouchStart={handleDragStart}></div>
              </div>
            </div>
            <span className="time-display">
              {formatTime(displayTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="player-right">
          <div 
            className="volume-control"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => { if (!isVolumeDragging) setShowVolumeSlider(false); }}
          >
            <div className="volume-button" onClick={() => setIsMuted(!isMuted)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                {isMuted ? (
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.61-7.92-6.32-9.48v2.16C17.44 6.08 19 8.85 19 12zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                ) : (
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                )}
              </svg>
            </div>
            {(showVolumeSlider || isVolumeDragging) && (
              <div
                ref={volumeSliderRef}
                className={`volume-slider ${isVolumeDragging ? 'dragging' : ''}`}
                onMouseDown={handleVolumeDragStart}
                onTouchStart={handleVolumeDragStart}
                title={`音量 ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              >
                <div className="volume-fill" style={{ width: `${isMuted ? 0 : volume * 100}%` }}>
                  <div className="volume-handle"></div>
                </div>
              </div>
            )}
          </div>

          {lyrics.length > 0 && (
            <div className={`lyric-toggle ${showLyric ? 'active' : ''}`} onClick={() => setShowLyric(!showLyric)}>
              <svg viewBox="0 0 1024 1024" width="20" height="20" fill="currentColor">
                <path
                  d="M793.941 160H230.06C191.36 160 160 191.616 160 230.059v563.84C160 832.64 191.616 864 230.059 864h563.84c38.698 0 70.058-31.616 70.058-70.059V230.06C864 191.36 832.384 160 793.941 160z m5.718 640c0-0.299-575.659-0.341-575.659-0.341 0.299 0 0.341-575.659 0.341-575.659 0 0.299 575.659 0.341 575.659 0.341-0.299 0-0.341 575.659-0.341 575.659z m-96-118.528l0.341 0.17V349.654c-1.152-18.602-13.952-28.501-38.357-29.653H459.776c-12.8 1.152-19.755 9.301-20.95 24.405 1.153 15.104 8.15 23.254 20.95 24.406h190.123c3.498 0 5.248 1.749 5.248 5.248V656.64l0.469 0.256h-65.792c-6.699 0-17.579 8.704-18.432 22.656 0.853 15.104 10.112 23.253 18.432 24.405h98.944c8.79-1.066 13.739-8.576 14.89-22.485zM477.227 438.613c-11.648-1.152-18.006-9.301-19.2-24.405 1.152-13.952 7.552-21.504 19.2-22.656h143.018c13.952 1.152 21.504 8.704 22.656 22.656-1.152 15.104-8.149 23.253-20.949 24.405H477.227zM334.72 367.104c-6.827-1.152-22.016-9.301-22.699-24.448 0.683-13.952 13.398-21.504 20.267-22.656h56.235c8.234 1.152 20.01 8.704 20.693 22.656-0.64 15.147-13.141 23.296-20.693 24.448H334.72z m67.499 288.512v-204.8c1.152-25.6-8.704-37.803-29.654-36.65H330.71c-12.8 1.194-19.754 9.343-20.949 24.447 1.152 16.299 8.15 25.003 20.95 26.155h17.45c3.499 0 5.248 1.75 5.248 5.248v206.677a9.985 9.985 0 0 0-0.128 1.622c0.128 3.029 0.853 5.76 1.963 8.234 2.901 9.515 7.893 14.464 19.114 17.238 1.878 0.298 3.712-0.086 5.547-1.067h49.152c7.253-1.152 20.779-9.301 21.461-24.405-0.64-13.952-13.525-21.504-21.461-22.656h-26.837z m97.706-21.632c-24.405 0-36.65-11.648-36.65-34.901V497.92c0-23.253 10.453-34.901 31.402-34.901H597.59c24.406 0 36.054 9.898 34.902 29.653v106.41c0 23.254-10.454 34.902-31.403 34.902H499.925z m12.203-50.603c1.152 2.347 2.901 4.054 5.248 5.248h61.056c3.499 0 5.248-1.749 5.248-5.248v-68.01c0-3.499-1.75-5.248-5.248-5.248h-61.099c-3.498 0-5.248 1.749-5.248 5.248v68.01z"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 播放列表 */}
      {songs.length > 1 && (
        <div className="playlist">
          <div className="playlist-body">
            {songs.map((song, index) => (
              <div
                key={song.id || index}
                className={`playlist-item ${index === currentIndex ? 'active' : ''}`}
                onClick={() => playSong(index)}
              >
                <span className="item-name">{song.name}</span>
                <span className="item-artist">{song.artist}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerComponent;
