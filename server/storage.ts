import { type User, type InsertUser, type SensorReading, type InsertSensorReading, type Session, type InsertSession, type Recommendation, type InsertRecommendation, type SerialPort, type InsertSerialPort } from "@shared/schema";
import { randomUUID } from "crypto";
import { MongoClient, Db, Collection } from "mongodb";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Sensor reading methods
  createSensorReading(reading: InsertSensorReading): Promise<SensorReading>;
  getSensorReadingsBySession(sessionId: string): Promise<SensorReading[]>;
  getRecentSensorReadings(limit?: number): Promise<SensorReading[]>;

  // Session methods
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  getSessionBySessionId(sessionId: string): Promise<Session | undefined>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined>;
  getActiveSessions(): Promise<Session[]>;
  getRecentSessions(limit?: number): Promise<Session[]>;

  // Recommendation methods
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendationsBySession(sessionId: string): Promise<Recommendation[]>;
  getRecentRecommendations(limit?: number): Promise<Recommendation[]>;

  // Serial port methods
  createOrUpdateSerialPort(port: InsertSerialPort): Promise<SerialPort>;
  getSerialPorts(): Promise<SerialPort[]>;
  getActiveSerialPort(): Promise<SerialPort | undefined>;
  setActiveSerialPort(path: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sensorReadings: Map<string, SensorReading>;
  private sessions: Map<string, Session>;
  private recommendations: Map<string, Recommendation>;
  private serialPorts: Map<string, SerialPort>;

  constructor() {
    this.users = new Map();
    this.sensorReadings = new Map();
    this.sessions = new Map();
    this.recommendations = new Map();
    this.serialPorts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createSensorReading(reading: InsertSensorReading): Promise<SensorReading> {
    const id = randomUUID();
    const sensorReading: SensorReading = {
      ...reading,
      id,
      timestamp: reading.timestamp || new Date(),
      createdAt: new Date(),
    };
    this.sensorReadings.set(id, sensorReading);
    return sensorReading;
  }

  async getSensorReadingsBySession(sessionId: string): Promise<SensorReading[]> {
    return Array.from(this.sensorReadings.values())
      .filter((reading) => reading.sessionId === sessionId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getRecentSensorReadings(limit = 100): Promise<SensorReading[]> {
    return Array.from(this.sensorReadings.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createSession(session: InsertSession): Promise<Session> {
    const id = randomUUID();
    const newSession: Session = {
      ...session,
      id,
      isActive: session.isActive ?? true,
      startTime: session.startTime || new Date(),
      endTime: session.endTime || null,
      readingCount: session.readingCount || 0,
      maxAngle: session.maxAngle || null,
      avgAngle: session.avgAngle || null,
      qualityScore: session.qualityScore || null,
      createdAt: new Date(),
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async getSessionBySessionId(sessionId: string): Promise<Session | undefined> {
    return Array.from(this.sessions.values()).find(
      (session) => session.sessionId === sessionId
    );
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const session = this.sessions.get(id);
    if (session) {
      const updatedSession = { ...session, ...updates };
      this.sessions.set(id, updatedSession);
      return updatedSession;
    }
    return undefined;
  }

  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => session.isActive
    );
  }

  async getRecentSessions(limit = 10): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = randomUUID();
    const newRecommendation: Recommendation = {
      ...recommendation,
      id,
      progress: recommendation.progress ?? null,
      priority: recommendation.priority || 1,
      fromN8n: recommendation.fromN8n ?? true,
      createdAt: new Date(),
    };
    this.recommendations.set(id, newRecommendation);
    return newRecommendation;
  }

  async getRecommendationsBySession(sessionId: string): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .filter((recommendation) => recommendation.sessionId === sessionId)
      .sort((a, b) => b.priority - a.priority);
  }

  async getRecentRecommendations(limit = 10): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createOrUpdateSerialPort(port: InsertSerialPort): Promise<SerialPort> {
    const existing = Array.from(this.serialPorts.values()).find(p => p.path === port.path);
    if (existing) {
      const updated = { ...existing, ...port, lastConnected: new Date() };
      this.serialPorts.set(existing.id, updated);
      return updated;
    }

    const id = randomUUID();
    const newPort: SerialPort = {
      ...port,
      id,
      manufacturer: port.manufacturer ?? null,
      vendorId: port.vendorId ?? null,
      productId: port.productId ?? null,
      isActive: port.isActive ?? false,
      lastConnected: port.lastConnected ?? null,
      createdAt: new Date(),
    };
    this.serialPorts.set(id, newPort);
    return newPort;
  }

  async getSerialPorts(): Promise<SerialPort[]> {
    return Array.from(this.serialPorts.values())
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  async getActiveSerialPort(): Promise<SerialPort | undefined> {
    return Array.from(this.serialPorts.values()).find(port => port.isActive);
  }

  async setActiveSerialPort(path: string): Promise<void> {
    // Deactivate all ports
    const allPorts = Array.from(this.serialPorts.values());
    for (const port of allPorts) {
      this.serialPorts.set(port.id, { ...port, isActive: false });
    }

    // Activate the specified port
    const targetPort = Array.from(this.serialPorts.values()).find(p => p.path === path);
    if (targetPort) {
      this.serialPorts.set(targetPort.id, { 
        ...targetPort, 
        isActive: true, 
        lastConnected: new Date() 
      });
    }
  }
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db: Db;
  private users: Collection<User>;
  private sensorReadings: Collection<SensorReading>;
  private sessions: Collection<Session>;
  private recommendations: Collection<Recommendation>;
  private serialPorts: Collection<SerialPort>;

  constructor(connectionString: string, dbName: string = "knee_rehabilitation") {
    this.client = new MongoClient(connectionString);
    this.db = this.client.db(dbName);
    this.users = this.db.collection<User>("users");
    this.sensorReadings = this.db.collection<SensorReading>("sensor_readings");
    this.sessions = this.db.collection<Session>("sessions");
    this.recommendations = this.db.collection<Recommendation>("recommendations");
    this.serialPorts = this.db.collection<SerialPort>("serial_ports");
  }

  async connect(): Promise<void> {
    await this.client.connect();
    console.log("Connected to MongoDB Atlas");
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log("Disconnected from MongoDB Atlas");
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const user = await this.users.findOne({ id });
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await this.users.findOne({ username });
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    await this.users.insertOne(user);
    return user;
  }

  // Sensor reading methods
  async createSensorReading(reading: InsertSensorReading): Promise<SensorReading> {
    const id = randomUUID();
    const sensorReading: SensorReading = {
      ...reading,
      id,
      timestamp: reading.timestamp || new Date(),
      createdAt: new Date(),
    };
    await this.sensorReadings.insertOne(sensorReading);
    return sensorReading;
  }

  async getSensorReadingsBySession(sessionId: string): Promise<SensorReading[]> {
    return await this.sensorReadings
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();
  }

  async getRecentSensorReadings(limit = 100): Promise<SensorReading[]> {
    return await this.sensorReadings
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Session methods
  async createSession(session: InsertSession): Promise<Session> {
    const id = randomUUID();
    const newSession: Session = {
      ...session,
      id,
      isActive: session.isActive ?? true,
      startTime: session.startTime || new Date(),
      endTime: session.endTime || null,
      readingCount: session.readingCount || 0,
      maxAngle: session.maxAngle || null,
      avgAngle: session.avgAngle || null,
      qualityScore: session.qualityScore || null,
      createdAt: new Date(),
    };
    await this.sessions.insertOne(newSession);
    return newSession;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const session = await this.sessions.findOne({ id });
    return session || undefined;
  }

  async getSessionBySessionId(sessionId: string): Promise<Session | undefined> {
    const session = await this.sessions.findOne({ sessionId });
    return session || undefined;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
    const result = await this.sessions.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );
    return result || undefined;
  }

  async getActiveSessions(): Promise<Session[]> {
    return await this.sessions.find({ isActive: true }).toArray();
  }

  async getRecentSessions(limit = 10): Promise<Session[]> {
    return await this.sessions
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Recommendation methods
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = randomUUID();
    const newRecommendation: Recommendation = {
      ...recommendation,
      id,
      progress: recommendation.progress ?? null,
      priority: recommendation.priority || 1,
      fromN8n: recommendation.fromN8n ?? true,
      createdAt: new Date(),
    };
    await this.recommendations.insertOne(newRecommendation);
    return newRecommendation;
  }

  async getRecommendationsBySession(sessionId: string): Promise<Recommendation[]> {
    return await this.recommendations
      .find({ sessionId })
      .sort({ priority: -1 })
      .toArray();
  }

  async getRecentRecommendations(limit = 10): Promise<Recommendation[]> {
    return await this.recommendations
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Serial port methods
  async createOrUpdateSerialPort(port: InsertSerialPort): Promise<SerialPort> {
    const existing = await this.serialPorts.findOne({ path: port.path });
    
    if (existing) {
      const updated = { ...existing, ...port, lastConnected: new Date() };
      await this.serialPorts.replaceOne({ path: port.path }, updated);
      return updated;
    }

    const id = randomUUID();
    const newPort: SerialPort = {
      ...port,
      id,
      manufacturer: port.manufacturer ?? null,
      vendorId: port.vendorId ?? null,
      productId: port.productId ?? null,
      isActive: port.isActive ?? false,
      lastConnected: port.lastConnected ?? null,
      createdAt: new Date(),
    };
    await this.serialPorts.insertOne(newPort);
    return newPort;
  }

  async getSerialPorts(): Promise<SerialPort[]> {
    return await this.serialPorts.find({}).sort({ path: 1 }).toArray();
  }

  async getActiveSerialPort(): Promise<SerialPort | undefined> {
    const port = await this.serialPorts.findOne({ isActive: true });
    return port || undefined;
  }

  async setActiveSerialPort(path: string): Promise<void> {
    // Deactivate all ports
    await this.serialPorts.updateMany({}, { $set: { isActive: false } });
    
    // Activate the specified port
    await this.serialPorts.updateOne(
      { path },
      { 
        $set: { 
          isActive: true, 
          lastConnected: new Date() 
        } 
      }
    );
  }
}

// Initialize storage based on environment
async function initializeStorage(): Promise<IStorage> {
  const mongoConnectionString = process.env.MONGODB_URI;
  
  if (mongoConnectionString) {
    console.log("Initializing MongoDB Atlas storage...");
    const mongoStorage = new MongoStorage(mongoConnectionString);
    try {
      await mongoStorage.connect();
      return mongoStorage;
    } catch (error) {
      console.error("Failed to connect to MongoDB Atlas:", error);
      console.log("Falling back to in-memory storage...");
      return new MemStorage();
    }
  } else {
    console.log("No MongoDB connection string found. Using in-memory storage.");
    return new MemStorage();
  }
}

// Storage instance - will be initialized when server starts
let storageInstance: IStorage | null = null;

export async function getStorage(): Promise<IStorage> {
  if (!storageInstance) {
    storageInstance = await initializeStorage();
  }
  return storageInstance;
}

// For backwards compatibility, export a storage object that will be initialized
export const storage = new MemStorage(); // This will be replaced when server starts
