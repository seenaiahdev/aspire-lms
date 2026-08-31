import { useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications, getNotificationIconConfig } from '@/lib/NotificationsContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

export function NotificationsScreen() {
  const { notifications: items, unreadCount: unread, markRead, markAllRead, deleteNotification } = useNotifications();
  const [tab, setTab] = useState('all');

  const filtered = items.filter((n) => tab === 'all' ? true : tab === 'unread' ? !n.read : n.type === tab);

  const handleDeleteNotification = (id: string) => deleteNotification(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink-900">Notifications</h2>
          <p className="text-ink-500 text-sm mt-1">{unread} unread notifications</p>
        </div>
        <Button variant="ghost" size="sm" leftIcon={<CheckCheck className="w-4 h-4" />} onClick={markAllRead}>Mark all read</Button>
      </div>

      <Tabs
        variant="pills"
        tabs={[
          { id: 'all', label: 'All', badge: items.length },
          { id: 'unread', label: 'Unread', badge: unread },
          { id: 'assignment', label: 'Assignments' },
          { id: 'live', label: 'Live Classes' },
          { id: 'community', label: 'Community' },
          { id: 'placement', label: 'Placement' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-10 h-10 text-ink-300 mx-auto mb-3" />
            <p className="text-sm text-ink-500">No notifications yet</p>
          </Card>
        ) : (
          filtered.map((n) => {
            const { Icon, bg } = getNotificationIconConfig(n);
            return (
              <Card
                key={n.id}
                hover
                onClick={() => markRead(n.id)}
                className={cn('p-4 cursor-pointer', !n.read && 'ring-1 ring-primary-200')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                    bg
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-ink-800 text-sm">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-ink-600 mb-1">{n.message}</p>
                    <p className="text-xs text-ink-400">{n.time || n.timestamp || 'Just now'}</p>
                  </div>
                  <button 
                    className="text-ink-300 hover:text-error-500 transition-colors p-1" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDeleteNotification(n.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
