import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  passwordResetMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPhoneOtp: (token: string, email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (role?: 'customer' | 'provider') => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'provider',
    businessName?: string,
    serviceType?: string,
    referralCode?: string,
    phone?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  clearPasswordResetMode: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordResetMode, setPasswordResetMode] = useState(false);

  const fetchProfile = async (userId: string, userEmail?: string, userName?: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!data && userEmail) {
      const fullName = userName || userEmail.split('@')[0] || '';
      await supabase.from('profiles').insert({
        id: userId,
        full_name: fullName,
        role: 'customer',
        avatar_url: '',
      });
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile(newProfile as Profile | null);
    } else {
      setProfile(data as Profile | null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') {
  setSession(session);
  setUser(session?.user ?? null);
  setPasswordResetMode(true);
  setLoading(false);
  return;
}
        if (session?.user && sessionStorage.getItem('eh_google_reset') === '1') {
          sessionStorage.removeItem('eh_google_reset');
          setPasswordResetMode(true);
          setSession(session);
          setUser(session.user);
          setLoading(false);
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithPhoneOtp = async (token: string, email: string) => {
    const { error } = await supabase.auth.verifyOtp({
      type: 'magiclink',
      token,
      email,
    } as Parameters<typeof supabase.auth.verifyOtp>[0]);
    if (error) return { error: 'Could not complete phone sign-in. Please try again.' };
    return { error: null };
  };

  const signInWithGoogle = async (role?: 'customer' | 'provider') => {
    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: role ? { role } : undefined,
      },
    });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: 'customer' | 'provider',
    businessName?: string,
    serviceType?: string,
    referralCode?: string,
    phone?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone || undefined } },
    });
    if (error) return { error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: fullName,
        role,
        business_name: businessName || '',
        service_type: serviceType || '',
        phone: phone || '',
      });
      if (profileError) return { error: 'Could not finish creating your account. Please try again.' };

      if (referralCode?.trim()) {
        await supabase.rpc('claim_referral', { p_referral_code: referralCode.trim() });
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updatePassword = async (newPassword: string) => {
  if (!passwordResetMode) {
    return {
      error: 'Please open the password recovery link from your email first.',
    };
  }

  const {
    data: { session: currentSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !currentSession?.user) {
    return {
      error: 'Your recovery session has expired. Please request a new link.',
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  setPasswordResetMode(false);

  await supabase.auth.signOut();

  return { error: null };
};

  const clearPasswordResetMode = () => {
    setPasswordResetMode(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, passwordResetMode, signIn, signInWithPhoneOtp, signInWithGoogle, signUp, signOut, refreshProfile, updatePassword, clearPasswordResetMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
