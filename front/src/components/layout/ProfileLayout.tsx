import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserOutlined, MailOutlined, LockOutlined, CommentOutlined, DollarOutlined, WalletOutlined, HomeOutlined } from '@ant-design/icons';

const ProfileLayout: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/profile/overview', icon: <HomeOutlined />, label: '概览' },
    { path: '/profile/info', icon: <UserOutlined />, label: '个人信息' },
    { path: '/profile/email', icon: <MailOutlined />, label: '修改邮箱' },
    { path: '/profile/password', icon: <LockOutlined />, label: '修改密码' },
    { path: '/profile/feedback', icon: <CommentOutlined />, label: '意见反馈' },
    { path: '/profile/consume', icon: <DollarOutlined />, label: '消费记录' },
    { path: '/profile/wallet', icon: <WalletOutlined />, label: '钱包管理' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* 侧边栏 */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <nav className="divide-y divide-gray-200">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileLayout;
