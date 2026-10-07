/**
 * Store Zustand Principal - Navigation Maritime, Télémétrie Signal K & Filtre de Kalman EKF
 * Gère l'état global et volatile du navire conformément aux exigences temps réel.
 */

import { create } from 'zustand';
import {
  AisTarget,
  GeoCoordinate,
  LogbookEntry,
  LogbookCategory,
  LogbookSeverity,
  MarineWeatherForecast,
  NavigationRoute,
  NavigationTrackPoint,
  RouteConflict,
  S52ColorPalette,
  SolunarCalculationResult,
  VesselState,
  Waypoint,
} from '../types/maritime';
import { MarineExtendedKalmanFilter } from '../utils/KalmanFilter';
import { AisDecoder } from '../services/AisDecoder';
import { SolunarCalculator } from '../services/SolunarCalculator';
import { WeatherService } from '../services/WeatherService';
import { RoutePlannerService } from '../services/RoutePlannerService';
import { BASE_HARBOR_COORDS, INITIAL_AIS_TARGETS } from '../data/marineSeedData';

const ekfInstance = new MarineExtendedKalmanFilter(0.4);

interface NavigationStore {
  // 1. État du navire
  vessel: VesselState;
  trackHistory: NavigationTrackPoint[];
  maxTrackPoints: number;

  // 2. Cibles AIS
  aisTargets: Record<number, AisTarget>;
  selectedAisMmsi: number | null;
  dangerAlertCount: number;

  // 3. Affichage Cartographique S-52
  s52Palette: S52ColorPalette;
  showBathymetry: boolean;
  showAisVectors: boolean;
  showSafetyAlerts: boolean;
  chartZoom: number;
  chartCenter: { latitude: number; longitude: number };

  // 4. Météorologie et Océanographie
  weatherForecast: MarineWeatherForecast | null;
  weatherLoading: boolean;

  // 5. Théorie Solunaire & Prédictions Halieutiques
  solunarResult: SolunarCalculationResult | null;
  selectedSolunarDate: Date;
  barometricTendency: 'RISING_FAST' | 'STABLE' | 'FALLING';

  // 6. Connectivité Signal K & Mode Simulation
  signalKConnected: boolean;
  simulationRunning: boolean;
  lastSimStep: number;
  isOfflineMode: boolean;

  // 7. Journal de bord numérique
  logbookEntries: LogbookEntry[];

  // 8. Planificateur de routes & Waypoints
  routes: NavigationRoute[];
  activeRouteId: string | null;
  activeWaypointIndex: number;

  // Actions
  setActiveRoute: (routeId: string | null) => void;
  createRoute: (name: string, description: string, plannedSpeedKts?: number) => void;
  deleteRoute: (routeId: string) => void;
  addWaypointToRoute: (routeId: string, coordinates: GeoCoordinate, name?: string) => void;
  removeWaypointFromRoute: (routeId: string, waypointId: string) => void;
  autoOptimizeRoute: (routeId: string) => void;
  advanceActiveWaypoint: () => void;
  checkRouteSafetyAction: (routeId: string) => void;
  toggleOfflineMode: () => void;
  addLogbookEntry: (
    entry: Omit<LogbookEntry, 'id' | 'timestamp' | 'isoDate' | 'coordinates' | 'sog' | 'cog'>
  ) => void;
  deleteLogbookEntry: (id: string) => void;
  clearLogbook: () => void;
  updateGpsMeasurement: (
    rawLat: number,
    rawLon: number,
    accuracy?: number,
    imuAcc?: { ax: number; ay: number }
  ) => void;
  setBoatDraft: (draft: number) => void;
  setSafetyMargin: (margin: number) => void;
  setS52Palette: (palette: S52ColorPalette) => void;
  setSelectedAisMmsi: (mmsi: number | null) => void;
  ingestAivdmSentence: (sentence: string) => boolean;
  updateSignalKField: (path: string, value: any) => void;
  fetchMarineWeather: (lat?: number, lon?: number) => Promise<void>;
  updateSolunarDate: (date: Date) => void;
  setBarometricTendency: (trend: 'RISING_FAST' | 'STABLE' | 'FALLING') => void;
  toggleSimulation: () => void;
  simulateMotionStep: () => void;
  resetTrack: () => void;
}

