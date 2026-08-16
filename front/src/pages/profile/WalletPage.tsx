import React from 'react';
import WalletTab from '@/components/WalletTab';

const WalletPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">钱包管理</h2>
      <WalletTab />
    </div>
  );
};

export default WalletPage;
