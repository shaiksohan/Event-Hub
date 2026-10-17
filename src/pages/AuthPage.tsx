import { useEffect, useState, useRef } from 'react';
import { Mail, Lock, User, ArrowRight, Briefcase, ShoppingBag, Eye, EyeOff, Check, X, ArrowLeft, Phone, Smartphone, RefreshCw, KeyRound } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function GoogleIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.48 10.12v3.85h5.36c-.23 1.39-.96 2.57-2.05 3.36l3.14 2.44c1.83-1.69 2.89-4.19 2.89-7.15 0-.69-.06-1.35-.18-1.99H12.48z" />
      <path d="M12.48 21.5c2.61 0 4.81-.86 6.42-2.34l-3.14-2.44c-.86.58-1.96.92-3.28.92-2.52 0-4.66-1.7-5.42-3.99l-3.25 2.51c1.7 3.37 5.19 5.34 8.67 5.34z" />
      <path d="M7.06 13.65c-.19-.58-.3-1.19-.3-1.82s.11-1.24.3-1.82L3.81 7.5c-.65 1.31-1.02 2.78-1.02 4.33s.37 3.02 1.02 4.33l3.25-2.51z" />
      <path d="M12.48 6.88c1.42 0 2.69.49 3.69 1.45l2.77-2.77C17.29 4.1 15.09 3.2 12.48 3.2c-3.48 0-6.97 1.97-8.67 5.34l3.25 2.51c.76-2.29 2.9-3.99 5.42-3.99z" />
    </svg>
  );
}

function validatePassword(pw: string): { valid: boolean; message: string } {
  if (pw.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Z]/.test(pw)) return { valid: false, message: 'Include at least one uppercase letter' };
  if (!/[a-z]/.test(pw)) return { valid: false, message: 'Include at least one lowercase letter' };
  if (!/[0-9]/.test(pw)) return { valid: false, message: 'Include at least one number' };
  if (!/[^A-Za-z0-9]/.test(pw)) return { valid: false, message: 'Include at least one special character' };
  return { valid: true, message: '' };
}

function validatePhone(raw: string): { valid: boolean; normalized: string } {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return { valid: true, normalized: '91' + digits };
  return { valid: false, normalized: '' };
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', passed: password.length >= 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Number', passed: /[0-9]/.test(password) },
    { label: 'Special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];
  const passedCount = checks.filter((c) => c.passed).length;
  const strengthLabel = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][passedCount];
  const strengthColor = ['#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#22c55e', '#22c55e'][passedCount];

  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${(passedCount / 5) * 100}%`, backgroundColor: strengthColor }}
          />
        </div>
        <span className="text-xs font-medium" style={{ color: strengthColor }}>{strengthLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.passed ? (
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-xs ${c.passed ? 'text-green-600' : 'text-gray-400'}`}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleChange = (idx: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const arr = value.padEnd(6, ' ').split('');
    arr[idx] = digit || ' ';
    const newVal = arr.join('').trimEnd();
    onChange(newVal);
    if (digit && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx].trim() && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted);
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all ${
            d.trim()
              ? 'border-[#0879c9] bg-[#e9f8ff] text-[#10213f]'
              : 'border-gray-200 bg-white text-gray-900'
          } focus:border-[#0879c9] focus:ring-2 focus:ring-[#0879c9]/20 disabled:opacity-50`}
          style={{ aspectRatio: '1 / 1.1' }}
        />
      ))}
    </div>
  );
}

type AuthMethod = 'email' | 'phone';

