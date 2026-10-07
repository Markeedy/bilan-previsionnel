import React from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatPercent } from '../utils/formatters';
import { BudgetRiskSection } from './BudgetRiskSection';
import {
  TrendingUp,
  Wallet,
  CalendarCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const ExecutiveDashboard: React.FC = () => {
  const { getConsolidation, getLotSummaries } = useBudgetStore();
  const consolidation = getConsolidation();
  const lotSummaries = getLotSummaries();

  const totalContract = consolidation.totalContractAmount;
  const previousAmt = consolidation.totalPreviousAmount;
  const remainingAmt = consolidation.totalRemainingAmount;
  const totalForecast = consolidation.totalForecastThreeMonths;

  const previousPct = totalContract > 0 ? (previousAmt / totalContract) * 100 : 0;
  const remainingPct = totalContract > 0 ? (remainingAmt / totalContract) * 100 : 0;
  const coveragePct = remainingAmt > 0 ? (totalForecast / remainingAmt) * 100 : 0;

  const octAmt = consolidation.monthlyTotals['2026-10'] || 0;
  const novAmt = consolidation.monthlyTotals['2026-11'] || 0;
  const decAmt = consolidation.monthlyTotals['2026-12'] || 0;

  // S-Curve Cumulative Data
  const sCurveData = [
    {
      stage: 'Situation Initiale',
      cumulDepense: previousAmt,
      cibleBudget: totalContract,
      fluxMois: previousAmt,
    },
    {
      stage: 'Fin Octobre 2026',
      cumulDepense: previousAmt + octAmt,
      cibleBudget: totalContract,
      fluxMois: octAmt,
    },
    {
      stage: 'Fin Novembre 2026',
      cumulDepense: previousAmt + octAmt + novAmt,
      cibleBudget: totalContract,
      fluxMois: novAmt,
    },
    {
      stage: 'Fin Décembre 2026',
      cumulDepense: previousAmt + octAmt + novAmt + decAmt,
      cibleBudget: totalContract,
      fluxMois: decAmt,
    },
  ];

  // Stacked Bar Data: Monthly charge by Lot
  const stackedBarData = [
    {
      mois: 'Octobre 2026',
      ...lotSummaries.reduce((acc, lot) => {
        acc[lot.lotCode] = lot.monthlyAmounts['2026-10'] || 0;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      mois: 'Novembre 2026',
      ...lotSummaries.reduce((acc, lot) => {
        acc[lot.lotCode] = lot.monthlyAmounts['2026-11'] || 0;
        return acc;
      }, {} as Record<string, number>),
    },
    {
      mois: 'Décembre 2026',
      ...lotSummaries.reduce((acc, lot) => {
        acc[lot.lotCode] = lot.monthlyAmounts['2026-12'] || 0;
        return acc;
      }, {} as Record<string, number>),
    },
  ];

  // Colors for lots
  const LOT_COLORS = [
    '#2563EB', // Lot 1 - Royal Blue
    '#059669', // Lot 2 - Emerald
    '#D97706', // Lot 3 - Amber
    '#7C3AED', // Lot 4 - Purple
    '#DC2626', // Lot 5 - Red
    '#0891B2', // Lot 6 - Cyan
  ];

  const pieData = lotSummaries.map((lot, idx) => ({
    name: `${lot.lotCode} : ${lot.lotTitle.slice(0, 22)}...`,
    value: lot.contractAmount,
    color: LOT_COLORS[idx % LOT_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* 4 PRIMARY EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Budget Marché Global */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full opacity-60 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Budget Global Marché
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
              {formatDA(totalContract)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>44 Postes Techniques répartis sur 6 Lots</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Engagement contractuel</span>
            <span className="font-semibold text-slate-800">100,00 %</span>
          </div>
        </div>

        {/* KPI 2: Réalisé Antérieur */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full opacity-60 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Réalisé Antérieur
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-extrabold text-emerald-700 tracking-tight">
              {formatDA(previousAmt)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px]">
                {formatPercent(previousPct)}
              </span>
              <span>Consommé au 06/10/2026 (Lot 1)</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Postes engagés : Démolition & Terrass.</span>
            <span className="font-semibold text-emerald-700">2 / 44</span>
          </div>
        </div>

        {/* KPI 3: Reste Contractuel à Réaliser */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full opacity-60 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reste à Réaliser
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-extrabold text-slate-900 tracking-tight">
              {formatDA(remainingAmt)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold font-mono text-[11px]">
                {formatPercent(remainingPct)}
              </span>
              <span>Enveloppe résiduelle du contrat</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Objectif d'apurement</span>
            <span className="font-semibold text-amber-700">Trimestre 4</span>
          </div>
        </div>

        {/* KPI 4: Prévision Trimestre */}
        <div className={`bg-white rounded-xl p-4 shadow-sm border ${
          consolidation.isBalanced ? 'border-blue-200 ring-1 ring-blue-100' : 'border-red-300'
        } flex flex-col justify-between relative overflow-hidden`}>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full opacity-60 pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prévision Oct-Nov-Déc
            </span>
            <span className={`p-2 rounded-lg ${
              consolidation.isBalanced ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'
            }`}>
              <CalendarCheck className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-extrabold text-blue-900 tracking-tight">
              {formatDA(totalForecast)}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
              <span className={`px-1.5 py-0.5 rounded font-bold font-mono text-[11px] ${
                consolidation.isBalanced
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {formatPercent(coveragePct)}
              </span>
              <span>{consolidation.isBalanced ? 'Couverture intégrale' : 'Écart détecté !'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Solde contractuel :</span>
            {consolidation.isBalanced ? (
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Équilibre Parfait
              </span>
            ) : (
              <span className="font-bold text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Diff : {formatDA(consolidation.varianceToRemaining)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MONTHLY BREAKDOWN STRIP */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100">
              Rythme d'Exécution Mensuelle & Flux de Trésorerie Prévisionnel
            </h3>
            <p className="text-xs text-slate-400">
              Ventilation temporelle contractuelle des 85 986 860,00 DA sur le 4ème trimestre 2026
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 font-mono text-center">
          <div className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <div className="text-[11px] font-sans text-sky-400 font-semibold uppercase tracking-wider">
              Octobre 2026
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {formatDA(octAmt)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
              10,94% du reste à réaliser
            </div>
          </div>

          <div className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <div className="text-[11px] font-sans text-indigo-400 font-semibold uppercase tracking-wider">
              Novembre 2026
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {formatDA(novAmt)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
              36,64% du reste à réaliser
            </div>
          </div>

          <div className="px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <div className="text-[11px] font-sans text-purple-400 font-semibold uppercase tracking-wider">
              Décembre 2026
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {formatDA(decAmt)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
              52,42% du reste à réaliser
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHICAL DECISION DASHBOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: S-CURVE (Courbe en S de trésorerie cumulée) - 7 COLS */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Courbe en S de Trésorerie Cumulée (Trajectoire de Dépense)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Progression cumulée des dépenses réelles et planifiées jusqu'à extinction du marché
              </p>
            </div>
            <span className="text-[11px] px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono font-medium">
              Total Cible : {formatDA(totalContract)}
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sCurveData} margin={{ top: 15, right: 25, left: 25, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1_000_000).toFixed(0)}M DA`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip
                  formatter={(value: any) => [formatDA(Number(value)), '']}
                  labelStyle={{ fontWeight: 'bold', color: '#0F172A' }}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="cumulDepense"
                  name="Cumul Dépense (DA)"
                  fill="#93C5FD"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fillOpacity={0.35}
                />
                <Line
                  type="stepAfter"
                  dataKey="cibleBudget"
                  name="Plafond Contractuel Marché (DA)"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: STACKED BAR - CHARGE PAR LOT - 5 COLS */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Charge Mensuelle Consolidée par Lot Technique
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Ventilation par lot pour chaque mois du trimestre
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedBarData} margin={{ top: 15, right: 15, left: 15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1_000_000).toFixed(0)}M`}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                />
                <Tooltip
                  formatter={(val: any) => formatDA(Number(val))}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {lotSummaries.map((lot, idx) => (
                  <Bar
                    key={lot.lotCode}
                    dataKey={lot.lotCode}
                    name={lot.lotCode}
                    stackId="a"
                    fill={LOT_COLORS[idx % LOT_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION VISUALISATION DES RISQUES BUDGÉTAIRES & LOTS CRITIQUES */}
      <BudgetRiskSection />

      {/* LOT SUMMARY TABLE CARDS */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
        <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-700" />
          Synthèse Contractuelle par Lot Opérationnel (E.G.U.V.A / GITRA)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lotSummaries.map((lot, idx) => {
            const lotPct = totalContract > 0 ? (lot.contractAmount / totalContract) * 100 : 0;
            const executedPct = lot.contractAmount > 0 ? (lot.previousAmount / lot.contractAmount) * 100 : 0;

            return (
              <div
                key={lot.workPackageId}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="px-2 py-0.5 text-xs font-mono font-bold rounded text-white"
                      style={{ backgroundColor: LOT_COLORS[idx % LOT_COLORS.length] }}
                    >
                      {lot.lotCode}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {lot.itemCount} poste{lot.itemCount > 1 ? 's' : ''} ({formatPercent(lotPct)})
                    </span>
                  </div>

                  <h5 className="font-semibold text-xs text-slate-900 line-clamp-1 mb-2">
                    {lot.lotTitle}
                  </h5>

                  <div className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Montant Marché :</span>
                      <span className="font-semibold text-slate-900">{formatDA(lot.contractAmount)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700">
                      <span>Réalisé Antérieur :</span>
                      <span>{formatDA(lot.previousAmount)} ({formatPercent(executedPct)})</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Reste à Réaliser :</span>
                      <span className="font-semibold">{formatDA(lot.remainingAmount)}</span>
                    </div>
                    <div className="flex justify-between text-blue-800 border-t border-slate-200 pt-1">
                      <span>Prévision Trimestre :</span>
                      <span className="font-bold">{formatDA(lot.totalForecastAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Conformité :</span>
                  {lot.isBalanced ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Équilibré
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Écart : {formatDA(lot.totalForecastAmount - lot.remainingAmount)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
