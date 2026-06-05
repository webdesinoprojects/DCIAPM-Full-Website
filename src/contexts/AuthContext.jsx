import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth-context';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { normalizeRegistrationNo, uploadVoterPhoto } from '../lib/elections';
import { logDevError } from '../lib/logger';

const emptyAuthState = {
  session: null,
  user: null,
  profile: null,
};

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState(emptyAuthState);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (user) => {
    if (!user || !isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,phone,registration_no,photo_url,photo_path,role,is_active,created_at,last_seen_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logDevError('Unable to load profile:', error);
      return null;
    }

    return data;
  }, []);

  const syncSession = useCallback(async (session) => {
    const user = session?.user ?? null;
    const profile = await loadProfile(user);

    const nextState = {
      session: session ?? null,
      user,
      profile,
    };

    setAuthState(nextState);
    setLoading(false);
    return nextState;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured) return emptyAuthState;

    const { data } = await supabase.auth.getSession();
    return syncSession(data.session);
  }, [syncSession]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (mounted) {
        await syncSession(data.session);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      syncSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncSession]);

  const signIn = useCallback(async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase is not configured yet.' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return { ok: false, message: friendlyAuthError(error.message) };
    }

    const profile = await loadProfile(data.user);

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      setAuthState(emptyAuthState);
      return { ok: false, message: 'This account cannot sign in right now.' };
    }

    setAuthState({
      session: data.session,
      user: data.user,
      profile,
    });

    return { ok: true, profile };
  }, [loadProfile]);

  const validateRegistrationNumberForSignup = useCallback(async (registrationNo) => {
    const normalizedRegistrationNo = normalizeRegistrationNo(registrationNo);

    if (!normalizedRegistrationNo) {
      return { ok: false, message: friendlyRegistrationError('REGISTRATION_REQUIRED') };
    }

    const { data, error } = await supabase.rpc('check_voter_registration_number', {
      p_registration_no: normalizedRegistrationNo,
    });

    if (error) {
      logDevError('Registration number check failed:', error);
      return { ok: false, message: friendlyAuthError(error.message) };
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.ok) {
      return {
        ok: false,
        message: friendlyRegistrationError(result?.code, result?.message),
      };
    }

    return { ok: true, registrationNo: normalizedRegistrationNo };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, registrationNo }) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase is not configured yet.' };
    }

    const registrationCheck = await validateRegistrationNumberForSignup(registrationNo);
    if (!registrationCheck.ok) {
      return registrationCheck;
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim(),
          registration_no: registrationCheck.registrationNo,
        },
      },
    });

    if (error) {
      return { ok: false, message: friendlyAuthError(error.message) };
    }

    if (data.user?.identities && data.user.identities.length === 0) {
      return {
        ok: false,
        code: 'ACCOUNT_EXISTS',
        message: 'An account already exists for this email. Please sign in or use Forgot password.',
      };
    }

    if (data.session) {
      const profile = await loadProfile(data.user);
      setAuthState({
        session: data.session,
        user: data.user,
        profile,
      });
      return { ok: true, needsVerification: false, profile };
    }

    return { ok: true, needsVerification: true };
  }, [loadProfile, validateRegistrationNumberForSignup]);

  const requestMagicLink = useCallback(async ({ email, fullName = '', registrationNo = '', shouldCreateUser = false }) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase is not configured yet.' };
    }

    if (shouldCreateUser) {
      const registrationCheck = await validateRegistrationNumberForSignup(registrationNo);
      if (!registrationCheck.ok) {
        return registrationCheck;
      }
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser,
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim(),
          registration_no: normalizeRegistrationNo(registrationNo),
        },
      },
    });

    if (error) {
      logDevError('Magic link request failed:', error);
      return {
        ok: false,
        message: friendlyAuthError(error.message),
        retryAfterSeconds: extractRetryAfter(error),
      };
    }

    return { ok: true };
  }, [validateRegistrationNumberForSignup]);

  const sendPasswordReset = useCallback(async ({ email }) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase is not configured yet.' };
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });

    if (error) {
      return { ok: false, message: friendlyAuthError(error.message) };
    }

    return { ok: true };
  }, []);

  const updatePassword = useCallback(async ({ password }) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase is not configured yet.' };
    }

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { ok: false, message: friendlyAuthError(error.message) };
    }

    const profile = await loadProfile(data.user);
    setAuthState((current) => ({
      ...current,
      user: data.user,
      profile,
    }));

    return { ok: true, profile };
  }, [loadProfile]);

  const completeVoterProfile = useCallback(async ({ fullName, registrationNo, photoFile, phone }) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: 'Supabase is not configured yet.' };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      return { ok: false, message: 'Please verify your email before completing your profile.' };
    }

    const currentProfile = await loadProfile(user);
    const uploaded = photoFile ? await uploadVoterPhoto(user.id, photoFile) : { path: currentProfile?.photo_path };
    const editablePayload = {
      full_name: fullName.trim(),
      registration_no: normalizeRegistrationNo(registrationNo),
      phone: phone ? String(phone).trim() : null,
      photo_path: uploaded.path || currentProfile?.photo_path || null,
      photo_url: null,
      last_seen_at: new Date().toISOString(),
    };

    const result = currentProfile
      ? await supabase
          .from('profiles')
          .update(editablePayload)
          .eq('id', user.id)
      : await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email?.toLowerCase() || '',
            ...editablePayload,
            role: 'user',
            is_active: true,
          });

    if (result.error) {
      return { ok: false, message: friendlyProfileError(result.error.message) };
    }

    await refreshProfile();
    return { ok: true };
  }, [loadProfile, refreshProfile]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setAuthState(emptyAuthState);
  }, []);

  const value = useMemo(() => {
    const emailVerified = Boolean(
      authState.user?.email_confirmed_at || authState.user?.confirmed_at,
    );
    const isAdmin = authState.profile?.role === 'admin' && authState.profile?.is_active;
    const profileComplete = Boolean(
      isAdmin || (
        authState.profile?.full_name
        && authState.profile?.registration_no
        && authState.profile?.photo_path
      ),
    );

    return {
      ...authState,
      loading,
      emailVerified,
      isAdmin,
      profileComplete,
      completeVoterProfile,
      refreshProfile,
      requestMagicLink,
      sendPasswordReset,
      signIn,
      signOut,
      signUp,
      updatePassword,
    };
  }, [
    authState,
    completeVoterProfile,
    loading,
    refreshProfile,
    requestMagicLink,
    sendPasswordReset,
    signIn,
    signOut,
    signUp,
    updatePassword,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

function friendlyAuthError(message = '') {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('registration_not_found')
    || normalized.includes('registration number is not in the active member directory')
  ) {
    return friendlyRegistrationError('REGISTRATION_NOT_FOUND');
  }

  if (
    normalized.includes('registration_already_used')
    || normalized.includes('profiles_registration_no_unique')
  ) {
    return friendlyRegistrationError('REGISTRATION_ALREADY_USED');
  }

  if (normalized.includes('registration_required')) {
    return friendlyRegistrationError('REGISTRATION_REQUIRED');
  }

  if (
    normalized.includes('for security purposes')
    || normalized.includes('rate limit')
    || normalized.includes('over_email_send_rate_limit')
    || normalized.includes('too many requests')
  ) {
    const secondsMatch = normalized.match(/(\d+)\s*second/);
    const waitSeconds = secondsMatch ? secondsMatch[1] : '60';
    return `Please wait ${waitSeconds} seconds before requesting another sign-in link.`;
  }

  if (normalized.includes('otp_expired') || normalized.includes('expired')) {
    return 'This sign-in link has expired. Please request a new one.';
  }

  if (
    normalized.includes('otp_disabled')
    || normalized.includes('signups not allowed')
    || normalized.includes('signup is disabled')
    || normalized.includes('email logins are disabled')
  ) {
    return 'Voter sign-ins via email are disabled in Supabase. Open the Supabase dashboard -> Authentication -> Providers -> Email and enable Magic Link email sign-in.';
  }

  if (normalized.includes('invalid otp') || normalized.includes('token has expired or is invalid')) {
    return 'That sign-in link is invalid or expired. Please request a new one.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return 'Please check your email and password.';
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account already exists for this email. Please sign in or use Forgot password.';
  }

  if (normalized.includes('invalid email') || normalized.includes('email address invalid')) {
    return 'Please enter a valid email address.';
  }

  if (normalized.includes('database error') || normalized.includes('unexpected_failure')) {
    return 'Supabase rejected the request. Check the browser console for the raw error and verify the Email provider is enabled in the Supabase dashboard.';
  }

  if (normalized.includes('password')) {
    return 'Please use a stronger password.';
  }

  return message ? 'The sign-in request could not be completed. Please check the details and try again.' : 'Something went wrong. Please try again.';
}

function extractRetryAfter(error) {
  const fromStatus = error?.status === 429 ? 60 : null;
  const message = String(error?.message || '').toLowerCase();
  const match = message.match(/(\d+)\s*second/);
  return match ? Number(match[1]) : fromStatus;
}

function friendlyProfileError(message = '') {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('profiles_registration_no_unique')
    || normalized.includes('registration_already_used')
  ) {
    return friendlyRegistrationError('REGISTRATION_ALREADY_USED');
  }

  if (normalized.includes('registration_not_found')) {
    return friendlyRegistrationError('REGISTRATION_NOT_FOUND');
  }

  if (normalized.includes('registration_required')) {
    return friendlyRegistrationError('REGISTRATION_REQUIRED');
  }

  if (normalized.includes('row-level security')) {
    return 'Your profile could not be updated with the current account permissions.';
  }

  if (normalized.includes('file') || normalized.includes('storage')) {
    return 'The photo upload failed. Please use a JPG, PNG or WebP image under the size limit.';
  }

  return 'Profile could not be completed. Please check the details and try again.';
}

function friendlyRegistrationError(code, fallbackMessage = '') {
  switch (code) {
    case 'REGISTRATION_REQUIRED':
      return 'Registration number is required.';
    case 'REGISTRATION_NOT_FOUND':
      return 'This registration number is not in the active member directory. Please check the number or contact admin.';
    case 'REGISTRATION_ALREADY_USED':
      return 'This registration number is already linked to another account.';
    default:
      return fallbackMessage || 'Registration number could not be verified. Please check the number and try again.';
  }
}
