import React, { useState, useRef, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import {
  Bot,
  Send,
  Search,
  Sparkles,
  Zap,
  Cpu,
  Compass,
  Ship,
  Fish,
  Globe,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Radio,
  Anchor,
  Shield,
  Layers,
  ChevronDown,
} from 'lucide-react';

export type ChatRole = 'NAVIGATOR' | 'FISHERMAN' | 'ENGINEER';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  modelUsed?: string;
  groundingMetadata?: {
    webSearchQueries?: string[];
    groundingChunks?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
    searchEntryPoint?: {
      renderedContent?: string;
    };
  };
}

const PRESET_PROMPTS = [
  {
    label: 'Météo & Avis Côtiers (Google Search)',
    prompt:
      'Quels sont les avis de coup de vent (BMS), conditions de mer et prévisions météo marine actuelles pour la côte de Tipaza et Khemisti aujourd\'hui ?',
    model: 'gemini-3.5-flash',
    search: true,
    role: 'NAVIGATOR' as ChatRole,
  },
  {
    label: 'Conseil Pêche & Périodes Solunaires',
    prompt:
      'Compte tenu de notre position actuelle et de la pression barométrique, quelle est la meilleure technique de pêche et le créneau d\'activité majeur conseillé aujourd\'hui ?',
    model: 'gemini-3.5-flash',
    search: true,
    role: 'FISHERMAN' as ChatRole,
  },
  {
    label: 'Règles de Barre RIPAM / COLREGs (Rapide)',
    prompt:
      'Rappel rapide : navire à propulsion mécanique en route voyant un autre navire par son travers tribord qui approche avec un relèvement constant. Quelle est la manœuvre obligatoire selon la règle 15 du RIPAM ?',
    model: 'gemini-3.1-flash-lite',
    search: false,
    role: 'NAVIGATOR' as ChatRole,
  },
  {
    label: 'Analyse Hydrographique Complexe (Pro)',
    prompt:
      'Analyse hydrographique détaillée : Quelles sont les marges sous quille recommandées (UKC - Under Keel Clearance) en fonction du squat, du pilonnement lié à la houle de 1.5m et de la nature des fonds vaseux/rocheux ?',
    model: 'gemini-3.1-pro-preview',
    search: false,
    role: 'ENGINEER' as ChatRole,
  },
];

