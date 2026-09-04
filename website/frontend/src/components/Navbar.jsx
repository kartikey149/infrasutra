import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import ProjectModal from './ProjectModal';
import { API_BASE } from '../config';
import {
  LayoutDashboard,
  CalendarDays,
  Mic,
  BrainCircuit,
  FileSpreadsheet,
  HardHat,
  Briefcase,
  LogOut,
  LogIn,
  FolderKanban,
  ChevronDown,
  PenLine,
  ClipboardCheck,
  Table2,
  BarChart3,
  Bell,
  CheckCheck,
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, authFetch } = useAuth();
  const { activeProject } = useProject();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // In-App Notifications State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`${API_BASE}/notifications`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 12000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await authFetch(`${API_BASE}/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authFetch(`${API_BASE}/notifications/read-all`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Field Update', path: '/field-update', icon: PenLine },
    { name: 'Review & Approve', path: '/approval', icon: ClipboardCheck },
    { name: 'Schedule Explorer', path: '/schedule-explorer', icon: Table2 },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Top Navbar for Desktop & Tablet */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 text-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Brand Logo & Active Project Switcher */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200">
                <span className="font-extrabold text-xs text-white tracking-wider">SIH</span>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                    InfraSutra
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    PS-122
                  </span>
                </div>
              </div>
            </Link>

            {/* Active Project Selector Button */}
            {isAuthenticated && activeProject ? (
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-300/80 text-left transition group shadow-sm"
                title="Click to view previous projects or edit current project"
              >
                <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700">
                  <FolderKanban size={14} />
                </div>
                <div className="max-w-[140px] sm:max-w-[180px] truncate">
                  <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">
                    {activeProject.name}
                  </div>
                  <div className="text-[9px] text-slate-500 font-medium truncate leading-none mt-0.5">
                    {activeProject.location}
                  </div>
                </div>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>
            ) : isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition shadow-sm"
                title="Click to open Project Portfolio and create or manage projects"
              >
                <FolderKanban size={13} className="text-amber-700" />
                <span>{user?.roleKey === 'supervisor' ? 'No Projects (Open Portfolio)' : 'Manage Projects & Assign'}</span>
              </button>
            ) : null}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md font-bold scale-[1.02]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : item.highlight ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {/* In-App Notification Bell */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(!isNotifOpen);
                      if (!isNotifOpen) fetchNotifications();
                    }}
                    className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition shadow-sm"
                    title="In-App Notifications"
                  >
                    <Bell className="w-4 h-4 text-slate-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Drawer */}
                  {isNotifOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold text-slate-900">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                          >
                            <CheckCheck size={12} /> Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`p-3.5 text-xs transition flex items-start justify-between gap-2.5 ${
                                !n.is_read ? 'bg-amber-50/60 hover:bg-amber-50/90' : 'bg-white hover:bg-slate-50'
                              }`}
                            >
                              <div className="space-y-1">
                                <p className={`text-slate-800 ${!n.is_read ? 'font-bold' : 'font-normal'}`}>
                                  {n.message}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>{n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                                  {n.project_id && (
                                    <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                      {n.project_id}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!n.is_read && (
                                <button
                                  type="button"
                                  onClick={() => markAsRead(n.id)}
                                  title="Mark as read"
                                  className="text-amber-600 hover:text-amber-800 p-1 shrink-0 transition"
                                >
                                  <div className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Role Chip */}
                <div className="flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-xl bg-slate-100 border border-slate-200">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      user.roleKey === 'supervisor'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    }`}
                  >
                    {user.roleKey === 'supervisor' ? (
                      <HardHat className="w-3.5 h-3.5" />
                    ) : (
                      <Briefcase className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 leading-none mt-0.5">
                      {user.role}
                    </div>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Dedicated Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-amber-600 font-bold scale-105'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-amber-100' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-600' : ''}`} />
              </div>
              <span className="text-[10px] font-semibold leading-none">{item.name.replace('Field ', '')}</span>
            </Link>
          );
        })}
      </div>

      {/* Projects Manager Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </>
  );
}