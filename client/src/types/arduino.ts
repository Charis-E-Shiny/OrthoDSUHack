export interface ArduinoData {
  sessionId: string;
  timestamp: number;
  exerciseType: number;
  rawSensorData: {
    accelX: number;
    accelY: number;
    accelZ: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
  };
  angles: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  kneeAngle: number;
  temperature: number;
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
  isActive?: boolean;
  lastConnected?: string | null;
}

export interface ConnectionStatus {
  arduino: {
    connected: boolean;
    port: string | null;
  };
  n8n: {
    connected: boolean;
  };
}

export interface SessionStats {
  sessionId: string;
  duration: number;
  readingCount: number;
  maxAngle: number;
  avgAngle: number;
  qualityScore?: number;
}

export const ExerciseTypes = {
  0: 'Knee Flexion',
  1: 'Knee Extension', 
  2: 'Lateral Movement'
} as const;
