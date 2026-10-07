import { create } from 'zustand';
import { 
  BudgetItem, 
  WorkPackage, 
  ProjectMetadata, 
  LotSummary, 
  ProjectConsolidation, 
  AuditLogEntry 
} from '../types/budget';
import { 
  INITIAL_WORK_PACKAGES, 
  INITIAL_BUDGET_ITEMS, 
  PROJECT_METADATA 
} from '../data/seedKhemisti';

const STORAGE_KEY = 'khemisti_budget_items_v1';
const AUDIT_STORAGE_KEY = 'khemisti_budget_audit_v1';

interface BudgetState {
  workPackages: WorkPackage[];
  items: BudgetItem[];
  metadata: ProjectMetadata;
  auditLogs: AuditLogEntry[];
  
  // UI State
  expandedLots: Record<string, boolean>;
  searchQuery: string;
  selectedLotFilter: string; // 'ALL' or workPackageId
  statusFilter: 'ALL' | 'BALANCED' | 'OVER_BUDGET' | 'UNDER_BUDGET';
  isSyncing: boolean;
  offlineMode: boolean;
  selectedItemForModal: BudgetItem | null;

  // Actions
  updateItemField: (
    itemId: string,
    field: 'unitPrice' | 'contractQuantity' | 'previousQuantity' | '2026-10' | '2026-11' | '2026-12',
    value: number,
    userName?: string
  ) => { success: boolean; message?: string };
  
  toggleLotExpansion: (lotId: string) => void;
  expandAllLots: () => void;
  collapseAllLots: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedLotFilter: (lotId: string) => void;
  setStatusFilter: (status: 'ALL' | 'BALANCED' | 'OVER_BUDGET' | 'UNDER_BUDGET') => void;
  setOfflineMode: (offline: boolean) => void;
  setSelectedItemForModal: (item: BudgetItem | null) => void;
  resetToDefault: () => void;
  clearAuditLogs: () => void;

  // Computed Getters
  getConsolidation: () => ProjectConsolidation;
  getLotSummaries: () => LotSummary[];
  getItemById: (id: string) => BudgetItem | undefined;
}

function loadInitialItems(): BudgetItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === INITIAL_BUDGET_ITEMS.length) {
        return parsed;
      }
    }
  } catch {
    // ignore JSON error
  }
  return INITIAL_BUDGET_ITEMS;
}

