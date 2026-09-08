import app from '../server.ts';

// Disable automatic body parsing by Vercel Node runtime so Express captures pristine rawBody Buffer for Stripe webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
  // Restore real request path from Vercel rewrites, query param, or headers
  let matchedPath =
    (req.query?.path ? `/api/${Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path}` : null) ||
    (req.headers['x-matched-path'] as string) ||
    (req.headers['x-vercel-matched-path'] as string) ||
    (req.headers['x-vercel-original-url'] as string) ||
    (req.headers['x-forwarded-uri'] as string) ||
    (req.headers['x-original-url'] as string);

  if (matchedPath) {
    if (!matchedPath.startsWith('/api')) {
      matchedPath = `/api${matchedPath.startsWith('/') ? matchedPath : `/${matchedPath}`}`;
    }
    // Only rewrite if current req.url lost the specific sub-route
    if (req.url === '/api' || req.url === '/api/index' || req.url.startsWith('/api/index?') || req.url.startsWith('/api?')) {
      const queryIdx = req.url.indexOf('?');
      const query = queryIdx !== -1 ? req.url.slice(queryIdx) : '';
      req.url = `${matchedPath}${query && !matchedPath.includes('?') ? query : ''}`;
    }
  }

  return app(req, res);
}

export { app };


