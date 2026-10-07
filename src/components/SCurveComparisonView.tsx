import React, { useState, useMemo } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatPercent } from '../utils/formatters';
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Info,
  Maximize2,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export const SCurveComparisonView: React.FC = () => {
  const { workPackages, items, getConsolidation, getLotSummaries } = useBudgetStore();
  const consolidation = getConsolidation();
  const lotSummaries = getLotSummaries();

  const [displayUnit, setDisplayUnit] = useState<'DA' | 'PERCENT'>('DA');
  const [selectedLotFilter, setSelectedLotFilter] = useState<string>('ALL');

  // Baseline contractual planned amounts
  // Total Contract = 87 051 380 DA
  // Situation au 06/10/2026 = 1 064 520 DA
  // Octobre 2026 = 9 404 800 DA
  // Novembre 2026 = 31 504 380 DA
  // Décembre 2026 = 45 077 680 DA

  // Filter calculations based on selected lot
  const activeData = useMemo(() => {
    let contractTotal = consolidation.totalContractAmount;
    let baselineInitial = 1064520;
    let baselineOct = consolidation.monthlyTotals['2026-10'] || 9404800;
    let baselineNov = consolidation.monthlyTotals['2026-11'] || 31504380;
    let baselineDec = consolidation.monthlyTotals['2026-12'] || 45077680;

    let actualInitial = consolidation.totalPreviousAmount; // Currently executed in app

    if (selectedLotFilter !== 'ALL') {
      const lot = lotSummaries.find((l) => l.workPackageId === selectedLotFilter);
      if (lot) {
        contractTotal = lot.contractAmount;
        baselineInitial = lot.lotCode === 'LOT 1' ? 1064520 : 0;
        baselineOct = lot.monthlyAmounts['2026-10'] || 0;
        baselineNov = lot.monthlyAmounts['2026-11'] || 0;
        baselineDec = lot.monthlyAmounts['2026-12'] || 0;
        actualInitial = lot.previousAmount;
      }
    }

    // Cumulative Baseline Planned
    const cumPlanInitial = baselineInitial;
    const cumPlanOct = cumPlanInitial + baselineOct;
    const cumPlanNov = cumPlanOct + baselineNov;
    const cumPlanDec = cumPlanNov + baselineDec;

    // Actual / Real Trajectory based on current store progress
    // If progress was updated in app, actualInitial reflects current physical execution
    const actualProgressRatio = contractTotal > 0 ? actualInitial / contractTotal : 0;

    // Projected trajectory interpolating from current actual execution to planned completion
    const actualOct = actualInitial + baselineOct * (actualProgressRatio > 0.05 ? 1.0 : 0.95);
    const actualNov = actualOct + baselineNov * 1.0;
    const actualDec = actualNov + baselineDec * 1.0;

    // Build timeline points
    const points = [
      {
        jalon: 'Situation Initiale',
        date: '06/10/2026',
        description: 'Arrêté officiel',
        planifieMois: baselineInitial,
        planifieCumul: cumPlanInitial,
        reelCumul: actualInitial,
        ecartCumul: actualInitial - cumPlanInitial,
        planifieCumulPct: (cumPlanInitial / contractTotal) * 100,
        reelCumulPct: (actualInitial / contractTotal) * 100,
      },
      {
        jalon: 'Fin Octobre',
        date: '31/10/2026',
        description: 'Terrassements & Réseaux primaires',
        planifieMois: baselineOct,
        planifieCumul: cumPlanOct,
        reelCumul: actualInitial > cumPlanOct ? actualInitial : cumPlanOct,
        ecartCumul: (actualInitial > cumPlanOct ? actualInitial : cumPlanOct) - cumPlanOct,
        planifieCumulPct: (cumPlanOct / contractTotal) * 100,
        reelCumulPct: ((actualInitial > cumPlanOct ? actualInitial : cumPlanOct) / contractTotal) * 100,
      },
      {
        jalon: 'Fin Novembre',
        date: '30/11/2026',
        description: 'Enrobés, Bâche & Pompage',
        planifieMois: baselineNov,
        planifieCumul: cumPlanNov,
        reelCumul: actualInitial > cumPlanNov ? actualInitial : cumPlanNov,
        ecartCumul: (actualInitial > cumPlanNov ? actualInitial : cumPlanNov) - cumPlanNov,
        planifieCumulPct: (cumPlanNov / contractTotal) * 100,
        reelCumulPct: ((actualInitial > cumPlanNov ? actualInitial : cumPlanNov) / contractTotal) * 100,
      },
      {
        jalon: 'Fin Décembre',
        date: '31/12/2026',
        description: 'Finition bitumineuse, Éclairages & Police',
        planifieMois: baselineDec,
        planifieCumul: cumPlanDec,
        reelCumul: contractTotal,
        ecartCumul: 0,
        planifieCumulPct: 100,
        reelCumulPct: 100,
      },
    ];

    return {
      contractTotal,
      points,
      actualInitial,
    };
  }, [consolidation, lotSummaries, selectedLotFilter]);

  // Formatter for charts
  const formatYAxis = (val: number) => {
    if (displayUnit === 'PERCENT') {
      return `${val.toFixed(0)} %`;
    }
    return `${(val / 1000000).toFixed(0)}M DA`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER WITH CONTROLS */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white uppercase tracking-wider">
              INGÉNIERIE DE PILOTAGE BTP
            </span>
            <span className="text-xs text-slate-500 font-mono">
              E.G.U.V.A / GITRA
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Analyse Comparative de la Courbe en S (Dépenses Réelles vs Planning Prévisionnel)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi dynamique de la trajectoire d'extinction financière du marché du Port de Khemisti
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter by Lot */}
          <div className="flex items-center gap-1.5 text-xs">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={selectedLotFilter}
              onChange={(e) => setSelectedLotFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Ensemble du Marché (Global 87,05 M DA)</option>
              {workPackages.map((wp) => (
                <option key={wp.id} value={wp.id}>
                  {wp.code} - {wp.title.slice(0, 25)}...
                </option>
              ))}
            </select>
          </div>

          {/* Unit Toggle: DA vs % */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setDisplayUnit('DA')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors ${
                displayUnit === 'DA'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Dinars (DA)</span>
            </button>
            <button
              onClick={() => setDisplayUnit('PERCENT')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors ${
                displayUnit === 'PERCENT'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Pourcentage (%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRIMARY RECHARTS S-CURVE GRAPH */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Trajectoire Temporelle de Consommation Budgétaire (Courbe en S)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparaison de la courbe planifiée (Baseline), du cumul constaté (Actual) et du plafond du marché
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
              <span>Planning Prévisionnel Initial</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span>Dépenses Réelles / Valeur Acquise</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
              <span>Plafond Contractuel</span>
            </span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-96 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeData.points}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="jalon"
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                padding={{ left: 20, right: 20 }}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: '#475569' }}
                domain={displayUnit === 'PERCENT' ? [0, 105] : [0, 'auto']}
              />
              <Tooltip
                formatter={(val: any, name: any) => {
                  if (displayUnit === 'PERCENT') {
                    return [`${Number(val).toFixed(2)} %`, name];
                  }
                  return [formatDA(Number(val)), name];
                }}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />

              {/* Area for Planned Baseline S-Curve */}
              <Area
                type="monotone"
                dataKey={displayUnit === 'PERCENT' ? 'planifieCumulPct' : 'planifieCumul'}
                name="Planning Prévisionnel Cumulé (Baseline)"
                stroke="#2563EB"
                strokeWidth={3}
                fill="#93C5FD"
                fillOpacity={0.25}
              />

              {/* Line for Actual Real Cumulative Spending */}
              <Line
                type="monotone"
                dataKey={displayUnit === 'PERCENT' ? 'reelCumulPct' : 'reelCumul'}
                name="Dépenses Réelles Cumulées (Constaté)"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />

              {/* Reference line for Contract Ceiling */}
              <ReferenceLine
                y={displayUnit === 'PERCENT' ? 100 : activeData.contractTotal}
                stroke="#DC2626"
                strokeDasharray="4 4"
                label={{
                  value: `Plafond : ${displayUnit === 'PERCENT' ? '100%' : formatDA(activeData.contractTotal)}`,
                  fill: '#DC2626',
                  fontSize: 11,
                  position: 'top',
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABULAR MILESTONE & VARIANCE BREAKDOWN */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Tableau des Jalons Calendaires & Analyse des Écarts de Trésorerie
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Écarts entre les consommations prévues et le cadencement réel constaté
            </p>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
            Objectif d'apurement : 31 Décembre 2026
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Jalon Calendrier</th>
                <th className="py-2.5 px-3">Date d'Arrêté</th>
                <th className="py-2.5 px-3">Description Opérationnelle</th>
                <th className="py-2.5 px-3 text-right">Dépense du Mois (DA)</th>
                <th className="py-2.5 px-3 text-right text-sky-300">Cumul Prévisionnel (DA)</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Cumul Réel Constaté (DA)</th>
                <th className="py-2.5 px-3 text-right">Écart de Trésorerie (DA)</th>
                <th className="py-2.5 px-2 text-center">Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {activeData.points.map((pt, idx) => {
                const isPositive = pt.ecartCumul >= 0;
                return (
                  <tr
                    key={pt.jalon}
                    className={`hover:bg-blue-50/50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">
                      {pt.jalon}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {pt.date}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-700">
                      {pt.description}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800 font-semibold">
                      {formatDA(pt.planifieMois)}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-900 font-bold">
                      {formatDA(pt.planifieCumul)}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ({formatPercent(pt.planifieCumulPct)})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-bold bg-emerald-50/40">
                      {formatDA(pt.reelCumul)}
                      <span className="block text-[10px] text-emerald-600 font-normal">
                        ({formatPercent(pt.reelCumulPct)})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {Math.abs(pt.ecartCumul) < 1 ? (
                        <span className="text-slate-500">0,00 DA</span>
                      ) : isPositive ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          +{formatDA(pt.ecartCumul)}
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center justify-end gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          {formatDA(pt.ecartCumul)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-sans">
                      {Math.abs(pt.ecartCumul) < 1 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ✓ Aligné
                        </span>
                      ) : isPositive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                          Avance
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Retard
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
