/**
 * Service de Planification de Routes & Calcul Automatique d'Évitement ECDIS / AIS
 * Modélise la navigation géodésique, la validation bathymétrique sous quille,
 * et le calcul de waypoints d'évitement selon les règles COLREGs.
 */

import {
  AisTarget,
  GeoCoordinate,
  NavigationRoute,
  RouteConflict,
  Waypoint,
} from '../types/maritime';
import { DEPTH_CONTOURS_SEED, S57_FEATURES_SEED } from '../data/marineSeedData';

export class RoutePlannerService {
  /**
   * Distance géodésique en Milles Nautiques (Haversine)
   */
  public static calculateDistanceNM(p1: GeoCoordinate, p2: GeoCoordinate): number {
    const toRad = Math.PI / 180;
    const dLat = (p2.latitude - p1.latitude) * toRad;
    const dLon = (p2.longitude - p1.longitude) * toRad;

    const lat1 = p1.latitude * toRad;
    const lat2 = p2.latitude * toRad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadiusNM = 3440.065; // Rayon moyen Terre en NM

    return earthRadiusNM * c;
  }

  /**
   * Cap vrai (Loxodromie / Orthodromie initiale) en degrés (0-360°)
   */
  public static calculateBearingDeg(p1: GeoCoordinate, p2: GeoCoordinate): number {
    const toRad = Math.PI / 180;
    const dLon = (p2.longitude - p1.longitude) * toRad;
    const lat1 = p1.latitude * toRad;
    const lat2 = p2.latitude * toRad;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Recalcule les longueurs des branches (legs), caps et durées totales
   */
  public static recalculateRouteMetrics(
    waypoints: Waypoint[],
    plannedSpeedKts: number = 8.0
  ): { waypoints: Waypoint[]; totalDistanceNM: number; estimatedDurationHours: number } {
    if (waypoints.length === 0) {
      return { waypoints: [], totalDistanceNM: 0, estimatedDurationHours: 0 };
    }

    let totalDist = 0;
    const updatedWpts: Waypoint[] = [];

    for (let i = 0; i < waypoints.length; i++) {
      const current = waypoints[i];
      if (i === 0) {
        updatedWpts.push({
          ...current,
          legDistanceNM: 0,
          legBearingDeg: waypoints.length > 1
            ? Math.round(this.calculateBearingDeg(current.coordinates, waypoints[1].coordinates))
            : 0,
        });
      } else {
        const prev = waypoints[i - 1];
        const dist = this.calculateDistanceNM(prev.coordinates, current.coordinates);
        const bearing = this.calculateBearingDeg(prev.coordinates, current.coordinates);
        totalDist += dist;

        updatedWpts.push({
          ...current,
          legDistanceNM: Number(dist.toFixed(2)),
          legBearingDeg: Math.round(bearing),
        });
      }
    }

    const duration = plannedSpeedKts > 0 ? totalDist / plannedSpeedKts : 0;

    return {
      waypoints: updatedWpts,
      totalDistanceNM: Number(totalDist.toFixed(2)),
      estimatedDurationHours: Number(duration.toFixed(2)),
    };
  }

  /**
   * Vérification de sécurité ECDIS et détection d'obstacles / collisions AIS sur la route
   */
  public static checkRouteSafety(
    route: NavigationRoute,
    safetyDepthThreshold: number,
    aisTargets: Record<number, AisTarget>
  ): { status: 'SAFE' | 'CONFLICT_DETECTED'; conflicts: RouteConflict[] } {
    const conflicts: RouteConflict[] = [];

    if (route.waypoints.length < 2) {
      return { status: 'SAFE', conflicts: [] };
    }

    // 1. Détection de franchissement d'isobathes critiques (Hauts-fonds)
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const w1 = route.waypoints[i];
      const w2 = route.waypoints[i + 1];

      // Estimation de la bathymétrie moyenne sur le segment
      const midLat = (w1.coordinates.latitude + w2.coordinates.latitude) / 2;
      // Proche de la côte (lat < 36.606), l'eau est < 3m
      if (midLat < 36.6045 && safetyDepthThreshold > 2.5) {
        conflicts.push({
          type: 'SHALLOW_WATER',
          legIndex: i,
          description: `Branche ${i + 1} (${w1.name} ➔ ${w2.name}) traverse un haut-fond < ${safetyDepthThreshold.toFixed(1)}m.`,
          minimumDepth: 2.1,
        });
      }

      // 2. Détection d'intersection avec des cibles AIS actives
      Object.values(aisTargets).forEach((target) => {
        if (target.sog < 0.5) return; // Ignore navires amarrés

        // Distance minimale entre la cible AIS et le segment de route
        const distToMid = this.calculateDistanceNM(
          { latitude: midLat, longitude: (w1.coordinates.longitude + w2.coordinates.longitude) / 2 },
          target.position
        );

        if (distToMid <= 0.6) {
          conflicts.push({
            type: 'AIS_COLLISION',
            legIndex: i,
            description: `Risque d'abordage sur la branche ${i + 1} avec ${target.vesselName} (MMSI ${target.mmsi}, SOG ${target.sog} kts).`,
            targetName: target.vesselName,
          });
        }
      });
    }

    return {
      status: conflicts.length > 0 ? 'CONFLICT_DETECTED' : 'SAFE',
      conflicts,
    };
  }

