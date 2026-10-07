import React, { useState, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { SignalKService } from '../services/SignalKService';
import {
  Anchor,
  Radio,
  Gauge,
  Wind,
  Thermometer,
  Zap,
  CheckCircle2,
  AlertCircle,
  Send,
  Code,
  Activity,
} from 'lucide-react';

const signalKService = new SignalKService();

export const SignalKMonitor: React.FC = () => {
  const { vessel, updateSignalKField } = useNavigationStore();
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [apparentWindSpeed, setApparentWindSpeed] = useState<number>(14.5);
  const [apparentWindAngle, setApparentWindAngle] = useState<number>(45);
  const [waterTemp, setWaterTemp] = useState<number>(19.4);
  const [deltaLogs, setDeltaLogs] = useState<
    Array<{ path: string; value: any; timestamp: string }>
  >([
    {
      path: 'environment.depth.belowKeel',
      value: 6.8,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      path: 'navigation.speedThroughWater',
      value: 6.2,
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      path: 'environment.wind.speedApparent',
      value: 14.5,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [rawDeltaJson, setRawDeltaJson] = useState<string>(
    JSON.stringify(
      {
        context: 'vessels.self',
        updates: [
          {
            source: { label: 'Airmar-DST800' },
            timestamp: new Date().toISOString(),
            values: [
              { path: 'environment.depth.belowKeel', value: 5.4 },
              { path: 'navigation.speedThroughWater', value: 7.1 },
            ],
          },
        ],
      },
      null,
      2
    )
  );

  // Démarrer le simulateur Signal K en arrière-plan
  useEffect(() => {
    if (isConnected) {
      signalKService.startSimulator((data) => {
        setApparentWindSpeed(data.apparentWindSpeed);
        setApparentWindAngle(data.apparentWindAngle);
        setWaterTemp(data.waterTemperature);
        updateSignalKField('environment.depth.belowKeel', data.depthBelowKeel);
        updateSignalKField('navigation.speedThroughWater', data.speedThroughWater);

        setDeltaLogs((prev) => [
          {
            path: 'environment.depth.belowKeel',
            value: data.depthBelowKeel,
            timestamp: new Date().toLocaleTimeString(),
          },
          {
            path: 'environment.wind.speedApparent',
            value: data.apparentWindSpeed,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev.slice(0, 15),
        ]);
      });
    } else {
      signalKService.stopSimulator();
    }

    return () => {
      signalKService.stopSimulator();
    };
  }, [isConnected, updateSignalKField]);

  const handleManualInject = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      signalKService.parseDeltaPayload(rawDeltaJson);
      const parsed = JSON.parse(rawDeltaJson);
      if (parsed.updates?.[0]?.values) {
        parsed.updates[0].values.forEach((v: any) => {
          updateSignalKField(v.path, v.value);
        });
      }
    } catch (err) {
      alert('Erreur format JSON');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête Signal K */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Anchor className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Bus Télémétrique Navale Signal K</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                JSON WebSocket RFC-6455
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Passerelle universelle convertissant NMEA 2000 / NMEA 0183 en objets hiérarchiques et flux de deltas.
            </p>
          </div>
        </div>

        {/* Statut Connexion WebSocket */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isConnected
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                : 'bg-red-950/70 border-red-600 text-red-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'
              }`}
            />
            <span>{isConnected ? 'WebSocket Connecté (ws://local)' : 'Déconnecté'}</span>
          </div>

          <button
            onClick={() => setIsConnected(!isConnected)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
          >
            {isConnected ? 'Couper Flux' : 'Reconnecter'}
          </button>
        </div>
      </div>

      {/* 4 JAUGES ANALOGIQUES / NUMÉRIQUES ISSUES DU SCHÉMA SIGNAL K */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profondeur sous la quille */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">environment.depth.belowKeel</span>
            <Anchor className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400">
            {vessel.depthBelowKeel.toFixed(2)} <span className="text-sm font-normal text-slate-400">m</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono">
            Sonde totale : {vessel.depthBelowTransducer.toFixed(2)} m (Tirant {vessel.boatDraft}m)
          </p>
        </div>

        {/* Vitesse Surface (STW) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">navigation.speedThroughWater</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-cyan-400">
            {vessel.speedThroughWater.toFixed(1)} <span className="text-sm font-normal text-slate-400">kts</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono">
            Dérive courant : {(vessel.sog - vessel.speedThroughWater).toFixed(1)} kts
          </p>
        </div>

        {/* Vent Apparent (Vitesse & Angle) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">environment.wind.speedApparent</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {apparentWindSpeed.toFixed(1)} <span className="text-sm font-normal text-slate-400">kts</span>
          </div>
          <p className="mt-2 text-xs text-slate-400 font-mono">
            Angle au mât : {apparentWindAngle}° {apparentWindAngle < 180 ? 'Bâbord' : 'Tribord'}
          </p>
        </div>

        {/* Température de Surface de l'Eau */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-semibold">environment.water.temperature</span>
            <Thermometer className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400">
            {waterTemp.toFixed(1)} <span className="text-sm font-normal text-slate-400">°C</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Sonde traversante DST800 Airmar active
          </p>
        </div>
      </div>

      {/* FLUX DE DELTAS ET CONSOLE D'INSPECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FLUX EN DIRECT DES MESSAGES DELTA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" /> Flux Temps Réel des Messages "Delta"
              </h3>
              <span className="text-xs font-mono text-teal-300">Format Standard Signal K</span>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 h-64 overflow-y-auto space-y-2 font-mono text-xs">
              {deltaLogs.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-850"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                    <span className="text-cyan-400 font-semibold">{log.path}</span>
                  </div>
                  <span className="text-amber-300 font-bold">{String(log.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>Abonnement aux chemins navigation.* et environment.* actif avec période 500ms.</span>
          </div>
        </div>

        {/* INJECTEUR DE JSON DELTA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" /> Simulateur de Trame Signal K Personnalisée
              </h3>
              <span className="text-xs font-mono text-slate-400">Injection Manuelle</span>
            </div>

            <form onSubmit={handleManualInject}>
              <textarea
                value={rawDeltaJson}
                onChange={(e) => setRawDeltaJson(e.target.value)}
                rows={9}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs p-3 rounded-xl focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="mt-3 w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" /> Publier le Delta sur le Bus Interne
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Permet de tester les réactions instantanées du traceur ECDIS et des alarmes de hauts-fonds.
          </div>
        </div>
      </div>
    </div>
  );
};
