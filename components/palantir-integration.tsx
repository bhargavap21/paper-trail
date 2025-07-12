'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fetchTextClips, type Osdk, type TextClip } from '@/lib/palantir-client';

export default function PalantirIntegration() {
  const [textClips, setTextClips] = useState<Osdk.Instance<TextClip>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchTextClips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clips = await fetchTextClips(10);
      setTextClips(clips);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch TextClips');
      console.error('Error fetching TextClips:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Palantir Foundry Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleFetchTextClips} 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? 'Loading...' : 'Fetch TextClips'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {textClips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">TextClips ({textClips.length})</h3>
              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {textClips.map((clip, index) => (
                  <Card key={index} className="p-3">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(clip, null, 2)}
                    </pre>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!loading && textClips.length === 0 && !error && (
            <p className="text-gray-500">Click "Fetch TextClips" to load data from Palantir Foundry</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 