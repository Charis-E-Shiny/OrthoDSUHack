import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SerialPortInfo } from '../types/arduino';
import { apiRequest } from '../lib/queryClient';

export function useSerialPorts() {
  return useQuery<SerialPortInfo[]>({
    queryKey: ['/api/serial/ports'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useConnectSerial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ path, baudRate = 9600 }: { path: string; baudRate?: number }) => {
      const response = await apiRequest('POST', '/api/serial/connect', { path, baudRate });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/serial'] });
    },
  });
}

export function useDisconnectSerial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/serial/disconnect');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/serial'] });
    },
  });
}

export function useSerialStatus() {
  return useQuery({
    queryKey: ['/api/serial/status'],
    refetchInterval: 2000, // Refresh every 2 seconds
  });
}
