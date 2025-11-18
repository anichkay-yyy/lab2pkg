import { NextRequest, NextResponse } from 'next/server';
import { parseImageMetadata } from '@/lib/imageParser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const metadata = await parseImageMetadata(buffer, file.name);
          return metadata;
        } catch (error) {
          return {
            filename: file.name,
            width: 0,
            height: 0,
            resolutionX: 0,
            resolutionY: 0,
            colorDepth: 0,
            compression: 'N/A',
            compressed: 'N/A',
            format: 'Unknown',
            error: error instanceof Error ? error.message : 'Failed to parse',
          };
        }
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json(
      { error: 'Failed to process images' },
      { status: 500 }
    );
  }
}

