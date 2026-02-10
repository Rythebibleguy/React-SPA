export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Redirect /quiz to /quiz/ (critical for relative asset paths)
    if (path === '/quiz') {
      url.pathname = '/quiz/';
      return Response.redirect(url.toString(), 301);
    }

    // This catches /quiz/ and anything starting with /quiz/
    if (path.startsWith('/quiz/')) {
      
      // 1. Strip the /quiz part to get the real file path
      let targetPath = path.replace('/quiz', '');
      
      // 2. If it's just /quiz/, point it to index.html
      if (targetPath === '' || targetPath === '/') {
        targetPath = '/index.html';
      }

      const pagesHost = 'daily-bible-quiz-code.pages.dev';
      const pagesUrl = `https://${pagesHost}${targetPath}`;

      try {
        // 3. Create a clean request and FORCE the Host header
        const newHeaders = new Headers(request.headers);
        newHeaders.set('Host', pagesHost);

        const pagesResponse = await fetch(pagesUrl, {
          method: request.method,
          headers: newHeaders,
          redirect: 'follow'
        });

        // 4. Safety Net: If Pages still says 404, show a custom error
        if (pagesResponse.status === 404) {
          return new Response(`Worker reached Pages, but Pages said 404 for: ${pagesUrl}`, { status: 404 });
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
