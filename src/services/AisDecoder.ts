/**
 * Module de Décodage AIS AIVDM/AIVDO (Norme ITU-R M.1371)
 * Désarmement de la charge utile ASCII 6-bits, parsing des messages Types 1, 2, 3
 * Calcul géodésique de CPA (Closest Point of Approach) et TCPA (Time to CPA).
 */

import { AisTarget, GeoCoordinate } from '../types/maritime';

export class AisDecoder {
  /**
   * Désarmement d'un caractère ASCII 6-bits AIS vers un entier [0..63]
   * Règle ITU : val = ascii - 48; if (val > 40) val -= 8;
   */
  public static decodeCharTo6Bit(char: string): number {
    let ascii = char.charCodeAt(0);
    let val = ascii - 48;
    if (val > 40) {
      val -= 8;
    }
    if (val < 0 || val > 63) {
      return 0;
    }
    return val;
  }

  /**
   * Conversion d'une charge utile ASCII blindée (payload) en un flux binaire complet
   */
  public static payloadToBitString(payload: string): string {
    let bits = '';
    for (let i = 0; i < payload.length; i++) {
      const val = this.decodeCharTo6Bit(payload[i]);
      bits += val.toString(2).padStart(6, '0');
    }
    return bits;
  }

  /**
   * Extraction d'un entier non-signé depuis un vecteur binaire
   */
  private static extractUnsignedInt(bits: string, start: number, length: number): number {
    const slice = bits.substring(start, start + length);
    if (!slice) return 0;
    return parseInt(slice, 2);
  }

  /**
   * Extraction d'un entier signé en complément à 2 depuis un vecteur binaire
   */
  private static extractSignedInt(bits: string, start: number, length: number): number {
    const slice = bits.substring(start, start + length);
    if (!slice) return 0;
    if (slice[0] === '1') {
      // Nombre négatif en complément à 2
      const inverted = slice
        .split('')
        .map((b) => (b === '1' ? '0' : '1'))
        .join('');
      return -(parseInt(inverted, 2) + 1);
    }
    return parseInt(slice, 2);
  }

  /**
   * Décodage d'une trame complète NMEA AIVDM / AIVDO
   * Exemple : !AIVDM,1,1,,A,13aEO:0P00Or22hK>2a<0?wN00Sa,0*18
   */
  public static parseAivdmSentence(sentence: string): Partial<AisTarget> | null {
    const trimmed = sentence.trim();
    if (!trimmed.startsWith('!AIVDM') && !trimmed.startsWith('!AIVDO')) {
      return null;
    }

    const parts = trimmed.split(',');
    if (parts.length < 6) return null;

    const payload = parts[5];
    if (!payload) return null;

    const bitString = this.payloadToBitString(payload);
    if (bitString.length < 128) return null;

    const messageType = this.extractUnsignedInt(bitString, 0, 6);

    // Messages Types 1, 2, 3 (Position Report Class A)
    if (messageType === 1 || messageType === 2 || messageType === 3) {
      const mmsi = this.extractUnsignedInt(bitString, 8, 30);
      const navStatus = this.extractUnsignedInt(bitString, 38, 4);
      const rawSog = this.extractUnsignedInt(bitString, 46, 10);
      const sog = rawSog === 1023 ? 0 : rawSog / 10.0; // dixièmes de nœuds

      const rawLon = this.extractSignedInt(bitString, 57, 28);
      const longitude = rawLon / 600000.0;

      const rawLat = this.extractSignedInt(bitString, 85, 27);
      const latitude = rawLat / 600000.0;

      const rawCog = this.extractUnsignedInt(bitString, 112, 12);
      const cog = rawCog === 3600 ? 0 : rawCog / 10.0; // dixièmes de degrés

      const trueHeading = this.extractUnsignedInt(bitString, 124, 9);

      const navStatusLabels: Record<number, string> = {
        0: 'Fait route au moteur',
        1: 'Au mouillage',
        2: 'Non maître de sa manœuvre',
        3: 'Capacité de manœuvre restreinte',
        4: 'Contraint par son tirant d’eau',
        5: 'Amarré / À quai',
        6: 'Échoué',
        7: 'En pêche',
        8: 'Fait route à la voile',
      };

      return {
        mmsi,
        navStatus,
        navStatusLabel: navStatusLabels[navStatus] || 'En route',
        sog,
        cog,
        position: { latitude, longitude },
        trueHeading: trueHeading === 511 ? undefined : trueHeading,
        shipType: 70, // Cargo standard par défaut
        shipTypeLabel: 'Navire de commerce',
        vesselName: `MMSI-${mmsi}`,
        lastSeen: Date.now(),
      };
    }

    return null;
  }

