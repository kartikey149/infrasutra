import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import ProjectModal from './ProjectModal';
import SettingsModal from './SettingsModal';
import { API_BASE } from '../config';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import {
  LayoutDashboard,
  PenLine,
  ClipboardCheck,
  Table2,
  BarChart3,
  FolderKanban,
  ChevronDown,
  Bell,
  CheckCheck,
  HardHat,
  Briefcase,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  Layers,
  Globe
} from 'lucide-react';

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, authFetch } = useAuth();
  const { activeProject } = useProject();

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      const localNotifs = JSON.parse(localStorage.getItem('sih_local_notifications') || '[]');
      setNotifications(localNotifs);
      setUnreadCount(localNotifs.filter((n) => !n.is_read).length);
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
      const localNotifs = JSON.parse(localStorage.getItem('sih_local_notifications') || '[]');
      const updated = localNotifs.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      localStorage.setItem('sih_local_notifications', JSON.stringify(updated));
      setNotifications(updated);
      setUnreadCount(updated.filter((n) => !n.is_read).length);
    }
  };

  const markAllAsRead = async () => {
    try {
      await authFetch(`${API_BASE}/notifications/read-all`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      const localNotifs = JSON.parse(localStorage.getItem('sih_local_notifications') || '[]');
      const updated = localNotifs.map((n) => ({ ...n, is_read: true }));
      localStorage.setItem('sih_local_notifications', JSON.stringify(updated));
      setNotifications(updated);
      setUnreadCount(0);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav.fieldUpdate'), path: '/field-update', icon: PenLine },
    { name: t('nav.reviewApprove'), path: '/approval', icon: ClipboardCheck },
    { name: t('nav.scheduleExplorer'), path: '/schedule-explorer', icon: Table2 },
    { name: t('nav.analytics'), path: '/analytics', icon: BarChart3 },
  ];

  // If on login page, do not render vertical sidebar
  if (location.pathname === '/login') {
    return null;
  }

  const NavLinksContent = () => (
    <div className="space-y-1">
      <div className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
              isActive
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/90'
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors ${
                isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-700'
              }`}
            />
            <span className="flex-1 tracking-tight">{item.name}</span>
            {isActive && (
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/infrasutra_logo.png" 
              alt="InfraSutra Logo" 
              className="h-8 w-auto rounded-xl object-contain bg-slate-900 px-1 py-0.5 border border-slate-700 shadow-sm" 
            />
            <span className="font-extrabold text-sm tracking-tight text-slate-900">InfraSutra</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Notifications Bell */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-black text-[9px] flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Mobile Settings Icon */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-white h-full flex flex-col p-5 shadow-2xl z-10 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <img 
                  src="/infrasutra_logo.png" 
                  alt="InfraSutra Logo" 
                  className="h-8 w-auto rounded-xl object-contain bg-slate-900 px-1 py-0.5 border border-slate-700 shadow-sm" 
                />
                <span className="font-extrabold text-base text-slate-900">InfraSutra</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-4 flex-1">
              <NavLinksContent />
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                <Settings size={16} className="text-slate-500" />
                Settings & Preferences
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Vertical Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/90 h-screen sticky top-0 z-30 select-none shrink-0 shadow-sm">
        {/* Sidebar Header & Brand Logo */}
        <div className="p-5 pb-4 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/infrasutra_logo.png" 
              alt="InfraSutra Logo" 
              className="h-10 w-auto rounded-2xl object-contain bg-slate-900 px-1.5 py-1 border border-slate-700 shadow-md shadow-slate-900/20 group-hover:scale-105 transition-transform duration-200 shrink-0" 
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                  InfraSutra
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Oil India
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Infrastructure AI Platform</p>
            </div>
          </Link>
        </div>

        {/* Active Project Card Selector */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 mb-1.5 px-1 flex items-center justify-between">
            <span>Current Workspace</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {isAuthenticated && activeProject ? (
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl bg-white hover:bg-slate-100/80 border border-slate-200/90 text-left transition group shadow-sm"
              title="Click to view previous projects or edit current project"
            >
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500/20 transition shrink-0">
                <FolderKanban size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                  {activeProject.name}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                  {activeProject.location}
                </div>
              </div>
              <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-700 shrink-0" />
            </button>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-sm"
            >
              <FolderKanban size={15} className="text-amber-700" />
              <span className="truncate">Manage Projects & Assign</span>
            </button>
          ) : null}
        </div>

        {/* Main Vertical Navigation Links */}
        <div className="flex-1 px-3.5 py-4 overflow-y-auto space-y-6">
          <NavLinksContent />

          {/* Quick In-App Notifications Bar in Sidebar */}
          <div className="space-y-1.5 pt-2">
            <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Alerts & Activity</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold font-mono">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (!isNotifOpen) fetchNotifications();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isNotifOpen
                    ? 'bg-amber-50 border border-amber-200 text-amber-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm ring-2 ring-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer in Sidebar */}
              {isNotifOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                  <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">Recent Alerts</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <CheckCheck size={11} /> Clear
                      </button>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-[11px]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-xs">No alerts yet</div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 transition flex items-start justify-between gap-1.5 ${
                            !n.is_read ? 'bg-amber-50/70 font-semibold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="text-slate-800 line-clamp-2">{n.message}</p>
                            <span className="text-[9px] text-slate-400">
                              {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </span>
                          </div>
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={() => markAsRead(n.id)}
                              className="text-amber-600 p-1 shrink-0"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Language Selector, Settings & User Profile */}
        <div className="p-3 border-t border-slate-200/90 bg-slate-50/60 space-y-2">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <div className="flex items-center justify-between px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <span>{t('sidebar.language')}</span>
              <Globe className="w-3 h-3 text-slate-400" />
            </div>
            <select
              value={i18n.language || 'en'}
              onChange={(e) => {
                i18n.changeLanguage(e.target.value);
                localStorage.setItem('sih_ui_language', e.target.value);
              }}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-sm transition"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-white hover:border-slate-200/90 border border-transparent transition shadow-none hover:shadow-sm"
          >
            <Settings size={16} className="text-slate-500" />
            <span className="flex-1 text-left">{t('sidebar.platformSettings')}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 font-mono text-slate-600 font-semibold">
              v2.5
            </span>
          </button>

          {/* User Profile Card & Prominent Logout Section */}
          {isAuthenticated && user ? (
            <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    user.roleKey === 'supervisor'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}
                >
                  {user.roleKey === 'supervisor' ? (
                    <HardHat className="w-5 h-5" />
                  ) : (
                    <Briefcase className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all flex items-center justify-center gap-2 group active:scale-95"
                title="Sign out of Infrasutra"
              >
                <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full py-2.5 px-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <LogIn size={15} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Project Management Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      {/* Platform Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}
