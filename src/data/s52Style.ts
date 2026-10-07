/**
 * Spécification de Présentation Hydrographique IHO S-52 (ECDIS)
 * Tables de couleurs : Jour (CHMGD), Crépuscule (CHMGD-Dusk), Nuit (CHMGF)
 * Règles d'affichage pour objets S-57 (ACHARE, BOYLAT, DEPARE, DEPCNT)
 * Expressions de style dynamiques (Data-Driven Styling) pour l'isobathe de sécurité.
 */

export const S52_PALETTES = {
  DAY: {
    // Fond marin et bathymétrie (S-52 Day Colors)
    NODEP: '#b4d7eb', // Eau profonde (>10m)
    DEPIT: '#8ac4e8', // Eau intermédiaire (5m-10m)
    DEPMS: '#5eb0e2', // Eau moyenne (2m-5m)
    DEPVS: '#329cdc', // Haut-fond critique (0m-2m)
    LANDA: '#d8c29d', // Terre émergée (brun chaud)
    CSTLN: '#4a3b2c', // Trait de côte
    SAFETY_ALERT: '#dc2626', // Rouge vif d'alarme franchissement
    SAFETY_CONTOUR: '#b91c1c', // Isobathe de sécurité critique
    DEPCNT_NORMAL: '#1d4ed8', // Courbe bathymétrique normale
    ACHARE_FILL: 'rgba(14, 165, 233, 0.12)', // Zone de mouillage
    ACHARE_STROKE: '#0284c7',
    BOYLAT_PORT: '#ef4444', // Bâbord (rouge Région A IALA)
    BOYLAT_STBD: '#10b981', // Tribord (vert Région A IALA)
    BOY_CARDINAL: '#facc15', // Jaune cardinal
    CHMGD_LABEL: '#0f172a',
    VESSEL_HEADING: '#ef4444',
    BACKGROUND: '#99cae5',
  },
  DUSK: {
    NODEP: '#47697d',
    DEPIT: '#34556a',
    DEPMS: '#244558',
    DEPVS: '#153648',
    LANDA: '#5a4f3d',
    CSTLN: '#2b2319',
    SAFETY_ALERT: '#f87171',
    SAFETY_CONTOUR: '#ef4444',
    DEPCNT_NORMAL: '#38bdf8',
    ACHARE_FILL: 'rgba(56, 189, 248, 0.1)',
    ACHARE_STROKE: '#38bdf8',
    BOYLAT_PORT: '#f87171',
    BOYLAT_STBD: '#34d399',
    BOY_CARDINAL: '#fde047',
    CHMGD_LABEL: '#f1f5f9',
    VESSEL_HEADING: '#f87171',
    BACKGROUND: '#2c4352',
  },
  NIGHT: {
    // Norme ECDIS S-52 Night (rouge/noir atténué pour préserver la vision nocturne du veilleur)
    NODEP: '#081721',
    DEPIT: '#0c1f2d',
    DEPMS: '#102739',
    DEPVS: '#142f45',
    LANDA: '#1c1b18',
    CSTLN: '#423d33',
    SAFETY_ALERT: '#ef4444',
    SAFETY_CONTOUR: '#f87171',
    DEPCNT_NORMAL: '#0284c7',
    ACHARE_FILL: 'rgba(2, 132, 199, 0.08)',
    ACHARE_STROKE: '#0284c7',
    BOYLAT_PORT: '#dc2626',
    BOYLAT_STBD: '#059669',
    BOY_CARDINAL: '#ca8a04',
    CHMGD_LABEL: '#94a3b8',
    VESSEL_HEADING: '#ef4444',
    BACKGROUND: '#050f16',
  },
};

/**
 * Générateur de style JSON complet MapLibre conforme IHO S-52
 * avec expressions MapLibre pour isobathe de sécurité dynamique
 */
export function generateS52MapLibreStyle(paletteMode: 'DAY' | 'DUSK' | 'NIGHT', safetyDepthThreshold: number) {
  const p = S52_PALETTES[paletteMode];

  return {
    version: 8,
    name: `S-52 ECDIS Navigational Chart (${paletteMode})`,
    sources: {
      'hydro-vector-source': {
        type: 'vector',
        // Dans une application mobile native, pointerait vers 'mbtiles://charts.mbtiles'
        tiles: ['https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 18,
      },
      'emodnet-bathymetry-dem': {
        type: 'raster-dem',
        // DTM EMODnet / GEBCO encodé en format Terrarium
        encoding: 'terrarium',
        tileSize: 256,
      },
    },
    layers: [
      {
        id: 'background-water',
        type: 'background',
        paint: {
          'background-color': p.BACKGROUND,
        },
      },
      // Couche DEPARE : Surfaces de profondeur
      {
        id: 's57-depare-fills',
        type: 'fill',
        source: 'hydro-vector-source',
        'source-layer': 'DEPARE',
        paint: {
          'fill-color': [
            'step',
            ['get', 'DRVAL1'], // Profondeur minimale de la zone
            p.DEPVS, // 0 - 2m (très dangereux)
            2.0, p.DEPMS, // 2 - 5m
            5.0, p.DEPIT, // 5 - 10m
            10.0, p.NODEP, // > 10m (eau sûre)
          ],
          'fill-opacity': 0.85,
        },
      },
      // Couche ACHARE : Zones de mouillage (Anchorage Areas)
      {
        id: 's57-achare-fill',
        type: 'fill',
        source: 'hydro-vector-source',
        'source-layer': 'ACHARE',
        paint: {
          'fill-color': p.ACHARE_FILL,
        },
      },
      {
        id: 's57-achare-line',
        type: 'line',
        source: 'hydro-vector-source',
        'source-layer': 'ACHARE',
        paint: {
          'line-color': p.ACHARE_STROKE,
          'line-width': 1.8,
          'line-dasharray': [4, 3],
        },
      },
      // Couche DEPCNT : Lignes bathymétriques et Isobathe de Sécurité Dynamique
      {
        id: 's57-depcnt-lines',
        type: 'line',
        source: 'hydro-vector-source',
        'source-layer': 'DEPCNT',
        paint: {
          // EXPRESSION S-52 DYNAMIQUE : Mettre en surbrillance rouge la ligne correspondant au tirant d'eau
          'line-color': [
            'case',
            ['<=', ['get', 'VALDCO'], safetyDepthThreshold],
            p.SAFETY_CONTOUR, // Rouge d'alerte pour isobathe de sécurité
            p.DEPCNT_NORMAL, // Bleu normal
          ],
          'line-width': [
            'case',
            ['<=', ['get', 'VALDCO'], safetyDepthThreshold],
            2.8, // Trait épais 0.6mm S-52
            1.2, // Trait standard 0.3mm S-52
          ],
        },
      },
      // Couche BOYLAT : Balises latérales et cardinales
      {
        id: 's57-boylat-symbols',
        type: 'circle',
        source: 'hydro-vector-source',
        'source-layer': 'BOYLAT',
        paint: {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'COLOUR'],
            '3', p.BOYLAT_PORT, // Rouge bâbord (code 3 S-57)
            '4', p.BOYLAT_STBD, // Vert tribord (code 4 S-57)
            p.BOY_CARDINAL,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#000000',
        },
      },
    ],
  };
}