const lastAisAlertLogged: Record<number, number> = {
  227014280: Date.now() - 1200000,
};
let lastWeatherAlertLogged: number = Date.now() - 2400000;
let lastShallowAlertLogged: number = Date.now() - 300000;

const INITIAL_LOGBOOK_ENTRIES: LogbookEntry[] = [
  {
    id: 'log-01',
    timestamp: Date.now() - 3600000,
    isoDate: new Date(Date.now() - 3600000).toISOString(),
    category: 'NAVIGATION',
    severity: 'INFO',
    title: 'Appareillage du Port de Pêche de Khemisti',
    details: 'Départ du quai Ouest, chenal d’accès dégagé. Cap au 045°, machine avant lente (SOG 4.2 kts).',
    coordinates: { latitude: 36.6042, longitude: 2.6945 },
    sog: 4.2,
    cog: 45,
    metadata: { author: 'Capitaine' },
  },
  {
    id: 'log-02',
    timestamp: Date.now() - 2400000,
    isoDate: new Date(Date.now() - 2400000).toISOString(),
    category: 'WEATHER_ALERT',
    severity: 'WARNING',
    title: 'Alerte Météo Marine : Rafales à 22 kts & Houle 1.4m',
    details: 'Modèle AROME actualisé : Dégradation côtière modérée. Hauteur significative Hs 1.4m, période 6.8s, vent Ouest-Nord-Ouest.',
    coordinates: { latitude: 36.6075, longitude: 2.6970 },
    sog: 6.0,
    cog: 45,
    metadata: { waveHeight: 1.4, windSpeed: 22, pressure: 1014.5 },
  },
  {
    id: 'log-03',
    timestamp: Date.now() - 1200000,
    isoDate: new Date(Date.now() - 1200000).toISOString(),
    category: 'AIS_ALERT',
    severity: 'CRITICAL',
    title: 'Alerte Risque d’Abordage CPA : CHALOUPER KHEMISTI III',
    details: 'Cible MMSI 227014280 détectée en trajectoire convergente. CPA critique calculé à 0.42 NM, TCPA 8.5 min. Veille visuelle et veille VHF canal 16 renforcées.',
    coordinates: { latitude: 36.6110, longitude: 2.6980 },
    sog: 6.4,
    cog: 45,
    metadata: { mmsi: 227014280, vesselName: 'CHALOUPER KHEMISTI III', cpa: 0.42, tcpa: 8.5 },
  },
  {
    id: 'log-04',
    timestamp: Date.now() - 300000,
    isoDate: new Date(Date.now() - 300000).toISOString(),
    category: 'SHALLOW_WATER',
    severity: 'WARNING',
    title: 'Franchissement Sonde de Sécurité (Quille -2.1m)',
    details: 'Profondeur d’eau mesurée 4.3m pour un tirant d’eau navire de 2.2m. Alerte de l’isobathe de sécurité S-52 activée.',
    coordinates: { latitude: 36.6095, longitude: 2.6975 },
    sog: 6.2,
    cog: 45,
    metadata: { depth: 2.1 },
  },
];

