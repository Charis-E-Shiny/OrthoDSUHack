import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSerialPorts, useConnectSerial, useDisconnectSerial, useSerialStatus } from '../hooks/useSerialPorts';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

interface ConnectionPanelProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function ConnectionPanel({ onConnectionChange }: ConnectionPanelProps) {
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [selectedBaudRate, setSelectedBaudRate] = useState<number>(9600);
  
  const { data: ports = [], isLoading: portsLoading } = useSerialPorts();
  const { data: status } = useSerialStatus();
  const connectMutation = useConnectSerial();
  const disconnectMutation = useDisconnectSerial();
  const { toast } = useToast();

  const isConnected = status?.arduino?.connected || false;
  const connectedPort = status?.arduino?.port;
  const n8nConnected = status?.n8n?.connected || false;

  const handleConnect = async () => {
    if (!selectedPort) {
      toast({
        title: "Error",
        description: "Please select a COM port",
        variant: "destructive",
      });
      return;
    }

    try {
      await connectMutation.mutateAsync({ path: selectedPort, baudRate: selectedBaudRate });
      toast({
        title: "Success",
        description: "Connected to Arduino successfully",
      });
      onConnectionChange?.(true);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Arduino. Please check the port and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast({
        title: "Disconnected",
        description: "Disconnected from Arduino",
      });
      onConnectionChange?.(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect from Arduino",
        variant: "destructive",
      });
    }
  };

  const formatLastConnected = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  };

  return (
    <div className="space-y-6">
      <Card data-testid="connection-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              {isConnected ? <Wifi className="w-4 h-4 text-primary-foreground" /> : <WifiOff className="w-4 h-4 text-primary-foreground" />}
            </div>
            Device Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              COM Port
            </label>
            <Select value={selectedPort} onValueChange={setSelectedPort} disabled={isConnected}>
              <SelectTrigger data-testid="select-com-port">
                <SelectValue placeholder={portsLoading ? "Loading ports..." : "Select a COM port"} />
              </SelectTrigger>
              <SelectContent>
                {ports.map((port) => (
                  <SelectItem key={port.path} value={port.path} data-testid={`port-option-${port.path}`}>
                    {port.path} {port.manufacturer && `- ${port.manufacturer}`}
                  </SelectItem>
                ))}
                {ports.length === 0 && !portsLoading && (
                  <SelectItem value="no-ports" disabled>
                    No COM ports found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Baud Rate
            </label>
            <Select value={selectedBaudRate.toString()} onValueChange={(value) => setSelectedBaudRate(parseInt(value))} disabled={isConnected}>
              <SelectTrigger data-testid="select-baud-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9600">9600</SelectItem>
                <SelectItem value="115200">115200</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={isConnected ? handleDisconnect : handleConnect}
            disabled={connectMutation.isPending || disconnectMutation.isPending || (!selectedPort && !isConnected)}
            className="w-full"
            variant={isConnected ? "destructive" : "default"}
            data-testid="button-connect-disconnect"
          >
            {(connectMutation.isPending || disconnectMutation.isPending) && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            {isConnected ? 'Disconnect Device' : 'Connect Device'}
          </Button>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Device Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arduino:</span>
                <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`} data-testid="text-arduino-status">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {connectedPort && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Port:</span>
                  <span className="font-medium" data-testid="text-connected-port">{connectedPort}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">n8n:</span>
                <span className={`font-medium ${n8nConnected ? 'text-green-600' : 'text-red-600'}`} data-testid="text-n8n-status">
                  {n8nConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