function loadInitialAudit(): AuditLogEntry[] {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

const initialExpanded: Record<string, boolean> = {
  'wp-1': true,
  'wp-2': true,
  'wp-3': true,
  'wp-4': true,
  'wp-5': true,
  'wp-6': true,
};

export const useBudgetStore = create<BudgetState>((set, get) => ({
  workPackages: INITIAL_WORK_PACKAGES,
  items: loadInitialItems(),
  metadata: PROJECT_METADATA,
  auditLogs: loadInitialAudit(),
  
  expandedLots: initialExpanded,
  searchQuery: '',
  selectedLotFilter: 'ALL',
  statusFilter: 'ALL',
  isSyncing: false,
  offlineMode: false,
  selectedItemForModal: null,

  updateItemField: (itemId, field, value, userName = 'Ingénieur Travaux (EGUVA)') => {
    const currentItems = get().items;
    const targetItem = currentItems.find((it) => it.id === itemId);
    if (!targetItem) {
      return { success: false, message: 'Article introuvable' };
    }

    if (isNaN(value) || value < 0) {
      return { success: false, message: 'La valeur doit être un nombre positif ou nul' };
    }

    let oldValue = 0;
    let fieldLabel = '';

    const updatedItem: BudgetItem = {
      ...targetItem,
      forecasts: { ...targetItem.forecasts },
      forecastAmounts: { ...targetItem.forecastAmounts },
    };

    if (field === 'unitPrice') {
      oldValue = targetItem.unitPrice;
      fieldLabel = 'Prix Unitaire';
      updatedItem.unitPrice = value;
    } else if (field === 'contractQuantity') {
      oldValue = targetItem.contractQuantity;
      fieldLabel = 'Quantité Marché';
      updatedItem.contractQuantity = value;
    } else if (field === 'previousQuantity') {
      oldValue = targetItem.previousQuantity;
      fieldLabel = 'Quantité Réalisée';
      updatedItem.previousQuantity = value;
    } else if (field === '2026-10' || field === '2026-11' || field === '2026-12') {
      oldValue = targetItem.forecasts[field] || 0;
      fieldLabel = field === '2026-10' ? 'Qté Octobre 2026' : field === '2026-11' ? 'Qté Novembre 2026' : 'Qté Décembre 2026';
      updatedItem.forecasts[field] = value;
    }

    // Recalculate derived quantities and amounts
    updatedItem.remainingQuantity = Number(
      Math.max(0, updatedItem.contractQuantity - updatedItem.previousQuantity).toFixed(3)
    );
    updatedItem.contractAmount = Number((updatedItem.contractQuantity * updatedItem.unitPrice).toFixed(2));
    updatedItem.previousAmount = Number((updatedItem.previousQuantity * updatedItem.unitPrice).toFixed(2));
    updatedItem.remainingAmount = Number((updatedItem.remainingQuantity * updatedItem.unitPrice).toFixed(2));

    for (const [m, q] of Object.entries(updatedItem.forecasts)) {
      updatedItem.forecastAmounts[m] = Number((q * updatedItem.unitPrice).toFixed(2));
    }

    // Check sum of forecasts
    const sumForecasts = Object.values(updatedItem.forecasts).reduce((a, b) => a + b, 0);
    const hasOverrun = sumForecasts > updatedItem.remainingQuantity + 0.0001;

    // Create audit entry
    const auditEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      itemId: targetItem.id,
      itemNumber: targetItem.itemNumber,
      designation: targetItem.designation,
      field,
      fieldLabel,
      oldValue,
      newValue: value,
      user: userName,
    };

    const newItems = currentItems.map((it) => (it.id === itemId ? updatedItem : it));
    const newAudits = [auditEntry, ...get().auditLogs].slice(0, 200);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(newAudits));
    } catch {
      // storage quota or disabled
    }

    // Trigger simulated sync indication
    set({
      items: newItems,
      auditLogs: newAudits,
      isSyncing: true,
      selectedItemForModal: get().selectedItemForModal?.id === itemId ? updatedItem : get().selectedItemForModal,
    });

    setTimeout(() => {
      set({ isSyncing: false });
    }, 400);

    return { 
      success: true, 
      message: hasOverrun 
        ? `Attention : La somme des prévisions (${sumForecasts}) dépasse le reliquat (${updatedItem.remainingQuantity}) !` 
        : undefined 
    };
  },

  toggleLotExpansion: (lotId: string) => {
    set((state) => ({
      expandedLots: {
        ...state.expandedLots,
        [lotId]: !state.expandedLots[lotId],
      },
    }));
  },

  expandAllLots: () => {
    const all: Record<string, boolean> = {};
    get().workPackages.forEach((wp) => {
      all[wp.id] = true;
    });
    set({ expandedLots: all });
  },

  collapseAllLots: () => {
    const none: Record<string, boolean> = {};
    get().workPackages.forEach((wp) => {
      none[wp.id] = false;
    });
    set({ expandedLots: none });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedLotFilter: (lotId: string) => set({ selectedLotFilter: lotId }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setOfflineMode: (offline: boolean) => set({ offlineMode: offline }),
  setSelectedItemForModal: (item) => set({ selectedItemForModal: item }),

  resetToDefault: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    set({
      items: INITIAL_BUDGET_ITEMS,
      expandedLots: initialExpanded,
      searchQuery: '',
      selectedLotFilter: 'ALL',
      statusFilter: 'ALL',
      selectedItemForModal: null,
    });
  },

  clearAuditLogs: () => {
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch {
      // ignore
    }
    set({ auditLogs: [] });
  },

  getItemById: (id: string) => {
    return get().items.find((i) => i.id === id);
  },

  getLotSummaries: () => {
    const { workPackages, items } = get();
    return workPackages.map((wp) => {
      const lotItems = items.filter((it) => it.workPackageId === wp.id);
      let contractAmount = 0;
      let previousAmount = 0;
      let remainingAmount = 0;
      const monthlyAmounts: Record<string, number> = {
        '2026-10': 0,
        '2026-11': 0,
        '2026-12': 0,
      };

      lotItems.forEach((it) => {
        contractAmount += it.contractAmount;
        previousAmount += it.previousAmount;
        remainingAmount += it.remainingAmount;
        for (const [m, amt] of Object.entries(it.forecastAmounts)) {
          monthlyAmounts[m] = (monthlyAmounts[m] || 0) + amt;
        }
      });

      const totalForecastAmount = Object.values(monthlyAmounts).reduce((a, b) => a + b, 0);
      const isBalanced = Math.abs(totalForecastAmount - remainingAmount) < 0.05;

      return {
        workPackageId: wp.id,
        lotCode: wp.code,
        lotTitle: wp.title,
        displayOrder: wp.displayOrder,
        contractAmount,
        previousAmount,
        remainingAmount,
        monthlyAmounts,
        totalForecastAmount,
        isBalanced,
        itemCount: lotItems.length,
      };
    });
  },

  getConsolidation: () => {
    const lotSummaries = get().getLotSummaries();
    let totalContractAmount = 0;
    let totalPreviousAmount = 0;
    let totalRemainingAmount = 0;
    const monthlyTotals: Record<string, number> = {
      '2026-10': 0,
      '2026-11': 0,
      '2026-12': 0,
    };

    lotSummaries.forEach((ls) => {
      totalContractAmount += ls.contractAmount;
      totalPreviousAmount += ls.previousAmount;
      totalRemainingAmount += ls.remainingAmount;
      for (const [m, val] of Object.entries(ls.monthlyAmounts)) {
        monthlyTotals[m] = (monthlyTotals[m] || 0) + val;
      }
    });

    const totalForecastThreeMonths = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
    const varianceToRemaining = totalForecastThreeMonths - totalRemainingAmount;
    const isBalanced = Math.abs(varianceToRemaining) < 0.05;

    return {
      totalContractAmount,
      totalPreviousAmount,
      totalRemainingAmount,
      monthlyTotals,
      totalForecastThreeMonths,
      varianceToRemaining,
      isBalanced,
    };
  },
}));
