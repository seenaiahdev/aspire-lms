// Curated icon registry — STATIC named imports so Vite can tree-shake lucide-react.
//
// Previously four files did `import * as Icons from 'lucide-react'` and looked icons up by
// string name (`Icons[name]`). A dynamic namespace access can't be tree-shaken, so the whole
// ~1,600-icon library shipped as a single ~707KB chunk. Importing only the icons we actually
// use cuts that by ~90%.
//
// Nav icons (from routes.ts) are all present and exact. Badge/achievement icons come from the
// DB as free-form strings; the common ones are mapped here and anything unknown falls back to
// Award (same behaviour as the old `|| Icons.Award`). If a badge renders as the Award icon
// unexpectedly, add its lucide name to the imports + registry below.
import {
  // ── nav / app config (routes.ts) ──
  LayoutDashboard, GraduationCap, Radio, MapPin, FileText, Code2, FolderGit2,
  Library, CalendarDays, Briefcase, Award, Gift, Home, Bell, User,
  // ── common badge / achievement icons ──
  Trophy, Star, Medal, Crown, Zap, Flame, Target, Rocket, Sparkles, Gem,
  CheckCircle, CheckCircle2, BookOpen, Brain, TrendingUp, Users, Clock,
  Calendar, Heart, ThumbsUp, Shield, ShieldCheck, Lightbulb, Pencil, Play,
  Video, MessageSquare, Send, Coffee, Sun, Moon, Compass, Map, Flag,
  Bookmark, Diamond, Hexagon, Circle, Layers, Puzzle,
  type LucideIcon,
} from 'lucide-react';

export const iconRegistry: Record<string, LucideIcon> = {
  LayoutDashboard, GraduationCap, Radio, MapPin, FileText, Code2, FolderGit2,
  Library, CalendarDays, Briefcase, Award, Gift, Home, Bell, User,
  Trophy, Star, Medal, Crown, Zap, Flame, Target, Rocket, Sparkles, Gem,
  CheckCircle, CheckCircle2, BookOpen, Brain, TrendingUp, Users, Clock,
  Calendar, Heart, ThumbsUp, Shield, ShieldCheck, Lightbulb, Pencil, Play,
  Video, MessageSquare, Send, Coffee, Sun, Moon, Compass, Map, Flag,
  Bookmark, Diamond, Hexagon, Circle, Layers, Puzzle,
};

/**
 * Resolve a lucide icon by name (accepts exact, or lower-case-first DB values).
 * Falls back to Award for unknown names so a bad/absent icon string never crashes render.
 */
export function getIcon(name?: string): LucideIcon {
  if (!name) return Award;
  return (
    iconRegistry[name] ||
    iconRegistry[name.charAt(0).toUpperCase() + name.slice(1)] ||
    Award
  );
}
