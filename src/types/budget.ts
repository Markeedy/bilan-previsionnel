export type UnitType = 'M' | 'M³' | 'M²' | 'T' | 'ML' | 'U' | 'F';

export interface WorkPackage {
  id: string;
  projectId: string;
  code: string;
  title: string;
  displayOrder: number;
}

export interface BudgetItem {
  id: string;
  workPackageId: string;
  itemNumber: number;
  designation: string;
  unit: UnitType;
  unitPrice: number;
  contractQuantity: number;
  previousQuantity: number;
  remainingQuantity: number;
  contractAmount: number;
  previousAmount: number;
  remainingAmount: number;
  forecasts: Record<string, number>;      // { "2026-10": qty, "2026-11": qty, "2026-12": qty }
  forecastAmounts: Record<string, number>; // { "2026-10": amt, "2026-11": amt, "2026-12": amt }
}

export interface LotSummary {
  workPackageId: string;
  lotCode: string;
  lotTitle: string;
  displayOrder: number;
  contractAmount: number;
  previousAmount: number;
  remainingAmount: number;
  monthlyAmounts: Record<string, number>;
  totalForecastAmount: number;
  isBalanced: boolean;
  itemCount: number;
}

export interface ProjectConsolidation {
  totalContractAmount: number;
  totalPreviousAmount: number;
  totalRemainingAmount: number;
  monthlyTotals: Record<string, number>;
  totalForecastThreeMonths: number;
  varianceToRemaining: number;
  isBalanced: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  itemId: string;
  itemNumber: number;
  designation: string;
  field: 'unitPrice' | 'contractQuantity' | 'previousQuantity' | '2026-10' | '2026-11' | '2026-12';
  fieldLabel: string;
  oldValue: number;
  newValue: number;
  user: string;
}

export interface ProjectMetadata {
  projectName: string;
  location: string;
  client: string;
  holding: string;
  contractor: string;
  capital: string;
  date: string;
  isoCertifications: string[];
}
