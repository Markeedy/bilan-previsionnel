import React, { useState } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { formatDA, formatPercent } from '../utils/formatters';
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Flame,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';

interface RiskDefinition {
  lotCode: string;
  lotTitle: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number; // 0 to 100
  title: string;
  primaryDrivers: string[];
  recommendedMitigation: string;
  maxExposureEstimate: number; // in DA
  sensitiveItems: string;
}

const RISK_DEFINITIONS: Record<string, RiskDefinition> = {
  'LOT 1': {
    lotCode: 'LOT 1',
    lotTitle: 'REHABILITATION DES TERRES-PLEINS',
    level: 'HIGH',
    score: 88,
    title: 'Lot Hyper-Critique (53,2% du Marché) — Volatilité Bitume & Aléas Maritimes',
    primaryDrivers: [
      'Volatilité des cours du bitume et enrobés : 22,95 M DA (Postes 5 & 6)',
      'Terrassements côtiers massifs : 7 000 m³ soumis aux intempéries (Poste 2)',
      'Concentration de 21,8 M DA sur Décembre (risques houle et météo maritime)',
    ],
    recommendedMitigation:
      'Verrouillage immédiat des prix d’approvisionnement en grave-bitume par bons de commande fermes. Réalisation prioritaire des couches de fondation 0-40mm avant fin novembre.',
    maxExposureEstimate: 3500000,
    sensitiveItems: 'Postes 5, 6, 2 (Grave bitume, Béton bitumineux, Terrassement)',
  },
  'LOT 4': {
    lotCode: 'LOT 4',
    lotTitle: 'BACHE A EAU',
    level: 'HIGH',
    score: 75,
    title: 'Lot Critique Technique (23,3% du Marché) — Béton Prise Mer & Électromécanique',
    primaryDrivers: [
      'Béton armé dosé à 350 kg/m³ qualité prise mer : 15,9 M DA (Poste 40 à 50 000 DA/m³)',
      'Équipements spécialisés de pompage pour bâche : 3,0 M DA (Poste 41 forfaitaire)',
      'Phasage tardif : 14,38 M DA planifiés en Décembre (71% du lot)',
    ],
    recommendedMitigation:
      'Agrément technique préalable des adjuvants et ciment prise mer par laboratoire de contrôle (CTP). Commande anticipée des groupes de pompage pour éviter rupture d’approvisionnement.',
    maxExposureEstimate: 1850000,
    sensitiveItems: 'Poste 40 (Béton prise mer 318 m³), Poste 41 (Équipements bâche)',
  },
  'LOT 3': {
    lotCode: 'LOT 3',
    lotTitle: 'ECLAIRAGES',
    level: 'MEDIUM',
    score: 58,
    title: 'Lot à Surveillance Logistique (12,0% du Marché) — Fonderie & Électrotechnique',
    primaryDrivers: [
      'Poteaux d’incendie en fonte DN110 : 5,85 M DA (Poste 34 à 390 000 DA/U)',
      'Candélabres LED acier galvanisé thermolaqué 7m/5m : 3,7 M DA (Postes 35 & 36)',
      'Armoires étanches 500A pour milieu marin agressif : 870 000 DA (Poste 37)',
    ],
    recommendedMitigation:
      'Vérification des délais d’importation et de fonderie des poteaux incendie. Essais d’étanchéité IP66 des armoires électriques avant pose sur quai.',
    maxExposureEstimate: 750000,
    sensitiveItems: 'Poste 34 (15 poteaux incendie), Postes 35-36 (20 candélabres)',
  },
  'LOT 5': {
    lotCode: 'LOT 5',
    lotTitle: 'REHABILITATION DE LA CLOTURE PERIMETRIQUE',
    level: 'LOW',
    score: 28,
    title: 'Risque Faible & Maîtrisé (7,4% du Marché) — Cadence Linéaire',
    primaryDrivers: [
      'Montant fixe de 6,4 M DA réparti à 50% Octobre (3,2M) et 50% Novembre (3,2M)',
      'Cadencement physique régulier : 100 ML en Octobre et 100 ML en Novembre',
    ],
    recommendedMitigation:
      'Contrôle géométrique de l’alignement des poteaux et traitement anti-corrosion marine des panneaux métalliques.',
    maxExposureEstimate: 200000,
    sensitiveItems: 'Poste 43 (Clôture périmétrique 200 ML)',
  },
  'LOT 2': {
    lotCode: 'LOT 2',
    lotTitle: 'REHABILITATION DES DIVERS RESEAUX AEP ET ASSAINISSEMENT',
    level: 'LOW',
    score: 22,
    title: 'Risque Faible (2,5% du Marché) — Postes Modulaires & Fractionnés',
    primaryDrivers: [
      'Budget total modéré de 2,18 M DA ventilé sur 19 petits articles',
      'Matériaux PEHD et robinetterie standards disponibles sur stock national',
    ],
    recommendedMitigation:
      'Épreuves hydrauliques en tranchée ouverte à 16 bars avant remblaiement pour éviter reprises de voirie.',
    maxExposureEstimate: 120000,
    sensitiveItems: 'Poste 33 (Regards BA 1,08M DA), Postes 18-20 (Robinets vannes)',
  },
  'LOT 6': {
    lotCode: 'LOT 6',
    lotTitle: 'REALISATION DE BUREAU DE POLICE',
    level: 'LOW',
    score: 18,
    title: 'Risque Faible (1,7% du Marché) — Ouvrage Ponctuel Forfaitaire',
    primaryDrivers: [
      'Poste forfaitaire unique de 1,5 M DA prévu en Décembre',
      'Emprise restreinte, génie civil standard',
    ],
    recommendedMitigation:
      'Préparation de la plateforme d’assise dès novembre pour coulage rapide des fondations en décembre.',
    maxExposureEstimate: 80000,
    sensitiveItems: 'Poste 44 (Poste de garde / Bureau de police)',
  },
};

