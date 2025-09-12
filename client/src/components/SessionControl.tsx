import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ExerciseTypes } from '../types/arduino';
import { Loader2, Play, Square, Settings } from 'lucide-react';

interface SessionControlProps {
  isConnected: boolean;
  onSessionStart?: (sessionId: string) => void;
  onSessionStop?: () => void;
}

export function SessionControl({ isConnected, onSessionStart, onSessionStop }: SessionControlProps) {
  const [sessionId, setSessionId] = useState(`REHAB_${Date.now()}`);
  const [exerciseType, setExerciseType] = useState<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/arduino/start-session', { sessionId });
      return response.json();
    },
    onSuccess: () => {
      setIsRecording(true);
      onSessionStart?.(sessionId);
      toast({
        title: "Session Started",
        description: `Recording session: ${sessionId}`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to Start Session",
        description: "Could not start the recording session",
        variant: "destructive",
      });
    },
  });

  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/arduino/stop-session');
      return response.json();
    },
    onSuccess: () => {
      setIsRecording(false);
      onSessionStop?.();
      toast({
        title: "Session Stopped",
        description: "Recording session has been stopped",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Stop Session",
        description: "Could not stop the recording session",
        variant: "destructive",
      });
    },
  });

  const setExerciseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/arduino/set-exercise', { type: exerciseType });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Exercise Type Set",
        description: `Exercise type set to: ${ExerciseTypes[exerciseType as keyof typeof ExerciseTypes]}`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to Set Exercise Type",
        description: "Could not set the exercise type",
        variant: "destructive",
      });
    },
  });

  const calibrateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/arduino/calibrate');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Calibration Started",
        description: "Keep the sensor still during calibration",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Start Calibration",
        description: "Could not start sensor calibration",
        variant: "destructive",
      });
    },
  });

  const handleStartSession = () => {
    if (!sessionId.trim()) {
      toast({
        title: "Session ID Required",
        description: "Please enter a session ID",
        variant: "destructive",
      });
      return;
    }
    startSessionMutation.mutate();
  };

  const handleStopSession = () => {
    stopSessionMutation.mutate();
  };

  const handleSetExercise = () => {
    setExerciseMutation.mutate();
  };

  const handleCalibrate = () => {
    calibrateMutation.mutate();
  };

  const generateSessionId = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    setSessionId(`REHAB_${timestamp}`);
  };

  return (
    <Card data-testid="session-control-panel">
      <CardHeader>
        <CardTitle>Session Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Exercise Type
          </label>
          <Select value={exerciseType.toString()} onValueChange={(value) => setExerciseType(parseInt(value))} disabled={!isConnected}>
            <SelectTrigger data-testid="select-exercise-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Knee Flexion</SelectItem>
              <SelectItem value="1">Knee Extension</SelectItem>
              <SelectItem value="2">Lateral Movement</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleSetExercise}
            disabled={!isConnected || setExerciseMutation.isPending}
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            data-testid="button-set-exercise"
          >
            {setExerciseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Set Exercise Type
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Session ID
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter session ID"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={!isConnected || isRecording}
              data-testid="input-session-id"
            />
            <Button
              onClick={generateSessionId}
              disabled={!isConnected || isRecording}
              variant="outline"
              size="sm"
              data-testid="button-generate-session-id"
            >
              Auto
            </Button>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleStartSession}
            disabled={!isConnected || isRecording || startSessionMutation.isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            data-testid="button-start-session"
          >
            {startSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
          <Button
            onClick={handleStopSession}
            disabled={!isConnected || !isRecording || stopSessionMutation.isPending}
            variant="destructive"
            className="flex-1"
            data-testid="button-stop-session"
          >
            {stopSessionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>

        <Button
          onClick={handleCalibrate}
          disabled={!isConnected || calibrateMutation.isPending}
          variant="outline"
          className="w-full"
          data-testid="button-calibrate"
        >
          {calibrateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Settings className="w-4 h-4 mr-2" />
          Calibrate Sensor
        </Button>

        {isRecording && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-400" data-testid="text-recording-status">
                Recording session: {sessionId}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
