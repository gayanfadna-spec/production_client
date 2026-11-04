import React, { useEffect, useState, useMemo } from 'react';
import api from '../api/client';
import { PackingMaterial, BOM } from '../types';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Package, Search, Filter, AlertTriangle, History, Workflow, FlaskConical, Plus, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PackingFormulaUsage {
  bomId: string;
  productName: string;
  sku: string;
  division: string;
  formulaName: string;
  quantity?: number;
  unit?: string;
}

export const PackingMaterials: React.FC = () => {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<PackingMaterial[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PackingMaterial | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [materialFormSubmitting, setMaterialFormSubmitting] = useState(false);

  // Add / Edit Form State
  const [materialFormData, setMaterialFormData] = useState({
    sku: '',
    name: '',
    category: 'Box',
    unit: 'Pcs',
    currentStock: 0,
    minReorderLevel: 500,
    costPerUnit: 15,
    supplier: 'PrintPack Ceylon Ltd',
    storageLocation: 'PM Store Bay 1',
    description: '',
  });

  const generateSuggestedSKU = (cat: string) => {
    const code = (cat || 'PKG').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const count = items.length + 1;
    return `PM-${code || 'PKG'}-${count.toString().padStart(3, '0')}`;
  };

  const openAddModal = () => {
    setMaterialFormData({
      sku: generateSuggestedSKU('Box'),
      name: '',
      category: 'Box',
      unit: 'Pcs',
      currentStock: 1000,
      minReorderLevel: 500,
      costPerUnit: 15,
      supplier: 'PrintPack Ceylon Ltd',
      storageLocation: 'PM Store Bay 1',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: PackingMaterial) => {
    setSelectedItem(item);
    setMaterialFormData({
      sku: item.sku,
      name: item.name,
      category: item.category || 'Box',
      unit: item.unit || 'Pcs',
      currentStock: item.currentStock || 0,
      minReorderLevel: item.minReorderLevel || 500,
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
      const res = await api.post('/packing-materials', materialFormData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create packing material');
    } finally {
      setMaterialFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setMaterialFormSubmitting(true);
      const res = await api.put(`/packing-materials/${selectedItem._id}`, materialFormData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update packing material');
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

  const openHistoryModal = async (item: PackingMaterial) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get(`/audit-logs/entity/PackingMaterial/${item._id}`);
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
      const [pmRes, bomRes] = await Promise.all([
        api.get('/packing-materials'),
        api.get('/boms'),
      ]);
      if (pmRes.data.success) {
        setItems(pmRes.data.data);
      }
      if (bomRes.data.success) {
        setBoms(bomRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load packing materials or formulas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleQuickMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !txnQty) return;

    try {
      setTxnSubmitting(true);
      const res = await api.post('/stock-transactions', {
        itemType: 'PackingMaterial',
        itemId: selectedItem._id,
        transactionType: txnType,
        reason: txnReason,
        quantity: Number(txnQty),
        location: selectedItem.storageLocation || 'PM Store',
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

  // Map packing material IDs to product formulas
  const formulaUsageMap = useMemo(() => {
    const map = new Map<string, PackingFormulaUsage[]>();
    for (const bom of boms) {
      const pmList = bom.packingMaterials || [];
      const prodName = bom.finishedGood?.name || (bom as any).productName || 'Product';
      const prodSku = bom.finishedGood?.sku || (bom as any).productSku || '';
      for (const item of pmList) {
        const pmObj: any = item.packingMaterial;
        const id = typeof pmObj === 'string' ? pmObj : pmObj?._id;
        if (!id) continue;
        const existing = map.get(id) || [];
        existing.push({
          bomId: bom._id,
          productName: prodName,
          sku: prodSku,
          division: bom.division || 'Fadna Tea',
          formulaName: bom.formulaName || (bom.version ? `v${bom.version}` : 'Formula'),
          quantity: item.quantity,
          unit: item.unit,
        });
        map.set(id, existing);
      }
    }
    return map;
  }, [boms]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (categoryFilter === 'in_formulas') {
      const usages = formulaUsageMap.get(item._id) || [];
      return usages.length > 0;
    }
    return categoryFilter === 'all' || item.category === categoryFilter;
  });

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" />
            Packing Materials Master & Store Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monocartons, inner pouches, filter rolls, tags, and master outer shippers. Monitored for stock levels and GRN / wastage adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('admin', 'production_manager') && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-950/40 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Packing Material</span>
            </button>
          )}
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
            <span>Defined in Product Formulas</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boxes, pouches, filter paper rolls..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setCategoryFilter(categoryFilter === 'in_formulas' ? 'all' : 'in_formulas')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
            categoryFilter === 'in_formulas'
              ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>In Product Formulas</span>
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-bold">SKU Code</th>
                <th className="py-3 px-4 font-bold">Packing Description</th>
                <th className="py-3 px-4 font-bold">Used in Product Formulas</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-center">Current Stock</th>
                <th className="py-3 px-4 font-bold">Reorder Level</th>
                <th className="py-3 px-4 font-bold">Unit Cost</th>
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
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-100">{item.name}</p>
                      {item.specs && <p className="text-[11px] text-slate-500">{item.specs}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      {usages.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">Not in any formula</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {usages.slice(0, 2).map((u, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-[11px] text-blue-300 font-medium"
                              title={`${u.productName} (${u.sku}) — ${u.formulaName}`}
                            >
                              <span className="truncate max-w-[120px]">{u.productName}</span>
                              {u.quantity !== undefined && (
                                <span className="font-mono text-blue-400 font-bold">{u.quantity} {u.unit || item.unit}</span>
                              )}
                            </span>
                          ))}
                          {usages.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-semibold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                              +{usages.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                        {item.category}
                      </span>
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
                            <span className="text-blue-400">✏️ {item.lastEditedBy.userName}</span>
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
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 transition-colors"
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
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setTxnType('IN');
                            setTxnReason('Purchase');
                            setIsTxnModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                        >
                          <span>Adjust / GRN</span>
                        </button>
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
        title="Record Packing Material Movement"
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
              Stock OUT (Scrap / Wastage)
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
                min="1"
                value={txnQty}
                onChange={(e) => setTxnQty(e.target.value)}
                placeholder="e.g. 1000"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
              <select
                value={txnReason}
                onChange={(e) => setTxnReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="Purchase">Purchase (GRN)</option>
                <option value="Adjustment">Physical Inventory Adjustment</option>
                <option value="Wastage">Wastage / Machine Scrap</option>
                <option value="Return">Supplier Rejection Return</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              PO # / Invoice Ref
            </label>
            <input
              type="text"
              value={txnRef}
              onChange={(e) => setTxnRef(e.target.value)}
              placeholder="e.g. INV-PM-4482"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
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
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
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
                          {c.label || c.field}: {String(c.oldValue)} → <span className="text-blue-400 font-bold">{String(c.newValue)}</span>
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

      {/* Add Packing Material Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Packing Material"
        subtitle="Create a new packaging item with unique SKU ID"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unique Packing ID / SKU <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.sku}
                onChange={(e) => setMaterialFormData({ ...materialFormData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. PM-BOX-001"
                required
                className="w-full bg-slate-950 border border-blue-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Editable unique identifier</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Material Name <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.name}
                onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                placeholder="e.g. Monocarton 20s Fadna Box"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={materialFormData.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setMaterialFormData({
                    ...materialFormData,
                    category: cat,
                    sku: materialFormData.sku.startsWith('PM-') ? generateSuggestedSKU(cat) : materialFormData.sku,
                  });
                }}
                placeholder="e.g. Box, Pouch, Foil, Jar, Bottle"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <input
                type="text"
                value={materialFormData.unit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                placeholder="Pcs, Rolls, Meters"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Stock</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.currentStock}
                onChange={(e) => setMaterialFormData({ ...materialFormData, currentStock: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Per Unit (LKR)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.costPerUnit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, costPerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Location</label>
              <input
                type="text"
                value={materialFormData.storageLocation}
                onChange={(e) => setMaterialFormData({ ...materialFormData, storageLocation: e.target.value })}
                placeholder="e.g. PM Store Bay 1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier</label>
              <input
                type="text"
                value={materialFormData.supplier}
                onChange={(e) => setMaterialFormData({ ...materialFormData, supplier: e.target.value })}
                placeholder="e.g. PrintPack Ceylon Ltd"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-950/40"
            >
              {materialFormSubmitting ? 'Creating...' : 'Create Material'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Packing Material Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Packing Material: ${selectedItem?.name}`}
        subtitle="Update details or change Unique ID / SKU"
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unique Packing ID / SKU <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.sku}
                onChange={(e) => setMaterialFormData({ ...materialFormData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. PM-BOX-001"
                required
                className="w-full bg-slate-950 border border-blue-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-amber-400 block mt-0.5">⚠️ Changing SKU updates audit logs and identifiers</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Material Name <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                value={materialFormData.name}
                onChange={(e) => setMaterialFormData({ ...materialFormData, name: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
              <input
                type="text"
                value={materialFormData.category}
                onChange={(e) => setMaterialFormData({ ...materialFormData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Unit</label>
              <input
                type="text"
                value={materialFormData.unit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, unit: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cost Per Unit (LKR)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={materialFormData.costPerUnit}
                onChange={(e) => setMaterialFormData({ ...materialFormData, costPerUnit: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Storage Location</label>
              <input
                type="text"
                value={materialFormData.storageLocation}
                onChange={(e) => setMaterialFormData({ ...materialFormData, storageLocation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier</label>
              <input
                type="text"
                value={materialFormData.supplier}
                onChange={(e) => setMaterialFormData({ ...materialFormData, supplier: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-950/40"
            >
              {materialFormSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
