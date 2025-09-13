import { z } from "zod";

// User schemas
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const userSchema = insertUserSchema.extend({
  id: z.string(),
});

// Sensor reading schemas
export const insertSensorReadingSchema = z.object({
  sessionId: z.string(),
  timestamp: z.date().optional(),
  exerciseType: z.number().int().min(0).max(2), // 0: flexion, 1: extension, 2: lateral
  kneeAngle: z.number(),
  temperature: z.number(),
  rawSensorData: z.object({
    accelX: z.number(),
    accelY: z.number(),
    accelZ: z.number(),
    gyroX: z.number(),
    gyroY: z.number(),
    gyroZ: z.number(),
  }),
  angles: z.object({
    roll: z.number(),
    pitch: z.number(),
    yaw: z.number(),
  }),
});

export const sensorReadingSchema = insertSensorReadingSchema.extend({
  id: z.string(),
  timestamp: z.date(),
  createdAt: z.date(),
});

// Session schemas
export const insertSessionSchema = z.object({
  sessionId: z.string(),
  exerciseType: z.number().int().min(0).max(2),
  startTime: z.date().optional(),
  endTime: z.date().nullable().optional(),
  isActive: z.boolean().optional(),
  readingCount: z.number().int().optional(),
  maxAngle: z.number().nullable().optional(),
  avgAngle: z.number().nullable().optional(),
  qualityScore: z.number().nullable().optional(),
});

export const sessionSchema = insertSessionSchema.extend({
  id: z.string(),
  startTime: z.date(),
  endTime: z.date().nullable(),
  isActive: z.boolean(),
  readingCount: z.number().int(),
  maxAngle: z.number().nullable(),
  avgAngle: z.number().nullable(),
  qualityScore: z.number().nullable(),
  createdAt: z.date(),
});

// Recommendation schemas
export const insertRecommendationSchema = z.object({
  sessionId: z.string(),
  type: z.string(), // "increase_range", "hold_position", "gentle_extension"
  title: z.string(),
  description: z.string(),
  progress: z.number().nullable().optional(),
  status: z.string(), // "recommended", "completed", "in_progress"
  priority: z.number().int().optional(),
  fromN8n: z.boolean().optional(),
});

export const recommendationSchema = insertRecommendationSchema.extend({
  id: z.string(),
  progress: z.number().nullable(),
  priority: z.number().int(),
  fromN8n: z.boolean(),
  createdAt: z.date(),
});

// Serial port schemas
export const insertSerialPortSchema = z.object({
  path: z.string(),
  manufacturer: z.string().nullable().optional(),
  vendorId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  lastConnected: z.date().nullable().optional(),
});

export const serialPortSchema = insertSerialPortSchema.extend({
  id: z.string(),
  manufacturer: z.string().nullable(),
  vendorId: z.string().nullable(),
  productId: z.string().nullable(),
  isActive: z.boolean(),
  lastConnected: z.date().nullable(),
  createdAt: z.date(),
});

// TypeScript types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;

export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = z.infer<typeof sensorReadingSchema>;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = z.infer<typeof sessionSchema>;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;

export type InsertSerialPort = z.infer<typeof insertSerialPortSchema>;
export type SerialPort = z.infer<typeof serialPortSchema>;

// Arduino data schema (for incoming sensor data)
export const arduinoDataSchema = z.object({
  sessionId: z.string(),
  timestamp: z.number(),
  exerciseType: z.number().int().min(0).max(2),
  rawSensorData: z.object({
    accelX: z.number(),
    accelY: z.number(),
    accelZ: z.number(),
    gyroX: z.number(),
    gyroY: z.number(),
    gyroZ: z.number(),
  }),
  angles: z.object({
    roll: z.number(),
    pitch: z.number(),
    yaw: z.number(),
  }),
  kneeAngle: z.number(),
  temperature: z.number(),
});

export type ArduinoData = z.infer<typeof arduinoDataSchema>;