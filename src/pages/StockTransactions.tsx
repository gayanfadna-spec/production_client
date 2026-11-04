import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { StockTransaction, FinishedGood, RawMaterial, PackingMaterial } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  Plus,
  Play,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const StockTransactions: React.FC = () => {
  const { hasRole } = useAuth();
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);

  // Manual Movement Form State
  const [movementForm, setMovementForm] = useState({
    itemType: 'FinishedGood' as 'FinishedGood' | 'RawMaterial' | 'PackingMaterial',
    itemId: '',
    transactionType: 'IN' as 'IN' | 'OUT' | 'TRANSFER',
    reason: 'Purchase',
    quantity: '',
    location: 'Production Floor',
    fromLocation: 'Production Floor',
    toLocation: 'Finished Store',
    referenceNumber: '',
    notes: '',
  });

  // Batch Production Run State
  const [prodForm, setProdForm] = useState({
    finishedGoodId: '',
    quantityToProduce: '',
    destinationLocation: 'Production Floor' as 'Production Floor' | 'Finished Store',
    batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
    notes: '',
  });
  const [prodSubmitting, setProdSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txnsRes, fgRes, rmRes, pmRes] = await Promise.all([
        api.get('/stock-transactions', {
          params: {
            itemType: itemTypeFilter !== 'all' ? itemTypeFilter : undefined,
            reason: reasonFilter !== 'all' ? reasonFilter : undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            search: search || undefined,
          },
        }),
        api.get('/finished-goods'),
        api.get('/raw-materials'),
        api.get('/packing-materials'),
      ]);

      if (txnsRes.data.success) setTransactions(txnsRes.data.data);
      if (fgRes.data.success) setFinishedGoods(fgRes.data.data);
      if (rmRes.data.success) setRawMaterials(rmRes.data.data);
      if (pmRes.data.success) setPackingMaterials(pmRes.data.data);
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [itemTypeFilter, reasonFilter, startDate, endDate]);

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/stock-transactions', {
        ...movementForm,
        quantity: Number(movementForm.quantity),
      });

      if (res.data.success) {
        setIsMovementModalOpen(false);
        fetchData();
        setMovementForm({
          itemType: 'FinishedGood',
          itemId: '',
          transactionType: 'IN',
          reason: 'Purchase',
          quantity: '',
          location: 'Production Floor',
          fromLocation: 'Production Floor',
          toLocation: 'Finished Store',
          referenceNumber: '',
          notes: '',
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error recording movement');
    }
  };

  const handleExecuteProductionRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.finishedGoodId || !prodForm.quantityToProduce) return;

    try {
      setProdSubmitting(true);
      const res = await api.post('/stock-transactions/production-run', {
        finishedGoodId: prodForm.finishedGoodId,
        quantityToProduce: Number(prodForm.quantityToProduce),
        destinationLocation: prodForm.destinationLocation,
        batchNumber: prodForm.batchNumber,
        notes: prodForm.notes,
      });

      if (res.data.success) {
        setIsProductionModalOpen(false);
        alert(
          `Production successful! Batch ${prodForm.batchNumber} finished. Materials deducted and Finished Goods added.`
        );
        fetchData();
        setProdForm({
          finishedGoodId: '',
          quantityToProduce: '',
          destinationLocation: 'Production Floor',
          batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
          notes: '',
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Production execution failed');
    } finally {
      setProdSubmitting(false);
    }
  };

  const selectedFGForProduction = finishedGoods.find((f) => f._id === prodForm.finishedGoodId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Central Stock In / Out Operations Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit-safe real-time stock movements across Floor, Store, and Warehouses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('admin', 'production_manager') && (
            <button
              onClick={() => setIsProductionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Record Batch Production Run</span>
            </button>
          )}

          {hasRole('admin', 'production_manager', 'store_keeper') && (
            <button
              onClick={() => setIsMovementModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual Stock Move</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Date Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Search code, item, batch..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Item Type */}
          <div>
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Item Categories</option>
              <option value="FinishedGood">Finished Goods</option>
              <option value="RawMaterial">Raw Materials</option>
              <option value="PackingMaterial">Packing Materials</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Movement Reasons</option>
              <option value="Production">Production Run</option>
              <option value="Purchase">Purchase (GRN)</option>
              <option value="Sales">Sales Dispatch</option>
              <option value="Floor_Transfer">Floor ↔ Store Transfer</option>
              <option value="Adjustment">Adjustment</option>
              <option value="Wastage">Wastage / Scrap</option>
              <option value="Return">Return</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {}
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch {}
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer [color-scheme:dark]"
            />
          </div>
        </div>
      </Card>

      {/* Transactions Ledger Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-bold">Txn Code</th>
                <th className="py-3 px-4 font-bold">Date & Time</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Item Description</th>
                <th className="py-3 px-4 font-bold">Type</th>
                <th className="py-3 px-4 font-bold">Reason</th>
                <th className="py-3 px-4 font-bold">Quantity</th>
                <th className="py-3 px-4 font-bold">Movement Flow</th>
                <th className="py-3 px-4 font-bold">Reference #</th>
                <th className="py-3 px-4 font-bold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((txn) => {
                const isFloorTransfer =
                  txn.reason === 'Floor_Transfer' || txn.transactionType === 'TRANSFER';

                return (
                  <tr key={txn._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-300">
                      {txn.transactionNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(txn.transactionDate).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {txn.itemType === 'FinishedGood'
                          ? 'FG'
                          : txn.itemType === 'RawMaterial'
                          ? 'RM'
                          : 'PM'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{txn.itemName}</p>
                      <p className="text-[10px] font-mono text-slate-500">{txn.itemSku}</p>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-slate-300">
                      {txn.reason.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">
                      {txn.quantity} {txn.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {isFloorTransfer
                        ? `${txn.fromLocation || 'Floor'} → ${txn.toLocation || 'Store'}`
                        : txn.toLocation || txn.fromLocation || 'Store'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {txn.referenceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{txn.performedByName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Production Run Execution Modal */}
      <Modal
        isOpen={isProductionModalOpen}
        onClose={() => setIsProductionModalOpen(false)}
        title="Execute Batch Production Run"
        subtitle="Deduct Raw Materials and Packing Materials automatically according to BOM recipe"
      >
        <form onSubmit={handleExecuteProductionRun} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Select Finished Good SKU
            </label>
            <select
              value={prodForm.finishedGoodId}
              onChange={(e) => setProdForm({ ...prodForm, finishedGoodId: e.target.value })}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose Product to Produce --</option>
              {finishedGoods.map((fg) => (
                <option key={fg._id} value={fg._id}>
                  {fg.sku} - {fg.name} ({fg.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Quantity to Produce ({selectedFGForProduction?.unit || 'Units'})
              </label>
              <input
                type="number"
                min="1"
                value={prodForm.quantityToProduce}
                onChange={(e) => setProdForm({ ...prodForm, quantityToProduce: e.target.value })}
                placeholder="e.g. 500"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={prodForm.batchNumber}
                onChange={(e) => setProdForm({ ...prodForm, batchNumber: e.target.value })}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Destination Finished Stock Location
            </label>
            <select
              value={prodForm.destinationLocation}
              onChange={(e) =>
                setProdForm({
                  ...prodForm,
                  destinationLocation: e.target.value as any,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="Production Floor">Production Floor Stock (Staging/Packing line)</option>
              <option value="Finished Store">Finished Store Stock (Direct to Central Store)</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <span className="font-bold">System Automation:</span> On submission, the server verifies current stock of required RM & PM, automatically logs OUT transactions for all consumed materials, and logs an IN transaction for the finished product!
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsProductionModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={prodSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
            >
              {prodSubmitting ? 'Processing Batch...' : 'Confirm Production Run'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manual Stock Move Modal */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Record Stock In / Out"
        subtitle="Log general receipts, sales dispatch, or adjustments"
      >
        <form onSubmit={handleRecordMovement} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(['FinishedGood', 'RawMaterial', 'PackingMaterial'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMovementForm({ ...movementForm, itemType: type, itemId: '' })}
                className={`py-2 text-xs font-semibold rounded-xl border text-center transition-all ${
                  movementForm.itemType === type
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {type === 'FinishedGood'
                  ? 'Finished Good'
                  : type === 'RawMaterial'
                  ? 'Raw Material'
                  : 'Packing'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Select Item</label>
            <select
              value={movementForm.itemId}
              onChange={(e) => setMovementForm({ ...movementForm, itemId: e.target.value })}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose Item --</option>
              {movementForm.itemType === 'FinishedGood' &&
                finishedGoods.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.sku} - {f.name}
                  </option>
                ))}
              {movementForm.itemType === 'RawMaterial' &&
                rawMaterials.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.sku} - {r.name} ({r.currentStock} {r.unit})
                  </option>
                ))}
              {movementForm.itemType === 'PackingMaterial' &&
                packingMaterials.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.sku} - {p.name} ({p.currentStock} {p.unit})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Direction</label>
              <select
                value={movementForm.transactionType}
                onChange={(e) =>
                  setMovementForm({ ...movementForm, transactionType: e.target.value as any })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="IN">Stock IN (+)</option>
                <option value="OUT">Stock OUT (-)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reason</label>
              <select
                value={movementForm.reason}
                onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Purchase">Purchase (GRN)</option>
                <option value="Sales">Sales Dispatch</option>
                <option value="Adjustment">Adjustment</option>
                <option value="Wastage">Wastage / Scrap</option>
                <option value="Return">Return</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Quantity</label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                placeholder="e.g. 100"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Reference #</label>
              <input
                type="text"
                value={movementForm.referenceNumber}
                onChange={(e) =>
                  setMovementForm({ ...movementForm, referenceNumber: e.target.value })
                }
                placeholder="PO / Dispatch #"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Post Transaction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
