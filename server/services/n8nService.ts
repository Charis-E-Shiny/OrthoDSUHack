import { EventEmitter } from 'events';
import { getStorage } from '../storage';
import type { ArduinoData, Recommendation } from '@shared/schema';

export interface N8nRecommendation {
  type: string;
  title: string;
  description: string;
  progress?: number;
  status: string;
  priority: number;
}

export class N8nService extends EventEmitter {
  private webhookUrl: string;
  private isConnected = false;

  constructor() {
    super();
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_URL || 'http://localhost:5678/webhook/knee-rehab';
  }

  async sendSensorData(data: ArduinoData): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'sensor_data',
          data: data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        this.isConnected = true;
        const result = await response.json();
        
        // If n8n returns recommendations, process them
        if (result.recommendations && Array.isArray(result.recommendations)) {
          await this.processRecommendations(data.sessionId, result.recommendations);
        }
        
        this.emit('dataSent', { success: true, data });
      } else {
        this.isConnected = false;
        console.error('Failed to send data to n8n:', response.statusText);
        this.emit('error', new Error(`n8n webhook failed: ${response.statusText}`));
      }
    } catch (error) {
      this.isConnected = false;
      console.error('Error sending data to n8n:', error);
      this.emit('error', error);
    }
  }

  async requestRecommendations(sessionId: string): Promise<Recommendation[]> {
    try {
      // Get recent sensor readings for this session
      const storage = await getStorage();
      const readings = await storage.getSensorReadingsBySession(sessionId);
      const session = await storage.getSessionBySessionId(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'recommendation_request',
          sessionId: sessionId,
          exerciseType: session.exerciseType,
          readings: readings.slice(-50), // Send last 50 readings
          sessionStats: {
            maxAngle: session.maxAngle,
            avgAngle: session.avgAngle,
            readingCount: session.readingCount,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        this.isConnected = true;
        const result = await response.json();
        
        if (result.recommendations && Array.isArray(result.recommendations)) {
          return await this.processRecommendations(sessionId, result.recommendations);
        }
      } else {
        this.isConnected = false;
        console.error('Failed to get recommendations from n8n:', response.statusText);
      }
    } catch (error) {
      this.isConnected = false;
      console.error('Error requesting recommendations from n8n:', error);
      this.emit('error', error);
    }

    return [];
  }

  private async processRecommendations(sessionId: string, n8nRecommendations: N8nRecommendation[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const storage = await getStorage();

    for (const rec of n8nRecommendations) {
      try {
        const recommendation = await storage.createRecommendation({
          sessionId: sessionId,
          type: rec.type,
          title: rec.title,
          description: rec.description,
          progress: rec.progress || null,
          status: rec.status,
          priority: rec.priority,
          fromN8n: true,
        });
        
        recommendations.push(recommendation);
      } catch (error) {
        console.error('Error creating recommendation:', error);
      }
    }

    this.emit('recommendationsReceived', { sessionId, recommendations });
    return recommendations;
  }

  async sendSessionComplete(sessionId: string): Promise<void> {
    try {
      const storage = await getStorage();
      const session = await storage.getSessionBySessionId(sessionId);
      const readings = await storage.getSensorReadingsBySession(sessionId);

      if (!session) {
        return;
      }

      const sessionSummary = {
        sessionId: sessionId,
        exerciseType: session.exerciseType,
        duration: session.endTime && session.startTime ? 
          session.endTime.getTime() - session.startTime.getTime() : null,
        readingCount: readings.length,
        maxAngle: Math.max(...readings.map(r => r.kneeAngle)),
        avgAngle: readings.reduce((sum, r) => sum + r.kneeAngle, 0) / readings.length,
        qualityScore: session.qualityScore,
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'session_complete',
          data: sessionSummary,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        this.isConnected = true;
        console.log('Session completion sent to n8n');
      } else {
        this.isConnected = false;
        console.error('Failed to send session completion to n8n:', response.statusText);
      }
    } catch (error) {
      this.isConnected = false;
      console.error('Error sending session completion to n8n:', error);
      this.emit('error', error);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'health_check',
          timestamp: new Date().toISOString(),
        }),
      })
        .then((response) => {
          this.isConnected = response.ok;
          resolve(response.ok);
        })
        .catch(() => {
          this.isConnected = false;
          resolve(false);
        });
    });
  }
}

export const n8nService = new N8nService();
