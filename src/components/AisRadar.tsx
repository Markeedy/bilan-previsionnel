import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { marineAudioAlarm } from '../utils/marineAudioAlarm';
import {
  Radio,
  AlertTriangle,
  ShieldCheck,
  Send,
  Ship,
  Eye,
  CheckCircle2,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  BellRing,
  AlertOctagon,
  Sliders,
  Compass,
  ArrowRight,
  RotateCcw,
  History,
} from 'lucide-react';

export const AisRadar: React.FC = () => {
  const {
    vessel,
    aisTargets,
    selectedAisMmsi,
    setSelectedAisMmsi,
    ingestAivdmSentence,
  } = useNavigationStore();

  const [radarRangeNM, setRadarRangeNM] = useState<number>(3); // 1, 2, 3, 6, 12 NM
  const [customNmea, setCustomNmea] = useState<string>(
    '!AIVDM,1,1,,A,13aEO:0P00Or22hK>2a<0?wN00Sa,0*18'
  );
  const [injectStatus, setInjectStatus] = useState<string | null>(null);

  // Configuration personnalisée des seuils d'alarme
  const [cpaThresholdNM, setCpaThresholdNM] = useState<number>(0.8);
  const [tcpaThresholdMin, setTcpaThresholdMin] = useState<number>(20.0);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [isAlarmAcknowledged, setIsAlarmAcknowledged] = useState<boolean>(false);
  const [showThresholdSettings, setShowThresholdSettings] = useState<boolean>(false);

  // Historique des alertes de collision enregistrées
  const [alertLogs, setAlertLogs] = useState<
    Array<{
      id: string;
      timestamp: string;
      vesselName: string;
      mmsi: number;
      cpa: number;
      tcpa: number;
      action: string;
    }>
  >([]);

  const targetsList = Object.values(aisTargets);

  // Calcul coordonnées polaires (azimut et distance NM) pour le radar PPI
  const toRad = Math.PI / 180;
  const radarTargets = useMemo(() => {
    return targetsList.map((target) => {
      const dLat = (target.position.latitude - vessel.filteredPosition.latitude) * 60; // NM
      const meanLat = ((vessel.filteredPosition.latitude + target.position.latitude) / 2) * toRad;
      const dLon = (target.position.longitude - vessel.filteredPosition.longitude) * 60 * Math.cos(meanLat);

      const distanceNM = Math.sqrt(dLat * dLat + dLon * dLon);
      let bearingDeg = (Math.atan2(dLon, dLat) * 180) / Math.PI;
      if (bearingDeg < 0) bearingDeg += 360;

      // Relative bearing par rapport au cap navire (Head Up)
      let relativeBearing = (bearingDeg - vessel.cog + 360) % 360;

      // Évaluation dynamique du danger basée sur les seuils configurés
      const dynamicIsDangerous =
        target.tcpa > 0 &&
        target.tcpa <= tcpaThresholdMin &&
        target.cpa <= cpaThresholdNM;

      return {
        ...target,
        distanceNM: Number(distanceNM.toFixed(2)),
        bearingDeg: Math.round(bearingDeg),
        relativeBearing: Math.round(relativeBearing),
        dynamicIsDangerous,
      };
    });
  }, [targetsList, vessel.filteredPosition, vessel.cog, cpaThresholdNM, tcpaThresholdMin]);

  // Cibles dangereuses actives
  const dangerousTargets = useMemo(
    () => radarTargets.filter((t) => t.dynamicIsDangerous),
    [radarTargets]
  );
  const dangerousCount = dangerousTargets.length;
  const mostCriticalTarget = dangerousTargets.sort((a, b) => a.cpa - b.cpa)[0] || null;

  // Gestion du système d'alarme sonore de passerelle (Web Audio API)
  useEffect(() => {
    marineAudioAlarm.setMuted(isSoundMuted);

    if (dangerousCount > 0 && !isAlarmAcknowledged && !isSoundMuted) {
      marineAudioAlarm.startEmergencyAlarm();
    } else {
      marineAudioAlarm.stopAlarm();
    }

    return () => {
      marineAudioAlarm.stopAlarm();
    };
  }, [dangerousCount, isAlarmAcknowledged, isSoundMuted]);

  // Enregistrement dans le journal d'audit lors d'une nouvelle détection de risque
  const lastLoggedMmsiRef = useRef<number | null>(null);
  useEffect(() => {
    if (mostCriticalTarget && mostCriticalTarget.mmsi !== lastLoggedMmsiRef.current) {
      lastLoggedMmsiRef.current = mostCriticalTarget.mmsi;
      // Réactiver l'alarme sonore pour une nouvelle cible
      setIsAlarmAcknowledged(false);

      const newEntry = {
        id: `${mostCriticalTarget.mmsi}-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('fr-FR'),
        vesselName: mostCriticalTarget.vesselName,
        mmsi: mostCriticalTarget.mmsi,
        cpa: mostCriticalTarget.cpa,
        tcpa: mostCriticalTarget.tcpa,
        action: 'Alarme Déclenchée - Collision Imminente',
      };
      setAlertLogs((prev) => [newEntry, ...prev.slice(0, 9)]);
    } else if (!mostCriticalTarget) {
      lastLoggedMmsiRef.current = null;
    }
  }, [mostCriticalTarget]);

  const handleAcknowledgeAlarm = () => {
    setIsAlarmAcknowledged(true);
    marineAudioAlarm.stopAlarm();
    if (mostCriticalTarget) {
      setAlertLogs((prev) => [
        {
          id: `ack-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('fr-FR'),
          vesselName: mostCriticalTarget.vesselName,
          mmsi: mostCriticalTarget.mmsi,
          cpa: mostCriticalTarget.cpa,
          tcpa: mostCriticalTarget.tcpa,
          action: 'Alarme Acquittée par le Chef de Quart (Silence)',
        },
        ...prev.slice(0, 9),
      ]);
    }
  };

  const handleTestAudioBurst = () => {
    marineAudioAlarm.playCollisionBurst();
  };

  const handleInjectNmea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNmea.trim()) return;

    const success = ingestAivdmSentence(customNmea.trim());
    if (success) {
      setInjectStatus('Trame décodée avec succès : cible AIS enregistrée / mise à jour.');
    } else {
      setInjectStatus('Échec : format AIVDM invalide ou type de message non supporté.');
    }
    setTimeout(() => setInjectStatus(null), 4000);
  };

  // Recommandation manœuvre réglementaire COLREGs (Règles RIPAM de barre)
  const getColregAdvice = (target: typeof mostCriticalTarget) => {
    if (!target) return null;
    const rel = target.relativeBearing;

    if (rel >= 350 || rel <= 10) {
      return {
        rule: 'Règle 14 (Rencontre de face à face)',
        advice: 'Les deux navires doivent venir sur TRIBORD (droite) pour passer bâbord sur bâbord.',
        color: 'text-amber-300',
      };
    } else if (rel > 10 && rel <= 112.5) {
      return {
        rule: 'Règle 15 (Situation de croisement - Cible sur votre Tribord)',
        advice: 'Le navire est à votre droite : VOUS ÊTES NON PRIVILÉGIÉ. Vous devez vous écarter de sa route et passer sur son arrière.',
        color: 'text-rose-300',
      };
    } else if (rel > 247.5 && rel < 350) {
      return {
        rule: 'Règle 15 (Situation de croisement - Cible sur votre Bâbord)',
        advice: 'Vous êtes PRIVILÉGIÉ. Maintenez cap et vitesse, mais soyez prêt à manœuvrer si l’autre navire n’agit pas.',
        color: 'text-cyan-300',
      };
    } else {
      return {
        rule: 'Règle 13 (Situation de rattrapage)',
        advice: 'Le navire rattrapant doit s’écarter largement de la route du navire rattrapé.',
        color: 'text-slate-300',
      };
    }
  };

  const colregAdvice = getColregAdvice(mostCriticalTarget);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 select-none">
      {/* 1. BANNIÈRE D'ALERTE VISUELLE ET SONORE STROBOSCOPIQUE (SI DANGER DÉTECTÉ) */}
      {mostCriticalTarget && (
        <div
          className={`border-2 rounded-2xl p-4 shadow-2xl transition-all duration-300 ${
            isAlarmAcknowledged
              ? 'bg-amber-950/70 border-amber-500/80'
              : 'bg-red-950/90 border-red-500 animate-pulse shadow-red-950/80'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                  isAlarmAcknowledged
                    ? 'bg-amber-600/30 border-amber-500 text-amber-300'
                    : 'bg-red-600 border-red-400 text-white animate-bounce'
                }`}
              >
                <AlertOctagon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold uppercase tracking-wider text-red-200">
                    {isAlarmAcknowledged ? '⚠️ ALERTE D’ABORDAGE ACQUITTÉE' : '🚨 ALERTE CRITIQUE : RISQUE DE COLLISION'}
                  </span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-900/90 text-red-100 border border-red-400">
                    CPA {mostCriticalTarget.cpa.toFixed(2)} NM • TCPA {mostCriticalTarget.tcpa.toFixed(1)} MIN
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  Navire en approche : <span className="text-red-300">{mostCriticalTarget.vesselName}</span> (MMSI {mostCriticalTarget.mmsi})
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Vitesse cible : <strong className="text-amber-300">{mostCriticalTarget.sog.toFixed(1)} kts</strong> @ Cap {mostCriticalTarget.cog}° • Distance actuelle : {mostCriticalTarget.distanceNM} NM
                </p>
              </div>
            </div>

            {/* Actions de Passerelle et Acquittement */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!isAlarmAcknowledged ? (
                <button
                  onClick={handleAcknowledgeAlarm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg border border-red-400 flex items-center gap-2 transition"
                >
                  <BellRing className="w-4 h-4 animate-spin" />
                  <span>Acquitter l'Alarme (Silence)</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/60 text-amber-200 border border-amber-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>Alarme Sonore Acquittée</span>
                </div>
              )}

              <button
                onClick={() => setSelectedAisMmsi(mostCriticalTarget.mmsi)}
                className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border border-cyan-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Eye className="w-4 h-4" />
                <span>Pister la Cible</span>
              </button>
            </div>
          </div>

          {/* Recommandation Manœuvre COLREGs */}
          {colregAdvice && (
            <div className="mt-3 pt-3 border-t border-red-800/60 flex items-start gap-2 text-xs">
              <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">{colregAdvice.rule} : </span>
                <span className={colregAdvice.color}>{colregAdvice.advice}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. EN-TÊTE DU MODULE AIS ET CONTRÔLES AUDIO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">Radar AIS & Système d'Alertes Anti-Abordage</h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                Alerte Sonore & Visuelle
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Surveillance continue CPA/TCPA, alerte bitonale IEC 62288 et conformité aux règles de barre COLREGs.
            </p>
          </div>
        </div>

        {/* Contrôles Audio et Paramètres des Seuils */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bouton Mute / Unmute Alarme Sonore */}
          <button
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isSoundMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                : 'bg-rose-950/70 border-rose-600 text-rose-300 hover:bg-rose-900/70'
            }`}
            title={isSoundMuted ? "Activer l'alarme sonore" : "Couper l'alarme sonore"}
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-400" />}
            <span>{isSoundMuted ? 'Sirène Coupée' : 'Sirène Active'}</span>
          </button>

          {/* Tester la Sirène */}
          <button
            onClick={handleTestAudioBurst}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            title="Tester le signal sonore deux tons de collision"
          >
            <BellRing className="w-3.5 h-3.5 text-amber-400" />
            <span>Tester Son</span>
          </button>

          {/* Bouton Configuration Seuils */}
          <button
            onClick={() => setShowThresholdSettings(!showThresholdSettings)}
            className={`p-2 rounded-xl border text-xs font-semibold transition ${
              showThresholdSettings
                ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Configurer les seuils CPA / TCPA"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Sélecteur d'Échelle Radar */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 font-mono">Portée :</span>
            {[1, 2, 3, 6].map((range) => (
              <button
                key={range}
                onClick={() => setRadarRangeNM(range)}
                className={`px-2 py-1 rounded-md font-mono transition ${
                  radarRangeNM === range
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {range} NM
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PANNEAU DE CONFIGURATION DYNAMIQUE DES SEUILS D'ALERTE (SI DÉPLIÉ) */}
      {showThresholdSettings && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200">Seuil de Distance Critique (CPA) :</span>
              <span className="font-mono text-rose-400 font-bold">{cpaThresholdNM.toFixed(2)} NM</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={cpaThresholdNM}
              onChange={(e) => setCpaThresholdNM(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Une alerte sonore et visuelle retentira si un navire croise à moins de {cpaThresholdNM} Milles Nautiques.
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-200">Seuil de Délai Critique (TCPA) :</span>
              <span className="font-mono text-cyan-400 font-bold">{tcpaThresholdMin.toFixed(0)} min</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={tcpaThresholdMin}
              onChange={(e) => setTcpaThresholdMin(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              Délai limite avant croisement pour déclencher l'anticipation de manœuvre.
            </span>
          </div>
        </div>
      )}

      {/* 3. ÉCRAN RADAR PPI & LISTE DES CIBLES AVEC CALCULS DE COLLISION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ÉCRAN RADAR PPI CIRCULAIRE (5 colonnes) */}
        <div
          className={`lg:col-span-5 bg-slate-900 border rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center transition-all ${
            dangerousCount > 0 ? 'border-red-500/80 shadow-red-950/40' : 'border-slate-800'
          }`}
        >
          <div className="w-full flex items-center justify-between mb-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-400" /> Écran PPI (Head-Up)
            </span>
            <span className="font-mono text-cyan-400">Rayon max : {radarRangeNM} NM</span>
          </div>

          <div className="relative w-72 h-72 sm:w-84 sm:h-84 my-2 select-none">
            {/* SVG Radar */}
            <svg className="w-full h-full" viewBox="-120 -120 240 240">
              {/* Fond vert radar sombre */}
              <circle cx="0" cy="0" r="115" fill="#04121a" stroke="#0e3d59" strokeWidth="2" />

              {/* Cercles de distance (Range Rings) */}
              {[0.33, 0.66, 1.0].map((frac, idx) => (
                <circle
                  key={idx}
                  cx="0"
                  cy="0"
                  r={115 * frac}
                  fill="none"
                  stroke="#0e4b6e"
                  strokeWidth="0.8"
                  strokeDasharray="3,3"
                />
              ))}

              {/* Réticule d'azimut */}
              <line x1="-115" y1="0" x2="115" y2="0" stroke="#0e4b6e" strokeWidth="0.8" />
              <line x1="0" y1="-115" x2="0" y2="115" stroke="#0e4b6e" strokeWidth="0.8" />

              {/* Ligne de balayage tournante */}
              <line
                x1="0"
                y1="0"
                x2="110"
                y2="-50"
                stroke="rgba(14, 165, 233, 0.4)"
                strokeWidth="1.5"
                className="animate-spin origin-center"
                style={{ animationDuration: '6s' }}
              />

              {/* Zone de danger CPA autour de son propre navire */}
              <circle
                cx="0"
                cy="0"
                r={(cpaThresholdNM / radarRangeNM) * 115}
                fill="rgba(239, 68, 68, 0.08)"
                stroke="rgba(239, 68, 68, 0.4)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />

              {/* Marqueurs gradués */}
              <text x="0" y="-103" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                000° (CAP)
              </text>
              <text x="105" y="3" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                090°
              </text>
              <text x="0" y="112" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                180°
              </text>
              <text x="-105" y="3" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold">
                270°
              </text>

              {/* Cibles AIS sur le radar */}
              {radarTargets.map((target) => {
                const rNormalized = (target.distanceNM / radarRangeNM) * 115;
                if (rNormalized > 115) return null; // Hors de portée radar

                const angleRad = ((target.relativeBearing - 90) * Math.PI) / 180;
                const px = rNormalized * Math.cos(angleRad);
                const py = rNormalized * Math.sin(angleRad);

                const isSelected = selectedAisMmsi === target.mmsi;

                return (
                  <g
                    key={target.mmsi}
                    className="cursor-pointer"
                    onClick={() => setSelectedAisMmsi(target.mmsi)}
                  >
                    {/* Cercles stroboscopiques en cas de risque de collision */}
                    {target.dynamicIsDangerous && (
                      <g>
                        <circle
                          cx={px}
                          cy={py}
                          r="14"
                          fill="rgba(239, 68, 68, 0.3)"
                          stroke="#ef4444"
                          strokeWidth="1.5"
                          className="animate-ping"
                        />
                        <line
                          x1="0"
                          y1="0"
                          x2={px}
                          y2={py}
                          stroke="#ef4444"
                          strokeWidth="1.2"
                          strokeDasharray="3,2"
                        />
                      </g>
                    )}
                    <polygon
                      points={`${px},${py - 7} ${px + 5},${py + 5} ${px - 5},${py + 5}`}
                      fill={target.dynamicIsDangerous ? '#ef4444' : isSelected ? '#38bdf8' : '#eab308'}
                      stroke="#000"
                      strokeWidth="1.2"
                    />
                    <text
                      x={px + 7}
                      y={py + 3}
                      fill={target.dynamicIsDangerous ? '#fca5a5' : '#e2e8f0'}
                      fontSize="7.5"
                      fontWeight="bold"
                    >
                      {target.vesselName.substring(0, 11)}
                    </text>
                  </g>
                );
              })}

              {/* Son propre navire au centre */}
              <circle cx="0" cy="0" r="4.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="0" y2="-24" stroke="#ef4444" strokeWidth="2.2" />
            </svg>
          </div>

          <div className="w-full flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 pt-3">
            <span>Cibles actives : <strong className="text-slate-200">{targetsList.length}</strong></span>
            <span>Seuil CPA configuré : <strong className="text-red-400">&lt; {cpaThresholdNM.toFixed(2)} NM</strong></span>
            <span>Seuil TCPA : <strong className="text-red-400">&lt; {tcpaThresholdMin.toFixed(0)} min</strong></span>
          </div>
        </div>

        {/* LISTE DÉTAILLÉE DES CIBLES ET CALCULS DE COLLISION (7 colonnes) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Ship className="w-5 h-5 text-cyan-400" /> Registre du Trafic Maritime Temps Réel
              </h2>
              <span className="text-xs font-mono text-slate-400">
                Mon Cap : {Math.round(vessel.cog)}° @ {vessel.sog.toFixed(1)} kts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="py-2 px-2">Navire / MMSI</th>
                    <th className="py-2 px-2">Type / Statut</th>
                    <th className="py-2 px-2">Distance</th>
                    <th className="py-2 px-2">Vitesse</th>
                    <th className="py-2 px-2 text-right">CPA</th>
                    <th className="py-2 px-2 text-right">TCPA</th>
                    <th className="py-2 px-2 text-center">Statut Risque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {radarTargets.map((target) => {
                    const isSelected = selectedAisMmsi === target.mmsi;
                    return (
                      <tr
                        key={target.mmsi}
                        onClick={() => setSelectedAisMmsi(target.mmsi)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/40 text-cyan-200'
                            : target.dynamicIsDangerous
                            ? 'bg-red-950/30 hover:bg-red-950/50'
                            : 'hover:bg-slate-800/60'
                        }`}
                      >
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-slate-100 font-sans">{target.vesselName}</div>
                          <div className="text-[10px] text-slate-400">MMSI {target.mmsi}</div>
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="text-slate-200">{target.shipTypeLabel}</div>
                          <div className="text-[10px] text-slate-400">{target.navStatusLabel}</div>
                        </td>
                        <td className="py-2.5 px-2 text-cyan-300 font-semibold">
                          {target.distanceNM} NM
                        </td>
                        <td className="py-2.5 px-2">
                          {target.sog.toFixed(1)} kts
                          <span className="text-[10px] text-slate-400 block">{target.cog}°</span>
                        </td>
                        <td
                          className={`py-2.5 px-2 text-right font-bold ${
                            target.cpa <= cpaThresholdNM ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {target.cpa.toFixed(2)} NM
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-300">
                          {target.tcpa > 120 ? 'Éloignement' : `${target.tcpa.toFixed(1)} min`}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {target.dynamicIsDangerous ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-700 animate-pulse flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              ABORDAGE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              SÉCURISÉ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONSOLE D'INJECTION & DÉCODAGE DIRECT AIVDM */}
          <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-950/60 p-4 rounded-xl border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" /> Console d'Injection NMEA AIVDM (Testeur 6-bits)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Format: !AIVDM,...</span>
            </div>

            <form onSubmit={handleInjectNmea} className="flex gap-2">
              <input
                type="text"
                value={customNmea}
                onChange={(e) => setCustomNmea(e.target.value)}
                placeholder="Exemple: !AIVDM,1,1,,A,13aEO:0P00Or22hK>2a<0?wN00Sa,0*18"
                className="flex-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <Send className="w-3.5 h-3.5" /> Injecter
              </button>
            </form>

            {injectStatus && (
              <div className="mt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {injectStatus}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. JOURNAL D'AUDIT DES ALERTES D'ABORDAGE (HISTORIQUE DES ÉVÉNEMENTS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-rose-400" /> Journal de Sécurité & Historique des Alertes de Passerelle
          </h3>
          <span className="text-xs font-mono text-slate-400">Norme IEC 62288 / ECDIS Log</span>
        </div>

        {alertLogs.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/60 rounded-xl border border-slate-800">
            Aucun incident ni franchissement de seuil de sécurité enregistré récemment.
          </div>
        ) : (
          <div className="space-y-2 font-mono text-xs">
            {alertLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                  <span className="text-slate-200 font-bold font-sans">{log.vesselName}</span>
                  <span className="text-slate-400 text-[11px]">(MMSI {log.mmsi})</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-red-400">CPA {log.cpa.toFixed(2)} NM • TCPA {log.tcpa.toFixed(1)} min</span>
                  <span className="text-cyan-300 font-sans">{log.action}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
