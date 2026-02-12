/**
 * Cloudflare Worker for rythebibleguy.com/quiz*
 * Last Updated: February 12, 2026
 * 
 * Proxies /quiz* traffic to react-spa-57t.pages.dev
 * All other traffic passes through to WordPress
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Force the trailing slash for the root /quiz path
    if (path === '/quiz') {
      url.pathname = '/quiz/';
      return Response.redirect(url.toString(), 301);
    }

    // 2. Intercept anything under /quiz/
    if (path.startsWith('/quiz/')) {
      const pagesHost = 'react-spa-57t.pages.dev';
      let targetPath = path.replace('/quiz', '');

      // 3. Default to index.html for the root or sub-routes
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

        // 4. THE SPA FALLBACK: If it's a 404 and NOT a file (like .png or .js)
        // serve index.html so React can take over the routing.
        if (pagesResponse.status === 404 && !targetPath.includes('.')) {
          return fetch(`https://${pagesHost}/index.html`, { headers: newHeaders });
        }

        return pagesResponse;

      } catch (err) {
        return new Response(`Worker Error: ${err.message}`, { status: 500 });
      }
    }

    // Default: Send everything else to WordPress
    return fetch(request);
  }
};