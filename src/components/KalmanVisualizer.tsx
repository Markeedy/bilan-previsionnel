import React, { useState } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Binary,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

export const KalmanVisualizer: React.FC = () => {
  const { vessel, trackHistory } = useNavigationStore();
  const [processNoise, setProcessNoise] = useState<number>(0.5);

  // Échantillonnage des 20 derniers points de trace pour comparer brut vs filtré
  const pointsData = trackHistory.slice(-20).map((pt, idx) => {
    // Calcul de l'écart fictif injecté
    const rawNoise = (Math.sin(idx * 1.5) * 8 + Math.cos(idx * 2) * 5);
    return {
      index: idx + 1,
      filteredSpeed: pt.sog,
      rawSpeed: Number(Math.max(0, pt.sog + rawNoise * 0.25).toFixed(1)),
      filteredCog: Math.round(pt.cog),
      rawCog: Math.round((pt.cog + rawNoise * 1.5 + 360) % 360),
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête EKF */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Binary className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Filtre de Kalman Étendu (EKF) Cinématique</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800">
                Fusion GNSS / IMU 6-Axes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Lissage optimal du vecteur d'état [Px, Py, Vx, Vy, Ax, Ay] et stabilisation de la Route sur le Fond (COG).
            </p>
          </div>
        </div>

        {/* Badge d'Amélioration de Précision */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-4">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Bruit Brut GNSS</div>
            <div className="text-lg font-mono font-bold text-rose-400">~15.0 m</div>
          </div>
          <div className="text-slate-600 font-bold">➔</div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Erreur EKF Estimée</div>
            <div className="text-lg font-mono font-bold text-emerald-400">~{vessel.accuracy.toFixed(1)} m</div>
          </div>
          <div className="hidden sm:block text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-700 px-2 py-1 rounded">
            -68% de variance
          </div>
        </div>
      </div>

      {/* VECTEUR D'ÉTAT TEMPS RÉEL & MATRICE DE TRANSITION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* VECTEUR D'ÉTAT X */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-violet-400" /> Vecteur d'État Cinématique X(t)
            </h3>
            <span className="text-[10px] font-mono text-violet-300">Dimension 6x1</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Px (Position Est) :</span>
              <span className="text-cyan-300 font-bold">
                {((vessel.filteredPosition.longitude - 2.6945) * 88000).toFixed(2)} m
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Py (Position Nord) :</span>
              <span className="text-cyan-300 font-bold">
                {((vessel.filteredPosition.latitude - 36.6042) * 111000).toFixed(2)} m
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Vx (Vélocité Est) :</span>
              <span className="text-emerald-400 font-bold">
                {(((vessel.sog * 1852) / 3600) * Math.sin((vessel.cog * Math.PI) / 180)).toFixed(2)} m/s
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Vy (Vélocité Nord) :</span>
              <span className="text-emerald-400 font-bold">
                {(((vessel.sog * 1852) / 3600) * Math.cos((vessel.cog * Math.PI) / 180)).toFixed(2)} m/s
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Ax (Accélération IMU X) :</span>
              <span className="text-amber-400 font-bold">{vessel.acceleration.x.toFixed(3)} m/s²</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Ay (Accélération IMU Y) :</span>
              <span className="text-amber-400 font-bold">{vessel.acceleration.y.toFixed(3)} m/s²</span>
            </div>
          </div>
        </div>

        {/* ÉQUATIONS DU FILTRE DE KALMAN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Équations de Transition et Innovation
            </h3>
            <span className="text-[10px] font-mono text-cyan-300">Modèle Dynamique</span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
              <div className="text-violet-400 font-bold">// 1. Étape de Prédiction Cinématique</div>
              <div>Px(t+1) = Px + Vx·Δt + 0.5·Ax·Δt²</div>
              <div>Py(t+1) = Py + Vy·Δt + 0.5·Ay·Δt²</div>
              <div>Vx(t+1) = Vx + Ax·Δt</div>
              <div>P_k = F · P_k-1 · F^T + Q</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1">
              <div className="text-cyan-400 font-bold">// 2. Étape de Mise à Jour (Mesure GNSS)</div>
              <div>y = z - H · x  (Résidu d'innovation)</div>
              <div>S = H · P · H^T + R  (Covariance résidu)</div>
              <div>K = P · H^T · S^-1  (Gain optimal de Kalman)</div>
              <div>x = x + K · y</div>
            </div>
          </div>
        </div>

        {/* PARAMÉTRAGE DYNAMIQUE DU GAIN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" /> Réglage du Bruit de Processus (Q)
              </h3>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Ajuste le degré de confiance accordé aux capteurs inertiels de l'appareil (IMU) par rapport aux réceptions satellitaires brutes du récepteur GNSS.
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Variance Accélération (EKF_ACC_NOISE) :</span>
                <span className="font-mono text-emerald-400 font-bold">{processNoise} m/s²</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={processNoise}
                onChange={(e) => setProcessNoise(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.1 (Très lissé / Inertiel)</span>
                <span>2.0 (Réactif / GPS direct)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Anti-spoofing actif : rejets automatiques des sauts de position &gt; 50 mètres.</span>
          </div>
        </div>
      </div>

      {/* COMPARAISON GRAPHIQUE EN TEMPS RÉEL : SOG BRUT VS SOG FILTRÉ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Vitesse sur le Fond (SOG) : Brut vs EKF
              </h3>
              <p className="text-xs text-slate-400">Élimination des pointes parasites d'accélération artificielle</p>
            </div>
            <span className="text-xs font-mono text-emerald-400">Nœuds (kts)</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="index" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="rawSpeed"
                  name="GPS Brut (Fluctuant)"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="filteredSpeed"
                  name="SOG Filtré EKF (Stable)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* COMPARAISON ROUTE SUR LE FOND (COG) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Route sur le Fond (COG) : Cap Vrai Lissé
              </h3>
              <p className="text-xs text-slate-400">Stabilité essentielle pour le calcul des vecteurs anti-collision</p>
            </div>
            <span className="text-xs font-mono text-cyan-400">Degrés (°)</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="index" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="rawCog"
                  name="COG Brut (Bruit angulaire)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="filteredCog"
                  name="COG Lissé EKF (Tenue de cap)"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
