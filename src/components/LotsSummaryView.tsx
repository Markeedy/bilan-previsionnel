import React from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatPercent } from '../utils/formatters';
import { CheckCircle2, AlertCircle, Building2, ArrowRight } from 'lucide-react';

interface LotsSummaryViewProps {
  onSelectLot: (lotId: string) => void;
}

export const LotsSummaryView: React.FC<LotsSummaryViewProps> = ({ onSelectLot }) => {
  const { getLotSummaries, getConsolidation } = useBudgetStore();
  const summaries = getLotSummaries();
  const consolidation = getConsolidation();

  return (
    <div className="space-y-6">
      {/* Overview Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Bordereau Récapitulatif Contractuel par Lot Opérationnel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidation financière du marché « Réhabilitation du Port de Pêche de Khemisti - Tipaza »
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
            Total Marché : {formatDA(consolidation.totalContractAmount)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px]">
                <th className="py-2.5 px-3">Lot Opérationnel</th>
                <th className="py-2.5 px-2 text-center">Postes</th>
                <th className="py-2.5 px-3 text-right">Montant Marché (DA)</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Réalisé Antérieur (DA)</th>
                <th className="py-2.5 px-3 text-right text-sky-300">Prévision Octobre (DA)</th>
                <th className="py-2.5 px-3 text-right text-indigo-300">Prévision Novembre (DA)</th>
                <th className="py-2.5 px-3 text-right text-purple-300">Prévision Décembre (DA)</th>
                <th className="py-2.5 px-3 text-right text-amber-300">Solde Trimestriel (DA)</th>
                <th className="py-2.5 px-2 text-center">Conformité</th>
                <th className="py-2.5 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {summaries.map((lot, idx) => (
                <tr
                  key={lot.workPackageId}
                  className={`hover:bg-blue-50/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <td className="py-3 px-3 font-sans">
                    <div className="font-bold text-slate-900">{lot.lotCode}</div>
                    <div className="text-[11px] text-slate-500">{lot.lotTitle}</div>
                  </td>
                  <td className="py-3 px-2 text-center text-slate-600 font-sans">
                    {lot.itemCount}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800">
                    {formatDA(lot.contractAmount)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-semibold">
                    {formatDA(lot.previousAmount)}
                  </td>
                  <td className="py-3 px-3 text-right text-blue-900">
                    {formatDA(lot.monthlyAmounts['2026-10'] || 0)}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-900">
                    {formatDA(lot.monthlyAmounts['2026-11'] || 0)}
                  </td>
                  <td className="py-3 px-3 text-right text-purple-900">
                    {formatDA(lot.monthlyAmounts['2026-12'] || 0)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-950 bg-slate-100/50">
                    {formatDA(lot.totalForecastAmount)}
                  </td>
                  <td className="py-3 px-2 text-center font-sans">
                    {lot.isBalanced ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold px-2 py-0.5 rounded bg-emerald-100">
                        <CheckCircle2 className="w-3 h-3" /> 100%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-700 font-bold px-2 py-0.5 rounded bg-red-100">
                        <AlertCircle className="w-3 h-3" /> Écart
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-sans">
                    <button
                      onClick={() => onSelectLot(lot.workPackageId)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1 mx-auto"
                    >
                      <span>Voir</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Grand Total Footer */}
            <tfoot className="bg-slate-950 text-white font-mono font-bold text-xs border-t-2 border-amber-400">
              <tr>
                <td className="py-3 px-3 font-sans tracking-wide text-amber-300">
                  TOTAL GÉNÉRAL CONSOLIDÉ
                </td>
                <td className="py-3 px-2 text-center text-slate-300 font-sans">
                  44
                </td>
                <td className="py-3 px-3 text-right text-slate-100">
                  {formatDA(consolidation.totalContractAmount)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-400">
                  {formatDA(consolidation.totalPreviousAmount)}
                </td>
                <td className="py-3 px-3 text-right text-sky-300">
                  {formatDA(consolidation.monthlyTotals['2026-10'] || 0)}
                </td>
                <td className="py-3 px-3 text-right text-indigo-300">
                  {formatDA(consolidation.monthlyTotals['2026-11'] || 0)}
                </td>
                <td className="py-3 px-3 text-right text-purple-300">
                  {formatDA(consolidation.monthlyTotals['2026-12'] || 0)}
                </td>
                <td className="py-3 px-3 text-right text-amber-400 text-sm font-extrabold">
                  {formatDA(consolidation.totalForecastThreeMonths)}
                </td>
                <td className="py-3 px-2 text-center font-sans">
                  {consolidation.isBalanced ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[11px] font-bold">
                      100.00%
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[11px] font-bold">
                      Écart
                    </span>
                  )}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
