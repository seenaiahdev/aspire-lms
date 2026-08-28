import { Sparkles, TrendingUp, Users, GraduationCap, ArrowRight } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Button } from '@/components/ui/Button';
import aspireLogo from '@/assests/Aspire_logo.jpg';

export function WelcomeScreen() {
  const { navigate } = useNav();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      {/* ── LEFT — Hero Panel (logo colors: dark navy + teal) ── */}
      <div
        className="relative flex-1 overflow-hidden flex items-center justify-center p-8 lg:p-16 min-h-[45vh] lg:min-h-screen"
        style={{ background: 'radial-gradient(ellipse at 20% 30%, #0d3d3a 0%, #0a1f3c 45%, #061224 100%)' }}
      >
        {/* Brand glow top-left */}
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(117,64,255,0.18) 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
        {/* Brand glow bottom-right */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(95,50,215,0.18) 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />

        <div className="relative z-10 max-w-md text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-6 animate-fade-down">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-xs font-semibold text-white/90">AI-Powered Learning Platform</span>
          </div>

          <h1 className="font-bold text-3xl lg:text-4xl text-white leading-tight mb-4 animate-fade-up">
            Master skills that{' '}
            <span className="text-primary-400">matter</span>{' '}
            for your future
          </h1>
          <p className="text-slate-400 text-base lg:text-lg leading-relaxed mb-8 animate-fade-up">
            Join thousands of students learning through interactive courses, live mentorship, and hands-on projects.
          </p>

          {/* Stats */}
          <div className="hidden lg:grid grid-cols-3 gap-4 animate-fade-up">
            {[
              { icon: TrendingUp, label: '92%', sub: 'Completion rate' },
              { icon: Users, label: '50K+', sub: 'Active students' },
              { icon: GraduationCap, label: '200+', sub: 'Expert courses' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="w-5 h-5 mx-auto mb-2 text-primary-400" />
                <p className="text-2xl font-bold text-white">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT — Actions Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-white">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center overflow-hidden">
              <img src={aspireLogo} alt="AspireLMS" loading="lazy" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="font-bold text-xl text-gray-900">
              Aspire<span className="text-primary-500">Next</span>
            </span>
          </div>

          <h2 className="font-bold text-2xl text-gray-900 mb-2">Welcome aboard!</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Your learning journey starts here. Sign in or create an account to continue.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('login')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-150 active:scale-95 shadow-md hover:shadow-lg bg-primary-600 hover:bg-primary-700"
            >
              Login to your account <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By continuing, you agree to our{' '}
            <button className="font-medium hover:underline text-primary-600">Terms of Service</button>
            {' '}and{' '}
            <button className="font-medium hover:underline text-primary-600">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
}
