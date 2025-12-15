"use client";

import { useState } from 'react';
import { Search, Bell, HelpCircle, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopBar() {
  const { user, permissions, logout, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Get display name and role
  const displayName = user?.name || 'User';
  const displayRole = user?.role?.replace('_', ' ') || 'User';
  const formattedRole = displayRole.charAt(0).toUpperCase() + displayRole.slice(1);

  return (
    <div className="bg-gray-800 border-b border-gray-700 h-16 flex items-center px-6 gap-6">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor"/>
          </svg>
        </div>
        <span className="text-white font-semibold">UCMP</span>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search extensions, IVRs, flows, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Help */}
        <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5 text-gray-300" />
        </button>

        {/* User Menu */}
        {isAuthenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-4 border-l border-gray-700 hover:bg-gray-700/50 rounded-lg py-1 pr-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{displayName}</div>
                  <div className="text-xs text-gray-400">{formattedRole}</div>
                </div>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-gray-800 border-gray-700">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem className="text-gray-300 focus:bg-gray-700 focus:text-white cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem
                className="text-red-400 focus:bg-gray-700 focus:text-red-300 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
            <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
