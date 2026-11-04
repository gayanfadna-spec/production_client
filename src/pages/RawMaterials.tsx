import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import { RawMaterial, RAW_MATERIAL_CATEGORIES, RawMaterialCategory, BOM } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { Leaf, Search, Filter, AlertTriangle, ArrowDownLeft, ArrowUpRight, History, Clock, Workflow, FlaskConical, Plus, Edit2 } from 'lucide-react';

interface MaterialFormulaUsage {
  bomId: string;
  productName: string;
  sku: string;
  division: string;
  formulaName: string;
  percentage?: number;
  isStage?: boolean;
  stageName?: string;
}

export const RawMaterials: React.FC = () => {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<RawMaterial[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RawMaterial | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [materialFormSubmitting, setMaterialFormSubmitting] = useState(false);

  // Add / Edit Form State
  const [materialFormData, setMaterialFormData] = useState({
    sku: '',
    name: '',
    botanicalName: '',
    category: 'Tea' as RawMaterialCategory,
    unit: 'kg',
    currentStock: 0,
    minReorderLevel: 50,
    costPerUnit: 1200,
    supplier: 'Local Herbal Growers Co-op',
    storageLocation: 'RM Warehouse Bay A',
    description: '',
  });

  const generateSuggestedSKU = (cat: string) => {
    const prefix = cat === 'Lifescience' ? 'LS' : cat === 'QofL' ? 'QOF' : cat === 'Others' ? 'OTH' : 'TEA';
    const count = items.length + 1;
    return `RM-${prefix}-${count.toString().padStart(3, '0')}`;
  };

  const openAddModal = () => {
    setMaterialFormData({
      sku: generateSuggestedSKU('Tea'),
      name: '',
      botanicalName: '',
      category: 'Tea',
      unit: 'kg',
      currentStock: 100,
      minReorderLevel: 50,
      costPerUnit: 1200,
      supplier: 'Local Herbal Growers Co-op',
      storageLocation: 'RM Warehouse Bay A',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: RawMaterial) => {
    setSelectedItem(item);
    setMaterialFormData({
      sku: item.sku,
      name: item.name,
      botanicalName: item.botanicalName || '',
      category: (item.category as RawMaterialCategory) || 'Tea',
      unit: item.unit || 'kg',
      currentStock: item.currentStock || 0,
      minReorderLevel: item.minReorderLevel || 50,
      costPerUnit: item.costPerUnit || 0,
      supplier: item.supplier || '',
      storageLocation: item.storageLocation || '',
      description: item.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMaterialFormSubmitting(true);
      const res = await api.post('/raw-materials', materialFormData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create raw material');
    } finally {
      setMaterialFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setMaterialFormSubmitting(true);
      const res = await api.put(`/raw-materials/${selectedItem._id}`, materialFormData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update raw material');
    } finally {
      setMaterialFormSubmitting(false);
    }
  };

  // Quick Movement State
  const [txnType, setTxnType] = useState<'IN' | 'OUT'>('IN');
  const [txnReason, setTxnReason] = useState('Purchase');
  const [txnQty, setTxnQty] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [txnNotes, setTxnNotes] = useState('');
  const [txnSubmitting, setTxnSubmitting] = useState(false);

  const openHistoryModal = async (item: RawMaterial) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get(`/audit-logs/entity/RawMaterial/${item._id}`);
      if (res.data.success) {
        setHistoryLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load item audit logs:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const [rmRes, bomRes] = await Promise.all([
        api.get('/raw-materials'),
        api.get('/boms'),
      ]);
      if (rmRes.data.success) {
        setItems(rmRes.data.data);
      }
      if (bomRes.data.success) {
        setBoms(bomRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load raw materials / formulas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Build a fast lookup map: rawMaterialId -> MaterialFormulaUsage[]
  const formulaUsageMap = useMemo(() => {
    const map = new Map<string, MaterialFormulaUsage[]>();

    boms.forEach((bom) => {
      const prodName = bom.finishedGood?.name || 'Product';
      const prodSku = bom.finishedGood?.sku || '';
      const div = bom.division || bom.finishedGood?.division || 'Fadna Tea';

      // 1. Direct rawMaterials
      bom.rawMaterials?.forEach((r) => {
        const rmId = (r.rawMaterial as any)?._id || (r.rawMaterial as any);
        if (rmId) {
          const list = map.get(rmId) || [];
          if (!list.some((it) => it.bomId === bom._id && !it.isStage)) {
            list.push({
              bomId: bom._id,
              productName: prodName,
              sku: prodSku,
              division: div,
              formulaName: bom.formulaName || prodName,
              percentage: r.percentage,
            });
            map.set(rmId, list);
          }
        }
      });

      // 2. Multi-stage ingredients
      if (bom.isMultiStage && bom.stages) {
        bom.stages.forEach((stage) => {
          stage.ingredients?.forEach((ing) => {
            const rmId = (ing.rawMaterial as any)?._id || (ing.rawMaterial as any);
            if (rmId) {
              const list = map.get(rmId) || [];
              if (!list.some((it) => it.bomId === bom._id && it.stageName === stage.stageName)) {
                list.push({
                  bomId: bom._id,
                  productName: prodName,
                  sku: prodSku,
                  division: div,
                  formulaName: bom.formulaName || prodName,
                  percentage: ing.percentage,
                  isStage: true,
                  stageName: stage.stageName,
                });
                map.set(rmId, list);
              }
            }
          });
        });
      }
    });

    return map;
  }, [boms]);

  // Count of raw materials actively used in product formulas
  const inFormulasCount = useMemo(() => {
    return items.filter((it) => (formulaUsageMap.get(it._id) || []).length > 0).length;
  }, [items, formulaUsageMap]);

  const handleQuickMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !txnQty) return;

    try {
      setTxnSubmitting(true);
      const res = await api.post('/stock-transactions', {
        itemType: 'RawMaterial',
        itemId: selectedItem._id,
        transactionType: txnType,
        reason: txnReason,
        quantity: Number(txnQty),
        location: selectedItem.storageLocation || 'RM Warehouse',
        referenceNumber: txnRef,
        notes: txnNotes,
      });

      if (res.data.success) {
        setIsTxnModalOpen(false);
        setTxnQty('');
        setTxnRef('');
        setTxnNotes('');
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Transaction failed');
    } finally {
      setTxnSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    const itemUsages = formulaUsageMap.get(item._id) || [];
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.botanicalName && item.botanicalName.toLowerCase().includes(q)) ||
      itemUsages.some((u) => u.productName.toLowerCase().includes(q) || u.sku.toLowerCase().includes(q) || (u.formulaName && u.formulaName.toLowerCase().includes(q)));

    let matchesCategory = true;
    if (categoryFilter === 'in_formulas') {
      matchesCategory = itemUsages.length > 0;
    } else if (categoryFilter !== 'all') {
      matchesCategory = item.category?.toLowerCase() === categoryFilter.toLowerCase();
    }

    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category: string) => {
    const cat = category?.toLowerCase();
    if (cat === 'lifescience') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold">
          Lifescience
        </span>
      );
    }
    if (cat === 'qofl') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
          QofL
        </span>
      );
    }
    if (cat === 'tea') {
      return (
        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
          Tea
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
        {category || 'Others'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Raw Materials Master & Warehouse Stock
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Botanical materials defined in <strong className="text-emerald-400">Product Formulas</strong>. Track real-time inventory and GRN movements here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('admin', 'production_manager') && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-950/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Raw Material</span>
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            <span>Defined in <strong className="text-emerald-400">Product Formulas</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3">
        {/* Category Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              categoryFilter === 'all'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>All Categories</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${categoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {items.length}
            </span>
          </button>

          {/* In Product Formulas Filter Tab */}
          <button
            onClick={() => setCategoryFilter('in_formulas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
              categoryFilter === 'in_formulas'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/30'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-emerald-300'
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            <span>In Product Formulas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${categoryFilter === 'in_formulas' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400 font-bold'}`}>
              {inFormulasCount}
            </span>
          </button>

          {RAW_MATERIAL_CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category?.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = categoryFilter.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? cat === 'Tea'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/30'
                      : cat === 'Lifescience'
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-950/30'
                      : cat === 'QofL'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/30'
                      : 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search herbs, botanical names, SKU, or Product Formula (e.g. Moist Curl)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value="all">All Categories ({items.length})</option>
              <option value="in_formulas">In Product Formulas ({inFormulasCount})</option>
              {RAW_MATERIAL_CATEGORIES.map((cat) => {
                const count = items.filter((i) => i.category?.toLowerCase() === cat.toLowerCase()).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-bold">SKU Code</th>
                <th className="py-3 px-4 font-bold">Material Description</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Used in Product Formulas</th>
                <th className="py-3 px-4 font-bold text-center">Current Stock</th>
                <th className="py-3 px-4 font-bold">Reorder Level</th>
                <th className="py-3 px-4 font-bold">Cost/Unit</th>
                <th className="py-3 px-4 font-bold">Supplier & Location</th>
                <th className="py-3 px-4 font-bold">Last Edited By</th>
                <th className="py-3 px-4 font-bold text-right">Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const isLow = item.currentStock <= item.minReorderLevel;
                const usages = formulaUsageMap.get(item._id) || [];
                return (
                  <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-100">{item.name}</p>
                      {item.botanicalName && (
                        <p className="text-[11px] text-teal-300/80 italic font-mono">{item.botanicalName}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {getCategoryBadge(item.category)}
                    </td>
                    {/* Used in Product Formulas Column */}
                    <td className="py-3.5 px-4">
                      {usages.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic block py-0.5">
                          Unassigned Stock
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {usages.map((u, uIdx) => (
                            <span
                              key={uIdx}
                              title={`${u.formulaName} ${u.isStage ? `(Stage: ${u.stageName})` : ''} • Ratio: ${u.percentage || 0}%`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all cursor-default"
                            >
                              <span className="truncate max-w-[120px]">{u.productName}</span>
                              <span className="font-mono text-emerald-400 font-extrabold">{u.percentage}%</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-extrabold ${isLow ? 'text-rose-400' : 'text-slate-100'}`}>
                          {item.currentStock.toLocaleString()} {item.unit}
                        </span>
                        {isLow && (
                          <span title="Stock below reorder point">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 inline" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {item.minReorderLevel} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      LKR {item.costPerUnit || 0}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <p className="truncate max-w-[160px] text-slate-200">{item.supplier}</p>
                      <p className="text-[10px] text-slate-500">{item.storageLocation}</p>
                    </td>

                    {/* Last Edited By Column */}
                    <td className="py-3.5 px-4">
                      {item.lastEditedBy?.userName ? (
                        <div title={item.lastEditedBy.summary || 'Item modified'}>
                          <p className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                            <span className="text-teal-400">✏️ {item.lastEditedBy.userName}</span>
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {item.lastEditedBy.summary || 'Details updated'}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {new Date(item.lastEditedBy.editedAt || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                            {new Date(item.lastEditedBy.editedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No edits</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasRole('admin', 'production_manager') && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                            title="Edit Material & Unique ID / SKU"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-300 transition-colors"
                          title="View change history / audit trail"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {hasRole('admin', 'production_manager', 'store_keeper') && (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setTxnType('IN');
                              setTxnReason('Purchase');
                              setIsTxnModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                          >
                            <span>Adjust / GRN</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Transaction Modal */}
      <Modal
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
        title="Record Raw Material Movement"
        subtitle={`${selectedItem?.name} (${selectedItem?.sku}) | Current: ${selectedItem?.currentStock} ${selectedItem?.unit}`}
      >
        <form onSubmit={handleQuickMovement} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setTxnType('IN');
                setTxnReason('Purchase');
              }}
              className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                txnType === 'IN'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Stock IN (Purchase / GRN)
            </button>
            <button
              type="button"
              onClick={() => {
                setTxnType('OUT');
                setTxnReason('Adjustment');
              }}
              className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                txnType === 'OUT'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Stock OUT (Adjustment / Scrap)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Quantity ({selectedItem?.unit})
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={txnQty}
                onChange={(e) => setTxnQty(e.target.value)}
                placeholder="e.g. 50"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
              <select
                value={txnReason}
                onChange={(e) => setTxnReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                <option value="Purchase">Purchase (GRN)</option>
                <option value="Adjustment">Physical Count Adjustment</option>
                <option value="Wastage">Wastage / Scrap</option>
                <option value="Return">Supplier Return</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              PO # / GRN Reference
            </label>
            <input
              type="text"
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value)}
              placeholder="e.g. GRN-2026-992"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Notes</label>
            <input
              type="text"
              value={txnNotes}
              onChange={(e) => setTxnNotes(e.target.value)}
              placeholder="e.g. Batch received from estate"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTxnModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={txnSubmitting}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold"
            >
              {txnSubmitting ? 'Recording...' : 'Save Movement'}
            </button>
          </div>
        </form>
      </Modal>
      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Audit & Change History: ${selectedItem?.name}`}
        subtitle={`SKU: ${selectedItem?.sku} | Trace who updated what with timestamps`}
      >
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span>Fetching audit history...</span>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No previous audit records logged for this item yet. Future updates will be tracked automatically.
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {historyLogs.map((log) => (
                <div key={log._id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      {log.performedByName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{log.summary}</p>
                  {log.changes && log.changes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-slate-900">
                      {log.changes.map((c: any, i: number) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          {c.label || c.field}: {String(c.oldValue)} → <span className="text-teal-400 font-bold">{String(c.newValue)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Raw Material Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Raw Material"
        subtitle="Create a new botanical or formulation material with unique SKU ID"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unique Material ID / SKU <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.sku}
                onChange={(e) => setMaterialFormData({ ...materialFormData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. RM-LS-001"
                required
                className="w-full bg-slate-950 border border-teal-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-400"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Editable unique identifier</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Material Name <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.name}
                onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                placeholder="e.g. Pupula Fine Botanical Powder"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Botanical / Latin Name</label>
              <input
                type="text"
                value={materialFormData.botanicalName}
                onChange={(e) => setMaterialFormData({ ...materialFormData, botanicalName: e.target.value })}
                placeholder="e.g. Vernonia zeylanica"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 italic focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={materialFormData.category}
                onChange={(e) => {
                  const cat = e.target.value as RawMaterialCategory;
                  setMaterialFormData({
                    ...materialFormData,
                    category: cat,
                    sku: materialFormData.sku.startsWith('RM-') ? generateSuggestedSKU(cat) : materialFormData.sku,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {RAW_MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <input
                type="text"
                value={materialFormData.unit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                placeholder="kg"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.currentStock}
                onChange={(e) => setMaterialFormData({ ...materialFormData, currentStock: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Min Reorder Level</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.minReorderLevel}
                onChange={(e) => setMaterialFormData({ ...materialFormData, minReorderLevel: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Per Unit (LKR)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.costPerUnit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, costPerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Location</label>
              <input
                type="text"
                value={materialFormData.storageLocation}
                onChange={(e) => setMaterialFormData({ ...materialFormData, storageLocation: e.target.value })}
                placeholder="e.g. RM Warehouse Bay A"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier</label>
            <input
              type="text"
              value={materialFormData.supplier}
              onChange={(e) => setMaterialFormData({ ...materialFormData, supplier: e.target.value })}
              placeholder="e.g. Local Herbal Growers Co-op"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={materialFormSubmitting}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-950/40"
            >
              {materialFormSubmitting ? 'Creating...' : 'Create Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Raw Material Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Raw Material: ${selectedItem?.name}`}
        subtitle="Update details or change Unique ID / SKU"
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unique Material ID / SKU <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.sku}
                onChange={(e) => setMaterialFormData({ ...materialFormData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. RM-LS-001"
                required
                className="w-full bg-slate-950 border border-teal-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-teal-300 focus:outline-none focus:border-teal-400"
              />
              <span className="text-[10px] text-amber-400 block mt-0.5">⚠️ Changing SKU updates audit logs and identifiers</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Material Name <span className="text-teal-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.name}
                onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Botanical / Latin Name</label>
              <input
                type="text"
                value={materialFormData.botanicalName}
                onChange={(e) => setMaterialFormData({ ...materialFormData, botanicalName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 italic focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <select
                value={materialFormData.category}
                onChange={(e) => setMaterialFormData({ ...materialFormData, category: e.target.value as RawMaterialCategory })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              >
                {RAW_MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <input
                type="text"
                value={materialFormData.unit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Current Stock</label>
              <input
                type="number"
                step="any"
                value={materialFormData.currentStock}
                disabled
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono cursor-not-allowed"
                title="Use Adjust / GRN to record physical inventory movements"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Min Reorder Level</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.minReorderLevel}
                onChange={(e) => setMaterialFormData({ ...materialFormData, minReorderLevel: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Per Unit (LKR)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.costPerUnit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, costPerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Location</label>
              <input
                type="text"
                value={materialFormData.storageLocation}
                onChange={(e) => setMaterialFormData({ ...materialFormData, storageLocation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier</label>
            <input
              type="text"
              value={materialFormData.supplier}
              onChange={(e) => setMaterialFormData({ ...materialFormData, supplier: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={materialFormSubmitting}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-teal-950/40"
            >
              {materialFormSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
