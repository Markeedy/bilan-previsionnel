import React, { useState, useEffect } from 'react';
import { useNavigationStore } from './store/useNavigationStore';
import { NavigationHeader } from './components/NavigationHeader';
import { ChartPlotter } from './components/ChartPlotter';
import { AisRadar } from './components/AisRadar';
import { WeatherDashboard } from './components/WeatherDashboard';
import { SolunarDashboard } from './components/SolunarDashboard';
import { KalmanVisualizer } from './components/KalmanVisualizer';
import { SignalKMonitor } from './components/SignalKMonitor';
import { DigitalLogbook } from './components/DigitalLogbook';
import { RoutePlanner } from './components/RoutePlanner';
import { GeminiChatbot } from './components/GeminiChatbot';
import { CodeArchitectureViewer } from './components/CodeArchitectureViewer';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('CHART');
  const { simulationRunning, simulateMotionStep } = useNavigationStore();

  // Boucle de simulation dynamique du navire (1Hz)
  useEffect(() => {
    if (!simulationRunning) return;

    const interval = setInterval(() => {
      simulateMotionStep();
    }, 1000);

    return () => clearInterval(interval);
  }, [simulationRunning, simulateMotionStep]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Barre d'instruments supérieure et sélecteur d'onglets */}
      <NavigationHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenu principal selon l'onglet actif */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'CHART' && (
          <ChartPlotter onNavigateToCopilot={() => setActiveTab('COPILOT')} />
        )}
        {activeTab === 'ROUTE' && <RoutePlanner />}
        {activeTab === 'COPILOT' && <GeminiChatbot />}
        {activeTab === 'AIS' && <AisRadar />}
        {activeTab === 'LOGBOOK' && <DigitalLogbook />}
        {activeTab === 'WEATHER' && <WeatherDashboard />}
        {activeTab === 'SOLUNAR' && <SolunarDashboard />}
        {activeTab === 'KALMAN' && <KalmanVisualizer />}
        {activeTab === 'SIGNALK' && <SignalKMonitor />}
        {activeTab === 'CODE' && <CodeArchitectureViewer />}
      </main>
    </div>
  );
}
