import React, { useState, useMemo } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { S52_PALETTES } from '../data/s52Style';
import { S57_FEATURES_SEED, DEPTH_CONTOURS_SEED } from '../data/marineSeedData';
import { TileCacheService, NavigationRegionPack } from '../services/TileCacheService';
import {
  Compass,
  Plus,
  Minus,
  LocateFixed,
  Layers,
  ShieldAlert,
  Info,
  Navigation as NavIcon,
  Anchor,
  AlertTriangle,
  HardDrive,
  Wifi,
  WifiOff,
  Download,
  CheckCircle2,
  Database,
  Trash2,
  X,
  RefreshCw,
  Route as RouteIcon,
  Bot,
  Sparkles,
} from 'lucide-react';

interface ChartPlotterProps {
  onNavigateToCopilot?: () => void;
}

export const ChartPlotter: React.FC<ChartPlotterProps> = ({ onNavigateToCopilot }) => {
  const {
    vessel,
    s52Palette,
    aisTargets,
    trackHistory,
    selectedAisMmsi,
    setSelectedAisMmsi,
    setBoatDraft,
    isOfflineMode,
    toggleOfflineMode,
    routes,
    activeRouteId,
    activeWaypointIndex,
  } = useNavigationStore();

  const [zoomLevel, setZoomLevel] = useState<number>(1); // Facteur d'échelle
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showIsobathes, setShowIsobathes] = useState<boolean>(true);
  const [showAisVectors, setShowAisVectors] = useState<boolean>(true);
  const [showPlannedRoute, setShowPlannedRoute] = useState<boolean>(true);
  const [activeInspector, setActiveInspector] = useState<string | null>(null);

  const activeRoute = useMemo(() => {
    return routes.find((r) => r.id === activeRouteId);
  }, [routes, activeRouteId]);

  // ÉTAT DE LA COUCHE DE CACHE HORS-LIGNE ECDIS
  const [isCacheModalOpen, setIsCacheModalOpen] = useState<boolean>(false);
  const [cachedTilesCount, setCachedTilesCount] = useState<number>(64);
  const [cachedSizeMb, setCachedSizeMb] = useState<number>(4.8);
  const [regionPacks, setRegionPacks] = useState<NavigationRegionPack[]>(
    TileCacheService.getPredefinedRegionPacks()
  );
  const [downloadingRegionId, setDownloadingRegionId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  // Initialisation et pré-remplissage du cache local IndexedDB
  React.useEffect(() => {
    const initCache = async () => {
      const stats = await TileCacheService.getCacheStats();
      if (stats.count > 0) {
        setCachedTilesCount(stats.count);
        setCachedSizeMb(Number((stats.totalSizeBytes / (1024 * 1024)).toFixed(1)));
      } else {
        const defaultPack = TileCacheService.getPredefinedRegionPacks()[0];
        await TileCacheService.downloadRegionPack(defaultPack, () => {});
        const newStats = await TileCacheService.getCacheStats();
        setCachedTilesCount(newStats.count);
        setCachedSizeMb(Number((newStats.totalSizeBytes / (1024 * 1024)).toFixed(1)));
      }
    };
    initCache();
  }, []);

  const handleDownloadPack = async (pack: NavigationRegionPack) => {
    setDownloadingRegionId(pack.id);
    setDownloadProgress(0);
    await TileCacheService.downloadRegionPack(pack, (percent) => {
      setDownloadProgress(percent);
    });
    setRegionPacks((prev) =>
      prev.map((p) => (p.id === pack.id ? { ...p, isDownloaded: true } : p))
    );
    setDownloadingRegionId(null);
    const stats = await TileCacheService.getCacheStats();
    setCachedTilesCount(stats.count);
    setCachedSizeMb(Number((stats.totalSizeBytes / (1024 * 1024)).toFixed(1)));
  };

  const handleClearCache = async () => {
    await TileCacheService.clearCache();
    setCachedTilesCount(0);
    setCachedSizeMb(0);
    setRegionPacks((prev) => prev.map((p) => ({ ...p, isDownloaded: false })));
  };

  const colors = S52_PALETTES[s52Palette];

  // Calcul de la zone de projection locale (autour de Khemisti - Tipaza)
  // Centre nominal : 36.6100 N, 2.7000 E
  const refLat = 36.6120;
  const refLon = 2.6980;

  // Conversion Coordonnées WGS84 -> Pixels du Canvas SVG
  // 1 degré de latitude ~ 111 000 m. Espace de vue SVG : 800 x 600
  const coordToPixel = (lon: number, lat: number) => {
    const scale = 18000 * zoomLevel;
    const x = 400 + (lon - refLon) * scale + centerOffset.x;
    const y = 300 - (lat - refLat) * scale + centerOffset.y; // Inversion axe Y
    return { x, y };
  };

  // Coordonnées du navire
  const ownPosPx = coordToPixel(vessel.filteredPosition.longitude, vessel.filteredPosition.latitude);
  const rawPosPx = coordToPixel(vessel.rawPosition.longitude, vessel.rawPosition.latitude);

  // Seuil dynamique d'isobathe de sécurité selon le tirant d'eau (S-52 Safety Contour Rule)
  const safetyDepth = vessel.boatDraft + vessel.safetyMargin;

  // Calcul du vecteur de vitesse COG (projection à 6 minutes selon standard ECDIS IMO)
  const vectorLengthPx = Math.max(15, (vessel.sog * 4) * zoomLevel);
  const cogRad = ((vessel.cog - 90) * Math.PI) / 180;
  const cogEndX = ownPosPx.x + vectorLengthPx * Math.cos(cogRad);
  const cogEndY = ownPosPx.y + vectorLengthPx * Math.sin(cogRad);

  const handleCenterShip = () => {
    setCenterOffset({ x: 0, y: 0 });
    setZoomLevel(1);
  };

  return (
    <div className="relative w-full h-[calc(100vh-105px)] bg-slate-950 overflow-hidden flex flex-col select-none">
      {/* Barre d'outils du Traceur ECDIS */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        {/* Contrôles de Zoom et Centrage */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1.5 flex flex-col gap-1 shadow-2xl">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.8, z + 0.25))}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom +"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom -"
          >
            <Minus className="w-5 h-5" />
          </button>
          <div className="h-px bg-slate-800 my-0.5" />
          <button
            onClick={handleCenterShip}
            className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition"
            title="Recentrer sur le Navire"
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>

        {/* Calques et Sélecteurs d'Affichage S-52 */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1.5 flex flex-col gap-1 shadow-2xl">
          <button
            onClick={() => setShowIsobathes(!showIsobathes)}
            className={`p-2 rounded-lg transition ${
              showIsobathes ? 'bg-cyan-600/30 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Afficher/Masquer Isobathes (DEPCNT)"
          >
            <Layers className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowAisVectors(!showAisVectors)}
            className={`p-2 rounded-lg transition ${
              showAisVectors ? 'bg-cyan-600/30 text-cyan-300' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Afficher/Masquer Vecteurs AIS"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPlannedRoute(!showPlannedRoute)}
            className={`p-2 rounded-lg transition ${
              showPlannedRoute ? 'bg-orange-600/30 text-orange-300' : 'text-slate-400 hover:bg-slate-800'
            }`}
            title="Afficher/Masquer Route Planifiée & Waypoints"
          >
            <RouteIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Gestionnaire de Cache Hors-Ligne & MBTiles */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-1.5 flex flex-col gap-1 shadow-2xl">
          <button
            onClick={() => setIsCacheModalOpen(true)}
            className={`p-2 rounded-lg transition relative ${
              isOfflineMode
                ? 'bg-amber-600/30 text-amber-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Packs Cartographiques & Cache Hors-Ligne (IndexedDB)"
          >
            <Database className="w-5 h-5" />
            <span
              className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                isOfflineMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            />
          </button>

          {/* Raccourci Copilote Maritime Gemini */}
          {onNavigateToCopilot && (
            <button
              onClick={onNavigateToCopilot}
              className="p-2 rounded-lg transition text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/60 relative group"
              title="Ouvrir le Copilote Maritime Gemini (Search & Chat)"
            >
              <Bot className="w-5 h-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Bannière Mode Hors-Ligne Offshore Active */}
      {isOfflineMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-950/90 border border-amber-500/70 text-amber-200 px-4 py-1.5 rounded-full text-xs font-mono font-semibold shadow-2xl flex items-center gap-2 backdrop-blur animate-pulse pointer-events-auto">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>MODE HORS-LIGNE OFFSHORE ACTIF (Cache Local : {cachedTilesCount} tuiles)</span>
        </div>
      )}

      {/* Rose des Vents ECDIS en coin supérieur droit */}
      <div className="absolute top-4 right-4 z-20 pointer-events-none flex flex-col items-end gap-2">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-3 shadow-2xl flex items-center gap-3">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <Compass
              className="w-12 h-12 text-cyan-400 transition-transform duration-500"
              style={{ transform: `rotate(${-vessel.cog}deg)` }}
            />
            <span className="absolute text-[9px] font-bold text-red-500 top-0.5">N</span>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Orientation Carte</div>
            <div className="text-xs font-mono font-bold text-slate-200">NORTH UP (NORD EN HAUT)</div>
            <div className="text-[11px] text-cyan-300 font-mono">ÉCHELLE 1:15 000 (Z{(zoomLevel * 14).toFixed(0)})</div>
          </div>
        </div>

        {/* Panneau de surveillance du tirant d'eau & Isobathe de Sécurité S-52 */}
        <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-xl p-3 shadow-2xl pointer-events-auto max-w-xs">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Isobathe de Sécurité S-52
            </span>
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
              {safetyDepth.toFixed(1)}m
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug mb-2">
            Règle ECDIS : Les courbes bathymétriques inférieures à votre tirant d'eau ({vessel.boatDraft}m) + pied de pilote ({vessel.safetyMargin}m) sont tracées en <strong className="text-red-400">trait rouge renforcé (0.6mm)</strong>.
          </p>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400">Tirant d'eau (Draft) :</label>
            <input
              type="range"
              min="1.0"
              max="7.0"
              step="0.2"
              value={vessel.boatDraft}
              onChange={(e) => setBoatDraft(parseFloat(e.target.value))}
              className="flex-1 accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-cyan-300 font-bold">{vessel.boatDraft.toFixed(1)}m</span>
          </div>
        </div>
      </div>

      {/* CANVAS SVG DU TRACEUR ECDIS S-52 */}
      <div className="relative flex-1 w-full h-full cursor-crosshair">
        <svg
          className="w-full h-full"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          style={{ backgroundColor: colors.BACKGROUND }}
        >
          {/* 1. TERRE ÉMERGÉE & LITTORAL (S-52 LANDA & CSTLN) */}
          <path
            d="M -100 600 L -100 340 Q 150 360 300 350 T 550 380 Q 750 360 900 370 L 900 600 Z"
            fill={colors.LANDA}
            stroke={colors.CSTLN}
            strokeWidth="2.5"
          />

          {/* Digues et jetées du port de Khemisti */}
          {(() => {
            const jetty1 = coordToPixel(2.6952, 36.6048);
            const jetty2 = coordToPixel(2.6938, 36.6042);
            const landRoot = coordToPixel(2.6920, 36.6015);
            return (
              <g>
                <path
                  d={`M ${landRoot.x} ${landRoot.y} L ${jetty1.x} ${jetty1.y}`}
                  stroke={colors.CSTLN}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${landRoot.x - 20} ${landRoot.y} L ${jetty2.x} ${jetty2.y}`}
                  stroke={colors.CSTLN}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            );
          })()}

          {/* 2. ZONE DE MOUILLAGE RÉGLEMENTÉE ACHARE */}
          {(() => {
            const achare = S57_FEATURES_SEED.find((f) => f.type === 'ACHARE');
            if (achare && Array.isArray(achare.coordinates[0])) {
              const points = (achare.coordinates as [number, number][])
                .map((pt) => {
                  const p = coordToPixel(pt[0], pt[1]);
                  return `${p.x},${p.y}`;
                })
                .join(' ');

              const centerPt = coordToPixel(2.708, 36.608);

              return (
                <g key="achare-layer">
                  <polygon
                    points={points}
                    fill={colors.ACHARE_FILL}
                    stroke={colors.ACHARE_STROKE}
                    strokeWidth="1.8"
                    strokeDasharray="6,4"
                  />
                  {/* Symbole d'ancre S-52 */}
                  <g transform={`translate(${centerPt.x - 12}, ${centerPt.y - 12})`}>
                    <circle cx="12" cy="12" r="14" fill="rgba(15, 23, 42, 0.6)" stroke={colors.ACHARE_STROKE} strokeWidth="1" />
                    <text x="12" y="16" textAnchor="middle" fill={colors.ACHARE_STROKE} fontSize="14" fontWeight="bold">
                      ⚓
                    </text>
                  </g>
                  <text
                    x={centerPt.x}
                    y={centerPt.y + 22}
                    textAnchor="middle"
                    fill={colors.CHMGD_LABEL}
                    fontSize="10"
                    fontWeight="600"
                    className="font-sans"
                  >
                    ACHARE (Mouillage Forain)
                  </text>
                </g>
              );
            }
            return null;
          })()}

          {/* 3. LIGNES BATHYMÉTRIQUES DYNAMIQUES & ISOBATHES DE SÉCURITÉ (S-52 DEPCNT) */}
          {showIsobathes &&
            DEPTH_CONTOURS_SEED.map((contour) => {
              const isSafetyViolation = contour.depth <= safetyDepth;
              const pathStr = contour.coordinates
                .map((pt, idx) => {
                  const px = coordToPixel(pt[0], pt[1]);
                  return `${idx === 0 ? 'M' : 'L'} ${px.x} ${px.y}`;
                })
                .join(' ');

              const labelPos = coordToPixel(contour.coordinates[2][0], contour.coordinates[2][1]);

              return (
                <g key={`depcnt-${contour.depth}`}>
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={isSafetyViolation ? colors.SAFETY_CONTOUR : colors.DEPCNT_NORMAL}
                    strokeWidth={isSafetyViolation ? '2.8' : '1.2'}
                    strokeDasharray={isSafetyViolation ? undefined : '3,1'}
                    className="transition-colors duration-300"
                  />
                  {/* Étiquette de profondeur S-52 */}
                  <g transform={`translate(${labelPos.x}, ${labelPos.y - 4})`}>
                    <rect
                      x="-12"
                      y="-8"
                      width="24"
                      height="12"
                      rx="3"
                      fill={isSafetyViolation ? '#7f1d1d' : 'rgba(15, 23, 42, 0.7)'}
                      stroke={isSafetyViolation ? colors.SAFETY_CONTOUR : colors.DEPCNT_NORMAL}
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fill={isSafetyViolation ? '#fecaca' : '#93c5fd'}
                      fontSize="9"
                      fontWeight="bold"
                      className="font-mono"
                    >
                      {contour.depth}m
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 4. BALISAGE MARITIME S-57 (BOYLAT, BOYISD, LIGHTS) */}
          {S57_FEATURES_SEED.map((feat) => {
            if (feat.type === 'ACHARE') return null;
            const pt = feat.coordinates as [number, number];
            const px = coordToPixel(pt[0], pt[1]);

            const isPort = feat.category === 'Port';
            const isStarboard = feat.category === 'Starboard';
            const isIsolatedHazard = feat.type === 'BOYISD';

            return (
              <g
                key={feat.id}
                className="cursor-pointer group"
                onClick={() => setActiveInspector(feat.name)}
              >
                {/* Halo pulsant si feu actif ou danger */}
                {feat.lightCharacteristic && (
                  <circle
                    cx={px.x}
                    cy={px.y}
                    r="12"
                    fill={isPort ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}
                    className="animate-pulse"
                  />
                )}

                {/* Corps de la bouée selon standard S-52 */}
                {isPort && (
                  // Bouée bâbord (cylindrique rouge)
                  <rect
                    x={px.x - 5}
                    y={px.y - 9}
                    width="10"
                    height="12"
                    fill={colors.BOYLAT_PORT}
                    stroke="#000"
                    strokeWidth="1.2"
                  />
                )}
                {isStarboard && (
                  // Bouée tribord (conique verte)
                  <polygon
                    points={`${px.x},${px.y - 12} ${px.x - 6},${px.y + 3} ${px.x + 6},${px.y + 3}`}
                    fill={colors.BOYLAT_STBD}
                    stroke="#000"
                    strokeWidth="1.2"
                  />
                )}
                {isIsolatedHazard && (
                  // Bouée danger isolé (sphère double voyant)
                  <g>
                    <circle cx={px.x} cy={px.y} r="6" fill="#000" stroke="#ef4444" strokeWidth="2" />
                    <circle cx={px.x} cy={px.y - 10} r="2.5" fill="#000" />
                    <circle cx={px.x} cy={px.y - 15} r="2.5" fill="#000" />
                  </g>
                )}

                {/* Feu d'alignement au musoir */}
                {feat.type === 'LIGHTS' && (
                  <circle
                    cx={px.x}
                    cy={px.y}
                    r="5"
                    fill={feat.color?.[0] || '#fff'}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                )}

                {/* Nom et caractéristique du feu S-52 */}
                <text
                  x={px.x + 10}
                  y={px.y + 3}
                  fill={colors.CHMGD_LABEL}
                  fontSize="9"
                  fontWeight="600"
                  className="font-sans"
                >
                  {feat.name.split('(')[0]}
                </text>
                {feat.lightCharacteristic && (
                  <text
                    x={px.x + 10}
                    y={px.y + 13}
                    fill="#dc2626"
                    fontSize="8"
                    fontWeight="bold"
                    className="font-mono"
                  >
                    {feat.lightCharacteristic}
                  </text>
                )}
              </g>
            );
          })}

          {/* 5. HISTORIQUE DE TRACE DU NAVIRE (TRACK TRAIL) */}
          {trackHistory.length > 1 && (
            <polyline
              points={trackHistory
                .map((tp) => {
                  const p = coordToPixel(tp.longitude, tp.latitude);
                  return `${p.x},${p.y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4,2"
              opacity="0.8"
            />
          )}

          {/* 5.5 ROUTE DE NAVIGATION PLANIFIÉE & WAYPOINTS (ECDIS ROUTE PLANNER) */}
          {showPlannedRoute && activeRoute && activeRoute.waypoints.length > 0 && (
            <g key="planned-route-layer">
              {/* Branches (legs) de la route */}
              {activeRoute.waypoints.slice(0, -1).map((w1, i) => {
                const w2 = activeRoute.waypoints[i + 1];
                const p1 = coordToPixel(w1.coordinates.longitude, w1.coordinates.latitude);
                const p2 = coordToPixel(w2.coordinates.longitude, w2.coordinates.latitude);
                const hasConflict = activeRoute.conflicts?.some((c) => c.legIndex === i);

                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                return (
                  <g key={`leg-${i}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={hasConflict ? '#ef4444' : '#f97316'}
                      strokeWidth={hasConflict ? '3.5' : '2.2'}
                      strokeDasharray={hasConflict ? '4,2' : '7,4'}
                      className={hasConflict ? 'animate-pulse' : ''}
                    />
                    <g transform={`translate(${midX}, ${midY - 8})`}>
                      <rect
                        x="-35"
                        y="-8"
                        width="70"
                        height="14"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke={hasConflict ? '#ef4444' : '#f97316'}
                        strokeWidth="0.8"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fill={hasConflict ? '#fca5a5' : '#fed7aa'}
                        fontSize="8"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {w2.legBearingDeg}° • {w2.legDistanceNM}NM
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Marqueurs de Waypoints */}
              {activeRoute.waypoints.map((wpt, idx) => {
                const px = coordToPixel(wpt.coordinates.longitude, wpt.coordinates.latitude);
                const isTarget = idx === activeWaypointIndex;
                const isAvoidance = wpt.isAvoidanceDivert;

                return (
                  <g
                    key={wpt.id}
                    className="cursor-pointer"
                    onClick={() => setActiveInspector(`Waypoint: ${wpt.name}`)}
                  >
                    {isTarget && (
                      <circle
                        cx={px.x}
                        cy={px.y}
                        r="14"
                        fill="rgba(6, 182, 212, 0.25)"
                        stroke="#06b6d4"
                        strokeWidth="1.5"
                        className="animate-ping"
                      />
                    )}

                    {isAvoidance ? (
                      <polygon
                        points={`${px.x},${px.y - 9} ${px.x + 8},${px.y} ${px.x},${px.y + 9} ${px.x - 8},${px.y}`}
                        fill="#eab308"
                        stroke="#000"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <circle
                        cx={px.x}
                        cy={px.y}
                        r={isTarget ? 7 : 5.5}
                        fill={isTarget ? '#06b6d4' : '#ea580c'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    )}

                    <g transform={`translate(${px.x}, ${px.y + 14})`}>
                      <rect
                        x="-24"
                        y="-6"
                        width="48"
                        height="12"
                        rx="3"
                        fill="rgba(15, 23, 42, 0.9)"
                        stroke={isAvoidance ? '#eab308' : isTarget ? '#06b6d4' : '#ea580c'}
                        strokeWidth="0.8"
                      />
                      <text
                        x="0"
                        y="2"
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fill={isAvoidance ? '#fef08a' : isTarget ? '#67e8f9' : '#ffedd5'}
                        fontSize="7.5"
                        fontWeight="bold"
                        className="font-mono"
                      >
                        {isAvoidance ? `COLREG` : `W${idx + 1}`}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* 6. CIBLES AIS (TRAFIC MARITIME ENVIRONNANT) */}
          {showAisVectors &&
            Object.values(aisTargets).map((target) => {
              const tPos = coordToPixel(target.position.longitude, target.position.latitude);
              const isSelected = selectedAisMmsi === target.mmsi;

              // Vecteur COG cible
              const tVecLen = Math.max(12, (target.sog * 3.5) * zoomLevel);
              const tCogRad = ((target.cog - 90) * Math.PI) / 180;
              const tEndX = tPos.x + tVecLen * Math.cos(tCogRad);
              const tEndY = tPos.y + tVecLen * Math.sin(tCogRad);

              return (
                <g
                  key={target.mmsi}
                  className="cursor-pointer"
                  onClick={() => setSelectedAisMmsi(target.mmsi)}
                >
                  {/* Cercle d'alarme si risque de collision CPA */}
                  {target.isDangerous && (
                    <circle
                      cx={tPos.x}
                      cy={tPos.y}
                      r="16"
                      fill="rgba(239, 68, 68, 0.25)"
                      stroke="#ef4444"
                      strokeWidth="1.5"
                      className="animate-ping"
                    />
                  )}

                  {/* Ligne de prédiction de route de la cible */}
                  <line
                    x1={tPos.x}
                    y1={tPos.y}
                    x2={tEndX}
                    y2={tEndY}
                    stroke={target.isDangerous ? '#ef4444' : '#f59e0b'}
                    strokeWidth="1.8"
                    strokeDasharray="2,2"
                  />

                  {/* Symbole ISO AIS (triangle isocèle orienté au cap COG) */}
                  <g transform={`translate(${tPos.x}, ${tPos.y}) rotate(${target.cog})`}>
                    <polygon
                      points="0,-12 7,8 -7,8"
                      fill={target.isDangerous ? '#ef4444' : isSelected ? '#38bdf8' : '#fbbf24'}
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  </g>

                  {/* Tag d'identification */}
                  <g transform={`translate(${tPos.x + 10}, ${tPos.y - 10})`}>
                    <rect
                      x="0"
                      y="-12"
                      width="100"
                      height="20"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke={target.isDangerous ? '#ef4444' : '#334155'}
                      strokeWidth="1"
                    />
                    <text x="6" y="2" fill="#fff" fontSize="9" fontWeight="bold" className="font-sans">
                      {target.vesselName.substring(0, 14)}
                    </text>
                    <text
                      x="6"
                      y="14"
                      fill={target.isDangerous ? '#fca5a5' : '#94a3b8'}
                      fontSize="8"
                      className="font-mono"
                    >
                      {target.sog.toFixed(1)}kts • CPA {target.cpa.toFixed(2)}NM
                    </text>
                  </g>
                </g>
              );
            })}

          {/* 7. REPRÉSENTATION DU GPS BRUT BRUITÉ (Affichage de l'effet Kalman) */}
          <g>
            <circle
              cx={rawPosPx.x}
              cy={rawPosPx.y}
              r="4"
              fill="rgba(244, 63, 94, 0.6)"
              stroke="#f43f5e"
              strokeWidth="1"
            />
            {/* Ligne reliant le point brut au point filtré par Kalman */}
            <line
              x1={rawPosPx.x}
              y1={rawPosPx.y}
              x2={ownPosPx.x}
              y2={ownPosPx.y}
              stroke="#f43f5e"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </g>

          {/* 8. SON PROPRE NAVIRE (OWN SHIP - ECDIS STANDARD) */}
          <g>
            {/* Ellipse d'incertitude EKF Kalman (~5m rayon) */}
            <circle
              cx={ownPosPx.x}
              cy={ownPosPx.y}
              r={Math.max(6, (vessel.accuracy * 0.8) * zoomLevel)}
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="3,2"
            />

            {/* Vecteur de Vitesse et Cap COG (Échéance 6 min) */}
            <line
              x1={ownPosPx.x}
              y1={ownPosPx.y}
              x2={cogEndX}
              y2={cogEndY}
              stroke="#ef4444"
              strokeWidth="2.5"
            />
            <circle cx={cogEndX} cy={cogEndY} r="3" fill="#ef4444" />

            {/* Silhouette du navire orientée au cap */}
            <g transform={`translate(${ownPosPx.x}, ${ownPosPx.y}) rotate(${vessel.cog})`}>
              {/* Coque stylisée */}
              <path
                d="M 0 -16 L 8 4 L 6 12 L -6 12 L -8 4 Z"
                fill="#0284c7"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
              <circle cx="0" cy="0" r="3" fill="#38bdf8" />
            </g>

            {/* Étiquette d'état du navire */}
            <g transform={`translate(${ownPosPx.x - 45}, ${ownPosPx.y + 22})`}>
              <rect
                x="0"
                y="0"
                width="90"
                height="28"
                rx="5"
                fill="rgba(15, 23, 42, 0.9)"
                stroke="#0284c7"
                strokeWidth="1"
              />
              <text x="45" y="11" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
                MON NAVIRE
              </text>
              <text x="45" y="22" textAnchor="middle" fill="#94a3b8" fontSize="8" className="font-mono">
                {vessel.sog.toFixed(1)}kts | {Math.round(vessel.cog)}° | -{vessel.depthBelowKeel}m
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Inspecteur d'Objet Flottant ou d'Alerte au clic */}
      {activeInspector && (
        <div className="absolute bottom-4 left-4 z-30 bg-slate-900/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl flex items-center gap-3 max-w-md backdrop-blur">
          <Info className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="text-xs">
            <div className="font-bold text-slate-100">{activeInspector}</div>
            <div className="text-slate-400">Objet hydrographique officiel extrait du catalogue ENC S-57</div>
          </div>
          <button
            onClick={() => setActiveInspector(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
          >
            Fermer
          </button>
        </div>
      )}

      {/* MODAL GESTIONNAIRE DU CACHE HORS-LIGNE ECDIS (INDEXEDDB / MBTILES) */}
      {isCacheModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-5">
            {/* Titre & Fermeture */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Gestionnaire de Tuiles ECDIS & Cache Hors-Ligne
                  </h3>
                  <p className="text-xs text-slate-400">
                    Stockage local persistant IndexedDB • Navigation autonome déconnectée au large
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCacheModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Commutateur de Mode Hors-Ligne (Simulateur Offshore) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isOfflineMode
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-600'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-600'
                  }`}
                >
                  {isOfflineMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>État Réseau : {isOfflineMode ? 'Mode Hors-Ligne Forcé' : 'En Ligne (Côtier)'}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isOfflineMode
                          ? 'bg-amber-900/60 text-amber-300'
                          : 'bg-emerald-900/60 text-emerald-300'
                      }`}
                    >
                      {isOfflineMode ? 'OFFSHORE' : 'CONNECTÉ'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isOfflineMode
                      ? 'Les tuiles et vecteurs cartographiques sont servis 100% depuis IndexedDB.'
                      : 'Connexion réseau standard avec mise en cache transparente au fil de l’eau.'}
                  </p>
                </div>
              </div>

              <button
                onClick={toggleOfflineMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isOfflineMode
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {isOfflineMode ? 'Rétablir En Ligne' : 'Passer Hors-Ligne'}
              </button>
            </div>

            {/* Statistiques du Cache Local */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Tuiles en Cache Local :
                </span>
                <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5 block">
                  {cachedTilesCount} <span className="text-xs font-normal text-slate-400">tuiles</span>
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Espace Disque Utilisé :
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                  {cachedSizeMb.toFixed(1)} <span className="text-xs font-normal text-slate-400">Mo</span>
                </span>
              </div>
            </div>

            {/* Barre de Progression de Téléchargement si actif */}
            {downloadingRegionId && (
              <div className="bg-slate-950 p-3 rounded-xl border border-cyan-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Téléchargement du Pack dans IndexedDB...
                  </span>
                  <span className="font-mono">{downloadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-150"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Liste des Packs Régionaux Pré-Embarqués */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Packs Régionaux Disponibles au Pré-Téléchargement
              </span>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {regionPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span>{pack.name}</span>
                        {pack.isDownloaded && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Prêt Hors-Ligne
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {pack.description}
                      </p>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        {pack.tileCount} tuiles • ~{pack.approxSizeMb} Mo
                      </div>
                    </div>

                    <div>
                      {pack.isDownloaded ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px] whitespace-nowrap">
                          <CheckCircle2 className="w-4 h-4" /> En Cache
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownloadPack(pack)}
                          disabled={downloadingRegionId !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition shadow"
                        >
                          <Download className="w-3.5 h-3.5" /> Télécharger
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pied de Boîte de Dialogue */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <button
                onClick={handleClearCache}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vider le Cache Local
              </button>

              <button
                onClick={() => setIsCacheModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
