import React, { useState, useMemo } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { LogbookCategory, LogbookEntry, LogbookSeverity } from '../types/maritime';
import {
  BookOpen,
  Radio,
  CloudRain,
  AlertTriangle,
  Anchor,
  Compass,
  Download,
  Printer,
  Trash2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Ship,
  Clock,
  MapPin,
  FileText,
  X,
  Gauge,
  Zap,
} from 'lucide-react';

export const DigitalLogbook: React.FC = () => {
  const {
    logbookEntries,
    addLogbookEntry,
    deleteLogbookEntry,
    clearLogbook,
    vessel,
  } = useNavigationStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Formulaire d'entrée manuelle
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualDetails, setManualDetails] = useState<string>('');
  const [manualCategory, setManualCategory] = useState<LogbookCategory>('MANUAL_NOTE');
  const [manualSeverity, setManualSeverity] = useState<LogbookSeverity>('INFO');
  const [manualAuthor, setManualAuthor] = useState<string>('Capitaine');

  // Filtrage des entrées
  const filteredEntries = useMemo(() => {
    return logbookEntries.filter((entry) => {
      const matchCategory =
        selectedCategory === 'ALL' || entry.category === selectedCategory;
      const matchSeverity =
        selectedSeverity === 'ALL' || entry.severity === selectedSeverity;
      const matchSearch =
        !searchQuery.trim() ||
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.metadata?.vesselName &&
          entry.metadata.vesselName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.metadata?.mmsi && entry.metadata.mmsi.toString().includes(searchQuery));

      return matchCategory && matchSeverity && matchSearch;
    });
  }, [logbookEntries, selectedCategory, selectedSeverity, searchQuery]);

  // Statistiques du journal
  const stats = useMemo(() => {
    const aisAlerts = logbookEntries.filter((e) => e.category === 'AIS_ALERT').length;
    const weatherAlerts = logbookEntries.filter((e) => e.category === 'WEATHER_ALERT').length;
    const shallowAlerts = logbookEntries.filter((e) => e.category === 'SHALLOW_WATER').length;
    const criticalCount = logbookEntries.filter((e) => e.severity === 'CRITICAL').length;
    return { aisAlerts, weatherAlerts, shallowAlerts, criticalCount, total: logbookEntries.length };
  }, [logbookEntries]);

  // Export CSV officiel du livre de bord
  const handleExportCsv = () => {
    if (logbookEntries.length === 0) return;

    const headers = [
      'ID',
      'Horodatage_ISO',
      'Heure_Locale',
      'Categorie',
      'Severite',
      'Titre',
      'Details',
      'Latitude',
      'Longitude',
      'SOG_kts',
      'COG_deg',
      'MMSI',
      'Navire_Cible',
      'CPA_NM',
      'TCPA_min',
      'Hauteur_Vague_m',
      'Vent_kts',
      'Auteur',
    ];

    const rows = logbookEntries.map((e) => [
      `"${e.id}"`,
      `"${e.isoDate}"`,
      `"${new Date(e.timestamp).toLocaleString('fr-FR')}"`,
      `"${e.category}"`,
      `"${e.severity}"`,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.details.replace(/"/g, '""')}"`,
      e.coordinates.latitude.toFixed(5),
      e.coordinates.longitude.toFixed(5),
      e.sog.toFixed(1),
      Math.round(e.cog),
      e.metadata?.mmsi || '',
      `"${e.metadata?.vesselName || ''}"`,
      e.metadata?.cpa !== undefined ? e.metadata.cpa.toFixed(2) : '',
      e.metadata?.tcpa !== undefined ? e.metadata.tcpa.toFixed(1) : '',
      e.metadata?.waveHeight !== undefined ? e.metadata.waveHeight.toFixed(2) : '',
      e.metadata?.windSpeed !== undefined ? e.metadata.windSpeed.toFixed(1) : '',
      `"${e.metadata?.author || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `journal_de_bord_naviseas_${new Date().toISOString().substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;

    addLogbookEntry({
      category: manualCategory,
      severity: manualSeverity,
      title: manualTitle.trim(),
      details: manualDetails.trim() || 'Note enregistrée par la passerelle.',
      metadata: { author: manualAuthor.trim() || 'Officier de quart' },
    });

    setManualTitle('');
    setManualDetails('');
    setIsAddModalOpen(false);
  };

  // Simuler immédiatement un événement AIS pour démonstration
  const handleSimulateAisAlert = () => {
    addLogbookEntry({
      category: 'AIS_ALERT',
      severity: 'CRITICAL',
      title: 'Alerte Risque d’Abordage CPA : NAVIRE TEST RAPIDE',
      details: 'Cible MMSI 999123456 en route de collision estimée. CPA 0.35 NM, TCPA 6.0 min.',
      metadata: { mmsi: 999123456, vesselName: 'NAVIRE TEST RAPIDE', cpa: 0.35, tcpa: 6.0 },
    });
  };

  const handleSimulateWeatherAlert = () => {
    addLogbookEntry({
      category: 'WEATHER_ALERT',
      severity: 'WARNING',
      title: 'Alerte Météo Marine : Avis de Coup de Vent Échelle 7 Beaufort',
      details: 'Dépression côtière locale : rafales prévues à 32 kts et surélévation de la mer du vent.',
      metadata: { windSpeed: 32, waveHeight: 2.6 },
    });
  };

  const getSeverityBadge = (severity: LogbookSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-950/80 text-red-300 border-red-700';
      case 'WARNING':
        return 'bg-amber-950/80 text-amber-300 border-amber-700';
      case 'INFO':
      default:
        return 'bg-blue-950/80 text-blue-300 border-blue-700';
    }
  };

  const getCategoryIcon = (category: LogbookCategory) => {
    switch (category) {
      case 'AIS_ALERT':
        return <Radio className="w-4 h-4 text-rose-400" />;
      case 'WEATHER_ALERT':
        return <CloudRain className="w-4 h-4 text-cyan-400" />;
      case 'SHALLOW_WATER':
        return <Anchor className="w-4 h-4 text-amber-400" />;
      case 'NAVIGATION':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'MANUAL_NOTE':
      default:
        return <FileText className="w-4 h-4 text-violet-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* En-tête du Journal de Bord Numérique */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <BookOpen className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">
                Journal de Bord Numérique & Enregistrement d'Événements
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Livre de Bord Maritime
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Traçabilité réglementaire horodatée : alarmes d'abordage AIS (CPA/TCPA), alertes météorologiques et événements nautiques.
            </p>
          </div>
        </div>

        {/* Boutons d'Action Principaux */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Entrée</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={logbookEntries.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition disabled:opacity-50"
            title="Exporter l'historique en CSV"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition"
            title="Imprimer le Livre de Bord"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
          </button>

          {logbookEntries.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Êtes-vous sûr de vouloir réinitialiser le journal de bord ?')) {
                  clearLogbook();
                }
              }}
              className="p-2 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-xl text-xs transition"
              title="Vider le journal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4 CARTES DE STATISTIQUES RÉCAPITULATIVES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Entrées */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-semibold">Total Événements</span>
            <BookOpen className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.total}</div>
          <p className="text-[11px] text-slate-400">Événements conservés</p>
        </div>

        {/* Alertes CPA AIS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-semibold">Alertes AIS / CPA</span>
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{stats.aisAlerts}</div>
          <p className="text-[11px] text-slate-400">Enregistrements anti-collision</p>
        </div>

        {/* Alertes Météo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-semibold">Alertes Météo</span>
            <CloudRain className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-400">{stats.weatherAlerts}</div>
          <p className="text-[11px] text-slate-400">Vent, houle & baromètre</p>
        </div>

        {/* Alertes Critiques */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs uppercase font-semibold">Alarmes Critiques</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{stats.criticalCount}</div>
          <p className="text-[11px] text-slate-400">Attention passerelle requise</p>
        </div>
      </div>

      {/* BARRE DE FILTRAGE, RECHERCHE & DÉCLENCHEURS DE TEST */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Champ de Recherche */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par navire, MMSI, titre ou mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filtre Catégorie */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <span className="text-slate-500 px-2 font-mono flex items-center gap-1">
              <Filter className="w-3 h-3" /> Catégorie :
            </span>
            {[
              { id: 'ALL', label: 'Toutes' },
              { id: 'AIS_ALERT', label: 'AIS' },
              { id: 'WEATHER_ALERT', label: 'Météo' },
              { id: 'SHALLOW_WATER', label: 'Sonde' },
              { id: 'MANUAL_NOTE', label: 'Notes' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg transition text-xs font-medium ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Déclencheurs de Test Rapide */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              onClick={handleSimulateAisAlert}
              className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="Déclencher une alerte AIS automatique pour test"
            >
              <Zap className="w-3 h-3" /> + Test AIS
            </button>
            <button
              onClick={handleSimulateWeatherAlert}
              className="px-2.5 py-1.5 bg-blue-950/70 hover:bg-blue-900 text-blue-300 border border-blue-800/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              title="Déclencher une alerte météo automatique pour test"
            >
              <Zap className="w-3 h-3" /> + Test Météo
            </button>
          </div>
        </div>
      </div>

      {/* LISTE CHRONOLOGIQUE DES ENTRÉES DU LIVRE DE BORD */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-base font-semibold text-slate-300">Aucune entrée correspondante</p>
            <p className="text-xs text-slate-500 mt-1">
              Modifiez vos critères de recherche ou enregistrez un nouvel événement dans le journal.
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg hover:border-slate-700 transition space-y-3"
            >
              {/* Ligne d'en-tête de l'entrée */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    {getCategoryIcon(entry.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{entry.title}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(entry.timestamp).toLocaleDateString('fr-FR')}</span>
                      <span>{new Date(entry.timestamp).toLocaleTimeString('fr-FR')}</span>
                      <span>(UTC: {new Date(entry.timestamp).toISOString().substring(11, 16)}Z)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${getSeverityBadge(
                      entry.severity
                    )}`}
                  >
                    {entry.severity}
                  </span>
                  <button
                    onClick={() => deleteLogbookEntry(entry.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Supprimer cette ligne"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Texte des détails */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-sans">
                {entry.details}
              </p>

              {/* Télémétrie et Métadonnées enregistrées au moment de l'événement */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <MapPin className="w-3 h-3 text-cyan-500" />
                    LAT {entry.coordinates.latitude.toFixed(4)}°N • LON{' '}
                    {entry.coordinates.longitude.toFixed(4)}°E
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Gauge className="w-3 h-3 text-emerald-400" />
                    SOG {entry.sog.toFixed(1)} kts • COG {Math.round(entry.cog)}°
                  </span>
                </div>

                {/* Métadonnées spécifiques */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {entry.metadata?.mmsi && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      MMSI: {entry.metadata.mmsi}
                    </span>
                  )}
                  {entry.metadata?.cpa !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-red-950/70 text-red-300 border border-red-800">
                      CPA: {entry.metadata.cpa.toFixed(2)} NM
                    </span>
                  )}
                  {entry.metadata?.tcpa !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800">
                      TCPA: {entry.metadata.tcpa.toFixed(1)} min
                    </span>
                  )}
                  {entry.metadata?.waveHeight !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800">
                      Hs: {entry.metadata.waveHeight.toFixed(1)} m
                    </span>
                  )}
                  {entry.metadata?.windSpeed !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800">
                      Vent: {entry.metadata.windSpeed.toFixed(0)} kts
                    </span>
                  )}
                  {entry.metadata?.depth !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800">
                      Sonde: {entry.metadata.depth.toFixed(1)} m
                    </span>
                  )}
                  {entry.metadata?.author && (
                    <span className="px-2 py-0.5 rounded bg-violet-950/70 text-violet-300 border border-violet-800">
                      Rédacteur: {entry.metadata.author}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL NOUVELLE ENTRÉE MANUELLE AU LIVRE DE BORD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Nouvelle Inscription au Journal de Bord
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Titre de l'Observation / Événement :
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prise de quart, relevé de pêche, inspection machine, mouillage..."
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Catégorie :</label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value as LogbookCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MANUAL_NOTE">Note Manuelle / Quart</option>
                    <option value="NAVIGATION">Événement Navigation</option>
                    <option value="WEATHER_ALERT">Observation Météo</option>
                    <option value="AIS_ALERT">Observation Trafic / AIS</option>
                    <option value="SHALLOW_WATER">Observation Bathymétrie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gravité :</label>
                  <select
                    value={manualSeverity}
                    onChange={(e) => setManualSeverity(e.target.value as LogbookSeverity)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INFO">Information (Normal)</option>
                    <option value="WARNING">Avertissement (Vigilance)</option>
                    <option value="CRITICAL">Critique (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Description Détaillée :
                </label>
                <textarea
                  rows={3}
                  placeholder="Précisez les circonstances de navigation, captures de pêche, état de la mer ou ordres de barre..."
                  value={manualDetails}
                  onChange={(e) => setManualDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Officier / Auteur de la Saisie :
                </label>
                <input
                  type="text"
                  value={manualAuthor}
                  onChange={(e) => setManualAuthor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
                Horodatage automatique : {new Date().toLocaleString('fr-FR')} (Position actuelle et
                vecteurs SOG/COG inclus automatiquement).
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold shadow-md transition"
                >
                  Valider et Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