export const GeminiChatbot: React.FC = () => {
  const { vessel, aisTargets, routes, activeRouteId } = useNavigationStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Bienvenue à bord de la passerelle NaviSeas Pro. Je suis votre assistant de quart propulsé par Gemini.

Je peux vous assister pour :
- **Recherche Météo & Avis en Direct** : Grâce au **Search Grounding de Google**, je consulte en temps réel les derniers BMS maritimes, marées et conditions côtières.
- **Assistance Immédiate de Quart** : Rappels instantanés des règles RIPAM/COLREGs avec *gemini-3.1-flash-lite*.
- **Stratégie Halieutique** : Recommandations basées sur la Théorie Solunaire et vos conditions locales.
- **Analyses Maritimes Complexes** : Résistance de carène, calculs de squat et dynamique navale avec *gemini-3.1-pro-preview*.

La télémétrie de bord est connectée en temps réel. Comment puis-je vous aider ?`,
      timestamp: Date.now(),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<
    'gemini-3.5-flash' | 'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview'
  >('gemini-3.5-flash');
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);
  const [selectedRole, setSelectedRole] = useState<ChatRole>('NAVIGATOR');
  const [includeTelemetry, setIncludeTelemetry] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const activeRoute = routes.find((r) => r.id === activeRouteId);
  const aisCount = Object.keys(aisTargets).length;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const vesselContext = includeTelemetry
        ? {
            latitude: vessel.filteredPosition.latitude,
            longitude: vessel.filteredPosition.longitude,
            sog: vessel.sog,
            cog: vessel.cog,
            depthBelowKeel: vessel.depthBelowKeel,
            boatDraft: vessel.boatDraft,
            aisCount,
            activeRouteName: activeRoute?.name,
            waypointCount: activeRoute?.waypoints.length,
          }
        : undefined;

      const payload = {
        messages: newHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        model: selectedModel,
        useSearchGrounding:
          selectedModel === 'gemini-3.5-flash' ? useSearchGrounding : false,
        role: selectedRole,
        vesselContext,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        let errMsg = data.error || `Erreur serveur (${response.status})`;
        try {
          if (typeof errMsg === 'string' && errMsg.includes('{')) {
            const parsed = JSON.parse(errMsg);
            if (parsed.error?.message) {
              errMsg = parsed.error.message;
            }
          }
        } catch {}
        if (errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
          errMsg = 'Quota de requêtes Gemini temporairement atteint (Rate limit). Réessayez dans un instant ou sélectionnez un autre modèle (ex: 3.1 Lite).';
        }
        throw new Error(errMsg);
      }

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Aucune réponse reçue.',
        timestamp: Date.now(),
        modelUsed: data.modelUsed || selectedModel,
        groundingMetadata: data.groundingMetadata,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Erreur chat Gemini:', err);
      setErrorMessage(
        err.message || 'Impossible de contacter l\'assistant Gemini. Veuillez vérifier votre connexion.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Effacer l\'historique des échanges avec Gemini ?')) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: 'Historique réinitialisé. Comment puis-je vous aider ?',
          timestamp: Date.now(),
          modelUsed: selectedModel,
        },
      ]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-140px)] min-h-[620px] gap-4">
      {/* Barre d'état supérieure et sélecteurs de modèle/rôle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-100">
                Copilote Maritime Gemini AI
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
                MULTI-TURN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Assistance passerelle, prévisions météo en direct, théorie solunaire & COLREGs
            </p>
          </div>
        </div>

        {/* Sélecteurs de configuration */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sélecteur de Rôle (System Instruction) */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setSelectedRole('NAVIGATOR')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedRole === 'NAVIGATOR'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Officier Navigateur et Météorologue"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Navigateur</span>
            </button>
            <button
              onClick={() => setSelectedRole('FISHERMAN')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedRole === 'FISHERMAN'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Expert Halieutique et Guide de Pêche"
            >
              <Fish className="w-3.5 h-3.5" />
              <span>Pêche</span>
            </button>
            <button
              onClick={() => setSelectedRole('ENGINEER')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-colors ${
                selectedRole === 'ENGINEER'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ingénieur Télémétrie et Systèmes"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Ingénieur</span>
            </button>
          </div>

          {/* Sélecteur de Modèle Gemini */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Général + Search Grounding (gemini-3.5-flash)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>3.5 Flash</span>
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Rapide / Faible Latence (gemini-3.1-flash-lite)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>3.1 Lite</span>
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-pro-preview')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedModel === 'gemini-3.1-pro-preview'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tâches Complexes & Raisonnement Avancé (gemini-3.1-pro-preview)"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-300" />
              <span>3.1 Pro</span>
            </button>
          </div>

          {/* Toggle Search Grounding */}
          {selectedModel === 'gemini-3.5-flash' && (
            <button
              onClick={() => setUseSearchGrounding(!useSearchGrounding)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                useSearchGrounding
                  ? 'bg-blue-950/80 text-blue-300 border-blue-500 shadow-sm'
                  : 'bg-slate-950 text-slate-500 border-slate-800'
              }`}
              title="Ancrage Google Search pour des données météo et maritimes en direct"
            >
              <Search className={`w-3.5 h-3.5 ${useSearchGrounding ? 'text-blue-400 animate-spin' : ''}`} />
              <span>Search Grounding</span>
              {useSearchGrounding && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          )}

          {/* Toggle Télémétrie de bord */}
          <button
            onClick={() => setIncludeTelemetry(!includeTelemetry)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              includeTelemetry
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-sm'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Injecte la position, SOG, COG et sonde dans le contexte de la conversation"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>Télémétrie ({vessel.sog.toFixed(1)}kts)</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
            title="Effacer la conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Raccourcis de questions maritimes en accès rapide */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Suggestions :
        </span>
        {PRESET_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSelectedModel(p.model as any);
              setUseSearchGrounding(p.search);
              setSelectedRole(p.role);
              handleSendMessage(p.prompt);
            }}
            disabled={isLoading}
            className="text-xs bg-slate-900/90 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-800 hover:border-cyan-700/60 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5"
          >
            {p.search && <Globe className="w-3 h-3 text-blue-400" />}
            {p.label}
          </button>
        ))}
      </div>

      {/* Fil de discussion défilable (Messages Thread) */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-4 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-100 rounded-bl-sm'
                }`}
              >
                {/* En-tête de message */}
                <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/10 pb-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    {isUser ? (
                      <span className="font-semibold text-cyan-100">Passerelle (Vous)</span>
                    ) : (
                      <>
                        <span className="font-semibold text-cyan-400 flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" />
                          Gemini Assistant
                        </span>
                        {msg.modelUsed && (
                          <span className="font-mono text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                            {msg.modelUsed}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <button
                      onClick={() => handleCopyText(msg.id, msg.content)}
                      className="hover:text-white transition-colors"
                      title="Copier le message"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Corps de texte */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>

                {/* Bloc Search Grounding (Sources et requêtes Google Search) */}
                {msg.groundingMetadata && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    {msg.groundingMetadata.webSearchQueries &&
                      msg.groundingMetadata.webSearchQueries.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-blue-400">
                            <Search className="w-3 h-3" /> Requêtes Google :
                          </span>
                          {msg.groundingMetadata.webSearchQueries.map((q, qIdx) => (
                            <span
                              key={qIdx}
                              className="bg-blue-950/60 border border-blue-800/60 text-blue-300 px-2 py-0.5 rounded-md font-mono text-[10px]"
                            >
                              "{q}"
                            </span>
                          ))}
                        </div>
                      )}

                    {msg.groundingMetadata.groundingChunks &&
                      msg.groundingMetadata.groundingChunks.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider flex items-center gap-1">
                            <Globe className="w-3 h-3 text-emerald-400" /> Sources vérifiées en direct :
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.groundingMetadata.groundingChunks.map(
                              (chunk, cIdx) => {
                                if (!chunk.web) return null;
                                return (
                                  <a
                                    key={cIdx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition-colors max-w-xs truncate"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                    <span className="truncate">
                                      {chunk.web.title || chunk.web.uri}
                                    </span>
                                  </a>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Indicateur de chargement / réflexion */}
        {isLoading && (
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 text-slate-300 px-4 py-3 rounded-2xl max-w-md animate-pulse">
            <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <div className="text-xs">
              <span className="font-semibold text-cyan-400">Gemini analyse votre requête</span>
              <span className="text-slate-400">
                {useSearchGrounding ? ' (interrogation Google Search en cours...)' : '...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message d'erreur éventuel */}
      {errorMessage && (
        <div className="bg-red-950/80 border border-red-500/60 text-red-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-white font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Zone de saisie du message */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 shadow-xl flex items-center gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={
            useSearchGrounding
              ? "Posez une question météo, route ou sécurité (Google Search activé)..."
              : "Interrogez l'assistant de quart Gemini..."
          }
          disabled={isLoading}
          className="flex-1 bg-slate-950 text-slate-100 text-sm px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 font-sans"
        />

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
            !inputPrompt.trim() || isLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/40 cursor-pointer active:scale-95'
          }`}
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Envoyer</span>
        </button>
      </form>
    </div>
  );
};
