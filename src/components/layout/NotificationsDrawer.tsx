import { useState } from 'react';
import { Bell, X, CheckCheck, Clock, AlertTriangle, Sparkles, FileText, Radio, Check } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { notifications as initialNotifications } from '@/data/mock';

export function NotificationsDrawer() {
  const { notificationsOpen, setNotificationsOpen } = useNav();
  const [notificationsList, setNotificationsList] = useState<typeof initialNotifications>([]);

  if (!notificationsOpen) return null;

  const unreadCount = notificationsList.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
  };

  return (
    <>
      {/* Invisible Backdrop Overlay for clicking outside */}
      <div
        className="fixed inset-0 z-[9998] bg-transparent"
        onClick={() => setNotificationsOpen(false)}
      />

      {/* Floating Dropdown Panel */}
      <aside className="fixed top-[72px] right-4 sm:right-[72px] w-80 sm:w-96 max-h-[calc(100vh-6rem)] h-auto z-[9999] bg-white border border-slate-200/90 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-2xl flex flex-col font-sans animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden origin-top-right">
        
        {/* Drawer Top Header (Electric Blue Gradient matching Screenshot) */}
        <div className="p-4 sm:p-5 border-b border-blue-700/30 flex items-center justify-between bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#3b82f6] text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shrink-0 shadow-inner">
              <Bell className="w-5 h-5 text-white fill-white/20" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg leading-tight tracking-tight">Notifications</h3>
              <p className="text-xs font-medium text-blue-100/95 mt-0.5">
                Live class alerts, tasks & job updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/25 flex items-center justify-center transition-all active:scale-95"
              >
                <CheckCheck className="w-4 h-4 text-white" />
              </button>
            )}

            <button
              onClick={() => setNotificationsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/25 flex items-center justify-center transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {notificationsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto stroke-[1.5]" />
              <p className="text-xs font-semibold">No notifications right now</p>
            </div>
          ) : (
            notificationsList.map((item) => {
              const isUnread = !item.read;
              return (
                <div
                  key={item.id}
                  onClick={() => toggleRead(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer relative group ${
                    isUnread
                      ? 'bg-primary-50/70 border-primary-200/80 shadow-xs'
                      : 'bg-white border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary-600 ring-2 ring-white" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      item.type === 'assignment' ? 'bg-amber-100 text-amber-700' :
                      item.type === 'class' ? 'bg-indigo-100 text-indigo-700' :
                      item.type === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {item.type === 'assignment' ? <FileText className="w-4 h-4" /> :
                       item.type === 'class' ? <Radio className="w-4 h-4" /> :
                       item.type === 'system' ? <AlertTriangle className="w-4 h-4" /> :
                       <Sparkles className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className={`text-xs font-bold leading-snug ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 text-center">
          <p className="text-[10px] font-semibold text-slate-500">
            AspireNext Real-Time Alert System
          </p>
        </div>

      </aside>
    </>
  );
}
