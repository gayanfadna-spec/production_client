import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Leaf,
  Package,
  ArrowLeftRight,
  Workflow,
  FlaskConical,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, alertCount = 0 }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'matrix-sheet', label: 'Daily Matrix Sheet', icon: FileSpreadsheet },
    { id: 'finished-goods', label: 'Finished Goods', icon: Boxes },
    { id: 'raw-materials', label: 'Raw Materials', icon: Leaf },
    { id: 'packing-materials', label: 'Packing Materials', icon: Package },
    { id: 'transactions', label: 'Stock In / Out', icon: ArrowLeftRight },
    { id: 'pipeline', label: 'Blend & BOM Pipeline', icon: FlaskConical },
    { id: 'bom', label: 'Product Formulas', icon: Workflow },
    { id: 'capacity', label: 'Capacity Calculator', icon: Calculator },
    { id: 'sales-planning', label: '3-Month Sales MRP', icon: TrendingUp },
    { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet },
    { id: 'users', label: 'Users & Audit Logs', icon: Users },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 flex-shrink-0">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Operations & Inventory
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.id === 'dashboard' && alertCount > 0 && (
                <span className="flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Factory Floor Stock Tag */}
      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Factory Live Feed
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Production Floor & Finished Stores are monitored in real-time.
        </p>
      </div>
    </aside>
  );
};
