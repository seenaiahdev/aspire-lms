import { Home, GraduationCap, Code2, Bell, User } from 'lucide-react';
import { bottomNavItems, type Route } from '@/lib/routes';
import { useNav } from '@/lib/nav';
import { notifications } from '@/data/mock';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

export function BottomNav() {
  const { route, navigate } = useNav();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-ink-100 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const Icon = (Icons as any)[item.icon] as Icons.LucideIcon;
          const active = route === item.id || (item.id === 'learning' && (route === 'course' || route === 'lesson'));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id as Route)}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors',
                active ? 'text-primary-600' : 'text-ink-400',
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-2xs font-semibold">{item.label}</span>
              {item.id === 'notifications' && unread > 0 && (
                <span className="absolute top-0 right-2 w-4 h-4 rounded-full bg-error-500 text-white text-2xs font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
              {active && <span className="absolute -top-0.5 w-8 h-1 rounded-full bg-primary-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
