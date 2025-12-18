'use client';

import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { CreditCard, FileText, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MorePage() {
  const { logout } = useAuth();

  const menuItems = [
    { icon: CreditCard, label: 'Payments', href: '/payments', color: 'text-blue-600' },
    { icon: FileText, label: 'Ledger', href: '/ledger', color: 'text-green-600' },
    { icon: BarChart3, label: 'Reports', href: '/reports', color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">More</h1>
        <p className="text-gray-600 mt-1">Additional features and settings</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {menuItems.map((item, index) => (
          <Link key={index} href={item.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardBody className="p-4">
                <div className="flex items-center">
                  <div className={`${item.color} bg-gray-50 p-3 rounded-lg mr-4`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-lg font-medium text-gray-900">{item.label}</span>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={logout}>
          <CardBody className="p-4">
            <div className="flex items-center">
              <div className="text-red-600 bg-red-50 p-3 rounded-lg mr-4">
                <LogOut className="w-6 h-6" />
              </div>
              <span className="text-lg font-medium text-red-600">Logout</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
