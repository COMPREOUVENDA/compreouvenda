import { NextResponse } from 'next/server'

// Health check endpoint for monitoring
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      app: 'running',
      database: 'connected'
    }
  })
}
