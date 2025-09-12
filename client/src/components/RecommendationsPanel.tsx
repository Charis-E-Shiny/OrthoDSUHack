import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Recommendation } from '@shared/schema';
import { RefreshCw, Loader2, TrendingUp, Target, Activity } from 'lucide-react';

interface RecommendationsPanelProps {
  currentSessionId: string | null;
  sessionStats: {
    duration: number;
    readingCount: number;
    maxAngle: number;
    avgAngle: number;
    qualityScore?: number;
  } | null;
}

export function RecommendationsPanel({ currentSessionId, sessionStats }: RecommendationsPanelProps) {
  const { data: recommendations = [], isLoading } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations', currentSessionId],
    enabled: !!currentSessionId,
  });

  const { data: allRecommendations = [] } = useQuery<Recommendation[]>({
    queryKey: ['/api/recommendations'],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/recommendations/refresh', {
        sessionId: currentSessionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      toast({
        title: "Recommendations Updated",
        description: "Fresh recommendations received from n8n",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Refresh",
        description: "Could not get new recommendations from n8n",
        variant: "destructive",
      });
    },
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'increase_range':
        return <TrendingUp className="w-4 h-4" />;
      case 'hold_position':
        return <Target className="w-4 h-4" />;
      case 'gentle_extension':
        return <Activity className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'increase_range':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'hold_position':
        return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'gentle_extension':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getRecommendationTextColor = (type: string) => {
    switch (type) {
      case 'increase_range':
        return 'text-green-700 dark:text-green-400';
      case 'hold_position':
        return 'text-orange-700 dark:text-orange-400';
      case 'gentle_extension':
        return 'text-blue-700 dark:text-blue-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  const displayRecommendations = currentSessionId ? recommendations : allRecommendations.slice(0, 3);

  return (
    <div className="space-y-6">
      <Card data-testid="card-recommendations">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Exercise Recommendations</CardTitle>
            <Button
              onClick={() => refreshMutation.mutate()}
              disabled={!currentSessionId || refreshMutation.isPending}
              size="sm"
              variant="outline"
              data-testid="button-refresh-recommendations"
            >
              {refreshMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">From n8n Analysis</div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3 bg-muted/20 rounded-lg animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : displayRecommendations.length > 0 ? (
            <div className="space-y-4" data-testid="recommendations-list">
              {displayRecommendations.map((recommendation) => (
                <div
                  key={recommendation.id}
                  className={`p-3 border rounded-lg ${getRecommendationColor(recommendation.type)}`}
                  data-testid={`recommendation-${recommendation.type}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 ${getRecommendationTextColor(recommendation.type)}`}>
                      {getRecommendationIcon(recommendation.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium text-sm mb-1 ${getRecommendationTextColor(recommendation.type)}`}>
                        {recommendation.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {recommendation.description}
                      </p>
                      {recommendation.progress !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Progress</span>
                          <span className="text-xs font-medium">{recommendation.progress}%</span>
                        </div>
                      )}
                      {recommendation.progress !== null && (
                        <Progress value={recommendation.progress || 0} className="w-full h-1.5 mt-1" />
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <span className="text-xs font-medium capitalize">{recommendation.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recommendations available</p>
              <p className="text-xs">
                {currentSessionId ? 'Start recording to get personalized recommendations' : 'Connect and start a session'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {sessionStats && (
        <Card data-testid="card-session-progress">
          <CardHeader>
            <CardTitle>Session Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium" data-testid="text-session-duration">
                    {formatDuration(sessionStats.duration)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Readings</span>
                  <span className="font-medium" data-testid="text-reading-count">
                    {sessionStats.readingCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Max Angle</span>
                  <span className="font-medium" data-testid="text-max-angle">
                    {sessionStats.maxAngle.toFixed(1)}°
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Avg Angle</span>
                  <span className="font-medium" data-testid="text-avg-angle">
                    {sessionStats.avgAngle.toFixed(1)}°
                  </span>
                </div>
              </div>

              {sessionStats.qualityScore && (
                <div className="pt-3 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-2">Quality Score</h4>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Overall</span>
                    <span className="text-xs font-medium text-green-600" data-testid="text-quality-score">
                      {sessionStats.qualityScore.toFixed(1)}/10
                    </span>
                  </div>
                  <Progress value={sessionStats.qualityScore * 10} className="w-full h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-database-status">
        <CardHeader>
          <CardTitle>Database Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MongoDB</span>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-xs font-medium text-green-600">Connected</span>
              </div>
            </div>

            {sessionStats && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Records Saved</span>
                <span className="text-xs font-medium" data-testid="text-records-saved">
                  {sessionStats.readingCount}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-xs font-medium">Live</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
