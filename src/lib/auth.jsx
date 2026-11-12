import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = belum dicek
  const [isAdmin, setIsAdmin] = useState(null);      // null = belum dicek
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!userId) { setIsAdmin(false); return; }
    setIsAdmin(null);
    supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => { if (active) setIsAdmin(!!data); });
    return () => { active = false; };
  }, [userId]);

  const value = {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    isAdmin: isAdmin === true,
    adminLoading: isAdmin === null,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}