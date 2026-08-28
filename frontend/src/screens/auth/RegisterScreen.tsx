import { useState } from 'react';
import { GraduationCap, ArrowLeft, ArrowRight, User, Mail, Lock, Eye, EyeOff, CheckCircle2, BookOpen, Calendar } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import aspireLogo from '@/assests/Aspire_logo.jpg';

export function RegisterScreen() {
  const { navigate } = useNav();
  const [step, setStep] = useState(1);
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const steps = ['Student Info', 'Academic', 'Password', 'Verify'];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-ink-50">
      <div className="absolute top-6 left-6">
        <button onClick={() => navigate('welcome')} className="flex items-center gap-2 text-ink-500 hover:text-ink-800 transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-11 h-11 rounded-full overflow-hidden shadow-md border border-white shrink-0 bg-white">
            <img src={aspireLogo} alt="AspireNext Logo" loading="lazy" className="w-full h-full object-cover scale-110" />
          </div>
          <span className="font-display font-bold text-2xl text-ink-900">Aspire<span className="text-primary-600">Next</span></span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6 px-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step > i + 1 ? 'bg-primary-600 text-white' :
                  step === i + 1 ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                  'bg-ink-100 text-ink-400',
                )}>
                  {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn('text-2xs font-semibold whitespace-nowrap', step >= i + 1 ? 'text-ink-700' : 'text-ink-400')}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn('h-0.5 flex-1 mx-1 rounded-full transition-colors', step > i + 1 ? 'bg-primary-500' : 'bg-ink-100')} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6 lg:p-8">
          {step === 1 && (
            <div className="space-y-4 animate-fade-up">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 mb-1">Student Information</h2>
                <p className="text-ink-500 text-sm">Tell us about yourself.</p>
              </div>
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input className="input pl-10" placeholder="Enter your full name" />
                </div>
              </div>
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input type="email" className="input pl-10" placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input className="input" placeholder="+91 98765 43210" />
              </div>
              <Button fullWidth size="lg" onClick={() => setStep(2)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 mb-1">Academic Information</h2>
                <p className="text-ink-500 text-sm">Help us personalize your experience.</p>
              </div>
              <div>
                <label className="label">Program</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <select className="input pl-10 appearance-none">
                    <option>B.Tech Computer Science</option>
                    <option>B.Tech Information Technology</option>
                    <option>MCA</option>
                    <option>BCA</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Semester</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <select className="input pl-10 appearance-none">
                    {[1,2,3,4,5,6,7,8].map((s) => <option key={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {['Web Dev', 'AI/ML', 'System Design', 'Cloud', 'Mobile', 'Data Science'].map((tag) => (
                    <button key={tag} className="chip bg-ink-100 text-ink-600 hover:bg-primary-100 hover:text-primary-700 transition-colors cursor-pointer">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>Back</Button>
                <Button fullWidth size="lg" onClick={() => setStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-up">
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 mb-1">Set Your Password</h2>
                <p className="text-ink-500 text-sm">Choose a strong password for your account.</p>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input type={showPwd ? 'text' : 'password'} className="input pl-10 pr-10" placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full', i <= 3 ? 'bg-success-500' : 'bg-ink-100')} />
                  ))}
                </div>
                <p className="text-2xs text-ink-400 mt-1">Use 8+ characters with letters, numbers & symbols</p>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                  <input type="password" className="input pl-10" placeholder="Re-enter password" />
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-4 h-4 rounded border-ink-300 text-primary-600 focus:ring-primary-500 mt-0.5" />
                <span className="text-sm text-ink-600">
                  I agree to the <button className="text-primary-600 font-medium hover:underline">Terms of Service</button> and <button className="text-primary-600 font-medium hover:underline">Privacy Policy</button>
                </span>
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setStep(2)}>Back</Button>
                <Button fullWidth size="lg" disabled={!agreed} onClick={() => setStep(4)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Send OTP
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-up text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl text-ink-900 mb-1">Verify Your Email</h2>
                <p className="text-ink-500 text-sm">Enter the 6-digit code sent to your email.</p>
              </div>
              <div className="flex justify-center gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-ink-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                  />
                ))}
              </div>
              <p className="text-sm text-ink-500">
                Didn't receive it? <button className="text-primary-600 font-semibold hover:underline">Resend in 0:42</button>
              </p>
              <Button fullWidth size="lg" onClick={() => navigate('dashboard')} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Verify & Continue
              </Button>
              <button onClick={() => setStep(3)} className="text-sm text-ink-500 hover:text-ink-700 font-medium">
                ← Back to password
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-ink-500 mt-6">
          Already have an account?{' '}
          <button onClick={() => navigate('login')} className="text-primary-600 font-semibold hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
