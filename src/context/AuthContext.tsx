import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.ts';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  idToken: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }

    // Get current active session
    sb.auth.getSession().then(({ data: { session: curSession } }) => {
      setSession(curSession);
      setUser(curSession?.user ?? null);
      setIdToken(curSession?.access_token ?? null);
      setLoading(false);
    }).catch((err) => {
      console.warn('[Supabase Auth] Session fetch notice:', err);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, curSession) => {
      setSession(curSession);
      setUser(curSession?.user ?? null);
      setIdToken(curSession?.access_token ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase is not configured');
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      console.error('[Supabase Auth] Google sign in error:', error.message);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase is not configured');
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Supabase Auth] Email sign in error:', error.message);
      throw error;
    }
    setSession(data.session);
    setUser(data.user);
    setIdToken(data.session?.access_token ?? null);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase is not configured');
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      console.error('[Supabase Auth] Sign up error:', error.message);
      throw error;
    }
    setSession(data.session);
    setUser(data.user);
    setIdToken(data.session?.access_token ?? null);
  };

  const signOut = async () => {
    const sb = getSupabase();
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (err) {
        console.warn('[Supabase Auth] Sign out notice:', err);
      }
    }
    setUser(null);
    setSession(null);
    setIdToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        idToken,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
