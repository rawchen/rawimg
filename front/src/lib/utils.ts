import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 为OSS图片URL添加缩略图处理参数以减少流量消耗
 * 只对cdn.rawchen.com域名的图片添加OSS处理参数
 * @param url 图片URL
 * @returns 带OSS处理参数的URL
 */
export function addOssThumbnailStyle(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // 只对cdn.rawchen.com域名的图片添加OSS处理参数
    if (urlObj.hostname === 'cdn.rawchen.com') {
      // 如果URL已经有查询参数，使用&连接，否则使用?
      const separator = urlObj.search ? '&' : '?';
      return `${url}${separator}x-oss-process=style/rawimg`;
    }
  } catch (e) {
    // URL解析失败，返回原URL
  }
  return url;
}
