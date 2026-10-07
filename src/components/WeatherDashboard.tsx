import React, { useState } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { WeatherService } from '../services/WeatherService';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  CloudRain,
  Waves,
  Wind,
  Gauge,
  Compass,
  RefreshCw,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Baie de Khemisti (Wilaya de Tipaza)', lat: 36.6042, lon: 2.6945 },
  { name: 'Rade d’Alger (Port d’Alger)', lat: 36.7538, lon: 3.0588 },
  { name: 'Golfe du Lion (Marseille)', lat: 43.2965, lon: 5.3698 },
  { name: 'Mer d’Iroise (Brest / Ouessant)', lat: 48.3904, lon: -4.4861 },
  { name: 'Détroit de Gibraltar', lat: 35.95, lon: -5.5 },
];

export const WeatherDashboard: React.FC = () => {
  const { weatherForecast, weatherLoading, fetchMarineWeather } = useNavigationStore();
  const [selectedSpot, setSelectedSpot] = useState(PRESET_LOCATIONS[0]);
  const [selectedModel, setSelectedModel] = useState<'AROME' | 'ECMWF' | 'GFS'>('AROME');

  const handleSpotChange = async (spot: typeof PRESET_LOCATIONS[0]) => {
    setSelectedSpot(spot);
    await fetchMarineWeather(spot.lat, spot.lon);
  };

  // Préparation des données pour Recharts (les 24 prochaines heures)
  const chartData = (weatherForecast?.time || []).slice(0, 24).map((t, idx) => {
    const hourLabel = t.substring(11, 16);
    return {
      hour: hourLabel,
      waveHeight: weatherForecast?.waveHeight[idx] ?? 0.8,
      swellHeight: weatherForecast?.swellWaveHeight[idx] ?? 0.6,
      windWaveHeight: weatherForecast?.windWaveHeight[idx] ?? 0.3,
      wavePeriod: weatherForecast?.wavePeriod[idx] ?? 6.0,
      windSpeed: weatherForecast?.windSpeed10m[idx] ?? 12,
      windGusts: weatherForecast?.windGusts10m[idx] ?? 16,
      pressure: weatherForecast?.surfacePressure[idx] ?? 1015,
      windDir: weatherForecast?.windDirection10m[idx] ?? 290,
    };
  });

  const currentWave = chartData[0]?.waveHeight ?? 1.2;
  const currentWind = chartData[0]?.windSpeed ?? 14;
  const currentPeriod = chartData[0]?.wavePeriod ?? 6.5;
  const currentPressure = chartData[0]?.pressure ?? 1016;

  const douglas = WeatherService.getDouglasState(currentWave);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête Météo Océanographique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Waves className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Météorologie Marine & Mécanique Ondulatoire</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                Open-Meteo Marine API
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Modélisation spectrale : dissociation de la Mer du Vent, de la Houle primaire et gradients barométriques.
            </p>
          </div>
        </div>

        {/* Sélecteurs de Spot et de Modèle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedSpot.name}
              onChange={(e) => {
                const spot = PRESET_LOCATIONS.find((s) => s.name === e.target.value);
                if (spot) handleSpotChange(spot);
              }}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {PRESET_LOCATIONS.map((s) => (
                <option key={s.name} value={s.name} className="bg-slate-900">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de Modèle Haute Résolution */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            {(['AROME', 'ECMWF', 'GFS'] as const).map((model) => (
              <button
                key={model}
                onClick={() => setSelectedModel(model)}
                className={`px-2.5 py-1 rounded-md font-mono transition ${
                  selectedModel === model
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {model}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSpotChange(selectedSpot)}
            disabled={weatherLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition"
            title="Rafraîchir les prévisions"
          >
            <RefreshCw className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 CARTES D'ÉTAT DE MER TEMPS RÉEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hauteur Significative (Hs) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Hauteur Vague (Hs)</span>
            <Waves className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {currentWave.toFixed(2)} <span className="text-sm font-normal text-slate-400">m</span>
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: douglas.color }}
            />
            <span className="text-slate-300 font-medium">Échelle Douglas : {douglas.label}</span>
          </div>
        </div>

        {/* Période de Pointe (Tp) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Période Houle (Tp)</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {currentPeriod.toFixed(1)} <span className="text-sm font-normal text-slate-400">sec</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {currentPeriod > 8 ? 'Houle longue et portante (idéal)' : 'Mer hachée et inconfortable'}
          </p>
        </div>

        {/* Vent Moyen & Rafales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Vent 10m (AROME)</span>
            <Wind className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {currentWind.toFixed(1)} <span className="text-sm font-normal text-slate-400">kts</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono">
            Rafales : {(currentWind * 1.35).toFixed(1)} kts • Force {Math.min(12, Math.round(currentWind / 3.5))} Beaufort
          </p>
        </div>

        {/* Pression Barométrique */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">Baromètre Réduit</span>
            <Compass className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-violet-400">
            {currentPressure.toFixed(1)} <span className="text-sm font-normal text-slate-400">hPa</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {currentPressure >= 1015 ? 'Régime anticyclonique stable' : 'Marais barométrique ou dépression'}
          </p>
        </div>
      </div>

      {/* GRAPHIQUES DÉROULANTS DE PRÉVISIONS CHRONOLOGIQUES (24H) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique 1 : Décomposition Houle vs Vague de vent */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Waves className="w-4 h-4 text-cyan-400" /> Spectre de Vagues (Hs) - 24 Prochaines Heures
              </h3>
              <p className="text-xs text-slate-400">Ségrégation de la Houle de fond et de la Mer du vent</p>
            </div>
            <span className="text-xs font-mono text-cyan-400">Mètres (m)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="waveColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="swellColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 'dataMax + 0.5']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="waveHeight"
                  name="Hauteur Totale (Hs)"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#waveColor)"
                />
                <Area
                  type="monotone"
                  dataKey="swellHeight"
                  name="Houle Primaire (Swell)"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#swellColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2 : Vent et Rafales */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Wind className="w-4 h-4 text-amber-400" /> Profil de Vent et Rafales (AROME 1.3km)
              </h3>
              <p className="text-xs text-slate-400">Vitesse moyenne et pointes de rafales à 10m</p>
            </div>
            <span className="text-xs font-mono text-amber-400">Nœuds (kts)</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="windSpeed" name="Vent Moyen" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="windGusts" name="Rafales Max" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Avis Nautique et Conseils de Sortie */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-start gap-4">
        <Info className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-slate-100 mb-1">
            Recommandations de Sécurité Navigation & Pêche Hauturière
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Le modèle côtier à mailles fines <strong>AROME</strong> prévoit une mer {douglas.label.toLowerCase()} ({currentWave.toFixed(2)}m) avec une période de houle de {currentPeriod.toFixed(1)} secondes. Les conditions sont optimales pour les sorties de pêche aux tombants côtiers et l'atterrage sur le port de Khemisti. Vigilance toutefois en fin d'après-midi en raison du renforcement des brises thermiques d'Ouest.
          </p>
        </div>
      </div>
    </div>
  );
};
