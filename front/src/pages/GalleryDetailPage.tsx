import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { message } from 'antd';
import { PaperClipOutlined, ArrowLeftOutlined, HeartOutlined, HeartFilled, StarOutlined, StarFilled, DownloadOutlined, LockOutlined, EyeOutlined, MessageOutlined, LeftOutlined, RightOutlined, CloseOutlined, CopyOutlined, SafetyOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { galleryApi, commentApi, authApi } from '@/api';
import { AuthModal } from '@/components/auth/AuthModal';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import type { GalleryDetail, Comment, Gallery } from '@/types';

// 根据用户名生成随机浅色背景
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-red-200', 'bg-orange-200', 'bg-amber-200', 'bg-yellow-200',
    'bg-lime-200', 'bg-green-200', 'bg-emerald-200', 'bg-teal-200',
    'bg-cyan-200', 'bg-sky-200', 'bg-blue-200', 'bg-indigo-200',
    'bg-violet-200', 'bg-purple-200', 'bg-fuchsia-200', 'bg-pink-200', 'bg-rose-200'
  ];
  // 使用用户名生成一个稳定的索引
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();

  const [gallery, setGallery] = useState<GalleryDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaSessionId, setCaptchaSessionId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [enterDirection, setEnterDirection] = useState<'left' | 'right' | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [recommendedGalleries, setRecommendedGalleries] = useState<Gallery[]>([]);

  // 获取缓存的下载链接
  const getCachedDownloadLink = useCallback((galleryId: number): string | null => {
    const cacheKey = `download_link_${galleryId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { link, expireAt } = JSON.parse(cached);
        if (Date.now() < expireAt) {
          return link;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }
    return null;
  }, []);

  // 缓存下载链接（一天有效期）
  const cacheDownloadLink = useCallback((galleryId: number, link: string) => {
    const cacheKey = `download_link_${galleryId}`;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    localStorage.setItem(cacheKey, JSON.stringify({
      link,
      expireAt: Date.now() + ONE_DAY_MS
    }));
  }, []);

  // 初始化时检查缓存
  useEffect(() => {
    if (id) {
      const cached = getCachedDownloadLink(Number(id));
      if (cached) {
        setDownloadLink(cached);
      }
    }
  }, [id, getCachedDownloadLink]);

  useEffect(() => {
    if (id) {
      fetchGallery();
      fetchComments();
      fetchRecommendedGalleries();
    }
  }, [id]);

  // 登录后刷新数据并获取验证码
  useEffect(() => {
    if (isAuthenticated && id) {
      fetchGallery();
      fetchCommentCaptcha();
    }
  }, [isAuthenticated]);

  // 切换图片（带动画）
  const goToImage = useCallback((newIndex: number, direction: 'left' | 'right') => {
    if (!gallery) return;
    // direction: 'left' 表示下一张，新图片从右侧进入
    // direction: 'right' 表示上一张，新图片从左侧进入
    setEnterDirection(direction);
    setCurrentImageIndex(newIndex);
    // 动画结束后清除方向
    setTimeout(() => setEnterDirection(null), 200);
  }, [gallery]);

  // 鼠标拖动处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
      setIsDragging(true);
      setDragStartX(e.clientX);
      setDragOffset(0);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const newOffset = e.clientX - dragStartX;
    setDragOffset(newOffset);
  }, [isDragging, dragStartX]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !gallery) return;
    
    const threshold = 100; // 拖动阈值
    if (dragOffset < -threshold) {
      // 向左拖动，下一张
      goToImage((currentImageIndex + 1) % gallery.images.length, 'left');
    } else if (dragOffset > threshold) {
      // 向右拖动，上一张
      goToImage((currentImageIndex - 1 + gallery.images.length) % gallery.images.length, 'right');
    }
    
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, gallery, currentImageIndex, goToImage]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
    }
  }, [isDragging]);

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
      setDragOffset(0);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault(); // 防止页面滚动
    const newOffset = e.touches[0].clientX - dragStartX;
    setDragOffset(newOffset);
  }, [isDragging, dragStartX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !gallery) return;
    
    const threshold = 50; // 触摸滑动阈值（比鼠标拖动小一些）
    if (dragOffset < -threshold) {
      // 向左滑动，下一张
      goToImage((currentImageIndex + 1) % gallery.images.length, 'left');
    } else if (dragOffset > threshold) {
      // 向右滑动，上一张
      goToImage((currentImageIndex - 1 + gallery.images.length) % gallery.images.length, 'right');
    }
    
    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, gallery, currentImageIndex, goToImage]);

  // 键盘事件处理
  useEffect(() => {
    if (!lightboxOpen || !gallery) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        goToImage((currentImageIndex - 1 + gallery.images.length) % gallery.images.length, 'right');
      } else if (e.key === 'ArrowRight') {
        goToImage((currentImageIndex + 1) % gallery.images.length, 'left');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, gallery, currentImageIndex, goToImage]);

  const fetchGallery = async () => {
    try {
      const result = await galleryApi.getGalleryDetail(Number(id));
      setGallery(result);
    } catch (error) {
      // console.error('Failed to fetch gallery:', error);
      navigate('/not-found');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const result = await commentApi.getComments(Number(id), 0, 50);
      setComments(result.content);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const fetchRecommendedGalleries = async () => {
    try {
      const result = await galleryApi.getRecommendedGalleries(Number(id));
      setRecommendedGalleries(result);
    } catch (error) {
      console.error('Failed to fetch recommended galleries:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) return;
    try {
      const result = await galleryApi.toggleLike(Number(id));
      setGallery((prev) => prev ? { ...prev, liked: result.liked, likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1 } : null);
    } catch (error: any) {
      console.error('Failed to toggle like:', error);
      message.error(error.msg || '操作失败');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) return;
    try {
      const result = await galleryApi.toggleFavorite(Number(id));
      setGallery((prev) => prev ? { ...prev, favorited: result.favorited, favoriteCount: prev.favorited ? prev.favoriteCount - 1 : prev.favoriteCount + 1 } : null);
    } catch (error: any) {
      console.error('Failed to toggle favorite:', error);
      message.error(error.msg || '操作失败');
    }
  };

  const handleDownload = async () => {
    if (!isAuthenticated) return;
    if (!user?.vip) {
      message.warning('VIP会员可下载完整图集');
      return;
    }
    
    // 先检查缓存
    const cachedLink = getCachedDownloadLink(Number(id));
    if (cachedLink) {
      setDownloadLink(cachedLink);
      return;
    }
    
    // 无缓存，调用接口获取
    try {
      const result = await galleryApi.download(Number(id));
      if (result.downloadLink) {
        setDownloadLink(result.downloadLink);
        cacheDownloadLink(Number(id), result.downloadLink);
        // 刷新用户信息以更新下载次数
        await refreshUser();
        window.open(result.downloadLink, '_blank');
      }
    } catch (error: any) {
      console.error('Failed to download:', error);
      message.error(error.msg || '下载失败');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    if (!captchaAnswer.trim()) {
      message.warning('请完成验证码验证');
      return;
    }

    setSubmitting(true);
    try {
      await commentApi.createComment(Number(id), commentContent, captchaAnswer, captchaSessionId);
      setCommentContent('');
      setCaptchaAnswer('');
      // 获取新验证码
      fetchCommentCaptcha();
      fetchComments();
    } catch (error: any) {
      console.error('Failed to submit comment:', error);
      message.error(error.msg || '评论失败');
      fetchCommentCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCommentCaptcha = async () => {
    try {
      const result = await authApi.getCaptcha();
      setCaptchaSessionId(result.sessionId);
      setCaptchaQuestion(result.question);
    } catch (error) {
      console.error('Failed to fetch captcha:', error);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('链接已复制到剪贴板');
    } catch (error) {
      message.error('复制失败，请手动复制');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!gallery) return null;

  return (
    <div className=" bg-gray-50 min-h-[60vh]">
      {/* Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Back Button and Title */}
            <div className="flex items-center space-x-4 mb-2 md:mb-4">
              <h1 className="text-2xl font-bold text-black">{gallery.title}</h1>
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3 md:mb-6">
              <span className="flex items-center">
                <EyeOutlined className="text-base mr-1" />
                {gallery.viewCount} 浏览
              </span>
              <span className="flex items-center">
                <HeartOutlined className="text-base mr-1" />
                {gallery.likeCount} 点赞
              </span>
              <span className="flex items-center">
                <MessageOutlined className="text-base mr-1" />
                {gallery.commentCount} 评论
              </span>
            </div>

            {/* Content and Images */}
            <div className="space-y-4 bg-white rounded-xl p-1 md:p-6">
              {/* Main Content */}
              {gallery.content && (
                <div className="border-4 border-dotted border-blue-300 rounded-xl p-3 md:p-6 m-1">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {gallery.content}
                  </div>
                </div>
              )}

              {/* Images */}
              <div className="space-y-4">
                {gallery.images.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative group cursor-pointer"
                    onClick={() => {
                      setCurrentImageIndex(index);
                      setLightboxOpen(true);
                    }}
                  >
                    <img
                      src={image.url}
                      alt={image.description || `图片 ${index + 1}`}
                      className="w-full rounded-lg"
                    />
                    {/* Lock overlay for non-VIP */}
                    {gallery.locked && index >= gallery.previewLimit && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                        <div className="text-center text-white">
                          <LockOutlined className="text-2xl mx-auto mb-2" />
                          <p className="text-sm">VIP会员专享</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* VIP Lock Message */}
                {gallery.locked && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <LockOutlined className="text-3xl mx-auto text-yellow-500 mb-3" />
                    {gallery.totalImageCount <= gallery.previewLimit ? (
                      <>
                        <h3 className="text-lg font-medium text-black mb-2">
                          下载高清图集
                        </h3>
                        <p className="text-gray-600 mb-4">
                          开通VIP会员，畅享原素材压缩包下载
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium text-black mb-2">
                          解锁完整图集
                        </h3>
                        <p className="text-gray-600 mb-4">
                          开通VIP会员，畅享全部<span className="text-black font-bold px-1">{gallery.totalImageCount}</span>张高清图片
                        </p>
                      </>
                    )}
                    <Link
                      to="/recharge"
                      target="_blank"
                      className="px-6 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                    >
                      立即开通VIP
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Like & Favorite Actions */}
            <div className="bg-gradient-to-r from-white via-gray-50 to-white rounded-3xl border border-gray-100 px-6 py-3 mb-6 shadow-sm inline-flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={!isAuthenticated}
                className={`group flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 ${
                  gallery.liked
                    ? 'text-red-500 bg-red-50'
                    : 'text-gray-500 hover:text-red-500 hover:bg-red-50/80'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className={`text-lg transition-transform duration-200 ${gallery.liked ? 'scale-110' : 'group-hover:scale-125'}`}>
                  {gallery.liked ? <HeartFilled /> : <HeartOutlined />}
                </span>
                <span className="text-sm font-medium">{gallery.likeCount}</span>
              </button>
              
              <div className="w-px h-5 bg-gray-200"></div>
              
              <button
                onClick={handleFavorite}
                disabled={!isAuthenticated}
                className={`group flex items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 ${
                  gallery.favorited
                    ? 'text-amber-500 bg-amber-50'
                    : 'text-gray-500 hover:text-amber-500 hover:bg-amber-50/80'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className={`text-lg transition-transform duration-200 ${gallery.favorited ? 'scale-110' : 'group-hover:scale-125'}`}>
                  {gallery.favorited ? <StarFilled /> : <StarOutlined />}
                </span>
                <span className="text-sm font-medium">{gallery.favoriteCount}</span>
              </button>
            </div>

            {/* Description */}
            {gallery.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <h3 className="font-medium text-black mb-2">简介</h3>
                <p className="text-gray-600 text-sm">{gallery.description}</p>
              </div>
            )}

            {/* Download Block */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h3 className="font-medium text-black mb-3">下载图集</h3>
              {isAuthenticated ? (
                user?.vip ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">会员等级</span>
                      <span className="text-yellow-600 font-medium">
                        {user.vipLevel || 'VIP会员'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">今日下载剩余</span>
                      <span className="text-black font-medium">
                        {user.dailyDownloadCount ?? 0} / {user.dailyDownloadLimit ?? 10} 次
                      </span>
                    </div>
                    {downloadLink ? (
                      <div className="space-y-2 pt-2">
                        <div className="relative bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200">
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full">
                            下载链接
                          </span>
                          <div className="mt-2 px-3 pb-3 rounded-lg break-all text-sm text-gray-800">
                            {downloadLink}
                          </div>
                          <button
                            onClick={() => handleCopy(downloadLink)}
                            className="absolute bottom-2 right-2 px-2 hover:bg-amber-100 rounded transition-colors text-gray-500 hover:text-gray-700"
                            title="复制链接"
                          >
                            <PaperClipOutlined />
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 text-center">链接已缓存24小时，期间查看不再消耗次数</div>
                      </div>
                    ) : (
                      <button
                        onClick={handleDownload}
                        disabled={(user.dailyDownloadCount ?? 0) >= (user.dailyDownloadLimit ?? 10)}
                        className="w-full py-2.5 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <DownloadOutlined className="text-base mr-2" />
                        获取下载链接
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">会员等级</span>
                      <span className="text-gray-400 font-medium">无</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">今日下载剩余</span>
                      <span className="text-gray-400 font-medium">
                        0 / 0 次
                      </span>
                    </div>
                    <div className="text-center pt-2 border-t border-gray-100">
                      <div className="text-sm text-gray-600 mb-3">
                        当前为<span className="text-gray-900 font-medium">非会员</span>，无法下载
                      </div>
                      <Link
                        to="/recharge"
                        target="_blank"
                        className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors"
                      >
                        去充值
                      </Link>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-600 mb-3">登录后查看会员套餐</p>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="inline-block px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    立即登录
                  </button>
                </div>
              )}
            </div>

            {/* Recommended Galleries */}
            {recommendedGalleries.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-2 md:p-4 mb-6">
                <h3 className="font-medium text-black mb-3">推荐图集</h3>
                <div className="grid grid-cols-2 gap-3">
                  {recommendedGalleries.map((g) => (
                    <Link
                      key={g.id}
                      to={`/id/${g.id}`}
                      target="_blank"
                      className="group block bg-gray-50 rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-all"
                    >
                      {/* Cover */}
                      <div className="aspect-[1/1] relative overflow-hidden bg-gray-100">
                        <img
                          src={g.coverUrl}
                          alt={g.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      {/* Info */}
                      <div className="p-2">
                        <h4 className="text-sm font-medium text-black line-clamp-1 group-hover:text-gray-600">
                          {g.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="mt-1 flex items-center space-x-3 text-xs text-gray-400">
                            <span className="flex items-center">
                              <EyeOutlined className="text-xs mr-1" />
                              {g.viewCount}
                            </span>
                              <span className="items-center">
                              <ArrowDownOutlined className="text-xs mr-1" />
                                {g.downloadCount}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-gray-400">
                            <span>{formatDate(g.createTime)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-medium text-black mb-4">评论</h3>

              {/* Comment Form */}
              {isAuthenticated ? (
                <form onSubmit={handleCommentSubmit} className="mb-4">
                  <textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="发表你的评论..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none"
                    rows={3}
                  />
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="relative flex-1">
                      <SafetyOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                        placeholder="请输入计算结果"
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchCommentCaptcha}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      {captchaQuestion || '获取验证码'}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !commentContent.trim() || !captchaAnswer.trim()}
                    className="mt-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '提交中...' : '发表评论'}
                  </button>
                </form>
              ) : (
                <p className="text-sm text-gray-500 mb-4">登录后可发表评论</p>
              )}

              {/* Comment List */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">暂无评论</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-8 h-8 ${getAvatarColor(comment.username)} rounded-full flex items-center justify-center`}>
                          <span className="text-xs font-bold text-black">
                            {comment.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-black">{comment.username}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createTime).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
          onClick={(e) => {
            // 只有点击背景（非图片）时才关闭
            if (e.target === e.currentTarget || e.target === lightboxRef.current?.querySelector('.image-container')) {
              setLightboxOpen(false);
            }
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-lg z-10"
          >
            <CloseOutlined className="text-xl" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToImage((currentImageIndex - 1 + gallery.images.length) % gallery.images.length, 'right');
            }}
            className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-lg z-10"
          >
            <LeftOutlined className="text-2xl" />
          </button>

          <div className="image-container flex items-center justify-center w-full h-full overflow-hidden">
            <img
              key={currentImageIndex}
              src={gallery.images[currentImageIndex]?.url}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
              style={{
                transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
                animation: enterDirection === 'left' 
                  ? 'slideInFromRight 200ms ease-out' 
                  : enterDirection === 'right'
                    ? 'slideInFromLeft 200ms ease-out'
                    : undefined,
              }}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <style>{`
            @keyframes slideInFromRight {
              from { opacity: 0.3; transform: translateX(30%); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideInFromLeft {
              from { opacity: 0.3; transform: translateX(-30%); }
              to { opacity: 1; transform: translateX(0); }
            }
          `}</style>

          <button
            onClick={(e) => {
              e.stopPropagation();
              goToImage((currentImageIndex + 1) % gallery.images.length, 'left');
            }}
            className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-lg z-10"
          >
            <RightOutlined className="text-2xl" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm z-10">
            {currentImageIndex + 1} / {gallery.images.length}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
      />

      <ScrollToTop />
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  if (days < 365) return `${Math.floor(days / 30)}月前`;
  return `${Math.floor(days / 365)}年前`;
}
