import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { EventEmitter } from 'events';
import { arduinoDataSchema, type ArduinoData } from '@shared/schema';
import { storage } from '../storage';

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
}

export class SerialService extends EventEmitter {
  private port: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private isConnected = false;
  private currentPortPath: string | null = null;
  private simulationMode = false;
  private simulationTimer: NodeJS.Timeout | null = null;
  private simulationSessionId: string | null = null;
  private simulationExerciseType = 0;

  constructor() {
    super();
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        vendorId: port.vendorId,
        productId: port.productId,
      }));
    } catch (error) {
      console.error('Error listing serial ports:', error);
      return [];
    }
  }

  async connect(portPath: string, baudRate: number = 9600): Promise<boolean> {
    try {
      if (this.isConnected) {
        await this.disconnect();
      }

      this.port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
      });

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

      return new Promise((resolve, reject) => {
        if (!this.port) {
          reject(new Error('Port not initialized'));
          return;
        }

        this.port.on('open', async () => {
          console.log(`Connected to Arduino on ${portPath}`);
          this.isConnected = true;
          this.currentPortPath = portPath;
          
          // Store port info in storage
          await storage.createOrUpdateSerialPort({
            path: portPath,
            isActive: true,
            lastConnected: new Date(),
          });
          
          await storage.setActiveSerialPort(portPath);
          
          this.emit('connected', portPath);
          resolve(true);
        });

        this.port.on('error', (error) => {
          console.error('Serial port error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.port.on('close', () => {
          console.log('Serial port closed');
          this.isConnected = false;
          this.currentPortPath = null;
          this.emit('disconnected');
        });

        if (this.parser) {
          this.parser.on('data', (data) => {
            this.handleArduinoData(data.toString().trim());
          });
        }
      });
    } catch (error) {
      console.error('Error connecting to serial port:', error);
      this.emit('error', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.port && this.port.isOpen) {
        this.port.close(() => {
          this.port = null;
          this.parser = null;
          this.isConnected = false;
          this.currentPortPath = null;
          resolve();
        });
      } else {
        this.port = null;
        this.parser = null;
        this.isConnected = false;
        this.currentPortPath = null;
        resolve();
      }
    });
  }

  private handleArduinoData(data: string): void {
    try {
      // Check for different types of messages from Arduino
      if (data.startsWith('KNEE_DATA:')) {
        const jsonData = data.replace('KNEE_DATA:', '');
        const parsedData = JSON.parse(jsonData);
        
        // Validate data against schema
        const validatedData = arduinoDataSchema.parse(parsedData);
        this.emit('kneeData', validatedData);
        
        // Store in database
        this.storeSensorReading(validatedData);
      } else if (data.startsWith('SESSION_STARTED:')) {
        const sessionId = data.replace('SESSION_STARTED:', '');
        this.emit('sessionStarted', sessionId);
      } else if (data === 'SESSION_STOPPED') {
        this.emit('sessionStopped');
      } else if (data === 'CALIBRATION_COMPLETE') {
        this.emit('calibrationComplete');
      } else if (data === 'SYSTEM_READY') {
        this.emit('systemReady');
      } else if (data.startsWith('STATUS:')) {
        const statusParts = data.replace('STATUS:', '').split(':');
        const status = {
          recording: statusParts[0] === 'RECORDING',
          sessionId: statusParts[1] || '',
          exerciseType: parseInt(statusParts[2]) || 0,
        };
        this.emit('status', status);
      } else {
        // Log other messages for debugging
        console.log('Arduino message:', data);
        this.emit('message', data);
      }
    } catch (error) {
      console.error('Error parsing Arduino data:', error, 'Raw data:', data);
      this.emit('parseError', { error, rawData: data });
    }
  }

  private async storeSensorReading(data: ArduinoData): Promise<void> {
    try {
      await storage.createSensorReading({
        sessionId: data.sessionId,
        timestamp: new Date(data.timestamp),
        exerciseType: data.exerciseType,
        kneeAngle: data.kneeAngle,
        temperature: data.temperature,
        rawSensorData: data.rawSensorData,
        angles: data.angles,
      });
    } catch (error) {
      console.error('Error storing sensor reading:', error);
    }
  }

  async sendCommand(command: string): Promise<boolean> {
    if (!this.port || !this.isConnected) {
      console.error('Port not connected');
      return false;
    }

    return new Promise((resolve) => {
      if (!this.port) {
        resolve(false);
        return;
      }

      this.port.write(command + '\n', (error) => {
        if (error) {
          console.error('Error sending command:', error);
          resolve(false);
        } else {
          console.log('Command sent:', command);
          resolve(true);
        }
      });
    });
  }

  async startSession(sessionId: string): Promise<boolean> {
    return this.sendCommand(`START_SESSION:${sessionId}`);
  }

  async stopSession(): Promise<boolean> {
    return this.sendCommand('STOP_SESSION');
  }

  async setExerciseType(type: number): Promise<boolean> {
    return this.sendCommand(`SET_EXERCISE:${type}`);
  }

  async calibrate(): Promise<boolean> {
    return this.sendCommand('CALIBRATE');
  }

  async getStatus(): Promise<boolean> {
    return this.sendCommand('GET_STATUS');
  }

  getConnectionStatus(): { connected: boolean; port: string | null } {
    return {
      connected: this.isConnected,
      port: this.currentPortPath,
    };
  }
}

export const serialService = new SerialService();
