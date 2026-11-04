import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { BlendStock, BOMRun, FinishedGood, RawMaterial, PackingMaterial, BOM } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  FlaskConical,
  Package,
  Boxes,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowDownToLine,
  Filter,
  Leaf,
  Scale,
  Edit2,
} from 'lucide-react';

export const BlendBOMPipeline: React.FC = () => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'blends' | 'bom-wip' | 'pipeline-overview'>('pipeline-overview');
  const [divisionFilter, setDivisionFilter] = useState<'All' | 'Fadna Tea' | 'Fadna Life Science'>('All');
  const [search, setSearch] = useState('');

  // Data states
  const [blends, setBlends] = useState<BlendStock[]>([]);
  const [bomRuns, setBOMRuns] = useState<BOMRun[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([]);
  const [boms, setBOMs] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isBlendModalOpen, setIsBlendModalOpen] = useState(false);
  const [isBOMRunModalOpen, setIsBOMRunModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isEditBlendModalOpen, setIsEditBlendModalOpen] = useState(false);
  const [selectedBlendForEdit, setSelectedBlendForEdit] = useState<BlendStock | null>(null);

  // Blend Form State
  const [blendForm, setBlendForm] = useState({
    blendCode: '',
    blendName: '',
    division: 'Fadna Tea' as 'Fadna Tea' | 'Fadna Life Science',
    blendType: 'Master Blend' as 'Master Blend' | 'Sub-Blend' | 'Extraction',
    stageName: '',
    targetFinishedGoodId: '',
    totalWeight: 40,
    blendGramsPerFinishedUnit: 40,
    notes: '',
    ingredients: [] as Array<{ rawMaterialId: string; quantity: number; percentage: number; unit: string }>,
  });

  // Edit Blend Form State
  const [editBlendForm, setEditBlendForm] = useState({
    blendCode: '',
    blendName: '',
    status: 'In Stock' as 'In Stock' | 'Partially Consumed' | 'Depleted',
    availableWeight: 0,
    notes: '',
  });

  const openEditBlendModal = (blend: BlendStock) => {
    setSelectedBlendForEdit(blend);
    setEditBlendForm({
      blendCode: blend.blendCode,
      blendName: blend.blendName,
      status: blend.status,
      availableWeight: blend.availableWeight,
      notes: blend.notes || '',
    });
    setIsEditBlendModalOpen(true);
  };

  const handleUpdateBlend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlendForEdit) return;
    try {
      setSubmitting(true);
      const res = await api.put(`/blends/${selectedBlendForEdit._id}`, editBlendForm);
      if (res.data.success) {
        setActionMessage({ type: 'success', text: res.data.message });
        setIsEditBlendModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Error updating blend' });
    } finally {
      setSubmitting(false);
    }
  };

  // BOM Run Form State
  const [bomRunForm, setBOMRunForm] = useState({
    bomName: '',
    blendStockId: '',
    blendWeightConsumed: 10,
    bomProductCount: 250,
    notes: '',
    packingMaterials: [] as Array<{ packingMaterialId: string; quantity: number; unit: string }>,
  });

  // Transfer BOM to FG Form State
  const [selectedBOMRunForTransfer, setSelectedBOMRunForTransfer] = useState<BOMRun | null>(null);
  const [transferForm, setTransferForm] = useState({
    transferQuantity: 100,
    targetLocation: 'Production Floor' as 'Production Floor' | 'Finished Store',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [blendsRes, bomRunsRes, fgRes, rmRes, pmRes, bomsRes] = await Promise.all([
        api.get('/blends', { params: { division: divisionFilter !== 'All' ? divisionFilter : undefined } }),
        api.get('/bom-runs', { params: { division: divisionFilter !== 'All' ? divisionFilter : undefined } }),
        api.get('/finished-goods'),
        api.get('/raw-materials'),
        api.get('/packing-materials'),
        api.get('/boms'),
      ]);

      if (blendsRes.data.success) setBlends(blendsRes.data.data);
      if (bomRunsRes.data.success) setBOMRuns(bomRunsRes.data.data);
      if (fgRes.data.success) setFinishedGoods(fgRes.data.data);
      if (rmRes.data.success) setRawMaterials(rmRes.data.data);
      if (pmRes.data.success) setPackingMaterials(pmRes.data.data);
      if (bomsRes.data.success) setBOMs(bomsRes.data.data);
    } catch (err: any) {
      console.error('Failed to load pipeline data:', err);
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Error loading pipeline data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [divisionFilter]);

  // Open Blend Modal
  const openNewBlendModal = (preselectedFGId?: string) => {
    const fg = finishedGoods.find((f) => f._id === preselectedFGId) || finishedGoods[0];
    const matchingBOM = boms.find((b) => (b.finishedGood as any)?._id === fg?._id);

    const defaultWeight = 40;
    let initialIngredients: Array<{ rawMaterialId: string; quantity: number; percentage: number; unit: string }> = [];
    if (matchingBOM && matchingBOM.rawMaterials && matchingBOM.rawMaterials.length > 0) {
      const bomTotalRaw = matchingBOM.rawMaterials.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      initialIngredients = matchingBOM.rawMaterials.map((r) => {
        let pct = Number(r.percentage) || 0;
        if (pct <= 0 && bomTotalRaw > 0) {
          pct = Number(((Number(r.quantity || 0) / bomTotalRaw) * 100).toFixed(1));
        }
        const qty = Number(((defaultWeight * pct) / 100).toFixed(2));
        return {
          rawMaterialId: (r.rawMaterial as any)?._id || (r.rawMaterial as any),
          quantity: qty > 0 ? qty : Number(r.quantity) || 1,
          percentage: pct,
          unit: r.unit || 'kg',
        };
      });
    } else if (rawMaterials.length > 0) {
      initialIngredients = [{ rawMaterialId: rawMaterials[0]._id, quantity: defaultWeight, percentage: 100, unit: 'kg' }];
    }

    const defaultGrams = matchingBOM?.blendGramsPerUnit || (fg?.division === 'Fadna Life Science' ? 30 : 40);

    const count = blends.length + 1;
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suggestedBlendCode = `BLD-${todayStr}-${count.toString().padStart(4, '0')}`;

    setBlendForm({
      blendCode: suggestedBlendCode,
      blendName: fg ? `${fg.name} Master Blend Batch #${new Date().toISOString().slice(2, 10).replace(/-/g, '')}` : '',
      division: (fg?.division as any) || 'Fadna Tea',
      blendType: 'Master Blend',
      stageName: '',
      targetFinishedGoodId: fg?._id || '',
      totalWeight: defaultWeight,
      blendGramsPerFinishedUnit: defaultGrams,
      notes: 'Initial production batch issued to Blending with percentage ratio formulation.',
      ingredients: initialIngredients,
    });

    setIsBlendModalOpen(true);
  };

  // Auto-recalculate ingredient weights when total blend weight changes
  const handleTotalWeightChange = (newTotalWeight: number) => {
    const validWeight = Math.max(0, newTotalWeight);
    const updatedIngredients = blendForm.ingredients.map((ing) => {
      const pct = Number(ing.percentage) || 0;
      const qty = pct > 0 ? Number(((validWeight * pct) / 100).toFixed(2)) : ing.quantity;
      return { ...ing, quantity: qty };
    });
    setBlendForm({
      ...blendForm,
      totalWeight: validWeight,
      ingredients: updatedIngredients,
    });
  };

  // Ingredient percentage changed -> auto-update quantity (kg)
  const handleIngredientPercentageChange = (idx: number, newPct: number) => {
    const updated = [...blendForm.ingredients];
    const totalW = Number(blendForm.totalWeight) || 0;
    const pct = Math.max(0, newPct);
    const qty = totalW > 0 ? Number(((totalW * pct) / 100).toFixed(2)) : updated[idx].quantity;
    updated[idx] = {
      ...updated[idx],
      percentage: pct,
      quantity: qty,
    };
    setBlendForm({ ...blendForm, ingredients: updated });
  };

  // Ingredient quantity (kg) changed -> auto-update percentage (%)
  const handleIngredientQuantityChange = (idx: number, newQty: number) => {
    const updated = [...blendForm.ingredients];
    const totalW = Number(blendForm.totalWeight) || 0;
    const qty = Math.max(0, newQty);
    const pct = totalW > 0 ? Number(((qty / totalW) * 100).toFixed(1)) : 0;
    updated[idx] = {
      ...updated[idx],
      quantity: qty,
      percentage: pct,
    };
    setBlendForm({ ...blendForm, ingredients: updated });
  };

  // Normalize all percentages proportionally to 100%
  const normalizeBlendPercentages = () => {
    const totalPct = blendForm.ingredients.reduce((sum, ing) => sum + (Number(ing.percentage) || 0), 0);
    if (totalPct <= 0) return;
    const totalW = Number(blendForm.totalWeight) || 0;
    const updated = blendForm.ingredients.map((ing) => {
      const normPct = Number((((Number(ing.percentage) || 0) / totalPct) * 100).toFixed(1));
      const normQty = totalW > 0 ? Number(((totalW * normPct) / 100).toFixed(2)) : ing.quantity;
      return {
        ...ing,
        percentage: normPct,
        quantity: normQty,
      };
    });
    setBlendForm({ ...blendForm, ingredients: updated });
  };

  // Live Formula Balance Percentage sum
  const formulaTotalPercentage = blendForm.ingredients.reduce(
    (sum, ing) => sum + (Number(ing.percentage) || 0),
    0
  );

  // Open BOM Run Modal
  const openNewBOMRunModal = (preselectedBlend?: BlendStock) => {
    const blend = preselectedBlend || blends.find((b) => b.availableWeight > 0) || blends[0];
    if (!blend) {
      alert('Please create a Blend first before creating a BOM Packing Run.');
      return;
    }

    const targetFGId = typeof blend.targetFinishedGood === 'object' ? (blend.targetFinishedGood as any)._id : blend.targetFinishedGood;
    const matchingBOM = boms.find((b) => (b.finishedGood as any)?._id === targetFGId);

    const weightToConsume = Math.min(10, blend.availableWeight || 10);
    const grams = blend.blendGramsPerFinishedUnit || 40;
    const initialProductCount = Math.floor((weightToConsume * 1000) / grams);

    let initialPMs: Array<{ packingMaterialId: string; quantity: number; unit: string }> = [];
    if (matchingBOM && matchingBOM.packingMaterials && matchingBOM.packingMaterials.length > 0) {
      const ratio = initialProductCount / (matchingBOM.batchSize || 100);
      initialPMs = matchingBOM.packingMaterials.map((p) => ({
        packingMaterialId: (p.packingMaterial as any)?._id || (p.packingMaterial as any),
        quantity: Math.ceil((p.quantity || 1) * ratio),
        unit: p.unit || 'Pcs',
      }));
    } else if (packingMaterials.length > 0) {
      initialPMs = [
        { packingMaterialId: packingMaterials[2]?._id || packingMaterials[0]._id, quantity: initialProductCount, unit: 'Pcs' },
      ];
    }

    setBOMRunForm({
      bomName: `${blend.targetFinishedGoodName} Packaging Run #${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      blendStockId: blend._id,
      blendWeightConsumed: weightToConsume,
      bomProductCount: initialProductCount,
      notes: `Formulated from Blend: ${blend.blendName}`,
      packingMaterials: initialPMs,
    });

    setIsBOMRunModalOpen(true);
  };

  // Open Transfer to FG Modal
  const openTransferModal = (bomRun: BOMRun) => {
    setSelectedBOMRunForTransfer(bomRun);
    setTransferForm({
      transferQuantity: bomRun.availableBOMCount,
      targetLocation: 'Production Floor',
      notes: `Completed transfer from BOM Run ${bomRun.bomRunNumber}`,
    });
    setIsTransferModalOpen(true);
  };

  // Submit Blend Creation
  const handleCreateBlend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/blends', blendForm);
      if (res.data.success) {
        setActionMessage({ type: 'success', text: res.data.message });
        setIsBlendModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Error creating blend' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit BOM Run Creation
  const handleCreateBOMRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/bom-runs', bomRunForm);
      if (res.data.success) {
        setActionMessage({ type: 'success', text: res.data.message });
        setIsBOMRunModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Error creating BOM run' });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Transfer BOM to Finished Goods
  const handleTransferToFG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOMRunForTransfer) return;
    try {
      setSubmitting(true);
      const res = await api.post(`/bom-runs/${selectedBOMRunForTransfer._id}/transfer-to-fg`, transferForm);
      if (res.data.success) {
        setActionMessage({ type: 'success', text: res.data.message });
        setIsTransferModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || 'Error transferring to finished goods' });
    } finally {
      setSubmitting(false);
    }
  };

  // Live calculation for predicted product count in Blend Modal
  const calculatedLivePredictedCount = Math.floor(
    (Number(blendForm.totalWeight || 0) * 1000) / Number(blendForm.blendGramsPerFinishedUnit || 40)
  );

  // Summary Metrics
  const activeBlendsCount = blends.filter((b) => b.availableWeight > 0).length;
  const totalAvailableBlendWeightKg = blends.reduce((sum, b) => sum + (b.availableWeight || 0), 0);
  const totalPredictableUnitsInBlend = blends.reduce((sum, b) => sum + (b.predictedProductCount || 0), 0);

  const activeBOMRunsCount = bomRuns.filter((r) => r.availableBOMCount > 0).length;
  const totalUnitsInBOMStage = bomRuns.reduce((sum, r) => sum + (r.availableBOMCount || 0), 0);

  const totalFGStock = finishedGoods
    .filter((fg) => divisionFilter === 'All' || fg.division === divisionFilter)
    .reduce((sum, fg) => sum + (fg.totalStock || 0), 0);

  // Filtered lists
  const filteredBlends = blends.filter((b) => {
    if (search && !b.blendName.toLowerCase().includes(search.toLowerCase()) && !b.blendCode.toLowerCase().includes(search.toLowerCase()) && !b.targetFinishedGoodName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredBOMRuns = bomRuns.filter((r) => {
    if (search && !r.bomName.toLowerCase().includes(search.toLowerCase()) && !r.bomRunNumber.toLowerCase().includes(search.toLowerCase()) && !r.finishedGoodName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-6 rounded-2xl border border-emerald-900/30 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              End-to-End Manufacturing Workflow
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-medium">Stage Traceability & Yield Prediction</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-emerald-400 animate-pulse" />
            Production Pipeline: Blends & BOM WIP
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Track material transformation through all 3 stages: <strong className="text-slate-200">Raw Materials Out</strong> ➔ <strong className="text-emerald-300">Blend Stock (Yield Predicted)</strong> ➔ <strong className="text-cyan-300">BOM Packaging WIP</strong> ➔ <strong className="text-amber-300">Finished Goods Stock (BOM Count Reduced)</strong>.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => openNewBlendModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Blend</span>
          </button>
          <button
            onClick={() => openNewBOMRunModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50 transition-all active:scale-95"
          >
            <Package className="w-4 h-4" />
            <span>New BOM Packing Run</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Pipeline Flow Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stage 1 Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-400" />
              Stage 1: Raw Materials
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Issued OUT</span>
          </div>
          <div>
            <div className="text-xl font-black text-white">{rawMaterials.length} Raw Herbs & Spices</div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              When raw materials are issued OUT, stock reduces and transfers directly into named Blend Stock.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Formula conversion ready</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Stage 2 Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-600/40 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
              Stage 2: Blend Stock
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {activeBlendsCount} Active
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400">{totalAvailableBlendWeightKg.toFixed(1)} kg</div>
            <div className="text-xs font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Yield: ~{totalPredictableUnitsInBlend.toLocaleString()} Predictable Units
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Every blend is saved with batch name & predicted finished product count.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-900/40 flex items-center justify-between text-xs text-cyan-400 font-semibold">
            <span>Move to BOM with PM</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Stage 3 Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-950/40 to-slate-900 border border-cyan-600/40 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              Stage 3: BOM Packaging WIP
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {activeBOMRunsCount} In BOM Stage
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-cyan-400">{totalUnitsInBOMStage.toLocaleString()} Units</div>
            <div className="text-xs font-bold text-cyan-300 mt-0.5">Packaged WIP Product Count</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Blend combined with packing materials (cartons, foils, filter rolls).
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-cyan-900/40 flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>Transfer to FG Stock</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Stage 4 Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/30 to-slate-900 border border-amber-600/30 relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              Stage 4: Finished Goods
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Dual Store
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400">{totalFGStock.toLocaleString()} Packs</div>
            <div className="text-xs font-bold text-amber-300/80 mt-0.5">Floor & Store Total</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Coming to Finished Goods automatically <strong className="text-rose-300">reduces BOM Count</strong>!
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-900/40 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Sales & Dispatch Ready</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('pipeline-overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pipeline-overview'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('blends')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'blends'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Blend Stock Register ({blends.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bom-wip')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'bom-wip'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>BOM WIP Register ({bomRuns.length})</span>
          </button>
        </div>

        {/* Division Filter & Search */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Division Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setDivisionFilter('All')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                divisionFilter === 'All' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDivisionFilter('Fadna Tea')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                divisionFilter === 'Fadna Tea' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🍃 Tea
            </button>
            <button
              onClick={() => setDivisionFilter('Fadna Life Science')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                divisionFilter === 'Fadna Life Science' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔬 Life Science
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search blends & BOMs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <button
            onClick={() => fetchData()}
            title="Refresh Data"
            className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'pipeline-overview' && (
        <div className="space-y-6">
          {/* Quick Step Action Guide */}
          <Card className="bg-slate-900/60 border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Standard Operating Procedure (SOP): From Raw Herb to Commercial Finished Pack
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/30">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                  Create Named Blend
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Issue Raw Materials from warehouse. Name the blend (e.g. <em>Shape-Up Herbal Master Blend</em>). The system automatically predicts the finished pack count using product formula.
                </p>
                <button
                  onClick={() => openNewBlendModal()}
                  className="mt-3 w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold transition-all text-[11px]"
                >
                  + Issue RM & Create Blend
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-900/30">
                <div className="flex items-center gap-2 text-cyan-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px]">2</span>
                  Move Blend to BOM with Packaging
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Consume blend weight from Blend Stock. Combine with monocartons, barrier pouches, and tea bags. The output is saved in the BOM WIP stage with live BOM count.
                </p>
                <button
                  onClick={() => openNewBOMRunModal()}
                  className="mt-3 w-full py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white font-semibold transition-all text-[11px]"
                >
                  + Run BOM Packing Process
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-900/30">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">3</span>
                  Transfer to Finished Goods Stock
                </div>
                <p className="text-slate-400 leading-relaxed">
                  When BOM units complete packing line QA, transfer them to Finished Goods (Production Floor or Finished Store). This <strong className="text-white">automatically reduces BOM count</strong>!
                </p>
                <button
                  onClick={() => setActiveTab('bom-wip')}
                  className="mt-3 w-full py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold transition-all text-[11px]"
                >
                  View Active BOMs to Transfer
                </button>
              </div>
            </div>
          </Card>

          {/* Active Blends Ready for BOM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                Active Blends Ready for BOM Packaging ({activeBlendsCount})
              </h2>
              <button
                onClick={() => setActiveTab('blends')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                View All Blends →
              </button>
            </div>

            {blends.filter((b) => b.availableWeight > 0).length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                No active blend stock remaining. Click &quot;+ New Blend&quot; to issue raw materials and create a blend.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {blends
                  .filter((b) => b.availableWeight > 0)
                  .map((b) => (
                    <div
                      key={b._id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-600/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono text-emerald-400 font-bold">{b.blendCode}</span>
                            <button
                              type="button"
                              onClick={() => openEditBlendModal(b)}
                              title="Edit Blend / Unique ID"
                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.division === 'Fadna Tea'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}
                          >
                            {b.division}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{b.blendName}</h4>
                        <div className="text-xs text-slate-400 mb-3">
                          Target SKU: <strong className="text-slate-200">{b.targetFinishedGoodName}</strong>
                        </div>

                        {/* Quantity and Yield box */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Available Weight:</span>
                            <span className="font-bold text-white">
                              {b.availableWeight} / {b.totalWeight} kg
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Formula Yield Factor:</span>
                            <span className="text-slate-300 font-medium">{b.blendGramsPerFinishedUnit}g / pack</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Predictable Product:
                            </span>
                            <span className="text-emerald-300 text-sm">
                              ~{b.predictedProductCount.toLocaleString()} Packs
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          Ingredients: {b.ingredients?.map((i) => `${i.rawMaterialName} (${i.quantity}${i.unit})`).join(', ')}
                        </div>
                      </div>

                      <button
                        onClick={() => openNewBOMRunModal(b)}
                        className="mt-4 w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Move to BOM Packaging</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Active BOM WIP Ready for Finished Goods */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                Active BOM Stage WIP (Available for Finished Goods Stock) ({activeBOMRunsCount})
              </h2>
              <button
                onClick={() => setActiveTab('bom-wip')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                View All BOM Runs →
              </button>
            </div>

            {bomRuns.filter((r) => r.availableBOMCount > 0).length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs">
                No active packaged WIP in BOM stage. Create a BOM packing run from available blend stock.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bomRuns
                  .filter((r) => r.availableBOMCount > 0)
                  .map((r) => (
                    <div
                      key={r._id}
                      className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-600/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono text-cyan-400 font-bold">{r.bomRunNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {r.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{r.bomName}</h4>
                        <div className="text-xs text-slate-400 mb-3">
                          Product: <strong className="text-slate-200">{r.finishedGoodName}</strong>
                        </div>

                        {/* BOM WIP Counts */}
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 mb-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Total Packaged in BOM:</span>
                            <span className="font-bold text-white">{r.bomProductCount} Units</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Transferred to FG:</span>
                            <span className="text-amber-400 font-bold">{r.transferredToFGCount || 0} Units</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold">
                            <span className="text-cyan-400">Available in BOM:</span>
                            <span className="text-cyan-300 text-sm font-black">{r.availableBOMCount} Units</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          From Blend: <span className="text-slate-300">{r.blendName}</span> ({r.blendWeightConsumed} kg consumed)
                        </div>
                      </div>

                      <button
                        onClick={() => openTransferModal(r)}
                        className="mt-4 w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        <span>Transfer to Finished Goods (Reduces BOM)</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLEND STOCK REGISTER TAB */}
      {activeTab === 'blends' && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-emerald-400" />
                Blend Stock Master Register
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Saved herbal blends created from Raw Materials OUT. Displays remaining weight & predicted product count.
              </p>
            </div>
            <button
              onClick={() => openNewBlendModal()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create New Blend</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Blend Code / Date</th>
                  <th className="py-3 px-4">Blend Name</th>
                  <th className="py-3 px-4">Division</th>
                  <th className="py-3 px-4">Target Finished Good</th>
                  <th className="py-3 px-4 text-right">Available Weight</th>
                  <th className="py-3 px-4 text-right">Total Batch Weight</th>
                  <th className="py-3 px-4 text-right">Formula Yield</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-400">Predicted Product Count</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBlends.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      No blend stock records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredBlends.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-emerald-400">{b.blendCode}</div>
                        <div className="text-[10px] text-slate-500">
                          {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{b.blendName}</span>
                          {b.blendType === 'Extraction' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <FlaskConical className="w-2.5 h-2.5" />
                              Extraction
                            </span>
                          )}
                        </div>
                        {b.stageName && <div className="text-[10px] text-amber-400 font-medium">Stage: {b.stageName}</div>}
                        {b.notes && <div className="text-[10px] text-slate-400 font-normal">{b.notes}</div>}
                        {b.ingredients && b.ingredients.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {b.ingredients.map((ing, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700/60"
                              >
                                <span className="text-slate-400">{ing.rawMaterialName}</span>
                                <span className="text-emerald-400 font-bold">
                                  {ing.percentage ? `${ing.percentage}%` : `${ing.quantity}kg`}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.division === 'Fadna Tea'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          {b.division}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{b.targetFinishedGoodName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{b.targetFinishedGoodSku}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-300">
                        {b.availableWeight} {b.weightUnit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {b.totalWeight} {b.weightUnit}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300 font-medium">
                        {b.blendGramsPerFinishedUnit}g / pack
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                          {b.predictedProductCount.toLocaleString()} Packs
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === 'In Stock'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : b.status === 'Partially Consumed'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditBlendModal(b)}
                            title="Edit Blend / Unique ID"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {b.availableWeight > 0 ? (
                            <button
                              onClick={() => openNewBOMRunModal(b)}
                              className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white font-semibold text-[11px] transition-all"
                            >
                              Move to BOM →
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-600 font-medium">Depleted</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* BOM WIP REGISTER TAB */}
      {activeTab === 'bom-wip' && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400" />
                BOM Work-in-Progress (WIP) Register
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Packaged WIP items output from Blend + Packing Materials. Transferring to Finished Goods reduces available BOM count.
              </p>
            </div>
            <button
              onClick={() => openNewBOMRunModal()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create BOM Packing Run</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">BOM Run #</th>
                  <th className="py-3 px-4">BOM Run Name</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Source Blend</th>
                  <th className="py-3 px-4 text-right">Blend Consumed</th>
                  <th className="py-3 px-4 text-right">BOM Product Count</th>
                  <th className="py-3 px-4 text-right">Transferred to FG</th>
                  <th className="py-3 px-4 text-right font-bold text-cyan-400">Available in BOM Stage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBOMRuns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      No BOM WIP records found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredBOMRuns.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">{r.bomRunNumber}</td>
                      <td className="py-3 px-4 font-bold text-white">
                        {r.bomName}
                        <div className="text-[10px] text-slate-500">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{r.finishedGoodName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.finishedGoodSku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-300 font-medium">{r.blendName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{r.blendCode}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300 font-semibold">
                        {r.blendWeightConsumed} {r.blendWeightUnit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">{r.bomProductCount} Units</td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-400">
                        {r.transferredToFGCount || 0} Units
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                          {r.availableBOMCount} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'In BOM Stage'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : r.status === 'Partially Transferred'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.availableBOMCount > 0 ? (
                          <button
                            onClick={() => openTransferModal(r)}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white font-semibold text-[11px] transition-all flex items-center gap-1 ml-auto"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            <span>Transfer to FG</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE NEW BLEND FROM RAW MATERIALS             */}
      {/* ======================================================== */}
      <Modal isOpen={isBlendModalOpen} onClose={() => setIsBlendModalOpen(false)} title="Create Named Herbal Blend (Transfer from RM)">
        <form onSubmit={handleCreateBlend} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unique Blend ID / Code <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                required
                value={blendForm.blendCode}
                onChange={(e) => setBlendForm({ ...blendForm, blendCode: e.target.value.toUpperCase() })}
                placeholder="e.g. BLD-20261030-0001"
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">Editable unique blend identifier</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Blend Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={blendForm.blendName}
                onChange={(e) => setBlendForm({ ...blendForm, blendName: e.target.value })}
                placeholder="e.g. Shape-Up Master Herbal Blend Batch #1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Division</label>
              <select
                value={blendForm.division}
                onChange={(e) => setBlendForm({ ...blendForm, division: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="Fadna Tea">🍃 Fadna Tea</option>
                <option value="Fadna Life Science">🔬 Fadna Life Science</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Finished Good</label>
              <select
                value={blendForm.targetFinishedGoodId}
                onChange={(e) => {
                  const fg = finishedGoods.find((f) => f._id === e.target.value);
                  const matchingBOM = boms.find((b) => (b.finishedGood as any)?._id === fg?._id);
                  let ingredients = blendForm.ingredients;
                  const currentTotalWeight = Number(blendForm.totalWeight) || 40;
                  if (matchingBOM && matchingBOM.rawMaterials?.length > 0) {
                    const bomTotalRaw = matchingBOM.rawMaterials.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
                    ingredients = matchingBOM.rawMaterials.map((r) => {
                      let pct = Number(r.percentage) || 0;
                      if (pct <= 0 && bomTotalRaw > 0) {
                        pct = Number(((Number(r.quantity || 0) / bomTotalRaw) * 100).toFixed(1));
                      }
                      const qty = Number(((currentTotalWeight * pct) / 100).toFixed(2));
                      return {
                        rawMaterialId: (r.rawMaterial as any)?._id || (r.rawMaterial as any),
                        quantity: qty > 0 ? qty : Number(r.quantity) || 1,
                        percentage: pct,
                        unit: r.unit || 'kg',
                      };
                    });
                  }
                  setBlendForm({
                    ...blendForm,
                    targetFinishedGoodId: e.target.value,
                    division: (fg?.division as any) || blendForm.division,
                    blendName: fg ? `${fg.name} Master Blend Batch #${new Date().toISOString().slice(2, 10).replace(/-/g, '')}` : blendForm.blendName,
                    blendGramsPerFinishedUnit: matchingBOM?.blendGramsPerUnit || (fg?.division === 'Fadna Life Science' ? 30 : 40),
                    ingredients,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                {finishedGoods
                  .filter((fg) => fg.division === blendForm.division)
                  .map((fg) => (
                    <option key={fg._id} value={fg._id}>
                      {fg.sku} - {fg.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Multi-Stage Recipe Phase Selector if applicable */}
          {(() => {
            const currentFG = finishedGoods.find((f) => f._id === blendForm.targetFinishedGoodId);
            const currentBOM = boms.find((b) => (b.finishedGood as any)?._id === currentFG?._id);
            if (!currentBOM?.isMultiStage || !currentBOM.stages || currentBOM.stages.length === 0) return null;

            return (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                    Multi-Stage Extraction Phase Selection
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                    {blendForm.blendType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  This product utilizes multi-stage botanical extraction. Select whether you are preparing an intermediate botanical extract or compounding the master blend:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const currentTotalWeight = Number(blendForm.totalWeight) || 40;
                      const bomTotalRaw = currentBOM.rawMaterials.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
                      const ingredients = currentBOM.rawMaterials.map((r) => {
                        let pct = Number(r.percentage) || 0;
                        if (pct <= 0 && bomTotalRaw > 0) {
                          pct = Number(((Number(r.quantity || 0) / bomTotalRaw) * 100).toFixed(1));
                        }
                        const qty = Number(((currentTotalWeight * pct) / 100).toFixed(2));
                        return {
                          rawMaterialId: (r.rawMaterial as any)?._id || (r.rawMaterial as any),
                          quantity: qty > 0 ? qty : Number(r.quantity) || 1,
                          percentage: pct,
                          unit: r.unit || 'kg',
                        };
                      });
                      setBlendForm({
                        ...blendForm,
                        blendType: 'Master Blend',
                        stageName: '',
                        blendName: `${currentFG?.name} Master Blend Batch #${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
                        ingredients,
                      });
                    }}
                    className={`p-2 rounded-lg text-left text-xs border transition-all ${
                      blendForm.blendType === 'Master Blend'
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold">Master Finished Blend</div>
                    <div className="text-[10px] opacity-75">Compounding master formulation</div>
                  </button>

                  {currentBOM.stages.map((stage, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const stageWeight = stage.outputQuantity || 10;
                        const ingredients = stage.ingredients.map((ing) => {
                          const pct = ing.percentage || 0;
                          const qty = Number(((stageWeight * pct) / 100).toFixed(3));
                          return {
                            rawMaterialId: (ing.rawMaterial as any)?._id || (ing.rawMaterial as any),
                            quantity: qty > 0 ? qty : 1,
                            percentage: pct,
                            unit: ing.unit || 'kg',
                          };
                        });
                        setBlendForm({
                          ...blendForm,
                          blendType: 'Extraction',
                          stageName: stage.stageName,
                          totalWeight: stageWeight,
                          blendName: `${currentFG?.name} - ${stage.outputItemName || stage.stageName} Batch #${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
                          ingredients,
                        });
                      }}
                      className={`p-2 rounded-lg text-left text-xs border transition-all ${
                        blendForm.blendType === 'Extraction' && blendForm.stageName === stage.stageName
                          ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <FlaskConical className="w-3 h-3 text-amber-400" />
                        Stage {stage.stageNumber || idx + 1}: Extraction
                      </div>
                      <div className="text-[10px] opacity-75 truncate">{stage.stageName}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Blend Batch Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={blendForm.totalWeight}
                onChange={(e) => handleTotalWeightChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-emerald-800/80 rounded-xl px-3 py-2 text-sm text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Blend Weight per Pack (g)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={blendForm.blendGramsPerFinishedUnit}
                onChange={(e) => setBlendForm({ ...blendForm, blendGramsPerFinishedUnit: parseFloat(e.target.value) || 40 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Live Product Count Prediction Box */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Predictable Product Count of Blend
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Formula conversion: ({blendForm.totalWeight}kg × 1,000g) ÷ {blendForm.blendGramsPerFinishedUnit}g/unit
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-emerald-300">
                {calculatedLivePredictedCount.toLocaleString()} Packs
              </div>
              <span className="text-[10px] text-emerald-400/80 font-semibold uppercase">Estimated Output</span>
            </div>
          </div>

          {/* Raw Materials Deducted with Percentage Formulation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  Raw Materials Formulation Ratio (%) &amp; Stock Deduction
                </label>
                <p className="text-[10px] text-slate-400">
                  Enter recipe percentage (%) or kg — system synchronizes both automatically based on {blendForm.totalWeight}kg batch weight.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setBlendForm({
                    ...blendForm,
                    ingredients: [
                      ...blendForm.ingredients,
                      { rawMaterialId: rawMaterials[0]?._id || '', percentage: 10, quantity: Number(((blendForm.totalWeight * 10) / 100).toFixed(2)), unit: 'kg' },
                    ],
                  })
                }
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 rounded bg-emerald-950/40 border border-emerald-800"
              >
                + Add Herb
              </button>
            </div>

            {/* Formula Balance Indicator */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Formula Sum:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                    Math.abs(formulaTotalPercentage - 100) < 0.2
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : formulaTotalPercentage > 100
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {formulaTotalPercentage.toFixed(1)}% {Math.abs(formulaTotalPercentage - 100) < 0.2 ? '✓ 100% Balanced' : formulaTotalPercentage > 100 ? '⚠ Exceeds 100%' : '⚠ Under 100%'}
                </span>
              </div>
              {Math.abs(formulaTotalPercentage - 100) >= 0.2 && formulaTotalPercentage > 0 && (
                <button
                  type="button"
                  onClick={normalizeBlendPercentages}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold transition-all"
                >
                  Balance to 100%
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {blendForm.ingredients.map((item, idx) => {
                const matchedRM = rawMaterials.find((rm) => rm._id === item.rawMaterialId);
                const hasEnoughStock = matchedRM ? matchedRM.currentStock >= item.quantity : true;

                return (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                      hasEnoughStock ? 'bg-slate-950 border-slate-800' : 'bg-rose-950/20 border-rose-800/80'
                    }`}
                  >
                    {/* Herb Selector */}
                    <div className="flex-1 w-full sm:w-auto">
                      <select
                        value={item.rawMaterialId}
                        onChange={(e) => {
                          const updated = [...blendForm.ingredients];
                          updated[idx].rawMaterialId = e.target.value;
                          setBlendForm({ ...blendForm, ingredients: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {rawMaterials.map((rm) => (
                          <option key={rm._id} value={rm._id}>
                            {rm.name} (Stock: {rm.currentStock} {rm.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                      {/* Percentage Input */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={item.percentage ?? 0}
                          onChange={(e) => handleIngredientPercentageChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-14 bg-transparent text-right font-mono font-bold text-emerald-400 text-xs focus:outline-none"
                        />
                        <span className="text-[11px] font-bold text-slate-400">%</span>
                      </div>

                      {/* Weight in kg Input */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleIngredientQuantityChange(idx, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-transparent text-right font-mono font-bold text-white text-xs focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-400 font-mono">kg</span>
                      </div>

                      {/* Stock Status Badge */}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          hasEnoughStock
                            ? 'text-slate-400 bg-slate-900'
                            : 'text-rose-300 bg-rose-900/60 font-bold border border-rose-700'
                        }`}
                      >
                        {matchedRM ? (hasEnoughStock ? `Avail: ${matchedRM.currentStock}kg` : `Low! Max: ${matchedRM.currentStock}kg`) : ''}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = blendForm.ingredients.filter((_, i) => i !== idx);
                          setBlendForm({ ...blendForm, ingredients: updated });
                        }}
                        className="text-rose-400 hover:text-rose-300 text-xs px-1.5 py-1 rounded hover:bg-rose-500/10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Instructions</label>
            <textarea
              rows={2}
              value={blendForm.notes}
              onChange={(e) => setBlendForm({ ...blendForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsBlendModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Creating Blend...' : 'Create & Save Blend'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: CREATE BOM PACKING RUN (BLEND + PACKING MATERIALS) */}
      {/* ======================================================== */}
      <Modal isOpen={isBOMRunModalOpen} onClose={() => setIsBOMRunModalOpen(false)} title="Create BOM Packing Run (Blend + Packing Materials)">
        <form onSubmit={handleCreateBOMRun} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              BOM Run Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={bomRunForm.bomName}
              onChange={(e) => setBOMRunForm({ ...bomRunForm, bomName: e.target.value })}
              placeholder="e.g. Shape-Up Monocarton Packing Run #1"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Source Blend from Blend Stock <span className="text-rose-400">*</span>
            </label>
            <select
              value={bomRunForm.blendStockId}
              onChange={(e) => {
                const selectedBlend = blends.find((b) => b._id === e.target.value);
                if (selectedBlend) {
                  const weight = Math.min(10, selectedBlend.availableWeight || 10);
                  const count = Math.floor((weight * 1000) / (selectedBlend.blendGramsPerFinishedUnit || 40));
                  setBOMRunForm({
                    ...bomRunForm,
                    blendStockId: selectedBlend._id,
                    bomName: `${selectedBlend.targetFinishedGoodName} Packaging Run #${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
                    blendWeightConsumed: weight,
                    bomProductCount: count,
                  });
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              {blends.map((b) => (
                <option key={b._id} value={b._id} disabled={b.availableWeight <= 0}>
                  {b.blendCode} - {b.blendName} ({b.availableWeight}kg available, ~{b.predictedProductCount} packs)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Blend Weight to Consume (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={bomRunForm.blendWeightConsumed}
                onChange={(e) => {
                  const weight = parseFloat(e.target.value) || 0;
                  const currentBlend = blends.find((b) => b._id === bomRunForm.blendStockId);
                  const grams = currentBlend?.blendGramsPerFinishedUnit || 40;
                  const count = Math.floor((weight * 1000) / grams);
                  setBOMRunForm({
                    ...bomRunForm,
                    blendWeightConsumed: weight,
                    bomProductCount: count,
                  });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Product Count of BOM (Output Units)
              </label>
              <input
                type="number"
                min="1"
                required
                value={bomRunForm.bomProductCount}
                onChange={(e) => setBOMRunForm({ ...bomRunForm, bomProductCount: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold text-cyan-300"
              />
            </div>
          </div>

          {/* Packing Materials Deducted */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Packing Materials to Deduct (Boxes, Pouches, Shippers)
              </label>
              <button
                type="button"
                onClick={() =>
                  setBOMRunForm({
                    ...bomRunForm,
                    packingMaterials: [
                      ...bomRunForm.packingMaterials,
                      { packingMaterialId: packingMaterials[0]?._id || '', quantity: bomRunForm.bomProductCount, unit: 'Pcs' },
                    ],
                  })
                }
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                + Add Packing Item
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {bomRunForm.packingMaterials.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <select
                    value={item.packingMaterialId}
                    onChange={(e) => {
                      const updated = [...bomRunForm.packingMaterials];
                      updated[idx].packingMaterialId = e.target.value;
                      setBOMRunForm({ ...bomRunForm, packingMaterials: updated });
                    }}
                    className="flex-1 bg-transparent text-xs text-white focus:outline-none"
                  >
                    {packingMaterials.map((pm) => (
                      <option key={pm._id} value={pm._id}>
                        {pm.name} (Stock: {pm.currentStock} {pm.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...bomRunForm.packingMaterials];
                      updated[idx].quantity = parseInt(e.target.value) || 0;
                      setBOMRunForm({ ...bomRunForm, packingMaterials: updated });
                    }}
                    className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white text-right"
                  />
                  <span className="text-xs text-slate-400 font-mono">pcs</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = bomRunForm.packingMaterials.filter((_, i) => i !== idx);
                      setBOMRunForm({ ...bomRunForm, packingMaterials: updated });
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={bomRunForm.notes}
              onChange={(e) => setBOMRunForm({ ...bomRunForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsBOMRunModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950/50 flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{submitting ? 'Creating Run...' : 'Save BOM Run & Deduct PM'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: TRANSFER BOM WIP TO FINISHED GOODS STOCK        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer BOM to Finished Goods Stock (Reduces BOM Count)"
      >
        <form onSubmit={handleTransferToFG} className="space-y-4">
          {selectedBOMRunForTransfer && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">BOM Run:</span>
                <span className="font-mono font-bold text-cyan-400">{selectedBOMRunForTransfer.bomRunNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Product Line:</span>
                <span className="font-bold text-white">{selectedBOMRunForTransfer.finishedGoodName}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                <span className="text-slate-400">Current Available in BOM Stage:</span>
                <span className="font-black text-sm text-cyan-300">
                  {selectedBOMRunForTransfer.availableBOMCount} Units
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Quantity to Transfer to Finished Goods Stock <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={selectedBOMRunForTransfer?.availableBOMCount || 99999}
              required
              value={transferForm.transferQuantity}
              onChange={(e) => setTransferForm({ ...transferForm, transferQuantity: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
            />
            <p className="text-[11px] text-amber-300/80 mt-1">
              ⚠️ Transferred units will be credited to Finished Goods stock and deducted from the BOM count immediately.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Destination Finished Goods Location
            </label>
            <select
              value={transferForm.targetLocation}
              onChange={(e) => setTransferForm({ ...transferForm, targetLocation: e.target.value as any })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="Production Floor">Production Floor (Active Floor Stock)</option>
              <option value="Finished Store">Finished Store (Quarantine / Commercial Distribution Store)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Batch Label</label>
            <input
              type="text"
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950/50 flex items-center gap-1.5"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{submitting ? 'Transferring...' : 'Credit FG & Reduce BOM Count'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: EDIT BLEND & UNIQUE ID                          */}
      {/* ======================================================== */}
      <Modal isOpen={isEditBlendModalOpen} onClose={() => setIsEditBlendModalOpen(false)} title="Edit Herbal Blend & Unique ID">
        <form onSubmit={handleUpdateBlend} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Target Product</span>
              <span className="text-xs font-bold text-white">{selectedBlendForEdit?.targetFinishedGoodName}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                selectedBlendForEdit?.division === 'Fadna Tea'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}
            >
              {selectedBlendForEdit?.division}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Unique Blend ID / Code <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={editBlendForm.blendCode}
              onChange={(e) => setEditBlendForm({ ...editBlendForm, blendCode: e.target.value.toUpperCase() })}
              placeholder="e.g. BLD-20261030-0001"
              className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
            />
            <span className="text-[10px] text-slate-500 block mt-0.5">Custom unique blend identifier / batch SKU</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Blend Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={editBlendForm.blendName}
              onChange={(e) => setEditBlendForm({ ...editBlendForm, blendName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
              <select
                value={editBlendForm.status}
                onChange={(e) => setEditBlendForm({ ...editBlendForm, status: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="In Stock">In Stock</option>
                <option value="Partially Consumed">Partially Consumed</option>
                <option value="Depleted">Depleted</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Available Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editBlendForm.availableWeight}
                onChange={(e) => setEditBlendForm({ ...editBlendForm, availableWeight: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
            <textarea
              rows={2}
              value={editBlendForm.notes}
              onChange={(e) => setEditBlendForm({ ...editBlendForm, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditBlendModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-1.5"
            >
              <span>{submitting ? 'Saving...' : 'Save Blend Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BlendBOMPipeline;
