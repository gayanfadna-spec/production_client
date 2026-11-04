import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Leaf, Sun, Moon, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { Badge } from '../common/Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'rose';
      case 'production_manager':
        return 'emerald';
      case 'store_keeper':
        return 'amber';
      default:
        return 'blue';
    }
  };

  const formatRoleName = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Factory Admin';
      case 'production_manager':
        return 'Production Manager';
      case 'store_keeper':
        return 'Store Keeper';
      case 'viewer':
        return 'Auditor / Viewer';
      default:
        return 'Staff';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white">
              FADNA
            </span>
            <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-semibold">
              Production OS
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Factory Stock & Daily Production Planning System
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
        </button>

        {/* User Card */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{user.name}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                  <ShieldCheck className="w-3 h-3" />
                  {formatRoleName(user.role)}
                </Badge>
              </div>
            </div>

            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {user.name.charAt(0)}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
