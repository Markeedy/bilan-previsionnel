import React, { useState, useMemo } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatQuantity, formatPercent } from '../utils/formatters';
import {
  Activity,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Sliders,
  DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const PhysicalProgressView: React.FC = () => {
  const {
    workPackages,
    items,
    updateItemProgressPercentage,
    updateLotProgressPercentage,
    getEVMMetrics,
    getLotSummaries,
  } = useBudgetStore();

  const [selectedLotFilter, setSelectedLotFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batchLotPercentage, setBatchLotPercentage] = useState<number>(10);
  const [batchSelectedLot, setBatchSelectedLot] = useState<string>('wp-1');

  const evm = getEVMMetrics();
  const lotSummaries = getLotSummaries();

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedLotFilter !== 'ALL' && item.workPackageId !== selectedLotFilter) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          String(item.itemNumber).includes(q) ||
          item.designation.toLowerCase().includes(q) ||
          item.unit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedLotFilter, searchQuery]);

  // Group by work package
  const itemsByLot = useMemo(() => {
    const map = new Map<string, typeof items>();
    workPackages.forEach((wp) => map.set(wp.id, []));
    filteredItems.forEach((it) => {
      const arr = map.get(it.workPackageId);
      if (arr) arr.push(it);
    });
    return map;
  }, [filteredItems, workPackages]);

  // Chart data: Budget vs Valeur Acquise by Lot
  const chartData = lotSummaries.map((lot) => ({
    lotCode: lot.lotCode,
    name: lot.lotCode,
    budgetContractuel: Number((lot.contractAmount / 1000000).toFixed(2)),
    valeurAcquise: Number((lot.previousAmount / 1000000).toFixed(2)),
    resteARealiser: Number((lot.remainingAmount / 1000000).toFixed(2)),
  }));

  const handleApplyLotBatch = () => {
    updateLotProgressPercentage(batchSelectedLot, batchLotPercentage);
  };

  return (
    <div className="space-y-6">
      {/* 4 PRIMARY EVM METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Avancement Physique Global */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Avancement Physique Global
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Percent className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-mono font-black text-blue-700 tracking-tight">
              {formatPercent(evm.physicalProgressPct)}
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, evm.physicalProgressPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-mono">
              <span>Pondération financière</span>
              <span>Cible : 100,00 %</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Reste physique à réaliser</span>
            <span className="font-semibold text-slate-900">
              {formatPercent(100 - evm.physicalProgressPct)}
            </span>
          </div>
        </div>

        {/* KPI 2: Valeur Acquise (EV) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Valeur Acquise (EV - Earned Value)
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-emerald-700 tracking-tight">
              {formatDA(evm.totalEV)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Valeur des travaux physiquement réalisés sur le site du port
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Formule EVM :</span>
            <span className="font-mono font-semibold text-emerald-700">∑ (% Phys × Montant Marché)</span>
          </div>
        </div>

        {/* KPI 3: Coût Réel Consommé (AC) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Budget Consommé (AC - Actual Cost)
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-indigo-700 tracking-tight">
              {formatDA(evm.totalAC)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Dépense réelle d'exécution au bordereau contractuel
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Écart Coût (CV = EV - AC) :</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatDA(evm.costVariance)}
            </span>
          </div>
        </div>

        {/* KPI 4: Indices CPI & SPI */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Indices de Performance (CPI / SPI)
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600 font-sans">Indice Coûts (CPI) :</span>
              <span className="font-bold text-emerald-700">{evm.cpi.toFixed(2)} (Conforme)</span>
            </div>
            <div className="flex justify-between items-center p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600 font-sans">Indice Délais (SPI) :</span>
              <span className="font-bold text-blue-700">{evm.spi.toFixed(2)} (À jour)</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Reste à exécuter (ETC) :</span>
            <span className="font-mono font-bold text-slate-900">{formatDA(evm.etc)}</span>
          </div>
        </div>
      </div>

      {/* QUICK BATCH ADJUSTMENT TOOLBAR */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide">
              Mise à Jour Forfaitaire Rapide par Lot Opérationnel
            </h4>
            <p className="text-[11px] text-slate-400">
              Appliquez un pourcentage d'avancement d'un clic à l'ensemble des postes d'un lot
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={batchSelectedLot}
            onChange={(e) => setBatchSelectedLot(e.target.value)}
            className="py-1.5 px-3 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {workPackages.map((wp) => (
              <option key={wp.id} value={wp.id}>
                {wp.code} - {wp.title.slice(0, 30)}...
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-400">Avancement :</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={batchLotPercentage}
              onChange={(e) => setBatchLotPercentage(Number(e.target.value))}
              className="w-16 bg-slate-900 text-white text-right px-2 py-0.5 rounded font-mono font-bold border border-slate-600"
            />
            <span className="text-slate-300 font-bold">%</span>
          </div>

          <button
            onClick={handleApplyLotBatch}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-sm transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Appliquer au Lot</span>
          </button>
        </div>
      </div>

      {/* RECHARTS COMPARISON: BUDGET VS EARNED VALUE BY LOT */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Comparaison de la Valeur Acquise (EV) par Rapport au Budget Marché (BAC)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Montants exprimés en Millions de Dinars Algériens (M DA) pour chacun des 6 lots
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 rounded text-slate-700 font-semibold">
            Consommé Total : {formatDA(evm.totalEV)} / {formatDA(evm.totalBAC)}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="lotCode" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis
                tickFormatter={(val) => `${val}M`}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <Tooltip
                formatter={(val: any) => [`${val} Millions DA`, '']}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                  border: 'none',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="budgetContractuel" name="Budget Contractuel (BAC)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="valeurAcquise" name="Valeur Acquise Réalisée (EV)" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resteARealiser" name="Reste à Réaliser (ETC)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FILTER TOOLBAR FOR ITEMS GRID */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par poste, unité..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedLotFilter}
                onChange={(e) => setSelectedLotFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tous les Lots (44 Postes)</option>
                {workPackages.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.code} - {wp.title.slice(0, 30)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {filteredItems.length} article{filteredItems.length > 1 ? 's' : ''} affiché{filteredItems.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* INTERACTIVE PROGRESS TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 w-12 text-center">N°</th>
                <th className="py-2.5 px-3 w-80">Désignation du Poste</th>
                <th className="py-2.5 px-2 text-center w-12">U</th>
                <th className="py-2.5 px-3 text-right w-24">Prix Unit.</th>
                <th className="py-2.5 px-3 text-right w-28">Qté Marché</th>
                <th className="py-2.5 px-4 w-72 text-center text-sky-300 bg-slate-950">
                  Curseur d'Avancement Physique (%)
                </th>
                <th className="py-2.5 px-3 text-right w-28 text-emerald-300">Qté Réalisée</th>
                <th className="py-2.5 px-3 text-right w-36 text-emerald-300">Valeur Acquise (DA)</th>
                <th className="py-2.5 px-3 text-right w-36">Reste à Réaliser (DA)</th>
                <th className="py-2.5 px-2 text-center w-20">Statut</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {workPackages.map((wp) => {
                const lotItems = itemsByLot.get(wp.id) || [];
                if (lotItems.length === 0) return null;

                const lotSummary = lotSummaries.find((s) => s.workPackageId === wp.id);
                const lotProgressPct = lotSummary && lotSummary.contractAmount > 0
                  ? (lotSummary.previousAmount / lotSummary.contractAmount) * 100
                  : 0;

                return (
                  <React.Fragment key={wp.id}>
                    {/* LOT HEADER ROW */}
                    <tr className="bg-slate-100 border-y border-slate-300 font-bold text-slate-800">
                      <td colSpan={5} className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-700 text-white text-[11px] rounded font-mono">
                            {wp.code}
                          </span>
                          <span className="text-xs">{wp.title}</span>
                          <span className="text-slate-500 font-normal">
                            ({lotItems.length} postes)
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-4 bg-slate-200/50">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-24 bg-slate-300 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, lotProgressPct)}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {formatPercent(lotProgressPct)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-500 font-mono text-[11px]">
                        —
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-800 font-mono font-bold">
                        {lotSummary ? formatDA(lotSummary.previousAmount) : '0,00 DA'}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-900 font-mono font-bold">
                        {lotSummary ? formatDA(lotSummary.remainingAmount) : '0,00 DA'}
                      </td>
                      <td></td>
                    </tr>

                    {/* ITEMS IN LOT */}
                    {lotItems.map((item, idx) => {
                      const itemProgressPct = item.contractQuantity > 0
                        ? (item.previousQuantity / item.contractQuantity) * 100
                        : 0;

                      const isComplete = itemProgressPct >= 99.99;
                      const isStarted = itemProgressPct > 0.01;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-blue-50/50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="py-2 px-3 text-center font-bold text-slate-700 font-mono">
                            #{item.itemNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium line-clamp-2 max-w-sm" title={item.designation}>
                            {item.designation}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                              {item.unit}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {formatDA(item.unitPrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatQuantity(item.contractQuantity)}
                          </td>

                          {/* INTERACTIVE SLIDER & INPUT CELL */}
                          <td className="py-2 px-4 bg-slate-50/60 border-x border-slate-200">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={itemProgressPct}
                                  onChange={(e) =>
                                    updateItemProgressPercentage(item.id, parseFloat(e.target.value))
                                  }
                                  className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                                />

                                <div className="flex items-center gap-1 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={Number(itemProgressPct.toFixed(1))}
                                    onChange={(e) =>
                                      updateItemProgressPercentage(item.id, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-14 text-right px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <span className="text-[11px] font-bold text-slate-500">%</span>
                                </div>
                              </div>

                              {/* Quick step buttons */}
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => updateItemProgressPercentage(item.id, 0)}
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors"
                                  >
                                    0%
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateItemProgressPercentage(
                                        item.id,
                                        Math.min(100, itemProgressPct + 10)
                                      )
                                    }
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-blue-600 transition-colors"
                                  >
                                    +10%
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateItemProgressPercentage(
                                        item.id,
                                        Math.min(100, itemProgressPct + 25)
                                      )
                                    }
                                    className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-blue-600 transition-colors"
                                  >
                                    +25%
                                  </button>
                                </div>

                                <button
                                  onClick={() => updateItemProgressPercentage(item.id, 100)}
                                  className="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold transition-colors"
                                >
                                  100% Terminé
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* RESULTING QUANTITY */}
                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-semibold">
                            {formatQuantity(item.previousQuantity)} {item.unit}
                          </td>

                          {/* EARNED VALUE (DA) */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                            {formatDA(item.previousAmount)}
                          </td>

                          {/* REMAINING (DA) */}
                          <td className="py-2 px-3 text-right font-mono text-slate-800">
                            {formatDA(item.remainingAmount)}
                          </td>

                          {/* STATUS BADGE */}
                          <td className="py-2 px-2 text-center">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Terminé
                              </span>
                            ) : isStarted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                <Clock className="w-3 h-3 text-blue-600" />
                                En cours
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                Attente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* GRAND TOTAL ROW */}
            <tfoot className="bg-slate-950 text-white font-mono font-bold text-xs border-t-2 border-emerald-400">
              <tr>
                <td colSpan={5} className="py-3 px-3 font-sans tracking-wide text-emerald-300">
                  TOTAL GÉNÉRAL CONSOLIDÉ (VALEUR ACQUISE DU CHANTIER)
                </td>
                <td className="py-3 px-4 text-center text-emerald-300 font-bold font-sans">
                  Avancement Global Pondéré : {formatPercent(evm.physicalProgressPct)}
                </td>
                <td className="py-3 px-3 text-right text-slate-300">
                  —
                </td>
                <td className="py-3 px-3 text-right text-emerald-400 text-sm font-extrabold">
                  {formatDA(evm.totalEV)}
                </td>
                <td className="py-3 px-3 text-right text-slate-200">
                  {formatDA(evm.totalBAC - evm.totalEV)}
                </td>
                <td className="py-3 px-2 text-center font-sans">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[11px] font-bold">
                    {formatPercent(evm.physicalProgressPct)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
