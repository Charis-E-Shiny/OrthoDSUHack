import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getStorage } from "./storage";
import { serialService } from "./services/serialService";
import { n8nService } from "./services/n8nService";
import { insertSessionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serial port routes
  app.get("/api/serial/ports", async (req, res) => {
    try {
      const ports = await serialService.listPorts();
      const storedPorts = await (await getStorage()).getSerialPorts();
      
      const enhancedPorts = ports.map(port => {
        const stored = storedPorts.find(sp => sp.path === port.path);
        return {
          ...port,
          isActive: stored?.isActive || false,
          lastConnected: stored?.lastConnected || null,
        };
      });
      
      res.json(enhancedPorts);
    } catch {
      res.status(500).json({ error: "Failed to list serial ports" });
    }
  });

  app.post("/api/serial/connect", async (req, res) => {
    try {
      const { path, baudRate = 9600 } = req.body as { path: string; baudRate?: number };
      if (!path) {
        return res.status(400).json({ error: "Port path is required" });
      }

      const success = await serialService.connect(path, baudRate);
      if (success) {
        res.json({ success: true, message: "Connected to Arduino" });
      } else {
        res.status(500).json({ error: "Failed to connect to Arduino" });
      }
    } catch {
      res.status(500).json({ error: "Connection failed" });
    }
  });

  app.post("/api/serial/disconnect", async (req, res) => {
    try {
      await serialService.disconnect();
      res.json({ success: true, message: "Disconnected from Arduino" });
    } catch {
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
      const sessions = await (await getStorage()).getRecentSessions(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(sessions);
    } catch {
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
    } catch {
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
    } catch {
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
        const readings = await (await getStorage()).getRecentSensorReadings(
          limit ? parseInt(limit as string) : undefined
        );
        res.json(readings);
      }
    } catch {
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
    } catch {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  app.post("/api/recommendations/refresh", async (req, res) => {
    try {
      const { sessionId } = req.body as { sessionId?: string };
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const recommendations = await n8nService.requestRecommendations(sessionId);
      res.json(recommendations);
    } catch {
      res.status(500).json({ error: "Failed to refresh recommendations" });
    }
  });

  // Comprehensive n8n integration test endpoint
  app.post("/api/test/n8n-integration", async (req, res) => {
    try {
      console.log("=== N8N Integration Test Started ===");
      const storage = await getStorage();
      
      const testSessionId = `test-session-${Date.now()}`;
      console.log(`Creating test session: ${testSessionId}`);
      
      const session = await storage.createSession({
        sessionId: testSessionId,
        exerciseType: 0,
        startTime: new Date(Date.now() - 300000),
        endTime: new Date(),
        isActive: false,
        readingCount: 10,
        maxAngle: 85.0,
        avgAngle: 45.2,
        qualityScore: 0.78
      });
      
      console.log("Test session created:", session);
      
      const readings = [];
      for (let i = 0; i < 10; i++) {
        const reading = await storage.createSensorReading({
          sessionId: testSessionId,
          timestamp: new Date(Date.now() - (10 - i) * 30000),
          exerciseType: 0,
          kneeAngle: 35 + i * 5,
          temperature: 36.5 + Math.random() * 0.8,
          rawSensorData: {
            accelX: Math.random() * 2 - 1,
            accelY: Math.random() * 2 - 1,
            accelZ: 9.8 + Math.random() * 0.4,
            gyroX: Math.random() * 10 - 5,
            gyroY: Math.random() * 10 - 5,
            gyroZ: Math.random() * 10 - 5,
          },
          angles: {
            roll: Math.random() * 20 - 10,
            pitch: 35 + i * 5,
            yaw: Math.random() * 15 - 7.5,
          }
        });
        readings.push(reading);
      }
      
      console.log(`Created ${readings.length} sensor readings`);
      
      console.log("Testing n8n webhook integration...");
      console.log("Webhook URL:", process.env.N8N_WEBHOOK_URL);
      
      let recommendationResult = null;
      let webhookError: string | null = null;
      
      try {
        recommendationResult = await n8nService.requestRecommendations(testSessionId);
        console.log("N8n webhook response:", recommendationResult);
      } catch (error) {
        console.error("N8n webhook error:", error);
        webhookError = error instanceof Error ? error.message : String(error);
      }
      
      const storedRecommendations = await storage.getRecommendationsBySession(testSessionId);
      console.log("Stored recommendations:", storedRecommendations);
      
      const testResults = {
        success: true,
        message: "N8n integration test completed",
        testData: {
          sessionId: testSessionId,
          sessionCreated: !!session,
          readingsCreated: readings.length,
          webhookUrl: process.env.N8N_WEBHOOK_URL,
          webhookSuccess: !webhookError,
          webhookError: webhookError,
          webhookResponse: recommendationResult,
          storedRecommendations: storedRecommendations,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log("=== N8N Integration Test Results ===");
      console.log(JSON.stringify(testResults, null, 2));
      
      return res.json(testResults);
      
    } catch (error) {
      console.error("N8n integration test failed:", error);
      return res.status(500).json({ 
        success: false,
        error: "N8n integration test failed", 
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Arduino command routes
  app.post("/api/arduino/start-session", async (req, res) => {
    try {
      const { sessionId } = req.body as { sessionId?: string };
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      const success = await serialService.startSession(sessionId);
      if (success) {
        res.json({ success: true, message: "Session started" });
      } else {
        res.status(500).json({ error: "Failed to start session" });
      }
    } catch {
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
    } catch {
      res.status(500).json({ error: "Failed to stop session" });
    }
  });

  app.post("/api/arduino/set-exercise", async (req, res) => {
    try {
      const { type } = req.body as { type?: number };
      if (type === undefined) {
        return res.status(400).json({ error: "Exercise type is required" });
      }

      const success = await serialService.setExerciseType(type);
      if (success) {
        res.json({ success: true, message: "Exercise type set" });
      } else {
        res.status(500).json({ error: "Failed to set exercise type" });
      }
    } catch {
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
    } catch {
      res.status(500).json({ error: "Failed to start calibration" });
    }
  });

  // n8n routes
  app.post("/api/n8n/test-connection", async (req, res) => {
    try {
      const connected = await n8nService.testConnection();
      res.json({ connected });
    } catch {
      res.status(500).json({ error: "Failed to test n8n connection" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    const status = serialService.getConnectionStatus();
    const n8nConnected = n8nService.getConnectionStatus();
    
    ws.send(JSON.stringify({
      type: "status",
      data: {
        arduino: status,
        n8n: { connected: n8nConnected },
      }
    }));

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Forward serial service events
  serialService.on("connected", (port) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "arduino_connected",
          data: { port }
        }));
      }
    });
  });

  serialService.on("disconnected", () => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "arduino_disconnected",
          data: {}
        }));
      }
    });
  });

  serialService.on("kneeData", async (data) => {
    await n8nService.sendSensorData(data);

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "knee_data",
          data
        }));
      }
    });
  });

  serialService.on("sessionStarted", (sessionId) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "session_started",
          data: { sessionId }
        }));
      }
    });
  });

  serialService.on("sessionStopped", () => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "session_stopped",
          data: {}
        }));
      }
    });
  });

  serialService.on("calibrationComplete", () => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "calibration_complete",
          data: {}
        }));
      }
    });
  });

  serialService.on("error", (error) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "error",
          data: { message: error.message }
        }));
      }
    });
  });

  // Forward n8n service events
  n8nService.on("recommendationsReceived", (data) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "recommendations_received",
          data
        }));
      }
    });
  });

  return httpServer;
}
