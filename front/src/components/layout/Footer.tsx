import { usePublicConfig } from '@/hooks/usePublicConfig';

/**
 * 备案号：仅在系统配置（icp_number）不为空时展示
 */
export function IcpNumber({ className = '' }: { className?: string }) {
  const config = usePublicConfig();
  const icpNumber = (config?.icpNumber ?? '').trim();

  if (!icpNumber) {
    return null;
  }

  if (/ICP/i.test(icpNumber)) {
    return (
      <p className={`text-center ${className}`}>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noreferrer noopener"
          className="hover:underline"
        >
          {icpNumber}
        </a>
      </p>
    );
  }

  return <p className={`text-center ${className}`}>{icpNumber}</p>;
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-400 text-center">
          © {currentYear} RawImg. All rights reserved.
        </p>
        <IcpNumber className="text-sm text-gray-400 mt-2" />
      </div>
    </footer>
  );
}
