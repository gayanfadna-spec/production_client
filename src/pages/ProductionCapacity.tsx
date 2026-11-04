import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { CapacityResult } from '../types';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Calculator, AlertTriangle, CheckCircle2, Sparkles, RefreshCw, Layers } from 'lucide-react';

export const ProductionCapacity: React.FC = () => {
  const [capacities, setCapacities] = useState<CapacityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<CapacityResult | null>(null);
  const [simulatedUnits, setSimulatedUnits] = useState<number>(500);

  const fetchCapacity = async () => {
    try {
      setLoading(true);
      const res = await api.get('/planning/capacity');
      if (res.data.success) {
        setCapacities(res.data.data);
        if (res.data.data.length > 0 && !selectedProduct) {
          setSelectedProduct(res.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load production capacity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacity();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Production Capacity Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time calculation of producible finished units based on active BOMs and available store inventory.
          </p>
        </div>

        <button
          onClick={fetchCapacity}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          Recalculate
        </button>
      </div>

      {/* Grid of Capacity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {capacities.map((item) => {
          const isSelected = selectedProduct?.finishedGood.id === item.finishedGood.id;
          const currentTotal = item.finishedGood.totalStock;

          return (
            <Card
              key={item.finishedGood.id}
              onClick={() => setSelectedProduct(item)}
              hoverEffect
              className={`transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-emerald-400 font-bold block">
                    {item.finishedGood.sku}
                  </span>
                  <h3 className="text-xs font-bold text-slate-100 mt-0.5">
                    {item.finishedGood.name}
                  </h3>
                </div>
                <Badge variant={item.maxCapacity > 0 ? 'emerald' : 'rose'} size="sm">
                  {item.maxCapacity > 0 ? 'Producible' : 'Depleted'}
                </Badge>
              </div>

              {/* Big Capacity Number */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Max Capacity Now</span>
                  <span className="text-xl font-black text-emerald-400">
                    +{item.maxCapacity.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">{item.finishedGood.unit}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">In Stock (F+S)</span>
                  <span className="text-sm font-bold text-slate-200">
                    {currentTotal.toLocaleString()} {item.finishedGood.unit}
                  </span>
                </div>
              </div>

              {/* Bottleneck Alert */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs">
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 ${
                    item.maxCapacity === 0 ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block">Bottleneck / Limiting Material:</span>
                  <span className="font-bold text-amber-300 truncate block text-[11px]">
                    {item.limitingMaterial}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detailed Material Breakdown of Selected Product */}
      {selectedProduct && (
        <Card className="border-teal-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {selectedProduct.finishedGood.sku}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Detailed Capacity Breakdown
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {selectedProduct.finishedGood.name}
              </h3>
            </div>

            {/* Production Simulator */}
            <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">Simulate Batch:</span>
              <input
                type="number"
                min="50"
                step="50"
                value={simulatedUnits}
                onChange={(e) => setSimulatedUnits(Number(e.target.value))}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400">{selectedProduct.finishedGood.unit}</span>
              <span
                className={`text-xs px-2 py-1 rounded font-bold ${
                  simulatedUnits <= selectedProduct.maxCapacity
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {simulatedUnits <= selectedProduct.maxCapacity ? 'Feasible' : 'Shortfall'}
              </span>
            </div>
          </div>

          {/* Table of Material Limits */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-2.5 px-4 font-bold">Type</th>
                  <th className="py-2.5 px-4 font-bold">Material SKU</th>
                  <th className="py-2.5 px-4 font-bold">Material Description</th>
                  <th className="py-2.5 px-4 font-bold text-center">Store Stock</th>
                  <th className="py-2.5 px-4 font-bold text-center">Req. Per Unit</th>
                  <th className="py-2.5 px-4 font-bold text-center bg-emerald-950/20 text-emerald-300">
                    Max Units Supported
                  </th>
                  <th className="py-2.5 px-4 font-bold text-center">Simulated Need</th>
                  <th className="py-2.5 px-4 font-bold text-right">Feasibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {selectedProduct.materials?.map((mat) => {
                  const isBottleneck = mat.name === selectedProduct.limitingMaterial;
                  const simulatedReq = mat.perUnitRequired * simulatedUnits;
                  const isEnough = mat.currentStock >= simulatedReq;

                  return (
                    <tr
                      key={mat.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isBottleneck ? 'bg-amber-950/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            mat.type === 'RawMaterial'
                              ? 'bg-teal-500/10 text-teal-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {mat.type === 'RawMaterial' ? 'RM' : 'PM'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">{mat.sku}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">{mat.name}</span>
                          {isBottleneck && (
                            <Badge variant="amber" size="sm">
                              Limiting Bottleneck
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-100">
                        {mat.currentStock.toLocaleString()} {mat.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {mat.perUnitRequired.toFixed(4)} {mat.unit}
                      </td>
                      <td className="py-3 px-4 text-center font-extrabold text-emerald-400 bg-emerald-950/10 font-mono">
                        {mat.supportedUnits.toLocaleString()} units
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {simulatedReq.toFixed(2)} {mat.unit}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant={isEnough ? 'emerald' : 'rose'} size="sm">
                          {isEnough ? 'Sufficient' : 'Deficit'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
