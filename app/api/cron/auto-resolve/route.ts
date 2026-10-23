import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

async function handleAutoResolve(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      processed_count: 0,
      timestamp: new Date().toISOString(),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.rpc('auto_resolve_stale_matches', {
    hours_threshold: 48,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        processed_count: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  const processedCount = typeof data === 'number' ? data : 0;

  return NextResponse.json({
    processed_count: processedCount,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  return handleAutoResolve(request);
}

export async function POST(request: NextRequest) {
  return handleAutoResolve(request);
}