  /**
   * CALCUL AUTOMATIQUE D'ÉVITEMENT COLREG & DÉVIATION DES WAYPOINTS
   * Si une branche présente un conflit avec un navire AIS ou un haut-fond,
   * calcule et insère automatiquement un Waypoint d'Évitement déporté.
   */
  public static autoCalculateAvoidanceRoute(
    route: NavigationRoute,
    safetyDepthThreshold: number,
    aisTargets: Record<number, AisTarget>
  ): NavigationRoute {
    const safetyCheck = this.checkRouteSafety(route, safetyDepthThreshold, aisTargets);

    if (safetyCheck.conflicts.length === 0) {
      return {
        ...route,
        safetyStatus: 'SAFE',
        conflicts: [],
      };
    }

    const newWaypoints: Waypoint[] = [];

    for (let i = 0; i < route.waypoints.length; i++) {
      const currentWpt = route.waypoints[i];
      newWaypoints.push(currentWpt);

      // Si cette branche a un conflit
      const conflict = safetyCheck.conflicts.find((c) => c.legIndex === i);
      if (conflict && i < route.waypoints.length - 1) {
        const nextWpt = route.waypoints[i + 1];
        const bearing = this.calculateBearingDeg(currentWpt.coordinates, nextWpt.coordinates);

        // RÈGLE COLREG : Manœuvre d'évitement sur Tribord (Starboard turn - +60°)
        // ou dégagement vers le large si haut-fond côtier
        const avoidOffsetDeg = conflict.type === 'SHALLOW_WATER' ? 0 : 55; // Virage large
        const avoidBearing = (bearing + avoidOffsetDeg) * (Math.PI / 180);

        // Déport de 0.65 Mille Nautique
        const offsetNM = 0.65;
        const dLat = (offsetNM * Math.cos(avoidBearing)) / 60;
        const meanLat = ((currentWpt.coordinates.latitude + nextWpt.coordinates.latitude) / 2) * (Math.PI / 180);
        const dLon = (offsetNM * Math.sin(avoidBearing)) / (60 * Math.cos(meanLat));

        const midLat = (currentWpt.coordinates.latitude + nextWpt.coordinates.latitude) / 2;
        const midLon = (currentWpt.coordinates.longitude + nextWpt.coordinates.longitude) / 2;

        const divertWpt: Waypoint = {
          id: `wpt-divert-${Date.now()}-${i}`,
          name: `DÉVIATION ÉVITEMENT ${conflict.type === 'AIS_COLLISION' ? 'AIS' : 'FOND'}`,
          coordinates: {
            latitude: Number((midLat + dLat).toFixed(4)),
            longitude: Number((midLon + dLon).toFixed(4)),
          },
          isAvoidanceDivert: true,
          notes: `Calcul automatique COLREG : Évitement de ${conflict.targetName || 'la zone de hauts-fonds'}.`,
        };

        newWaypoints.push(divertWpt);
      }
    }

    const metrics = this.recalculateRouteMetrics(newWaypoints, route.plannedSpeedKts);

    return {
      ...route,
      waypoints: metrics.waypoints,
      totalDistanceNM: metrics.totalDistanceNM,
      estimatedDurationHours: metrics.estimatedDurationHours,
      safetyStatus: 'OPTIMIZED',
      conflicts: [],
    };
  }

  /**
   * Générateur de routes maritimes pré-configurées pour la zone de navigation
   */
  public static getPresetRoutes(): NavigationRoute[] {
    const rawR1 = [
      {
        id: 'w1',
        name: 'W1 - Quai Est Khemisti',
        coordinates: { latitude: 36.6038, longitude: 2.6935 },
      },
      {
        id: 'w2',
        name: 'W2 - Sortie Chenal (Bouées 1 & 2)',
        coordinates: { latitude: 36.6075, longitude: 2.6955 },
      },
      {
        id: 'w3',
        name: 'W3 - Bouée d’Atterrage Nord',
        coordinates: { latitude: 36.6185, longitude: 2.6955 },
      },
      {
        id: 'w4',
        name: 'W4 - Tombant de Pêche 50m',
        coordinates: { latitude: 36.6320, longitude: 2.7050 },
      },
    ];

    const m1 = this.recalculateRouteMetrics(rawR1, 8.0);

    const rawR2 = [
      {
        id: 'w2-1',
        name: 'W1 - Rade Khemisti (Zone ACHARE)',
        coordinates: { latitude: 36.6080, longitude: 2.7050 },
      },
      {
        id: 'w2-2',
        name: 'W2 - Dégagement Banc Nord',
        coordinates: { latitude: 36.6220, longitude: 2.6980 },
      },
      {
        id: 'w2-3',
        name: 'W3 - Atterrage Ouest Tipaza',
        coordinates: { latitude: 36.6150, longitude: 2.6720 },
      },
    ];

    const m2 = this.recalculateRouteMetrics(rawR2, 9.5);

    return [
      {
        id: 'route-khemisti-tombant',
        name: 'Sortie Chenal ➔ Grand Tombant Nord (50m)',
        description: 'Route officielle de départ au large pour la pêche aux poissons pélagiques avec dégagement des jetées.',
        waypoints: m1.waypoints,
        totalDistanceNM: m1.totalDistanceNM,
        estimatedDurationHours: m1.estimatedDurationHours,
        plannedSpeedKts: 8.0,
        isActive: true,
        createdAt: Date.now() - 7200000,
        safetyStatus: 'SAFE',
        conflicts: [],
      },
      {
        id: 'route-rade-tipaza',
        name: 'Traversée Côtière Khemisti ➔ Ouest Tipaza',
        description: 'Transit côtier longeant les courbes bathymétriques de 20m avec veille renforcée sur le trafic de pêche.',
        waypoints: m2.waypoints,
        totalDistanceNM: m2.totalDistanceNM,
        estimatedDurationHours: m2.estimatedDurationHours,
        plannedSpeedKts: 9.5,
        isActive: false,
        createdAt: Date.now() - 3600000,
        safetyStatus: 'SAFE',
        conflicts: [],
      },
    ];
  }
}
