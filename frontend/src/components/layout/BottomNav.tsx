import { useState, useEffect, useRef } from 'react';
import { Home, GraduationCap, Code2, Bell, User } from 'lucide-react';
import { bottomNavItems, type Route } from '@/lib/routes';
import { useNav } from '@/lib/nav';
import { useNotifications } from '@/lib/NotificationsContext';
import { usePreload } from '@/lib/PreloadContext';
import { cn } from '@/lib/utils';
import { getIcon } from '@/lib/icons';

export function BottomNav() {
  const { route, navigate } = useNav();
  const { unreadCount: unread } = useNotifications();
  const { prefetchRoute } = usePreload();
  const hoverTimers = useRef<Record<string, any>>({});

  const handleMouseEnter = (itemId: string) => {
    if (hoverTimers.current[itemId]) clearTimeout(hoverTimers.current[itemId]);
    hoverTimers.current[itemId] = setTimeout(() => {
      prefetchRoute(itemId);
    }, 60);
  };

  const handleMouseLeave = (itemId: string) => {
    if (hoverTimers.current[itemId]) {
      clearTimeout(hoverTimers.current[itemId]);
      delete hoverTimers.current[itemId];
    }
  };

  const handleTouchStart = (itemId: string) => {
    prefetchRoute(itemId);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-ink-100 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const Icon = getIcon(item.icon);
          const active = route === item.id || (item.id === 'learning' && (route === 'course' || route === 'lesson'));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id as Route)}
              onMouseEnter={() => handleMouseEnter(item.id)}
              onMouseLeave={() => handleMouseLeave(item.id)}
              onTouchStart={() => handleTouchStart(item.id)}
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
