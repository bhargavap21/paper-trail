'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SimilarityAnalysis {
  text1: string;
  text2: string;
  similarity: number;
  similarityPercent: string;
  connected: boolean;
  threshold: number;
  thresholdPercent: string;
}

interface SimilarityData {
  analyses: SimilarityAnalysis[];
  summary: {
    totalPairs: number;
    connectedPairs: number;
    threshold: number;
    thresholdPercent: string;
    highestSimilarity: number;
    lowestSimilarity: number;
  };
}

interface SimilarityMatrixProps {
  refreshTrigger?: number; // To force refresh when nodes change
  currentThreshold?: number; // Current similarity threshold from parent
  graphId?: string; // Graph ID to filter similarity analysis
}

export default function SimilarityMatrix({ refreshTrigger, currentThreshold = 0.5, graphId }: SimilarityMatrixProps) {
  const [similarityData, setSimilarityData] = useState<SimilarityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarityData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/memory/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: currentThreshold, graphId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSimilarityData(data);
    } catch (err) {
      console.error('Error fetching similarity data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch similarity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarityData();
  }, [refreshTrigger, currentThreshold, graphId]);

  const getSimilarityColor = (similarity: number, threshold: number) => {
    if (similarity >= threshold) {
      return 'bg-green-50 text-green-900 border-green-300';
    } else if (similarity >= threshold * 0.8) {
      return 'bg-blue-50 text-blue-900 border-blue-300';
    } else if (similarity >= threshold * 0.6) {
      return 'bg-purple-50 text-purple-900 border-purple-300';
    } else {
      return 'bg-gray-50 text-gray-900 border-gray-300';
    }
  };

  const getSimilarityBadgeStyle = (similarity: number, threshold: number) => {
    if (similarity >= threshold) {
      return 'bg-green-700 text-white border-green-700 hover:bg-green-800'; // Connected - dark green
    } else if (similarity >= threshold * 0.8) {
      return 'bg-blue-700 text-white border-blue-700 hover:bg-blue-800'; // Close - dark blue
    } else if (similarity >= threshold * 0.6) {
      return 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'; // Moderate - dark purple
    } else {
      return 'bg-gray-700 text-white border-gray-700 hover:bg-gray-800'; // Low - dark gray
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Similarity Matrix...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Calculating similarity scores...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Similarity Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <Button onClick={fetchSimilarityData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!similarityData || similarityData.analyses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Similarity Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 text-center py-8">
            No node pairs to analyze. Add more memory items to see similarity scores.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            🔍 Similarity Debug Matrix
          </CardTitle>
          <Button onClick={fetchSimilarityData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          Shows all pairwise similarity scores. Current threshold: 
          <Badge variant="secondary" className="ml-1">
            {similarityData.summary.thresholdPercent}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div>
            <div className="font-medium text-gray-700">Total Pairs</div>
            <div className="text-lg font-bold">{similarityData.summary.totalPairs}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Connected</div>
            <div className="text-lg font-bold text-green-600">
              {similarityData.summary.connectedPairs}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Highest Score</div>
            <div className="text-sm font-bold text-blue-600">
              {(similarityData.summary.highestSimilarity * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Lowest Score</div>
            <div className="text-sm font-bold text-red-600">
              {(similarityData.summary.lowestSimilarity * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Legend:</div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-50 border border-green-300 rounded"></div>
              <span>≥{similarityData.summary.thresholdPercent} (Connected)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded"></div>
              <span>≥{(similarityData.summary.threshold * 80).toFixed(0)}% (Close)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-50 border border-purple-300 rounded"></div>
              <span>≥{(similarityData.summary.threshold * 60).toFixed(0)}% (Moderate)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-50 border border-gray-300 rounded"></div>
              <span>&lt;{(similarityData.summary.threshold * 60).toFixed(0)}% (Low)</span>
            </div>
          </div>
        </div>

        {/* Similarity Table */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {similarityData.analyses
            .sort((a, b) => b.similarity - a.similarity) // Sort by highest similarity first
            .map((analysis, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border ${getSimilarityColor(analysis.similarity, analysis.threshold)}`}
            >
              <div className="flex items-center justify-between mb-2">
                                 <div className="flex items-center gap-2">
                   <Badge className={getSimilarityBadgeStyle(analysis.similarity, analysis.threshold)}>
                     {analysis.similarityPercent}
                   </Badge>
                  {analysis.connected && (
                    <Badge variant="default" className="bg-green-600">
                      Connected
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  Rank #{index + 1}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  "{analysis.text1}"
                </div>
                <div className="text-center text-xs text-gray-500">↕</div>
                <div className="text-sm font-medium">
                  <span className="inline-block w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  "{analysis.text2}"
                </div>
              </div>
              
                             {/* Debug info */}
               <div className="mt-2 pt-2 border-t border-gray-300 text-xs text-gray-800">
                 <div className="flex justify-between font-medium">
                   <span>Raw Score: {analysis.similarity.toFixed(6)}</span>
                   <span>Threshold: {analysis.thresholdPercent}</span>
                 </div>
                 <div className="mt-1">
                   {analysis.similarity >= analysis.threshold ? (
                     <span className="text-green-700 font-bold">✓ Above threshold - Will connect</span>
                   ) : (
                     <span className="text-red-700 font-bold">✗ Below threshold - Won't connect</span>
                   )}
                 </div>
               </div>
            </div>
          ))}
        </div>

        {/* Quick insights */}
        {similarityData.analyses.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm">
            <div className="font-medium text-blue-800 mb-1">💡 Quick Insights:</div>
            <div className="text-blue-700 space-y-1">
              {similarityData.summary.connectedPairs === 0 && (
                <div>• No connections found - consider lowering threshold below {similarityData.summary.thresholdPercent}</div>
              )}
              {similarityData.summary.highestSimilarity < similarityData.summary.threshold && (
                <div>• Highest similarity ({(similarityData.summary.highestSimilarity * 100).toFixed(1)}%) is below threshold</div>
              )}
              {similarityData.analyses.filter(a => a.similarity >= similarityData.summary.threshold * 0.8 && !a.connected).length > 0 && (
                <div>• {similarityData.analyses.filter(a => a.similarity >= similarityData.summary.threshold * 0.8 && !a.connected).length} pairs are close to connecting</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 