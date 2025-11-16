import { ImageMetadata } from '@/types/image';

// BMP Parser
export function parseBMP(buffer: Buffer, filename: string): ImageMetadata {
  // BMP File Header (14 bytes)
  const signature = buffer.toString('ascii', 0, 2);
  if (signature !== 'BM') {
    throw new Error('Not a valid BMP file');
  }

  // DIB Header
  const dibHeaderSize = buffer.readUInt32LE(14);
  const width = buffer.readInt32LE(18);
  const height = Math.abs(buffer.readInt32LE(22));
  const bitsPerPixel = buffer.readUInt16LE(28);
  const compressionMethod = buffer.readUInt32LE(30);

  const compressionTypes: { [key: number]: string } = {
    0: 'None (BI_RGB)',
    1: 'RLE 8-bit',
    2: 'RLE 4-bit',
    3: 'Bitfields',
    4: 'JPEG',
    5: 'PNG',
  };

  // Resolution in pixels per meter, convert to DPI
  let resolutionX = 72;
  let resolutionY = 72;
  
  if (dibHeaderSize >= 40) {
    const xPelsPerMeter = buffer.readInt32LE(38);
    const yPelsPerMeter = buffer.readInt32LE(42);
    if (xPelsPerMeter > 0) resolutionX = Math.round(xPelsPerMeter * 0.0254);
    if (yPelsPerMeter > 0) resolutionY = Math.round(yPelsPerMeter * 0.0254);
  }

  return {
    filename,
    width,
    height,
    resolutionX,
    resolutionY,
    colorDepth: bitsPerPixel,
    compression: compressionTypes[compressionMethod] || `Unknown (${compressionMethod})`,
    format: 'BMP',
  };
}

// PNG Parser
export function parsePNG(buffer: Buffer, filename: string): ImageMetadata {
  // Check PNG signature
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error('Not a valid PNG file');
  }

  // Read IHDR chunk (always first chunk after signature)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer.readUInt8(24);
  const colorType = buffer.readUInt8(25);
  const compressionMethod = buffer.readUInt8(26);

  // Calculate color depth
  let colorDepth = bitDepth;
  if (colorType === 2) colorDepth = bitDepth * 3; // RGB
  else if (colorType === 4) colorDepth = bitDepth * 2; // Grayscale + Alpha
  else if (colorType === 6) colorDepth = bitDepth * 4; // RGBA

  // Look for pHYs chunk for resolution
  let resolutionX = 72;
  let resolutionY = 72;

  let offset = 8;
  while (offset < buffer.length - 12) {
    const chunkLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);

    if (chunkType === 'pHYs') {
      const xPixelsPerUnit = buffer.readUInt32BE(offset + 8);
      const yPixelsPerUnit = buffer.readUInt32BE(offset + 12);
      const unit = buffer.readUInt8(offset + 16);

      if (unit === 1) { // pixels per meter
        resolutionX = Math.round(xPixelsPerUnit * 0.0254);
        resolutionY = Math.round(yPixelsPerUnit * 0.0254);
      }
      break;
    }

    offset += chunkLength + 12;
  }

  const compressionTypes: { [key: number]: string } = {
    0: 'Deflate',
  };

  return {
    filename,
    width,
    height,
    resolutionX,
    resolutionY,
    colorDepth,
    compression: compressionTypes[compressionMethod] || 'Unknown',
    format: 'PNG',
  };
}

// JPEG Parser
export function parseJPEG(buffer: Buffer, filename: string): ImageMetadata {
  // Check JPEG signature
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    throw new Error('Not a valid JPEG file');
  }

  let width = 0;
  let height = 0;
  let colorDepth = 24; // Default for JPEG
  let resolutionX = 72;
  let resolutionY = 72;

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xFF) break;

    const marker = buffer[offset + 1];
    const segmentLength = buffer.readUInt16BE(offset + 2);

    // SOF markers (Start of Frame)
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const precision = buffer[offset + 4];
      height = buffer.readUInt16BE(offset + 5);
      width = buffer.readUInt16BE(offset + 7);
      const components = buffer[offset + 9];
      colorDepth = precision * components;
    }

    // JFIF APP0 marker
    if (marker === 0xE0) {
      const identifier = buffer.toString('ascii', offset + 4, offset + 9);
      if (identifier === 'JFIF\0') {
        const units = buffer[offset + 11];
        const xDensity = buffer.readUInt16BE(offset + 12);
        const yDensity = buffer.readUInt16BE(offset + 14);

        if (units === 1) { // dots per inch
          resolutionX = xDensity;
          resolutionY = yDensity;
        } else if (units === 2) { // dots per cm
          resolutionX = Math.round(xDensity * 2.54);
          resolutionY = Math.round(yDensity * 2.54);
        }
      }
    }

    offset += segmentLength + 2;
  }

  return {
    filename,
    width,
    height,
    resolutionX,
    resolutionY,
    colorDepth,
    compression: 'JPEG',
    format: 'JPEG',
  };
}

// GIF Parser
export function parseGIF(buffer: Buffer, filename: string): ImageMetadata {
  // Check GIF signature
  const signature = buffer.toString('ascii', 0, 6);
  if (signature !== 'GIF87a' && signature !== 'GIF89a') {
    throw new Error('Not a valid GIF file');
  }

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);
  const packed = buffer.readUInt8(10);

  // Extract color depth from packed field
  const globalColorTableFlag = (packed & 0x80) >> 7;
  const colorResolution = ((packed & 0x70) >> 4) + 1;
  const bitsPerPixel = (packed & 0x07) + 1;

  const colorDepth = globalColorTableFlag ? bitsPerPixel : colorResolution;

  return {
    filename,
    width,
    height,
    resolutionX: 72, // GIF doesn't store DPI
    resolutionY: 72,
    colorDepth,
    compression: 'LZW',
    format: 'GIF',
  };
}

