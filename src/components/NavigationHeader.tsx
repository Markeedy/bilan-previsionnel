import React from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { S52ColorPalette } from '../types/maritime';
import {
  Compass,
  Gauge,
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  Play,
  Pause,
  Anchor,
  Radio,
  CloudRain,
  Fish,
  Binary,
  Code2,
  Navigation,
  BookOpen,
  Route,
  Bot,
  Sparkles,
} from 'lucide-react';

interface NavigationHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ activeTab, onTabChange }) => {
  const {
    vessel,
    s52Palette,
    setS52Palette,
    dangerAlertCount,
    simulationRunning,
    toggleSimulation,
    setBoatDraft,
    logbookEntries,
    routes,
    activeRouteId,
  } = useNavigationStore();

  const isShallow = vessel.depthBelowKeel <= vessel.boatDraft + 0.5;
  const criticalLogsCount = logbookEntries.filter((e) => e.severity === 'CRITICAL').length;
  const activeRoute = routes.find((r) => r.id === activeRouteId);

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 select-none sticky top-0 z-40 shadow-xl">
      {/* Barre d'état haute et télémétrie critique de passerelle */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Identité Navire */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center text-white shadow-md shadow-cyan-900/40 font-bold">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wider text-cyan-400">NAVISEAS PRO</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                ECDIS S-52
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              LAT {vessel.filteredPosition.latitude.toFixed(4)}°N • LON {vessel.filteredPosition.longitude.toFixed(4)}°E
            </p>
          </div>
        </div>

        {/* Répéteurs de Passerelle (Jauges SOG / COG / Sonde) */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
          {/* SOG */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2.5 min-w-[100px]">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">SOG (Vitesse)</div>
              <div className="text-lg font-mono font-bold text-emerald-400 leading-tight">
                {vessel.sog.toFixed(1)} <span className="text-xs font-normal text-slate-400">kts</span>
              </div>
            </div>
          </div>

          {/* COG */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2.5 min-w-[95px]">
            <Compass className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">COG (Route)</div>
              <div className="text-lg font-mono font-bold text-cyan-400 leading-tight">
                {Math.round(vessel.cog)}° <span className="text-xs font-normal text-slate-400">vrai</span>
              </div>
            </div>
          </div>

          {/* Sonde sous Quille */}
          <div
            className={`border rounded-lg px-3 py-1.5 flex items-center gap-2.5 min-w-[115px] transition-colors ${
              isShallow
                ? 'bg-red-950/80 border-red-500 animate-pulse text-red-200'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <Anchor className={`w-4 h-4 ${isShallow ? 'text-red-400' : 'text-amber-400'}`} />
            <div>
              <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Sonde Quille
              </div>
              <div
                className={`text-lg font-mono font-bold leading-tight ${
                  isShallow ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {vessel.depthBelowKeel.toFixed(1)} <span className="text-xs font-normal text-slate-400">m</span>
              </div>
            </div>
          </div>

          {/* Tirant d'eau (Draft) */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-slate-400">Tirant d'eau:</span>
            <input
              type="number"
              step="0.1"
              min="0.5"
              max="15"
              value={vessel.boatDraft}
              onChange={(e) => setBoatDraft(parseFloat(e.target.value) || 2.0)}
              className="w-14 bg-slate-800 text-cyan-300 font-mono text-xs font-bold px-1.5 py-0.5 rounded border border-slate-700 text-center"
            />
            <span className="text-xs text-slate-400">m</span>
          </div>
        </div>

        {/* Contrôles Rapides : Palettes S-52, Alertes AIS, Simulation */}
        <div className="flex items-center gap-2">
          {/* Alerte Risque Collision */}
          {dangerAlertCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-900/80 text-red-200 border border-red-500 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{dangerAlertCount} CPA ALERTE</span>
            </div>
          )}

          {/* Sélecteur Palettes IHO S-52 */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {(['DAY', 'DUSK', 'NIGHT'] as S52ColorPalette[]).map((palette) => (
              <button
                key={palette}
                onClick={() => setS52Palette(palette)}
                title={`Palette S-52 ${palette}`}
                className={`p-1.5 rounded-md transition-colors ${
                  s52Palette === palette
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {palette === 'DAY' && <Sun className="w-4 h-4" />}
                {palette === 'DUSK' && <Sunset className="w-4 h-4" />}
                {palette === 'NIGHT' && <Moon className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* Toggle Simulation */}
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              simulationRunning
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 hover:bg-emerald-900/70'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {simulationRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{simulationRunning ? 'Simu Active' : 'Simu Pause'}</span>
          </button>
        </div>
      </div>

      {/* Barre de navigation par onglets principaux */}
      <nav className="border-t border-slate-900 bg-slate-950/95 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-2 py-1.5">
          <button
            onClick={() => onTabChange('CHART')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'CHART'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Traceur ECDIS S-52</span>
          </button>

          <button
            onClick={() => onTabChange('ROUTE')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'ROUTE'
                ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Route className="w-4 h-4 text-orange-400" />
            <span>Planificateur Routes</span>
            {activeRoute ? (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-950/80 text-orange-300 border border-orange-800">
                {activeRoute.waypoints.length} WPT
              </span>
            ) : null}
          </button>

          <button
            onClick={() => onTabChange('COPILOT')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'COPILOT'
                ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-200 border border-cyan-400/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Copilote Gemini AI</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-950/90 text-blue-300 border border-blue-700/80 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              SEARCH
            </span>
          </button>

          <button
            onClick={() => onTabChange('AIS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'AIS'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-rose-400" />
            <span>Radar AIS & CPA/TCPA</span>
            {dangerAlertCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => onTabChange('LOGBOOK')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'LOGBOOK'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Journal de Bord</span>
            {criticalLogsCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-700 animate-pulse">
                {criticalLogsCount}
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                {logbookEntries.length}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('WEATHER')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'WEATHER'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CloudRain className="w-4 h-4 text-blue-400" />
            <span>Météo Marine & Houle</span>
          </button>

          <button
            onClick={() => onTabChange('SOLUNAR')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'SOLUNAR'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Fish className="w-4 h-4 text-amber-400" />
            <span>Théorie Solunaire (Pêche)</span>
          </button>

          <button
            onClick={() => onTabChange('KALMAN')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'KALMAN'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Binary className="w-4 h-4 text-violet-400" />
            <span>Filtre de Kalman EKF</span>
          </button>

          <button
            onClick={() => onTabChange('SIGNALK')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'SIGNALK'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Anchor className="w-4 h-4 text-teal-400" />
            <span>Télémétrie Signal K</span>
          </button>

          <button
            onClick={() => onTabChange('CODE')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'CODE'
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>Architecture & Code Expo</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
