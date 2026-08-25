import { useState, useEffect } from 'react';
import { Bell, FileText, Radio, MessageCircle, Briefcase, Settings, CheckCheck, Trash2, Loader2 } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { fetchNotifications, updateNotificationReadStatus, markAllNotificationsAsRead, deleteNotificationRow } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

const typeConfig: Record<string, { color: string; icon: any }> = {
  assignment: { color: 'warning', icon: FileText },
  live: { color: 'error', icon: Radio },
  community: { color: 'accent', icon: MessageCircle },
  placement: { color: 'primary', icon: Briefcase },
  system: { color: 'ink', icon: Settings },
};

export function NotificationsScreen() {
  const { user } = useUser();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      try {
        if (user?.id) {
          const data = await fetchNotifications(user.id);
          setItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [user?.id]);

  const filtered = items.filter((n) => tab === 'all' ? true : tab === 'unread' ? !n.read : n.type === tab);
  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    const target = items.find(n => n.id === id);
    if (target && !target.read) {
      try {
        await updateNotificationReadStatus(id, true);
        setItems(items.map(n => n.id === id ? { ...n, read: true } : n));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await markAllNotificationsAsRead(user.id);
      setItems(items.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationRow(id);
      setItems(items.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

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
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-10 h-10 text-ink-300 mx-auto mb-3" />
            <p className="text-sm text-ink-500">No notifications yet</p>
          </Card>
        ) : (
          filtered.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.system;
            const Icon = (Icons as any)[n.icon] as Icons.LucideIcon || cfg.icon;
            return (
              <Card
                key={n.id}
                hover
                onClick={() => markRead(n.id)}
                className={cn('p-4 cursor-pointer', !n.read && 'ring-1 ring-primary-200')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    cfg.color === 'ink' ? 'bg-ink-100' : `bg-${cfg.color}-100`,
                  )}>
                    <Icon className={cn('w-5 h-5', cfg.color === 'ink' ? 'text-ink-500' : `text-${cfg.color}-600`)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-ink-800 text-sm">{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-ink-600 mb-1">{n.message}</p>
                    <p className="text-xs text-ink-400">{n.time}</p>
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
