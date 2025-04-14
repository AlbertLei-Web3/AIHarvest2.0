import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, isPositive }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
      {change && (
        <div className="flex items-center mt-2">
          <span className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? '↑' : '↓'} {change}
          </span>
        </div>
      )}
    </div>
  );
};

export const DashboardStats: React.FC = () => {
  // These would typically be fetched from an API or blockchain
  const stats = [
    { title: 'Total Value Locked', value: '$142,568,975', change: '12.5%', isPositive: true },
    { title: 'Trading Volume (24h)', value: '$28,937,642', change: '8.2%', isPositive: true },
    { title: 'AIH Price', value: '$1.24', change: '3.6%', isPositive: false },
    { title: 'Active Users', value: '32,581', change: '15.8%', isPositive: true },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatCard 
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          isPositive={stat.isPositive}
        />
      ))}
    </div>
  );
}; 