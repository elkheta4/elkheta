/**
 * Next.js Instrumentation
 * 
 * This file is automatically loaded by Next.js on server startup.
 * We use it to pre-warm the cache so the first users don't experience
 * cold cache delays.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server, not edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('');
    console.log('============================================================');
    console.log('[Instrumentation] Next.js server starting...');
    console.log('============================================================');
    console.log('');

    // Dynamic import to avoid issues during build
    const { warmAllCaches } = await import('./lib/cacheWarmer.js');
    
    // Warm caches in background (don't block server startup)
    warmAllCaches().catch(error => {
      console.error('[Instrumentation] Cache warming failed:', error.message);
    });
  }
}
