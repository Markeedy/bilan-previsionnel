/**
 * Service de Cache Hors-Ligne pour Tuiles Cartographiques ECDIS (MBTiles / Vector & Raster)
 * Utilise IndexedDB pour un stockage haute performance persistant hors-ligne
 * Permet le pré-téléchargement par zones de navigation et le basculement transparent déconnecté.
 */

export interface CachedTileRecord {
  tileKey: string; // ex: 's57/14/8314/6120'
  regionId: string;
  z: number;
  x: number;
  y: number;
  data: string | ArrayBuffer; // Données géométriques vectorielles GeoJSON / PBF ou DataURL
  mimeType: string;
  byteSize: number;
  timestamp: number;
}

export interface NavigationRegionPack {
  id: string;
  name: string;
  description: string;
  center: { latitude: number; longitude: number };
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  tileCount: number;
  approxSizeMb: number;
  isDownloaded: boolean;
}

export class TileCacheService {
  private static readonly DB_NAME = 'naviseas_ecdis_offline_db';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_TILES = 'tiles';
  private static readonly STORE_REGIONS = 'regions';

  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static memoryCache: Map<string, CachedTileRecord> = new Map();

  /**
   * Initialisation de la base de données IndexedDB
   */
  private static getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB non supporté dans cet environnement'));
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_TILES)) {
          const tileStore = db.createObjectStore(this.STORE_TILES, { keyPath: 'tileKey' });
          tileStore.createIndex('regionId', 'regionId', { unique: false });
          tileStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(this.STORE_REGIONS)) {
          db.createObjectStore(this.STORE_REGIONS, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Enregistrement d'une tuile dans le cache IndexedDB
   */
  public static async putTile(
    tileKey: string,
    regionId: string,
    z: number,
    x: number,
    y: number,
    data: string | ArrayBuffer,
    mimeType: string = 'application/json'
  ): Promise<void> {
    const byteSize = typeof data === 'string' ? data.length : data.byteLength;
    const record: CachedTileRecord = {
      tileKey,
      regionId,
      z,
      x,
      y,
      data,
      mimeType,
      byteSize,
      timestamp: Date.now(),
    };

    // Cache mémoire rapide
    this.memoryCache.set(tileKey, record);

    try {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_TILES, 'readwrite');
        const store = tx.objectStore(this.STORE_TILES);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignorer l'erreur d'écriture si quota plein
    }
  }

  /**
   * Récupération d'une tuile depuis le cache local
   */
  public static async getTile(tileKey: string): Promise<CachedTileRecord | null> {
    // 1. Vérifier le cache mémoire en premier
    if (this.memoryCache.has(tileKey)) {
      return this.memoryCache.get(tileKey)!;
    }

    // 2. Vérifier IndexedDB
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_TILES, 'readonly');
        const store = tx.objectStore(this.STORE_TILES);
        const req = store.get(tileKey);
        req.onsuccess = () => {
          const res = req.result as CachedTileRecord | undefined;
          if (res) {
            this.memoryCache.set(tileKey, res);
            resolve(res);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Calcul du nombre total de tuiles et du volume de stockage utilisé
   */
  public static async getCacheStats(): Promise<{ count: number; totalSizeBytes: number }> {
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_TILES, 'readonly');
        const store = tx.objectStore(this.STORE_TILES);
        const req = store.getAll();
        req.onsuccess = () => {
          const records = (req.result || []) as CachedTileRecord[];
          const totalSizeBytes = records.reduce((acc, r) => acc + (r.byteSize || 0), 0);
          resolve({ count: records.length, totalSizeBytes });
        };
        req.onerror = () => resolve({ count: 0, totalSizeBytes: 0 });
      });
    } catch {
      return { count: 0, totalSizeBytes: 0 };
    }
  }

  /**
   * Effacement complet du cache des tuiles
   */
  public static async clearCache(): Promise<void> {
    this.memoryCache.clear();
    try {
      const db = await this.getDb();
      return new Promise((resolve) => {
        const tx = db.transaction(this.STORE_TILES, 'readwrite');
        const store = tx.objectStore(this.STORE_TILES);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }

  /**
   * Liste des packs cartographiques régionaux disponibles pour téléchargement prédictif
   */
  public static getPredefinedRegionPacks(): NavigationRegionPack[] {
    return [
      {
        id: 'pack-khemisti-harbor',
        name: 'Baie de Khemisti & Port (Wilaya de Tipaza)',
        description: 'Bordereau hydrographique complet S-57 : chenal, digues, hauts-fonds et zone de mouillage ACHARE.',
        center: { latitude: 36.6042, longitude: 2.6945 },
        bounds: { minLat: 36.595, maxLat: 36.635, minLon: 2.670, maxLon: 2.730 },
        tileCount: 64,
        approxSizeMb: 4.8,
        isDownloaded: true, // Pré-embarqué par défaut
      },
      {
        id: 'pack-tipaza-cherchell',
        name: 'Zone Côtière Tipaza - Mont Chenoua',
        description: 'Couverture bathymétrique haute résolution EMODnet (courbes 2m à 100m) et zones rocheuses.',
        center: { latitude: 36.5900, longitude: 2.4500 },
        bounds: { minLat: 36.550, maxLat: 36.640, minLon: 2.380, maxLon: 2.580 },
        tileCount: 128,
        approxSizeMb: 9.6,
        isDownloaded: false,
      },
      {
        id: 'pack-alger-west-approaches',
        name: 'Approches Ouest d’Alger (Sidi Fredj / Zéralda)',
        description: 'Balisage lumineux, rails de séparation du trafic et plateau continental de pêche pélagique.',
        center: { latitude: 36.7550, longitude: 2.8450 },
        bounds: { minLat: 36.700, maxLat: 36.810, minLon: 2.780, maxLon: 2.920 },
        tileCount: 96,
        approxSizeMb: 7.2,
        isDownloaded: false,
      },
    ];
  }

  /**
   * Téléchargement et mise en cache d'une région complète pour utilisation hors-ligne
   */
  public static async downloadRegionPack(
    region: NavigationRegionPack,
    onProgress: (percent: number, currentTile: number, total: number) => void
  ): Promise<void> {
    const totalTiles = region.tileCount;

    // Simulation de génération / téléchargement et écriture locale dans IndexedDB
    for (let i = 1; i <= totalTiles; i++) {
      const z = 14;
      const x = 8310 + (i % 8);
      const y = 6120 + Math.floor(i / 8);
      const tileKey = `${region.id}/${z}/${x}/${y}`;

      // Générer une charge de données vectorielles hydrographiques simulée
      const mockTileData = JSON.stringify({
        type: 'FeatureCollection',
        region: region.id,
        z,
        x,
        y,
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [region.center.longitude, region.center.latitude] },
            properties: { S57_OBJ: 'DEPCNT', VALDCO: 5.0 },
          },
        ],
      });

      await this.putTile(tileKey, region.id, z, x, y, mockTileData, 'application/json');

      const percent = Math.round((i / totalTiles) * 100);
      onProgress(percent, i, totalTiles);

      // Petit délai pour fluidité d'animation UI
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}
