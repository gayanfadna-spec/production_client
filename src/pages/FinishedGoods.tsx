import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { FinishedGood } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Edit2,
  History,
  Clock,
} from 'lucide-react';

export const FinishedGoods: React.FC = () => {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<FinishedGood[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FinishedGood | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Transfer Form State
  const [transferQty, setTransferQty] = useState('');
  const [transferDirection, setTransferDirection] = useState<'FloorToStore' | 'StoreToFloor'>('FloorToStore');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Add Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'Herbal Tea',
    unit: 'Packs',
    packSize: '20 x 2g filter bags',
    minReorderLevel: 500,
    standardBatchSize: 1000,
    costPerUnit: 400,
    sellingPrice: 650,
    description: '',
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: 'Herbal Tea',
    unit: 'Packs',
    packSize: '20 x 2g filter bags',
    minReorderLevel: 500,
    standardBatchSize: 1000,
    costPerUnit: 400,
    sellingPrice: 650,
    description: '',
  });

  const openEditModal = (item: FinishedGood) => {
    setSelectedItem(item);
    setEditFormData({
      name: item.name,
      category: item.category,
      unit: item.unit,
      packSize: item.packSize,
      minReorderLevel: item.minReorderLevel,
      standardBatchSize: item.standardBatchSize,
      costPerUnit: item.costPerUnit,
      sellingPrice: item.sellingPrice,
      description: item.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      const res = await api.put(`/finished-goods/${selectedItem._id}`, editFormData);
      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating finished good');
    }
  };

  const openHistoryModal = async (item: FinishedGood) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.get(`/audit-logs/entity/FinishedGood/${item._id}`);
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
      const res = await api.get('/finished-goods');
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load finished goods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/finished-goods', formData);
      if (res.data.success) {
        setIsAddModalOpen(false);
        fetchItems();
        setFormData({
          sku: '',
          name: '',
          category: 'Herbal Tea',
          unit: 'Packs',
          packSize: '20 x 2g filter bags',
          minReorderLevel: 500,
          standardBatchSize: 1000,
          costPerUnit: 400,
          sellingPrice: 650,
          description: '',
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating finished good');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !transferQty) return;

    try {
      setTransferSubmitting(true);
      const isFloorToStore = transferDirection === 'FloorToStore';

      const res = await api.post('/stock-transactions', {
        itemType: 'FinishedGood',
        itemId: selectedItem._id,
        transactionType: 'TRANSFER',
        reason: 'Floor_Transfer',
        quantity: Number(transferQty),
        fromLocation: isFloorToStore ? 'Production Floor' : 'Finished Store',
        toLocation: isFloorToStore ? 'Finished Store' : 'Production Floor',
        referenceNumber: `TRF-${Date.now().toString().slice(-6)}`,
        notes: transferNotes || `Internal relocation ${isFloorToStore ? 'Floor to Store' : 'Store to Floor'}`,
      });

      if (res.data.success) {
        setIsTransferModalOpen(false);
        setTransferQty('');
        setTransferNotes('');
        fetchItems();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Stock transfer failed');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Finished Goods Master & Stock Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking of Production Floor Stock vs. Finished Store Stock.
          </p>
        </div>

        {hasRole('admin', 'production_manager') && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Finished Good SKU</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, tea blend, or product name..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
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

      {/* Main Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-bold">SKU Code</th>
                <th className="py-3 px-4 font-bold">Finished Good Description</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold text-center bg-teal-950/20 text-teal-300">
                  Floor Stock
                </th>
                <th className="py-3 px-4 font-bold text-center bg-blue-950/20 text-blue-300">
                  Store Stock
                </th>
                <th className="py-3 px-4 font-bold text-center">Total Available</th>
                <th className="py-3 px-4 font-bold">Reorder Lvl</th>
                <th className="py-3 px-4 font-bold">Unit Cost</th>
                <th className="py-3 px-4 font-bold">Last Edited By</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const floor = item.productionFloorStock || 0;
                const store = item.finishedStoreStock || 0;
                const total = floor + store;
                const isLow = total <= item.minReorderLevel;

                return (
                  <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-100">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.packSize}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-teal-400 bg-teal-950/10">
                      {floor.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-400 bg-blue-950/10">
                      {store.toLocaleString()} {item.unit}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`font-extrabold ${isLow ? 'text-rose-400' : 'text-slate-100'}`}>
                          {total.toLocaleString()} {item.unit}
                        </span>
                        {isLow && (
                          <span title="Stock at or below reorder level">
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
                    {/* Last Edited By Column */}
                    <td className="py-3.5 px-4">
                      {item.lastEditedBy?.userName ? (
                        <div title={item.lastEditedBy.summary || 'Item modified'}>
                          <p className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                            <span className="text-emerald-400">✏️ {item.lastEditedBy.userName}</span>
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
                        <button
                          onClick={() => openHistoryModal(item)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-300 transition-colors"
                          title="View change history / audit trail"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {hasRole('admin', 'production_manager') && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                            title="Edit product master details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasRole('admin', 'production_manager', 'store_keeper') && (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setIsTransferModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[11px] font-semibold transition-all inline-flex items-center gap-1"
                            title="Relocate floor / store stock"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Relocate</span>
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

      {/* Relocate Floor <-> Store Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Finished Goods Relocation Transfer"
        subtitle={`Transfer stock for ${selectedItem?.name} (${selectedItem?.sku})`}
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Production Floor Stock</span>
              <span className="text-base font-bold text-teal-400">
                {selectedItem?.productionFloorStock || 0} {selectedItem?.unit}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Finished Store Stock</span>
              <span className="text-base font-bold text-blue-400">
                {selectedItem?.finishedStoreStock || 0} {selectedItem?.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Transfer Route Direction
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransferDirection('FloorToStore')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  transferDirection === 'FloorToStore'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Floor → Finished Store
              </button>
              <button
                type="button"
                onClick={() => setTransferDirection('StoreToFloor')}
                className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  transferDirection === 'StoreToFloor'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                Finished Store → Floor
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Quantity to Transfer ({selectedItem?.unit})
            </label>
            <input
              type="number"
              min="1"
              max={
                transferDirection === 'FloorToStore'
                  ? selectedItem?.productionFloorStock
                  : selectedItem?.finishedStoreStock
              }
              value={transferQty}
              onChange={(e) => setTransferQty(e.target.value)}
              placeholder="e.g. 200"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Transfer Notes / Batch Ref
            </label>
            <input
              type="text"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              placeholder="e.g. Shift 1 finished output transfer to central dispatch"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferSubmitting}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-teal-950/40"
            >
              {transferSubmitting ? 'Relocating...' : 'Confirm Stock Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add SKU Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Finished Good SKU"
        subtitle="Register a new commercial product master record"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">SKU Code</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. FG-FAD-008"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Herbal Tea"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Product Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Fadna Cinnamon Twist Infusion"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Pack Size</label>
              <input
                type="text"
                value={formData.packSize}
                onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                placeholder="e.g. 20 x 2g bags"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Packs"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Reorder Level</label>
              <input
                type="number"
                value={formData.minReorderLevel}
                onChange={(e) => setFormData({ ...formData, minReorderLevel: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Batch</label>
              <input
                type="number"
                value={formData.standardBatchSize}
                onChange={(e) => setFormData({ ...formData, standardBatchSize: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Save Master Record
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal with Edit By Banner */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Finished Good: ${selectedItem?.name}`}
        subtitle={`SKU: ${selectedItem?.sku}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {selectedItem?.lastEditedBy?.userName && (
            <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300">
              <span className="font-bold">Last edited:</span> by {selectedItem.lastEditedBy.userName} on{' '}
              {new Date(selectedItem.lastEditedBy.editedAt || '').toLocaleString()} —{' '}
              <span className="italic">{selectedItem.lastEditedBy.summary}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
              <input
                type="text"
                required
                value={editFormData.category}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Pack Size</label>
              <input
                type="text"
                value={editFormData.packSize}
                onChange={(e) => setEditFormData({ ...editFormData, packSize: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Unit</label>
              <input
                type="text"
                value={editFormData.unit}
                onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Cost Per Unit (LKR)</label>
              <input
                type="number"
                value={editFormData.costPerUnit}
                onChange={(e) => setEditFormData({ ...editFormData, costPerUnit: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Selling Price (LKR)</label>
              <input
                type="number"
                value={editFormData.sellingPrice}
                onChange={(e) => setEditFormData({ ...editFormData, sellingPrice: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Min Reorder Level</label>
              <input
                type="number"
                value={editFormData.minReorderLevel}
                onChange={(e) => setEditFormData({ ...editFormData, minReorderLevel: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Standard Batch Size</label>
              <input
                type="number"
                value={editFormData.standardBatchSize}
                onChange={(e) => setEditFormData({ ...editFormData, standardBatchSize: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Save Changes
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
              <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
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
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
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
                          {c.label || c.field}: {String(c.oldValue)} → <span className="text-emerald-400 font-bold">{String(c.newValue)}</span>
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
    </div>
  );
};
