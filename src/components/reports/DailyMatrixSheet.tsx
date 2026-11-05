import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Save,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileDown,
  FileText,
  ChevronDown,
} from 'lucide-react';

// Helper to get today's date in local 'YYYY-MM-DD'
export const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get yesterday's date in local 'YYYY-MM-DD'
export const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Friendly formatter for date labels
export const formatDateLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const todayStr = getTodayString();
  const yesterdayStr = getYesterdayString();
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
  return dateStr;
};

interface GridRow {
  id: string;
  remark: string;
  items: { [shortCode: string]: number };
}

export const DailyMatrixSheet: React.FC = () => {
  const [division, setDivision] = useState<'Fadna Tea' | 'Fadna Life Science'>('Fadna Tea');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<'all' | 'in-out' | 'stock'>('all');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Editable Grid Rows
  const [outRows, setOutRows] = useState<GridRow[]>([]);
  const [inRows, setInRows] = useState<GridRow[]>([]);

  // Reconciliation editable state
  const [actualCounts, setActualCounts] = useState<{ [code: string]: number | string }>({});
  const [storeStocks, setStoreStocks] = useState<{ [code: string]: number | string }>({});
  const [packagingWIP, setPackagingWIP] = useState<any>({
    boxStock: 0,
    pasted: 0,
    pasting: 0,
    box: 0,
    pouch: 0,
    pouchStock: 0,
  });

  const [savingGrid, setSavingGrid] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [savingRecon, setSavingRecon] = useState(false);
  const [reconSuccessMsg, setReconSuccessMsg] = useState('');

  // Fetch dates that have recorded transactions
  const fetchAvailableDates = async () => {
    try {
      const res = await api.get('/reports/daily-matrix-dates', {
        params: { division },
      });
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setAvailableDates(res.data.data);
        return;
      }
    } catch {
      // Fallback below
    }

    try {
      const resInOut = await api.get('/reports/daily-in-out', {
        params: { format: 'json' },
      });
      if (resInOut.data?.success && Array.isArray(resInOut.data.data)) {
        const set = new Set<string>();
        resInOut.data.data.forEach((t: any) => {
          if (t.transactionDate) {
            set.add(String(t.transactionDate).slice(0, 10));
          }
        });
        setAvailableDates(Array.from(set).sort().reverse());
      }
    } catch (e) {
      console.error('Failed to load available dates:', e);
    }
  };

  useEffect(() => {
    fetchAvailableDates();
  }, [division]);

  // Navigate dates with +/- 1 day stepper
  const shiftDate = (days: number) => {
    const parts = selectedDate.split('-').map(Number);
    if (parts.length === 3) {
      const [y, m, d] = parts;
      const target = new Date(y, m - 1, d + days);
      const year = target.getFullYear();
      const month = String(target.getMonth() + 1).padStart(2, '0');
      const day = String(target.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
    }
  };

  // Open native date picker programmatically
  const handleOpenPicker = () => {
    if (dateInputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          dateInputRef.current.showPicker();
        } catch {
          dateInputRef.current.focus();
        }
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  // Fetch Matrix Data
  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/daily-matrix', {
        params: {
          date: selectedDate,
          division,
          format: 'json',
        },
      });

      if (res.data.success) {
        const data = res.data.data;
        setProducts(data.products || []);

        // Populate OUT Rows
        const formattedOutRows: GridRow[] = (data.outRows || []).map((r: any, idx: number) => ({
          id: `out-${idx}-${Date.now()}`,
          remark: r.channel || '',
          items: r.items || {},
        }));

        // If less than 8 rows, pad with blank rows for fast factory typing
        while (formattedOutRows.length < 8) {
          formattedOutRows.push({
            id: `out-blank-${formattedOutRows.length}-${Date.now()}`,
            remark: '',
            items: {},
          });
        }
        setOutRows(formattedOutRows);

        // Populate IN Rows
        const formattedInRows: GridRow[] = (data.inRows || []).map((r: any, idx: number) => ({
          id: `in-${idx}-${Date.now()}`,
          remark: r.channel || '',
          items: r.items || {},
        }));
        while (formattedInRows.length < 4) {
          formattedInRows.push({
            id: `in-blank-${formattedInRows.length}-${Date.now()}`,
            remark: '',
            items: {},
          });
        }
        setInRows(formattedInRows);

        // Reconciliation
        const initialActuals: { [code: string]: number | string } = {};
        const initialStoreStocks: { [code: string]: number | string } = {};
        (data.products || []).forEach((p: any) => {
          initialActuals[p.shortCode] =
            p.physicalActualStock !== undefined && p.physicalActualStock !== null
              ? p.physicalActualStock
              : '';
          initialStoreStocks[p.shortCode] =
            p.finishedStoreStock !== undefined && p.finishedStoreStock !== null
              ? p.finishedStoreStock
              : '';
        });
        setActualCounts(initialActuals);
        setStoreStocks(initialStoreStocks);

        if (data.packagingWIP) {
          setPackagingWIP(data.packagingWIP);
        }
      }
    } catch (err) {
      console.error('Failed to load matrix sheet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [division, selectedDate]);

  // Handle cell edit in OUT rows
  const handleOutCellChange = (rowIdx: number, code: string, valStr: string) => {
    const val = valStr === '' ? 0 : Number(valStr);
    const updated = [...outRows];
    updated[rowIdx] = {
      ...updated[rowIdx],
      items: {
        ...updated[rowIdx].items,
        [code]: isNaN(val) ? 0 : val,
      },
    };
    setOutRows(updated);
  };

  const handleOutRemarkChange = (rowIdx: number, remark: string) => {
    const updated = [...outRows];
    updated[rowIdx] = { ...updated[rowIdx], remark };
    setOutRows(updated);
  };

  const addOutRow = () => {
    setOutRows([
      ...outRows,
      { id: `out-new-${Date.now()}`, remark: '', items: {} },
    ]);
  };

  const removeOutRow = (rowIdx: number) => {
    if (outRows.length <= 1) {
      setOutRows([{ id: `out-blank-${Date.now()}`, remark: '', items: {} }]);
      return;
    }
    setOutRows(outRows.filter((_, idx) => idx !== rowIdx));
  };

  // Handle cell edit in IN rows
  const handleInCellChange = (rowIdx: number, code: string, valStr: string) => {
    const val = valStr === '' ? 0 : Number(valStr);
    const updated = [...inRows];
    updated[rowIdx] = {
      ...updated[rowIdx],
      items: {
        ...updated[rowIdx].items,
        [code]: isNaN(val) ? 0 : val,
      },
    };
    setInRows(updated);
  };

  const handleInRemarkChange = (rowIdx: number, remark: string) => {
    const updated = [...inRows];
    updated[rowIdx] = { ...updated[rowIdx], remark };
    setInRows(updated);
  };

  const addInRow = () => {
    setInRows([
      ...inRows,
      { id: `in-new-${Date.now()}`, remark: '', items: {} },
    ]);
  };

  const removeInRow = (rowIdx: number) => {
    if (inRows.length <= 1) {
      setInRows([{ id: `in-blank-${Date.now()}`, remark: '', items: {} }]);
      return;
    }
    setInRows(inRows.filter((_, idx) => idx !== rowIdx));
  };

  // Compute live column totals for OUT
  const outTotals: { [code: string]: number } = {};
  products.forEach((p) => {
    outTotals[p.shortCode] = 0;
  });
  outRows.forEach((r) => {
    Object.entries(r.items).forEach(([code, val]) => {
      if (val) {
        outTotals[code] = (outTotals[code] || 0) + Number(val);
      }
    });
  });

  const grandOutTotal = Object.values(outTotals).reduce((a, b) => a + b, 0);

  // Compute live column totals for IN
  const inTotals: { [code: string]: number } = {};
  products.forEach((p) => {
    inTotals[p.shortCode] = 0;
  });
  inRows.forEach((r) => {
    Object.entries(r.items).forEach(([code, val]) => {
      if (val) {
        inTotals[code] = (inTotals[code] || 0) + Number(val);
      }
    });
  });

  const grandInTotal = Object.values(inTotals).reduce((a, b) => a + b, 0);

  // Save the entire grid directly to update stocks atomically
  const handleSaveGrid = async () => {
    try {
      setSavingGrid(true);
      setSaveSuccessMsg('');

      const cleanOutRows = outRows
        .filter((r) => r.remark.trim() !== '' || Object.values(r.items).some((v) => v > 0))
        .map((r) => ({
          channel: r.remark.trim() || 'GENERAL DISPATCH',
          items: r.items,
        }));

      const cleanInRows = inRows
        .filter((r) => r.remark.trim() !== '' || Object.values(r.items).some((v) => v > 0))
        .map((r) => ({
          channel: r.remark.trim() || 'PRODUCTION RECEIPT',
          items: r.items,
        }));

      const res = await api.post('/reports/save-daily-matrix-grid', {
        date: selectedDate,
        division,
        outRows: cleanOutRows,
        inRows: cleanInRows,
        storeStocks,
        actualCounts,
        packagingWIP,
      });

      if (res.data.success) {
        setSaveSuccessMsg(res.data.message || 'Matrix ledger & stocks saved successfully!');
        setReconSuccessMsg('Saved successfully!');
        setAvailableDates((prev) => Array.from(new Set([selectedDate, ...prev])).sort().reverse());
        fetchMatrix();
        setTimeout(() => {
          setSaveSuccessMsg('');
          setReconSuccessMsg('');
        }, 4500);
      }
    } catch (err: any) {
      alert('Failed to update stock: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingGrid(false);
    }
  };

  // Save physical reconciliation & packaging WIP
  const handleSaveReconciliation = async () => {
    try {
      setSavingRecon(true);
      await handleSaveGrid();
    } finally {
      setSavingRecon(false);
    }
  };

  const handleDownloadExcel = (sheetType: 'all' | 'in-out' | 'stock' = 'all') => {
    const token = localStorage.getItem('fadna_token');
    const baseUrl = '/api/reports/daily-matrix';
    const params = new URLSearchParams({
      date: selectedDate,
      division,
      format: 'excel',
      sheetType,
      token: token || '',
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
    setExportDropdownOpen(false);
  };

  const handleDownloadPDF = (sheetType: 'all' | 'in-out' | 'stock' = 'all') => {
    const token = localStorage.getItem('fadna_token');
    const baseUrl = '/api/reports/daily-matrix';
    const params = new URLSearchParams({
      date: selectedDate,
      division,
      format: 'pdf',
      sheetType,
      token: token || '',
    });
    window.open(`${baseUrl}?${params.toString()}`, '_blank');
    setExportDropdownOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="no-print flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Division Selector */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setDivision('Fadna Tea')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider transition-all ${
                division === 'Fadna Tea'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🌿 FADNA TEA
            </button>
            <button
              onClick={() => setDivision('Fadna Life Science')}
              className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider transition-all ${
                division === 'Fadna Life Science'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔬 FADNA LIFE SCIENCE
            </button>
          </div>

          {/* Interactive Date Picker & Day Steppers */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {/* Previous Day */}
            <button
              onClick={() => shiftDate(-1)}
              title="Previous Day"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Date Input with clickable container */}
            <div
              onClick={handleOpenPicker}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-emerald-500/80 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors group"
              title="Click anywhere to open calendar picker"
            >
              <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform pointer-events-none" />
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onClick={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
                className="bg-transparent text-xs text-emerald-300 font-extrabold focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Next Day */}
            <button
              onClick={() => shiftDate(1)}
              title="Next Day"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Date Presets & Recorded Dates */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Today Button */}
            <button
              onClick={() => setSelectedDate(getTodayString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                selectedDate === getTodayString()
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              Today
            </button>

            {/* Yesterday Button */}
            <button
              onClick={() => setSelectedDate(getYesterdayString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                selectedDate === getYesterdayString()
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              Yesterday
            </button>

            {/* Recorded Dates (e.g. 7-Oct, 5-Oct) */}
            {availableDates
              .filter((d) => d !== getTodayString() && d !== getYesterdayString())
              .slice(0, 3)
              .map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedDate === d
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'border-slate-800 text-slate-400 hover:text-white bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  {formatDateLabel(d)}
                </button>
              ))}

            {/* If more recorded dates exist, a clean dropdown */}
            {availableDates.length > 5 && (
              <select
                value={availableDates.includes(selectedDate) ? selectedDate : ''}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                title="Select from recorded dates"
              >
                <option value="" disabled>
                  More Dates...
                </option>
                {availableDates.map((d) => (
                  <option key={d} value={d}>
                    {d} ({formatDateLabel(d)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Sheet View Switcher (IN/OUT vs Stock vs Both) */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSheet('in-out')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSheet === 'in-out'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>IN / OUT Sheet</span>
            </button>
            <button
              onClick={() => setActiveSheet('stock')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSheet === 'stock'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Stock Sheet</span>
            </button>
            <button
              onClick={() => setActiveSheet('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSheet === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Both (A4)</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {saveSuccessMsg && (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/80 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
              {saveSuccessMsg}
            </span>
          )}

          <button
            onClick={handleSaveGrid}
            disabled={savingGrid || savingRecon}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-950/60 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingGrid || savingRecon ? 'Saving Matrix...' : 'Save Matrix Ledger'}</span>
          </button>

          {/* Export Dropdown (Separate Sheets fixed to A4 Landscape) */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
              title="Download separate sheets or both, formatted to A4 Landscape"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export A4 Landscape</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 divide-y divide-slate-800 text-xs">
                <div className="p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">Excel (Fit to 1 A4 Landscape Sheet)</p>
                  <button
                    onClick={() => handleDownloadExcel('all')}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>📊 Both Sheets (Excel A4)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">All</span>
                  </button>
                  <button
                    onClick={() => handleDownloadExcel('in-out')}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>📋 IN / OUT Sheet (Excel A4)</span>
                    <span className="text-[10px] text-rose-400 font-bold">IN/OUT</span>
                  </button>
                  <button
                    onClick={() => handleDownloadExcel('stock')}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>📦 Stock & Audit Sheet (Excel A4)</span>
                    <span className="text-[10px] text-indigo-400 font-bold">Stock</span>
                  </button>
                </div>
                <div className="p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">PDF & Print (A4 Landscape)</p>
                  <button
                    onClick={() => handleDownloadPDF('all')}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>📄 Download Full PDF (A4)</span>
                    <span className="text-[10px] text-teal-400 font-bold">PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPDF('in-out')}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>📄 Download IN/OUT PDF (A4)</span>
                    <span className="text-[10px] text-rose-400 font-bold">PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPDF('stock')}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>📄 Download Stock PDF (A4)</span>
                    <span className="text-[10px] text-indigo-400 font-bold">PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Direct Print A4 Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all"
            title="Print active sheet on A4 Landscape"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Print A4</span>
          </button>

          <button
            onClick={fetchMatrix}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && products.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-400 font-medium">Loading {division} operational sheet...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* SHEET 1: IN / OUT OPERATIONAL SHEET (Fitted to A4 Landscape) */}
          {/* ============================================================ */}
          {(activeSheet === 'all' || activeSheet === 'in-out') && (
            <div className="print-page bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              {/* Sheet Header Banner */}
              <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-slate-950">
                <div className="col-span-8 sm:col-span-9 p-3 text-center border-r-2 border-slate-800 flex items-center justify-center">
                  <h1 className="text-xl font-black uppercase tracking-widest text-white">
                    {division} - DAILY IN / OUT OPERATION SHEET
                  </h1>
                </div>
                <div className="col-span-4 sm:col-span-3 p-3 text-center flex flex-col items-center justify-center bg-slate-900/60">
                  <span className="font-mono font-black text-sm text-emerald-400 tracking-wider">
                    {selectedDate}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    {formatDateLabel(selectedDate)}
                  </span>
                </div>
              </div>

              {/* Sub-header: OUT */}
              <div className="w-full py-1.5 bg-rose-950/40 border-b border-slate-800 text-center font-bold text-xs uppercase tracking-widest text-rose-300">
                OUT - DAILY DISPATCH & SALES ORDERS
              </div>

              {/* OUT Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b-2 border-slate-800 text-slate-200">
                      {products.map((p) => (
                        <th
                          key={p.shortCode}
                          className="py-2.5 px-1.5 text-center font-black border-r border-slate-800 min-w-[54px] max-w-[68px] whitespace-nowrap"
                          title={p.name}
                        >
                          <span className="text-[11px] font-black text-slate-200">
                            {p.shortCode}
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 px-4 text-left font-black tracking-wider uppercase border-l-2 border-slate-800 min-w-[220px] bg-slate-950 sticky right-0 z-10">
                        REMARK / CHANNEL
                      </th>
                      <th className="w-12 px-2 text-center font-black uppercase text-[10px] text-slate-400 border-l border-slate-800 no-print">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {outRows.map((row, rIdx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          rIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'
                        }`}
                      >
                        {products.map((p) => {
                          const val = row.items[p.shortCode];
                          return (
                            <td
                              key={p.shortCode}
                              className="p-0 border-r border-slate-800/60 text-center"
                            >
                              <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={val !== undefined && val !== 0 ? val : ''}
                                onChange={(e) => handleOutCellChange(rIdx, p.shortCode, e.target.value)}
                                className={`w-full py-1.5 text-center bg-transparent focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-xs ${
                                  val && val > 0 ? 'text-white font-extrabold bg-rose-500/10' : 'text-slate-500'
                                }`}
                              />
                            </td>
                          );
                        })}
                        {/* REMARK Column on the right */}
                        <td className="p-1 border-l-2 border-slate-800 bg-slate-900/90 sticky right-0 z-10">
                          <input
                            type="text"
                            placeholder="e.g. CARGILS ORDERS..."
                            value={row.remark}
                            onChange={(e) => handleOutRemarkChange(rIdx, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-sans font-bold text-slate-200 focus:outline-none"
                          />
                        </td>
                        <td className="p-1 text-center no-print border-l border-slate-800">
                          <button
                            type="button"
                            onClick={() => removeOutRow(rIdx)}
                            className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-200 hover:bg-rose-950/60 transition-colors"
                            title="Delete this row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* OUT Column Totals Row */}
                    <tr className="bg-slate-950 border-t-2 border-b-2 border-slate-700 font-black">
                      {products.map((p) => {
                        const total = outTotals[p.shortCode] || 0;
                        return (
                          <td
                            key={p.shortCode}
                            className={`py-2 px-1 text-center border-r border-slate-800 text-xs font-black ${
                              total > 0 ? 'text-white bg-rose-950/30' : 'text-slate-600'
                            }`}
                          >
                            {total}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 border-l-2 border-slate-800 bg-slate-950 font-sans font-black text-xs text-rose-400 uppercase tracking-wider sticky right-0 z-10 flex items-center justify-between">
                        <span>TOTAL OUT</span>
                        <span className="font-mono text-sm font-black text-rose-300">
                          {grandOutTotal}
                        </span>
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Add Out Row Button */}
              <div className="no-print p-2 bg-slate-950/80 border-b-2 border-slate-800 flex justify-end">
                <button
                  onClick={addOutRow}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Out Order Row</span>
                </button>
              </div>

              {/* Sub-header: IN */}
              <div className="w-full py-1.5 bg-emerald-950/40 border-b border-slate-800 text-center font-bold text-xs uppercase tracking-widest text-emerald-300">
                IN - PRODUCTION RECEIPTS / STOCK IN
              </div>

              {/* IN Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b-2 border-slate-800 text-slate-200">
                      {products.map((p) => (
                        <th
                          key={p.shortCode}
                          className="py-2.5 px-1.5 text-center font-black border-r border-slate-800 min-w-[54px] max-w-[68px] whitespace-nowrap"
                          title={p.name}
                        >
                          <span className="text-[11px] font-black text-slate-200">
                            {p.shortCode}
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 px-4 text-left font-black tracking-wider uppercase border-l-2 border-slate-800 min-w-[220px] bg-slate-950 sticky right-0 z-10">
                        REMARK / BATCH
                      </th>
                      <th className="w-12 px-2 text-center font-black uppercase text-[10px] text-slate-400 border-l border-slate-800 no-print">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {inRows.map((row, rIdx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          rIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-transparent'
                        }`}
                      >
                        {products.map((p) => {
                          const val = row.items[p.shortCode];
                          return (
                            <td
                              key={p.shortCode}
                              className="p-0 border-r border-slate-800/60 text-center"
                            >
                              <input
                                type="number"
                                min="0"
                                placeholder="-"
                                value={val !== undefined && val !== 0 ? val : ''}
                                onChange={(e) => handleInCellChange(rIdx, p.shortCode, e.target.value)}
                                className={`w-full py-1.5 text-center bg-transparent focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bold text-xs ${
                                  val && val > 0 ? 'text-white font-extrabold bg-emerald-500/10' : 'text-slate-500'
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="p-1 border-l-2 border-slate-800 bg-slate-900/90 sticky right-0 z-10">
                          <input
                            type="text"
                            placeholder="e.g. BATCH-01 PRODUCTION..."
                            value={row.remark}
                            onChange={(e) => handleInRemarkChange(rIdx, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs font-sans font-bold text-slate-200 focus:outline-none"
                          />
                        </td>
                        <td className="p-1 text-center no-print border-l border-slate-800">
                          <button
                            type="button"
                            onClick={() => removeInRow(rIdx)}
                            className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-200 hover:bg-rose-950/60 transition-colors"
                            title="Delete this row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* IN Column Totals Row */}
                    <tr className="bg-slate-950 border-t-2 border-slate-700 font-black">
                      {products.map((p) => {
                        const total = inTotals[p.shortCode] || 0;
                        return (
                          <td
                            key={p.shortCode}
                            className={`py-2 px-1 text-center border-r border-slate-800 text-xs font-black ${
                              total > 0 ? 'text-white bg-emerald-950/30' : 'text-slate-600'
                            }`}
                          >
                            {total}
                          </td>
                        );
                      })}
                      <td className="py-2 px-4 border-l-2 border-slate-800 bg-slate-950 font-sans font-black text-xs text-emerald-400 uppercase tracking-wider sticky right-0 z-10 flex items-center justify-between">
                        <span>TOTAL IN</span>
                        <span className="font-mono text-sm font-black text-emerald-300">
                          {grandInTotal}
                        </span>
                      </td>
                      <td className="no-print"></td>
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* Add In Row Button */}
              <div className="no-print p-2 bg-slate-950/80 flex justify-end">
                <button
                  onClick={addInRow}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add In Receipt Row</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SHEET 2: STOCK & RECONCILIATION SHEET (Fitted to A4 Landscape)*/}
          {/* ============================================================ */}
          {(activeSheet === 'all' || activeSheet === 'stock') && (
            <div className="print-page space-y-4">
              {/* Sheet Header Banner */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 border-b-2 border-slate-800 bg-slate-950">
                  <div className="col-span-8 sm:col-span-9 p-3 text-center border-r-2 border-slate-800 flex items-center justify-center">
                    <h1 className="text-xl font-black uppercase tracking-widest text-indigo-300">
                      {division} - DAILY PHYSICAL STOCK & RECONCILIATION SHEET
                    </h1>
                  </div>
                  <div className="col-span-4 sm:col-span-3 p-3 text-center flex flex-col items-center justify-center bg-slate-900/60">
                    <span className="font-mono font-black text-sm text-indigo-400 tracking-wider">
                      {selectedDate}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      {formatDateLabel(selectedDate)}
                    </span>
                  </div>
                </div>

                {/* Physical Stock Reconciliation Header */}
                <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-indigo-400" />
                      Physical Audit & Location Reconciliation Matrix
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Compare physical stock (ACTUAL) against Finished Store balance
                    </p>
                  </div>

                  <div className="no-print flex items-center gap-2">
                    {reconSuccessMsg && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {reconSuccessMsg}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const cleared: { [code: string]: string } = {};
                        products.forEach((p) => {
                          cleared[p.shortCode] = '';
                        });
                        setActualCounts(cleared);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700"
                      title="Clear all physical count inputs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Counts</span>
                    </button>
                    <button
                      onClick={handleSaveReconciliation}
                      disabled={savingRecon}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950 transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingRecon ? 'Saving...' : 'Save Physical Audit'}</span>
                    </button>
                  </div>
                </div>

                {/* Audit Reconciliation Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800">
                        <th className="px-3 py-2 text-left font-black text-slate-300 sticky left-0 bg-slate-950 z-10 w-44 border-r border-slate-800">
                          STOCK METRIC
                        </th>
                        {products.map((p) => (
                          <th
                            key={p.shortCode}
                            className="px-1.5 py-2 text-center font-bold text-indigo-300 border-r border-slate-800/60 whitespace-nowrap min-w-[54px]"
                          >
                            {p.shortCode}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {/* ACTUAL ROW */}
                      <tr className="bg-indigo-950/30">
                        <td className="px-3 py-2 font-sans font-black text-indigo-300 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 whitespace-nowrap">
                          ACTUAL (PHYSICAL COUNT)
                        </td>
                        {products.map((p) => {
                          const val = actualCounts[p.shortCode];
                          return (
                            <td key={p.shortCode} className="p-0 border-r border-slate-800/40 text-center">
                              <input
                                type="number"
                                value={val !== undefined && val !== null ? val : ''}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setActualCounts({
                                    ...actualCounts,
                                    [p.shortCode]: raw === '' ? '' : Number(raw),
                                  });
                                }}
                                className="w-full py-1 text-center bg-transparent focus:bg-slate-950 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                          );
                        })}
                      </tr>

                      {/* STORE STOCK ROW */}
                      <tr className="bg-slate-900/40">
                        <td className="px-3 py-2 font-sans font-bold text-slate-300 sticky left-0 bg-slate-900/95 z-10 border-r border-slate-800 whitespace-nowrap">
                          FINISHED STORE STOCK
                        </td>
                        {products.map((p) => {
                          const val = storeStocks[p.shortCode];
                          return (
                            <td key={p.shortCode} className="p-0 border-r border-slate-800/40 text-center">
                              <input
                                type="number"
                                value={val !== undefined && val !== null ? val : (p.finishedStoreStock ?? 0)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  setStoreStocks({
                                    ...storeStocks,
                                    [p.shortCode]: raw === '' ? '' : Number(raw),
                                  });
                                }}
                                className="w-full py-1 text-center bg-transparent focus:bg-slate-950 text-xs font-bold text-cyan-300 focus:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                              />
                            </td>
                          );
                        })}
                      </tr>

                      {/* DIFFERENCE / VARIANCE ROW */}
                      <tr className="bg-slate-950 font-black border-t-2 border-slate-700">
                        <td className="px-3 py-2 font-sans font-black text-amber-400 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 whitespace-nowrap">
                          DIFFERENCE / VARIANCE
                        </td>
                        {products.map((p) => {
                          const storeVal = storeStocks[p.shortCode];
                          const storeStock =
                            storeVal !== undefined && storeVal !== ''
                              ? Number(storeVal)
                              : (p.finishedStoreStock ?? 0);
                          const actualRaw = actualCounts[p.shortCode];
                          const hasActual =
                            actualRaw !== '' && actualRaw !== undefined && actualRaw !== null;

                          if (!hasActual) {
                            return (
                              <td
                                key={p.shortCode}
                                className="px-1 py-2 text-center border-r border-slate-800 text-xs text-slate-700"
                              ></td>
                            );
                          }

                          const actual = Number(actualRaw);
                          const diff = actual - storeStock;
                          return (
                            <td
                              key={p.shortCode}
                              className={`px-1 py-2 text-center border-r border-slate-800 text-xs ${
                                diff === 0
                                  ? 'text-slate-500'
                                  : diff > 0
                                  ? 'text-emerald-400 bg-emerald-950/30'
                                  : 'text-rose-400 bg-rose-950/30 font-black'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Packaging WIP Buffer */}
              <Card className="p-4 border border-slate-800 bg-slate-950 shadow-xl">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-800/80 pb-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Packaging WIP & Assembly Stage Counts
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'BOX STOCK', key: 'boxStock', color: 'text-blue-400' },
                    { label: 'PASTED', key: 'pasted', color: 'text-emerald-400' },
                    { label: 'PASTING', key: 'pasting', color: 'text-amber-400' },
                    { label: 'BOX', key: 'box', color: 'text-indigo-400' },
                    { label: 'POUCH', key: 'pouch', color: 'text-purple-400' },
                    { label: 'POUCH STOCK', key: 'pouchStock', color: 'text-teal-400' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center"
                    >
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 block mb-1">
                        {item.label}
                      </span>
                      <input
                        type="number"
                        value={packagingWIP[item.key] ?? 0}
                        onChange={(e) =>
                          setPackagingWIP({
                            ...packagingWIP,
                            [item.key]: Number(e.target.value),
                          })
                        }
                        className={`w-full text-center bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-lg py-1 px-1 font-mono text-sm font-extrabold ${item.color}`}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Audit Sign-off Strip */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-400 font-sans">
                <div>Audited By: <span className="underline decoration-slate-700 font-mono text-slate-300">___________________________</span></div>
                <div>Factory Manager: <span className="underline decoration-slate-700 font-mono text-slate-300">___________________________</span></div>
                <div>Store Keeper: <span className="underline decoration-slate-700 font-mono text-slate-300">___________________________</span></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

