import { useEffect } from 'react';
import { useNav } from '@/lib/nav';
import aspireLogo from '@/assests/Aspire_logo.jpg';

export function SplashScreen() {
  const { navigate } = useNav();

  useEffect(() => {
    const t = setTimeout(() => {
      const loggedIn = localStorage.getItem('aspire_logged_in') === 'true';
      const storedRoute = (localStorage.getItem('aspire_active_route') || '') as any;
      const path = window.location.pathname.replace(/^\//, '').trim() as any;
      const targetRoute = path || storedRoute;

      if (loggedIn) {
        navigate(targetRoute && targetRoute !== 'splash' && targetRoute !== 'login' ? targetRoute : 'dashboard');
      } else {
        navigate('login');
      }
    }, 1800);

    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans select-none"
      style={{ background: 'radial-gradient(ellipse at 25% 30%, #321d72 0%, #47269f 45%, #0c0f26 100%)' }}
    >
      {/* 3D Ambient Glows */}
      <div 
        className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30 blur-[140px]"
        style={{ background: 'rgba(117,64,255,0.4)' }} 
      />
      <div 
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30 blur-[150px]"
        style={{ background: 'rgba(95,50,215,0.35)' }} 
      />
      <div 
        className="absolute top-[40%] left-[35%] w-[400px] h-[400px] rounded-full pointer-events-none opacity-20 blur-[130px]"
        style={{ background: 'rgba(149,100,255,0.28)' }} 
      />

      <div className="relative z-10 flex flex-col items-center gap-6">

        {/* Logo icon box with spinning ring loader */}
        <div className="relative flex items-center justify-center">
          <div 
            className="absolute -inset-3.5 rounded-[2.2rem] border-2 border-transparent border-t-primary-400 border-r-primary-500 animate-spin" 
          />
          <div className="relative w-24 h-24 rounded-full bg-white shadow-2xl flex items-center justify-center overflow-hidden animate-scale-in border-2 border-white p-0">
            <img
              src={aspireLogo}
              alt="AspireLMS Logo"
              className="w-full h-full object-cover scale-110"
            />
          </div>
        </div>

        {/* Brand name */}
        <div className="text-center animate-fade-up">
          <h1 className="font-bold text-4xl text-white tracking-tight">
            Aspire<span className="text-primary-400">Next</span>
          </h1>
          <p className="text-primary-100/80 text-sm mt-1.5 tracking-wide font-normal">Learn. Practice. Achieve.</p>
        </div>

        {/* Loader Dots */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

      </div>

    </div>
  );
}
