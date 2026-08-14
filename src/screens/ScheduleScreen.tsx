import { useState } from 'react';
import { CalendarDays, Clock, MapPin, ChevronLeft, ChevronRight, Radio, FileText, Award, PartyPopper, PlusCircle, Calendar as CalendarIcon, FolderOpen, BookOpen, Trophy, Briefcase, Lock } from 'lucide-react';
import { scheduleItems } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';

import { scheduleSteps } from '@/lib/tourSteps';

const typeConfig: Record<string, { color: string; icon: any; label: string }> = {
  class: { color: 'teal', icon: Radio, label: 'Live Class' },
  assignment: { color: 'amber', icon: FileText, label: 'Assignment' },
  exam: { color: 'red', icon: Award, label: 'Exam' },
  project: { color: 'indigo', icon: FolderOpen, label: 'Project' },
  resource: { color: 'purple', icon: BookOpen, label: 'Resource' },
  reward: { color: 'rose', icon: Trophy, label: 'Reward' },
  placement: { color: 'emerald', icon: Briefcase, label: 'Placement' },
  task: { color: 'gray', icon: PlusCircle, label: 'Task' },
};

const typeOptions = [
  { value: 'class', label: 'Live Class' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
  { value: 'project', label: 'Project' },
  { value: 'resource', label: 'Resource' },
  { value: 'reward', label: 'Reward' },
  { value: 'placement', label: 'Placement' },
  { value: 'task', label: 'Task' },
];

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatTaskDateLabel(dateKey: string, today: Date) {
  const todayKey = getDateKey(today);
  const tomorrowKey = getDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  if (dateKey === todayKey) return 'Today';
  if (dateKey === tomorrowKey) return 'Tomorrow';
  const date = new Date(dateKey);
  return date.toLocaleString('default', { month: 'short', day: 'numeric' });
}

function parseScheduleItemDate(item: { date: string; dateKey?: string }, today: Date) {
  if (item.dateKey) return item.dateKey;
  if (item.date === 'Today') return getDateKey(today);
  if (item.date === 'Tomorrow') return getDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  const parsed = new Date(`${item.date} ${today.getFullYear()}`);
  if (!Number.isNaN(parsed.getTime())) return getDateKey(parsed);
  return getDateKey(today);
}

export function ScheduleScreen() {
  const { navigate } = useNav();
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [items, setItems] = useState(scheduleItems);
  const [showAddTask, setShowAddTask] = useState(false);
  const handleToggleAddTask = () => {
    setShowAddTask((prev) => {
      const next = !prev;
      if (next) {
        // Reset selected date to today if it's in the past
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (selectedDate < todayStart) {
          setSelectedDate(today);
          setTaskForm((prevForm) => ({ ...prevForm, date: getDateKey(today) }));
        }
      }
      return next;
    });
  };
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: 'task',
    date: getDateKey(today),
    time: '',
    location: '',
    course: '',
  });

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentMonth = calendarDate.toLocaleString('default', { month: 'long' });
  const currentYear = calendarDate.getFullYear();

  const firstDay = new Date(currentYear, calendarDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentYear, calendarDate.getMonth() + 1, 0).getDate();
  const calendarDays: (number | null)[] = [
    ...Array.from({ length: firstDay }, (): null => null),
    ...Array.from({ length: daysInMonth }, (_, i): number => i + 1),
  ];

  const itemsWithDateKey = items.map((item) => ({
    ...item,
    completed: item.completed ?? false,
    dateKey: item.dateKey ?? parseScheduleItemDate(item, today),
  }));

  const selectedDateKey = getDateKey(selectedDate);
  const itemsForSelectedDate = itemsWithDateKey.filter((item) => item.dateKey === selectedDateKey);
  const activeTasks = itemsForSelectedDate.filter((item) => !item.completed);
  const completedTasks = itemsForSelectedDate.filter((item) => item.completed);

  const handleDateClick = (day: number) => {
    const clicked = new Date(currentYear, calendarDate.getMonth(), day);
    setSelectedDate(clicked);
    setTaskForm((prev) => ({ ...prev, date: getDateKey(clicked) }));
    setShowAddTask(false);
  };

  const toggleTaskCompletion = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleTaskFormChange = (field: keyof typeof taskForm, value: string) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemClick = (type: string) => {
    switch (type) {
      case 'class':
        navigate('live');
        break;
      case 'assignment':
        navigate('assignments');
        break;
      case 'exam':
        navigate('quizzes');
        break;
      case 'project':
        navigate('projects');
        break;
      case 'resource':
        navigate('resources');
        break;
      case 'reward':
        navigate('rewards');
        break;
      case 'placement':
        navigate('placement');
        break;
      case 'task':
      default:
        navigate('practice');
        break;
    }
  };

  const handleAddTask = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    const newTask = {
      id: `s-${Date.now()}`,
      title: taskForm.title.trim(),
      type: taskForm.type as typeof taskForm.type,
      date: formatTaskDateLabel(taskForm.date, today),
      dateKey: taskForm.date,
      time: taskForm.time.trim() || 'Anytime',
      duration: '',
      course: taskForm.course.trim() || undefined,
      location: taskForm.location.trim() || undefined,
      completed: false,
    };

    setItems((prev) => [newTask, ...prev]);
    setSelectedDate(new Date(taskForm.date));
    setShowAddTask(false);
    setTaskForm({
      title: '',
      type: 'task',
      date: taskForm.date,
      time: '',
      location: '',
      course: '',
    });
  };

  const selectedDateLabel = formatTaskDateLabel(selectedDateKey, today);

  return (
    <div className="space-y-6 font-sans animate-fade-in">

      <div id="tour-schedule-header" className="flex flex-col gap-5 lg:flex-row lg:items-end justify-between p-6 rounded-[2rem] bg-gradient-to-r from-slate-950 via-[#1e3a8a] to-[#2563eb] text-white shadow-xl border border-white/10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-200">
            Smart Schedule
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            Plan your day with ease
          </h1>
          <p className="mt-3 text-sm text-slate-200/90 leading-6">
            Tap any date on the mini calendar to review tasks for that day, then add or complete them in a clean workflow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.8rem] bg-white/10 border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Selected day</p>
            <p className="mt-3 text-xl font-bold text-white">{selectedDateLabel}</p>
            <p className="mt-1 text-sm text-slate-300">{activeTasks.length} active plan{activeTasks.length === 1 ? '' : 's'}</p>
          </div>

          <button
            onClick={handleToggleAddTask}
            className="rounded-[1.8rem] bg-white text-slate-950 px-5 py-3 font-semibold shadow-lg transition hover:bg-slate-100"
          >
            {showAddTask ? 'Close task' : 'Add task'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <Card id="tour-schedule-calendar" className="rounded-[2rem] border border-slate-200/70 shadow-sm overflow-hidden bg-white">
            <CardBody className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentMonth} {currentYear}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Tap a date</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarDate(new Date(currentYear, calendarDate.getMonth() - 1, 1))}
                    className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center transition hover:bg-slate-200"
                    type="button"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date(currentYear, calendarDate.getMonth() + 1, 1))}
                    className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center transition hover:bg-slate-200"
                    type="button"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                {days.map((d) => (
                  <div key={d} className="text-[11px] font-semibold uppercase text-slate-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, i) => {
                  const isToday = day === today.getDate() && calendarDate.getMonth() === today.getMonth() && calendarDate.getFullYear() === today.getFullYear();
                  const isSelected = day === selectedDate.getDate() && calendarDate.getMonth() === selectedDate.getMonth() && calendarDate.getFullYear() === selectedDate.getFullYear();
                  const dayDate = day ? new Date(currentYear, calendarDate.getMonth(), day) : null;
                  const dayKey = dayDate ? getDateKey(dayDate) : '';
                  const hasEvent = dayKey && itemsWithDateKey.some((item) => item.dateKey === dayKey);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={day === null}
                      onClick={() => day && handleDateClick(day)}
                      className={cn(
                        'aspect-square min-w-[2.5rem] rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                        day === null ? 'cursor-default bg-transparent' : 'focus-visible:outline-none',
                        isSelected
                          ? 'bg-[#1d4ed8] text-white shadow-lg'
                          : isToday
                          ? 'bg-slate-950 text-white shadow-md'
                          : hasEvent
                          ? 'bg-slate-100 text-[#1d4ed8] border border-slate-200'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
                      )}
                    >
                      {day && (
                        <div className="relative flex flex-col items-center">
                          <span>{day}</span>
                          {hasEvent && !isSelected && <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#2563eb]" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card id="tour-schedule-filters" className="rounded-[2rem] border border-slate-200/70 shadow-sm overflow-hidden bg-white">
            <CardBody className="p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Today summary</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Total tasks</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">{itemsForSelectedDate.length}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Completed</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">{completedTasks.length}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </aside>

        <main className="space-y-5">
          {showAddTask && (
            <Card className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden shadow-md animate-fade-in">
              <CardBody className="p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-lg">Add new task</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Create a quick study plan or reminder for the selected date.</p>
                </div>

                <form onSubmit={handleAddTask} className="pt-5 border-t border-slate-100 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Task title</label>
                    <input
                      value={taskForm.title}
                      onChange={(e) => handleTaskFormChange('title', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Review React hooks"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Date</label>
                    <input
                      type="date"
                      value={taskForm.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        handleTaskFormChange('date', e.target.value);
                        setSelectedDate(new Date(e.target.value));
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Time</label>
                    <input
                      value={taskForm.time}
                      onChange={(e) => handleTaskFormChange('time', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all placeholder:text-slate-400"
                      placeholder="e.g. 5:30 PM"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Type</label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => handleTaskFormChange('type', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all cursor-pointer"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Course / Notes</label>
                    <input
                      value={taskForm.course}
                      onChange={(e) => handleTaskFormChange('course', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all placeholder:text-slate-400"
                      placeholder="Optional course or note"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Location</label>
                    <input
                      value={taskForm.location}
                      onChange={(e) => handleTaskFormChange('location', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all placeholder:text-slate-400"
                      placeholder="Optional location"
                    />
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-2 inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md py-3 text-xs font-black active:scale-95 transition-all cursor-pointer"
                  >
                    Create Task
                  </button>
                </form>
              </CardBody>
            </Card>
          )}

          <Card id="tour-schedule-timeline" className="rounded-[2rem] border border-slate-200/70 shadow-sm overflow-hidden bg-white">
            <CardBody className="p-5 space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tasks for {selectedDateLabel}</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">Daily agenda</h2>
                </div>
                <div className="rounded-3xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  {itemsForSelectedDate.length} total
                </div>
              </div>

              {itemsForSelectedDate.length === 0 ? (
                <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                  No plans yet. Add a quick task to start your schedule.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTasks.map((item) => {
                    const cfg = typeConfig[item.type] || typeConfig.class;
                    const Icon = cfg.icon;
                    return (
                      <div 
                        key={item.id} 
                        className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => toggleTaskCompletion(item.id)}
                            className="h-11 w-11 rounded-2xl bg-white text-slate-600 border border-slate-200 flex items-center justify-center transition hover:bg-slate-100 shrink-0"
                            type="button"
                          >
                            ✓
                          </button>
                          <div>
                            <p className="text-base font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm text-slate-500">{item.time}{item.duration ? ` · ${item.duration}` : ''}</p>
                            {item.course && <p className="mt-1 text-sm text-slate-500">{item.course}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleItemClick(item.type)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-slate-500" />
                          {cfg.label}
                        </button>
                      </div>
                    );
                  })}

                  {completedTasks.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-slate-900">Completed</p>
                      {completedTasks.map((item) => {
                        const cfg = typeConfig[item.type] || typeConfig.class;
                        const Icon = cfg.icon;
                        return (
                          <div 
                            key={item.id} 
                            className="rounded-[1.8rem] border border-slate-200 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between opacity-80"
                          >
                            <div className="flex items-start gap-4">
                              <button
                                onClick={() => toggleTaskCompletion(item.id)}
                                className="h-11 w-11 rounded-2xl bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center justify-center transition hover:bg-[#dbeafe] shrink-0"
                                type="button"
                              >
                                ✓
                              </button>
                              <div>
                                <p className="text-base font-semibold text-slate-900 line-through decoration-slate-400/80">{item.title}</p>
                                <p className="mt-1 text-sm text-slate-500">{item.time}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleItemClick(item.type)}
                              className="inline-flex items-center gap-2 rounded-2xl bg-[#eff6ff] px-4 py-2 text-sm font-semibold text-[#1d4ed8] border border-[#bfdbfe] hover:bg-[#dbeafe] transition-all cursor-pointer"
                            >
                              <Icon className="w-4 h-4" />
                              {cfg.label}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </main>
      </div>
    </div>
  );
}
