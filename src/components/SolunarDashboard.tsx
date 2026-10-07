import React from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Fish,
  Moon,
  Sun,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Calendar,
  Compass,
  Award,
} from 'lucide-react';

export const SolunarDashboard: React.FC = () => {
  const {
    solunarResult,
    selectedSolunarDate,
    updateSolunarDate,
    barometricTendency,
    setBarometricTendency,
  } = useNavigationStore();

  if (!solunarResult) return null;

  const handleDateShift = (days: number) => {
    const nextDate = new Date(selectedSolunarDate);
    nextDate.setDate(nextDate.getDate() + days);
    updateSolunarDate(nextDate);
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'EXCELLENT':
        return 'bg-emerald-950 text-emerald-300 border-emerald-600';
      case 'TRÈS BON':
        return 'bg-cyan-950 text-cyan-300 border-cyan-600';
      case 'BON':
        return 'bg-blue-950 text-blue-300 border-blue-600';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête Moteur Halieutique Solunaire */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Fish className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                Théorie Solunaire & Moteur Halieutique (John Alden Knight)
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                Éphémérides Gravitationnelles
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Modélisation des transits lunaires (Zénith/Nadir) et Stacking multi-facteurs (lueur crépusculaire & front barométrique).
            </p>
          </div>
        </div>

        {/* Sélecteur de Date et Tendance Barométrique */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => handleDateShift(-1)}
              className="px-2 py-1 text-slate-400 hover:text-white"
            >
              ◀ Hier
            </button>
            <div className="px-3 py-1 font-mono text-cyan-300 font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {selectedSolunarDate.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </div>
            <button
              onClick={() => handleDateShift(1)}
              className="px-2 py-1 text-slate-400 hover:text-white"
            >
              Demain ▶
            </button>
          </div>

          {/* Simulateur de Tendance Barométrique pour le Stacking */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 font-mono">Baromètre :</span>
            {(['RISING_FAST', 'STABLE', 'FALLING'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setBarometricTendency(t)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition ${
                  barometricTendency === t
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'RISING_FAST' ? '▲ Hausse Rapide' : t === 'STABLE' ? '■ Stable' : '▼ Chute'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 CARTES PRINCIPALES : SCORE SOLUNAIRE, PHASE LUNAIRE & ÉPHÉMÉRIDES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARTE 1 : SCORE GLOBAL DE PÊCHE (STACKING NON LINÉAIRE) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-semibold text-slate-400">Indice Halieutique Global</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getRatingBadge(
                  solunarResult.rating
                )}`}
              >
                {solunarResult.rating}
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <span className="text-5xl font-mono font-black text-amber-400">
                {solunarResult.solunarScore}%
              </span>
              <span className="text-xs text-slate-400">Solunar Index</span>
            </div>

            <div className="space-y-2 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gravité Phase Lunaire :</span>
                <span className="font-mono text-cyan-400 font-bold">
                  +{solunarResult.stackingFactors.moonPhaseFactor} pts
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Stacking d'Or (Aube/Crépuscule) :</span>
                <span
                  className={`font-mono font-bold ${
                    solunarResult.stackingFactors.solarTwilightCoincidence
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {solunarResult.stackingFactors.solarTwilightCoincidence ? 'ACTIF (+18 pts)' : 'Non aligné'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Front Barométrique :</span>
                <span className="font-mono text-amber-400 font-bold">
                  {solunarResult.stackingFactors.barometricTrendFactor >= 0 ? '+' : ''}
                  {solunarResult.stackingFactors.barometricTrendFactor} pts
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-amber-400/90 font-medium">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Multiplicateur Knight actif : fenêtre idéale pour la pêche aux leurres et à la traîne.</span>
          </div>
        </div>

        {/* CARTE 2 : PHASE ET MÉCANIQUE CÉLESTE LUNAIRE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-semibold text-slate-400">Mois Synodique (29.53j)</span>
              <Moon className="w-4 h-4 text-cyan-400" />
            </div>

            <div className="text-lg font-bold text-slate-100 mb-1">{solunarResult.moonPhaseName}</div>
            <div className="text-xs text-slate-400 font-mono mb-4">
              Âge Lunaire : {solunarResult.moonAgeDays} jours • Illumination : {solunarResult.moonIllumination}%
            </div>

            {/* Barre d'illumination */}
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-4">
              <div
                className="bg-gradient-to-r from-cyan-500 to-amber-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${solunarResult.moonIllumination}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Transit Zénith :</span>
                <span className="font-mono font-bold text-cyan-300">{solunarResult.moonTransitTime}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Nadir (Underfoot) :</span>
                <span className="font-mono font-bold text-cyan-300">{solunarResult.moonUnderfootTime}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Lever Lune :</span>
                <span className="font-mono text-slate-300">{solunarResult.moonriseTime}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Coucher Lune :</span>
                <span className="font-mono text-slate-300">{solunarResult.moonsetTime}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Cycle de gravitation marine : coefficients de marée en amplification aux syzygies.
          </div>
        </div>

        {/* CARTE 3 : ÉPHÉMÉRIDES DU SOLEIL & CRÉPUSCULES */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-semibold text-slate-400">Éphémérides Solaires</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>

            <div className="grid grid-cols-2 gap-4 my-2">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-amber-400 font-semibold block mb-1">🌅 Lever (Aube)</span>
                <span className="text-xl font-mono font-bold text-slate-100">{solunarResult.sunriseTime}</span>
                <span className="text-[10px] text-slate-400 block mt-1">Luminosité transitoire</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-orange-400 font-semibold block mb-1">🌇 Coucher (Crép.)</span>
                <span className="text-xl font-mono font-bold text-slate-100">{solunarResult.sunsetTime}</span>
                <span className="text-[10px] text-slate-400 block mt-1">Prédation active</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mt-3">
              Les moments de transition lumineuse (aube/crépuscule) diminuent la visibilité des prédateurs vis-à-vis des poissons-fourrage, provoquant un pic d'attaque exponentiel lorsqu'ils coïncident avec les transits gravitationnels.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Durée du jour : ~11h 24m</span>
            <span className="text-cyan-400 font-mono">Spot : Tipaza Coast</span>
          </div>
        </div>
      </div>

      {/* FENÊTRES MAJEURES ET MINEURES DE PÊCHE (LES 4 CRÉNEAUX DU JOUR) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-400" /> Fenêtres Horaires d'Activité Optimale de Pêche
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Période Majeure 1 */}
          <div className="bg-gradient-to-b from-amber-950/40 to-slate-950 border border-amber-600/40 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" /> PÉRIODE MAJEURE 1
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-200">
                2 HEURES
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 my-1">
              {solunarResult.majorPeriods[0].start.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {solunarResult.majorPeriods[0].end.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mt-2">
              Zénith Lunaire : force de marée culminante au-dessus du secteur.
            </p>
          </div>

          {/* Période Majeure 2 */}
          <div className="bg-gradient-to-b from-amber-950/40 to-slate-950 border border-amber-600/40 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" /> PÉRIODE MAJEURE 2
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/60 text-amber-200">
                2 HEURES
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 my-1">
              {solunarResult.majorPeriods[1].start.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {solunarResult.majorPeriods[1].end.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mt-2">
              Nadir Lunaire : attraction antipode déclenchant l'activité en profondeur.
            </p>
          </div>

          {/* Période Mineure 1 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-cyan-400" /> PÉRIODE MINEURE 1
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                1 HEURE
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 my-1">
              {solunarResult.minorPeriods[0].start.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {solunarResult.minorPeriods[0].end.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mt-2">
              Lever de Lune : remontée des poissons pélagiques vers la surface.
            </p>
          </div>

          {/* Période Mineure 2 */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-cyan-400" /> PÉRIODE MINEURE 2
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                1 HEURE
              </span>
            </div>
            <div className="text-lg font-mono font-bold text-slate-100 my-1">
              {solunarResult.minorPeriods[1].start.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {solunarResult.minorPeriods[1].end.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <p className="text-[11px] text-slate-300 leading-snug mt-2">
              Coucher de Lune : chasse crépusculaire sur les récifs côtiers.
            </p>
          </div>
        </div>
      </div>

      {/* GRAPHIQUE CONTINU D'ACTIVITÉ HALIEUTIQUE SUR 24 HEURES */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" /> Courbe d'Activité et d'Appétit Halieutique (24 Heures)
            </h3>
            <p className="text-xs text-slate-400">
              Pondération continue des transits célestes et des intensités solunaires
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400">Activité (0-100%)</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={solunarResult.hourlyActivityCurve.map((h) => ({
                hour: `${String(h.hour).padStart(2, '0')}h`,
                score: h.score,
                label: h.periodName || 'Activité de fond',
              }))}
            >
              <defs>
                <linearGradient id="solunarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                name="Indice d'Activité"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#solunarGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
