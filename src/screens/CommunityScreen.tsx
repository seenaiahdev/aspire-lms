import { useState } from 'react';
import { Users, Heart, MessageCircle, Share2, Pin, Megaphone, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import { communityPosts, announcements } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

export function CommunityScreen() {
  const [tab, setTab] = useState('feed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink-900">Community</h2>
          <p className="text-ink-500 text-sm mt-1">Connect with students and mentors</p>
        </div>
        <Button leftIcon={<Sparkles className="w-4 h-4" />}>New Post</Button>
      </div>

      <Tabs
        variant="pills"
        tabs={[
          { id: 'feed', label: 'Discussion Feed' },
          { id: 'doubts', label: 'Doubts' },
          { id: 'announcements', label: 'Announcements' },
          { id: 'events', label: 'Events' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'feed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Create post */}
            <Card className="p-4">
              <div className="flex gap-3">
                <Avatar src="https://i.pravatar.cc/200?img=12" name="Aarav" size="md" />
                <input className="input" placeholder="Share something with the community..." />
              </div>
            </Card>

            {communityPosts.map((post) => (
              <Card key={post.id} className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar src={post.avatar} name={post.author} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink-800 text-sm">{post.author}</p>
                      {post.role === 'mentor' && <Badge variant="primary" size="sm">Mentor</Badge>}
                    </div>
                    <p className="text-xs text-ink-500">{post.time}</p>
                  </div>
                  {post.role === 'mentor' && <Pin className="w-4 h-4 text-ink-300" />}
                </div>
                <p className="text-sm text-ink-700 mb-3 leading-relaxed">{post.content}</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {post.tags.map((t: string) => <span key={t} className="text-xs text-primary-600 font-medium">#{t}</span>)}
                </div>
                <div className="flex items-center gap-6 pt-3 border-t border-ink-100">
                  <button className={cn('flex items-center gap-1.5 text-sm transition-colors', post.liked ? 'text-error-500' : 'text-ink-500 hover:text-error-500')}>
                    <Heart className={cn('w-4 h-4', post.liked && 'fill-error-500')} /> {post.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-primary-600 transition-colors">
                    <MessageCircle className="w-4 h-4" /> {post.comments}
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-primary-600 transition-colors ml-auto">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-600" />Trending Topics</h3>
              <div className="space-y-2">
                {['#SystemDesign', '#ReactPatterns', '#MLProjects', '#CareerAdvice', '#OpenSource'].map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-ink-50 cursor-pointer">
                    <span className="text-sm font-medium text-primary-600">{t}</span>
                    <span className="text-xs text-ink-400">{[234, 189, 156, 132, 98][i]} posts</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary-600" />Active Members</h3>
              <div className="space-y-3">
                {communityPosts.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Avatar src={p.avatar} name={p.author} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink-800">{p.author}</p>
                      <p className="text-xs text-ink-500">{p.role}</p>
                    </div>
                    <Button size="sm" variant="outline">Follow</Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'announcements' && (
        <div className="space-y-3 max-w-2xl">
          {announcements.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  a.priority === 'high' ? 'bg-error-100' : a.priority === 'medium' ? 'bg-warning-100' : 'bg-ink-100'
                }`}>
                  <Megaphone className={`w-5 h-5 ${a.priority === 'high' ? 'text-error-600' : a.priority === 'medium' ? 'text-warning-600' : 'text-ink-500'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-ink-900 text-sm">{a.title}</h3>
                    <Badge variant={a.priority === 'high' ? 'error' : a.priority === 'medium' ? 'warning' : 'default'}>{a.priority}</Badge>
                  </div>
                  <p className="text-sm text-ink-600 mb-2">{a.message}</p>
                  <p className="text-xs text-ink-400">{a.time}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'events' && (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-primary-600" />
          </div>
          <h3 className="font-bold text-ink-800 mb-1">Upcoming Events</h3>
          <p className="text-sm text-ink-500 mb-4">No events scheduled right now. Check back soon!</p>
        </Card>
      )}

      {tab === 'doubts' && (
        <div className="space-y-3 max-w-3xl">
          {communityPosts.filter(p => p.tags.includes('Help')).concat(communityPosts.filter(p => p.tags.includes('DSA'))).map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start gap-3">
                <Avatar src={p.avatar} name={p.author} size="md" />
                <div className="flex-1">
                  <p className="font-semibold text-ink-800 text-sm">{p.author}</p>
                  <p className="text-sm text-ink-600 mt-1">{p.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-ink-500">{p.time}</span>
                    <button className="text-xs text-primary-600 font-semibold">Reply</button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
