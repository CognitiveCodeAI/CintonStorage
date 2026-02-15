import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Blob upload endpoint
// Uses BLOB_READ_WRITE_TOKEN from environment variables
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { searchParams } = new URL(req.url || '/', `http://${req.headers.host}`);
    const filename = searchParams.get('filename');

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;

    if (!token) {
      // For development/demo mode without Vercel Blob configured
      console.warn('BLOB_READ_WRITE_TOKEN not configured, returning mock response');
      return res.status(200).json({
        url: `https://placeholder.blob.vercel-storage.com/${filename}`,
        pathname: filename,
        contentType: 'image/jpeg',
        contentDisposition: `attachment; filename="${filename}"`,
      });
    }

    // Use Vercel Blob SDK
    const { put } = await import('@vercel/blob');

    // Collect body as buffer
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);

    const blob = await put(filename, body, {
      access: 'public',
      token,
    });

    return res.status(200).json(blob);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