export const useNavigationStore = create<NavigationStore>((set, get) => {
  // Calcul solunaire initial pour le port
  const initialSolunar = SolunarCalculator.calculateSolunar(
    new Date(),
    BASE_HARBOR_COORDS.latitude,
    BASE_HARBOR_COORDS.longitude,
    'RISING_FAST'
  );

  // Météo initiale en cache
  const initialWeather = WeatherService.getCachedOrDefaultForecast(
    BASE_HARBOR_COORDS.latitude,
    BASE_HARBOR_COORDS.longitude
  );

  // Transformer les cibles AIS initiales en map indexée par MMSI
  const aisMap: Record<number, AisTarget> = {};
  INITIAL_AIS_TARGETS.forEach((t) => {
    aisMap[t.mmsi] = t;
  });

  return {
    vessel: {
      rawPosition: { ...BASE_HARBOR_COORDS },
      filteredPosition: { ...BASE_HARBOR_COORDS },
      accuracy: 12.5,
      sog: 6.4,
      cog: 45.0,
      headingTrue: 46.0,
      headingMagnetic: 44.5,
      speedThroughWater: 6.2,
      boatDraft: 2.2, // 2.20 m
      safetyMargin: 0.8,
      safetyContour: 3.0, // draft + margin arrondi
      depthBelowKeel: 6.8,
      depthBelowTransducer: 9.0,
      rateOfTurn: 0.5,
      timestamp: Date.now(),
      acceleration: { x: 0.05, y: 0.02, z: 9.81 },
      pitch: 1.2,
      roll: 2.5,
    },
    trackHistory: [
      {
        latitude: BASE_HARBOR_COORDS.latitude - 0.003,
        longitude: BASE_HARBOR_COORDS.longitude - 0.003,
        sog: 6.2,
        cog: 45,
        timestamp: Date.now() - 60000,
      },
      {
        latitude: BASE_HARBOR_COORDS.latitude,
        longitude: BASE_HARBOR_COORDS.longitude,
        sog: 6.4,
        cog: 45,
        timestamp: Date.now(),
      },
    ],
    maxTrackPoints: 1200,

    aisTargets: aisMap,
    selectedAisMmsi: 227014280,
    dangerAlertCount: 1,

    s52Palette: 'DAY',
    showBathymetry: true,
    showAisVectors: true,
    showSafetyAlerts: true,
    chartZoom: 14,
    chartCenter: { ...BASE_HARBOR_COORDS },

    weatherForecast: initialWeather,
    weatherLoading: false,

    solunarResult: initialSolunar,
    selectedSolunarDate: new Date(),
    barometricTendency: 'RISING_FAST',

    signalKConnected: true,
    simulationRunning: true,
    lastSimStep: Date.now(),
    isOfflineMode: false,

    toggleOfflineMode: () =>
      set((state) => {
        const nextMode = !state.isOfflineMode;
        // Enregistrer au journal de bord le basculement en mode offshore déconnecté
        state.addLogbookEntry({
          category: 'NAVIGATION',
          severity: 'INFO',
          title: nextMode
            ? 'Basculement en Mode Hors-Ligne Offshore (Cache MBTiles)'
            : 'Rétablissement de la Connectivité Réseau Côtier',
          details: nextMode
            ? 'Toutes les tuiles hydrographiques et requêtes SIG sont désormais servies directement par la couche locale IndexedDB.'
            : 'Synchronisation des flux réseau et services en ligne rétablie.',
        });
        return { isOfflineMode: nextMode };
      }),

    logbookEntries: INITIAL_LOGBOOK_ENTRIES,

    // 8. Planificateur de routes
    routes: RoutePlannerService.getPresetRoutes(),
    activeRouteId: 'route-khemisti-tombant',
    activeWaypointIndex: 1,

    setActiveRoute: (routeId) => {
      const { routes, addLogbookEntry } = get();
      const targetRoute = routes.find((r) => r.id === routeId);
      set({
        activeRouteId: routeId,
        activeWaypointIndex: 0,
        routes: routes.map((r) => ({ ...r, isActive: r.id === routeId })),
      });
      if (targetRoute) {
        addLogbookEntry({
          category: 'NAVIGATION',
          severity: 'INFO',
          title: `Activation Route ECDIS : ${targetRoute.name}`,
          details: `Route activée : ${targetRoute.waypoints.length} waypoints, distance totale ${targetRoute.totalDistanceNM} NM à ${targetRoute.plannedSpeedKts} kts.`,
        });
      }
    },

    createRoute: (name, description, plannedSpeedKts = 8.0) => {
      const { routes, vessel } = get();
      const initialWpt: Waypoint = {
        id: `wpt-${Date.now()}-0`,
        name: 'W1 - Départ',
        coordinates: { ...vessel.filteredPosition },
      };
      const newRoute: NavigationRoute = {
        id: `route-${Date.now()}`,
        name,
        description,
        waypoints: [initialWpt],
        totalDistanceNM: 0,
        estimatedDurationHours: 0,
        plannedSpeedKts,
        isActive: false,
        createdAt: Date.now(),
        safetyStatus: 'SAFE',
        conflicts: [],
      };
      set({ routes: [...routes, newRoute] });
    },

    deleteRoute: (routeId) => {
      const { routes, activeRouteId } = get();
      set({
        routes: routes.filter((r) => r.id !== routeId),
        activeRouteId: activeRouteId === routeId ? null : activeRouteId,
      });
    },

    addWaypointToRoute: (routeId, coordinates, name) => {
      const { routes, vessel, aisTargets } = get();
      const route = routes.find((r) => r.id === routeId);
      if (!route) return;

      const newWpt: Waypoint = {
        id: `wpt-${Date.now()}`,
        name: name || `W${route.waypoints.length + 1}`,
        coordinates,
      };

      const updatedWpts = [...route.waypoints, newWpt];
      const metrics = RoutePlannerService.recalculateRouteMetrics(updatedWpts, route.plannedSpeedKts);
      const safetyThreshold = vessel.boatDraft + vessel.safetyMargin;
      const safety = RoutePlannerService.checkRouteSafety(
        { ...route, waypoints: metrics.waypoints },
        safetyThreshold,
        aisTargets
      );

      const updatedRoute: NavigationRoute = {
        ...route,
        waypoints: metrics.waypoints,
        totalDistanceNM: metrics.totalDistanceNM,
        estimatedDurationHours: metrics.estimatedDurationHours,
        safetyStatus: safety.status,
        conflicts: safety.conflicts,
      };

      set({
        routes: routes.map((r) => (r.id === routeId ? updatedRoute : r)),
      });
    },

    removeWaypointFromRoute: (routeId, waypointId) => {
      const { routes, vessel, aisTargets } = get();
      const route = routes.find((r) => r.id === routeId);
      if (!route) return;

      const updatedWpts = route.waypoints.filter((w) => w.id !== waypointId);
      const metrics = RoutePlannerService.recalculateRouteMetrics(updatedWpts, route.plannedSpeedKts);
      const safetyThreshold = vessel.boatDraft + vessel.safetyMargin;
      const safety = RoutePlannerService.checkRouteSafety(
        { ...route, waypoints: metrics.waypoints },
        safetyThreshold,
        aisTargets
      );

      const updatedRoute: NavigationRoute = {
        ...route,
        waypoints: metrics.waypoints,
        totalDistanceNM: metrics.totalDistanceNM,
        estimatedDurationHours: metrics.estimatedDurationHours,
        safetyStatus: safety.status,
        conflicts: safety.conflicts,
      };

      set({
        routes: routes.map((r) => (r.id === routeId ? updatedRoute : r)),
      });
    },

    autoOptimizeRoute: (routeId) => {
      const { routes, vessel, aisTargets, addLogbookEntry } = get();
      const route = routes.find((r) => r.id === routeId);
      if (!route) return;

      const safetyThreshold = vessel.boatDraft + vessel.safetyMargin;
      const optimized = RoutePlannerService.autoCalculateAvoidanceRoute(
        route,
        safetyThreshold,
        aisTargets
      );

      set({
        routes: routes.map((r) => (r.id === routeId ? optimized : r)),
      });

      addLogbookEntry({
        category: 'NAVIGATION',
        severity: 'WARNING',
        title: `Optimisation Évitement COLREG : ${route.name}`,
        details: `Insertion automatique de waypoint(s) d'évitement pour contourner les obstacles AIS et les hauts-fonds. Distance ajustée à ${optimized.totalDistanceNM} NM.`,
      });
    },

    advanceActiveWaypoint: () => {
      const { activeRouteId, activeWaypointIndex, routes, addLogbookEntry } = get();
      const route = routes.find((r) => r.id === activeRouteId);
      if (!route) return;

      if (activeWaypointIndex < route.waypoints.length - 1) {
        const nextIdx = activeWaypointIndex + 1;
        set({ activeWaypointIndex: nextIdx });
        addLogbookEntry({
          category: 'NAVIGATION',
          severity: 'INFO',
          title: `Passage de Waypoint : ${route.waypoints[nextIdx].name}`,
          details: `Nouveau waypoint actif rallié. Cap à suivre : ${route.waypoints[nextIdx].legBearingDeg || 0}°.`,
        });
      }
    },

    checkRouteSafetyAction: (routeId) => {
      const { routes, vessel, aisTargets } = get();
      const route = routes.find((r) => r.id === routeId);
      if (!route) return;

      const safetyThreshold = vessel.boatDraft + vessel.safetyMargin;
      const check = RoutePlannerService.checkRouteSafety(route, safetyThreshold, aisTargets);

      set({
        routes: routes.map((r) =>
          r.id === routeId
            ? { ...r, safetyStatus: check.status, conflicts: check.conflicts }
            : r
        ),
      });
    },

    addLogbookEntry: (entry) => {
      const { vessel, logbookEntries } = get();
      const newEntry: LogbookEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        isoDate: new Date().toISOString(),
        coordinates: { ...vessel.filteredPosition },
        sog: vessel.sog,
        cog: vessel.cog,
        ...entry,
      };
      set({ logbookEntries: [newEntry, ...logbookEntries] });
    },

    deleteLogbookEntry: (id) => {
      set((state) => ({
        logbookEntries: state.logbookEntries.filter((e) => e.id !== id),
      }));
    },

    clearLogbook: () => set({ logbookEntries: [] }),

    /**
     * Ingestion d'une mesure brute GNSS via le Filtre de Kalman EKF
     */
    updateGpsMeasurement: (rawLat, rawLon, accuracy = 12.0, imuAcc) => {
      const { vessel, trackHistory, maxTrackPoints } = get();

      // Exécution de l'EKF cinématique (P(t+1), V(t+1), etc.)
      const ekfOutput = ekfInstance.update(
        rawLat,
        rawLon,
        accuracy,
        Date.now(),
        imuAcc
      );

      const updatedVessel: VesselState = {
        ...vessel,
        rawPosition: { latitude: rawLat, longitude: rawLon },
        filteredPosition: { latitude: ekfOutput.latitude, longitude: ekfOutput.longitude },
        accuracy: ekfOutput.varianceRadius,
        sog: ekfOutput.sogKnots,
        cog: ekfOutput.cogDegrees,
        headingTrue: ekfOutput.cogDegrees,
        timestamp: Date.now(),
      };

      // Enregistrement de la trace avec filtre de distance
      const newPoint: NavigationTrackPoint = {
        latitude: ekfOutput.latitude,
        longitude: ekfOutput.longitude,
        sog: ekfOutput.sogKnots,
        cog: ekfOutput.cogDegrees,
        timestamp: Date.now(),
      };

      const updatedTrack = [...trackHistory.slice(-maxTrackPoints), newPoint];

      set({
        vessel: updatedVessel,
        trackHistory: updatedTrack,
      });
    },

    setBoatDraft: (draft) => {
      const { vessel } = get();
      const safeDraft = Math.max(0.5, Math.min(15.0, draft));
      const safetyContour = Math.ceil(safeDraft + vessel.safetyMargin);

      set({
        vessel: {
          ...vessel,
          boatDraft: Number(safeDraft.toFixed(2)),
          safetyContour,
        },
      });
    },

    setSafetyMargin: (margin) => {
      const { vessel } = get();
      const safeMargin = Math.max(0.2, Math.min(5.0, margin));
      const safetyContour = Math.ceil(vessel.boatDraft + safeMargin);

      set({
        vessel: {
          ...vessel,
          safetyMargin: Number(safeMargin.toFixed(2)),
          safetyContour,
        },
      });
    },

    setS52Palette: (palette) => set({ s52Palette: palette }),

    setSelectedAisMmsi: (mmsi) => set({ selectedAisMmsi: mmsi }),

    /**
     * Parsing direct d'une trame AIVDM NMEA 6-bits
     */
    ingestAivdmSentence: (sentence) => {
      const decoded = AisDecoder.parseAivdmSentence(sentence);
      if (!decoded || !decoded.mmsi || !decoded.position) return false;

      const { vessel, aisTargets } = get();

      // Calcul CPA / TCPA par rapport à notre position
      const collisionData = AisDecoder.calculateCpaTcpa(
        vessel.filteredPosition,
        vessel.sog,
        vessel.cog,
        decoded.position,
        decoded.sog || 0,
        decoded.cog || 0
      );

      const target: AisTarget = {
        mmsi: decoded.mmsi,
        vesselName: decoded.vesselName || `MMSI-${decoded.mmsi}`,
        callSign: decoded.callSign,
        shipType: decoded.shipType || 70,
        shipTypeLabel: decoded.shipTypeLabel || 'Navire Commercial',
        position: decoded.position,
        sog: decoded.sog || 0,
        cog: decoded.cog || 0,
        trueHeading: decoded.trueHeading,
        navStatus: decoded.navStatus || 0,
        navStatusLabel: decoded.navStatusLabel || 'En route',
        cpa: collisionData.cpaNM,
        tcpa: collisionData.tcpaMinutes,
        isDangerous: collisionData.isDangerous,
        lastSeen: Date.now(),
      };

      const updatedAis = { ...aisTargets, [target.mmsi]: target };
      const dangerCount = Object.values(updatedAis).filter((t) => t.isDangerous).length;

      set({
        aisTargets: updatedAis,
        dangerAlertCount: dangerCount,
      });

      // Enregistrement automatique dans le journal de bord
      if (collisionData.isDangerous) {
        const now = Date.now();
        if (!lastAisAlertLogged[decoded.mmsi] || now - lastAisAlertLogged[decoded.mmsi] > 60000) {
          lastAisAlertLogged[decoded.mmsi] = now;
          get().addLogbookEntry({
            category: 'AIS_ALERT',
            severity: 'CRITICAL',
            title: `Détection Alerte CPA : ${target.vesselName}`,
            details: `Trame NMEA AIVDM décodée : CPA estimé à ${collisionData.cpaNM.toFixed(2)} NM, TCPA ${collisionData.tcpaMinutes.toFixed(1)} min.`,
            metadata: {
              mmsi: target.mmsi,
              vesselName: target.vesselName,
              cpa: collisionData.cpaNM,
              tcpa: collisionData.tcpaMinutes,
            },
          });
        }
      }

      return true;
    },

    /**
     * Traitement d'un delta Signal K
     */
    updateSignalKField: (path, value) => {
      const { vessel } = get();

      if (path === 'environment.depth.belowKeel') {
        const depth = typeof value === 'number' ? value : Number(value);
        set({
          vessel: {
            ...vessel,
            depthBelowKeel: Number(depth.toFixed(2)),
            depthBelowTransducer: Number((depth + vessel.boatDraft).toFixed(2)),
          },
        });
      } else if (path === 'navigation.speedThroughWater') {
        set({ vessel: { ...vessel, speedThroughWater: Number(value.toFixed(1)) } });
      } else if (path === 'navigation.headingMagnetic') {
        set({ vessel: { ...vessel, headingMagnetic: Number(value.toFixed(1)) } });
      }
    },

    /**
     * Récupération des données Open-Meteo réelles
     */
    fetchMarineWeather: async (lat, lon) => {
      const targetLat = lat ?? get().vessel.filteredPosition.latitude;
      const targetLon = lon ?? get().vessel.filteredPosition.longitude;

      set({ weatherLoading: true });
      try {
        const forecast = await WeatherService.fetchMarineForecast(targetLat, targetLon);
        set({ weatherForecast: forecast, weatherLoading: false });

        // Enregistrement automatique au journal si conditions de mer dégradées
        if (forecast && forecast.waveHeight?.length) {
          const maxWave = Math.max(...forecast.waveHeight.slice(0, 12));
          const maxWind = Math.max(...forecast.windSpeed10m.slice(0, 12));
          const now = Date.now();
          if ((maxWave >= 1.8 || maxWind >= 22) && now - lastWeatherAlertLogged > 180000) {
            lastWeatherAlertLogged = now;
            get().addLogbookEntry({
              category: 'WEATHER_ALERT',
              severity: maxWave >= 2.5 ? 'CRITICAL' : 'WARNING',
              title: `Alerte Météo Marine : Vagues Hs ${maxWave.toFixed(1)}m / Vent ${maxWind.toFixed(0)} kts`,
              details: `Conditions météorologiques défavorables prévues via Open-Meteo pour les prochaines 12 heures. Échelle Douglas : ${WeatherService.getDouglasState(maxWave).label}.`,
              metadata: { waveHeight: maxWave, windSpeed: maxWind },
            });
          }
        }
      } catch {
        set({ weatherLoading: false });
      }
    },

    updateSolunarDate: (date) => {
      const { vessel, barometricTendency } = get();
      const solunar = SolunarCalculator.calculateSolunar(
        date,
        vessel.filteredPosition.latitude,
        vessel.filteredPosition.longitude,
        barometricTendency
      );
      set({ selectedSolunarDate: date, solunarResult: solunar });
    },

    setBarometricTendency: (trend) => {
      const { selectedSolunarDate, vessel } = get();
      const solunar = SolunarCalculator.calculateSolunar(
        selectedSolunarDate,
        vessel.filteredPosition.latitude,
        vessel.filteredPosition.longitude,
        trend
      );
      set({ barometricTendency: trend, solunarResult: solunar });
    },

    toggleSimulation: () => set((state) => ({ simulationRunning: !state.simulationRunning })),

    /**
     * Pas de simulation cinématique (simule le déplacement du navire et le bruit GNSS)
     */
    simulateMotionStep: () => {
      const { vessel, simulationRunning, aisTargets } = get();
      if (!simulationRunning) return;

      // Déplacement le long du cap COG
      const toRad = Math.PI / 180;
      const speedMs = (vessel.sog * 1852) / 3600; // m/s
      const dt = 1.0; // seconde

      const dLatMeters = speedMs * Math.cos(vessel.cog * toRad) * dt;
      const dLonMeters = speedMs * Math.sin(vessel.cog * toRad) * dt;

      const dLat = (dLatMeters / 6378137) * (180 / Math.PI);
      const dLon =
        (dLonMeters / (6378137 * Math.cos((vessel.filteredPosition.latitude * Math.PI) / 180))) *
        (180 / Math.PI);

      // Coordonnées idéales
      let trueLat = vessel.filteredPosition.latitude + dLat;
      let trueLon = vessel.filteredPosition.longitude + dLon;

      // Si le bateau sort de la zone de la baie, faire un virage en boucle
      if (trueLat > 36.635) {
        set({ vessel: { ...vessel, cog: 225 } });
      } else if (trueLat < 36.602) {
        set({ vessel: { ...vessel, cog: 45 } });
      }

      // Génération de bruit GNSS réaliste (rayon 12 à 15 mètres)
      const noiseRadiusMeters = 12.0;
      const noiseAngle = Math.random() * 2 * Math.PI;
      const noiseDist = (0.3 + 0.7 * Math.random()) * noiseRadiusMeters;

      const noiseLat = ((noiseDist * Math.cos(noiseAngle)) / 6378137) * (180 / Math.PI);
      const noiseLon =
        ((noiseDist * Math.sin(noiseAngle)) /
          (6378137 * Math.cos((trueLat * Math.PI) / 180))) *
        (180 / Math.PI);

      const noisyRawLat = trueLat + noiseLat;
      const noisyRawLon = trueLon + noiseLon;

      // Ingestion dans le filtre EKF
      get().updateGpsMeasurement(noisyRawLat, noisyRawLon, 12.0, {
        ax: (Math.random() - 0.5) * 0.1,
        ay: (Math.random() - 0.5) * 0.1,
      });

      // Fluctuation de la sonde sous quille en fonction de la position
      const distFromCoast = (trueLat - 36.602) * 10000;
      const simulatedDepth = Math.max(1.8, Math.min(65.0, 3.5 + distFromCoast * 0.15 + (Math.random() - 0.5) * 0.3));

      // Mise à jour des cibles AIS (recalcul CPA/TCPA dynamique)
      const updatedAis: Record<number, AisTarget> = {};
      let hasDanger = 0;

      Object.values(aisTargets).forEach((target) => {
        // Avancer la cible le long de son COG
        const tSpeedMs = (target.sog * 1852) / 3600;
        const tDLat = ((tSpeedMs * Math.cos(target.cog * toRad) * dt) / 6378137) * (180 / Math.PI);
        const tDLon =
          ((tSpeedMs * Math.sin(target.cog * toRad) * dt) /
            (6378137 * Math.cos((target.position.latitude * Math.PI) / 180))) *
          (180 / Math.PI);

        const newTargetPos = {
          latitude: target.position.latitude + tDLat,
          longitude: target.position.longitude + tDLon,
        };

        const col = AisDecoder.calculateCpaTcpa(
          { latitude: trueLat, longitude: trueLon },
          vessel.sog,
          vessel.cog,
          newTargetPos,
          target.sog,
          target.cog
        );

        if (col.isDangerous) {
          hasDanger++;
          const now = Date.now();
          if (!lastAisAlertLogged[target.mmsi] || now - lastAisAlertLogged[target.mmsi] > 120000) {
            lastAisAlertLogged[target.mmsi] = now;
            get().addLogbookEntry({
              category: 'AIS_ALERT',
              severity: 'CRITICAL',
              title: `Alerte Risque d'Abordage CPA : ${target.vesselName}`,
              details: `Rapprochement critique détecté en temps réel : CPA ${col.cpaNM.toFixed(2)} NM, TCPA ${col.tcpaMinutes.toFixed(1)} min.`,
              metadata: {
                mmsi: target.mmsi,
                vesselName: target.vesselName,
                cpa: col.cpaNM,
                tcpa: col.tcpaMinutes,
              },
            });
          }
        }

        updatedAis[target.mmsi] = {
          ...target,
          position: newTargetPos,
          cpa: col.cpaNM,
          tcpa: col.tcpaMinutes,
          isDangerous: col.isDangerous,
          lastSeen: Date.now(),
        };
      });

      // Surveillance automatique haut-fond
      if (simulatedDepth <= vessel.boatDraft + 0.3) {
        const now = Date.now();
        if (now - lastShallowAlertLogged > 120000) {
          lastShallowAlertLogged = now;
          get().addLogbookEntry({
            category: 'SHALLOW_WATER',
            severity: 'WARNING',
            title: `Alerte Haut-Fond : Sonde sous quille à ${simulatedDepth.toFixed(1)}m`,
            details: `Profondeur critique atteinte sous la quille (seuil de sécurité S-52 franchi).`,
            metadata: { depth: simulatedDepth },
          });
        }
      }

      set({
        vessel: {
          ...get().vessel,
          depthBelowKeel: Number(simulatedDepth.toFixed(2)),
          depthBelowTransducer: Number((simulatedDepth + vessel.boatDraft).toFixed(2)),
        },
        aisTargets: updatedAis,
        dangerAlertCount: hasDanger,
        lastSimStep: Date.now(),
      });
    },

    resetTrack: () => set({ trackHistory: [] }),
  };
});
