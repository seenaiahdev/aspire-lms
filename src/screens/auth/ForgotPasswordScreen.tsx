import { useState } from 'react';
import { GraduationCap, ArrowLeft, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Button } from '@/components/ui/Button';

export function ForgotPasswordScreen() {
  const { navigate } = useNav();
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-50">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('login')} className="flex items-center gap-2 text-ink-500 hover:text-ink-800 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-ink-900">Aspire<span className="text-primary-600">Next</span></span>
        </div>

        <div className="card p-6 lg:p-8">
          {!sent ? (
            <>
              <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">Forgot Password?</h1>
              <p className="text-ink-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              <div className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input type="email" className="input pl-10" placeholder="you@example.com" />
                  </div>
                </div>
                <Button fullWidth size="lg" onClick={() => setSent(true)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Send Reset Link
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-success-100 flex items-center justify-center mx-auto mb-4 animate-scale-in">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="font-display font-bold text-xl text-ink-900 mb-1">Check Your Email</h2>
              <p className="text-ink-500 text-sm mb-6">We've sent a password reset link to your email. It may take a minute to arrive.</p>
              <Button fullWidth size="lg" onClick={() => navigate('reset')}>
                Enter Reset Code
              </Button>
              <button onClick={() => setSent(false)} className="text-sm text-ink-500 hover:text-ink-700 font-medium mt-3">
                Didn't get it? Resend
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResetPasswordScreen() {
  const { navigate } = useNav();
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-50">
      <div className="w-full max-w-md animate-fade-up">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-ink-900">Aspire<span className="text-primary-600">Next</span></span>
        </div>

        <div className="card p-6 lg:p-8">
          <h1 className="font-display font-bold text-2xl text-ink-900 mb-1">Reset Password</h1>
          <p className="text-ink-500 text-sm mb-6">Enter the code from your email and set a new password.</p>

          <div className="space-y-4">
            <div>
              <label className="label">Verification Code</label>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input key={i} type="text" maxLength={1} className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-ink-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                ))}
              </div>
            </div>
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input type={showPwd ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button fullWidth size="lg" onClick={() => navigate('login')} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Reset Password
            </Button>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-50 border border-accent-100">
              <ShieldCheck className="w-4 h-4 text-accent-600 shrink-0" />
              <p className="text-xs text-accent-700">Your new password will be encrypted and securely stored.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
