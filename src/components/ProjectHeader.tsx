import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { exportBudgetToExcel } from '../services/excelService';
import {
  FileSpreadsheet,
  RotateCcw,
  History,
  Database,
  ShieldCheck,
  Calendar,
  Building,
  Check,
  Loader2,
  HardDriveDownload,
  Award,
} from 'lucide-react';

interface ProjectHeaderProps {
  onOpenAudit: () => void;
  onOpenSql: () => void;
  activeTab: 'DASHBOARD' | 'GRID' | 'LOTS';
  setActiveTab: (tab: 'DASHBOARD' | 'GRID' | 'LOTS') => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  onOpenAudit,
  onOpenSql,
  activeTab,
  setActiveTab,
}) => {
  const { metadata, workPackages, items, isSyncing, resetToDefault } = useBudgetStore();
  const [isExporting, setIsExporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportBudgetToExcel(metadata, workPackages, items);
    } catch (err) {
      console.error('Erreur export Excel', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmReset = () => {
    resetToDefault();
    setShowResetConfirm(false);
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-lg">
      {/* TOP INSTITUTIONAL BAR */}
      <div className="bg-slate-950 px-4 sm:px-6 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            {metadata.holding}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-medium">
            {metadata.client}
          </span>
          <span className="hidden md:inline text-slate-500">
            (EPE Spa - Capital : {metadata.capital})
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Certifié :</span>
            <span>{metadata.isoCertifications.join(' • ')}</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>ALGER LE : {metadata.date}</span>
          </div>

          {/* Sync indicator */}
          <div className="flex items-center gap-1 text-[11px]">
            {isSyncing ? (
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Calcul en cours...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Check className="w-3 h-3" />
                <span>Persistance Active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MAIN PROJECT HEADER */}
      <div className="px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md border border-blue-400/30">
            <Building className="w-7 h-7 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded text-[11px] font-mono font-bold tracking-wider uppercase">
                PROJET MARCHÉ PUBLIC BTP
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded text-[11px] font-mono font-medium">
                WILAYA DE TIPAZA
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              {metadata.projectName}
            </h1>

            <p className="text-xs text-slate-400 mt-0.5">
              Suivi Financier & Prévisionnel du 4ème Trimestre 2026 • Maître d'Œuvre : E.G.U.V.A / GITRA
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Excel Export */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            title="Exporter le classeur Excel avec formules SOMME et PRODUIT"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Audit Log Modal Trigger */}
          <button
            onClick={onOpenAudit}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            title="Consulter le journal d'audit immuable des modifications"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>Audit</span>
          </button>

          {/* SQL Schema Modal Trigger */}
          <button
            onClick={onOpenSql}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            title="Voir le schéma relationnel PostgreSQL, les Triggers et les règles RLS Supabase"
          >
            <Database className="w-4 h-4 text-amber-400" />
            <span>Schéma SQL</span>
          </button>

          {/* Reset button */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 text-slate-400 rounded-lg text-xs font-semibold border border-slate-700 shadow-sm transition-all"
            title="Réinitialiser l'ensemble des métrés et prévisions au bordereau contractuel initial"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="px-4 sm:px-6 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('GRID')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'GRID'
                ? 'border-blue-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>Bordereau Prévisionnel Détaille (44 Postes)</span>
          </button>

          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'DASHBOARD'
                ? 'border-blue-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Building className="w-4 h-4 text-emerald-400" />
            <span>Tableau de Bord & Décisionnel (Courbe en S & KPIs)</span>
          </button>

          <button
            onClick={() => setActiveTab('LOTS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'LOTS'
                ? 'border-blue-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Synthèse des 6 Lots Contractuels</span>
          </button>
        </div>
      </div>

      {/* CONFIRM RESET MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Confirmation de réinitialisation
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Êtes-vous certain de vouloir rétablir les données initiales du marché du Port de Khemisti ? Toutes vos modifications locales de quantités ou de prix seront réinitialisées à l'état officiel certifié du 06/10/2026.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg border border-slate-700 hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm"
              >
                Confirmer la réinitialisation
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
