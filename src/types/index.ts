export type UserRole = 'admin' | 'production_manager' | 'store_keeper' | 'viewer' | 'other' | 'others';

export interface LastEditedInfo {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  editedAt?: string;
  summary?: string;
}

export interface User {
  _id?: string;
  id?: string;
  username?: string;
  name: string;
  email: string;
  role: UserRole;
  customRole?: string;
  department: string;
  isActive?: boolean;
  avatar?: string;
  lastEditedBy?: LastEditedInfo;
  createdAt?: string;
  updatedAt?: string;
}

export interface FieldChange {
  field: string;
  label?: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLog {
  _id: string;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'STOCK_IN'
    | 'STOCK_OUT'
    | 'TRANSFER'
    | 'ADJUSTMENT'
    | 'PRODUCTION_RUN'
    | 'LOGIN';
  entityType:
    | 'User'
    | 'FinishedGood'
    | 'RawMaterial'
    | 'PackingMaterial'
    | 'BOM'
    | 'StockTransaction'
    | 'SalesTarget'
    | 'DailyMatrix'
    | 'System';
  entityId?: string;
  entityName: string;
  performedBy?: string;
  performedByName: string;
  performedByEmail?: string;
  performedByRole?: string;
  summary: string;
  changes?: FieldChange[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface FinishedGood {
  _id: string;
  sku: string;
  shortCode?: string;
  name: string;
  division?: 'Fadna Tea' | 'Fadna Life Science';
  category: string;
  unit: string;
  packSize: string;
  productionFloorStock: number;
  finishedStoreStock: number;
  totalStock: number;
  minReorderLevel: number;
  standardBatchSize: number;
  costPerUnit: number;
  sellingPrice: number;
  description?: string;
  isLowStock?: boolean;
  isActive: boolean;
  lastEditedBy?: LastEditedInfo;
  createdAt: string;
  updatedAt: string;
}

export const RAW_MATERIAL_CATEGORIES = ['Lifescience', 'QofL', 'Tea', 'Others'] as const;
export type RawMaterialCategory = (typeof RAW_MATERIAL_CATEGORIES)[number];

export interface RawMaterial {
  _id: string;
  sku: string;
  name: string;
  botanicalName?: string;
  category: RawMaterialCategory | string;
  unit: string;
  currentStock: number;
  minReorderLevel: number;
  costPerUnit: number;
  supplier: string;
  storageLocation: string;
  description?: string;
  isLowStock?: boolean;
  isActive: boolean;
  lastEditedBy?: LastEditedInfo;
  createdAt: string;
  updatedAt: string;
}

export interface PackingMaterial {
  _id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minReorderLevel: number;
  costPerUnit: number;
  supplier: string;
  storageLocation: string;
  specs?: string;
  description?: string;
  isLowStock?: boolean;
  isActive: boolean;
  lastEditedBy?: LastEditedInfo;
  createdAt: string;
  updatedAt: string;
}

export interface BOMRawItem {
  rawMaterial: RawMaterial;
  percentage?: number;
  quantity: number;
  unit: string;
  wastagePercent: number;
}

export interface BOMPackingItem {
  packingMaterial: PackingMaterial;
  quantity: number;
  unit: string;
  wastagePercent: number;
}

export interface BOMStageItem {
  rawMaterial: RawMaterial | { _id: string; name: string; sku?: string; unit?: string };
  rawMaterialName?: string;
  percentage?: number;
  quantity?: number;
  unit?: string;
  wastagePercent?: number;
  notes?: string;
}

export interface BOMStage {
  stageNumber: number;
  stageName: string;
  stageType: 'extraction' | 'pre-blend' | 'milling' | 'infusion' | 'sub-blend' | 'main-formulation';
  outputItemName: string;
  outputContributionPercent?: number;
  outputQuantity?: number;
  outputUnit?: string;
  ingredients: BOMStageItem[];
  instructions?: string;
}

export interface BOM {
  _id: string;
  finishedGood: FinishedGood;
  formulaName?: string;
  division?: 'Fadna Tea' | 'Fadna Life Science';
  blendGramsPerUnit?: number;
  batchSize: number;
  unit: string;
  version: string;
  rawMaterials: BOMRawItem[];
  packingMaterials: BOMPackingItem[];
  isMultiStage?: boolean;
  stages?: BOMStage[];
  notes?: string;
  isActive: boolean;
  lastEditedBy?: LastEditedInfo;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlendIngredient {
  rawMaterial: RawMaterial | string;
  rawMaterialName: string;
  sku: string;
  percentage?: number;
  quantity: number;
  unit: string;
}

export interface BlendStock {
  _id: string;
  blendCode: string;
  blendName: string;
  division: 'Fadna Tea' | 'Fadna Life Science';
  blendType?: 'Master Blend' | 'Sub-Blend' | 'Extraction';
  stageName?: string;
  targetFinishedGood: FinishedGood | string;
  targetFinishedGoodName: string;
  targetFinishedGoodSku: string;
  ingredients: BlendIngredient[];
  totalWeight: number;
  availableWeight: number;
  weightUnit: string;
  blendGramsPerFinishedUnit: number;
  predictedProductCount: number;
  initialProductCount: number;
  status: 'In Stock' | 'Partially Consumed' | 'Depleted';
  notes?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BOMPackingItemUsed {
  packingMaterial: PackingMaterial | string;
  name: string;
  sku: string;
  quantity: number;
  unit: string;
}

export interface BOMRun {
  _id: string;
  bomRunNumber: string;
  bomName: string;
  division: 'Fadna Tea' | 'Fadna Life Science';
  finishedGood: FinishedGood | string;
  finishedGoodName: string;
  finishedGoodSku: string;
  blendStock: BlendStock | string;
  blendCode: string;
  blendName: string;
  blendWeightConsumed: number;
  blendWeightUnit: string;
  packingMaterialsUsed: BOMPackingItemUsed[];
  bomProductCount: number;
  availableBOMCount: number;
  transferredToFGCount: number;
  status: 'In BOM Stage' | 'Partially Transferred' | 'Completed';
  notes?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThreeMonthMRPItem {
  finishedGood: {
    id: string;
    name: string;
    sku: string;
    shortCode?: string;
    division?: 'Fadna Tea' | 'Fadna Life Science';
    category: string;
    unit: string;
    packSize: string;
    productionFloorStock: number;
    finishedStoreStock: number;
    totalStock: number;
  };
  hasFormula: boolean;
  demands: {
    month1: number;
    month2: number;
    month3: number;
    total3Months: number;
  };
  currentStockPipeline: {
    finishedGoodsStock: number;
    bomWIPCount: number;
    blendWeightKg: number;
    blendProductCount: number;
    totalAvailableAndWIP: number;
  };
  planningOutput: {
    netProductionNeeded: number;
    predictableBOMNeeded: number;
    isCovered: boolean;
    coveragePercent: number;
  };
  materialsRequired: Array<{
    type: 'RawMaterial' | 'PackingMaterial';
    id: string;
    name: string;
    sku: string;
    unit: string;
    percentage?: number;
    neededQty: number;
    currentStock: number;
    shortfallToOrder: number;
    costPerUnit: number;
    estimatedCost: number;
  }>;
}

export interface ProcurementRequisitionItem {
  id: string;
  type: 'RawMaterial' | 'PackingMaterial';
  name: string;
  sku: string;
  unit: string;
  currentStock: number;
  totalNeeded: number;
  shortfallToOrder: number;
  costPerUnit: number;
  estimatedTotalCost: number;
}

export interface ThreeMonthMRPResult {
  months: [string, string, string];
  division: string;
  summary: {
    total3MonthDemand: number;
    totalCurrentFGStock: number;
    totalCurrentBOMWIP: number;
    totalPredictableBlendCount: number;
    totalNetProductionNeeded: number;
    totalPredictableBOMNeeded: number;
    rmShortfallCount: number;
    pmShortfallCount: number;
    estimatedRMCost: number;
    estimatedPMCost: number;
    estimatedTotalRequisitionCost: number;
  };
  plan: ThreeMonthMRPItem[];
  procurementPlan: {
    rawMaterials: ProcurementRequisitionItem[];
    packingMaterials: ProcurementRequisitionItem[];
  };
}

export interface StockTransaction {
  _id: string;
  transactionNumber: string;
  itemType: 'FinishedGood' | 'RawMaterial' | 'PackingMaterial';
  itemRef: string;
  itemName: string;
  itemSku: string;
  transactionType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  reason:
    | 'Production'
    | 'Purchase'
    | 'Sales'
    | 'Floor_Transfer'
    | 'Adjustment'
    | 'Return'
    | 'Wastage'
    | 'QA_Sampling';
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
  referenceNumber?: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  transactionDate: string;
}

export interface DashboardSummary {
  kpis: {
    finishedGoods: {
      totalProducts: number;
      productionFloorUnits: number;
      finishedStoreUnits: number;
      totalUnits: number;
      valuation: number;
      lowStockCount: number;
    };
    rawMaterials: {
      totalItems: number;
      totalStock: number;
      valuation: number;
      lowStockCount: number;
    };
    packingMaterials: {
      totalItems: number;
      totalStock: number;
      valuation: number;
      lowStockCount: number;
    };
    todayOperations: {
      inMovements: number;
      outMovements: number;
      transfers: number;
      totalActivity: number;
    };
    inventoryValuationTotal: number;
  };
  alerts: {
    totalAlerts: number;
    finishedGoods: any[];
    rawMaterials: any[];
    packingMaterials: any[];
  };
  recentMovements: StockTransaction[];
  capacityPreview: Array<{
    name: string;
    sku: string;
    unit: string;
    currentTotalStock: number;
    maxCapacity: number;
    bottleneck: string;
    bottleneckType: string;
  }>;
}

export interface CapacityResult {
  finishedGood: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    productionFloorStock: number;
    finishedStoreStock: number;
    totalStock: number;
  };
  hasBOM: boolean;
  maxCapacity: number;
  limitingMaterial: string;
  limitingMaterialType: string;
  materials: Array<{
    type: string;
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    unit: string;
    perUnitRequired: number;
    supportedUnits: number;
  }>;
}
