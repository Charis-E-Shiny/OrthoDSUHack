import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ConnectionPanel } from '../components/ConnectionPanel';
import { SessionControl } from '../components/SessionControl';
import { LiveDataPanel } from '../components/LiveDataPanel';
import { RecommendationsPanel } from '../components/RecommendationsPanel';
import { HistoricalDataPanel } from '../components/HistoricalDataPanel';
import { useWebSocket } from '../hooks/useWebSocket';
import { ArduinoData, ConnectionStatus } from '../types/arduino';
import { Wifi, WifiOff, Activity } from 'lucide-react';

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [n8nConnected, setN8nConnected] = useState(false);
  const [latestData, setLatestData] = useState<ArduinoData | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState<{
    duration: number;
    readingCount: number;
    maxAngle: number;
    avgAngle: number;
    qualityScore?: number;
  } | null>(null);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'status':
          const status = lastMessage.data as ConnectionStatus;
          setIsConnected(status.arduino.connected);
          setN8nConnected(status.n8n.connected);
          break;

        case 'arduino_connected':
          setIsConnected(true);
          break;

        case 'arduino_disconnected':
          setIsConnected(false);
          setLatestData(null);
          break;

        case 'knee_data':
          const data = lastMessage.data as ArduinoData;
          setLatestData(data);
          updateSessionStats(data);
          break;

        case 'session_started':
          setCurrentSessionId(lastMessage.data.sessionId);
          setSessionStartTime(Date.now());
          setSessionStats({
            duration: 0,
            readingCount: 0,
            maxAngle: 0,
            avgAngle: 0,
          });
          break;

        case 'session_stopped':
          setCurrentSessionId(null);
          setSessionStartTime(null);
          setSessionStats(null);
          break;

        case 'error':
          console.error('Arduino error:', lastMessage.data.message);
          break;
      }
    }
  }, [lastMessage]);

  const updateSessionStats = (data: ArduinoData) => {
    if (!sessionStartTime) return;

    setSessionStats(prev => {
      if (!prev) return null;

      const duration = Date.now() - sessionStartTime;
      const readingCount = prev.readingCount + 1;
      const maxAngle = Math.max(prev.maxAngle, data.kneeAngle);
      const avgAngle = (prev.avgAngle * prev.readingCount + data.kneeAngle) / readingCount;

      // Simple quality score calculation based on consistency and range of motion
      const targetRange = 90; // Target knee angle
      const angleScore = Math.max(0, 10 - Math.abs(data.kneeAngle - targetRange) / 10);
      const qualityScore = Math.min(10, (angleScore + (prev.qualityScore || 0)) / 2);

      return {
        duration,
        readingCount,
        maxAngle,
        avgAngle,
        qualityScore,
      };
    });
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected);
    if (!connected) {
      setLatestData(null);
      setCurrentSessionId(null);
      setSessionStartTime(null);
      setSessionStats(null);
    }
  };

  const handleSessionStart = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSessionStartTime(Date.now());
    setSessionStats({
      duration: 0,
      readingCount: 0,
      maxAngle: 0,
      avgAngle: 0,
    });
  };

  const handleSessionStop = () => {
    setCurrentSessionId(null);
    setSessionStartTime(null);
    setSessionStats(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  Knee Rehabilitation Monitor
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-muted-foreground" data-testid="text-arduino-connection-status">
                  Arduino {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${n8nConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium text-muted-foreground" data-testid="text-n8n-connection-status">
                  n8n {n8nConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Connection and Session Controls */}
          <div className="lg:col-span-1 space-y-6">
            <ConnectionPanel onConnectionChange={handleConnectionChange} />
            <SessionControl
              isConnected={isConnected}
              onSessionStart={handleSessionStart}
              onSessionStop={handleSessionStop}
            />
          </div>

          {/* Middle Column - Live Data */}
          <div className="lg:col-span-2">
            <LiveDataPanel
              latestData={latestData}
              isConnected={isConnected}
            />
          </div>

          {/* Right Column - Recommendations and Progress */}
          <div className="lg:col-span-1">
            <RecommendationsPanel
              currentSessionId={currentSessionId}
              sessionStats={sessionStats}
            />
          </div>
        </div>

        {/* Bottom Section - Historical Data */}
        <div className="mt-8">
          <HistoricalDataPanel />
        </div>
      </div>
    </div>
  );
}
