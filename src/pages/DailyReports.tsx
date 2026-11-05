import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { FileSpreadsheet, FileText, Download, Filter, RefreshCw, Calendar, Layers } from 'lucide-react';

import { DailyMatrixSheet } from '../components/reports/DailyMatrixSheet';

export const DailyReports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'matrix' | 'in-out' | 'stock'>('matrix');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemType, setItemType] = useState('all');

  // Preview data
  const [inOutData, setInOutData] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    if (activeReport === 'matrix') return;
    try {
      setLoading(true);
      if (activeReport === 'in-out') {
        const res = await api.get('/reports/daily-in-out', {
          params: {
            startDate,
            endDate,
            itemType: itemType !== 'all' ? itemType : undefined,
            format: 'json',
          },
        });
        if (res.data.success) setInOutData(res.data.data);
      } else {
        const res = await api.get('/reports/daily-stock', { params: { format: 'json' } });
        if (res.data.success) setStockData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load report preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [activeReport, startDate, endDate, itemType]);

  const handleDownload = (format: 'excel' | 'pdf') => {
    const token = localStorage.getItem('fadna_token');
    const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
    const baseUrl = `${apiBase}/reports`;
    const params = new URLSearchParams();

    params.append('format', format);
    if (activeReport === 'in-out') {
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (itemType !== 'all') params.append('itemType', itemType);
      window.open(`${baseUrl}/daily-in-out?${params.toString()}&token=${token}`, '_blank');
    } else {
      window.open(`${baseUrl}/daily-stock?${params.toString()}&token=${token}`, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Factory Daily Reports & Audit Exports
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tabulated operational ledger sheets, physical count audit variance, and GMP records.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveReport('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'matrix'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Daily Matrix Sheet
          </button>
          <button
            onClick={() => setActiveReport('in-out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'in-out'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Audit Ledger Log
          </button>
          <button
            onClick={() => setActiveReport('stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeReport === 'stock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stock Valuation & Status
          </button>
        </div>
      </div>

      {activeReport === 'matrix' ? (
        <DailyMatrixSheet />
      ) : (
        <>

      {/* Control & Export Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {activeReport === 'in-out' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch {}
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch {}
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Items</option>
                    <option value="FinishedGood">Finished Goods</option>
                    <option value="RawMaterial">Raw Materials</option>
                    <option value="PackingMaterial">Packing Materials</option>
                  </select>
                </div>
              </>
            )}

            {activeReport === 'stock' && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Snapshot as of Today ({new Date().toLocaleDateString()})
              </span>
            )}
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('excel')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export to Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => handleDownload('pdf')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-700/20 hover:bg-rose-700/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Export to PDF (.pdf)</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Preview Section */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {activeReport === 'in-out'
              ? `Live Preview: Daily Movements (${inOutData.length} records)`
              : `Live Preview: Daily Stock Status & Locations`}
          </h3>
          {loading && <span className="text-xs text-emerald-400 animate-pulse">Loading preview...</span>}
        </div>

        {activeReport === 'in-out' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-2.5 px-4 font-bold">Txn Code</th>
                  <th className="py-2.5 px-4 font-bold">Date</th>
                  <th className="py-2.5 px-4 font-bold">Category</th>
                  <th className="py-2.5 px-4 font-bold">Item Description</th>
                  <th className="py-2.5 px-4 font-bold">Type</th>
                  <th className="py-2.5 px-4 font-bold">Reason</th>
                  <th className="py-2.5 px-4 font-bold">Quantity</th>
                  <th className="py-2.5 px-4 font-bold">Flow / Location</th>
                  <th className="py-2.5 px-4 font-bold">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inOutData.map((txn) => (
                  <tr key={txn._id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-300">
                      {txn.transactionNumber}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {new Date(txn.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{txn.itemType}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-100">{txn.itemName}</td>
                    <td className="py-2.5 px-4">
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
                    <td className="py-2.5 px-4 text-slate-300">
                      {txn.reason.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-100">
                      {txn.quantity} {txn.unit}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {txn.toLocation || txn.fromLocation || 'Store'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">{txn.performedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Finished Goods Subsection */}
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                Finished Goods (Floor vs. Finished Store Breakdown)
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-bold">SKU</th>
                      <th className="py-2 px-3 font-bold">Product Name</th>
                      <th className="py-2 px-3 font-bold text-center text-teal-300">Floor Stock</th>
                      <th className="py-2 px-3 font-bold text-center text-blue-300">Store Stock</th>
                      <th className="py-2 px-3 font-bold text-center">Total Stock</th>
                      <th className="py-2 px-3 font-bold text-right">Unit Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stockData?.finishedGoods?.map((fg: any) => (
                      <tr key={fg._id}>
                        <td className="py-2 px-3 font-mono font-bold text-emerald-400">{fg.sku}</td>
                        <td className="py-2 px-3 font-semibold text-slate-200">{fg.name}</td>
                        <td className="py-2 px-3 text-center text-teal-400 font-bold">
                          {fg.productionFloorStock} {fg.unit}
                        </td>
                        <td className="py-2 px-3 text-center text-blue-400 font-bold">
                          {fg.finishedStoreStock} {fg.unit}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-100 font-black">
                          {fg.productionFloorStock + fg.finishedStoreStock} {fg.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          LKR {fg.costPerUnit || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Raw Materials Subsection */}
            <div>
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">
                Raw Materials Inventory
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-bold">SKU</th>
                      <th className="py-2 px-3 font-bold">Herb / Material Name</th>
                      <th className="py-2 px-3 font-bold text-center">Current Stock</th>
                      <th className="py-2 px-3 font-bold">Reorder Level</th>
                      <th className="py-2 px-3 font-bold text-right">Cost Per Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stockData?.rawMaterials?.map((rm: any) => (
                      <tr key={rm._id}>
                        <td className="py-2 px-3 font-mono font-bold text-teal-400">{rm.sku}</td>
                        <td className="py-2 px-3 font-semibold text-slate-200">{rm.name}</td>
                        <td className="py-2 px-3 text-center text-teal-300 font-bold">
                          {rm.currentStock} {rm.unit}
                        </td>
                        <td className="py-2 px-3 text-slate-400">{rm.minReorderLevel} {rm.unit}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          LKR {rm.costPerUnit || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
      </>
      )}
    </div>
  );
};

