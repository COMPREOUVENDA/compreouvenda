import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Image optimization proxy - uses Next.js Image Optimization under the hood
// For external images, this provides caching headers and size control
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const w = parseInt(searchParams.get('w') || '800')
  const q = parseInt(searchParams.get('q') || '75')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // Proxy to Next.js built-in image optimization
    const optimizedUrl = `/_next/image?url=${encodeURIComponent(url)}&w=${w}&q=${q}`
    return NextResponse.redirect(new URL(optimizedUrl, request.url))
  } catch (error) {
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }
}
