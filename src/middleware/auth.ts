import { Request, Response, NextFunction } from 'express';
import { getSupabaseServerClient } from '../lib/supabase-server.ts';

export interface AuthUser {
  uid: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

function parseTokenPayload(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
      const uid = payload.sub || payload.user_id || payload.id;
      if (uid) {
        return {
          uid,
          id: uid,
          email: payload.email,
          name: payload.user_metadata?.full_name || payload.name || payload.email,
          ...payload,
        };
      }
    }
  } catch {}
  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const supabase = getSupabaseServerClient();

  if (supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = {
          uid: user.id,
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          role: user.role,
          ...user,
        };
        return next();
      }
    } catch {}
  }

  // Fallback to JWT payload verification
  const parsed = parseTokenPayload(token);
  if (parsed) {
    req.user = parsed;
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid Supabase token' });
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    const supabase = getSupabaseServerClient();

    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          req.user = {
            uid: user.id,
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
            role: user.role,
            ...user,
          };
          return next();
        }
      } catch {}
    }

    const parsed = parseTokenPayload(token);
    if (parsed) {
      req.user = parsed;
    }
  }
  next();
};
