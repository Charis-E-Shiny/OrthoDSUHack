import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Session, SensorReading } from '@shared/schema';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { TrendingUp, Clock, Target } from 'lucide-react';

interface HistoricalDataPanelProps {}

export function HistoricalDataPanel({}: HistoricalDataPanelProps) {
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['/api/sessions'],
  });

  const { data: recentReadings = [] } = useQuery<SensorReading[]>({
    queryKey: ['/api/sensor-readings'],
  });

  const last7DaysSessions = sessions.filter(session => {
    const sessionDate = new Date(session.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return sessionDate >= sevenDaysAgo;
  });

  const getWeeklySummary = () => {
    const totalTime = last7DaysSessions.reduce((sum, session) => {
      if (session.endTime && session.startTime) {
        return sum + (new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
      }
      return sum;
    }, 0);

    const avgImprovement = last7DaysSessions.reduce((sum, session) => {
      return sum + (session.maxAngle || 0);
    }, 0) / last7DaysSessions.length;

    return {
      sessionCount: last7DaysSessions.length,
      totalTime: Math.round(totalTime / (1000 * 60)), // Convert to minutes
      avgImprovement: avgImprovement || 0,
    };
  };

  const getBestPerformance = () => {
    const bestSession = sessions.reduce((best, current) => {
      if (!best || (current.maxAngle || 0) > (best.maxAngle || 0)) {
        return current;
      }
      return best;
    }, null as Session | null);

    return bestSession;
  };

  const progressData = {
    labels: last7DaysSessions.map(session => 
      new Date(session.createdAt).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Max Knee Angle (°)',
        data: last7DaysSessions.map(session => session.maxAngle || 0),
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsla(var(--primary), 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'hsl(var(--primary))',
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
        callbacks: {
          title: (context) => {
            return `Session: ${context[0]?.label}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'hsl(var(--border))',
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
        },
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
  };

  const weeklySummary = getWeeklySummary();
  const bestPerformance = getBestPerformance();
  const goalProgress = Math.min((weeklySummary.avgImprovement / 120) * 100, 100); // Assuming 120° is the goal

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card data-testid="card-historical-data">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Historical Analysis</CardTitle>
          <Select defaultValue="7days">
            <SelectTrigger className="w-40" data-testid="select-time-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-80 w-full" data-testid="chart-progress-trend">
              {last7DaysSessions.length > 0 ? (
                <Line data={progressData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border border-border">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">Progress Trend Chart</p>
                    <p className="text-sm">No session data available for the selected period</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-lg" data-testid="card-weekly-summary">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Weekly Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions:</span>
                  <span className="font-medium" data-testid="text-weekly-sessions">
                    {weeklySummary.sessionCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Time:</span>
                  <span className="font-medium" data-testid="text-weekly-time">
                    {formatTime(weeklySummary.totalTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Max Angle:</span>
                  <span className="font-medium text-green-600" data-testid="text-weekly-improvement">
                    {weeklySummary.avgImprovement.toFixed(1)}°
                  </span>
                </div>
              </div>
            </div>

            {bestPerformance && (
              <div className="p-4 bg-secondary/50 rounded-lg" data-testid="card-best-performance">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Best Performance
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Angle:</span>
                    <span className="font-medium" data-testid="text-best-max-angle">
                      {bestPerformance.maxAngle?.toFixed(1) || 0}°
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium" data-testid="text-best-date">
                      {formatDate(new Date(bestPerformance.createdAt))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Readings:</span>
                    <span className="font-medium" data-testid="text-best-duration">
                      {bestPerformance.readingCount}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-secondary/50 rounded-lg" data-testid="card-next-goal">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Next Goal
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Target Range: 100-120°</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="font-medium" data-testid="text-goal-progress">
                    {goalProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-background rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${goalProgress}%` }}
                    data-testid="progress-goal-bar"
                  ></div>
                </div>
                {goalProgress < 100 && (
                  <p className="text-xs text-muted-foreground">
                    {(120 - weeklySummary.avgImprovement).toFixed(1)}° to reach target
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
