import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {HeartFilled, HeartOutlined, LoadingOutlined, StarFilled} from '@ant-design/icons';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { userApi } from '@/api';
import type { Gallery } from '@/types';

export function FavoritesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  
  // 从 URL 参数读取页码，默认为 1
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage === 1) {
      // 第一页时不显示 page 参数
      navigate('/favorites', { replace: false });
    } else {
      navigate(`/favorites?page=${newPage}`, { replace: false });
    }
    // 滚动到顶部
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (isLoading) return; // 等待认证状态加载完成
    if (!isAuthenticated) {
      navigate('/', { state: { showLogin: true } });
      return;
    }
    fetchFavorites();
  }, [isAuthenticated, isLoading, page]);

  const fetchFavorites = async () => {
    if (!user) return;
    
    const userId = user.userId || user.id;
    if (!userId) return;
    
    setLoading(true);
    try {
      const result = await userApi.getFavorites(userId, page, 20);
      setGalleries(result.content);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingOutlined className="text-5xl text-gray-400" spin />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
      {/* Page Title */}
      <div className="mb-2 md:mb-6">
        <div className="flex items-center space-x-3">
          <div>
            <span className="text-3xl mr-3 font-bold text-black">我的收藏</span>
            <StarFilled className="text-3xl text-red-500" />
            <p className="mt-2 text-gray-500">查看您收藏的所有图集</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingOutlined className="text-5xl text-gray-400" spin />
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-20">
          <HeartOutlined className="text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">还没有收藏任何图集</p>
          <p className="text-gray-400 text-sm mt-2">浏览图集时点击收藏按钮即可添加到收藏列表</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            去发现
          </button>
        </div>
      ) : (
        <>
          {/* Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 sm:gap-2 md:gap-3 lg:gap-4 xl:gap-5">
            {galleries.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center space-x-2">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">
                第 {page} / {totalPages} 页
              </span>
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      <ScrollToTop />
    </div>
  );
}
