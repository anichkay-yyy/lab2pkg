'use client';

import { useState } from 'react';
import { FileUploader } from '@/components/FileUploader';
import { ResultsTable } from '@/components/ResultsTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageMetadata } from '@/types/image';
import { Loader2, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ImageMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    setError(null);
    setIsAnalyzing(true);
    setResults([]);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/analyze-images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze images');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResults([]);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ImageIcon className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Image Metadata Reader</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Extract detailed metadata from BMP, PNG, JPEG, GIF, TIFF, and PCX images
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Upload Section */}
          <FileUploader
            onFilesSelected={handleFilesSelected}
            disabled={isAnalyzing}
          />

          {/* Loading State */}
          {isAnalyzing && (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium">Analyzing images...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <ResultsTable results={results} />
              <div className="flex justify-center">
                <Button onClick={handleReset} variant="outline">
                  Analyze More Images
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

