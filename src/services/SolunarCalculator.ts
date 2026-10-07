/**
 * Moteur Mathématique de Prédictions Halieutiques - Théorie Solunaire de John Alden Knight
 * Calcul des transits lunaires (Zénith / Nadir), levers/couchers, et Stacking multi-facteurs.
 */

import { SolunarCalculationResult, SolunarPeriod } from '../types/maritime';

export class SolunarCalculator {
  // Mois synodique moyen en jours
  private static readonly SYNODIC_MONTH = 29.53058867;

  // Nouvelle Lune de référence connue (6 Janvier 2000, 18:14 UTC)
  private static readonly REF_NEW_MOON_2000 = new Date(Date.UTC(2000, 0, 6, 18, 14, 0)).getTime();

  /**
   * Calcul de l'âge de la lune en jours et du pourcentage d'illumination
   */
  public static calculateMoonPhase(date: Date): {
    ageDays: number;
    phaseIndex: number;
    phaseName: string;
    illumination: number;
  } {
    const diffMs = date.getTime() - this.REF_NEW_MOON_2000;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const ageDays = ((diffDays % this.SYNODIC_MONTH) + this.SYNODIC_MONTH) % this.SYNODIC_MONTH;

    // Illumination : 0% à la nouvelle lune, 100% à la pleine lune
    const illumination = Math.round(
      ((1 - Math.cos((ageDays / this.SYNODIC_MONTH) * 2 * Math.PI)) / 2) * 100
    );

    // 8 phases canoniques
    const phaseIndex = Math.floor((ageDays / this.SYNODIC_MONTH) * 8 + 0.5) % 8;
    const phaseNames = [
      'Nouvelle Lune (Gravité Max)',
      'Premier Croissant',
      'Premier Quartier',
      'Lune Gibbeuse Croissante',
      'Pleine Lune (Activité Pélagique Max)',
      'Lune Gibbeuse Décroissante',
      'Dernier Quartier',
      'Dernier Croissant',
    ];

    return {
      ageDays: Number(ageDays.toFixed(2)),
      phaseIndex,
      phaseName: phaseNames[phaseIndex],
      illumination,
    };
  }

  /**
   * Calcul approché des éphémérides du Soleil (Lever / Coucher)
   */
  public static calculateSunTimes(
    date: Date,
    lat: number,
    lon: number
  ): { sunrise: Date; sunset: Date } {
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
    );

    // Déclinaison solaire approximative
    const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
    const latRad = (lat * Math.PI) / 180;
    const decRad = (declination * Math.PI) / 180;

    // Angle horaire au lever/coucher
    let cosH = -Math.tan(latRad) * Math.tan(decRad);
    cosH = Math.max(-1, Math.min(1, cosH));
    const hourAngle = (Math.acos(cosH) * 180) / Math.PI;

    // Heure solaire moyenne en UTC (ajustée selon la longitude)
    const solarNoonUtc = 12 - lon / 15;
    const riseHours = solarNoonUtc - hourAngle / 15;
    const setHours = solarNoonUtc + hourAngle / 15;

    const baseYear = date.getFullYear();
    const baseMonth = date.getMonth();
    const baseDay = date.getDate();

    const riseDate = new Date(date);
    riseDate.setUTCHours(Math.floor(riseHours), Math.floor((riseHours % 1) * 60), 0);

    const setDate = new Date(date);
    setDate.setUTCHours(Math.floor(setHours), Math.floor((setHours % 1) * 60), 0);

    // Si conversion invalide, valeurs par défaut 06:30 et 19:30
    if (isNaN(riseDate.getTime())) {
      riseDate.setHours(6, 30, 0);
      setDate.setHours(19, 30, 0);
    }

