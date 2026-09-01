import { useState, useEffect } from 'react';
import { GraduationCap, Mail, Contact, Github, Linkedin, Globe } from 'lucide-react';
import aspireLogo from '@/assests/Aspire_logo.jpg';
import { useUser } from '@/lib/UserContext';
import { useNav } from '@/lib/nav';
import { Avatar } from '@/components/ui/Avatar';
import { formatBatchDisplay } from '@/lib/utils';

export function ProfileScreen() {
  const { user, refetchUser } = useUser();
  const { navigate } = useNav();
  const [isHovered, setIsHovered] = useState(false);

  // Fetch latest real-time student profile data on mount
  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  // Real-time dynamic student content from UserContext / Supabase
  const displayBatch = formatBatchDisplay(user.batchCode, user.registrationId) || user.batchCode || 'W2';
  const displayRegNo = user.registrationId || 'A26W0011';
  const studentName = user.name || 'Seenu Dommalapati';
  const programName = user.program || 'Engineering Degree';
  const collegeName = user.college || 'kalasalingam';
  const startYear = user.startYear || 2023;
  const endYear = user.endYear || 2027;
  // Show the real email only; never fabricate one when the student record has none.
  const studentEmail = (user.email && user.email.trim()) ? user.email.trim() : 'Not provided';
  const studentLevel = user.level || 1;

  return (
    <div className="relative min-h-[70vh] flex items-center justify-center font-sans animate-fade-in py-2 px-4 select-none">

      {/* Subtle soft lavender/purple ambient background glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[38rem] h-[38rem] rounded-full bg-purple-200/30 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[38rem] h-[38rem] rounded-full bg-indigo-200/25 blur-[150px]" />
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          DUAL-CARD RING-BOUND NOTEBOOK ID PASS CONTAINER (STATIC / NO-SCROLL)
         ════════════════════════════════════════════════════════════════════════════ */}
      <div 
        className="relative flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-4 transition-transform duration-500 ease-out"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0px)'
        }}
      >

        {/* ──────────────────────────────────────────────────────────────────────────
            1. LEFT PORTRAIT CARD (PURPLE BRANDED ID PASS)
           ────────────────────────────────────────────────────────────────────────── */}
        <div className="relative w-full max-w-[285px] sm:w-[285px] h-[440px] shrink-0 rounded-[2.5rem] bg-white p-[6px] shadow-[0_25px_60px_-15px_rgba(109,40,217,0.35),0_8px_20px_rgba(0,0,0,0.06)] ring-1 ring-purple-100/90 z-10">
          
          <div 
            className="w-full h-full rounded-[2.15rem] p-6 flex flex-col items-center justify-between text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(178deg, #7b3cf5 0%, #6d28f4 38%, #5a18dc 100%)'
            }}
          >
            {/* Background S-Curve: flows from upper-left DOWN through center, back UP to right */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              viewBox="0 0 280 440" 
              preserveAspectRatio="none"
            >
              {/* Top-Right: very faint subtle corner tint */}
              <path 
                d="M 180 0 C 220 10, 260 25, 280 15 L 280 0 Z" 
                fill="#5a1ad0" 
                opacity="0.3" 
              />
              {/* Main S-Curve: starts upper-left ~52%, dips down to ~65% center, rises back up to ~55% right.
                  Covers the LEVEL badge and flows to the right. Subtle shade only. */}
              <path 
                d="M 0 230 C 60 240, 100 280, 140 285 C 180 290, 230 260, 280 240 L 280 440 L 0 440 Z" 
                fill="#4c14be" 
                opacity="0.30" 
              />
            </svg>

            {/* Bottom-Left Halftone Dot Matrix — small triangular corner cluster */}
            <div 
              className="absolute bottom-2 left-2 w-24 h-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, #ffffff 1.4px, transparent 1.4px)',
                backgroundSize: '10px 10px',
                opacity: 0.28,
                WebkitMaskImage: 'linear-gradient(135deg, transparent 35%, rgba(0,0,0,0.6) 100%)',
                maskImage: 'linear-gradient(135deg, transparent 35%, rgba(0,0,0,0.6) 100%)'
              }}
            />

            {/* Top Brand Header: real AspireNext Logo + Wordmark */}
            <div className="relative z-10 flex items-center gap-2.5 mt-1">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-white/70 shadow-md shrink-0">
                <img src={aspireLogo} alt="AspireNext" className="w-full h-full object-cover scale-110" />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight drop-shadow-sm">
                AspireNext
              </span>
            </div>

            {/* Photo Avatar with 3D White Bezel & Ambient Halo Glow */}
            <div className="relative z-10 my-auto flex flex-col items-center">
              <div 
                className="w-34 h-34 sm:w-36 sm:h-36 rounded-full border-[3.5px] border-white overflow-hidden bg-white/20 flex items-center justify-center text-slate-800"
                style={{
                  boxShadow: '0 0 28px rgba(255,255,255,0.48), 0 10px 25px rgba(0,0,0,0.28)'
                }}
              >
                <Avatar 
                  src={user.avatar} 
                  name={studentName} 
                  size="xl" 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* LEVEL Label & Amber Circular Badge */}
              <div className="flex items-center gap-2 mt-3.5">
                <span className="text-[13px] font-extrabold text-white tracking-wider uppercase">
                  LEVEL
                </span>
                <span className="w-7 h-7 rounded-full bg-[#f59e0b] text-[#3d1a00] font-black text-sm flex items-center justify-center border-2 border-white/80 shadow-md">
                  {studentLevel}
                </span>
              </div>
            </div>

            {/* Handwritten Script Motivational Quote with Yellow Star Sparkle */}
            <div className="relative z-10 text-center pb-3 pt-1">
              <p 
                className="text-white text-[22px] sm:text-[23px] leading-tight drop-shadow-sm tracking-wide font-bold italic"
                style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
              >
                Keep Learning,<br />
                Keep Growing! <span className="text-[#fde047] text-base drop-shadow-sm inline-block translate-y-[-1px] not-italic">✦</span>
              </p>
            </div>

          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────────
            2. UNIFIED 3D BINDER RINGS (PRECISE PHYSICAL CONNECTOR ASSEMBLY)
           ────────────────────────────────────────────────────────────────────────── */}
        <div className="hidden lg:block absolute left-[262px] inset-y-0 w-16 z-30 pointer-events-none">
          {/* Top Ring Assembly */}
          <div className="absolute top-[102px] left-0">
            <BinderRing />
          </div>

          {/* Bottom Ring Assembly */}
          <div className="absolute bottom-[102px] left-0">
            <BinderRing />
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────────────
            3. RIGHT LANDSCAPE CARD (CLEAN WHITE IDENTITY PASS)
           ────────────────────────────────────────────────────────────────────────── */}
        <div className="relative w-full max-w-[630px] sm:w-[630px] h-[440px] shrink-0 rounded-[2.5rem] bg-white p-[6px] shadow-[0_25px_60px_-15px_rgba(109,40,217,0.2),0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-purple-100/90 z-10">
          
          <div className="w-full h-full rounded-[2.15rem] bg-gradient-to-b from-white via-white to-[#faf9fe] p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden">

            {/* Subtle dotted texture — concentrated in the bottom-right corner and faded toward
                the content so it never clashes with the email / identity text */}
            <div
              className="absolute bottom-0 right-0 w-64 h-52 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(#a78bfa 1.25px, transparent 1.25px)',
                backgroundSize: '13px 13px',
                opacity: 0.32,
                WebkitMaskImage: 'radial-gradient(125% 125% at 100% 100%, #000 28%, transparent 68%)',
                maskImage: 'radial-gradient(125% 125% at 100% 100%, #000 28%, transparent 68%)'
              }}
            />

            {/* Top-Right Attached Purple "Student ID Card" Header Tab */}
            <div 
              onClick={() => navigate('settings')}
              title="Click to edit profile"
              className="absolute top-0 right-0 cursor-pointer group z-20 transition-transform hover:scale-[1.01] active:scale-95"
            >
              <div className="relative flex items-center">
                <svg 
                  viewBox="0 0 200 38" 
                  className="w-[185px] h-[36px] overflow-visible"
                >
                  <defs>
                    <linearGradient id="tabPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6722f4" />
                      <stop offset="100%" stopColor="#7626ee" />
                    </linearGradient>
                  </defs>
                  {/* Seamless Curved Tab Path matching reference image */}
                  <path 
                    d="M 0 0 C 16 0 26 16 36 34 L 180 34 C 190 34 198 26 198 17 C 198 8 190 0 180 0 Z" 
                    fill="url(#tabPurpleGrad)"
                  />
                </svg>

                {/* Tab Content: Icon & Text */}
                <div className="absolute inset-0 pl-8 pr-3 flex items-center justify-center gap-2 text-white pointer-events-none">
                  <GraduationCap className="w-4 h-4 text-white shrink-0 -mt-0.5" />
                  <span className="text-[12px] font-extrabold tracking-tight text-white select-none whitespace-nowrap -mt-0.5">
                    Student ID Card
                  </span>
                </div>
              </div>
            </div>

            {/* Student Name & Academic Affiliation */}
            <div className="pt-1 pr-36">
              <h1 className="font-black text-2xl sm:text-[27px] text-slate-900 tracking-tight leading-tight">
                {studentName}
              </h1>
              
              <p className="text-[#6722f4] font-bold text-sm sm:text-[15px] mt-0.5">
                {programName}
              </p>

              <p className="text-slate-500 text-xs font-semibold mt-0.5">
                {collegeName} ({startYear} – {endYear})
              </p>
            </div>

            {/* 3 Identity Columns (Separated by Vertical Hairline Dividers) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 py-2.5 my-auto">
              {/* Column 1: BATCH */}
              <div className="flex flex-col items-center text-center pr-2 sm:pr-3 border-r border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-[#f4effe] flex items-center justify-center text-[#6722f4] mb-1 shadow-sm">
                  <GraduationCap className="w-5 h-5 text-[#6722f4]" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">BATCH</span>
                <span className="text-sm font-black text-slate-900 mt-0.5">{displayBatch}</span>
              </div>

              {/* Column 2: REG NO */}
              <div className="flex flex-col items-center text-center px-2 sm:px-3 border-r border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-[#f4effe] flex items-center justify-center text-[#6722f4] mb-1 shadow-sm">
                  <Contact className="w-5 h-5 text-[#6722f4]" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">REG NO</span>
                <span className="text-sm font-black font-mono text-slate-900 mt-0.5">{displayRegNo}</span>
              </div>

              {/* Column 3: EMAIL (Full Email Display without Clipping) */}
              <div className="flex flex-col items-center text-center pl-2 sm:pl-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#f4effe] flex items-center justify-center text-[#6722f4] mb-1 shadow-sm">
                  <Mail className="w-5 h-5 text-[#6722f4]" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">EMAIL</span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 mt-0.5 break-all sm:break-normal max-w-full px-0.5" title={studentEmail}>
                  {studentEmail}
                </span>
              </div>
            </div>

            {/* Dashed Horizontal Divider */}
            <div className="border-t border-dashed border-slate-200/80 my-1" />

            {/* Quotation + Social Links Container (clean unified row with margin to clear curled corner) */}
            <div className="pt-1.5 mr-16 sm:mr-20">
              <div className="bg-[#f6f2fe] px-3.5 py-2 rounded-2xl flex items-center justify-between gap-3 shadow-xs border border-purple-100/80">
                
                {/* Quote Text */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[#6722f4] font-serif text-xl font-black leading-none shrink-0 select-none">
                    “
                  </span>
                  <p className="text-slate-700 text-[11px] sm:text-xs font-semibold whitespace-nowrap overflow-hidden text-ellipsis tracking-tight">
                    Every day is a step towards becoming better.
                  </p>
                </div>

                {/* Vertical Divider */}
                <div className="w-px h-4 bg-purple-200/90 shrink-0" />

                {/* Clickable Social Icons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {(() => {
                    const gh = user.socials?.find((s: any) => s.label === 'GitHub')?.value;
                    const li = user.socials?.find((s: any) => s.label === 'LinkedIn')?.value;
                    const pf = user.socials?.find((s: any) => s.label === 'Portfolio')?.value;
                    const isLink = (v?: string) => v && v !== 'Not connected' && v.trim().length > 0;
                    return (
                      <>
                        <a
                          href={isLink(gh) ? (gh!.startsWith('http') ? gh : `https://${gh}`) : '#'}
                          target={isLink(gh) ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          title={isLink(gh) ? `GitHub: ${gh}` : 'GitHub (Not connected)'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isLink(gh)
                              ? 'bg-slate-900 text-white hover:bg-slate-700 hover:scale-105 shadow-xs cursor-pointer'
                              : 'bg-purple-100/70 text-purple-300 hover:text-purple-400 cursor-default'
                          }`}
                          onClick={(e) => { if (!isLink(gh)) e.preventDefault(); }}
                        >
                          <Github className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={isLink(li) ? (li!.startsWith('http') ? li : `https://${li}`) : '#'}
                          target={isLink(li) ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          title={isLink(li) ? `LinkedIn: ${li}` : 'LinkedIn (Not connected)'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isLink(li)
                              ? 'bg-[#0a66c2] text-white hover:bg-[#004182] hover:scale-105 shadow-xs cursor-pointer'
                              : 'bg-purple-100/70 text-purple-300 hover:text-purple-400 cursor-default'
                          }`}
                          onClick={(e) => { if (!isLink(li)) e.preventDefault(); }}
                        >
                          <Linkedin className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={isLink(pf) ? (pf!.startsWith('http') ? pf : `https://${pf}`) : '#'}
                          target={isLink(pf) ? '_blank' : undefined}
                          rel="noopener noreferrer"
                          title={isLink(pf) ? `Portfolio: ${pf}` : 'Portfolio (Not connected)'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isLink(pf)
                              ? 'bg-[#6722f4] text-white hover:bg-[#5515d0] hover:scale-105 shadow-xs cursor-pointer'
                              : 'bg-purple-100/70 text-purple-300 hover:text-purple-400 cursor-default'
                          }`}
                          onClick={(e) => { if (!isLink(pf)) e.preventDefault(); }}
                        >
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      </>
                    );
                  })()}
                </div>

              </div>
            </div>

            {/* ──────────────────────────────────────────────────────────────────────────
                REALISTIC ORGANIC CURLED / PEELED CORNER (BOTTOM-RIGHT)
               ────────────────────────────────────────────────────────────────────────── */}
            <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none z-10">
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                <defs>
                  {/* Soft violet gradient for the exposed corner underneath the curl */}
                  <linearGradient id="pageCurlPurple" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="55%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>

                  {/* Curled paper flap shading (white → soft lavender) */}
                  <linearGradient id="pageCurlShading" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="45%" stopColor="#f7f4ff" />
                    <stop offset="78%" stopColor="#ece5fb" />
                    <stop offset="100%" stopColor="#d6c9f7" />
                  </linearGradient>

                  {/* Soft shadow cast by the curled flap */}
                  <filter id="pageCurlDropShadow" x="-40%" y="-40%" width="180%" height="180%">
                    <feDropShadow dx="-2.5" dy="-2.5" stdDeviation="4" floodColor="#4c1d95" floodOpacity="0.28" />
                  </filter>
                </defs>

                {/* 1. Exposed soft-violet corner underneath */}
                <path
                  d="M 18 100 L 100 18 L 100 82 Q 100 100 82 100 Z"
                  fill="url(#pageCurlPurple)"
                />

                {/* 2. Curled paper flap with rounded apex + soft shadow */}
                <path
                  d="M 18 100 C 16 68 22 44 34 33 C 44 24 68 16 100 18 L 18 100 Z"
                  fill="url(#pageCurlShading)"
                  filter="url(#pageCurlDropShadow)"
                />
              </svg>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

/** 
 * Unified 3D Binder Ring & Punched Holes Assembly
 * Spans smoothly across the seam between the left and right cards
 */
function BinderRing() {
  return (
    <div className="relative w-16 h-8 flex items-center justify-center">
      <svg viewBox="0 0 68 32" className="w-full h-full overflow-visible">
        <defs>
          {/* Ring 3D Metallic Lavender Cylinder Gradient */}
          <linearGradient id="ringCylinderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#f5f3ff" />
            <stop offset="65%" stopColor="#ddd6fe" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>

          {/* Left Hole Inner Socket Gradient */}
          <radialGradient id="leftHoleDepth" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="75%" stopColor="#1e0845" />
            <stop offset="100%" stopColor="#13042e" />
          </radialGradient>

          {/* Right Hole Inner Socket Gradient */}
          <radialGradient id="rightHoleDepth" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="75%" stopColor="#240440" />
            <stop offset="100%" stopColor="#13042e" />
          </radialGradient>

          {/* Drop shadow for 3D Ring */}
          <filter id="ringShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="3.5" stdDeviation="3" floodColor="#3b0764" floodOpacity="0.32" />
          </filter>
        </defs>

        {/* Left Card Punched Hole Socket */}
        <circle cx="13" cy="16" r="6.5" fill="url(#leftHoleDepth)" stroke="#ffffff" strokeWidth="1.5" />
        
        {/* Right Card Punched Hole Socket */}
        <circle cx="55" cy="16" r="6.5" fill="url(#rightHoleDepth)" stroke="#e2e8f0" strokeWidth="1.5" />

        {/* 3D Tubular Binder Ring Connecting Both Sockets */}
        <rect 
          x="8" 
          y="10" 
          width="52" 
          height="12" 
          rx="6" 
          fill="url(#ringCylinderGrad)" 
          stroke="#ffffff" 
          strokeWidth="0.75" 
          filter="url(#ringShadow)" 
        />

        {/* Top Edge Specular White Highlight */}
        <rect x="12" y="11.5" width="44" height="2" rx="1" fill="#ffffff" opacity="0.9" />
      </svg>
    </div>
  );
}
