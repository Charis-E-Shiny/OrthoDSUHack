import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const sensorReadings = pgTable("sensor_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  exerciseType: integer("exercise_type").notNull(), // 0: flexion, 1: extension, 2: lateral
  kneeAngle: real("knee_angle").notNull(),
  temperature: real("temperature").notNull(),
  rawSensorData: jsonb("raw_sensor_data").notNull(), // accelerometer and gyroscope data
  angles: jsonb("angles").notNull(), // roll, pitch, yaw
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  exerciseType: integer("exercise_type").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  isActive: boolean("is_active").default(true).notNull(),
  readingCount: integer("reading_count").default(0).notNull(),
  maxAngle: real("max_angle"),
  avgAngle: real("avg_angle"),
  qualityScore: real("quality_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  type: text("type").notNull(), // "increase_range", "hold_position", "gentle_extension"
  title: text("title").notNull(),
  description: text("description").notNull(),
  progress: real("progress"),
  status: text("status").notNull(), // "recommended", "completed", "in_progress"
  priority: integer("priority").default(1).notNull(),
  fromN8n: boolean("from_n8n").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serialPorts = pgTable("serial_ports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  path: text("path").notNull().unique(),
  manufacturer: text("manufacturer"),
  vendorId: text("vendor_id"),
  productId: text("product_id"),
  isActive: boolean("is_active").default(false).notNull(),
  lastConnected: timestamp("last_connected"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadings).omit({
  id: true,
  createdAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertSerialPortSchema = createInsertSchema(serialPorts).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertSerialPort = z.infer<typeof insertSerialPortSchema>;
export type SerialPort = typeof serialPorts.$inferSelect;

// Arduino data types based on the INO file
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
