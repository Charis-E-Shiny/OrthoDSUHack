import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArduinoData } from '../types/arduino';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LiveDataPanelProps {
  latestData: ArduinoData | null;
  isConnected: boolean;
}

export function LiveDataPanel({ latestData, isConnected }: LiveDataPanelProps) {
  const [kneeAngleHistory, setKneeAngleHistory] = useState<{ time: string; angle: number }[]>([]);
  const maxDataPoints = 50;

  useEffect(() => {
    if (latestData) {
      const time = new Date().toLocaleTimeString();
      setKneeAngleHistory(prev => {
        const newData = [...prev, { time, angle: latestData.kneeAngle }];
        return newData.slice(-maxDataPoints);
      });
    }
  }, [latestData]);

  const chartData = {
    labels: kneeAngleHistory.map(d => d.time),
    datasets: [
      {
        label: 'Knee Angle (°)',
        data: kneeAngleHistory.map(d => d.angle),
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsla(var(--primary), 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        beginAtZero: true,
        max: 180,
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    animation: {
      duration: 0,
    },
  };

  const formatAngle = (angle: number | undefined) => {
    if (angle === undefined || isNaN(angle)) return '0.0°';
    return `${angle.toFixed(1)}°`;
  };

  const formatTemperature = (temp: number | undefined) => {
    if (temp === undefined || isNaN(temp)) return '0.0°C';
    return `${temp.toFixed(1)}°C`;
  };

  const formatSensorValue = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return '0.000';
    return value.toFixed(3);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="card-knee-angle">
          <CardContent className="pt-6 text-center">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Knee Angle</h3>
            <div className="text-3xl font-bold text-primary" data-testid="text-knee-angle">
              {formatAngle(latestData?.kneeAngle)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: 90-120°</p>
          </CardContent>
        </Card>

        <Card data-testid="card-temperature">
          <CardContent className="pt-6 text-center">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Temperature</h3>
            <div className="text-3xl font-bold text-orange-600" data-testid="text-temperature">
              {formatTemperature(latestData?.temperature)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Normal range</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-real-time-data">
        <CardHeader>
          <CardTitle>Real-time Sensor Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Roll</h4>
              <div className="text-xl font-semibold text-blue-600" data-testid="text-roll">
                {formatAngle(latestData?.angles.roll)}
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Pitch</h4>
              <div className="text-xl font-semibold text-green-600" data-testid="text-pitch">
                {formatAngle(latestData?.angles.pitch)}
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Yaw</h4>
              <div className="text-xl font-semibold text-orange-600" data-testid="text-yaw">
                {formatAngle(latestData?.angles.yaw)}
              </div>
            </div>
          </div>

          <div className="h-64 w-full" data-testid="chart-real-time">
            {kneeAngleHistory.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border border-border">
                <div className="text-center text-muted-foreground">
                  <div className="text-lg mb-2">📊</div>
                  <p>Real-time Knee Angle Chart</p>
                  <p className="text-xs">
                    {isConnected ? 'Waiting for data...' : 'Connect Arduino to view live data'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-raw-sensor-data">
        <CardHeader>
          <CardTitle>Raw Sensor Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Accelerometer (g)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>X:</span>
                  <span className="font-mono" data-testid="text-accel-x">
                    {formatSensorValue(latestData?.rawSensorData.accelX)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Y:</span>
                  <span className="font-mono" data-testid="text-accel-y">
                    {formatSensorValue(latestData?.rawSensorData.accelY)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Z:</span>
                  <span className="font-mono" data-testid="text-accel-z">
                    {formatSensorValue(latestData?.rawSensorData.accelZ)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Gyroscope (°/s)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>X:</span>
                  <span className="font-mono" data-testid="text-gyro-x">
                    {formatSensorValue(latestData?.rawSensorData.gyroX)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Y:</span>
                  <span className="font-mono" data-testid="text-gyro-y">
                    {formatSensorValue(latestData?.rawSensorData.gyroY)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Z:</span>
                  <span className="font-mono" data-testid="text-gyro-z">
                    {formatSensorValue(latestData?.rawSensorData.gyroZ)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
