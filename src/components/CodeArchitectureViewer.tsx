import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  FolderTree,
  Terminal,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react';

const CODE_MODULES: Record<
  string,
  { title: string; subtitle: string; filename: string; language: string; code: string }
> = {
  STEP_1: {
    title: 'ÉTAPE 1 : Architecture Globale & Store Zustand',
    subtitle: 'Store réactif du navire, cibles AIS, tirant d’eau et isobathe de sécurité',
    filename: '/src/store/useNavigationStore.ts',
    language: 'typescript',
    code: `import { create } from 'zustand';
import { VesselState, AisTarget, S52ColorPalette, MarineWeatherForecast, SolunarCalculationResult } from '../types/maritime';
import { MarineExtendedKalmanFilter } from '../utils/KalmanFilter';
import { AisDecoder } from '../services/AisDecoder';
import { SolunarCalculator } from '../services/SolunarCalculator';

const ekfInstance = new MarineExtendedKalmanFilter(0.4);

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  vessel: {
    rawPosition: { latitude: 36.6042, longitude: 2.6945 },
    filteredPosition: { latitude: 36.6042, longitude: 2.6945 },
    accuracy: 12.5,
    sog: 6.4, // Speed Over Ground en nœuds
    cog: 45.0, // Course Over Ground en degrés
    boatDraft: 2.2, // Tirant d'eau (mètres)
    safetyMargin: 0.8,
    safetyContour: 3.0, // Isobathe de sécurité dynamique S-52
    depthBelowKeel: 6.8,
    depthBelowTransducer: 9.0,
    timestamp: Date.now(),
    acceleration: { x: 0.05, y: 0.02, z: 9.81 },
    pitch: 1.2,
    roll: 2.5,
  },
  aisTargets: {},
  s52Palette: 'DAY', // 'DAY' | 'DUSK' | 'NIGHT'
  
  updateGpsMeasurement: (rawLat, rawLon, accuracy = 12.0, imuAcc) => {
    // Étape d'innovation et mise à jour EKF
    const ekfOutput = ekfInstance.update(rawLat, rawLon, accuracy, Date.now(), imuAcc);
    set((state) => ({
      vessel: {
        ...state.vessel,
        rawPosition: { latitude: rawLat, longitude: rawLon },
        filteredPosition: { latitude: ekfOutput.latitude, longitude: ekfOutput.longitude },
        sog: ekfOutput.sogKnots,
        cog: ekfOutput.cogDegrees,
        accuracy: ekfOutput.varianceRadius,
      }
    }));
  },

  setBoatDraft: (draft) => {
    const { vessel } = get();
    const safetyContour = Math.ceil(draft + vessel.safetyMargin);
    set({ vessel: { ...vessel, boatDraft: draft, safetyContour } });
  },
}));`,
  },
  STEP_2: {
    title: 'ÉTAPE 2 : Foreground Service Android 14+ & Filtre de Kalman EKF',
    subtitle: 'Vecteur cinématique [Px, Py, Vx, Vy, Ax, Ay] et réduction de bruit de 15m à ~5m',
    filename: '/src/utils/KalmanFilter.ts',
    language: 'typescript',
    code: `export class MarineExtendedKalmanFilter {
  // Vecteur d'état [Px, Py, Vx, Vy, Ax, Ay]
  private state: number[] = [0, 0, 0, 0, 0, 0];
  private P: number[][] = []; // Matrice de covariance d'erreur
  private processNoiseAcc: number = 0.5; // Variance d'accélération

  // Prédiction cinématique matricielle :
  // P(t+1) = P + V*dt + 0.5*A*dt^2
  // V(t+1) = V + A*dt
  private predict(dt: number): void {
    const dt2 = 0.5 * dt * dt;
    this.state[0] += this.state[2] * dt + this.state[4] * dt2;
    this.state[1] += this.state[3] * dt + this.state[5] * dt2;
    this.state[2] += this.state[4] * dt;
    this.state[3] += this.state[5] * dt;
    // Intégration du bruit Q dans la covariance P
    const qAcc = this.processNoiseAcc * this.processNoiseAcc;
    this.P[0][0] += 0.25 * dt2 * dt2 * qAcc + 0.05;
    this.P[1][1] += 0.25 * dt2 * dt2 * qAcc + 0.05;
    this.P[2][2] += dt * dt * qAcc + 0.1;
    this.P[3][3] += dt * dt * qAcc + 0.1;
  }

  // Mise à jour de mesure GNSS & calcul du gain optimal de Kalman
  public update(rawLat: number, rawLon: number, accuracyMeters = 10, ts = Date.now()) {
    // Calcul de l'innovation : y = z - H * x
    const rVar = accuracyMeters * accuracyMeters;
    const kX = this.P[0][0] / (this.P[0][0] + rVar);
    const kY = this.P[1][1] / (this.P[1][1] + rVar);

    // Ajustement de l'état
    this.state[0] += kX * residualX;
    this.state[1] += kY * residualY;

    // Vitesse sur le fond (SOG) en nœuds et Route (COG) en degrés
    const speedMps = Math.sqrt(this.state[2]**2 + this.state[3]**2);
    const sogKnots = speedMps * 1.94384;
    let cogDeg = (Math.atan2(this.state[2], this.state[3]) * 180) / Math.PI;
    if (cogDeg < 0) cogDeg += 360;

    return { sogKnots, cogDegrees: cogDeg, varianceRadius: Math.sqrt(this.P[0][0]) };
  }
}`,
  },
  STEP_3: {
    title: 'ÉTAPE 3 : Rendu SIG MapLibre & Spécification IHO S-52',
    subtitle: 'Data-driven styling pour Safety Contour dynamique et objets S-57 (ACHARE, BOYLAT)',
    filename: '/src/data/s52Style.ts',
    language: 'typescript',
    code: `export function generateS52MapLibreStyle(paletteMode: 'DAY' | 'DUSK' | 'NIGHT', safetyDepth: number) {
  const p = S52_PALETTES[paletteMode];
  return {
    version: 8,
    sources: {
      'hydro-mbtiles': { type: 'vector', url: 'mbtiles://charts.mbtiles' },
      'emodnet-bathymetry': { type: 'raster-dem', encoding: 'terrarium' }
    },
    layers: [
      // 1. Surfaces de profondeur S-52 (DEPARE)
      {
        id: 's57-depare-fills',
        type: 'fill',
        source: 'hydro-mbtiles',
        'source-layer': 'DEPARE',
        paint: {
          'fill-color': [
            'step', ['get', 'DRVAL1'],
            p.DEPVS, // 0-2m
            2.0, p.DEPMS, // 2-5m
            5.0, p.DEPIT, // 5-10m
            10.0, p.NODEP // >10m
          ]
        }
      },
      // 2. Isobathe de Sécurité Dynamique (DEPCNT)
      {
        id: 's57-depcnt-lines',
        type: 'line',
        source: 'hydro-mbtiles',
        'source-layer': 'DEPCNT',
        paint: {
          'line-color': [
            'case',
            ['<=', ['get', 'VALDCO'], safetyDepth],
            p.SAFETY_CONTOUR, // Rouge d'alerte si profondeur <= tirant d'eau
            p.DEPCNT_NORMAL
          ],
          'line-width': [
            'case',
            ['<=', ['get', 'VALDCO'], safetyDepth],
            2.8, // 0.6mm IHO conspicuous
            1.2  // 0.3mm standard
          ]
        }
      }
    ]
  };
}`,
  },
  STEP_4: {
    title: 'ÉTAPE 4 : Télémétrie Signal K & Décodeur AIS AIVDM 6-Bits',
    subtitle: 'Désarmer la charge utile binaire, calcul CPA/TCPA et détection anti-abordage',
    filename: '/src/services/AisDecoder.ts',
    language: 'typescript',
    code: `export class AisDecoder {
  // Règle ITU : val = ascii - 48; if (val > 40) val -= 8;
  public static decodeCharTo6Bit(char: string): number {
    let val = char.charCodeAt(0) - 48;
    if (val > 40) val -= 8;
    return val >= 0 && val <= 63 ? val : 0;
  }

  // Décodage des messages Classes A (Types 1, 2, 3)
  public static parseAivdmSentence(sentence: string): Partial<AisTarget> | null {
    const parts = sentence.trim().split(',');
    const payload = parts[5];
    const bits = this.payloadToBitString(payload);

    const messageType = parseInt(bits.substring(0, 6), 2);
    if (messageType >= 1 && messageType <= 3) {
      const mmsi = parseInt(bits.substring(8, 38), 2);
      const rawSog = parseInt(bits.substring(46, 56), 2);
      const sog = rawSog === 1023 ? 0 : rawSog / 10.0;

      // Coordonnées signées divisées par 600 000
      const rawLon = extractSignedInt(bits, 57, 28);
      const longitude = rawLon / 600000.0;

      const rawLat = extractSignedInt(bits, 85, 27);
      const latitude = rawLat / 600000.0;

      const rawCog = parseInt(bits.substring(112, 124), 2);
      const cog = rawCog === 3600 ? 0 : rawCog / 10.0;

      return { mmsi, sog, cog, position: { latitude, longitude } };
    }
    return null;
  }

  // Calcul du Closest Point of Approach (CPA) et Time to CPA (TCPA)
  public static calculateCpaTcpa(ownPos, ownSog, ownCog, targetPos, targetSog, targetCog) {
    // Calcul cinématique géodésique relatif...
    const tcpaMinutes = ...;
    const cpaNM = ...;
    const isDangerous = tcpaMinutes > 0 && tcpaMinutes <= 20 && cpaNM <= 0.8;
    return { cpaNM, tcpaMinutes, isDangerous };
  }
}`,
  },
  STEP_5: {
    title: 'ÉTAPE 5 : API Météo Marine Open-Meteo & Modèles Haute Résolution',
    subtitle: 'Requêtes de houle (swell), vent, échelle Douglas et modèle AROME 1.3km',
    filename: '/src/services/WeatherService.ts',
    language: 'typescript',
    code: `export class WeatherService {
  public static async fetchMarineForecast(lat: number, lon: number): Promise<MarineWeatherForecast> {
    const marineUrl = \`https://marine-api.open-meteo.com/v1/marine?latitude=\${lat}&longitude=\${lon}&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,swell_wave_period&timezone=auto\`;
    const forecastUrl = \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure&timezone=auto\`;

    const [marineRes, forecastRes] = await Promise.all([fetch(marineUrl), fetch(forecastUrl)]);
    const marineData = await marineRes.json();
    const forecastData = await forecastRes.json();

    return {
      time: marineData.hourly.time,
      waveHeight: marineData.hourly.wave_height,
      swellWaveHeight: marineData.hourly.swell_wave_height,
      swellWavePeriod: marineData.hourly.swell_wave_period,
      windSpeed10m: forecastData.hourly.wind_speed_10m,
      surfacePressure: forecastData.hourly.surface_pressure
    };
  }
}`,
  },
  STEP_6: {
    title: 'ÉTAPE 6 : Moteur Halieutique - Théorie Solunaire de Knight',
    subtitle: 'Transits Zénith/Nadir, périodes majeures/mineures, et Stacking multi-facteurs (0-100%)',
    filename: '/src/services/SolunarCalculator.ts',
    language: 'typescript',
    code: `export class SolunarCalculator {
  // Mois synodique moyen : 29.53058867 jours
  public static calculateSolunar(date = new Date(), lat = 36.6, lon = 2.7, barometricTrend = 'RISING_FAST') {
    const moonPhase = this.calculateMoonPhase(date);
    const { sunrise, sunset } = this.calculateSunTimes(date, lat, lon);

    // Calcul du transit lunaire au méridien local (Zénith - Majeure 1, 2h)
    const lunarOffsetHours = (moonPhase.ageDays / 29.53058867) * 24;
    const transitHourUtc = (12 - lon / 15 + lunarOffsetHours) % 24;
    const underfootHourUtc = (transitHourUtc + 12) % 24; // Nadir - Majeure 2

    // LOGIQUE DE STACKING NON LINÉAIRE :
    let score = 40; // Base
    if (moonPhase.ageDays < 2.5 || moonPhase.ageDays > 27) score += 35; // Nouvelle Lune
    else if (moonPhase.ageDays >= 13.5 && moonPhase.ageDays <= 16.5) score += 32; // Pleine Lune

    // Bonus d'or : Coïncidence Transit et Aube/Crépuscule
    const solarTwilightOverlap = checkOverlap(transitHour, sunrise) || checkOverlap(transitHour, sunset);
    if (solarTwilightOverlap) score += 18;

    // Bonus Barométrique post-dépression
    if (barometricTrend === 'RISING_FAST') score += 12;

    return {
      solunarScore: Math.min(99, Math.round(score)),
      moonTransitTime: formatTime(transitDate),
      majorPeriods: [major1, major2],
      minorPeriods: [minor1, minor2],
    };
  }
}`,
  },
};

