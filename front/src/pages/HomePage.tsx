import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClockCircleFilled,
  DownCircleFilled,
  FireFilled,
  HeartFilled,
  SyncOutlined
} from '@ant-design/icons';
import { GalleryCard } from '@/components/gallery/GalleryCard';
import { ScrollToTop } from '@/components/common/ScrollToTop';
import { galleryApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import type { Gallery } from '@/types';

const validSorts = ['latest', 'like', 'hot', 'down'] as const;
type SortType = typeof validSorts[number];

export function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, refreshUser } = useAuth();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);

  const pathSort = location.pathname.slice(1);
  const sortBy: SortType = validSorts.includes(pathSort as SortType) ? pathSort as SortType : 'latest';
  
  // 从 URL 参数读取页码，默认为 1
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage === 1) {
      // 第一页时不显示 page 参数
      navigate(location.pathname, { replace: false });
    } else {
      navigate(`${location.pathname}?page=${newPage}`, { replace: false });
    }
    // 滚动到顶部
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    fetchGalleries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, page]);

  // 每次进入主页时刷新用户数据（如果已登录）
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser().catch(() => {
        console.log('Failed to refresh user data on home page');
      });
    }
  }, []);

  const fetchGalleries = async () => {
    setLoading(true);
    try {
      const result = await galleryApi.getGalleries(page, 20, sortBy);
      setGalleries(result.content);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to fetch galleries:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortLabels: Record<string, string> = {
    latest: '最新',
    like: '喜爱',
    hot: '热门',
    down: '下载',
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
    {/*<div className=" max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">*/}
      {/* Page Title */}
      <div className="mb-2 md:mb-6 hidden md:block">
        <span className="text-3xl mr-3 font-bold text-black">
          {sortLabels[sortBy] || ''}图集
        </span>
        {sortBy === 'latest' && <ClockCircleFilled className="text-3xl text-red-500" />}
        {sortBy === 'hot' && <FireFilled className="text-3xl text-red-500" />}
        {sortBy === 'like' && <HeartFilled className="text-3xl text-red-500" />}
        {sortBy === 'down' && <DownCircleFilled className="text-3xl text-red-500" />}
        <p className="mt-2 text-gray-500">发现更多精彩图片集</p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <SyncOutlined className="text-5xl text-gray-400" spin />
        </div>
      ) : galleries.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">暂无图集</p>
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
