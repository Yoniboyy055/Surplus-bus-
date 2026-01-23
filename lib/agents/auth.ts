/**
 * Agent Authentication Utilities
 * Handles CRON_SECRET validation and operator auth
 */

import { createClient } from '@/lib/supabase/server';

export interface AuthResult {
  authorized: boolean;
  authType: 'cron' | 'operator' | 'none';
  userId?: string;
  error?: string;
}

/**
 * Validates request authorization for agent endpoints.
 * Accepts either:
 * 1. Valid CRON_SECRET header (for automated cron jobs)
 * 2. Vercel cron header (automatically added by Vercel)
 * 3. Authenticated operator session (for manual triggers)
 */
export async function validateAgentAuth(request: Request): Promise<AuthResult> {
  const expectedSecret = process.env.CRON_SECRET;
  
  // Check for x-cron-secret header (manual cron setup)
  const cronSecret = request.headers.get('x-cron-secret');
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    return { authorized: true, authType: 'cron' };
  }

  // Check for Authorization: Bearer <CRON_SECRET> (alternative format)
  const authHeader = request.headers.get('authorization');
  if (authHeader && expectedSecret) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token === expectedSecret) {
      return { authorized: true, authType: 'cron' };
    }
  }

  // Check for Vercel cron (Vercel automatically verifies these requests)
  // When CRON_SECRET is set in Vercel, it validates the request automatically
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (isVercelCron && expectedSecret) {
    // Vercel cron requests are pre-authenticated when CRON_SECRET is set
    return { authorized: true, authType: 'cron' };
  }

  // Check URL query param as fallback (for testing)
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('cron_secret');
  if (querySecret && expectedSecret && querySecret === expectedSecret) {
    return { authorized: true, authType: 'cron' };
  }

  // Fall back to operator session auth
  const supabase = createClient();
  if (!supabase) {
    return { 
      authorized: false, 
      authType: 'none', 
      error: 'Supabase not configured' 
    };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { 
      authorized: false, 
      authType: 'none', 
      error: 'Unauthorized: No valid session' 
    };
  }

  // Verify operator role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'operator') {
    return { 
      authorized: false, 
      authType: 'none', 
      error: 'Forbidden: Operator access required' 
    };
  }

  return { 
    authorized: true, 
    authType: 'operator', 
    userId: user.id 
  };
}

/**
 * Get error response for unauthorized requests
 */
export function getAuthErrorResponse(result: AuthResult): Response {
  const status = result.error?.includes('Forbidden') ? 403 : 401;
  return Response.json({ error: result.error }, { status });
}
