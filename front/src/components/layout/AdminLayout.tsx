import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  PictureOutlined,
  TeamOutlined,
  SettingOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PayCircleOutlined,
  SearchOutlined,
  GiftOutlined,
  CrownOutlined,
  HeartOutlined,
  CommentOutlined
} from '@ant-design/icons';

const sidebarItems = [
  { icon: DashboardOutlined, label: '仪表盘', path: '/admin' },
  { icon: PictureOutlined, label: '图集管理', path: '/admin/galleries' },
  { icon: TeamOutlined, label: '用户管理', path: '/admin/users' },
  { icon: FileTextOutlined, label: '评论管理', path: '/admin/comments' },
  { icon: CommentOutlined, label: '意见反馈', path: '/admin/feedback' },
  { icon: PayCircleOutlined, label: '订单管理', path: '/admin/orders' },
  { icon: GiftOutlined, label: '卡密管理', path: '/admin/card-keys' },
  { icon: CrownOutlined, label: '套餐管理', path: '/admin/vip-packages' },
  { icon: SearchOutlined, label: '访问日志', path: '/admin/logs' },
  { icon: HeartOutlined, label: '行为日志', path: '/admin/user-actions' },
  { icon: SettingOutlined, label: '系统配置', path: '/admin/config' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex bg-gray-100 min-h-[60vh]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-6 border-b border-gray-200">
          <Link to="/admin" className="text-xl font-bold text-black">管理后台</Link>
        </div>
        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <Link
            to="/"
            target="_blank"
            className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogoutOutlined className="text-lg" />
            <span>返回前台</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
