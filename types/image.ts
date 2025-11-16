export interface ImageMetadata {
  filename: string;
  width: number;
  height: number;
  resolutionX: number;
  resolutionY: number;
  colorDepth: number;
  compression: string;
  format: string;
  error?: string;
}

export interface ParseResult {
  success: boolean;
  metadata?: ImageMetadata;
  error?: string;
}