    return { sunrise: riseDate, sunset: setDate };
  }

  /**
   * Calcul complet de la Théorie Solunaire avec Stacking Multi-Facteurs
   */
  public static calculateSolunar(
    date: Date = new Date(),
    lat: number = 36.6,
    lon: number = 2.7,
    barometricTrend: 'RISING_FAST' | 'STABLE' | 'FALLING' = 'RISING_FAST'
  ): SolunarCalculationResult {
    const moonPhase = this.calculateMoonPhase(date);
    const { sunrise, sunset } = this.calculateSunTimes(date, lat, lon);

    // Décalage du transit lunaire par rapport au midi solaire :
    // La lune prend ~50 minutes de retard chaque jour par rapport au soleil
    const lunarOffsetHours = (moonPhase.ageDays / this.SYNODIC_MONTH) * 24;

    // Zénith (Transit supérieur - la lune au plus haut)
    let transitHourUtc = (12 - lon / 15 + lunarOffsetHours) % 24;
    if (transitHourUtc < 0) transitHourUtc += 24;

    // Nadir (Anti-transit - la lune sous les pieds)
    let underfootHourUtc = (transitHourUtc + 12) % 24;

    // Lever et coucher de la lune (environ ±6 heures par rapport au zénith)
    let moonriseHourUtc = (transitHourUtc - 6 + 24) % 24;
    let moonsetHourUtc = (transitHourUtc + 6) % 24;

    const createDateFromUtcHours = (h: number): Date => {
      const d = new Date(date);
      const hours = Math.floor(h);
      const mins = Math.floor((h - hours) * 60);
      d.setHours(hours, mins, 0, 0);
      return d;
    };

    const transitDate = createDateFromUtcHours(transitHourUtc);
    const underfootDate = createDateFromUtcHours(underfootHourUtc);
    const moonriseDate = createDateFromUtcHours(moonriseHourUtc);
    const moonsetDate = createDateFromUtcHours(moonsetHourUtc);

    // Fenêtres des Périodes Majeures (2 heures : ±1h)
    const major1: SolunarPeriod = {
      type: 'MAJOR_1',
      name: 'Période Majeure (Zénith Lunaire)',
      start: new Date(transitDate.getTime() - 60 * 60 * 1000),
      end: new Date(transitDate.getTime() + 60 * 60 * 1000),
      intensity: 'VERY_HIGH',
      description: 'Attraction gravitationnelle maximale. Frénésie alimentaire des prédateurs marins.',
    };

    const major2: SolunarPeriod = {
      type: 'MAJOR_2',
      name: 'Période Majeure (Nadir / Sous les pieds)',
      start: new Date(underfootDate.getTime() - 60 * 60 * 1000),
      end: new Date(underfootDate.getTime() + 60 * 60 * 1000),
      intensity: 'VERY_HIGH',
      description: 'Alignement gravitationnel anti-podal. Pic d’activité biologique sur les tombants.',
    };

    // Fenêtres des Périodes Mineures (1 heure : ±30min)
    const minor1: SolunarPeriod = {
      type: 'MINOR_1',
      name: 'Période Mineure (Lever de Lune)',
      start: new Date(moonriseDate.getTime() - 30 * 60 * 1000),
      end: new Date(moonriseDate.getTime() + 30 * 60 * 1000),
      intensity: 'HIGH',
      description: 'Émergence de la lune à l’horizon. Mouvements verticaux des bancs de poissons.',
    };

    const minor2: SolunarPeriod = {
      type: 'MINOR_2',
      name: 'Période Mineure (Coucher de Lune)',
      start: new Date(moonsetDate.getTime() - 30 * 60 * 1000),
      end: new Date(moonsetDate.getTime() + 30 * 60 * 1000),
      intensity: 'HIGH',
      description: 'Disparition de la lune. Prédation active sur les bordures et récifs.',
    };

    // LOGIQUE DE STACKING (Empilement Multi-Facteurs John Alden Knight)
    let score = 40; // Base neutre

    // 1. Facteur Phase Lunaire (Nouvelle lune = jours 0-2 ou Pleine lune = jours 14-16)
    let moonFactor = 0;
    if (moonPhase.ageDays < 2.5 || moonPhase.ageDays > 27) {
      moonFactor = 35; // Nouvelle Lune
    } else if (moonPhase.ageDays >= 13.5 && moonPhase.ageDays <= 16.5) {
      moonFactor = 32; // Pleine Lune
    } else if (
      (moonPhase.ageDays >= 6.5 && moonPhase.ageDays <= 8.5) ||
      (moonPhase.ageDays >= 21.0 && moonPhase.ageDays <= 23.0)
    ) {
      moonFactor = 10; // Quartiers (mortes-eaux)
    } else {
      moonFactor = 20;
    }
    score += moonFactor;

    // 2. Facteur "Stacking d'or" (Coïncidence Transit/Lever de Lune avec Aube ou Crépuscule)
    const checkOverlap = (pStart: Date, pEnd: Date, targetTime: Date, toleranceMins = 75) => {
      const pMid = (pStart.getTime() + pEnd.getTime()) / 2;
      return Math.abs(pMid - targetTime.getTime()) <= toleranceMins * 60 * 1000;
    };

    const overlapSunrise =
      checkOverlap(major1.start, major1.end, sunrise) ||
      checkOverlap(major2.start, major2.end, sunrise) ||
      checkOverlap(minor1.start, minor1.end, sunrise) ||
      checkOverlap(minor2.start, minor2.end, sunrise);

    const overlapSunset =
      checkOverlap(major1.start, major1.end, sunset) ||
      checkOverlap(major2.start, major2.end, sunset) ||
      checkOverlap(minor1.start, minor1.end, sunset) ||
      checkOverlap(minor2.start, minor2.end, sunset);

    const solarTwilightCoincidence = overlapSunrise || overlapSunset;
    if (solarTwilightCoincidence) {
      // Bonus multiplicateur non linéaire Knight (+20 points)
      score = Math.min(100, score + 18);
    }

    // 3. Facteur Pression Barométrique
    let baroFactor = 0;
    if (barometricTrend === 'RISING_FAST') {
      baroFactor = 12; // Hausse rapide post-dépression : pic d'appétit
    } else if (barometricTrend === 'STABLE') {
      baroFactor = 5;
    } else {
      baroFactor = -15; // Chute brutale : poissons apathiques au fond
    }
    score += baroFactor;

    // Borner à 0-100%
    const finalScore = Math.max(15, Math.min(99, Math.round(score)));

    let rating: SolunarCalculationResult['rating'] = 'MOYEN';
    if (finalScore >= 85) rating = 'EXCELLENT';
    else if (finalScore >= 70) rating = 'TRÈS BON';
    else if (finalScore >= 55) rating = 'BON';
    else if (finalScore >= 40) rating = 'MOYEN';
    else rating = 'FAIBLE';

    // Courbe d'activité horaire (0h à 23h)
    const hourlyActivityCurve = [];
    for (let h = 0; h < 24; h++) {
      const slotDate = new Date(date);
      slotDate.setHours(h, 30, 0, 0);
      let hScore = finalScore * 0.35; // activité de fond
      let periodName: string | undefined = undefined;

      // Est-ce dans une période majeure ?
      if (slotDate >= major1.start && slotDate <= major1.end) {
        hScore = finalScore * 0.98;
        periodName = 'Majeure 1 (Zénith)';
      } else if (slotDate >= major2.start && slotDate <= major2.end) {
        hScore = finalScore * 0.95;
        periodName = 'Majeure 2 (Nadir)';
      } else if (slotDate >= minor1.start && slotDate <= minor1.end) {
        hScore = finalScore * 0.78;
        periodName = 'Mineure 1 (Lever)';
      } else if (slotDate >= minor2.start && slotDate <= minor2.end) {
        hScore = finalScore * 0.75;
        periodName = 'Mineure 2 (Coucher)';
      }

      // Bonus si lueur crépusculaire
      if (Math.abs(h - sunrise.getHours()) <= 1 || Math.abs(h - sunset.getHours()) <= 1) {
        hScore = Math.min(100, hScore * 1.25);
      }

      hourlyActivityCurve.push({
        hour: h,
        score: Math.round(hScore),
        periodName,
      });
    }

    const formatTime = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    return {
      date,
      moonPhaseName: moonPhase.phaseName,
      moonPhaseIndex: moonPhase.phaseIndex,
      moonIllumination: moonPhase.illumination,
      moonAgeDays: moonPhase.ageDays,
      moonTransitTime: formatTime(transitDate),
      moonUnderfootTime: formatTime(underfootDate),
      moonriseTime: formatTime(moonriseDate),
      moonsetTime: formatTime(moonsetDate),
      sunriseTime: formatTime(sunrise),
      sunsetTime: formatTime(sunset),
      majorPeriods: [major1, major2],
      minorPeriods: [minor1, minor2],
      solunarScore: finalScore,
      rating,
      stackingFactors: {
        moonPhaseFactor: moonFactor,
        solarTwilightCoincidence,
        barometricTrendFactor: baroFactor,
        tideFactor: moonPhase.illumination > 80 || moonPhase.illumination < 15 ? 90 : 50,
      },
      hourlyActivityCurve,
    };
  }
}
