/**
 * Cloudflare Worker for rythebibleguy.com/quiz
 * - /quiz/api/* is delegated to the quiz-answerstats worker (requires Service binding "QUIZ_ANSWERSTATS").
 * - /quiz and /quiz/* are proxied to Pages (SPA + assets).
 *
 * Deploy: Paste this file into the Cloudflare Workers dashboard.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const pagesHost = 'react-spa-57t.pages.dev';

    // 0. Delegate /quiz/api/* to the answer-stats worker (so stats API returns JSON, not the SPA)
    if (path.startsWith('/quiz/api/') && env.QUIZ_ANSWERSTATS) {
      return env.QUIZ_ANSWERSTATS.fetch(request);
    }

    // 1. Force the trailing slash for the root /quiz path
    if (path === '/quiz') {
      url.pathname = '/quiz/';
      return Response.redirect(url.toString(), 301);
    }

    // 2. Intercept anything under /quiz/
    if (path.startsWith('/quiz/')) {
      // Strip the /quiz prefix to find the file on Pages
      // Example: /quiz/assets/style.css becomes /assets/style.css
      let targetPath = path.replace('/quiz', '');

      // 3. Root handling
      if (targetPath === '' || targetPath === '/') {
        targetPath = '/index.html';
      }

      const pagesUrl = `https://${pagesHost}${targetPath}`;
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', pagesHost);

      try {
        let pagesResponse = await fetch(pagesUrl, {
          method: request.method,
          headers: newHeaders,
          redirect: 'follow'
        });

        // 4. THE SPA FALLBACK
        // If the file isn't found (404) and it's a "Virtual Route" (no dot),
        // serve the index.html so React can handle the URL.
        if (pagesResponse.status === 404 && !targetPath.includes('.')) {
          return fetch(`https://${pagesHost}/index.html`, { 
            headers: newHeaders 
          });
        }

        // 5. Asset Security Header (CORS Fix)
        // Ensure the browser knows this JS/CSS is safe to run on rythebibleguy.com
        const secureResponse = new Response(pagesResponse.body, pagesResponse);
        secureResponse.headers.set('Access-Control-Allow-Origin', '*');
        
        return secureResponse;

      } catch (err) {
        return new Response(`Worker Error: ${err.message}`, { status: 500 });
      }
    }

    // Default: Send everything else to WordPress
    return fetch(request);
  }
};
