import { useState } from 'react';
import { CalendarDays, Clock, MapPin, ChevronLeft, ChevronRight, ChevronDown, Radio, FileText, Award, PartyPopper, PlusCircle, Calendar as CalendarIcon, FolderOpen, BookOpen, Trophy, Briefcase, Lock, X } from 'lucide-react';
import { scheduleItems } from '@/data/mock';
import { Card, CardBody } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useNav } from '@/lib/nav';

import { scheduleSteps } from '@/lib/tourSteps';

const typeConfig: Record<string, { color: string; icon: any; label: string }> = {
  class: { color: 'teal', icon: Radio, label: 'Live Classes' },
  assignment: { color: 'amber', icon: FileText, label: 'Practice Hub' },
  project: { color: 'indigo', icon: FolderOpen, label: 'Projects' },
  resource: { color: 'purple', icon: BookOpen, label: 'Resources' },
  reward: { color: 'rose', icon: Trophy, label: 'Rewards' },
  placement: { color: 'emerald', icon: Briefcase, label: 'Placement Hub' },
  task: { color: 'gray', icon: PlusCircle, label: 'Task' },
};

const typeOptions = [
  { value: 'class', label: 'Live Classes' },
  { value: 'assignment', label: 'Practice Hub' },
  { value: 'project', label: 'Projects' },
  { value: 'resource', label: 'Resources' },
  { value: 'reward', label: 'Rewards' },
  { value: 'placement', label: 'Placement Hub' },
  { value: 'task', label: 'Task' },
];

function formatTimeTo12Hour(time24: string): string {
  if (!time24) return 'Anytime';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  return `${hours}:${minutes} ${ampm}`;
}

function getDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTaskDateLabel(dateKey: string, today: Date) {
  const todayKey = getDateKey(today);
  const tomorrowKey = getDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  if (dateKey === todayKey) return 'Today';
  if (dateKey === tomorrowKey) return 'Tomorrow';
  const date = new Date(dateKey + 'T00:00:00');
  return date.toLocaleString('default', { month: 'short', day: 'numeric' });
}

function parseScheduleItemDate(item: { date: string; dateKey?: string }, today: Date) {
  if (item.dateKey) return item.dateKey;
  if (item.date === 'Today') return getDateKey(today);
  if (item.date === 'Tomorrow') return getDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  const parsed = new Date(`${item.date} ${today.getFullYear()} 00:00:00`);
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
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(today);
  const handleToggleAddTask = () => {
    setShowAddTask((prev) => {
      const next = !prev;
      if (next) {
        // Reset selected date to today if it's in the past
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const activeDate = selectedDate < todayStart ? today : selectedDate;
        setSelectedDate(activeDate);
        setPickerDate(activeDate);
        setTaskForm((prevForm) => ({ ...prevForm, date: getDateKey(activeDate) }));
      }
      return next;
    });
  };
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: 'task',
    date: getDateKey(today),
    time: '',
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
      time: taskForm.time.trim() ? formatTimeTo12Hour(taskForm.time) : 'Anytime',
      duration: '',
      course: taskForm.course.trim() || undefined,
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
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-extrabold text-slate-900 text-lg">Add new task</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-1">Create a quick study plan or reminder for the selected date.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
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

                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Date</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDatePickerOpen(!datePickerOpen)}
                        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all text-left cursor-pointer"
                      >
                        <span>{taskForm.date ? new Date(taskForm.date).toLocaleDateString('en-GB') : 'Select date'}</span>
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      </button>

                      {datePickerOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setDatePickerOpen(false)} />
                          <div className="absolute left-0 mt-1 bg-white border border-slate-200/95 rounded-xl shadow-lg z-50 p-4 w-[280px] animate-fade-in">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-extrabold text-slate-800">
                                {pickerDate.toLocaleString('default', { month: 'long' })} {pickerDate.getFullYear()}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))}
                                  className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))}
                                  className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase mb-2">
                              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d}>{d}</div>
                              ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center">
                              {(() => {
                                const year = pickerDate.getFullYear();
                                const month = pickerDate.getMonth();
                                const firstDayIdx = new Date(year, month, 1).getDay();
                                const totalDays = new Date(year, month + 1, 0).getDate();
                                
                                const cells = [];
                                for (let i = 0; i < firstDayIdx; i++) {
                                  cells.push(<div key={`empty-${i}`} />);
                                }
                                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
                                  const thisDate = new Date(year, month, dayNum);
                                  const dateStr = getDateKey(thisDate);
                                  const isPast = thisDate < todayStart;
                                  const isSelected = taskForm.date === dateStr;
                                  const isTodayDate = todayStart.getTime() === thisDate.getTime();
                                  
                                  cells.push(
                                    <button
                                      key={`day-${dayNum}`}
                                      type="button"
                                      disabled={isPast}
                                      onClick={() => {
                                        handleTaskFormChange('date', dateStr);
                                        setSelectedDate(thisDate);
                                        setDatePickerOpen(false);
                                      }}
                                      className={cn(
                                        "w-7 h-7 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center mx-auto",
                                        isPast 
                                          ? "text-slate-300 cursor-not-allowed bg-transparent" 
                                          : isSelected
                                          ? "bg-purple-600 text-white shadow-sm shadow-purple-500/10"
                                          : isTodayDate
                                          ? "bg-slate-900 text-white"
                                          : "text-slate-700 hover:bg-slate-50"
                                      )}
                                    >
                                      {dayNum}
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Time</label>
                      <div className="relative">
                        <input
                          type="time"
                          value={taskForm.time}
                          onClick={(e) => {
                            try {
                              (e.target as any).showPicker();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          onChange={(e) => handleTaskFormChange('time', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all cursor-pointer"
                        />
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wide">Type</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-600/10 transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const config = typeConfig[taskForm.type];
                            const Icon = config ? config.icon : PlusCircle;
                            return <Icon className="w-3.5 h-3.5 text-slate-400" />;
                          })()}
                          <span>{typeOptions.find(o => o.value === taskForm.type)?.label || 'Select type'}</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${typeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {typeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto animate-fade-in">
                            {typeOptions.map((option) => {
                              const config = typeConfig[option.value];
                              const Icon = config ? config.icon : PlusCircle;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    handleTaskFormChange('type', option.value);
                                    setTypeDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-xs font-bold transition-colors hover:bg-slate-50",
                                    taskForm.type === option.value
                                      ? "bg-purple-50/65 text-purple-700"
                                      : "text-slate-700"
                                  )}
                                >
                                  <Icon className={cn("w-3.5 h-3.5", taskForm.type === option.value ? "text-purple-600" : "text-slate-400")} />
                                  <span>{option.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
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



                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md py-3 text-xs font-black active:scale-95 transition-all cursor-pointer"
                    >
                      Create Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTask(false)}
                      className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black active:scale-95 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
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