export const BudgetRiskSection: React.FC = () => {
  const { getLotSummaries, getConsolidation, items } = useBudgetStore();
  const lotSummaries = getLotSummaries();
  const consolidation = getConsolidation();

  // Stress-test simulation states
  const [bitumenInflation, setBitumenInflation] = useState<number>(0); // 0% to 20%
  const [concreteInflation, setConcreteInflation] = useState<number>(0); // 0% to 20%
  const [decemberDelaySurplus, setDecemberDelaySurplus] = useState<number>(0); // 0% to 15%
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  // Detect real cost overruns in the live dataset
  const overBudgetItems = items.filter((it) => {
    const sumForecast = Object.values(it.forecasts).reduce((a, b) => a + b, 0);
    return sumForecast > it.remainingQuantity + 0.001;
  });

  // Calculate stress-test financial impact
  // Lot 1 bituminous items (Items 5 & 6): 14,531,400 + 8,428,000 = 22,959,400 DA
  const bitumenBaseAmt = 22959400;
  const bitumenOverrun = bitumenBaseAmt * (bitumenInflation / 100);

  // Lot 4 marine concrete item (Item 40): 15,900,000 DA
  const concreteBaseAmt = 15900000;
  const concreteOverrun = concreteBaseAmt * (concreteInflation / 100);

  // December volume: 45,077,680 DA
  const decBaseAmt = consolidation.monthlyTotals['2026-12'] || 45077680;
  const decOverrun = decBaseAmt * (decemberDelaySurplus / 100);

  const totalStressOverrun = bitumenOverrun + concreteOverrun + decOverrun;
  const simulatedTotalBudget = consolidation.totalContractAmount + totalStressOverrun;
  const simulatedIncreasePct = (totalStressOverrun / consolidation.totalContractAmount) * 100;

  // Chart data for risk scores
  const riskChartData = lotSummaries.map((lot) => {
    const risk = RISK_DEFINITIONS[lot.lotCode] || { score: 20, level: 'LOW' };
    return {
      lotCode: lot.lotCode,
      name: lot.lotCode,
      score: risk.score,
      budgetMillions: Number((lot.contractAmount / 1000000).toFixed(2)),
      level: risk.level,
    };
  });

  const getRiskIcon = (level: 'HIGH' | 'MEDIUM' | 'LOW', size = 'w-5 h-5') => {
    switch (level) {
      case 'HIGH':
        return <AlertOctagon className={`${size} text-rose-600 animate-pulse`} />;
      case 'MEDIUM':
        return <AlertTriangle className={`${size} text-amber-500`} />;
      case 'LOW':
        return <CheckCircle2 className={`${size} text-emerald-600`} />;
    }
  };

  const getBadgeStyle = (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (level) {
      case 'HIGH':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOW':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 shadow-xs">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white uppercase tracking-wider">
                VIGILANCE CONTRAT BTP
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Normes E.G.U.V.A / GITRA
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
              Cartographie des Risques Budgétaires & Surveillance des Lots Critiques
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Analyse prédictive de dérive des coûts, sensibilité des prix unitaires et surveillance des aléas maritimes
            </p>
          </div>
        </div>

        {/* Global risk indicator pill */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-2.5 shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Niveau de Risque Global
              </div>
              <div className="text-xs font-bold text-rose-400">
                CRITIQUE MODÉRÉ À ÉLEVÉ
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME OVERBUDGET DETECTOR BANNER (If any live edits caused overruns) */}
      {overBudgetItems.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-500 shadow-sm flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide flex items-center gap-2">
              <span>ALERTE DE DÉPASSEMENT IMMÉDIAT EN COURS DE SAISIE</span>
              <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px]">
                {overBudgetItems.length} poste{overBudgetItems.length > 1 ? 's' : ''} en dépassement
              </span>
            </h4>
            <p className="text-xs text-rose-800 mt-1">
              Des quantités prévisionnelles supérieures au reliquat contractuel ont été détectées sur les postes suivants :{' '}
              {overBudgetItems.map((it) => (
                <span key={it.id} className="font-mono font-bold mr-2">
                  #{it.itemNumber} ({it.designation.slice(0, 30)}...)
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* TOP RISK METRICS SUMMARY (3 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Concentration Décembre */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              1. Risque d'Engorgement Météo (Décembre)
            </span>
            <div className="text-xl font-mono font-black text-rose-700 mt-1">
              {formatDA(consolidation.monthlyTotals['2026-12'] || 45077680)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              <strong className="text-rose-700">52,42%</strong> du montant résiduel concentré sur Décembre. Risque d'intempéries maritimes et de tempêtes côtières à Tipaza.
            </p>
          </div>
          <span className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </span>
        </div>

        {/* Card 2: Exposition Bitume & Liants */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              2. Exposition Bitume & Enrobés (Lot 1)
            </span>
            <div className="text-xl font-mono font-black text-amber-700 mt-1">
              {formatDA(bitumenBaseAmt)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Grave bitume (14,5M DA) + Béton bitumineux (8,4M DA). Très forte sensibilité à l’inflation des bitumes routiers.
            </p>
          </div>
          <span className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </span>
        </div>

        {/* Card 3: Béton Prise Mer Bâche */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              3. Béton Armé Prise Mer (Lot 4)
            </span>
            <div className="text-xl font-mono font-black text-blue-900 mt-1">
              {formatDA(concreteBaseAmt)}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              318 m³ de béton armé dosé à 350 kg/m³ à <strong className="text-slate-900">50 000 DA/m³</strong>. Risque d’approvisionnement et d’essais CTP en laboratoire.
            </p>
          </div>
          <span className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* STRESS-TEST / SIMULATEUR DE SENSIBILITÉ AUX DÉPASSEMENTS */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Simulateur de Sensibilité & Stress-Test Budgétaire
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-600 text-white">
                  What-If Analysis
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Évaluez l'impact d'une hausse des coûts des matériaux ou d'un décalage calendaire sur l'enveloppe globale du marché
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setBitumenInflation(0);
              setConcreteInflation(0);
              setDecemberDelaySurplus(0);
            }}
            className="text-[11px] px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
          >
            Réinitialiser les curseurs
          </button>
        </div>

        {/* 3 Interactive Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Slider 1: Bitumen */}
          <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Inflation Enrobés/Bitume (Lot 1)</span>
              <span className="font-mono font-bold text-amber-400">+{bitumenInflation} %</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={bitumenInflation}
              onChange={(e) => setBitumenInflation(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Assiette : 22,95 M DA</span>
              <span className="text-amber-300 font-semibold">+{formatDA(bitumenOverrun)}</span>
            </div>
          </div>

          {/* Slider 2: Concrete */}
          <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Inflation Béton Prise Mer (Lot 4)</span>
              <span className="font-mono font-bold text-sky-400">+{concreteInflation} %</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="1"
              value={concreteInflation}
              onChange={(e) => setConcreteInflation(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Assiette : 15,90 M DA</span>
              <span className="text-sky-300 font-semibold">+{formatDA(concreteOverrun)}</span>
            </div>
          </div>

          {/* Slider 3: December weather delay / hours */}
          <div className="space-y-2 bg-slate-800/60 p-3.5 rounded-lg border border-slate-700">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Surcoût Intempéries Décembre</span>
              <span className="font-mono font-bold text-rose-400">+{decemberDelaySurplus} %</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={decemberDelaySurplus}
              onChange={(e) => setDecemberDelaySurplus(Number(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>Assiette : 45,08 M DA</span>
              <span className="text-rose-300 font-semibold">+{formatDA(decOverrun)}</span>
            </div>
          </div>
        </div>

        {/* Simulation Output Banner */}
        <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Surcoût Potentiel Estimé (Stress-Test)
            </div>
            <div className="text-2xl font-mono font-extrabold text-amber-400">
              +{formatDA(totalStressOverrun)}
            </div>
            <div className="text-[11px] text-slate-400">
              Variation projetée : <strong className="text-white">+{formatPercent(simulatedIncreasePct)}</strong> sur le budget contractuel
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Budget Global Projeté Après Aléas
            </div>
            <div className="text-2xl font-mono font-extrabold text-white">
              {formatDA(simulatedTotalBudget)}
            </div>
            <div className="text-[11px]">
              {simulatedIncreasePct > 10 ? (
                <span className="text-rose-400 font-bold flex items-center gap-1 justify-end">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Seuil légal d'avenant dépassé (&gt; 10% CMP)
                </span>
              ) : totalStressOverrun > 0 ? (
                <span className="text-amber-400 font-medium">
                  Absorption possible par provision pour imprévus
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">
                  Scénario contractuel nominal respecté (0,00 DA)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS & MATRIX VIEW */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Fiches d'Analyse des Risques par Lot Opérationnel
          </h4>

          {/* Level Filter */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              onClick={() => setFilterLevel('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterLevel === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tous les Lots (6)
            </button>
            <button
              onClick={() => setFilterLevel('HIGH')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filterLevel === 'HIGH'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <AlertOctagon className="w-3 h-3" />
              <span>Lots Critiques (2)</span>
            </button>
            <button
              onClick={() => setFilterLevel('MEDIUM')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filterLevel === 'MEDIUM'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Surveillance (1)</span>
            </button>
            <button
              onClick={() => setFilterLevel('LOW')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                filterLevel === 'LOW'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Maîtrisés (3)</span>
            </button>
          </div>
        </div>

        {/* LOT RISK CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lotSummaries
            .filter((lot) => {
              const def = RISK_DEFINITIONS[lot.lotCode];
              if (!def) return true;
              if (filterLevel === 'ALL') return true;
              return def.level === filterLevel;
            })
            .map((lot) => {
              const def = RISK_DEFINITIONS[lot.lotCode] || {
                lotCode: lot.lotCode,
                lotTitle: lot.lotTitle,
                level: 'LOW' as const,
                score: 20,
                title: lot.lotTitle,
                primaryDrivers: ['Exécution standard de marché'],
                recommendedMitigation: 'Contrôle qualité régulier',
                maxExposureEstimate: 100000,
                sensitiveItems: 'Postes du lot',
              };

              const lotBudgetPct = (lot.contractAmount / consolidation.totalContractAmount) * 100;

              return (
                <div
                  key={lot.workPackageId}
                  className={`rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                    def.level === 'HIGH'
                      ? 'border-rose-300 bg-rose-50/20 shadow-xs hover:border-rose-400'
                      : def.level === 'MEDIUM'
                      ? 'border-amber-300 bg-amber-50/20 shadow-xs hover:border-amber-400'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {getRiskIcon(def.level, 'w-5 h-5')}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-xs text-slate-900">
                              {lot.lotCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getBadgeStyle(
                                def.level
                              )}`}
                            >
                              {def.level === 'HIGH'
                                ? '🔴 RISQUE CRITIQUE'
                                : def.level === 'MEDIUM'
                                ? '🟡 VIGILANCE MOYENNE'
                                : '🟢 RISQUE MAÎTRISÉ'}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-900 mt-0.5 leading-snug">
                            {def.title}
                          </h5>
                        </div>
                      </div>

                      {/* Score pill */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block font-semibold">
                          Indice Risque
                        </span>
                        <span
                          className={`font-mono font-black text-sm ${
                            def.score >= 70
                              ? 'text-rose-600'
                              : def.score >= 50
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {def.score} / 100
                        </span>
                      </div>
                    </div>

                    {/* Financial stats strip */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 text-center font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 font-sans block">Poids Marché</span>
                        <strong className="text-slate-900">{formatPercent(lotBudgetPct)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-sans block">Montant Marché</span>
                        <strong className="text-slate-900">{formatDA(lot.contractAmount)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-sans block">Exposition Max.</span>
                        <strong className="text-rose-600">~{formatDA(def.maxExposureEstimate)}</strong>
                      </div>
                    </div>

                    {/* Sensitive items */}
                    <div className="text-xs">
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        Postes à Haute Sensibilité :
                      </span>
                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-200">
                        {def.sensitiveItems}
                      </p>
                    </div>

                    {/* Primary risk drivers */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Facteurs d'Aléas Identifiés :
                      </span>
                      <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                        {def.primaryDrivers.map((driver, dIdx) => (
                          <li key={dIdx} className="leading-relaxed">
                            {driver}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Mitigation plan recommendation */}
                  <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50/70 p-2.5 rounded-lg">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                      Plan d'Action & Mesures de Contingence EGUVA :
                    </span>
                    <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                      {def.recommendedMitigation}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* RISK PROBABILITY & IMPACT DISTRIBUTION CHART */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Indice de Criticité Budgétaire Composite par Lot (0 à 100)
            </h5>
            <p className="text-[11px] text-slate-500">
              Pondération multi-critères : Poids financier (50%) + Volatilité matière première (30%) + Risque météo calendrier (20%)
            </p>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={riskChartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} />
              <Tooltip
                formatter={(val: any) => [`${val} / 100`, 'Indice de Criticité']}
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px',
                  border: 'none',
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {riskChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.score >= 70
                        ? '#E11D48' // Rose / Red for High
                        : entry.score >= 50
                        ? '#D97706' // Amber for Medium
                        : '#059669' // Emerald for Low
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
