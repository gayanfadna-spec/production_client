import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { FinishedGood, ThreeMonthMRPResult, ThreeMonthMRPItem } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  Save,
  CheckCircle2,
  PackageCheck,
  Boxes,
  Leaf,
  Package,
  FlaskConical,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  Calculator,
  Download,
  Filter,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const SalesPlanning: React.FC = () => {
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [divisionFilter, setDivisionFilter] = useState<'All' | 'Fadna Tea' | 'Fadna Life Science'>('All');
  const [search, setSearch] = useState('');

  // 3-Month Config
  const [months, setMonths] = useState<[string, string, string]>([
    'Month 1 (Nov 2026)',
    'Month 2 (Dec 2026)',
    'Month 3 (Jan 2027)',
  ]);

  // Demand inputs per finished good: { [fgId]: { m1, m2, m3 } }
  const [demands, setDemands] = useState<{
    [id: string]: { month1: number; month2: number; month3: number };
  }>({});

  const [mrpResult, setMrpResult] = useState<ThreeMonthMRPResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [expandedRows, setExpandedRows] = useState<{ [id: string]: boolean }>({});
  const [activeReqTab, setActiveReqTab] = useState<'rm' | 'pm'>('rm');
  const [planTitle, setPlanTitle] = useState('Q4 2026 - Q1 2027 3-Month Production & Material Requirements Plan');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial load
  useEffect(() => {
    const fetchGoods = async () => {
      try {
        setLoading(true);
        const res = await api.get('/finished-goods');
        if (res.data.success) {
          const goods: FinishedGood[] = res.data.data;
          setFinishedGoods(goods);

          // Populate realistic 3-month sales demands
          const initialDemands: { [id: string]: { month1: number; month2: number; month3: number } } = {};
          goods.forEach((fg, idx) => {
            if (fg.division === 'Fadna Tea') {
              initialDemands[fg._id] = {
                month1: idx === 0 ? 1500 : idx === 1 ? 1200 : idx === 4 ? 1000 : 600,
                month2: idx === 0 ? 2000 : idx === 1 ? 1600 : idx === 4 ? 1200 : 750,
                month3: idx === 0 ? 1800 : idx === 1 ? 1400 : idx === 4 ? 1100 : 700,
              };
            } else {
              initialDemands[fg._id] = {
                month1: idx === 24 ? 800 : idx === 25 ? 900 : 400,
                month2: idx === 24 ? 1100 : idx === 25 ? 1200 : 500,
                month3: idx === 24 ? 950 : idx === 25 ? 1050 : 450,
              };
            }
          });

          setDemands(initialDemands);
          runMRPCalculation(goods, initialDemands, divisionFilter, months);
        }
      } catch (err: any) {
        console.error('Failed to load finished goods:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoods();
  }, []);

  // Run MRP Calculation via backend API
  const runMRPCalculation = async (
    goods: FinishedGood[],
    demandMap: { [id: string]: { month1: number; month2: number; month3: number } },
    division: string,
    monthsArr: [string, string, string]
  ) => {
    try {
      setCalculating(true);
      const demandPayload = goods.map((fg) => ({
        finishedGoodId: fg._id,
        month1: demandMap[fg._id]?.month1 || 0,
        month2: demandMap[fg._id]?.month2 || 0,
        month3: demandMap[fg._id]?.month3 || 0,
      }));

      const res = await api.post('/planning/three-month-mrp', {
        division,
        months: monthsArr,
        demands: demandPayload,
      });

      if (res.data.success) {
        setMrpResult(res.data.data);
      }
    } catch (err: any) {
      console.error('MRP Calculation error:', err);
      setNotification({ type: 'error', text: err.response?.data?.message || 'Error running 3-month MRP calculation' });
    } finally {
      setCalculating(false);
    }
  };

  // Handle single demand change
  const handleDemandChange = (fgId: string, monthKey: 'month1' | 'month2' | 'month3', value: number) => {
    const updated = {
      ...demands,
      [fgId]: {
        ...(demands[fgId] || { month1: 0, month2: 0, month3: 0 }),
        [monthKey]: Math.max(0, value || 0),
      },
    };
    setDemands(updated);
    runMRPCalculation(finishedGoods, updated, divisionFilter, months);
  };

  // Change division filter
  const handleDivisionChange = (div: 'All' | 'Fadna Tea' | 'Fadna Life Science') => {
    setDivisionFilter(div);
    runMRPCalculation(finishedGoods, demands, div, months);
  };

  // Quick Preset buttons
  const applyPreset = (multiplier: number) => {
    const updated: { [id: string]: { month1: number; month2: number; month3: number } } = {};
    finishedGoods.forEach((fg) => {
      const current = demands[fg._id] || { month1: 500, month2: 500, month3: 500 };
      updated[fg._id] = {
        month1: Math.round(current.month1 * multiplier),
        month2: Math.round(current.month2 * multiplier),
        month3: Math.round(current.month3 * multiplier),
      };
    });
    setDemands(updated);
    runMRPCalculation(finishedGoods, updated, divisionFilter, months);
  };

  // Save Plan
  const handleSavePlan = async () => {
    try {
      const items = mrpResult?.plan.map((p) => ({
        finishedGood: p.finishedGood.id,
        targetQuantity: p.demands.total3Months,
        notes: `3-Month Demand Plan: M1=${p.demands.month1}, M2=${p.demands.month2}, M3=${p.demands.month3}. Net Production Needed=${p.planningOutput.netProductionNeeded}`,
      }));

      const res = await api.post('/planning/sales-targets', {
        title: planTitle,
        period: `${months[0]} to ${months[2]}`,
        items,
        notes: `Consolidated 3-month MRP. RM Shortfall Items: ${mrpResult?.summary.rmShortfallCount}, PM Shortfall Items: ${mrpResult?.summary.pmShortfallCount}.`,
      });

      if (res.data.success) {
        setNotification({ type: 'success', text: '3-Month Sales Demand & MRP Requisition Plan successfully saved!' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', text: err.response?.data?.message || 'Error saving plan' });
    }
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const summary = mrpResult?.summary;

  // Filter items by search
  const filteredPlanItems = (mrpResult?.plan || []).filter((item) => {
    if (search) {
      const s = search.toLowerCase();
      return (
        item.finishedGood.name.toLowerCase().includes(s) ||
        item.finishedGood.sku.toLowerCase().includes(s) ||
        (item.finishedGood.shortCode && item.finishedGood.shortCode.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-indigo-900/40 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              MRP &amp; Demand Forecasting Engine
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-medium">Dual Category: Fadna Tea &amp; Fadna Life Science</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-indigo-400" />
            3-Month Production &amp; Material Requirements Plan (MRP)
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Input monthly sales targets for the next 3 months. Calculates current Finished Goods, <strong className="text-emerald-300">predictable Product quantity from Blend Stock</strong>, <strong className="text-cyan-300">predictable BOM quantity</strong>, and exact <strong className="text-amber-300">Raw &amp; Packing Materials to order</strong>.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={handleSavePlan}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-950/50 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save 3-Month Plan</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3-Month Config & Period Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4" />
            Planning Horizon:
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={months[0]}
              onChange={(e) => {
                const updated: [string, string, string] = [e.target.value, months[1], months[2]];
                setMonths(updated);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white font-medium focus:border-indigo-500 w-36 text-center"
            />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={months[1]}
              onChange={(e) => {
                const updated: [string, string, string] = [months[0], e.target.value, months[2]];
                setMonths(updated);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white font-medium focus:border-indigo-500 w-36 text-center"
            />
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={months[2]}
              onChange={(e) => {
                const updated: [string, string, string] = [months[0], months[1], e.target.value];
                setMonths(updated);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs text-white font-medium focus:border-indigo-500 w-36 text-center"
            />
          </div>
        </div>

        {/* Preset Quotas */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Quota Presets:</span>
          <button
            onClick={() => applyPreset(1.2)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold transition-all"
          >
            +20% Surge
          </button>
          <button
            onClick={() => applyPreset(0.8)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-all"
          >
            -20% Lean
          </button>
          <button
            onClick={() => runMRPCalculation(finishedGoods, demands, divisionFilter, months)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Recalculate MRP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Total Demand */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total 3-Month Demand</span>
            <div className="text-2xl font-black text-white mt-1">{summary.total3MonthDemand.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 mt-1">Packs (Sum of M1+M2+M3)</span>
          </div>

          {/* Card 2: Current FG Stock */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Current FG in Stock</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{summary.totalCurrentFGStock.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 mt-1">Floor + Finished Store</span>
          </div>

          {/* Card 3: Blend Stock Product Count */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              Blend Stock Yield
            </span>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              ~{summary.totalPredictableBlendCount.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-1">Predictable Product from Blend</span>
          </div>

          {/* Card 4: BOM Stage WIP */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Package className="w-3 h-3" />
              BOM Stage WIP
            </span>
            <div className="text-2xl font-black text-cyan-300 mt-1">
              {summary.totalCurrentBOMWIP.toLocaleString()}
            </div>
            <span className="text-[10px] text-cyan-400/80 mt-1">Packaged Units in BOM Stage</span>
          </div>

          {/* Card 5: Net Production Needed */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-700/50 flex flex-col justify-between shadow-lg shadow-indigo-950/30">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Net Production Needed
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {summary.totalNetProductionNeeded.toLocaleString()}
            </div>
            <span className="text-[10px] text-indigo-300/80 mt-1">Demand - Total Pipeline</span>
          </div>

          {/* Card 6: Total Requisition Cost */}
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-900/40 flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Procurement Requisition</span>
            <div className="text-xl font-black text-rose-300 mt-1">
              LKR {(summary.estimatedTotalRequisitionCost / 1000).toFixed(0)}k
            </div>
            <span className="text-[10px] text-rose-400/80 mt-1">
              {summary.rmShortfallCount} RM &amp; {summary.pmShortfallCount} PM items to order
            </span>
          </div>
        </div>
      )}

      {/* Main Filter & Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        {/* Category Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => handleDivisionChange('All')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all ${
              divisionFilter === 'All' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => handleDivisionChange('Fadna Tea')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              divisionFilter === 'Fadna Tea' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🍃 Fadna Tea
          </button>
          <button
            onClick={() => handleDivisionChange('Fadna Life Science')}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              divisionFilter === 'Fadna Life Science' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔬 Fadna Life Science
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 sm:w-64 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by SKU, Name, ShortCode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* 3-Month Demand & Production Grid */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Product Lines 3-Month Demand vs Current Stock Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit demands directly in the table. Calculates net production needed and material orders in real time.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredPlanItems.length} lines
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">Product Line</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-2 text-center bg-indigo-950/30 text-indigo-300">{months[0]}</th>
                <th className="py-3 px-2 text-center bg-indigo-950/30 text-indigo-300">{months[1]}</th>
                <th className="py-3 px-2 text-center bg-indigo-950/30 text-indigo-300">{months[2]}</th>
                <th className="py-3 px-3 text-right font-black text-indigo-200">Total 3M Demand</th>
                <th className="py-3 px-3 text-right">Current FG Stock</th>
                <th className="py-3 px-3 text-right text-cyan-300">BOM WIP</th>
                <th className="py-3 px-3 text-right text-emerald-300">Blend Product Yield</th>
                <th className="py-3 px-3 text-right font-bold text-slate-200">Total Pipeline Stock</th>
                <th className="py-3 px-3 text-right font-black bg-indigo-950/40 text-white">
                  Net Product Needed
                </th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPlanItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredPlanItems.map((item) => {
                  const fgId = item.finishedGood.id;
                  const isExpanded = !!expandedRows[fgId];
                  const d = item.demands;
                  const pipe = item.currentStockPipeline;
                  const out = item.planningOutput;

                  return (
                    <React.Fragment key={fgId}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => toggleRowExpand(fgId)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{item.finishedGood.name}</span>
                            {item.finishedGood.shortCode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                {item.finishedGood.shortCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.finishedGood.sku}</div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.finishedGood.division === 'Fadna Tea'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}
                          >
                            {item.finishedGood.division || 'Fadna Tea'}
                          </span>
                        </td>

                        {/* Month 1 Input */}
                        <td className="py-2.5 px-2 text-center bg-indigo-950/20">
                          <input
                            type="number"
                            min="0"
                            value={d.month1}
                            onChange={(e) => handleDemandChange(fgId, 'month1', parseInt(e.target.value) || 0)}
                            className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 text-xs"
                          />
                        </td>

                        {/* Month 2 Input */}
                        <td className="py-2.5 px-2 text-center bg-indigo-950/20">
                          <input
                            type="number"
                            min="0"
                            value={d.month2}
                            onChange={(e) => handleDemandChange(fgId, 'month2', parseInt(e.target.value) || 0)}
                            className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 text-xs"
                          />
                        </td>

                        {/* Month 3 Input */}
                        <td className="py-2.5 px-2 text-center bg-indigo-950/20">
                          <input
                            type="number"
                            min="0"
                            value={d.month3}
                            onChange={(e) => handleDemandChange(fgId, 'month3', parseInt(e.target.value) || 0)}
                            className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 text-xs"
                          />
                        </td>

                        {/* Total 3M Demand */}
                        <td className="py-2.5 px-3 text-right font-black text-indigo-300 text-sm">
                          {d.total3Months.toLocaleString()}
                        </td>

                        {/* Current FG Stock */}
                        <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                          {pipe.finishedGoodsStock.toLocaleString()}
                        </td>

                        {/* BOM WIP */}
                        <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                          {pipe.bomWIPCount.toLocaleString()}
                        </td>

                        {/* Blend Product Yield */}
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-300">
                          ~{pipe.blendProductCount.toLocaleString()}
                        </td>

                        {/* Total Pipeline Stock */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                          {pipe.totalAvailableAndWIP.toLocaleString()}
                        </td>

                        {/* Net Product Needed */}
                        <td className="py-2.5 px-3 text-right bg-indigo-950/30">
                          {out.netProductionNeeded > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-900/60 border border-indigo-700 text-white font-black text-sm">
                              {out.netProductionNeeded.toLocaleString()} Packs
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Covered
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              out.isCovered
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {out.isCovered ? '100% Covered' : `${out.coveragePercent}% Coverage`}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Recipe & Materials Breakdown Row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/80 border-b border-slate-800">
                          <td colSpan={13} className="p-4 pl-12">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                                <span className="flex items-center gap-1.5 text-indigo-400">
                                  <Sparkles className="w-4 h-4" />
                                  Formula Requirements for Net Production ({out.netProductionNeeded.toLocaleString()} Packs)
                                </span>
                                <span className="text-slate-400 font-normal">
                                  Predictable BOM Units Required to Pack: <strong className="text-cyan-300 font-bold">{out.predictableBOMNeeded.toLocaleString()}</strong>
                                </span>
                              </div>

                              {item.materialsRequired && item.materialsRequired.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  {/* Raw Materials needed */}
                                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                    <div className="text-[11px] font-bold text-emerald-400 uppercase mb-2 flex items-center gap-1">
                                      <Leaf className="w-3 h-3" />
                                      Raw Herbs Needed for Net Blend:
                                    </div>
                                    <div className="space-y-1.5">
                                      {item.materialsRequired
                                        .filter((m) => m.type === 'RawMaterial')
                                        .map((m) => (
                                          <div key={m.id} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-slate-200 font-medium">{m.name}</span>
                                              {m.percentage !== undefined && m.percentage > 0 && (
                                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                  {m.percentage}%
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-right">
                                              <span className="text-slate-300 font-semibold">{m.neededQty} {m.unit}</span>
                                              <span className="text-slate-500 text-[10px] ml-2">(In Stock: {m.currentStock})</span>
                                              {m.shortfallToOrder > 0 && (
                                                <span className="ml-2 font-bold text-rose-400">
                                                  Order: {m.shortfallToOrder} {m.unit}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>

                                  {/* Packing Materials needed */}
                                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                    <div className="text-[11px] font-bold text-cyan-400 uppercase mb-2 flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      Packing Materials Needed for BOM Packaging:
                                    </div>
                                    <div className="space-y-1.5">
                                      {item.materialsRequired
                                        .filter((m) => m.type === 'PackingMaterial')
                                        .map((m) => (
                                          <div key={m.id} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                                            <span className="text-slate-200">{m.name}</span>
                                            <div className="text-right">
                                              <span className="text-slate-300 font-semibold">{m.neededQty} {m.unit}</span>
                                              <span className="text-slate-500 text-[10px] ml-2">(In Stock: {m.currentStock})</span>
                                              {m.shortfallToOrder > 0 && (
                                                <span className="ml-2 font-bold text-rose-400">
                                                  Order: {m.shortfallToOrder} {m.unit}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 rounded-xl bg-slate-900 text-slate-500 text-xs">
                                  No additional material requisitions needed — either stock fully covers demand or BOM is not yet configured.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* CONSOLIDATED MATERIAL REQUISITIONS / ORDERS SECTION       */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-rose-400" />
              Consolidated 3-Month Purchase Order Requisitions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregated material quantities required across all products minus active warehouse inventory.
            </p>
          </div>

          {/* Requisition Tab Buttons */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveReqTab('rm')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeReqTab === 'rm'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Raw Materials to Order ({mrpResult?.procurementPlan.rawMaterials.filter((r) => r.shortfallToOrder > 0).length || 0})</span>
            </button>
            <button
              onClick={() => setActiveReqTab('pm')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeReqTab === 'pm'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Packaging Materials to Order ({mrpResult?.procurementPlan.packingMaterials.filter((p) => p.shortfallToOrder > 0).length || 0})</span>
            </button>
          </div>
        </div>

        {/* Requisition Tables */}
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
          {activeReqTab === 'rm' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Raw Material SKU / Name</th>
                    <th className="py-3 px-4 text-right">Total 3M Needed</th>
                    <th className="py-3 px-4 text-right">Current Warehouse Stock</th>
                    <th className="py-3 px-4 text-right font-black text-rose-400">Shortfall to Order</th>
                    <th className="py-3 px-4 text-right">Est. Unit Cost</th>
                    <th className="py-3 px-4 text-right font-bold text-white">Est. Total Cost</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!mrpResult?.procurementPlan.rawMaterials || mrpResult.procurementPlan.rawMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No raw material purchase requisitions required.
                      </td>
                    </tr>
                  ) : (
                    mrpResult.procurementPlan.rawMaterials.map((rm) => (
                      <tr key={rm.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{rm.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{rm.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-200">
                          {rm.totalNeeded} {rm.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {rm.currentStock} {rm.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sm">
                          {rm.shortfallToOrder > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300">
                              {rm.shortfallToOrder} {rm.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">0 (Covered)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          LKR {rm.costPerUnit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          LKR {rm.estimatedTotalCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rm.shortfallToOrder > 0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {rm.shortfallToOrder > 0 ? 'Order Required' : 'Sufficient Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReqTab === 'pm' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Packaging Material SKU / Name</th>
                    <th className="py-3 px-4 text-right">Total 3M Needed</th>
                    <th className="py-3 px-4 text-right">Current Warehouse Stock</th>
                    <th className="py-3 px-4 text-right font-black text-rose-400">Shortfall to Order</th>
                    <th className="py-3 px-4 text-right">Est. Unit Cost</th>
                    <th className="py-3 px-4 text-right font-bold text-white">Est. Total Cost</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {!mrpResult?.procurementPlan.packingMaterials || mrpResult.procurementPlan.packingMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No packaging material purchase requisitions required.
                      </td>
                    </tr>
                  ) : (
                    mrpResult.procurementPlan.packingMaterials.map((pm) => (
                      <tr key={pm.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{pm.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{pm.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-200">
                          {pm.totalNeeded.toLocaleString()} {pm.unit}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">
                          {pm.currentStock.toLocaleString()} {pm.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-sm">
                          {pm.shortfallToOrder > 0 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300">
                              {pm.shortfallToOrder.toLocaleString()} {pm.unit}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold">0 (Covered)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          LKR {pm.costPerUnit.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          LKR {pm.estimatedTotalCost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pm.shortfallToOrder > 0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {pm.shortfallToOrder > 0 ? 'Order Required' : 'Sufficient Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SalesPlanning;