// TIFF Parser
export function parseTIFF(buffer: Buffer, filename: string): ImageMetadata {
  // Check TIFF signature
  const byteOrder = buffer.toString('ascii', 0, 2);
  const littleEndian = byteOrder === 'II';
  const bigEndian = byteOrder === 'MM';

  if (!littleEndian && !bigEndian) {
    throw new Error('Not a valid TIFF file');
  }

  const readUInt16 = (offset: number) =>
    littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const readUInt32 = (offset: number) =>
    littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);

  const magic = readUInt16(2);
  if (magic !== 42) {
    throw new Error('Not a valid TIFF file');
  }

  const ifdOffset = readUInt32(4);
  const numEntries = readUInt16(ifdOffset);

  let width = 0;
  let height = 0;
  let resolutionX = 72;
  let resolutionY = 72;
  let bitsPerSample = 1;
  let samplesPerPixel = 1;
  let compression = 1;
  let resolutionUnit = 2; // inches by default

  // Parse IFD entries
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = readUInt16(entryOffset);
    const type = readUInt16(entryOffset + 2);
    const count = readUInt32(entryOffset + 4);
    const valueOffset = entryOffset + 8;

    switch (tag) {
      case 256: // ImageWidth
        width = readUInt32(valueOffset);
        break;
      case 257: // ImageLength
        height = readUInt32(valueOffset);
        break;
      case 258: // BitsPerSample
        bitsPerSample = readUInt16(valueOffset);
        break;
      case 259: // Compression
        compression = readUInt16(valueOffset);
        break;
      case 277: // SamplesPerPixel
        samplesPerPixel = readUInt16(valueOffset);
        break;
      case 282: // XResolution
        {
          const offset = readUInt32(valueOffset);
          const numerator = readUInt32(offset);
          const denominator = readUInt32(offset + 4);
          resolutionX = Math.round(numerator / denominator);
        }
        break;
      case 283: // YResolution
        {
          const offset = readUInt32(valueOffset);
          const numerator = readUInt32(offset);
          const denominator = readUInt32(offset + 4);
          resolutionY = Math.round(numerator / denominator);
        }
        break;
      case 296: // ResolutionUnit
        resolutionUnit = readUInt16(valueOffset);
        break;
    }
  }

  // Convert resolution to DPI
  if (resolutionUnit === 3) { // centimeters
    resolutionX = Math.round(resolutionX * 2.54);
    resolutionY = Math.round(resolutionY * 2.54);
  }

  const compressionTypes: { [key: number]: string } = {
    1: 'None',
    2: 'CCITT Group 3',
    3: 'CCITT Group 4',
    4: 'LZW',
    5: 'JPEG (old)',
    6: 'JPEG',
    7: 'JPEG',
    8: 'Deflate',
    32773: 'PackBits',
  };

  const colorDepth = bitsPerSample * samplesPerPixel;

  return {
    filename,
    width,
    height,
    resolutionX,
    resolutionY,
    colorDepth,
    compression: compressionTypes[compression] || `Unknown (${compression})`,
    format: 'TIFF',
  };
}

// PCX Parser
export function parsePCX(buffer: Buffer, filename: string): ImageMetadata {
  // Check PCX signature
  const manufacturer = buffer.readUInt8(0);
  if (manufacturer !== 10) {
    throw new Error('Not a valid PCX file');
  }

  const version = buffer.readUInt8(1);
  const encoding = buffer.readUInt8(2);
  const bitsPerPixel = buffer.readUInt8(3);

  const xMin = buffer.readUInt16LE(4);
  const yMin = buffer.readUInt16LE(6);
  const xMax = buffer.readUInt16LE(8);
  const yMax = buffer.readUInt16LE(10);

  const hDpi = buffer.readUInt16LE(12);
  const vDpi = buffer.readUInt16LE(14);

  const nPlanes = buffer.readUInt8(65);

  const width = xMax - xMin + 1;
  const height = yMax - yMin + 1;
  const colorDepth = bitsPerPixel * nPlanes;

  const compressionType = encoding === 1 ? 'RLE' : 'None';

  return {
    filename,
    width,
    height,
    resolutionX: hDpi || 72,
    resolutionY: vDpi || 72,
    colorDepth,
    compression: compressionType,
    format: 'PCX',
  };
}

// Main parser function
export async function parseImageMetadata(
  buffer: Buffer,
  filename: string
): Promise<ImageMetadata> {
  const ext = filename.toLowerCase().split('.').pop() || '';

  try {
    switch (ext) {
      case 'bmp':
        return parseBMP(buffer, filename);
      case 'png':
        return parsePNG(buffer, filename);
      case 'jpg':
      case 'jpeg':
        return parseJPEG(buffer, filename);
      case 'gif':
        return parseGIF(buffer, filename);
      case 'tif':
      case 'tiff':
        return parseTIFF(buffer, filename);
      case 'pcx':
        return parsePCX(buffer, filename);
      default:
        throw new Error(`Unsupported format: ${ext}`);
    }
  } catch (error) {
    return {
      filename,
      width: 0,
      height: 0,
      resolutionX: 0,
      resolutionY: 0,
      colorDepth: 0,
      compression: 'N/A',
      format: ext.toUpperCase(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

