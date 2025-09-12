import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getStorage } from "./storage";
import { serialService } from "./services/serialService";
import { n8nService } from "./services/n8nService";
import { insertSessionSchema, insertSensorReadingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serial port routes
  app.get("/api/serial/ports", async (req, res) => {
    try {
      const ports = await serialService.listPorts();
      const storedPorts = await (await getStorage()).getSerialPorts();
      
      // Merge real ports with stored port info
      const enhancedPorts = ports.map(port => {
        const stored = storedPorts.find(sp => sp.path === port.path);
        return {
          ...port,
          isActive: stored?.isActive || false,
          lastConnected: stored?.lastConnected || null,
        };
      });
      
      res.json(enhancedPorts);
    } catch (error) {
      res.status(500).json({ error: "Failed to list serial ports" });
    }
  });

  app.post("/api/serial/connect", async (req, res) => {
    try {
      const { path, baudRate = 9600 } = req.body;
      if (!path) {
        return res.status(400).json({ error: "Port path is required" });
      }

      const success = await serialService.connect(path, baudRate);
      if (success) {
        res.json({ success: true, message: "Connected to Arduino" });
      } else {
        res.status(500).json({ error: "Failed to connect to Arduino" });
      }
    } catch (error) {
      res.status(500).json({ error: "Connection failed" });
    }
  });

  app.post("/api/serial/disconnect", async (req, res) => {
    try {
      await serialService.disconnect();
      res.json({ success: true, message: "Disconnected from Arduino" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  app.get("/api/serial/status", async (req, res) => {
    const status = serialService.getConnectionStatus();
    const n8nConnected = n8nService.getConnectionStatus();
    
    res.json({
      arduino: status,
      n8n: { connected: n8nConnected },
    });
  });

  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      const session = await (await getStorage()).createSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid session data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const { limit } = req.query;
      const sessions = await (await getStorage()).getRecentSessions(limit ? parseInt(limit as string) : undefined);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await (await getStorage()).getSessionBySessionId(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await (await getStorage()).updateSession(id, req.body);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // Sensor reading routes
  app.get("/api/sensor-readings", async (req, res) => {
    try {
      const { sessionId, limit } = req.query;
      
      if (sessionId) {
        const readings = await (await getStorage()).getSensorReadingsBySession(sessionId as string);
        res.json(readings);
      } else {
        const readings = await (await getStorage()).getRecentSensorReadings(limit ? parseInt(limit as string) : undefined);
        res.json(readings);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get sensor readings" });
    }
  });

  // Recommendation routes
  app.get("/api/recommendations", async (req, res) => {
    try {
      const { sessionId } = req.query;
      
      if (sessionId) {
        const recommendations = await (await getStorage()).getRecommendationsBySession(sessionId as string);
        res.json(recommendations);
      } else {
        const recommendations = await (await getStorage()).getRecentRecommendations();
        res.json(recommendations);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  app.post("/api/recommendations/refresh", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const recommendations = await n8nService.requestRecommendations(sessionId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh recommendations" });
    }
  });

  // Arduino command routes
  app.post("/api/arduino/start-session", async (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const success = await serialService.startSession(sessionId);
      if (success) {
        res.json({ success: true, message: "Session started" });
      } else {
        res.status(500).json({ error: "Failed to start session" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start session" });
    }
  });

  app.post("/api/arduino/stop-session", async (req, res) => {
    try {
      const success = await serialService.stopSession();
      if (success) {
        res.json({ success: true, message: "Session stopped" });
      } else {
        res.status(500).json({ error: "Failed to stop session" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stop session" });
    }
  });

  app.post("/api/arduino/set-exercise", async (req, res) => {
    try {
      const { type } = req.body;
      if (type === undefined) {
        return res.status(400).json({ error: "Exercise type is required" });
      }

      const success = await serialService.setExerciseType(type);
      if (success) {
        res.json({ success: true, message: "Exercise type set" });
      } else {
        res.status(500).json({ error: "Failed to set exercise type" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to set exercise type" });
    }
  });

  app.post("/api/arduino/calibrate", async (req, res) => {
    try {
      const success = await serialService.calibrate();
      if (success) {
        res.json({ success: true, message: "Calibration started" });
      } else {
        res.status(500).json({ error: "Failed to start calibration" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start calibration" });
    }
  });

  // n8n routes
  app.post("/api/n8n/test-connection", async (req, res) => {
    try {
      const connected = await n8nService.testConnection();
      res.json({ connected });
    } catch (error) {
      res.status(500).json({ error: "Failed to test n8n connection" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    // Send current status when client connects
    const status = serialService.getConnectionStatus();
    const n8nConnected = n8nService.getConnectionStatus();
    
    ws.send(JSON.stringify({
      type: 'status',
      data: {
        arduino: status,
        n8n: { connected: n8nConnected },
      }
    }));

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Forward serial service events to WebSocket clients
  serialService.on('connected', (port) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'arduino_connected',
          data: { port }
        }));
      }
    });
  });

  serialService.on('disconnected', () => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'arduino_disconnected',
          data: {}
        }));
      }
    });
  });

  serialService.on('kneeData', async (data) => {
    // Send to n8n
    await n8nService.sendSensorData(data);

    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'knee_data',
          data
        }));
      }
    });
  });

  serialService.on('sessionStarted', (sessionId) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'session_started',
          data: { sessionId }
        }));
      }
    });
  });

  serialService.on('sessionStopped', async () => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'session_stopped',
          data: {}
        }));
      }
    });
  });

  serialService.on('calibrationComplete', () => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'calibration_complete',
          data: {}
        }));
      }
    });
  });

  serialService.on('error', (error) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'error',
          data: { message: error.message }
        }));
      }
    });
  });

  // Forward n8n service events to WebSocket clients
  n8nService.on('recommendationsReceived', (data) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'recommendations_received',
          data
        }));
      }
    });
  });

  return httpServer;
}
