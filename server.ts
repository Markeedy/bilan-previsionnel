import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialisation SDK Google GenAI
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY non configurée dans les variables d\'environnement');
  }
  return new GoogleGenAI({ apiKey });
};

// API Route pour le Chat Maritime avec Gemini et Search Grounding
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages,
      model = 'gemini-3.5-flash',
      useSearchGrounding = false,
      role = 'NAVIGATOR',
      vesselContext,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'La liste de messages est requise.' });
    }

    const ai = getGenAI();

    // Définition de la System Instruction selon le rôle sélectionné
    let roleDescription = '';
    if (role === 'NAVIGATOR') {
      roleDescription = `Tu es l'Officier Navigateur et Météorologue en chef de passerelle (NaviSeas Pro). 
Tu es expert en navigation hauturière et côtière, météorologie marine (AROME, GFS, houle, brises thermiques), hydrographie (S-57/S-52, bathymétrie, balisage AISM/IALA Région A) et sécurité maritime (COLREGs/RIPAM).
Tu fournis des réponses précises, sécurisantes, opérationnelles et professionnelles aux gens de mer.
Quand la recherche Google est activée, utilise-la pour obtenir les derniers avis météo marine (BMS), avis aux navigateurs (AVURNAV), marées et actualités maritimes en temps réel.`;
    } else if (role === 'FISHERMAN') {
      roleDescription = `Tu es l'Expert Halieutique & Guide de Pêche Spécialisé NaviSeas Pro.
Tu maîtrises la Théorie Solunaire de John Alden Knight, les cycles lunaires synodiques, les transitions lumineuses crépusculaires, l'impact de la pression barométrique et des courants marins sur l'activité trophique des poissons (dorades, bars, thonidés, céphalopodes, mérous).
Conseille le capitaine sur les meilleures techniques de pêche, créneaux horaires majeurs/mineurs, choix des leurres/appâts et zones bathymétriques optimales (tombants, hauts-fonds).`;
    } else if (role === 'ENGINEER') {
      roleDescription = `Tu es l'Ingénieur Systèmes Maritimes & Télémétrie (NMEA 2000, Signal K, AIS, Filtre de Kalman EKF).
Tu expliques les protocoles navals, le décodage AIVDM 6-bits, les calculs géodésiques de CPA/TCPA, l'optimisation des flux de télémétrie et la cinématique des capteurs.`;
    } else {
      roleDescription = `Tu es l'Assistant Maritime Intelligent NaviSeas Pro. Tu aides l'équipage dans toutes les phases de navigation et de pêche.`;
    }

    // Injection de la télémétrie en temps réel si disponible
    let telemetryPrompt = '';
    if (vesselContext) {
      telemetryPrompt = `\n\n[CONTEXTE DE TÉLÉMÉTRIE DU NAVIRE EN DIRECT]
- Position actuelle : Lat ${vesselContext.latitude?.toFixed(4)}°, Lon ${vesselContext.longitude?.toFixed(4)}°
- Vitesse sur le Fond (SOG) : ${vesselContext.sog?.toFixed(1)} nœuds
- Route sur le Fond (COG) : ${Math.round(vesselContext.cog || 0)}°
- Sonde sous la quille : ${vesselContext.depthBelowKeel?.toFixed(1)} m (Tirant d'eau : ${vesselContext.boatDraft || 2.0} m)
- Zone : Baie de Khemisti - Tipaza (Méditerranée)
- Cibles AIS détectées à proximité : ${vesselContext.aisCount || 0} navires
- Route active : ${vesselContext.activeRouteName || 'Aucune'} (Waypoints : ${vesselContext.waypointCount || 0})`;
    }

    const fullSystemInstruction = `${roleDescription}${telemetryPrompt}`;

    // Formatage de l'historique des messages pour @google/genai
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Configuration des outils
    // Search Grounding est supporté avec gemini-3.5-flash
    const tools: any[] = [];
    if (useSearchGrounding || model === 'gemini-3.5-flash') {
      tools.push({ googleSearch: {} });
    }

    const config: any = {
      systemInstruction: fullSystemInstruction,
    };

    if (tools.length > 0) {
      config.tools = tools;
    }

    // Appel à l'API Gemini
    const response = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const responseText = response.text || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    res.json({
      text: responseText,
      groundingMetadata: groundingMetadata || null,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error('Erreur API Gemini /api/chat:', error);
    res.status(500).json({
      error: error?.message || 'Erreur lors de la communication avec l\'assistant Gemini.',
    });
  }
});

// En développement, monter les middlewares Vite
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // En production, servir le build statique
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur NaviSeas Pro démarré sur http://0.0.0.0:${PORT}`);
});
