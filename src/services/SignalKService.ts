/**
 * Service de Connectivité Signal K (WebSocket & Schéma JSON Delta)
 * Se connecte au serveur Signal K local (ex: Victron Cerbo GX, Raspberry Pi Marine)
 * Parse les deltas de profondeur, vent, compas et vitesse surface.
 */

import { SignalKDelta } from '../types/maritime';

export type SignalKUpdateCallback = (path: string, value: any, timestamp: string) => void;

export class SignalKService {
  private socket: WebSocket | null = null;
  private serverUrl: string = 'ws://localhost:3000/signalk/v1/stream';
  private isConnected: boolean = false;
  private reconnectInterval: any = null;
  private listeners: Set<SignalKUpdateCallback> = new Set();
  private mockInterval: any = null;

  constructor(serverUrl?: string) {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }
  }

  public subscribe(cb: SignalKUpdateCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public connect(url?: string): void {
    if (url) this.serverUrl = url;

    try {
      this.socket = new WebSocket(this.serverUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        // Inscription aux flux critiques via abonnement Signal K
        const subMsg = {
          context: 'vessels.self',
          subscribe: [
            { path: 'environment.depth.*', period: 500 },
            { path: 'navigation.*', period: 500 },
            { path: 'environment.wind.*', period: 1000 },
          ],
        };
        this.socket?.send(JSON.stringify(subMsg));
      };

      this.socket.onmessage = (event) => {
        try {
          const delta: SignalKDelta = JSON.parse(event.data);
          this.handleDelta(delta);
        } catch {
          // Trame non JSON ou heartbeat
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
      };

      this.socket.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.isConnected = false;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  public parseDeltaPayload(rawJson: string): void {
    try {
      const delta: SignalKDelta = JSON.parse(rawJson);
      this.handleDelta(delta);
    } catch (e) {
      console.error('Erreur parsing Signal K Delta', e);
    }
  }

  private handleDelta(delta: SignalKDelta): void {
    if (!delta.updates) return;

    for (const update of delta.updates) {
      const timestamp = update.timestamp || new Date().toISOString();
      for (const valObj of update.values) {
        for (const listener of this.listeners) {
          listener(valObj.path, valObj.value, timestamp);
        }
      }
    }
  }

  /**
   * Simulateur de télémétrie Signal K locale (pour démonstrations nautiques et tests hors-ligne)
   */
  public startSimulator(
    onUpdate: (data: {
      depthBelowKeel: number;
      speedThroughWater: number;
      apparentWindSpeed: number;
      apparentWindAngle: number;
      waterTemperature: number;
    }) => void
  ): void {
    if (this.mockInterval) return;

    let baseDepth = 8.5; // mètres
    let baseStw = 6.2; // nœuds
    let baseWindSpeed = 14.0; // nœuds
    let baseWindAngle = 45; // degrés

    this.mockInterval = setInterval(() => {
      // Fluctuations dynamiques naturelles de l'océan
      const depthNoise = (Math.random() - 0.5) * 0.4;
      baseDepth = Math.max(1.8, Math.min(35.0, baseDepth + depthNoise));

      const stwNoise = (Math.random() - 0.5) * 0.2;
      baseStw = Math.max(0, baseStw + stwNoise);

      const windNoise = (Math.random() - 0.5) * 0.8;
      baseWindSpeed = Math.max(2, baseWindSpeed + windNoise);

      const angleNoise = (Math.random() - 0.5) * 4;
      baseWindAngle = (baseWindAngle + angleNoise + 360) % 360;

      onUpdate({
        depthBelowKeel: Number(baseDepth.toFixed(2)),
        speedThroughWater: Number(baseStw.toFixed(1)),
        apparentWindSpeed: Number(baseWindSpeed.toFixed(1)),
        apparentWindAngle: Math.round(baseWindAngle),
        waterTemperature: 19.4,
      });
    }, 1000);
  }

  public stopSimulator(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }
}
