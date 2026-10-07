/**
 * Modèle de données maritimes conforme aux standards IHO S-57/S-52, NMEA 0183, Signal K et AIS
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface VesselState {
  // Coordonnées brutes et filtrées
  rawPosition: GeoCoordinate;
  filteredPosition: GeoCoordinate;
  accuracy: number; // rayon d'erreur en mètres (HDOP)

  // Vecteurs cinématiques
  sog: number; // Speed Over Ground en nœuds (kts)
  cog: number; // Course Over Ground en degrés (0-360°)
  headingTrue: number; // Cap vrai (compas)
  headingMagnetic: number; // Cap magnétique

  // Paramètres hydrodynamiques du navire
  speedThroughWater: number; // STW en nœuds
  boatDraft: number; // Tirant d'eau du navire en mètres (ex: 2.2m)
  safetyMargin: number; // Marge sous quille de sécurité (ex: 0.8m)
  safetyContour: number; // Isobathe de sécurité calculée (ex: 3.0m ou 5.0m standard S-52)

  // Télémétrie d'état
  depthBelowKeel: number; // Sonde sous quille en mètres
  depthBelowTransducer: number; // Sonde totale
  rateOfTurn: number; // Vitesse de giration (°/min)
  timestamp: number;

  // Accélération et attitude
  acceleration: { x: number; y: number; z: number };
  pitch: number;
  roll: number;
}

export type S52ColorPalette = 'DAY' | 'DUSK' | 'NIGHT';

export interface S57Feature {
  id: string;
  type: 'BOYLAT' | 'BOYSAW' | 'BOYISD' | 'ACHARE' | 'DEPARE' | 'DEPCNT' | 'LIGHTS' | 'WRECKS' | 'OBSTRN';
  name: string;
  coordinates: [number, number] | [number, number][]; // Point ou polygone/ligne
  depth?: number; // Pour DEPCNT et DEPARE
  category?: string; // Port, Starboard, Cardinal, Isolated Danger
  color?: string[];
  lightCharacteristic?: string; // ex: Fl(2) R 6s
  hazard?: boolean;
}

export interface AisTarget {
  mmsi: number;
  vesselName: string;
  callSign?: string;
  shipType: number;
  shipTypeLabel: string;
  position: GeoCoordinate;
  sog: number; // kts
  cog: number; // deg
  trueHeading?: number;
  navStatus: number; // 0=Under way using engine, 1=At anchor, 5=Moored, etc.
  navStatusLabel: string;
  length?: number;
  beam?: number;
  draft?: number;
  cpa: number; // Closest Point of Approach en Milles Nautiques (NM)
  tcpa: number; // Time to Closest Point of Approach en Minutes (min)
  isDangerous: boolean; // Alerte collision active si CPA < seuil et TCPA > 0
  lastSeen: number;
}

export interface SignalKDelta {
  context: string;
  updates: Array<{
    source: { label: string; type?: string };
    timestamp: string;
    values: Array<{
      path: string;
      value: any;
    }>;
  }>;
}

export interface MarineWeatherForecast {
  time: string[];
  waveHeight: number[]; // mètres
  waveDirection: number[]; // degrés
  wavePeriod: number[]; // secondes
  windWaveHeight: number[];
  windWaveDirection: number[];
  windWavePeriod: number[];
  swellWaveHeight: number[];
  swellWaveDirection: number[];
  swellWavePeriod: number[];
  windSpeed10m: number[]; // km/h ou kts
  windGusts10m: number[];
  windDirection10m: number[];
  surfacePressure: number[]; // hPa
  seaSurfaceTemperature: number[]; // °C
}

export interface SolunarPeriod {
  type: 'MAJOR_1' | 'MAJOR_2' | 'MINOR_1' | 'MINOR_2';
  name: string;
  start: Date;
  end: Date;
  intensity: 'VERY_HIGH' | 'HIGH' | 'MODERATE';
  description: string;
}

export interface SolunarCalculationResult {
  date: Date;
  moonPhaseName: string;
  moonPhaseIndex: number; // 0 à 7
  moonIllumination: number; // 0 à 100%
  moonAgeDays: number; // 0 à 29.53 jours
  moonTransitTime: string; // Zénith
  moonUnderfootTime: string; // Nadir
  moonriseTime: string;
  moonsetTime: string;
  sunriseTime: string;
  sunsetTime: string;
  majorPeriods: SolunarPeriod[];
  minorPeriods: SolunarPeriod[];
  solunarScore: number; // 0 à 100% (score non linéaire avec Stacking)
  rating: 'EXCELLENT' | 'TRÈS BON' | 'BON' | 'MOYEN' | 'FAIBLE';
  stackingFactors: {
    moonPhaseFactor: number;
    solarTwilightCoincidence: boolean;
    barometricTrendFactor: number;
    tideFactor: number;
  };
  hourlyActivityCurve: Array<{
    hour: number;
    score: number;
    periodName?: string;
  }>;
}

export interface NavigationTrackPoint {
  latitude: number;
  longitude: number;
  sog: number;
  cog: number;
  timestamp: number;
}

export type LogbookCategory =
  | 'AIS_ALERT'
  | 'WEATHER_ALERT'
  | 'SHALLOW_WATER'
  | 'NAVIGATION'
  | 'MANUAL_NOTE';

export type LogbookSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface LogbookEntry {
  id: string;
  timestamp: number;
  isoDate: string;
  category: LogbookCategory;
  severity: LogbookSeverity;
  title: string;
  details: string;
  coordinates: GeoCoordinate;
  sog: number;
  cog: number;
  metadata?: {
    mmsi?: number;
    vesselName?: string;
    cpa?: number;
    tcpa?: number;
    waveHeight?: number;
    windSpeed?: number;
    pressure?: number;
    depth?: number;
    author?: string;
  };
}

export interface Waypoint {
  id: string;
  name: string;
  coordinates: GeoCoordinate;
  legDistanceNM?: number;
  legBearingDeg?: number;
  depthEstimate?: number;
  isAvoidanceDivert?: boolean;
  notes?: string;
}

export interface RouteConflict {
  type: 'AIS_COLLISION' | 'SHALLOW_WATER' | 'HAZARD';
  legIndex: number;
  description: string;
  targetName?: string;
  minimumDepth?: number;
}

export interface NavigationRoute {
  id: string;
  name: string;
  description: string;
  waypoints: Waypoint[];
  totalDistanceNM: number;
  estimatedDurationHours: number;
  plannedSpeedKts: number;
  isActive: boolean;
  createdAt: number;
  safetyStatus: 'SAFE' | 'CONFLICT_DETECTED' | 'OPTIMIZED';
  conflicts?: RouteConflict[];
}

export interface RouteMonitoringState {
  activeWaypointIndex: number;
  distanceToWaypointNM: number;
  bearingToWaypointDeg: number;
  crossTrackErrorNM: number;
  timeToGoMinutes: number;
  steeringCorrectionDeg: number;
}
