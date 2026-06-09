import { Link } from 'react-router-dom';
import {
  EyeOutlined,
  HeartOutlined,
  MessageOutlined,
  DownloadOutlined,
  ArrowDownOutlined,
  CloudDownloadOutlined, StarOutlined
} from '@ant-design/icons';
import type { Gallery } from '@/types';

interface GalleryCardProps {
  gallery: Gallery;
}

export function GalleryCard({ gallery }: GalleryCardProps) {
  return (
    <Link
      to={`/id/${gallery.id}`}
      target="_blank"
      className="group block bg-white rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all"
    >
      {/* Cover Image */}
      <div className="aspect-[1/1.1] relative overflow-hidden bg-gray-100">
        <img
          src={gallery.coverUrl}
          alt={gallery.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-black line-clamp-2 group-hover:text-gray-600 transition-colors">
          {gallery.title}
        </h3>

        {/* Stats */}
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <EyeOutlined className="text-sm mr-1" />
              {formatNumber(gallery.viewCount)}
            </span>
            <span className="items-center hidden md:flex">
              <HeartOutlined className="text-sm mr-1" />
              {formatNumber(gallery.likeCount)}
            </span>
            <span className="items-center hidden md:flex">
            <StarOutlined className="text-sm mr-1" />
              {formatNumber(gallery.favoriteCount)}
          </span>
            <span className="flex items-center">
            <ArrowDownOutlined className="text-sm mr-1" />
              {formatNumber(gallery.downloadCount)}
          </span>
            {/*<span className="flex items-center">*/}
            {/*  <MessageOutlined className="text-sm mr-1" />*/}
            {/*  {formatNumber(gallery.commentCount)}*/}
            {/*</span>*/}
          </div>
          {/* Date */}
          <div className=" text-sm text-gray-400">
            {formatDate(gallery.createTime)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
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
