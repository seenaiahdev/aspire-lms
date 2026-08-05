import { useState } from 'react';
import { User, Bell, Palette, Shield, Link2, Check, Camera, Github, Linkedin } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { currentUser } from '@/data/mock';
import { cn } from '@/lib/utils';

export function SettingsScreen() {
  const [section, setSection] = useState('profile');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState({
    assignments: true, live: true, community: false, placement: true, weekly: true,
  });

  const sections = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'connected', label: 'Connected Accounts', icon: Link2 },
  ];

  const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        'relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner flex items-center focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50 focus:ring-offset-1',
        active ? 'bg-[#3b82f6]' : 'bg-slate-200'
      )}
    >
      <span 
        className={cn(
          'absolute w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300',
          active ? 'translate-x-6' : 'translate-x-0.5'
        )} 
      />
    </button>
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      
      {/* Header */}
      <div className="pb-2">
        <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Account Settings
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
          Manage your personal details, preferences, and connected services.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2 sticky top-24">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold transition-all group',
                section === s.id 
                  ? 'bg-blue-50 text-[#3b82f6] shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
              )}
            >
              <s.icon className={cn(
                "w-5 h-5 transition-colors",
                section === s.id ? "text-[#3b82f6]" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          
          {section === 'profile' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-8">
                
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-slate-100 pb-8">
                  <div className="relative group cursor-pointer">
                    <Avatar src={currentUser.avatar} name={currentUser.name} size="xl" className="w-24 h-24 shadow-sm border-2 border-slate-100" />
                    <div className="absolute inset-0 bg-slate-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-center sm:text-left space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-lg">Profile Avatar</h3>
                    <p className="text-xs font-semibold text-slate-500 max-w-xs">
                      We support PNG, JPG, or GIF under 5MB. A square image works best.
                    </p>
                    <button className="px-4 py-2 mt-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-colors">
                      Upload New Picture
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Full Name</label>
                    <input className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm font-semibold text-slate-900" defaultValue={currentUser.name} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Email Address</label>
                    <input className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm font-semibold text-slate-900" defaultValue={currentUser.email} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Program</label>
                    <input className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm font-semibold text-slate-900" defaultValue={currentUser.program} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Semester</label>
                    <select className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm font-semibold text-slate-900 appearance-none">
                      <option>Semester {currentUser.semester}</option>
                      <option>Semester {currentUser.semester + 1}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Bio & Tagline</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#3b82f6] focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all text-sm font-semibold text-slate-900 min-h-[100px] resize-none" 
                    defaultValue={currentUser.bio} 
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-all">
                    Cancel
                  </button>
                  <button className="px-6 py-3 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Save Details
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {section === 'notifications' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Push & Email Notifications</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Control exactly what updates you want to receive.</p>
                </div>
                
                <div className="space-y-3 pt-4">
                  {Object.entries(notifications).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition-colors">
                      <div>
                        <p className="text-sm font-extrabold text-slate-800 capitalize">{key} Alerts</p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Stay updated on the latest {key} activities</p>
                      </div>
                      <Toggle 
                        active={val} 
                        onClick={() => setNotifications({ ...notifications, [key]: !val })} 
                      />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}



          {section === 'privacy' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Privacy & Security</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Manage what information is visible to the community.</p>
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">Public Profile</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Allow other students to view your profile</p>
                    </div>
                    <Toggle active={true} onClick={() => {}} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">Leaderboard Visibility</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Display your name and rank on global charts</p>
                    </div>
                    <Toggle active={true} onClick={() => {}} />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                    <div>
                      <p className="text-sm font-extrabold text-slate-800">Activity Status</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Show when you are currently online</p>
                    </div>
                    <Toggle active={false} onClick={() => {}} />
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {section === 'connected' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Connected Apps</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Link your external accounts for seamless logins and integrations.</p>
                </div>

                <div className="space-y-4 pt-4">
                  {[
                    { name: 'GitHub', desc: 'Sync repositories and code stats', icon: Github, connected: true, color: 'text-slate-800' },
                    { name: 'LinkedIn', desc: 'Showcase your certificates automatically', icon: Linkedin, connected: true, color: 'text-blue-600' },
                    { name: 'Discord', desc: 'Connect to community servers', icon: Link2, connected: false, color: 'text-[#5865F2]' },
                  ].map((acc) => (
                    <div key={acc.name} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-blue-100 transition-colors group bg-white">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <acc.icon className={cn("w-6 h-6", acc.color)} />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900">{acc.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{acc.desc}</p>
                        </div>
                      </div>
                      <button className={cn(
                        "px-4 py-2 rounded-xl text-xs font-extrabold transition-all border",
                        acc.connected 
                          ? "bg-white border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200" 
                          : "bg-blue-50 border-blue-100 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white"
                      )}>
                        {acc.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
