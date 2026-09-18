// Centralized API Base URL Resolver & Request Helper
// Enables smooth, multi-environment operation across Google AI Studio, Vercel, Hostinger, and custom domains.

export function getApiBaseUrl(): string {
  // 1. Literal Vite environment variables
  try {
    const viteApiUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_BACKEND_URL;
    if (viteApiUrl && typeof viteApiUrl === 'string' && viteApiUrl.trim().startsWith('http')) {
      return viteApiUrl.trim().replace(/\/+$/, '');
    }
  } catch {}

  // 2. Client-side persisted API URL override (for custom Vercel / Hostinger setups)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('wallys_api_url');
      if (stored && stored.startsWith('http')) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {}
  }

  // 3. Fallback to same-origin relative paths
  return '';
}

export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

export function setApiBaseUrl(url: string): void {
  if (typeof window === 'undefined') return;
  const clean = (url || '').trim().replace(/\/+$/, '');
  if (clean) {
    localStorage.setItem('wallys_api_url', clean);
  } else {
    localStorage.removeItem('wallys_api_url');
  }
}
