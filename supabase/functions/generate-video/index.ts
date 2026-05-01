// supabase/functions/generate-video/index.ts
// Edge Function for AI video generation from product photos

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoRequest {
  product_id: string;
  video_type: 'template' | 'pika' | 'runway';
  image_urls: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { product_id, video_type, image_urls }: VideoRequest = await req.json();

    // Validate inputs
    if (!product_id || !image_urls || image_urls.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Mínimo de 3 fotos necessárias' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (image_urls.length > 8) {
      return new Response(
        JSON.stringify({ error: 'Máximo de 8 fotos permitidas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update product status to processing
    await supabase
      .from('products')
      .update({
        video_status: 'validating',
        video_type,
      })
      .eq('id', product_id);

    // Step 1: Validate image quality
    const validationResults = await validateImages(image_urls);
    if (validationResults.rejected.length > 0) {
      await supabase
        .from('products')
        .update({
          video_status: 'failed',
          video_error_message: `Fotos rejeitadas: ${validationResults.rejected.join(', ')}`,
        })
        .eq('id', product_id);

      return new Response(
        JSON.stringify({ error: 'Fotos não passaram na validação', details: validationResults }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Update status to processing
    await supabase
      .from('products')
      .update({ video_status: 'processing' })
      .eq('id', product_id);

    // Step 3: Generate video based on type
    let videoResult;

    switch (video_type) {
      case 'template':
        videoResult = await generateTemplateVideo(image_urls, product_id);
        break;
      case 'pika':
        videoResult = await generatePikaVideo(image_urls, product_id);
        break;
      case 'runway':
        videoResult = await generateRunwayVideo(image_urls, product_id);
        break;
    }

    // Step 4: Update product with video info
    await supabase
      .from('products')
      .update({
        video_url: videoResult.url,
        video_thumbnail: videoResult.thumbnail,
        video_status: 'ready',
        video_generated_at: new Date().toISOString(),
        video_duration_seconds: 20,
        video_provider: video_type,
      })
      .eq('id', product_id);

    // Create video record
    await supabase.from('product_videos').insert({
      product_id,
      url: videoResult.url,
      thumbnail_url: videoResult.thumbnail,
      status: 'ready',
      type: video_type,
      duration_seconds: 20,
      generated_at: new Date().toISOString(),
    });

    // Create notification
    const { data: product } = await supabase
      .from('products')
      .select('user_id, title')
      .eq('id', product_id)
      .single();

    if (product) {
      await supabase.from('notifications').insert({
        user_id: product.user_id,
        title: 'Vídeo pronto! 🎬',
        body: `O vídeo do seu produto "${product.title}" foi gerado com sucesso.`,
        type: 'video_ready',
        data: { product_id },
      });
    }

    return new Response(
      JSON.stringify({ success: true, video: videoResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno na geração do vídeo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Image validation (check for dark, blurry, invalid photos)
async function validateImages(urls: string[]): Promise<{ approved: string[]; rejected: string[] }> {
  const approved: string[] = [];
  const rejected: string[] = [];

  for (const url of urls) {
    // In production: analyze image brightness, blur, size, format
    // For now, approve all valid URLs
    if (url && url.startsWith('http')) {
      approved.push(url);
    } else {
      rejected.push(url);
    }
  }

  return { approved, rejected };
}

// Template-based video (zoom, pan, transitions)
async function generateTemplateVideo(imageUrls: string[], productId: string) {
  // In production: Use FFmpeg or a video composition service
  // Template applies: zoom suave, movimento leve, transições, textos
  // Does NOT modify or invent product features

  // Automatically select best cover photo (first photo = main)
  // Reorder for optimal video flow: main → sides → back → details → context

  const orderedImages = reorderForVideo(imageUrls);

  // Generate video composition params
  const composition = {
    images: orderedImages,
    duration: 20,
    transitions: 'crossfade',
    effects: ['ken_burns_zoom', 'slow_pan', 'soft_focus_intro'],
    text_overlays: true,
    orientation: 'vertical',
    fps: 30,
    resolution: '1080x1920',
  };

  // Placeholder: return composed video URL
  return {
    url: `https://storage.supabase.co/videos/${productId}/video.mp4`,
    thumbnail: `https://storage.supabase.co/videos/${productId}/thumb.jpg`,
    composition,
  };
}

// Pika AI video generation
async function generatePikaVideo(imageUrls: string[], productId: string) {
  const pikaApiKey = Deno.env.get('PIKA_API_KEY');
  if (!pikaApiKey) {
    throw new Error('PIKA_API_KEY not configured');
  }

  // In production: Call Pika API
  // POST to Pika API with images, get back video
  // Generates realistic micro-clips from product photos

  return {
    url: `https://storage.supabase.co/videos/${productId}/pika_video.mp4`,
    thumbnail: `https://storage.supabase.co/videos/${productId}/pika_thumb.jpg`,
    provider: 'pika',
    request_id: `pika_${Date.now()}`,
  };
}

// Runway AI video generation
async function generateRunwayVideo(imageUrls: string[], productId: string) {
  const runwayApiKey = Deno.env.get('RUNWAY_API_KEY');
  if (!runwayApiKey) {
    throw new Error('RUNWAY_API_KEY not configured');
  }

  // In production: Call Runway Gen-2/Gen-3 API
  // Superior quality for premium ads

  return {
    url: `https://storage.supabase.co/videos/${productId}/runway_video.mp4`,
    thumbnail: `https://storage.supabase.co/videos/${productId}/runway_thumb.jpg`,
    provider: 'runway',
    request_id: `runway_${Date.now()}`,
  };
}

function reorderForVideo(urls: string[]): string[] {
  // Optimal order: Front, Left, Right, Back, Detail1, Detail2, Context, Extra
  // Already ordered by upload slots, just ensure main photo is first
  return urls;
}
