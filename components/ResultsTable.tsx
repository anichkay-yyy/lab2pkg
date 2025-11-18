'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Download, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImageMetadata } from '@/types/image';

interface ResultsTableProps {
  results: ImageMetadata[];
}

type SortField = keyof ImageMetadata;
type SortDirection = 'asc' | 'desc';

export function ResultsTable({ results }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('filename');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  }, [results, sortField, sortDirection]);

  const exportToCSV = () => {
    const headers = [
      'Filename',
      'Width (px)',
      'Height (px)',
      'Resolution X (DPI)',
      'Resolution Y (DPI)',
      'Color Depth (bits)',
      'Compression',
      'Compression Ratio (Actual / Theoretical)',
      'Format',
      'Status',
    ];

    const rows = sortedResults.map((result) => [
      result.filename,
      result.width,
      result.height,
      result.resolutionX,
      result.resolutionY,
      result.colorDepth,
      result.compression,
      result.compressed,
      result.format,
      result.error ? `Error: ${result.error}` : 'OK',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `image-metadata-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const successCount = results.filter((r) => !r.error).length;
  const errorCount = results.filter((r) => r.error).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              {successCount} successful, {errorCount} failed out of {results.length} files
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('filename')}
                    className="flex items-center gap-1"
                  >
                    Filename
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('width')}
                    className="flex items-center gap-1"
                  >
                    Dimensions
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('resolutionX')}
                    className="flex items-center gap-1"
                  >
                    Resolution
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('colorDepth')}
                    className="flex items-center gap-1"
                  >
                    Color Depth
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('compression')}
                    className="flex items-center gap-1"
                  >
                    Compression
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('compressed')}
                    className="flex items-center gap-1"
                  >
                    Compression Ratio
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('format')}
                    className="flex items-center gap-1"
                  >
                    Format
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.map((result, index) => (
                <TableRow key={`${result.filename}-${index}`}>
                  <TableCell>
                    {result.error ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.filename}
                    {result.error && (
                      <div className="text-xs text-destructive mt-1">
                        {result.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {result.width} × {result.height} px
                  </TableCell>
                  <TableCell>
                    {result.resolutionX} × {result.resolutionY} DPI
                  </TableCell>
                  <TableCell>{result.colorDepth} bits</TableCell>
                  <TableCell>{result.compression}</TableCell>
                  <TableCell>{result.compressed}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {result.format}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

