import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { DashboardSummary } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  Boxes,
  Leaf,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/summary');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Loading live factory metrics...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const fg = kpis?.finishedGoods;
  const floorRatio = fg?.totalUnits ? Math.round((fg.productionFloorUnits / fg.totalUnits) * 100) : 0;
  const storeRatio = 100 - floorRatio;

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Refresh & Live Time */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Factory Stock & Operations Center
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time material valuation, dual-location finished stock, and production planning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            Refresh Feed
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Finished Goods */}
        <Card hoverEffect onClick={() => onNavigate('finished-goods')} className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Finished Goods
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-white">{fg?.totalUnits?.toLocaleString() || 0}</p>
            <span className="text-xs text-emerald-400 font-semibold">{fg?.totalProducts || 0} SKUs</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Valuation: <span className="text-slate-200 font-medium">LKR {fg?.valuation?.toLocaleString() || 0}</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-teal-400 font-medium">Floor: {fg?.productionFloorUnits?.toLocaleString() || 0}</span>
            <span className="text-blue-400 font-medium">Store: {fg?.finishedStoreUnits?.toLocaleString() || 0}</span>
          </div>
        </Card>

        {/* Card 2: Raw Materials */}
        <Card hoverEffect onClick={() => onNavigate('raw-materials')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Raw Materials
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-white">{kpis?.rawMaterials?.totalStock?.toLocaleString() || 0} kg</p>
            <span className="text-xs text-teal-400 font-semibold">{kpis?.rawMaterials?.totalItems || 0} Items</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Valuation: <span className="text-slate-200 font-medium">LKR {kpis?.rawMaterials?.valuation?.toLocaleString() || 0}</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Low Stock Alerts:</span>
            <span className={`font-bold ${kpis?.rawMaterials?.lowStockCount ? 'text-amber-400' : 'text-emerald-400'}`}>
              {kpis?.rawMaterials?.lowStockCount || 0} item(s)
            </span>
          </div>
        </Card>

        {/* Card 3: Packing Materials */}
        <Card hoverEffect onClick={() => onNavigate('packing-materials')}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Packing Materials
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-white">{kpis?.packingMaterials?.totalStock?.toLocaleString() || 0}</p>
            <span className="text-xs text-blue-400 font-semibold">{kpis?.packingMaterials?.totalItems || 0} Specs</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Valuation: <span className="text-slate-200 font-medium">LKR {kpis?.packingMaterials?.valuation?.toLocaleString() || 0}</span>
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Low Stock Alerts:</span>
            <span className={`font-bold ${kpis?.packingMaterials?.lowStockCount ? 'text-amber-400' : 'text-emerald-400'}`}>
              {kpis?.packingMaterials?.lowStockCount || 0} item(s)
            </span>
          </div>
        </Card>

        {/* Card 4: Total Inventory Valuation */}
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Total Factory Valuation
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            LKR {kpis?.inventoryValuationTotal?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Combined FG, RM and PM working capital
          </p>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Today's Moves:</span>
            <span className="text-emerald-400 font-bold">
              {kpis?.todayOperations?.totalActivity || 0} transactions
            </span>
          </div>
        </Card>
      </div>

      {/* CORE HIGHLIGHT: Clear visual distinction between Production Floor Stock and Finished Store Stock */}
      <Card className="border-teal-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white">
                Finished Goods: Floor Stock vs. Finished Store Stock
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active stock separation between factory packing lines and customer-dispatch warehouses.
            </p>
          </div>

          <button
            onClick={() => onNavigate('transactions')}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all flex items-center gap-2"
          >
            <span>Transfer Floor ↔ Store</span>
          </button>
        </div>

        {/* Visual Ratio Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
            <div
              style={{ width: `${floorRatio}%` }}
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 relative group transition-all"
              title={`Production Floor Stock: ${fg?.productionFloorUnits} units (${floorRatio}%)`}
            ></div>
            <div
              style={{ width: `${storeRatio}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 relative group transition-all"
              title={`Finished Store Stock: ${fg?.finishedStoreUnits} units (${storeRatio}%)`}
            ></div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-teal-400"></span>
              <span className="font-semibold text-slate-200">Production Floor Stock:</span>
              <span className="text-teal-400 font-bold">{fg?.productionFloorUnits?.toLocaleString() || 0} packs ({floorRatio}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-500"></span>
              <span className="font-semibold text-slate-200">Finished Store Stock:</span>
              <span className="text-blue-400 font-bold">{fg?.finishedStoreUnits?.toLocaleString() || 0} packs ({storeRatio}%)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Two Column Layout: Low Stock Alerts + Production Capacity Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Low Stock Alerts */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Low Stock Warning Matrix</h3>
              </div>
              <Badge variant={data?.alerts?.totalAlerts ? 'rose' : 'emerald'} size="sm">
                {data?.alerts?.totalAlerts || 0} Item(s) at Reorder Level
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {data?.alerts?.totalAlerts === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  All Finished Goods, Raw Materials, and Packing items are above reorder thresholds.
                </div>
              ) : (
                <>
                  {data?.alerts?.finishedGoods?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-rose-500/20 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                            FG
                          </span>
                          <p className="text-xs font-bold text-slate-200">{item.name}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Floor: <span className="text-teal-400">{item.productionFloorStock}</span> | Store:{' '}
                          <span className="text-blue-400">{item.finishedStoreStock}</span> (Total:{' '}
                          <span className="text-rose-400 font-semibold">{item.totalStock} {item.unit}</span>)
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Min Threshold</span>
                        <span className="text-xs font-bold text-slate-300">{item.minReorderLevel} {item.unit}</span>
                      </div>
                    </div>
                  ))}

                  {data?.alerts?.rawMaterials?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-amber-500/20 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            RM
                          </span>
                          <p className="text-xs font-bold text-slate-200">{item.name}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Current Stock:{' '}
                          <span className="text-amber-400 font-semibold">{item.currentStock} {item.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Min Threshold</span>
                        <span className="text-xs font-bold text-slate-300">{item.minReorderLevel} {item.unit}</span>
                      </div>
                    </div>
                  ))}

                  {data?.alerts?.packingMaterials?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-blue-500/20 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            PM
                          </span>
                          <p className="text-xs font-bold text-slate-200">{item.name}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Current Stock:{' '}
                          <span className="text-blue-400 font-semibold">{item.currentStock} {item.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Min Threshold</span>
                        <span className="text-xs font-bold text-slate-300">{item.minReorderLevel} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('sales-planning')}
            className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors text-center"
          >
            Launch Material Shortfall & MRP Planner →
          </button>
        </Card>

        {/* Right: Production Capacity Snapshot */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Production Capacity Snapshot</h3>
              </div>
              <button
                onClick={() => onNavigate('capacity')}
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                Full Calculator →
              </button>
            </div>

            <div className="space-y-3">
              {data?.capacityPreview?.map((cap) => (
                <div
                  key={cap.sku}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200">{cap.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>In Stock: {cap.currentTotalStock}</span>
                      <span>•</span>
                      <span className="text-amber-400/90 font-medium truncate max-w-[180px]">
                        Limiting: {cap.bottleneck}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-400">
                      +{cap.maxCapacity.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block">Max Producible</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-400">
            Capacity is dynamically derived from live BOM recipes and RM/PM store stock.
          </div>
        </Card>
      </div>

      {/* Recent Movements Feed */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Recent Stock Movement Feed</h3>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            View Central Ledger →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2 font-semibold">Txn Code</th>
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Reason</th>
                <th className="pb-2 font-semibold">Quantity</th>
                <th className="pb-2 font-semibold">Flow</th>
                <th className="pb-2 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.recentMovements?.map((txn) => (
                <tr key={txn._id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 font-mono text-slate-400">{txn.transactionNumber}</td>
                  <td className="py-2.5 text-slate-400">
                    {new Date(txn.transactionDate).toLocaleDateString()}
                  </td>
                  <td className="py-2.5 font-medium text-slate-200">{txn.itemName}</td>
                  <td className="py-2.5">
                    <Badge
                      variant={
                        txn.transactionType === 'IN'
                          ? 'emerald'
                          : txn.transactionType === 'OUT'
                          ? 'rose'
                          : 'teal'
                      }
                      size="sm"
                    >
                      {txn.transactionType}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-slate-300">{txn.reason.replace('_', ' ')}</td>
                  <td className="py-2.5 font-bold text-slate-100">
                    {txn.quantity} {txn.unit}
                  </td>
                  <td className="py-2.5 text-slate-400">
                    {txn.reason === 'Floor_Transfer'
                      ? `${txn.fromLocation} → ${txn.toLocation}`
                      : txn.toLocation || txn.fromLocation || 'Store'}
                  </td>
                  <td className="py-2.5 text-slate-400">{txn.performedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
