import { useState, useEffect, useRef } from 'react';
import { User, Bell, Palette, Shield, Link2, Check, Camera, Github, Linkedin, Globe, Zap, Plus, X, Loader2, ChevronDown, Search } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { useUser } from '@/lib/UserContext';
import { fetchStudentProfile, upsertStudentProfile } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SearchableYearSelectProps {
  label: string;
  value: number | '';
  onChange: (val: number) => void;
  options: number[];
  placeholder: string;
}

function SearchableYearSelect({ label, value, onChange, options, placeholder }: SearchableYearSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toString().includes(search));

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">{label}</label>
      
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm font-semibold text-slate-900 flex items-center justify-between shadow-sm cursor-pointer"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400 font-normal'}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-slate-450 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-slate-200/80 rounded-2xl shadow-xl max-h-64 overflow-hidden flex flex-col animate-slide-up">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search year..."
              className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-48 divide-y divide-slate-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => {
                    onChange(year);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-purple-50 hover:text-[#7c3aed] transition-all flex items-center justify-between",
                    value === year ? "bg-purple-50 text-[#7c3aed]" : "text-slate-700"
                  )}
                >
                  <span>{year}</span>
                  {value === year && <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]"></span>}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs font-medium text-slate-400">
                No years match "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsScreen() {
  const { user: currentUser, updateUser, refetchUser } = useUser();
  const [section, setSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [notifications, setNotifications] = useState({
    assignments: true, live: true, placement: true, weekly: true,
  });
  const [socialsForm, setSocialsForm] = useState({
    github: '',
    linkedin: '',
    portfolio: '',
  });
  const [editingApps, setEditingApps] = useState({
    github: false,
    linkedin: false,
    portfolio: false,
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    program: currentUser.program,
    college: currentUser.college || '',
    startYear: currentUser.startYear || 2023,
    endYear: currentUser.endYear || 2027,
    bio: currentUser.bio || '',
  });

  // Skills management state
  const [skills, setSkills] = useState<{ name: string; level: number }[]>(currentUser.skills || []);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState(50);

  const [statsForm, setStatsForm] = useState({
    progress: currentUser.xp || 0,
    streak: currentUser.streak || 0,
  });

  // Load saved settings from database on mount
  useEffect(() => {
    async function loadSettings() {
      if (!currentUser.id || currentUser.id === 'u1') return; // skip mock user
      setLoadingSettings(true);
      try {
        const profile = await fetchStudentProfile(currentUser.id);
        if (profile) {
          setProfileForm({
            name: currentUser.name,
            email: currentUser.email,
            program: profile.program || currentUser.program,
            college: profile.college || '',
            startYear: profile.start_year || currentUser.startYear || 2023,
            endYear: profile.end_year || currentUser.endYear || 2027,
            bio: profile.bio || '',
          });
          
          const realProgress = (profile.progress !== undefined && profile.progress !== null) ? profile.progress : (currentUser.xp || 0);
          const realStreak = (profile.attendance !== undefined && profile.attendance !== null) ? profile.attendance : (currentUser.streak || 0);
          
          setStatsForm({
            progress: realProgress,
            streak: realStreak,
          });

          setSkills(profile.skills || []);
          
          setNotifications({
            assignments: profile.notif_assignments,
            live: profile.notif_live,
            placement: profile.notif_placement,
            weekly: profile.notif_weekly,
          });
          const githubVal = profile.socials?.find((s: any) => s.label === 'GitHub')?.value || '';
          const linkedinVal = profile.socials?.find((s: any) => s.label === 'LinkedIn')?.value || '';
          const portfolioVal = profile.socials?.find((s: any) => s.label === 'Portfolio')?.value || '';

          setSocialsForm({
            github: githubVal === 'Not connected' ? '' : githubVal,
            linkedin: linkedinVal === 'Not connected' ? '' : linkedinVal,
            portfolio: portfolioVal === 'Not connected' ? '' : portfolioVal,
          });
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, [currentUser.id]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await upsertStudentProfile(currentUser.id, {
        bio: profileForm.bio,
        program: profileForm.program,
        college: profileForm.college,
        start_year: profileForm.startYear,
        end_year: profileForm.endYear,
        skills,
      });
      // Optimistic UI update + sync from DB
      updateUser({
        program: profileForm.program,
        college: profileForm.college,
        startYear: profileForm.startYear,
        endYear: profileForm.endYear,
        bio: profileForm.bio,
        skills,
      });
      await refetchUser();
      showToast('Profile details saved successfully.', 'success');
    } catch (e) {
      console.error('Failed to save profile:', e);
      showToast('Failed to save profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await upsertStudentProfile(currentUser.id, {
        notif_assignments: notifications.assignments,
        notif_live: notifications.live,
        notif_placement: notifications.placement,
        notif_weekly: notifications.weekly,
      });
      showToast('Notification preferences saved successfully.', 'success');
    } catch (e) {
      console.error('Failed to save notifications:', e);
      showToast('Failed to save preferences. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (app: 'github' | 'linkedin' | 'portfolio') => {
    setSaving(true);
    const label = app === 'github' ? 'GitHub' : app === 'linkedin' ? 'LinkedIn' : 'Portfolio';
    const updatedForm = { ...socialsForm, [app]: '' };
    setSocialsForm(updatedForm);

    const updatedSocials = [
      { label: 'GitHub', value: updatedForm.github.trim() || 'Not connected' },
      { label: 'LinkedIn', value: updatedForm.linkedin.trim() || 'Not connected' },
      { label: 'Portfolio', value: updatedForm.portfolio.trim() || 'Not connected' },
    ];

    try {
      const updates: any = { socials: updatedSocials };
      if (app === 'github') updates.connected_github = false;
      if (app === 'linkedin') updates.connected_linkedin = false;
      if (app === 'portfolio') updates.connected_portfolio = false;

      await upsertStudentProfile(currentUser.id, updates);
      updateUser({ socials: updatedSocials });
      await refetchUser();
      setEditingApps(prev => ({ ...prev, [app]: false }));
      showToast(`${label} disconnected successfully.`, 'success');
    } catch (e) {
      console.error('Failed to disconnect:', e);
      showToast('Failed to disconnect. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInlineSave = async (app: 'github' | 'linkedin' | 'portfolio', val: string) => {
    if (!val.trim()) {
      showToast('Please enter a valid link.', 'error');
      return;
    }
    setSaving(true);
    const label = app === 'github' ? 'GitHub' : app === 'linkedin' ? 'LinkedIn' : 'Portfolio';
    const updatedForm = { ...socialsForm, [app]: val.trim() };
    
    const updatedSocials = [
      { label: 'GitHub', value: updatedForm.github.trim() || 'Not connected' },
      { label: 'LinkedIn', value: updatedForm.linkedin.trim() || 'Not connected' },
      { label: 'Portfolio', value: updatedForm.portfolio.trim() || 'Not connected' },
    ];

    try {
      const updates: any = { socials: updatedSocials };
      if (app === 'github') updates.connected_github = true;
      if (app === 'linkedin') updates.connected_linkedin = true;
      if (app === 'portfolio') updates.connected_portfolio = true;

      await upsertStudentProfile(currentUser.id, updates);
      updateUser({ socials: updatedSocials });
      await refetchUser();
      setEditingApps(prev => ({ ...prev, [app]: false }));
      showToast(`${label} link saved successfully.`, 'success');
    } catch (e) {
      console.error('Failed to save connection:', e);
      showToast('Failed to save connection link.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const trimmedName = newSkillName.trim();
    if (!trimmedName) return;
    if (skills.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      showToast('This skill already exists.', 'error');
      return;
    }
    setSkills([...skills, { name: trimmedName, level: newSkillLevel }]);
    setNewSkillName('');
    setNewSkillLevel(50);
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const updateSkillLevel = (index: number, level: number) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], level };
    setSkills(updated);
  };

  const sections = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'skills', label: 'Skills & Expertise', icon: Zap },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'connected', label: 'Connected Accounts', icon: Link2 },
  ];

  const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        'relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner flex items-center focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/50 focus:ring-offset-1',
        active ? 'bg-[#7c3aed]' : 'bg-slate-200'
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
                  ? 'bg-purple-50 text-[#7c3aed] shadow-sm border border-purple-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
              )}
            >
              <s.icon className={cn(
                "w-5 h-5 transition-colors",
                section === s.id ? "text-[#7c3aed]" : "text-slate-400 group-hover:text-slate-600"
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
                  <div className="relative">
                    <Avatar src={currentUser.avatar} name={currentUser.name} size="xl" className="w-24 h-24 shadow-sm border-2 border-slate-100" />
                  </div>
                  <div className="text-center sm:text-left space-y-1 self-center">
                    <h3 className="font-extrabold text-slate-900 text-lg">Profile Avatar</h3>
                    <p className="text-xs font-semibold text-slate-500 max-w-xs">
                      Managing profile pictures is disabled for this demo.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Full Name</label>
                    <input 
                      value={profileForm.name}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-500 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Email Address</label>
                    <input 
                      value={profileForm.email}
                      readOnly
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-500 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">College / Institution</label>
                    <input 
                      value={profileForm.college} 
                      onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                      placeholder="e.g. IIT Hyderabad"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm font-semibold text-slate-900" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Program / Degree</label>
                    <input 
                      value={profileForm.program} 
                      onChange={(e) => setProfileForm({ ...profileForm, program: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm font-semibold text-slate-900" 
                    />
                  </div>
                  <SearchableYearSelect
                    label="Starting Year"
                    value={profileForm.startYear || ''}
                    placeholder="Select Starting Year"
                    options={Array.from({ length: (new Date().getFullYear()) - 1989 }, (_, i) => new Date().getFullYear() - i)}
                    onChange={(newStart) => {
                      const newEnd = profileForm.endYear < newStart ? newStart + 4 : profileForm.endYear;
                      setProfileForm({ ...profileForm, startYear: newStart, endYear: newEnd });
                    }}
                  />
                  <SearchableYearSelect
                    label="Ending Year (Graduation)"
                    value={profileForm.endYear || ''}
                    placeholder="Select Graduation Year"
                    options={
                      profileForm.startYear
                        ? Array.from({ length: 7 }, (_, i) => profileForm.startYear + i)
                        : Array.from({ length: 51 }, (_, i) => (new Date().getFullYear() + 10) - i)
                    }
                    onChange={(newEnd) => setProfileForm({ ...profileForm, endYear: newEnd })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Bio & Tagline</label>
                  <textarea 
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm font-semibold text-slate-900 min-h-[100px] resize-none" 
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setProfileForm({
                      name: currentUser.name,
                      email: currentUser.email,
                      program: currentUser.program,
                      college: currentUser.college || '',
                      startYear: currentUser.startYear || 2023,
                      endYear: currentUser.endYear || 2027,
                      bio: currentUser.bio || '',
                    })}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Details'}
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ════════ SKILLS & EXPERTISE SECTION ════════ */}
          {section === 'skills' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Skills & Expertise</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Add your technical skills and set proficiency levels. Changes are saved with your profile.</p>
                </div>

                {/* Add New Skill */}
                <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Skill Name</label>
                    <input
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      placeholder="e.g. React, Python, Docker..."
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-sm font-semibold text-slate-900"
                    />
                  </div>
                  <div className="w-full sm:w-32 space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Level ({newSkillLevel}%)</label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(Number(e.target.value))}
                      className="w-full accent-[#7c3aed] mt-2"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={addSkill}
                      disabled={!newSkillName.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Skills List */}
                {skills.length === 0 ? (
                  <div className="text-center py-10 space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <Zap className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-500">No skills added yet</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Use the form above to add your technical skills.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {skills.map((skill, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-purple-200 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-extrabold text-slate-800">{skill.name}</span>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{skill.level}%</span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={skill.level}
                            onChange={(e) => updateSkillLevel(idx, Number(e.target.value))}
                            className="w-full accent-[#7c3aed] h-1.5"
                          />
                        </div>
                        <button
                          onClick={() => removeSkill(idx)}
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-slate-400 transition-colors shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Skills'}
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

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button 
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {section === 'connected' && (
            <Card className="rounded-[2rem] border border-slate-200/90 shadow-sm bg-white overflow-hidden">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">Connected Accounts</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Link your external profiles to display them on your public student profile.</p>
                </div>

                <div className="space-y-4 pt-4">
                  {/* GitHub */}
                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all", socialsForm.github ? "bg-black text-white" : "bg-slate-200 text-slate-500")}>
                          <Github className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-800">GitHub Profile</p>
                          <p className={cn("text-[11px] font-semibold mt-0.5 truncate max-w-[200px] sm:max-w-xs", socialsForm.github ? "text-emerald-600 font-bold" : "text-slate-500")}>
                            {socialsForm.github ? socialsForm.github : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      
                      {!editingApps.github && (
                        <div className="flex gap-2 shrink-0">
                          {socialsForm.github ? (
                            <>
                              <button 
                                onClick={() => setEditingApps({ ...editingApps, github: true })}
                                className="text-xs font-extrabold px-3 py-1.5 rounded-lg border border-slate-250 text-slate-650 hover:bg-slate-100 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDisconnect('github')}
                                className="text-xs font-extrabold px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => setEditingApps({ ...editingApps, github: true })}
                              className="text-xs font-extrabold px-3.5 py-1.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-purple-100/50 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {editingApps.github && (
                      <div className="flex gap-2 pt-2 animate-fade-in">
                        <input 
                          value={socialsForm.github}
                          onChange={(e) => setSocialsForm({ ...socialsForm, github: e.target.value })}
                          placeholder="e.g. https://github.com/username"
                          className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-xs font-semibold text-slate-900" 
                        />
                        <button
                          onClick={() => handleInlineSave('github', socialsForm.github)}
                          disabled={saving}
                          className="px-3 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold flex items-center justify-center shadow-sm disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            const original = currentUser.socials?.find((s: any) => s.label === 'GitHub')?.value || '';
                            setSocialsForm({ ...socialsForm, github: original === 'Not connected' ? '' : original });
                            setEditingApps({ ...editingApps, github: false });
                          }}
                          disabled={saving}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center justify-center disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* LinkedIn */}
                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all", socialsForm.linkedin ? "bg-[#0077b5] text-white" : "bg-slate-200 text-slate-500")}>
                          <Linkedin className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-800">LinkedIn Profile</p>
                          <p className={cn("text-[11px] font-semibold mt-0.5 truncate max-w-[200px] sm:max-w-xs", socialsForm.linkedin ? "text-[#0077b5] font-bold" : "text-slate-500")}>
                            {socialsForm.linkedin ? socialsForm.linkedin : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      
                      {!editingApps.linkedin && (
                        <div className="flex gap-2 shrink-0">
                          {socialsForm.linkedin ? (
                            <>
                              <button 
                                onClick={() => setEditingApps({ ...editingApps, linkedin: true })}
                                className="text-xs font-extrabold px-3 py-1.5 rounded-lg border border-slate-250 text-slate-650 hover:bg-slate-100 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDisconnect('linkedin')}
                                className="text-xs font-extrabold px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => setEditingApps({ ...editingApps, linkedin: true })}
                              className="text-xs font-extrabold px-3.5 py-1.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-purple-100/50 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {editingApps.linkedin && (
                      <div className="flex gap-2 pt-2 animate-fade-in">
                        <input 
                          value={socialsForm.linkedin}
                          onChange={(e) => setSocialsForm({ ...socialsForm, linkedin: e.target.value })}
                          placeholder="e.g. https://linkedin.com/in/username"
                          className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-xs font-semibold text-slate-900" 
                        />
                        <button
                          onClick={() => handleInlineSave('linkedin', socialsForm.linkedin)}
                          disabled={saving}
                          className="px-3 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold flex items-center justify-center shadow-sm disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            const original = currentUser.socials?.find((s: any) => s.label === 'LinkedIn')?.value || '';
                            setSocialsForm({ ...socialsForm, linkedin: original === 'Not connected' ? '' : original });
                            setEditingApps({ ...editingApps, linkedin: false });
                          }}
                          disabled={saving}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center justify-center disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Portfolio */}
                  <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all", socialsForm.portfolio ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500")}>
                          <Globe className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-800">Portfolio</p>
                          <p className={cn("text-[11px] font-semibold mt-0.5 truncate max-w-[200px] sm:max-w-xs", socialsForm.portfolio ? "text-emerald-600 font-bold" : "text-slate-500")}>
                            {socialsForm.portfolio ? socialsForm.portfolio : 'Not connected'}
                          </p>
                        </div>
                      </div>
                      
                      {!editingApps.portfolio && (
                        <div className="flex gap-2 shrink-0">
                          {socialsForm.portfolio ? (
                            <>
                              <button 
                                onClick={() => setEditingApps({ ...editingApps, portfolio: true })}
                                className="text-xs font-extrabold px-3 py-1.5 rounded-lg border border-slate-250 text-slate-650 hover:bg-slate-100 transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDisconnect('portfolio')}
                                className="text-xs font-extrabold px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => setEditingApps({ ...editingApps, portfolio: true })}
                              className="text-xs font-extrabold px-3.5 py-1.5 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-purple-100/50 transition-colors"
                            >
                              Connect
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {editingApps.portfolio && (
                      <div className="flex gap-2 pt-2 animate-fade-in">
                        <input 
                          value={socialsForm.portfolio}
                          onChange={(e) => setSocialsForm({ ...socialsForm, portfolio: e.target.value })}
                          placeholder="e.g. https://yourportfolio.com"
                          className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100 focus:outline-none transition-all text-xs font-semibold text-slate-900" 
                        />
                        <button
                          onClick={() => handleInlineSave('portfolio', socialsForm.portfolio)}
                          disabled={saving}
                          className="px-3 py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-extrabold flex items-center justify-center shadow-sm disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            const original = currentUser.socials?.find((s: any) => s.label === 'Portfolio')?.value || '';
                            setSocialsForm({ ...socialsForm, portfolio: original === 'Not connected' ? '' : original });
                            setEditingApps({ ...editingApps, portfolio: false });
                          }}
                          disabled={saving}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center justify-center disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

        </div>
      </div>
      
      {/* Settings Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className="bg-white text-slate-900 px-5 py-3 rounded-2xl shadow-xl border border-slate-200/60 font-semibold text-sm flex items-center gap-3">
            {toast.type === 'success' ? (
              <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <X className="w-4 h-4 text-rose-600" />
              </div>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
