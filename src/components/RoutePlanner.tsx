import React, { useState, useMemo } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { RoutePlannerService } from '../services/RoutePlannerService';
import { GeoCoordinate, NavigationRoute, Waypoint } from '../types/maritime';
import {
  Route,
  Compass,
  Navigation,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Gauge,
  MapPin,
  ChevronRight,
  RotateCcw,
  Zap,
  Ship,
  Layers,
  X,
} from 'lucide-react';

export const RoutePlanner: React.FC = () => {
  const {
    routes,
    activeRouteId,
    activeWaypointIndex,
    setActiveRoute,
    createRoute,
    deleteRoute,
    addWaypointToRoute,
    removeWaypointFromRoute,
    autoOptimizeRoute,
    advanceActiveWaypoint,
    checkRouteSafetyAction,
    vessel,
    aisTargets,
  } = useNavigationStore();

  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState<boolean>(false);
  const [newRouteName, setNewRouteName] = useState<string>('');
  const [newRouteDescription, setNewRouteDescription] = useState<string>('');
  const [newRouteSpeed, setNewRouteSpeed] = useState<number>(8.5);

  const [isAddWptModalOpen, setIsAddWptModalOpen] = useState<boolean>(false);
  const [wptName, setWptName] = useState<string>('');
  const [wptLat, setWptLat] = useState<number>(36.620);
  const [wptLon, setWptLon] = useState<number>(2.700);

  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === activeRouteId) || routes[0];
  }, [routes, activeRouteId]);

  // Calcul du guidage en direct vers le waypoint actif
  const currentTargetWpt = activeRoute?.waypoints[activeWaypointIndex];
  const dtwNM = currentTargetWpt
    ? RoutePlannerService.calculateDistanceNM(vessel.filteredPosition, currentTargetWpt.coordinates)
    : 0;
  const btwDeg = currentTargetWpt
    ? Math.round(
        RoutePlannerService.calculateBearingDeg(vessel.filteredPosition, currentTargetWpt.coordinates)
      )
    : 0;
  const courseError = Math.round((btwDeg - vessel.cog + 360) % 360);
  const ttgMinutes = vessel.sog > 0 ? (dtwNM / vessel.sog) * 60 : 0;

  const handleCreateRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) return;
    createRoute(newRouteName.trim(), newRouteDescription.trim(), newRouteSpeed);
    setNewRouteName('');
    setNewRouteDescription('');
    setIsNewRouteModalOpen(false);
  };

  const handleAddWptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoute) return;
    addWaypointToRoute(
      activeRoute.id,
      { latitude: wptLat, longitude: wptLon },
      wptName.trim() || undefined
    );
    setWptName('');
    setIsAddWptModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête Planificateur de Routes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Route className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                Planificateur de Routes & Évitement Automatique ECDIS
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800">
                COLREGs / ISO 1174
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Calcul géodésique de branches, validation bathymétrique sous quille et déviation automatique des obstacles AIS.
            </p>
          </div>
        </div>

        {/* Boutons d'Action & Création */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewRouteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Créer Nouvelle Route</span>
          </button>
        </div>
      </div>

      {/* BANDEAU PILOTAGE EN DIRECT (RÉPÉTEUR DE ROUTE & DTW/BTW/TTG) */}
      {activeRoute && currentTargetWpt && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border border-cyan-800/60 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-300 font-bold font-mono">
              W{activeWaypointIndex + 1}
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                Waypoint Rallié Actif ({activeWaypointIndex + 1}/{activeRoute.waypoints.length})
              </div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{currentTargetWpt.name}</span>
                {currentTargetWpt.isAvoidanceDivert && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-yellow-950 text-yellow-300 border border-yellow-800 font-mono">
                    DÉVIATION COLREG
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-xs">
            {/* DTW */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Distance (DTW)</span>
              <span className="text-base font-bold text-cyan-400">{dtwNM.toFixed(2)} NM</span>
            </div>

            {/* BTW */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Cap à Suivre (BTW)</span>
              <span className="text-base font-bold text-slate-200">{btwDeg}° vrai</span>
            </div>

            {/* TTG */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Temps Restant (TTG)</span>
              <span className="text-base font-bold text-emerald-400">
                {ttgMinutes > 60
                  ? `${Math.floor(ttgMinutes / 60)}h ${Math.round(ttgMinutes % 60)}m`
                  : `${ttgMinutes.toFixed(1)} min`}
              </span>
            </div>

            {/* Écart de Barre */}
            <div className="bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase">Correction Barre</span>
              <span
                className={`text-base font-bold ${
                  courseError > 10 && courseError < 350 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {courseError > 180 ? `Bâbord ${360 - courseError}°` : `Tribord ${courseError}°`}
              </span>
            </div>
          </div>

          <button
            onClick={advanceActiveWaypoint}
            disabled={activeWaypointIndex >= activeRoute.waypoints.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow"
          >
            <span>Wpt Suivant</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SÉLECTEUR DE ROUTES DISPONIBLES */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {routes.map((r) => {
          const isSelected = r.id === activeRoute?.id;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRoute(r.id)}
              className={`p-3 rounded-2xl border text-left transition shrink-0 max-w-xs ${
                isSelected
                  ? 'bg-slate-900 border-orange-500/70 shadow-lg shadow-orange-950/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-xs text-slate-100 truncate">{r.name}</span>
                {r.isActive && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0">
                    ACTIF
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {r.waypoints.length} waypoints • {r.totalDistanceNM} NM • ~{r.estimatedDurationHours}h
              </div>
            </button>
          );
        })}
      </div>

      {/* DÉTAIL DE LA ROUTE SÉLECTIONNÉE, VALIDATION DE SÉCURITÉ & TABLEAU DES WAYPOINTS */}
      {activeRoute && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PANNEAU DE SÉCURITÉ & ACTIONS D'OPTIMISATION (4 Colonnes) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-400" /> Sécurité & Dégagement ECDIS
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    activeRoute.safetyStatus === 'SAFE'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : activeRoute.safetyStatus === 'OPTIMIZED'
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      : 'bg-red-950 text-red-300 border-red-800 animate-pulse'
                  }`}
                >
                  {activeRoute.safetyStatus === 'SAFE'
                    ? 'SÉCURISÉE'
                    : activeRoute.safetyStatus === 'OPTIMIZED'
                    ? 'ÉVITEMENT ACTIF'
                    : 'CONFLIT DÉTECTÉ'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                {activeRoute.description}
              </p>

              {/* Conflits détectés */}
              {activeRoute.conflicts && activeRoute.conflicts.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Conflits Immédiats sur la Route :
                  </span>
                  {activeRoute.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="bg-red-950/40 border border-red-800/80 p-2.5 rounded-xl text-xs text-red-200 space-y-1"
                    >
                      <div className="font-semibold">{c.description}</div>
                    </div>
                  ))}

                  {/* Bouton d'Optimisation Automatique COLREG */}
                  <button
                    onClick={() => autoOptimizeRoute(activeRoute.id)}
                    className="w-full mt-2 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Calculer l'Évitement Automatique COLREG</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    La route respecte les tirants d'eau minimaux et ne croise aucune cible AIS à risque d'abordage.
                  </span>
                </div>
              )}

              {/* Bouton de vérification manuelle */}
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => checkRouteSafetyAction(activeRoute.id)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Re-vérifier
                </button>
                <button
                  onClick={() => setIsAddWptModalOpen(true)}
                  className="flex-1 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/50 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> + Waypoint
                </button>
              </div>
            </div>
          </div>

          {/* TABLEAU DES WAYPOINTS & MÉTRIQUES DES BRANCHES (8 Colonnes) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" /> Liste des Waypoints & Données de Navigation
                </h3>
                <span className="text-xs font-mono text-cyan-300">
                  Total : {activeRoute.totalDistanceNM} NM • Vitesse prévue {activeRoute.plannedSpeedKts} kts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Nom Waypoint</th>
                      <th className="py-2 px-2">Coordonnées WGS84</th>
                      <th className="py-2 px-2">Distance Leg</th>
                      <th className="py-2 px-2">Cap Leg</th>
                      <th className="py-2 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeRoute.waypoints.map((wpt, idx) => {
                      const isCurrentActive = idx === activeWaypointIndex;
                      return (
                        <tr
                          key={wpt.id}
                          className={`transition ${
                            isCurrentActive
                              ? 'bg-cyan-950/40 text-cyan-200'
                              : wpt.isAvoidanceDivert
                              ? 'bg-amber-950/20 text-amber-200'
                              : 'hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="py-2.5 px-2 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-2 font-sans font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span>{wpt.name}</span>
                              {wpt.isAvoidanceDivert && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-yellow-950 text-yellow-300 border border-yellow-800">
                                  COLREG
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-slate-400">
                            {wpt.coordinates.latitude.toFixed(4)}°N • {wpt.coordinates.longitude.toFixed(4)}°E
                          </td>
                          <td className="py-2.5 px-2 text-cyan-400 font-bold">
                            {wpt.legDistanceNM ? `${wpt.legDistanceNM} NM` : 'Départ'}
                          </td>
                          <td className="py-2.5 px-2 text-slate-300">
                            {wpt.legBearingDeg !== undefined ? `${wpt.legBearingDeg}°` : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            {activeRoute.waypoints.length > 2 && (
                              <button
                                onClick={() => removeWaypointFromRoute(activeRoute.id, wpt.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800"
                                title="Supprimer ce waypoint"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Note informative COLREG */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                Standard IMO / OMI : Couloir de sécurité Cross-Track Corridor (XTD) paramétré à 0.10 NM.
              </span>
              <span className="text-orange-400 font-mono">Projection Loxodromique</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DE NOUVELLE ROUTE */}
      {isNewRouteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Route className="w-5 h-5 text-orange-400" /> Nouvelle Route de Navigation
              </h3>
              <button onClick={() => setIsNewRouteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRouteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom de la Route :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pêche Tombant Ouest - Cherchell"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description / Objectif :</label>
                <textarea
                  rows={2}
                  placeholder="Objectif de la sortie, points de passage prévus..."
                  value={newRouteDescription}
                  onChange={(e) => setNewRouteDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Vitesse Prévue (kts) :</label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="30"
                  value={newRouteSpeed}
                  onChange={(e) => setNewRouteSpeed(parseFloat(e.target.value) || 8.0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRouteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold shadow"
                >
                  Créer la Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJOUT DE WAYPOINT */}
      {isAddWptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" /> Ajouter un Waypoint
              </h3>
              <button onClick={() => setIsAddWptModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWptSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nom / Identifiant :</label>
                <input
                  type="text"
                  placeholder="Ex: W5 - Tête de Roche"
                  value={wptName}
                  onChange={(e) => setWptName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude (°N) :</label>
                  <input
                    type="number"
                    step="0.001"
                    value={wptLat}
                    onChange={(e) => setWptLat(parseFloat(e.target.value) || 36.62)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude (°E) :</label>
                  <input
                    type="number"
                    step="0.001"
                    value={wptLon}
                    onChange={(e) => setWptLon(parseFloat(e.target.value) || 2.70)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddWptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold shadow"
                >
                  Ajouter à la Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
