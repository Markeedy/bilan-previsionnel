/**
 * Données hydrographiques S-57 et cibles AIS de démonstration
 * Zone maritime : Baie de Khemisti - Chenal et approches (Wilaya de Tipaza)
 */

import { AisTarget, S57Feature } from '../types/maritime';

export const BASE_HARBOR_COORDS = {
  latitude: 36.6042,
  longitude: 2.6945,
};

export const S57_FEATURES_SEED: S57Feature[] = [
  // Chenal d'accès et balisage latéral IALA Région A
  {
    id: 'boylat-01',
    type: 'BOYLAT',
    name: 'Bouée Bâbord Chenal Khemisti (N°2)',
    category: 'Port',
    color: ['#ef4444'],
    coordinates: [2.6932, 36.6078],
    lightCharacteristic: 'Fl(2) R 6s',
  },
  {
    id: 'boylat-02',
    type: 'BOYLAT',
    name: 'Bouée Tribord Chenal Khemisti (N°1)',
    category: 'Starboard',
    color: ['#10b981'],
    coordinates: [2.6975, 36.6072],
    lightCharacteristic: 'Fl(2) G 6s',
  },
  {
    id: 'boylat-03',
    type: 'BOYLAT',
    name: 'Bouée d’Atterrage Chenal Nord',
    category: 'Safe Water',
    color: ['#ef4444', '#ffffff'],
    coordinates: [2.6955, 36.6185],
    lightCharacteristic: 'Iso 4s',
  },
  {
    id: 'boyisd-01',
    type: 'BOYISD',
    name: 'Écueil des Pêcheurs (Danger Isolé)',
    category: 'Isolated Danger',
    color: ['#000000', '#ef4444'],
    coordinates: [2.6845, 36.6120],
    hazard: true,
    lightCharacteristic: 'Fl(2) 5s',
  },
  // Zone de Mouillage réglementée ACHARE
  {
    id: 'achare-01',
    type: 'ACHARE',
    name: 'Zone de Mouillage Forain - Rade de Khemisti',
    coordinates: [
      [2.7010, 36.6120],
      [2.7150, 36.6140],
      [2.7160, 36.6030],
      [2.7020, 36.6015],
    ],
  },
  // Feu d'entrée de digue (LIGHTS)
  {
    id: 'light-01',
    type: 'LIGHTS',
    name: 'Feu de Digue Principale (Vert)',
    category: 'Starboard',
    color: ['#10b981'],
    coordinates: [2.6952, 36.6048],
    lightCharacteristic: 'Fl G 3s 12m 7M',
  },
  {
    id: 'light-02',
    type: 'LIGHTS',
    name: 'Feu de Musoir Traverse (Rouge)',
    category: 'Port',
    color: ['#ef4444'],
    coordinates: [2.6938, 36.6042],
    lightCharacteristic: 'Fl R 3s 8m 5M',
  },
];

// Isobathes bathymétriques vectorielles (DEPCNT)
export interface DepthContourLine {
  depth: number;
  coordinates: [number, number][]; // [lon, lat]
}

export const DEPTH_CONTOURS_SEED: DepthContourLine[] = [
  {
    depth: 2,
    coordinates: [
      [2.6820, 36.6030],
      [2.6900, 36.6038],
      [2.6980, 36.6041],
      [2.7080, 36.6025],
      [2.7200, 36.6010],
    ],
  },
  {
    depth: 5,
    coordinates: [
      [2.6800, 36.6065],
      [2.6880, 36.6075],
      [2.6960, 36.6078],
      [2.7060, 36.6068],
      [2.7220, 36.6050],
    ],
  },
  {
    depth: 10,
    coordinates: [
      [2.6780, 36.6110],
      [2.6860, 36.6125],
      [2.6950, 36.6130],
      [2.7050, 36.6120],
      [2.7240, 36.6095],
    ],
  },
  {
    depth: 20,
    coordinates: [
      [2.6750, 36.6180],
      [2.6840, 36.6195],
      [2.6940, 36.6200],
      [2.7080, 36.6185],
      [2.7260, 36.6160],
    ],
  },
  {
    depth: 50,
    coordinates: [
      [2.6700, 36.6280],
      [2.6820, 36.6295],
      [2.6930, 36.6300],
      [2.7100, 36.6285],
      [2.7280, 36.6250],
    ],
  },
];

// Cibles AIS initiales en navigation active
export const INITIAL_AIS_TARGETS: AisTarget[] = [
  {
    mmsi: 227014280,
    vesselName: 'CHALOUPER KHEMISTI III',
    callSign: 'FA9841',
    shipType: 30, // Navire de pêche
    shipTypeLabel: 'Chalutier Côtier',
    position: { latitude: 36.6115, longitude: 2.6885 },
    sog: 4.8,
    cog: 72,
    navStatus: 7,
    navStatusLabel: 'En opération de pêche',
    length: 18,
    beam: 5.5,
    draft: 2.4,
    cpa: 0.42, // Alerte critique : CPA < 0.5 NM
    tcpa: 8.5,
    isDangerous: true,
    lastSeen: Date.now(),
  },
  {
    mmsi: 605118420,
    vesselName: 'TIPAZA EXPRESS',
    callSign: '7TA88',
    shipType: 60, // Navire à passagers / vedette
    shipTypeLabel: 'Navette Rapide',
    position: { latitude: 36.6210, longitude: 2.7090 },
    sog: 18.2,
    cog: 245,
    navStatus: 0,
    navStatusLabel: 'Fait route au moteur',
    length: 28,
    beam: 7.2,
    draft: 1.8,
    cpa: 1.15,
    tcpa: 14.2,
    isDangerous: false,
    lastSeen: Date.now(),
  },
  {
    mmsi: 244780190,
    vesselName: 'MED VOYAGER',
    callSign: 'PH2104',
    shipType: 70, // Cargo général
    shipTypeLabel: 'Cargo Porte-Conteneurs',
    position: { latitude: 36.6340, longitude: 2.6750 },
    sog: 12.6,
    cog: 110,
    navStatus: 0,
    navStatusLabel: 'Fait route au moteur',
    length: 142,
    beam: 22.0,
    draft: 6.8,
    cpa: 2.45,
    tcpa: 26.0,
    isDangerous: false,
    lastSeen: Date.now(),
  },
  {
    mmsi: 228991200,
    vesselName: 'PILOTE ALGER-OUEST',
    callSign: 'FN302',
    shipType: 50, // Vedette de pilotage
    shipTypeLabel: 'Vedette Pilotage Portuaire',
    position: { latitude: 36.6080, longitude: 2.7020 },
    sog: 1.2,
    cog: 320,
    navStatus: 5,
    navStatusLabel: 'Au mouillage d’attente',
    length: 15,
    beam: 4.8,
    draft: 1.4,
    cpa: 0.95,
    tcpa: 999,
    isDangerous: false,
    lastSeen: Date.now(),
  },
];
