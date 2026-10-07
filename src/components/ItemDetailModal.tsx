import React from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatQuantity } from '../utils/formatters';
import { X, CheckCircle2, AlertTriangle, Calculator, Calendar } from 'lucide-react';
import { EditableCell } from './EditableCell';

export const ItemDetailModal: React.FC = () => {
  const {
    selectedItemForModal,
    setSelectedItemForModal,
    workPackages,
    updateItemField,
    auditLogs,
  } = useBudgetStore();

  if (!selectedItemForModal) return null;

  const item = selectedItemForModal;
  const wp = workPackages.find((w) => w.id === item.workPackageId);
  const sumForecasts = Object.values(item.forecasts).reduce((a, b) => a + b, 0);
  const isBalanced = Math.abs(sumForecasts - item.remainingQuantity) <= 0.001;
  const itemAudits = auditLogs.filter((a) => a.itemId === item.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-mono font-bold text-sm">
              #{item.itemNumber}
            </span>
            <div>
              <div className="text-xs text-blue-300 font-mono font-semibold">
                {wp?.code} • {wp?.title}
              </div>
              <h3 className="text-sm font-bold text-white">
                Fiche Technique du Poste Contractuel
              </h3>
            </div>
          </div>
          <button
            onClick={() => setSelectedItemForModal(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Designation description */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Descriptif du Bordereau des Prix
            </span>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              {item.designation}
            </p>
            <div className="mt-2.5 flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-600">
                Unité de mesure : <strong className="text-slate-900">{item.unit}</strong>
              </span>
              <span className="text-slate-600">
                Prix Unitaire : <strong className="text-slate-900">{formatDA(item.unitPrice)}</strong>
              </span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium block">
                Quantité Marché
              </span>
              <span className="text-base font-mono font-bold text-slate-900">
                {formatQuantity(item.contractQuantity)} {item.unit}
              </span>
              <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                {formatDA(item.contractAmount)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] text-emerald-700 font-medium block">
                Réalisé Antérieur
              </span>
              <span className="text-base font-mono font-bold text-emerald-800">
                {formatQuantity(item.previousQuantity)} {item.unit}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 block mt-0.5">
                {formatDA(item.previousAmount)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[11px] text-blue-700 font-medium block">
                Reste à Réaliser
              </span>
              <span className="text-base font-mono font-bold text-blue-900">
                {formatQuantity(item.remainingQuantity)} {item.unit}
              </span>
              <span className="text-[11px] font-mono text-blue-600 block mt-0.5">
                {formatDA(item.remainingAmount)}
              </span>
            </div>
          </div>

          {/* Forecasts monthly editable */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Planning Prévisionnel Trimestriel (Octobre - Décembre 2026)
              </h4>
              {isBalanced ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Planifié
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3.5 h-3.5" /> Écart détecté
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <span className="text-[11px] text-blue-900 font-semibold block mb-1">
                  Octobre 2026
                </span>
                <EditableCell
                  value={item.forecasts['2026-10'] || 0}
                  onCommit={(val) => updateItemField(item.id, '2026-10', val)}
                  className="bg-white"
                />
                <span className="text-[10px] font-mono text-blue-700 block mt-1 text-right">
                  {formatDA(item.forecastAmounts['2026-10'] || 0)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <span className="text-[11px] text-indigo-900 font-semibold block mb-1">
                  Novembre 2026
                </span>
                <EditableCell
                  value={item.forecasts['2026-11'] || 0}
                  onCommit={(val) => updateItemField(item.id, '2026-11', val)}
                  className="bg-white"
                />
                <span className="text-[10px] font-mono text-indigo-700 block mt-1 text-right">
                  {formatDA(item.forecastAmounts['2026-11'] || 0)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <span className="text-[11px] text-purple-900 font-semibold block mb-1">
                  Décembre 2026
                </span>
                <EditableCell
                  value={item.forecasts['2026-12'] || 0}
                  onCommit={(val) => updateItemField(item.id, '2026-12', val)}
                  className="bg-white"
                />
                <span className="text-[10px] font-mono text-purple-700 block mt-1 text-right">
                  {formatDA(item.forecastAmounts['2026-12'] || 0)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600">Somme des quantités allouées :</span>
              <span className={`font-bold ${isBalanced ? 'text-slate-900' : 'text-red-600'}`}>
                {formatQuantity(sumForecasts)} / {formatQuantity(item.remainingQuantity)} {item.unit}
              </span>
            </div>
          </div>

          {/* Audit History for this item */}
          {itemAudits.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
              <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Historique des modifications de ce poste ({itemAudits.length})
              </h5>
              <div className="space-y-1.5 max-h-32 overflow-y-auto text-xs">
                {itemAudits.map((a) => (
                  <div key={a.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800">{a.fieldLabel} : </span>
                      <span className="line-through text-slate-400 font-mono">{a.oldValue}</span>
                      <span className="font-bold text-blue-700 font-mono ml-1.5">{a.newValue}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(a.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => setSelectedItemForModal(null)}
            className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
