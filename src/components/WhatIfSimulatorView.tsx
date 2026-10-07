import React, { useState, useMemo } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatPercent } from '../utils/formatters';
import {
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Clock,
  Sparkles,
  RotateCcw,
  ShieldAlert,
  ArrowRight,
  Flame,
  FileCheck2,
  BarChart3,
  Waves,
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
  ReferenceLine,
} from 'recharts';

export const WhatIfSimulatorView: React.FC = () => {
  const { getConsolidation, lotSummaries, workPackages } = useBudgetStore((state) => ({
    getConsolidation: state.getConsolidation,
    lotSummaries: state.getLotSummaries(),
    workPackages: state.workPackages,
  }));

  const consolidation = getConsolidation();
  const initialContractTotal = consolidation.totalContractAmount; // 87 051 380 DA

  // Baseline Monthly Forecasts
  const baseOct = consolidation.monthlyTotals['2026-10'] || 9404800;
  const baseNov = consolidation.monthlyTotals['2026-11'] || 31504380;
  const baseDec = consolidation.monthlyTotals['2026-12'] || 45077680;

  // --- PARAMÈTRES DU SIMULATEUR WHAT-IF ---
  // 1. Délais et glissement calendaire
  const [decemberSlippagePct, setDecemberSlippagePct] = useState<number>(0); // 0% à 60% reporté sur T1 2027
  const [delayMonths, setDelayMonths] = useState<number>(1); // 1 ou 2 mois de report

  // 2. Inflation & Variations des coûts unitaires
  const [bitumenPriceChange, setBitumenPriceChange] = useState<number>(0); // -10% à +30%
  const [marineConcretePriceChange, setMarineConcretePriceChange] = useState<number>(0); // -10% à +30%
  const [generalMaterialsInflation, setGeneralMaterialsInflation] = useState<number>(0); // 0% à +20%

  // 3. Trésorerie & Délais de paiement du Maître d'Ouvrage
  const [clientPaymentTermsDays, setClientPaymentTermsDays] = useState<number>(60); // 30, 60 ou 90 jours
  const [retentionGuaranteePct, setRetentionGuaranteePct] = useState<number>(5); // 5% ou 10% de retenue de garantie
  const [creditFacilityLimit, setCreditFacilityLimit] = useState<number>(15000000); // 15M DA autorisation de découvert

  // PRÉRÉGLAGES DE SCÉNARIOS
  const applyPreset = (preset: 'NOMINAL' | 'WINTER_STORM' | 'INFLATION' | 'PAYMENT_DELAY' | 'ACCELERATION') => {
    switch (preset) {
      case 'NOMINAL':
        setDecemberSlippagePct(0);
        setDelayMonths(1);
        setBitumenPriceChange(0);
        setMarineConcretePriceChange(0);
        setGeneralMaterialsInflation(0);
        setClientPaymentTermsDays(60);
        setRetentionGuaranteePct(5);
        break;
      case 'WINTER_STORM':
        setDecemberSlippagePct(40); // 40% de décembre reporté à janvier/février à cause de la houle
        setDelayMonths(2);
        setBitumenPriceChange(5);
        setMarineConcretePriceChange(5);
        setGeneralMaterialsInflation(3);
        setClientPaymentTermsDays(60);
        break;
      case 'INFLATION':
        setDecemberSlippagePct(0);
        setBitumenPriceChange(18); // +18% sur le bitume
        setMarineConcretePriceChange(15); // +15% sur béton ciment prise mer
        setGeneralMaterialsInflation(8);
        setClientPaymentTermsDays(60);
        break;
      case 'PAYMENT_DELAY':
        setDecemberSlippagePct(10);
        setBitumenPriceChange(0);
        setMarineConcretePriceChange(0);
        setGeneralMaterialsInflation(0);
        setClientPaymentTermsDays(90); // 90 jours de décalage des décomptes
        setRetentionGuaranteePct(10);
        break;
      case 'ACCELERATION':
        setDecemberSlippagePct(-20); // 20% de travaux anticipés en Novembre
        setDelayMonths(1);
        setBitumenPriceChange(6); // Surcoût heures supplémentaires / travaux de nuit
        setMarineConcretePriceChange(4);
        setGeneralMaterialsInflation(2);
        setClientPaymentTermsDays(30);
        break;
    }
  };

  // CALCULS DU SCÉNARIO SIMULÉ
  const simulation = useMemo(() => {
    // 1. Calcul des surcoûts par famille de matériaux
    const bitumenBase = 22959400; // Grave-bitume (14.53M) + Béton bitumineux (8.43M)
    const bitumenCostVariance = bitumenBase * (bitumenPriceChange / 100);

    const marineConcreteBase = 15900000; // Béton armé 350 kg prise mer
    const concreteCostVariance = marineConcreteBase * (marineConcretePriceChange / 100);

    const otherMaterialsBase = initialContractTotal - bitumenBase - marineConcreteBase;
    const generalInflationVariance = otherMaterialsBase * (generalMaterialsInflation / 100);

    const totalCostVariance = bitumenCostVariance + concreteCostVariance + generalInflationVariance;
    const simulatedBAC = initialContractTotal + totalCostVariance;
    const budgetVariancePct = (totalCostVariance / initialContractTotal) * 100;

    // 2. Redistribution temporelle des dépenses du trimestre + report éventuel
    let simOct = baseOct * (1 + (bitumenCostVariance + generalInflationVariance) / initialContractTotal);
    let simNov = baseNov * (1 + totalCostVariance / initialContractTotal);
    let simDec = baseDec * (1 + totalCostVariance / initialContractTotal);

    let slippedAmt = 0;
    let slippedToJan = 0;
    let slippedToFeb = 0;

    if (decemberSlippagePct > 0) {
      slippedAmt = simDec * (decemberSlippagePct / 100);
      simDec -= slippedAmt;
      if (delayMonths === 1) {
        slippedToJan = slippedAmt;
      } else {
        slippedToJan = slippedAmt * 0.6;
        slippedToFeb = slippedAmt * 0.4;
      }
    } else if (decemberSlippagePct < 0) {
      // Cas accélération : anticiper des travaux de Décembre sur Novembre
      const accelerated = simDec * (Math.abs(decemberSlippagePct) / 100);
      simNov += accelerated;
      simDec -= accelerated;
    }

    // 3. Chronique de Trésorerie (Dépenses réelles vs Encaissements décalés)
    const months = [
      { name: 'Octobre 2026', depense: simOct, depenseNominale: baseOct },
      { name: 'Novembre 2026', depense: simNov, depenseNominale: baseNov },
      { name: 'Décembre 2026', depense: simDec, depenseNominale: baseDec },
      { name: 'Janvier 2027', depense: slippedToJan, depenseNominale: 0 },
      { name: 'Février 2027', depense: slippedToFeb, depenseNominale: 0 },
    ];

    // Encaissements prévisionnels avec délai de paiement et retenue de garantie
    const retentionFactor = 1 - retentionGuaranteePct / 100;
    const delayStep = clientPaymentTermsDays >= 90 ? 3 : clientPaymentTermsDays >= 60 ? 2 : 1;

    let cumExpense = 1064520; // Situation initiale
    let cumIncome = 1064520;  // Situation initiale encaissée
    let lowestNetCash = 0;

    const timelineData = months.map((m, idx) => {
      cumExpense += m.depense;

      // Encaissement basé sur la dépense d'il y a `delayStep` mois
      let monthlyIncome = 0;
      if (idx - delayStep >= 0) {
        monthlyIncome = months[idx - delayStep].depense * retentionFactor;
      } else if (idx === 0) {
        monthlyIncome = 500000; // avance forfaitaire
      }

      cumIncome += monthlyIncome;
      const netCash = cumIncome - cumExpense; // Solde net de trésorerie

      if (netCash < lowestNetCash) {
        lowestNetCash = netCash;
      }

      return {
        month: m.name,
        depenseNominale: Math.round(m.depenseNominale),
        depenseSimulee: Math.round(m.depense),
        encaissement: Math.round(monthlyIncome),
        depenseCumulee: Math.round(cumExpense),
        encaissementCumule: Math.round(cumIncome),
        tresorerieNette: Math.round(netCash),
        seuilDecouvert: -creditFacilityLimit,
      };
    });

    const isAvenantRequired = budgetVariancePct > 10.0;
    const isCreditExceeded = Math.abs(lowestNetCash) > creditFacilityLimit;

    return {
      bitumenCostVariance,
      concreteCostVariance,
      generalInflationVariance,
      totalCostVariance,
      simulatedBAC,
      budgetVariancePct,
      timelineData,
      lowestNetCash,
      isAvenantRequired,
      isCreditExceeded,
      slippedAmt,
    };
  }, [
    bitumenPriceChange,
    marineConcretePriceChange,
    generalMaterialsInflation,
    decemberSlippagePct,
    delayMonths,
    clientPaymentTermsDays,
    retentionGuaranteePct,
    creditFacilityLimit,
    baseOct,
    baseNov,
    baseDec,
    initialContractTotal,
  ]);

  return (
    <div className="space-y-6">
      {/* HEADER WITH SCENARIO PRESETS */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-600 text-white uppercase tracking-wider">
              SIMULATEUR PRÉDICTIF BTP
            </span>
            <span className="text-xs text-slate-500 font-mono">
              E.G.U.V.A / GITRA
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            Simulateur de Scénarios « What-If » & Modélisation de Trésorerie
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Testez l'impact direct des dérives de coûts, retards climatiques et délais d'encaissement sur le budget final du Port de Khemisti
          </p>
        </div>

        {/* Quick Scenario Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset('NOMINAL')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors"
            title="Revenir au scénario contractuel nominal"
          >
            📋 Nominal
          </button>
          <button
            onClick={() => applyPreset('WINTER_STORM')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
            title="Simuler un report de 40% des travaux de décembre sur janvier/février (houle hivernale)"
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Tempête Décembre</span>
          </button>
          <button
            onClick={() => applyPreset('INFLATION')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
            title="Simuler une hausse des bitumes (+18%) et du ciment prise mer (+15%)"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Choc Matériaux</span>
          </button>
          <button
            onClick={() => applyPreset('PAYMENT_DELAY')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1"
            title="Simuler un allongement du délai d'encaissement client à 90 jours"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Décalage Paiement 90j</span>
          </button>
          <button
            onClick={() => applyPreset('ACCELERATION')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1"
            title="Simuler une accélération des travaux pour finaliser avant fin novembre"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Accélération</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY SIMULATION KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Budget Global Simulé */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Budget Global Simulé (BAC)
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-slate-900 tracking-tight">
              {formatDA(simulation.simulatedBAC)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                simulation.totalCostVariance > 0
                  ? 'bg-rose-100 text-rose-800'
                  : simulation.totalCostVariance < 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {simulation.totalCostVariance >= 0 ? '+' : ''}{formatPercent(simulation.budgetVariancePct)}
              </span>
              <span className="text-slate-500">vs Marché Initial</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Impact financier :</span>
            <span className={`font-mono font-bold ${simulation.totalCostVariance > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {simulation.totalCostVariance >= 0 ? '+' : ''}{formatDA(simulation.totalCostVariance)}
            </span>
          </div>
        </div>

        {/* Card 2: Seuil Légal d'Avenant Marché */}
        <div className={`bg-white rounded-xl p-5 shadow-sm border ${
          simulation.isAvenantRequired ? 'border-rose-400 ring-1 ring-rose-200' : 'border-slate-200'
        } flex flex-col justify-between relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Conformité Code Marchés Publics
            </span>
            <span className={`p-2 rounded-lg ${
              simulation.isAvenantRequired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {simulation.isAvenantRequired ? <ShieldAlert className="w-5 h-5" /> : <FileCheck2 className="w-5 h-5" />}
            </span>
          </div>
          <div>
            <div className={`text-xl font-bold tracking-tight ${
              simulation.isAvenantRequired ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {simulation.isAvenantRequired ? 'AVENANT OBLIGATOIRE' : 'DANS LES LIMITES'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {simulation.isAvenantRequired
                ? 'Dépassement du seuil légal de 10% (CMP algérien). Requiert visa de la commission.'
                : 'Variation absorbable sans modification de l\'engagement contractuel.'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Seuil d'alerte :</span>
            <span className="font-mono font-semibold">10,00 % (+8,70 M DA)</span>
          </div>
        </div>

        {/* Card 3: Point Bas de Trésorerie (Creux de Cashflow) */}
        <div className={`bg-white rounded-xl p-5 shadow-sm border ${
          simulation.isCreditExceeded ? 'border-rose-400' : 'border-slate-200'
        } flex flex-col justify-between relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Creux Maximal de Trésorerie
            </span>
            <span className={`p-2 rounded-lg ${
              simulation.isCreditExceeded ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-slate-900 tracking-tight">
              {formatDA(simulation.lowestNetCash)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              BFR maximal (décalage entre dépenses de chantier et encaissements des acomptes)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600">Ligne de crédit (15M) :</span>
            {simulation.isCreditExceeded ? (
              <span className="font-bold text-rose-600">Dépassement !</span>
            ) : (
              <span className="font-bold text-emerald-700">Couvert</span>
            )}
          </div>
        </div>

        {/* Card 4: Report Calendaire Décembre */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Glissement Calendaire
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-mono font-black text-blue-800 tracking-tight">
              {decemberSlippagePct > 0 ? `+${delayMonths} mois` : 'Dans les délais'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {decemberSlippagePct > 0
                ? `${formatDA(simulation.slippedAmt)} glissés sur ${delayMonths === 1 ? 'Janvier' : 'Janvier/Février'}`
                : 'Achèvement prévu au 31 Décembre 2026'}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Volume reporté :</span>
            <span className="font-mono font-semibold text-slate-900">
              {formatPercent(decemberSlippagePct)}
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE WHAT-IF SLIDERS PANEL */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Variables d'Ajustement du Scénario
              </h4>
              <p className="text-xs text-slate-400">
                Ajustez les curseurs pour recalculer instantanément les répercussions financières
              </p>
            </div>
          </div>

          <button
            onClick={() => applyPreset('NOMINAL')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les variables</span>
          </button>
        </div>

        {/* 6 SLIDERS ORGANIZED IN 2 ROWS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Slider 1: Glissement Décembre */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                Report de Travaux Décembre
              </span>
              <span className="font-mono font-bold text-blue-400">{decemberSlippagePct} %</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={decemberSlippagePct}
              onChange={(e) => setDecemberSlippagePct(Number(e.target.value))}
              className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Reporté : {formatDA(simulation.slippedAmt)}</span>
              <div className="flex items-center gap-1">
                <span>Délai :</span>
                <select
                  value={delayMonths}
                  onChange={(e) => setDelayMonths(Number(e.target.value))}
                  className="bg-slate-900 text-xs px-1.5 py-0.5 rounded border border-slate-600 text-slate-200"
                >
                  <option value={1}>+1 mois (Jan)</option>
                  <option value={2}>+2 mois (Fév)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Slider 2: Bitumen Price */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                Variation Bitume & Enrobés (Lot 1)
              </span>
              <span className="font-mono font-bold text-amber-400">
                {bitumenPriceChange >= 0 ? '+' : ''}{bitumenPriceChange} %
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="30"
              step="1"
              value={bitumenPriceChange}
              onChange={(e) => setBitumenPriceChange(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Assiette : 22,95 M DA</span>
              <span className="text-amber-300 font-bold">
                {simulation.bitumenCostVariance >= 0 ? '+' : ''}{formatDA(simulation.bitumenCostVariance)}
              </span>
            </div>
          </div>

          {/* Slider 3: Concrete Price */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-sky-400" />
                Variation Béton Prise Mer (Lot 4)
              </span>
              <span className="font-mono font-bold text-sky-400">
                {marineConcretePriceChange >= 0 ? '+' : ''}{marineConcretePriceChange} %
              </span>
            </div>
            <input
              type="range"
              min="-10"
              max="30"
              step="1"
              value={marineConcretePriceChange}
              onChange={(e) => setMarineConcretePriceChange(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Assiette : 15,90 M DA</span>
              <span className="text-sky-300 font-bold">
                {simulation.concreteCostVariance >= 0 ? '+' : ''}{formatDA(simulation.concreteCostVariance)}
              </span>
            </div>
          </div>

          {/* Slider 4: Other materials */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-purple-400" />
                Inflation Autres Fournitures BTP
              </span>
              <span className="font-mono font-bold text-purple-400">
                +{generalMaterialsInflation} %
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={generalMaterialsInflation}
              onChange={(e) => setGeneralMaterialsInflation(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Réseaux, Éclairages, etc.</span>
              <span className="text-purple-300 font-bold">
                +{formatDA(simulation.generalInflationVariance)}
              </span>
            </div>
          </div>

          {/* Slider 5: Client Payment Terms */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Délai Paiement Décomptes Client
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {clientPaymentTermsDays} Jours
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              step="30"
              value={clientPaymentTermsDays}
              onChange={(e) => setClientPaymentTermsDays(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>30j (Rapide)</span>
              <span>60j (Contractuel)</span>
              <span>90j (Différé)</span>
            </div>
          </div>

          {/* Slider 6: Retention guarantee */}
          <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Retenue de Garantie Contractuelle
              </span>
              <span className="font-mono font-bold text-rose-400">
                {retentionGuaranteePct} %
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="5"
              value={retentionGuaranteePct}
              onChange={(e) => setRetentionGuaranteePct(Number(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer h-2 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Retenue : {formatDA(simulation.simulatedBAC * (retentionGuaranteePct / 100))}</span>
              <span>DGD : À la réception</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPH 1: COMPARAISON DES DÉPENSES MENSUELLES (NOMINAL VS SIMULÉ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Chronique Mensuelle des Dépenses (Planning Initial vs Scénario Simulé)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualisation du lissage ou report des décaissements sur les mois à venir
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={simulation.timelineData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                />
                <Tooltip
                  formatter={(val: any) => formatDA(Number(val))}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="depenseNominale" name="Dépense Initiale (Nominale)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenseSimulee" name="Dépense Scénario Simulé" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 2: TRAJECTOIRE DE TRÉSORERIE NETTE & ENCAISSEMENTS */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Courbe de Trésorerie Nette & BFR Prévisionnel (Encaissements vs Dépenses)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Anticipation du besoin de trésorerie lié aux délais de paiement du maître d'ouvrage
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={simulation.timelineData} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [formatDA(Number(val)), name]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area
                  type="monotone"
                  dataKey="tresorerieNette"
                  name="Solde Net de Trésorerie (DA)"
                  fill="#F87171"
                  stroke="#DC2626"
                  strokeWidth={2}
                  fillOpacity={0.2}
                />
                <Line
                  type="monotone"
                  dataKey="encaissementCumule"
                  name="Cumul Encaissements Clients"
                  stroke="#059669"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="depenseCumulee"
                  name="Cumul Dépenses Chantier"
                  stroke="#1E293B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 4 }}
                />
                <ReferenceLine
                  y={-creditFacilityLimit}
                  stroke="#DC2626"
                  strokeDasharray="3 3"
                  label={{
                    value: `Plafond Crédit (-${(creditFacilityLimit / 1000000).toFixed(0)}M)`,
                    fill: '#DC2626',
                    fontSize: 10,
                    position: 'bottom',
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLEAU RÉCAPITULATIF DES FLUX DU SCÉNARIO SIMULÉ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Tableau Comparatif Détaillé des Flux Financiers du Scénario
          </h4>
          <span className="text-xs font-mono font-semibold text-slate-600">
            Délai d'encaissement modélisé : {clientPaymentTermsDays} jours
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Période Calendaire</th>
                <th className="py-2.5 px-3 text-right">Dépense Nominale (DA)</th>
                <th className="py-2.5 px-3 text-right text-sky-300">Dépense Simulée (DA)</th>
                <th className="py-2.5 px-3 text-right">Variation du Mois (DA)</th>
                <th className="py-2.5 px-3 text-right text-emerald-300">Encaissement Estimé (DA)</th>
                <th className="py-2.5 px-3 text-right font-mono">Cumul Dépenses (DA)</th>
                <th className="py-2.5 px-3 text-right font-mono">Solde Net Trésorerie</th>
                <th className="py-2.5 px-2 text-center">Diagnostic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {simulation.timelineData.map((row, idx) => {
                const diffMonth = row.depenseSimulee - row.depenseNominale;
                const isNetDeficit = row.tresorerieNette < 0;

                return (
                  <tr
                    key={row.month}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="py-3 px-3 font-sans font-bold text-slate-900">
                      {row.month}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-600">
                      {formatDA(row.depenseNominale)}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-900 font-bold bg-blue-50/30">
                      {formatDA(row.depenseSimulee)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {diffMonth === 0 ? (
                        <span className="text-slate-400 font-normal">0,00 DA</span>
                      ) : diffMonth > 0 ? (
                        <span className="text-rose-600 font-bold">+{formatDA(diffMonth)}</span>
                      ) : (
                        <span className="text-blue-600 font-bold">{formatDA(diffMonth)}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-700 font-bold bg-emerald-50/30">
                      {formatDA(row.encaissement)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800">
                      {formatDA(row.depenseCumulee)}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${
                      isNetDeficit ? 'text-rose-600' : 'text-emerald-700'
                    }`}>
                      {formatDA(row.tresorerieNette)}
                    </td>
                    <td className="py-3 px-2 text-center font-sans">
                      {row.tresorerieNette < -creditFacilityLimit ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          ⚠️ Alerte Découvert
                        </span>
                      ) : isNetDeficit ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                          BFR Négatif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          ✓ Équilibré
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
