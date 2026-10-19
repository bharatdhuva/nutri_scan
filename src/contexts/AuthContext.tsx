import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Profile } from '@/types/database';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, currentUser?: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        return data as Profile;
      }

      // Self-healing: if trigger didn't insert, create the profile on the fly
      const fallbackUser = currentUser || user;
      const fullName = fallbackUser?.user_metadata?.full_name || fallbackUser?.user_metadata?.name || fallbackUser?.email?.split('@')[0] || '';
      const avatarUrl = fallbackUser?.user_metadata?.avatar_url || fallbackUser?.user_metadata?.picture || '';

      const { data: newProfile } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          full_name: fullName,
          avatar_url: avatarUrl,
        }, { onConflict: 'user_id' })
        .select('*')
        .maybeSingle();

      return (newProfile || data) as Profile | null;
    } catch (err) {
      console.warn('Profile fetch notice:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id, session.user).then(setProfile);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user).then(setProfile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Signs up AND immediately signs in — no email verification needed
  const signUp = async (email: string, password: string, fullName?: string) => {
    // Step 1: Create account with user metadata
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName || '' },
      },
    });

    if (signUpError) return { error: signUpError as Error };

    // If Supabase returned a session right away (email confirmation disabled)
    if (signUpData?.session) {
      setSession(signUpData.session);
      setUser(signUpData.user);
      if (signUpData.user) {
        await fetchProfile(signUpData.user.id, signUpData.user);
      }
      return { error: null };
    }

    // Step 2: If no session was returned, sign in directly
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: signInError as Error };
    }

    if (signInData?.user) {
      await fetchProfile(signInData.user.id, signInData.user);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && signInData?.session) {
      setSession(signInData.session);
      setUser(signInData.user);
      if (signInData.user) {
        await fetchProfile(signInData.user.id, signInData.user);
      }
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out notice:', err);
    }
    setProfile(null);
    setUser(null);
    setSession(null);
    try {
      sessionStorage.removeItem('nutriscan_current_analysis');
      sessionStorage.removeItem('nutriscan_last_image');
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