export default function AuthPage() {
  const { path, navigate } = useRouter();
  const { signIn, signInWithPhoneOtp, signInWithGoogle, signUp, passwordResetMode, updatePassword, clearPasswordResetMode } = useAuth();
  const [method, setMethod] = useState<AuthMethod>('email');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [serviceType, setServiceType] = useState('function');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Phone OTP state
  const [phoneOtpStage, setPhoneOtpStage] = useState<'input' | 'otp' | 'success'>('input');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [phoneSuccessMsg, setPhoneSuccessMsg] = useState('');
  const [otpFieldName, setOtpFieldName] = useState('');
  const [otpBusinessName, setOtpBusinessName] = useState('');
  const [otpServiceType, setOtpServiceType] = useState('function');

  useEffect(() => {
    const params = new URLSearchParams(path.split('?')[1] || '');
    const m = params.get('mode');
    if (m === 'signup' || m === 'signin') setMode(m);
    const r = params.get('role');
    if (r === 'provider' || r === 'customer') setRole(r);
    const st = params.get('type');
    if (st) setServiceType(st);
    const ref = params.get('ref');
    setReferralCode(ref || '');
  }, [path]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const serviceTypes = [
    { value: 'function', label: 'Function' },
    { value: 'camera_studio', label: 'Camera Studio' },
    { value: 'catering', label: 'Catering Services' },
    { value: 'workers', label: 'Workers' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your name'); setLoading(false); return; }
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) { setError(pwCheck.message); setLoading(false); return; }
      if (phone.trim()) {
        const phoneCheck = validatePhone(phone);
        if (!phoneCheck.valid) { setError('Please enter a valid 10-digit Indian mobile number'); setLoading(false); return; }
        const { error } = await signUp(email, password, fullName, role, businessName, serviceType, referralCode, phoneCheck.normalized);
        if (error) { setError(error); setLoading(false); }
        else navigate('/');
      } else {
        const { error } = await signUp(email, password, fullName, role, businessName, serviceType, referralCode);
        if (error) { setError(error); setLoading(false); }
        else navigate('/');
      }
    } else {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) { setError(pwCheck.message); setLoading(false); return; }
      const { error } = await signIn(email, password);
      if (error) { setError(error); setLoading(false); }
      else navigate('/');
    }
  };

  // ─── Phone OTP handlers ───
  const handleSendOtp = async () => {
    setPhoneError('');
    setPhoneSuccessMsg('');
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.valid) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    setPhoneLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('otp-auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile: phoneCheck.normalized }),
      });
      if (fnError) { setPhoneError('Could not send OTP. Please try again.'); setPhoneLoading(false); return; }
      if (data?.error) { setPhoneError(data.error); setPhoneLoading(false); return; }
      setPhoneOtpStage('otp');
      setPhoneSuccessMsg('OTP sent successfully! Check your SMS.');
      setResendCountdown(30);
      setOtpFieldName(mode === 'signup' ? fullName : '');
      setOtpBusinessName(mode === 'signup' ? businessName : '');
      setOtpServiceType(mode === 'signup' ? serviceType : 'function');
    } catch {
      setPhoneError('Could not send OTP. Please try again.');
    }
    setPhoneLoading(false);
  };

  const handleVerifyOtp = async () => {
    setPhoneError('');
    const phoneCheck = validatePhone(phone);
    if (phoneOtp.length !== 6) {
      setPhoneError('Please enter the 6-digit OTP');
      return;
    }
    setPhoneLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('otp-auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          mobile: phoneCheck.normalized,
          otp: phoneOtp,
          fullName: otpFieldName,
          role: mode === 'signup' ? role : 'customer',
          businessName: otpBusinessName,
          serviceType: otpServiceType,
          referralCode,
        }),
      });
      if (fnError) { setPhoneError('Verification failed. Please try again.'); setPhoneLoading(false); return; }
      if (data?.error) { setPhoneError(data.error); setPhoneLoading(false); return; }

      // OTP verified server-side — establish session with returned token
      const { error: sessionError } = await signInWithPhoneOtp(data.token, data.email);
      if (sessionError) { setPhoneError(sessionError); setPhoneLoading(false); return; }
      setPhoneOtpStage('success');
      setPhoneSuccessMsg('Login successful! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch {
      setPhoneError('Verification failed. Please try again.');
    }
    setPhoneLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setPhoneError('');
    const phoneCheck = validatePhone(phone);
    setPhoneLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('otp-auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile: phoneCheck.normalized }),
      });
      if (fnError) { setPhoneError('Could not resend OTP. Please try again.'); setPhoneLoading(false); return; }
      if (data?.error) { setPhoneError(data.error); setPhoneLoading(false); return; }
      setPhoneSuccessMsg('OTP resent successfully!');
      setResendCountdown(30);
    } catch {
      setPhoneError('Could not resend OTP. Please try again.');
    }
    setPhoneLoading(false);
  };

  const resetPhoneOtp = () => {
    setPhoneOtpStage('input');
    setPhoneOtp('');
    setPhoneError('');
    setPhoneSuccessMsg('');
    setResendCountdown(0);
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!forgotEmail.trim()) { setResetError('Please enter your email'); return; }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) { setResetError(pwCheck.message); return; }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match'); return; }
    setResetLoading(true);
    const { data, error: fnError } = await supabase.functions.invoke('reset-password', {
      body: JSON.stringify({ email: forgotEmail.trim(), newPassword }),
    });
    setResetLoading(false);
    if (fnError) { setResetError(fnError.message); return; }
    if (data?.error) { setResetError(data.error); return; }
    setResetSuccess(true);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) { setResetError(pwCheck.message); return; }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match'); return; }
    setResetLoading(true);
    const { error } = await updatePassword(newPassword);
    setResetLoading(false);
    if (error) { setResetError(error); }
    else { setResetSuccess(true); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 sm:py-12 bg-gradient-to-br from-[#f6f9ff] via-[#e9f8ff] to-[#fff3f7] relative overflow-hidden">
      {/* Floating decorative shapes */}
      <div className="absolute top-10 left-10 w-24 h-24 rounded-full bg-[#00a8e8]/8 blur-2xl" />
      <div className="absolute bottom-20 right-10 w-32 h-32 rounded-full bg-[#e32d68]/8 blur-2xl" />
      <div className="absolute top-1/3 right-1/4 w-16 h-16 border border-[#0879c9]/10 rounded-2xl rotate-12 hidden md:block" style={{ animation: 'motion-shape-spin 20s linear infinite' }} />
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/85 backdrop-blur-xl rounded-3xl shadow-2xl shadow-[#0879c9]/10 border border-white/60 p-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src="/eventhub_logo_transparent.png" alt="EventHub" className="w-14 h-14 object-contain drop-shadow-lg" style={{ animation: 'float-icon 3s ease-in-out infinite' }} />
            <span className="text-2xl font-black text-[#10213f]">Event<span className="text-[#f0448c]">Hub</span></span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {passwordResetMode || forgotMode ? 'Set New Password' : mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-gray-500 text-center text-sm mb-6">
            {passwordResetMode || forgotMode
              ? 'Enter your email and choose a new password'
              : mode === 'signin'
                  ? 'Sign in to your account to continue'
                  : 'Join EventHub to book or offer services'}
          </p>

          {(passwordResetMode || forgotMode) && (
            <div className="space-y-4">
              {resetSuccess ? (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Password updated!</p>
                    <p className="text-sm text-gray-500">Your password has been changed successfully. Please sign in with your new password.</p>
                  </div>
                  <button
                    onClick={() => {
                      clearPasswordResetMode();
                      setForgotMode(false);
                      setResetSuccess(false);
                      setForgotEmail('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setResetError('');
                    }}
                    className="btn-ripple btn-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0879c9] to-[#e32d68] hover:shadow-lg text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                  >
                    Continue to Sign In
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={forgotMode ? handleForgotReset : handleUpdatePassword} className="space-y-4">
                  {(resetError || error) && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{resetError || error}</div>
                  )}
                  {forgotMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {newPassword.length > 0 && <PasswordStrength password={newPassword} />}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn-ripple btn-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0879c9] to-[#e32d68] hover:shadow-lg disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                  >
                    {resetLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Update Password
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
              {forgotMode && !passwordResetMode && !resetSuccess && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setResetError('');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </button>
              )}
            </div>
          )}

          {error && !forgotMode && !passwordResetMode && method === 'email' && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}

          {!passwordResetMode && !forgotMode && mode === 'signup' && referralCode && (
            <div className="mb-5 rounded-xl border border-[#f3dda0] bg-[#fff8e6] px-4 py-3 text-sm text-[#8a641d]">
              Referral code <strong>{referralCode}</strong> is applied. Your friend earns 10 coins when you join.
            </div>
          )}

          {!passwordResetMode && !forgotMode && mode === 'signup' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">I want to...</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    role === 'customer' ? 'border-[#0879c9] bg-[#e9f8ff]' : 'border-gray-200 hover:border-[#bdefff]'
                  }`}
                >
                  <ShoppingBag className={`w-6 h-6 ${role === 'customer' ? 'text-[#0879c9]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${role === 'customer' ? 'text-[#0879c9]' : 'text-gray-600'}`}>
                    Book Services
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('provider')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                    role === 'provider' ? 'border-[#e32d68] bg-[#fff0f3]' : 'border-gray-200 hover:border-[#ffc5d4]'
                  }`}
                >
                  <Briefcase className={`w-6 h-6 ${role === 'provider' ? 'text-[#e32d68]' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${role === 'provider' ? 'text-[#e32d68]' : 'text-gray-600'}`}>
                    Offer Services
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ─── Method toggle (Email / Phone) ─── */}
          {!passwordResetMode && !forgotMode && (
            <div className="flex gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setMethod('email'); setError(''); setPhoneError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  method === 'email' ? 'bg-white text-[#0879c9] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                type="button"
                onClick={() => { setMethod('phone'); setError(''); setPhoneError(''); resetPhoneOtp(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  method === 'phone' ? 'bg-white text-[#0879c9] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Phone OTP
              </button>
            </div>
          )}

          {/* ─── EMAIL FORM ─── */}
          {!passwordResetMode && !forgotMode && method === 'email' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                    />
                  </div>
                </div>
                {role === 'provider' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Your Business LLC"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
                      <select
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors bg-white"
                      >
                        {serviceTypes.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="font-normal text-gray-400">(optional)</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full pl-16 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === 'signup' && password.length > 0 && (
                <PasswordStrength password={password} />
              )}
              {mode === 'signin' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(''); }}
                    className="text-sm text-[#0879c9] hover:text-[#e32d68] font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-ripple btn-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0879c9] to-[#e32d68] hover:shadow-lg disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          )}

          {/* ─── PHONE OTP FORM ─── */}
          {!passwordResetMode && !forgotMode && method === 'phone' && (
            <div className="space-y-4">
              {phoneError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{phoneError}</div>
              )}
              {phoneSuccessMsg && !phoneError && (
                <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-600 flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" /> {phoneSuccessMsg}
                </div>
              )}

              {phoneOtpStage === 'input' && (
                <>
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                          />
                        </div>
                      </div>
                      {role === 'provider' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Your Business LLC"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
                            <select
                              value={serviceType}
                              onChange={(e) => setServiceType(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors bg-white"
                            >
                              {serviceTypes.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">+91</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="98765 43210"
                        maxLength={10}
                        className="w-full pl-16 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0879c9] focus:ring-1 focus:ring-[#0879c9] outline-none transition-colors"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">We'll send a 6-digit OTP to verify your number</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={phoneLoading || !phone.trim()}
                    className="btn-ripple btn-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0879c9] to-[#e32d68] hover:shadow-lg disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                  >
                    {phoneLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        Send OTP
                      </>
                    )}
                  </button>
                </>
              )}

              {phoneOtpStage === 'otp' && (
                <>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-[#e9f8ff] flex items-center justify-center mx-auto mb-3">
                      <KeyRound className="w-7 h-7 text-[#0879c9]" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Enter the OTP sent to</p>
                    <p className="text-sm font-bold text-[#10213f]">+91 {phone}</p>
                  </div>

                  <OtpInput value={phoneOtp} onChange={setPhoneOtp} disabled={phoneLoading} />

                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={phoneLoading || phoneOtp.length !== 6}
                    className="btn-ripple btn-glow w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#0879c9] to-[#e32d68] hover:shadow-lg disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
                  >
                    {phoneLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Verify & {mode === 'signup' ? 'Create Account' : 'Sign In'}
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => resetPhoneOtp()}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Change number
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCountdown > 0 || phoneLoading}
                      className="flex items-center gap-1.5 text-sm text-[#0879c9] hover:text-[#e32d68] font-medium transition-colors disabled:opacity-40"
                    >
                      {resendCountdown > 0 ? (
                        <span>Resend in {resendCountdown}s</span>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {phoneOtpStage === 'success' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-semibold text-gray-900">Verified!</p>
                  <p className="text-sm text-gray-500 mt-1">Redirecting you to EventHub...</p>
                </div>
              )}
            </div>
          )}

          {!passwordResetMode && !forgotMode && (
          <>
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white/85 px-3 text-xs text-gray-400">or continue with</span>
            </div>
          </div>

          <button
            onClick={async () => {
              const { error } = await signInWithGoogle(mode === 'signup' ? role : undefined);
              if (error) setError(error);
            }}
            className="btn-ripple w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 text-gray-700 py-3.5 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02]"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </button>
          </>
          )}

          {!passwordResetMode && !forgotMode && (
          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setPhoneError(''); resetPhoneOtp(); }}
              className="text-[#0879c9] hover:text-[#e32d68] font-medium transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          )}
        </div>
      </div>
    </div>
  );
}