  /**
   * Calcul géodésique de CPA (Closest Point of Approach) et TCPA (Time to CPA)
   * Approche cinématique à coordonnées planes locales
   */
  public static calculateCpaTcpa(
    ownPos: GeoCoordinate,
    ownSogKts: number,
    ownCogDeg: number,
    targetPos: GeoCoordinate,
    targetSogKts: number,
    targetCogDeg: number
  ): { cpaNM: number; tcpaMinutes: number; isDangerous: boolean } {
    // 1 nœud = 1 Mille Nautique / heure
    const toRad = Math.PI / 180;

    // Vecteur vitesse de son propre navire (en NM/h, axe X=Est, Y=Nord)
    const ownVx = ownSogKts * Math.sin(ownCogDeg * toRad);
    const ownVy = ownSogKts * Math.cos(ownCogDeg * toRad);

    // Vecteur vitesse de la cible
    const targetVx = targetSogKts * Math.sin(targetCogDeg * toRad);
    const targetVy = targetSogKts * Math.cos(targetCogDeg * toRad);

    // Vitesse relative (Target - Own)
    const relVx = targetVx - ownVx;
    const relVy = targetVy - ownVy;

    // Distance relative actuelle en Milles Nautiques
    const dLat = (targetPos.latitude - ownPos.latitude) * 60; // 1° latitude = 60 NM
    const meanLat = ((ownPos.latitude + targetPos.latitude) / 2) * toRad;
    const dLon = (targetPos.longitude - ownPos.longitude) * 60 * Math.cos(meanLat);

    const relDist = Math.sqrt(dLat * dLat + dLon * dLon);

    // Vitesse relative scalaire au carré
    const relV2 = relVx * relVx + relVy * relVy;

    // Si les deux navires ont une vitesse relative quasi nulle
    if (relV2 < 0.001) {
      return {
        cpaNM: Number(relDist.toFixed(2)),
        tcpaMinutes: 999,
        isDangerous: false,
      };
    }

    // Temps jusqu'au CPA : t = - (R . V_rel) / |V_rel|^2
    // R = [dLon, dLat], V_rel = [relVx, relVy]
    const tcpaHours = -(dLon * relVx + dLat * relVy) / relV2;
    const tcpaMinutes = tcpaHours * 60;

    let cpaNM = relDist;
    if (tcpaHours > 0) {
      // Position au CPA
      const cpaX = dLon + relVx * tcpaHours;
      const cpaY = dLat + relVy * tcpaHours;
      cpaNM = Math.sqrt(cpaX * cpaX + cpaY * cpaY);
    } else {
      // Les navires s'éloignent déjà
      cpaNM = relDist;
    }

    // Alerte collision : CPA < 0.8 NM et TCPA entre 0 et 20 minutes
    const isDangerous = tcpaMinutes > 0 && tcpaMinutes <= 20 && cpaNM <= 0.8;

    return {
      cpaNM: Number(Math.max(0, cpaNM).toFixed(2)),
      tcpaMinutes: Number(tcpaMinutes.toFixed(1)),
      isDangerous,
    };
  }
}
