import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { BOM, FinishedGood, RawMaterial, PackingMaterial, BOMStage } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Workflow,
  Plus,
  Trash2,
  Boxes,
  Leaf,
  Package,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FlaskConical,
  Layers,
  Search,
  Percent,
  Scale,
  Edit,
  Sliders,
  ChevronDown,
  ChevronUp,
  Link2,
} from 'lucide-react';

export const BOMManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [packingMaterials, setPackingMaterials] = useState<PackingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [divisionFilter, setDivisionFilter] = useState<'All' | 'Fadna Tea' | 'Fadna Life Science'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Batch Scaling Simulation (Formula -> BOM converter)
  const [simulationBatchSize, setSimulationBatchSize] = useState<number>(100);
  const [showBatchScaler, setShowBatchScaler] = useState<boolean>(false);

  // Modal State for Add / Edit Product Formula
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editFGId, setEditFGId] = useState('');
  const [editFGName, setEditFGName] = useState('');
  const [editFormulaName, setEditFormulaName] = useState('');
  const [editVersion, setEditVersion] = useState('v1.0');
  const [editNotes, setEditNotes] = useState('');
  const [editGramsPerUnit, setEditGramsPerUnit] = useState(40);

  // Raw Materials in Formula (strictly by percentage, typed directly)
  const [editRawItems, setEditRawItems] = useState<
    Array<{ rawMaterial: string; materialName: string; percentage: number; wastagePercent: number }>
  >([]);

  // Multi-Stage Sub-Recipes
  const [editIsMultiStage, setEditIsMultiStage] = useState(false);
  const [editStages, setEditStages] = useState<BOMStage[]>([]);

  const handleDeleteFormula = async () => {
    if (!selectedBOM) return;
    const ok = window.confirm(`Are you sure you want to deactivate the Product Formula for "${selectedBOM.finishedGood?.name}"?`);
    if (!ok) return;
    try {
      const res = await api.delete(`/boms/${selectedBOM._id}`);
      if (res.data.success) {
        alert('Product Formula deactivated successfully');
        setSelectedBOM(null);
        await fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to deactivate formula');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bomRes, fgRes, rmRes, pmRes] = await Promise.all([
        api.get('/boms'),
        api.get('/finished-goods'),
        api.get('/raw-materials'),
        api.get('/packing-materials'),
      ]);

      if (bomRes.data.success) {
        setBoms(bomRes.data.data);
        if (bomRes.data.data.length > 0 && !selectedBOM) {
          setSelectedBOM(bomRes.data.data[0]);
        }
      }
      if (fgRes.data.success) setFinishedGoods(fgRes.data.data);
      if (rmRes.data.success) setRawMaterials(rmRes.data.data);
      if (pmRes.data.success) setPackingMaterials(pmRes.data.data);
    } catch (err) {
      console.error('Failed to load Product Formulas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open "Add Product Formula" Modal
  const openAddFormulaModal = () => {
    const fg = finishedGoods[0];
    const defaultGrams = fg?.division === 'Fadna Life Science' ? 100 : 40;

    setIsEditingExisting(false);
    setEditFGId(fg?._id || '');
    setEditFGName(fg?.name || '');
    setEditFormulaName(fg ? `${fg.name} Master Formulation` : '');
    setEditVersion('v1.0');
    setEditNotes('');
    setEditGramsPerUnit(defaultGrams);
    setEditIsMultiStage(false);
    setEditStages([]);

    // Default 1 raw material ready for typing with 100%
    setEditRawItems([
      {
        rawMaterial: '',
        materialName: '',
        percentage: 100,
        wastagePercent: 2.0,
      },
    ]);

    setIsModalOpen(true);
  };

  // Open "Edit Product Formula" Modal
  const openEditFormulaModal = () => {
    if (!selectedBOM) return;

    setIsEditingExisting(true);
    setEditFGId(selectedBOM.finishedGood._id);
    setEditFGName(selectedBOM.finishedGood.name || '');
    setEditFormulaName(selectedBOM.formulaName || `${selectedBOM.finishedGood.name} Master Formulation`);
    setEditVersion(selectedBOM.version || 'v1.0');
    setEditNotes(selectedBOM.notes || '');
    setEditGramsPerUnit(selectedBOM.blendGramsPerUnit || (selectedBOM.finishedGood?.division === 'Fadna Life Science' ? 100 : 40));
    setEditIsMultiStage(Boolean(selectedBOM.isMultiStage));
    setEditStages(selectedBOM.stages || []);

    const totalRawQty = selectedBOM.rawMaterials.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    setEditRawItems(
      selectedBOM.rawMaterials.map((r) => {
        let pct = Number(r.percentage) || 0;
        if (pct <= 0 && totalRawQty > 0) {
          pct = Number(((Number(r.quantity || 0) / totalRawQty) * 100).toFixed(3));
        }
        let rmName = '';
        if (typeof r.rawMaterial === 'object' && r.rawMaterial && (r.rawMaterial as any).name) {
          rmName = (r.rawMaterial as any).name;
        } else {
          const found = rawMaterials.find((m) => m._id === (r.rawMaterial as any));
          rmName = found ? found.name : String(r.rawMaterial || '');
        }
        return {
          rawMaterial: (r.rawMaterial as any)?._id || (r.rawMaterial as any) || '',
          materialName: rmName,
          percentage: pct,
          wastagePercent: r.wastagePercent !== undefined ? r.wastagePercent : 2.0,
        };
      })
    );

    setIsModalOpen(true);
  };

  // Sum of percentages in the current formula edit
  const formulaPercentageSum = editRawItems.reduce((sum, it) => sum + (Number(it.percentage) || 0), 0);

  // Auto-normalize percentages to 100%
  const handleNormalizePercentages = () => {
    if (formulaPercentageSum <= 0) return;
    const normalized = editRawItems.map((it) => ({
      ...it,
      percentage: Number((((Number(it.percentage) || 0) / formulaPercentageSum) * 100).toFixed(3)),
    }));
    setEditRawItems(normalized);
  };

  // Save Product Formula
  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedFg = finishedGoods.find(
        (f) =>
          f._id === editFGId ||
          f.name.toLowerCase() === editFGName.trim().toLowerCase() ||
          f.sku.toLowerCase() === editFGName.trim().toLowerCase()
      );
      const targetFG = selectedFg?._id || editFGId || editFGName.trim();
      if (!targetFG) {
        alert('Please enter a target product name.');
        return;
      }

      if (editRawItems.length === 0) {
        alert('Please add at least one raw material percentage to the formula.');
        return;
      }

      const nominalBatch = 100;
      const nominalGrams = Number(editGramsPerUnit) || (selectedFg?.division === 'Fadna Life Science' ? 100 : 40);
      const nominalBatchKg = (nominalBatch * nominalGrams) / 1000;

      const formattedRawItems = editRawItems
        .filter((r) => (r.materialName && r.materialName.trim()) || r.rawMaterial)
        .map((r) => {
          const pct = Number(r.percentage) || 0;
          const qty = Number(((nominalBatchKg * pct) / 100).toFixed(4)) || 0.001;
          const name = (r.materialName || '').trim();
          const matched = rawMaterials.find(
            (rm) =>
              rm.name.toLowerCase() === name.toLowerCase() ||
              rm.sku.toLowerCase() === name.toLowerCase() ||
              rm._id === r.rawMaterial
          );
          return {
            rawMaterial: matched ? matched._id : (r.rawMaterial || name),
            newMaterialName: matched ? undefined : name,
            percentage: pct,
            quantity: qty,
            unit: 'kg',
            wastagePercent: r.wastagePercent !== undefined ? Number(r.wastagePercent) : 2.0,
          };
        });

      if (formattedRawItems.length === 0) {
        alert('Please type the name of at least one raw material.');
        return;
      }

      const fgDivision = selectedFg?.division || 'Fadna Life Science';
      const fgName = selectedFg?.name || editFGName.trim() || editFormulaName.trim();

      const res = await api.post('/boms', {
        finishedGood: targetFG,
        formulaName: editFormulaName.trim() || `${fgName} Master Formulation`,
        division: fgDivision,
        blendGramsPerUnit: nominalGrams,
        batchSize: nominalBatch,
        unit: selectedFg?.unit || 'Packs',
        version: editVersion.trim() || 'v1.0',
        notes: editNotes,
        rawMaterials: formattedRawItems,
        packingMaterials: [],
        isMultiStage: editIsMultiStage,
        stages: editIsMultiStage ? editStages : [],
      });

      if (res.data.success) {
        setIsModalOpen(false);
        await fetchData();
        setSelectedBOM(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving Product Formula');
    }
  };

  // Filter formulas
  const filteredBOMs = boms.filter((bom) => {
    const div = bom.division || (bom.finishedGood as any)?.division || 'Fadna Tea';
    if (divisionFilter !== 'All' && div !== divisionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = bom.finishedGood?.name?.toLowerCase() || '';
      const sku = bom.finishedGood?.sku?.toLowerCase() || '';
      const shortCode = (bom.finishedGood as any)?.shortCode?.toLowerCase() || '';
      const formulaName = bom.formulaName?.toLowerCase() || '';
      return name.includes(q) || sku.includes(q) || shortCode.includes(q) || formulaName.includes(q);
    }
    return true;
  });

  // Calculate simulated batch scaling from formula percentages
  const simulatedBatchGrams = selectedBOM?.blendGramsPerUnit || (selectedBOM?.finishedGood?.division === 'Fadna Life Science' ? 100 : 40);
  const simulatedTotalBatchKg = (simulationBatchSize * simulatedBatchGrams) / 1000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Workflow className="w-5 h-5 text-emerald-400" />
            Product Formulas (Master Recipes)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Master recipes defined by <strong className="text-emerald-400">Ingredient Percentages (%)</strong> and <strong className="text-blue-400">Packaging Materials</strong>.
            Operational BOM batch runs and physical scaling are executed in the Blend Pipeline.
          </p>
        </div>

        {hasRole('admin', 'production_manager') && (
          <button
            onClick={openAddFormulaModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product Formula</span>
          </button>
        )}
      </div>

      {/* Main Split: Left Sidebar of Formulas, Right Formula Recipe Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Formulas Selector List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Formulas ({filteredBOMs.length})
            </p>
            {/* Division Pill Buttons */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
              <button
                onClick={() => setDivisionFilter('All')}
                className={`px-2 py-0.5 rounded ${divisionFilter === 'All' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setDivisionFilter('Fadna Tea')}
                className={`px-2 py-0.5 rounded ${divisionFilter === 'Fadna Tea' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                Tea
              </button>
              <button
                onClick={() => setDivisionFilter('Fadna Life Science')}
                className={`px-2 py-0.5 rounded ${divisionFilter === 'Fadna Life Science' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
              >
                Life Science
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product formula..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filteredBOMs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                No product formulas found.
              </div>
            ) : (
              filteredBOMs.map((bom) => {
                const isSelected = selectedBOM?._id === bom._id;
                const fg = bom.finishedGood;
                const rawCount = bom.rawMaterials?.length || 0;

                return (
                  <div
                    key={bom._id}
                    onClick={() => setSelectedBOM(bom)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-emerald-400 font-bold block">
                            {fg?.sku}
                          </span>
                          {(fg as any)?.shortCode && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold bg-slate-800 text-slate-300">
                              {(fg as any).shortCode}
                            </span>
                          )}
                          {bom.isMultiStage && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <FlaskConical className="w-2.5 h-2.5" />
                              Multi-Stage
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 mt-1">
                          {fg?.name}
                        </h4>
                      </div>
                      <Badge variant="teal" size="sm">
                        {bom.version || 'v1.0'}
                      </Badge>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-teal-400 font-medium">
                        <Leaf className="w-3 h-3" />
                        {rawCount} Ingredients (100%)
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {bom.division || 'Fadna Recipe'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Product Formula Recipe Viewer */}
        <div className="lg:col-span-8">
          {selectedBOM ? (
            <div className="space-y-4">
              {/* Product Formula Header Card */}
              <Card className="bg-gradient-to-r from-slate-900 to-emerald-950/30 border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {selectedBOM.finishedGood?.sku}
                      </span>
                      {(selectedBOM.finishedGood as any)?.shortCode && (
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                          {(selectedBOM.finishedGood as any).shortCode}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        {selectedBOM.version}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                        {selectedBOM.division || selectedBOM.finishedGood?.division}
                      </span>
                    </div>

                    <h3 className="text-lg font-extrabold text-white mt-1.5">
                      {selectedBOM.formulaName || `${selectedBOM.finishedGood?.name} Formula`}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Target Product: <strong className="text-slate-200">{selectedBOM.finishedGood?.name}</strong> • Unit:{' '}
                      <span className="text-slate-300 font-semibold">{selectedBOM.finishedGood?.packSize || selectedBOM.unit}</span>
                    </p>
                  </div>

                  {hasRole('admin', 'production_manager') && (
                    <div className="self-start sm:self-auto flex items-center gap-2">
                      <button
                        onClick={openEditFormulaModal}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 transition-all"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Formula</span>
                      </button>
                      <button
                        onClick={handleDeleteFormula}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all"
                        title="Deactivate / Delete this Product Formula"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {selectedBOM.notes && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{selectedBOM.notes}</span>
                  </div>
                )}
              </Card>

              {/* SECTION 1: Material Percentages Formulation */}
              <Card className="p-0 overflow-hidden border-slate-800">
                <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        1. Raw Material Percentages (%)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Exact percentage breakdown of botanicals, extracts, and active ingredients in the blend formulation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {selectedBOM.rawMaterials?.length || 0} Materials
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/30">
                        <th className="py-2.5 px-4 font-semibold">Material SKU</th>
                        <th className="py-2.5 px-4 font-semibold">Herb / Ingredient Name</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Formula Percentage (%)</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Warehouse Stock</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Category</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Process Wastage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedBOM.rawMaterials?.map((item, idx) => {
                        const pct = item.percentage !== undefined ? item.percentage : 0;
                        const rm = item.rawMaterial;
                        const isLow = rm && (rm.currentStock || 0) <= (rm.minReorderLevel || 50);
                        return (
                          <tr key={idx} className="hover:bg-slate-800/20">
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                              {rm?.sku || 'RM-SKU'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-200">{rm?.name}</p>
                                {selectedBOM.isMultiStage &&
                                  selectedBOM.stages?.some(
                                    (s) =>
                                      s.outputItemName &&
                                      rm?.name &&
                                      (s.outputItemName.toLowerCase().includes(rm.name.toLowerCase()) ||
                                        rm.name.toLowerCase().includes(s.outputItemName.toLowerCase()))
                                  ) && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                      <FlaskConical className="w-2.5 h-2.5" /> Stage Extract
                                    </span>
                                  )}
                              </div>
                              {rm?.botanicalName && (
                                <p className="text-[10px] text-slate-500 italic">
                                  {rm?.botanicalName}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono font-extrabold text-sm text-emerald-300 min-w-[50px] text-right">
                                  {pct}%
                                </span>
                                <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden hidden sm:block">
                                  <div
                                    className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full"
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {rm ? (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800">
                                  <span className={`font-mono font-bold text-xs ${isLow ? 'text-amber-400' : 'text-emerald-300'}`}>
                                    {rm.currentStock !== undefined ? `${rm.currentStock} ${rm.unit || 'kg'}` : 'In Stock'}
                                  </span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-300 font-semibold" title="Registered in Raw Materials inventory">
                                    In Stores
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                                {rm?.category || 'Lifescience'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-amber-400 font-mono">
                              +{item.wastagePercent}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Formula Sum Footer */}
                <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Total Formula Ratio:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {selectedBOM.rawMaterials?.reduce((s, it) => s + (Number(it.percentage) || 0), 0).toFixed(2)}%
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ 100% Balanced Recipe
                    </span>
                  </div>
                </div>
              </Card>

              {/* SECTION 2: Multi-Stage Extraction & Sub-Blend Recipes (If Applicable) */}
              {selectedBOM.isMultiStage && selectedBOM.stages && selectedBOM.stages.length > 0 && (
                <Card className="p-0 overflow-hidden border-amber-500/30 bg-gradient-to-b from-amber-950/15 via-slate-900 to-slate-950 shadow-xl shadow-amber-950/20">
                  <div className="p-3.5 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                          Multi-Stage Extraction &amp; Sub-Blend Recipes
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {selectedBOM.stages.length} Stage{selectedBOM.stages.length > 1 ? 's' : ''}
                          </span>
                        </h4>
                        <p className="text-[11px] text-amber-200/80">
                          Pre-formulation botanical decoctions, TBC cut extractions, and herbal intermediate concentrates.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-4">
                    {selectedBOM.stages.map((stage, sIdx) => (
                      <div key={sIdx} className="rounded-xl border border-amber-500/20 bg-slate-950/70 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                STAGE {stage.stageNumber || sIdx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-100">
                                {stage.stageName}
                              </span>
                            </div>
                            {stage.outputItemName && (
                              <p className="text-[11px] text-slate-400 mt-1">
                                Stage Intermediate: <span className="font-semibold text-emerald-400">{stage.outputItemName}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            {stage.outputContributionPercent !== undefined && stage.outputContributionPercent > 0 && (
                              <div className="bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg text-right">
                                <span className="text-[9px] text-amber-300/80 block uppercase font-bold">Contribution To Formula</span>
                                <span className="font-mono font-bold text-amber-300">{stage.outputContributionPercent}%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {stage.instructions && (
                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span>{stage.instructions}</span>
                          </div>
                        )}

                        {/* Sub-Stage Ingredients Table */}
                        <div className="overflow-x-auto rounded-lg border border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50 text-[11px]">
                                <th className="py-2 px-3 font-semibold">Sub-Herb / Botanical Component</th>
                                <th className="py-2 px-3 font-semibold text-center">Stage Formulation (%)</th>
                                <th className="py-2 px-3 font-semibold">Ayurvedic / Functional Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {stage.ingredients?.map((ing, iIdx) => {
                                const rmObj: any = ing.rawMaterial;
                                const name = ing.rawMaterialName || rmObj?.name || 'Raw Material';
                                const sku = rmObj?.sku || '';
                                const pct = ing.percentage || 0;
                                return (
                                  <tr key={iIdx} className="hover:bg-slate-800/30">
                                    <td className="py-2 px-3">
                                      <div className="font-semibold text-slate-200">{name}</div>
                                      {sku && <div className="text-[10px] font-mono text-amber-400/80">{sku}</div>}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <span className="font-mono font-bold text-amber-300">{pct}%</span>
                                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                                          <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                                      {ing.notes || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {/* SECTION 3: Interactive BOM Batch Simulator */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatchScaler(!showBatchScaler)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Simulate Operational BOM from this Formula (Batch Weight Scaler)</span>
                  </div>
                  {showBatchScaler ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showBatchScaler && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block">
                          Simulate Planned Production Batch (Finished Units)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={simulationBatchSize}
                          onChange={(e) => setSimulationBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold w-32 mt-1 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Total Batch Mass Needed</span>
                        <span className="text-sm font-mono font-extrabold text-emerald-400">
                          {simulatedTotalBatchKg.toFixed(2)} kg
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          ({simulatedBatchGrams}g per unit)
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[11px]">
                            <th className="py-1.5 px-3">Ingredient</th>
                            <th className="py-1.5 px-3 text-center">Formula %</th>
                            <th className="py-1.5 px-3 text-right">Required Batch Mass (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {selectedBOM.rawMaterials?.map((item, idx) => {
                            const pct = item.percentage || 0;
                            const kg = (simulatedTotalBatchKg * pct) / 100;
                            return (
                              <tr key={idx}>
                                <td className="py-1.5 px-3 text-slate-300 font-medium">{item.rawMaterial?.name}</td>
                                <td className="py-1.5 px-3 text-center font-mono text-emerald-400">{pct}%</td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-100">
                                  {kg.toFixed(3)} kg
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              Select or add a Product Formula to view formulation details.
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT PRODUCT FORMULA                        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditingExisting ? 'Edit Product Formula' : 'Add New Product Formula'}
        subtitle="Specify target product and botanical percentage formulation"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveFormula} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Top Row: Product Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Product (Finished Good) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                list="fg-datalist"
                value={editFGName}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditFGName(val);
                  const matched = finishedGoods.find(
                    (fg) =>
                      fg.name.toLowerCase() === val.trim().toLowerCase() ||
                      fg.sku.toLowerCase() === val.trim().toLowerCase() ||
                      fg._id === val
                  );
                  if (matched) {
                    setEditFGId(matched._id);
                    if (!editFormulaName || editFormulaName.endsWith('Master Formulation')) {
                      setEditFormulaName(`${matched.name} Master Formulation`);
                    }
                    setEditGramsPerUnit(matched.division === 'Fadna Life Science' ? 100 : 40);
                  } else {
                    setEditFGId(val);
                    if (!editFormulaName || editFormulaName.endsWith('Master Formulation')) {
                      setEditFormulaName(`${val} Master Formulation`);
                    }
                  }
                }}
                placeholder="Type finished product name or SKU..."
                required
                disabled={isEditingExisting}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
              />
              <datalist id="fg-datalist">
                {finishedGoods.map((fg) => (
                  <option key={fg._id} value={fg.name}>
                    {fg.sku} ({fg.division})
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Formula Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={editFormulaName}
                onChange={(e) => setEditFormulaName(e.target.value)}
                placeholder="e.g. Moist Curl Male Master Formulation"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Recipe Version</label>
              <input
                type="text"
                value={editVersion}
                onChange={(e) => setEditVersion(e.target.value)}
                placeholder="v1.0"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Formula Notes / Description</label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Authentic clinical / factory formulation"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* SECTION 1 IN MODAL: Raw Material Percentages */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" />
                  Raw Material Percentages (%)
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Type raw material name and specify their % in the formula (must equal 100%).
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditRawItems([
                    ...editRawItems,
                    {
                      rawMaterial: '',
                      materialName: '',
                      percentage: 10,
                      wastagePercent: 2,
                    },
                  ])
                }
                className="text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center gap-1 transition-all shadow-md shadow-emerald-950/30"
              >
                <Plus className="w-3 h-3" /> Add Material
              </button>
            </div>

            {/* Formula Balance Indicator */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total Formula %:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold text-xs ${
                    Math.abs(formulaPercentageSum - 100) < 0.1
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : formulaPercentageSum > 100
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {formulaPercentageSum.toFixed(2)}% {Math.abs(formulaPercentageSum - 100) < 0.1 ? '✓ 100% Balanced' : formulaPercentageSum > 100 ? '⚠ Exceeds 100%' : '⚠ Under 100%'}
                </span>
              </div>
              {Math.abs(formulaPercentageSum - 100) >= 0.1 && formulaPercentageSum > 0 && (
                <button
                  type="button"
                  onClick={handleNormalizePercentages}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold transition-all flex items-center gap-1"
                >
                  <Sliders className="w-3 h-3" /> Auto-Balance to 100%
                </button>
              )}
            </div>

            {/* Raw Material Rows */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {editRawItems.map((r, i) => {
                const linkedStage = editIsMultiStage
                  ? editStages.find(
                      (s) =>
                        s.outputItemName &&
                        r.materialName &&
                        (s.outputItemName.trim().toLowerCase() === r.materialName.trim().toLowerCase() ||
                          s.outputItemName.toLowerCase().includes(r.materialName.toLowerCase()) ||
                          r.materialName.toLowerCase().includes(s.outputItemName.toLowerCase()))
                    )
                  : null;

                return (
                  <div key={i} className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          list="rm-datalist"
                          value={r.materialName}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...editRawItems];
                            updated[i].materialName = val;
                            const matched = rawMaterials.find(
                              (rm) =>
                                rm.name.toLowerCase() === val.trim().toLowerCase() ||
                                rm.sku.toLowerCase() === val.trim().toLowerCase()
                            );
                            updated[i].rawMaterial = matched ? matched._id : val;
                            setEditRawItems(updated);
                          }}
                          placeholder="Type raw material name..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 w-48">
                        <span className="text-[11px] text-slate-400 font-semibold">% Ratio:</span>
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          max="100"
                          value={r.percentage ?? 0}
                          onChange={(e) => {
                            const val = Math.max(0, parseFloat(e.target.value) || 0);
                            const updated = [...editRawItems];
                            updated[i].percentage = val;
                            setEditRawItems(updated);
                          }}
                          className="w-24 bg-slate-900 border border-emerald-800 rounded-lg px-2 py-1 text-xs text-emerald-300 font-bold focus:outline-none text-right"
                        />
                        <span className="text-xs text-emerald-400 font-bold">%</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (editRawItems.length > 1) {
                            setEditRawItems(editRawItems.filter((_, idx) => idx !== i));
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {linkedStage && (
                      <div className="flex items-center justify-between text-[10px] text-amber-400 pl-1 pt-1 border-t border-slate-900">
                        <div className="flex items-center gap-1.5">
                          <FlaskConical className="w-3 h-3 text-amber-400" />
                          <span>
                            Supplied by <strong className="text-amber-300">Stage {linkedStage.stageNumber || 1}: {linkedStage.stageName}</strong> ({linkedStage.outputContributionPercent || r.percentage}%)
                          </span>
                        </div>
                        {Math.abs((linkedStage.outputContributionPercent || 0) - (r.percentage || 0)) > 0.001 && (
                          <button
                            type="button"
                            onClick={() => {
                              const sIdx = editStages.indexOf(linkedStage);
                              if (sIdx !== -1) {
                                const stgCopy = [...editStages];
                                stgCopy[sIdx].outputContributionPercent = r.percentage || 0;
                                setEditStages(stgCopy);
                              }
                            }}
                            className="text-[9px] text-amber-300 underline hover:text-white"
                          >
                            Sync to Stage
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <datalist id="rm-datalist">
              {rawMaterials.map((rm) => (
                <option key={rm._id} value={rm.name}>
                  {rm.sku} • Stock: {rm.currentStock} {rm.unit}
                </option>
              ))}
            </datalist>
          </div>

          {/* SECTION 2 IN MODAL: Multi-Stage Extraction & Sub-Blend Recipes */}
          <div className="pt-3 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-400" />
                <div>
                  <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsMultiStage}
                      onChange={(e) => {
                        setEditIsMultiStage(e.target.checked);
                        if (e.target.checked && editStages.length === 0) {
                          setEditStages([
                            {
                              stageNumber: 1,
                              stageName: 'Herbal Extraction Phase',
                              stageType: 'extraction',
                              outputItemName: `${editFormulaName || 'Product'} Extract`,
                              outputContributionPercent: 25,
                              instructions: 'Hydro-alcoholic extraction and percolation.',
                              ingredients: [
                                {
                                  rawMaterial: '' as any,
                                  rawMaterialName: '',
                                  percentage: 100,
                                  notes: 'Fine cut botanical cut',
                                },
                              ],
                            },
                          ]);
                        }
                      }}
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-900"
                    />
                    <span>Multi-Stage Extraction &amp; Sub-Blend Recipes</span>
                  </label>
                  <span className="text-[10px] text-slate-400 block">
                    Define herbal intermediate stages (e.g. decoctions, extract phases, pre-blends).
                  </span>
                </div>
              </div>
              {editIsMultiStage && (
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = editStages.length + 1;
                    setEditStages([
                      ...editStages,
                      {
                        stageNumber: nextNum,
                        stageName: `Stage ${nextNum}: Pre-Blend / Extraction`,
                        stageType: 'extraction',
                        outputItemName: `Intermediate Concentrate ${nextNum}`,
                        outputContributionPercent: 10,
                        instructions: '',
                        ingredients: [
                          {
                            rawMaterial: '' as any,
                            rawMaterialName: '',
                            percentage: 100,
                            notes: '',
                          },
                        ],
                      },
                    ]);
                  }}
                  className="text-xs px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" /> Add Stage
                </button>
              )}
            </div>

            {editIsMultiStage && (
              <div className="space-y-3 pt-2">
                {editStages.map((stage, sIdx) => (
                  <div key={sIdx} className="p-3 rounded-xl border border-amber-500/30 bg-slate-950/80 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        STAGE {stage.stageNumber || sIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditStages(editStages.filter((_, idx) => idx !== sIdx))}
                        className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove Stage
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Stage Name</label>
                        <input
                          type="text"
                          value={stage.stageName}
                          onChange={(e) => {
                            const updated = [...editStages];
                            updated[sIdx].stageName = e.target.value;
                            setEditStages(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] text-slate-400">Stage Intermediate Output</label>
                          {editRawItems.length > 0 && (
                            <span className="text-[9px] text-emerald-400 font-semibold flex items-center gap-0.5">
                              <Link2 className="w-2.5 h-2.5" /> Links to Material
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          list={`stage-rm-list-${sIdx}`}
                          value={stage.outputItemName || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = [...editStages];
                            updated[sIdx].outputItemName = val;
                            const matched = editRawItems.find(
                              (r) =>
                                r.materialName &&
                                (r.materialName.trim().toLowerCase() === val.trim().toLowerCase() ||
                                  val.trim().toLowerCase().includes(r.materialName.trim().toLowerCase()) ||
                                  r.materialName.trim().toLowerCase().includes(val.trim().toLowerCase()))
                            );
                            if (matched && matched.percentage) {
                              updated[sIdx].outputContributionPercent = matched.percentage;
                            }
                            setEditStages(updated);
                          }}
                          placeholder="e.g. Vernolac Concentrated Herbal Extract"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                        />
                        <datalist id={`stage-rm-list-${sIdx}`}>
                          {editRawItems.map((r, rIdx) => (
                            <option key={rIdx} value={r.materialName}>
                              {r.percentage}% of Master Blend Formula
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[10px] text-slate-400">Contribution to Blend %</label>
                          {(() => {
                            const matched = editRawItems.find(
                              (r) =>
                                r.materialName &&
                                stage.outputItemName &&
                                (r.materialName.trim().toLowerCase() === stage.outputItemName.trim().toLowerCase() ||
                                  stage.outputItemName.trim().toLowerCase().includes(r.materialName.trim().toLowerCase()) ||
                                  r.materialName.trim().toLowerCase().includes(stage.outputItemName.trim().toLowerCase()))
                            );
                            if (
                              matched &&
                              Math.abs((matched.percentage || 0) - (stage.outputContributionPercent || 0)) > 0.001
                            ) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editStages];
                                    updated[sIdx].outputContributionPercent = matched.percentage || 0;
                                    setEditStages(updated);
                                  }}
                                  className="text-[9px] text-amber-300 hover:underline font-mono"
                                >
                                  Sync ({matched.percentage}%)
                                </button>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <input
                          type="number"
                          step="0.001"
                          value={stage.outputContributionPercent || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const updated = [...editStages];
                            updated[sIdx].outputContributionPercent = val;
                            setEditStages(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Connection Status Banner */}
                    {(() => {
                      const matched = editRawItems.find(
                        (r) =>
                          r.materialName &&
                          stage.outputItemName &&
                          (r.materialName.trim().toLowerCase() === stage.outputItemName.trim().toLowerCase() ||
                            stage.outputItemName.trim().toLowerCase().includes(r.materialName.trim().toLowerCase()) ||
                            r.materialName.trim().toLowerCase().includes(stage.outputItemName.trim().toLowerCase()))
                      );
                      if (matched) {
                        const isSynced =
                          Math.abs((matched.percentage || 0) - (stage.outputContributionPercent || 0)) < 0.001;
                        return (
                          <div
                            className={`p-2 rounded-lg text-[11px] flex items-center justify-between border ${
                              isSynced
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>
                                Connected to Raw Material Ratio:{' '}
                                <strong className="text-white">{matched.materialName}</strong> ({matched.percentage}%)
                              </span>
                            </div>
                            {!isSynced && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...editStages];
                                  updated[sIdx].outputContributionPercent = matched.percentage || 0;
                                  setEditStages(updated);
                                }}
                                className="text-[10px] px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all"
                              >
                                Match Material % ({matched.percentage}%)
                              </button>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Process / Extraction Instructions</label>
                      <input
                        type="text"
                        value={stage.instructions || ''}
                        onChange={(e) => {
                          const updated = [...editStages];
                          updated[sIdx].instructions = e.target.value;
                          setEditStages(updated);
                        }}
                        placeholder="e.g. Steam-distilled at 75°C for 3 hours, filtered through 100-mesh sieve"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                      />
                    </div>

                    {/* Stage Ingredients */}
                    <div className="space-y-2 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-300">Stage Ingredients:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editStages];
                            updated[sIdx].ingredients = [
                              ...(updated[sIdx].ingredients || []),
                              {
                                rawMaterial: '' as any,
                                rawMaterialName: '',
                                percentage: 10,
                                notes: '',
                              },
                            ];
                            setEditStages(updated);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 flex items-center gap-1"
                        >
                          <Plus className="w-2.5 h-2.5" /> Add Ingredient
                        </button>
                      </div>

                      {(stage.ingredients || []).map((ing, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <input
                            type="text"
                            list="rm-datalist"
                            value={
                              ing.rawMaterialName ||
                              (typeof ing.rawMaterial === 'object'
                                ? (ing.rawMaterial as any)?.name
                                : rawMaterials.find((m) => m._id === (ing.rawMaterial as any))?.name || '')
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...editStages];
                              const matched = rawMaterials.find(
                                (m) =>
                                  m.name.toLowerCase() === val.trim().toLowerCase() ||
                                  m.sku.toLowerCase() === val.trim().toLowerCase()
                              );
                              updated[sIdx].ingredients[iIdx].rawMaterialName = val;
                              (updated[sIdx].ingredients[iIdx].rawMaterial as any) = matched ? matched._id : val;
                              setEditStages(updated);
                            }}
                            placeholder="Type ingredient name..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                          />

                          <div className="flex items-center gap-1 w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={ing.percentage || 0}
                              onChange={(e) => {
                                const updated = [...editStages];
                                updated[sIdx].ingredients[iIdx].percentage = Number(e.target.value) || 0;
                                setEditStages(updated);
                              }}
                              className="w-16 bg-slate-950 border border-amber-800 rounded px-1.5 py-1 text-xs text-amber-300 font-mono text-right"
                            />
                            <span className="text-xs text-amber-400 font-bold">%</span>
                          </div>

                          <input
                            type="text"
                            value={ing.notes || ''}
                            onChange={(e) => {
                              const updated = [...editStages];
                              updated[sIdx].ingredients[iIdx].notes = e.target.value;
                              setEditStages(updated);
                            }}
                            placeholder="Notes"
                            className="w-32 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...editStages];
                              updated[sIdx].ingredients = updated[sIdx].ingredients.filter((_, idx) => idx !== iIdx);
                              setEditStages(updated);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditingExisting ? 'Save Formula Updates' : 'Add Product Formula'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BOMManagement;