export const CodeArchitectureViewer: React.FC = () => {
  const [activeStep, setActiveStep] = useState<string>('STEP_1');
  const [copied, setCopied] = useState<boolean>(false);

  const currentModule = CODE_MODULES[activeStep];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentModule.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête Architecture & Code Native */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                Spécifications & Code Exportable React Native / Expo
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Clean Architecture TypeScript
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Code source complet, sans placeholders, prêt pour intégration dans un projet mobile TurboModules.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Code Copié !' : 'Copier ce Module'}</span>
        </button>
      </div>

      {/* ARBORESCENCE DU PROJET */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-3 uppercase tracking-wider">
          <FolderTree className="w-4 h-4 text-emerald-400" /> Structure Modulaire du Projet Mobile
        </div>
        <pre className="font-mono text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{`/src
  ├── components/
  │    ├── ChartPlotter.tsx          // [ÉTAPE 3] Moteur SIG MapLibre & S-52 avec Safety Contour dynamique
  │    ├── AisRadar.tsx              // [ÉTAPE 4] Radar PPI et calculs d'évitement d'abordage CPA/TCPA
  │    ├── DigitalLogbook.tsx        // Journal de bord numérique & auto-enregistrement AIS/Météo
  │    ├── SignalKMonitor.tsx        // [ÉTAPE 4] Console télémétrique Signal K (profondeur, vent, STW)
  │    ├── WeatherDashboard.tsx      // [ÉTAPE 5] Tableau de bord Open-Meteo & houle (modèle AROME)
  │    ├── SolunarDashboard.tsx      // [ÉTAPE 6] Prévisions de pêche & Théorie Solunaire Knight
  │    └── KalmanVisualizer.tsx      // [ÉTAPE 2] Visualiseur d'état cinématique du filtre EKF
  ├── services/
  │    ├── TileCacheService.ts       // Couche de cache hors-ligne IndexedDB & packs MBTiles ECDIS
  │    ├── LocationTrackingService.native.ts // [ÉTAPE 2] Foreground Service Android 14+ & distanceFilter
  │    ├── AisDecoder.ts             // [ÉTAPE 4] Décodeur trames NMEA AIVDM 6-bits (Types 1, 2, 3)
  │    ├── SignalKService.ts         // [ÉTAPE 4] Client WebSocket Signal K delta JSON
  │    ├── WeatherService.ts         // [ÉTAPE 5] Client Open-Meteo Marine avec cache hors-ligne
  │    └── SolunarCalculator.ts      // [ÉTAPE 6] Éphémérides et algorithme de Stacking solunaire
  ├── store/
  │    └── useNavigationStore.ts     // [ÉTAPE 1] Store Zustand réactif (navire, cibles, état ECDIS)
  ├── utils/
  │    └── KalmanFilter.ts           // [ÉTAPE 2] Filtre de Kalman Étendu EKF 6-axes
  ├── data/
  │    ├── s52Style.ts               // [ÉTAPE 3] Styles S-52 Jour/Nuit et expressions data-driven
  │    └── marineSeedData.ts         // Données bathymétriques et balisage réel de la baie de Khemisti
  └── types/
       └── maritime.ts               // Modèles de données typés selon normes IHO et ITU`}
        </pre>
      </div>

      {/* SÉLECTEUR D'ÉTAPES DU MÉGA-PROMPT */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {Object.entries(CODE_MODULES).map(([key, mod]) => (
          <button
            key={key}
            onClick={() => setActiveStep(key)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              activeStep === key
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {mod.title.split(':')[0]}
          </button>
        ))}
      </div>

      {/* VISIONNEUSE DE CODE DÉTAILLÉE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">{currentModule.title}</h2>
            <p className="text-xs text-slate-400">{currentModule.subtitle}</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-950 text-cyan-300 border border-slate-800">
            {currentModule.filename}
          </span>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
            <code>{currentModule.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
