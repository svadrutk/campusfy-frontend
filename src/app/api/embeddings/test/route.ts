import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Embeddings API test endpoint is working',
    timestamp: new Date().toISOString()
  });
} 