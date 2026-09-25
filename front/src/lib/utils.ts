import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 为OSS图片URL添加缩略图处理参数以减少流量消耗
 * 只对cdn.rawchen.com域名的图片添加OSS处理参数
 * @param url 图片URL
 * @param style 可选的样式参数，如 "w:400,h:400"
 * @returns 带OSS处理参数的URL
 */
export function addOssThumbnailStyle(url: string | null | undefined, style?: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // 只对cdn.rawchen.com域名的图片添加OSS处理参数
    if (urlObj.hostname === 'cdn.rawchen.com') {
      // 如果URL已经有查询参数，使用&连接，否则使用?
      const separator = urlObj.search ? '&' : '?';
      // 如果指定了样式参数，使用自定义样式；否则使用默认样式
      const styleParam = style ? `x-oss-process=image/resize,${style}` : 'x-oss-process=style/rawimg';
      return `${url}${separator}${styleParam}`;
    }
  } catch (e) {
    // URL解析失败，返回原URL
  }
  return url;
}

/**
 * 从OSS图片URL中移除x-oss-process处理参数，返回原图URL
 * @param url 图片URL
 * @returns 移除OSS处理参数后的URL
 */
export function removeOssProcessStyle(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'cdn.rawchen.com') {
      // 移除 x-oss-process 参数（可能在 ? 后或 & 后）
      urlObj.searchParams.delete('x-oss-process');
      const search = urlObj.searchParams.toString();
      return search ? `${urlObj.origin}${urlObj.pathname}?${search}` : `${urlObj.origin}${urlObj.pathname}`;
    }
  } catch (e) {
    // URL解析失败，尝试用正则处理
    return url.replace(/[?&]x-oss-process=[^&]*/, '').replace(/\?$/, '');
  }
  return url;
}
