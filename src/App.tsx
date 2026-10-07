import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBudgetStore } from './store/useBudgetStore';
import { ProjectHeader } from './components/ProjectHeader';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { BudgetGrid } from './components/BudgetGrid';
import { LotsSummaryView } from './components/LotsSummaryView';
import { AuditLogModal } from './components/AuditLogModal';
import { SqlSchemaModal } from './components/SqlSchemaModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { formatDA } from './utils/formatters';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Building,
  Layers,
  FileCheck2,
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

function MainContent() {
  const [activeTab, setActiveTab] = useState<'GRID' | 'DASHBOARD' | 'LOTS'>('GRID');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSqlOpen, setIsSqlOpen] = useState(false);

  const { getConsolidation, setSelectedLotFilter, expandAllLots } = useBudgetStore();
  const consolidation = getConsolidation();

  const handleSelectLotFromSummary = (lotId: string) => {
    setSelectedLotFilter(lotId);
    expandAllLots();
    setActiveTab('GRID');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <ProjectHeader
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenSql={() => setIsSqlOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* CONTRACT VERIFICATION BANNER */}
        {!consolidation.isBalanced ? (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-xl shadow-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-red-900 uppercase tracking-wide">
                Divergence Budgétaire Détectée par le Moteur de Contrôle BTP
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                La somme des prévisions du trimestre (
                <strong className="font-mono">{formatDA(consolidation.totalForecastThreeMonths)}</strong>) s'écarte du montant restant à réaliser (
                <strong className="font-mono">{formatDA(consolidation.totalRemainingAmount)}</strong>). Écart résiduel :{' '}
                <strong className="font-mono">{formatDA(consolidation.varianceToRemaining)}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/80 border border-emerald-200/90 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between text-xs text-emerald-900 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <FileCheck2 className="w-4 h-4" />
              </span>
              <div>
                <strong className="font-semibold text-emerald-950">
                  Conformité Contractuelle Validée à 100,00 % :
                </strong>{' '}
                Le montant restant à réaliser (
                <span className="font-mono font-bold">{formatDA(consolidation.totalRemainingAmount)}</span>) est rigoureusement couvert par les prévisions d'Octobre (
                <span className="font-mono font-semibold">9 404 800,00 DA</span>), Novembre (
                <span className="font-mono font-semibold">31 504 380,00 DA</span>) et Décembre (
                <span className="font-mono font-semibold">45 077 680,00 DA</span>).
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-800">
              <span className="px-2 py-0.5 bg-emerald-200/70 rounded font-bold">
                Écart : 0,00 DA
              </span>
            </div>
          </div>
        )}

        {/* ACTIVE TAB CONTENT */}
        {activeTab === 'GRID' && <BudgetGrid />}
        {activeTab === 'DASHBOARD' && <ExecutiveDashboard />}
        {activeTab === 'LOTS' && (
          <LotsSummaryView onSelectLot={handleSelectLotFromSummary} />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 py-6 px-4 sm:px-6 text-xs mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-slate-200 text-sm">
              <Building className="w-4 h-4 text-blue-400" />
              <span>Système de Suivi Budgétaire et Prévisionnel Chantier</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Marché : Réhabilitation du Port de Pêche de Khemisti (Wilaya de Tipaza) • E.G.U.V.A / GITRA
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-400 font-mono text-[11px]">
            <div>
              Budget Contractuel : <strong className="text-white">87 051 380,00 DA</strong>
            </div>
            <div>
              Consommé au 06/10/2026 : <strong className="text-emerald-400">1 064 520,00 DA</strong>
            </div>
            <div>
              Reste à Réaliser : <strong className="text-amber-300">85 986 860,00 DA</strong>
            </div>
            <div>
              Normes : <strong className="text-slate-300">ISO 9001 • ISO 14001 • ISO 45001</strong>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AuditLogModal isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
      <SqlSchemaModal isOpen={isSqlOpen} onClose={() => setIsSqlOpen(false)} />
      <ItemDetailModal />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainContent />
    </QueryClientProvider>
  );
}
