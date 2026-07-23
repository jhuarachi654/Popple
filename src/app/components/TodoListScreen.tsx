import React, { useState, useRef, useEffect, useMemo, Component } from 'react';

class ChatErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: { children: React.ReactNode }) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div className="fixed inset-0 z-[10002] bg-white flex items-center justify-center p-8">
        <p className="font-space-mono text-sm text-red-500 text-center">{this.state.error}</p>
      </div>
    );
    return this.props.children;
  }
}
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

import PixelCheckbox from './PixelCheckbox';
import PoppleCharacter from './PoppleCharacter';
import PoppleChat from './PoppleChat';
import { toast } from 'sonner';
import type { Todo } from '../App';
import type { PoppleAccessory } from './PoppleCharacter';
import pixelNoTasksIcon from 'figma:asset/5765ff71efcec8f85a51ea67d9c56fb1dafbd5a1.png';

interface TodoListScreenProps {
  todos: Todo[];
  onAddTodo: (text: string, dueDate?: string) => void;
  onToggleTodo: (id: string) => void;
  onEditTodo: (id: string, newText: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDueDate: (id: string, dueDate: string | undefined) => void;
  onTogglePriority: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}


interface TodoItemProps {
  todo: Todo;
  index: number;
  editingId: string | null;
  editingText: string;
  onToggleTodo: (id: string, completed: boolean) => void;
  onStartEditing: (id: string, text: string) => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  onSetEditingText: (text: string) => void;
  onSaveEdit: () => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDueDate: (id: string, dueDate: string | undefined) => void;
  onTogglePriority: (id: string) => void;
  dark?: boolean;
  badge?: { label: string; neutral: boolean } | null;
  todayStr: string;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  index,
  editingId,
  editingText,
  onToggleTodo,
  onStartEditing,
  onEditKeyDown,
  onSetEditingText,
  onSaveEdit,
  onUpdateNotes,
  onUpdateDueDate,
  onTogglePriority,
  dark = false,
  badge,
  todayStr,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const [pickerPos, setPickerPos] = useState<{ top: number; left: number } | null>(null);

  const openPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 220) });
    const d = todo.dueDate ? new Date(todo.dueDate + 'T00:00:00') : new Date();
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setShowDatePicker(v => !v);
  };

  // Auto-resize textarea when editing starts
  useEffect(() => {
    if (editingId === todo.id && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [editingId, todo.id, editingText]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group/task"
    >
      <div className="flex items-center gap-1 py-0.5 px-2 rounded-lg">
        <div className="flex-1 min-w-0 edit-zone">
          <div className="flex items-center gap-2">
            <PixelCheckbox
              checked={todo.completed}
              onChange={() => onToggleTodo(todo.id, todo.completed)}
              className="flex-shrink-0"
              aria-label={`Mark task "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
            />
            {editingId === todo.id ? (
              <textarea
                ref={textareaRef}
                value={editingText}
                onChange={(e) => onSetEditingText(e.target.value)}
                onKeyDown={onEditKeyDown}
                onBlur={onSaveEdit}
                className="flex-1 bg-white/95 border-2 border-blue-400 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-space-mono px-3 py-2 min-h-[44px] resize-none overflow-hidden"
                autoFocus
                aria-label="Edit task"
                rows={1}
                style={{ height: 'auto', minHeight: '44px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
            ) : (
              <div
                className={`flex-1 edit-text-area font-space-mono break-words text-sm leading-snug rounded-md px-2 py-0 transition-all duration-200 ${
                  todo.completed
                    ? 'text-gray-400 line-through cursor-default'
                    : 'text-gray-900 cursor-text hover:bg-blue-50/70 hover:shadow-sm border border-transparent hover:border-blue-200/50'
                }`}
                onClick={() => !todo.completed && onStartEditing(todo.id, todo.text)}
                role={todo.completed ? undefined : 'button'}
                tabIndex={todo.completed ? -1 : 0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !todo.completed) {
                    e.preventDefault();
                    onStartEditing(todo.id, todo.text);
                  }
                }}
                aria-label={todo.completed ? undefined : `Click to edit task: ${todo.text}`}
                title={todo.completed ? undefined : 'Click to edit'}
              >
                {todo.text}
              </div>
            )}
            {!todo.completed && (todo.dueDate || editingId === todo.id) && (
              <button
                ref={dateButtonRef}
                onClick={openPicker}
                className={`flex-shrink-0 font-space-mono text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                  todo.dueDate
                    ? badge?.neutral
                      ? 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                    : 'text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300'
                }`}
              >
                {todo.dueDate
                  ? badge?.label ?? new Date(todo.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '+ date'}
              </button>
            )}
            {!todo.completed && !todo.dueDate && editingId !== todo.id && (
              <button
                ref={dateButtonRef}
                onClick={openPicker}
                className="flex-shrink-0 font-space-mono text-[10px] px-2 py-0.5 rounded-md border text-gray-400 border-gray-200 hover:text-gray-600 hover:border-gray-300 transition-all opacity-0 group-hover/task:opacity-100"
              >
                + date
              </button>
            )}
          </div>
          {showDatePicker && pickerPos && createPortal(
            <>
              <div className="fixed inset-0 z-[10010]" onClick={() => setShowDatePicker(false)} />
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="fixed bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-[10011]"
                  style={{ top: pickerPos.top, left: pickerPos.left, width: 210 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="font-space-mono text-xs text-gray-500 hover:text-gray-900 px-1">‹</button>
                    <span className="font-pixel text-[10px] text-gray-900">{new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="font-space-mono text-xs text-gray-500 hover:text-gray-900 px-1">›</button>
                  </div>
                  <div className="grid grid-cols-7 mb-1">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                      <div key={i} className="text-center font-space-mono text-[9px] text-gray-400">{d}</div>
                    ))}
                  </div>
                  {(() => {
                    const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
                    const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
                    const cells = [];
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                      const isPast = dateStr < todayStr;
                      const isSelected = todo.dueDate === dateStr;
                      const isToday = dateStr === todayStr;
                      cells.push(
                        <button key={d} disabled={isPast}
                          onClick={() => { onUpdateDueDate(todo.id, dateStr); setShowDatePicker(false); }}
                          className={`text-center font-space-mono text-[10px] rounded-md py-0.5 transition-all ${
                            isSelected ? 'bg-gray-900 text-white' :
                            isPast ? 'text-gray-300 cursor-default' :
                            isToday ? 'border border-gray-400 text-gray-900 hover:bg-cyan-50' :
                            'text-gray-700 hover:bg-cyan-50'
                          }`}
                        >{d}</button>
                      );
                    }
                    return <div className="grid grid-cols-7 gap-y-0.5">{cells}</div>;
                  })()}
                  {todo.dueDate && (
                    <button onClick={() => { onUpdateDueDate(todo.id, undefined); setShowDatePicker(false); }} className="mt-2 w-full font-space-mono text-[10px] text-gray-400 hover:text-red-500 text-center transition-colors">
                      remove date
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            </>,
            document.body
          )}
          {todo.completed && todo.completedAt && (
            <div className="pl-6">
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="font-space-mono text-xs text-green-600">
                Completed {new Date(todo.completedAt).toLocaleDateString()}
              </motion.p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

type TaskBadge = { label: string; neutral: boolean } | null;

interface ClassifiedTask {
  todo: Todo;
  badge: TaskBadge;
}

interface Classification {
  startHere: ClassifiedTask | null;
  today: ClassifiedTask[];
  someday: ClassifiedTask[];
}

// Single source of truth: decides section + badge for every active task.
// Rules:
//   - Due date present → eligible for "start here" or "today"; badge = due date label
//   - No due date → always "someday"; badge = "moved N×" only if rescheduleCount ≥ 2
//   - Never more than one badge per task; due date takes priority over moved badge
//   - "Start here" = the single task with the soonest due date
function classifyTasks(tasks: Todo[], todayStr: string): Classification {
  const withDue: ClassifiedTask[] = tasks
    .filter(t => !!t.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .map(todo => ({
      todo,
      badge: { label: todo.dueDate! <= todayStr ? 'due today' : new Date(todo.dueDate! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), neutral: false } as TaskBadge,
    }));

  const withoutDue: ClassifiedTask[] = tasks
    .filter(t => !t.dueDate)
    .map(todo => {
      const rc = todo.rescheduleCount ?? 0;
      return {
        todo,
        badge: rc >= 2
          ? { label: rc === 2 ? 'moved twice' : `moved ${rc}×`, neutral: true }
          : null,
      };
    });

  return {
    startHere: withDue[0] ?? null,
    today: withDue.slice(1),
    someday: withoutDue,
  };
}

const TodoItemWithBadge: React.FC<TodoItemProps & { badge?: TaskBadge }> = ({ badge, ...props }) => (
  <TodoItem {...props} badge={badge} />
);

export default function TodoListScreen({
  todos,
  onAddTodo,
  onToggleTodo,
  onEditTodo,
  onUpdateNotes,
  onUpdateDueDate,
  onTogglePriority,
  onDeleteTodo,
}: TodoListScreenProps) {
  const activeTodos = todos.filter(todo => !todo.completed && !todo.destroyedAt);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const accessory = useMemo(() => {
    try { return (localStorage.getItem('popple-accessory') as PoppleAccessory) ?? null; } catch { return null; }
  }, []);
  const [chatOpen, setChatOpen] = useState(false);
  const [somedayOpen, setSomedayOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const fabInputRef = useRef<HTMLInputElement>(null);
  const fabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (fabContainerRef.current && !fabContainerRef.current.contains(e.target as Node)) {
        setFabOpen(false); setNewTaskText(''); setNewTaskDue(''); setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fabOpen]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => { setNow(new Date()); }, 60_000);
    return () => clearInterval(id);
  }, []);

  const todayStr = now.toISOString().split('T')[0];

  // Personalization prefs from Record page
  const peakNudgeOn = useMemo(() => { try { return localStorage.getItem('popple-peak-nudge') === '1'; } catch { return false; } }, []);
  const boostSlowOn = useMemo(() => { try { return localStorage.getItem('popple-boost-slow-tasks') === '1'; } catch { return false; } }, []);
  const slowTaskType = useMemo(() => { try { return localStorage.getItem('popple-slow-task-type') ?? null; } catch { return null; } }, []);

  const { startHere, today: todayTasks, someday: somedayTasks } = useMemo(() => {
    const base = classifyTasks(activeTodos, todayStr);
    if (!boostSlowOn || !slowTaskType) return base;
    // If boost is on, find the oldest task matching the slow type and put it in startHere
    const slowKeywords: Record<string, string[]> = {
      email:    ['email', 'message', 'reply', 'respond', 'slack', 'text', 'call', 'ping', 'dm', 'send'],
      admin:    ['pay', 'bill', 'invoice', 'form', 'file', 'submit', 'renew', 'schedule', 'book', 'appoint', 'register'],
      errand:   ['buy', 'pick up', 'get', 'grab', 'shop', 'store', 'groceries', 'pharmacy', 'drop off'],
      creative: ['write', 'design', 'draft', 'draw', 'sketch', 'create', 'build', 'make', 'edit', 'record'],
      research: ['research', 'look up', 'find', 'read', 'review', 'check', 'look into', 'explore'],
    };
    const kws = slowKeywords[slowTaskType] ?? [];
    const isSlowType = (text: string) => kws.some(k => text.toLowerCase().includes(k));
    const candidates = activeTodos
      .filter(t => isSlowType(t.text))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (candidates.length === 0) return base;
    const boosted = candidates[0];
    const daysWaiting = Math.round((Date.now() - new Date(boosted.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const badge: TaskBadge = { label: daysWaiting >= 2 ? `waiting ${daysWaiting}d` : 'sitting a while', neutral: true };
    // Remove it from wherever it currently sits in base and put it in startHere
    const removeFrom = (arr: ClassifiedTask[]) => arr.filter(c => c.todo.id !== boosted.id);
    return {
      startHere: { todo: boosted, badge },
      today: removeFrom([...(base.startHere && base.startHere.todo.id !== boosted.id ? [base.startHere] : []), ...base.today]),
      someday: removeFrom(base.someday),
    };
  }, [activeTodos, todayStr, boostSlowOn, slowTaskType]);

  // Peak-time nudge bubble
  const peakNudgeBubble = useMemo(() => {
    if (!peakNudgeOn) return null;
    const h = now.getHours();
    const peakHour = localStorage.getItem('popple-best-time') ?? 'morning';
    const inPeak = peakHour === 'morning' ? (h >= 7 && h < 12)
      : peakHour === 'afternoon' ? (h >= 12 && h < 17)
      : (h >= 17 && h < 21);
    if (!inPeak) return null;
    const today = now.toISOString().split('T')[0];
    const lastNudged = localStorage.getItem('popple-peak-nudge-shown');
    if (lastNudged === today) return null;
    if (activeTodos.length === 0) return null;
    const pick = activeTodos.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    localStorage.setItem('popple-peak-nudge-shown', today);
    return `good time to work. "${pick.text.length > 40 ? pick.text.slice(0, 40) + '…' : pick.text}" has been waiting.`;
  }, [peakNudgeOn, now.toISOString().split('T')[0]]);

  const somedayBubble = useMemo(() => {
    if (somedayTasks.length < 3) return null;
    const today = new Date().toISOString().split('T')[0];
    const lastSurfaced = localStorage.getItem('popple-someday-surfaced');
    if (lastSurfaced === today) return null;
    const pick = somedayTasks[Math.floor(Math.random() * somedayTasks.length)];
    localStorage.setItem('popple-someday-surfaced', today);
    return `"${pick.todo.text}" — still in someday.`;
  }, [somedayTasks.length]);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [poppleHintVisible, setPoppleHintVisible] = useState(false);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const showHint = () => { setPoppleHintVisible(true); clearTimeout(hintTimeoutRef.current); };
  const hideHint = () => { clearTimeout(hintTimeoutRef.current); setPoppleHintVisible(false); };
  // Periodically surface hint for mobile (no hover available)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const cycle = (showing: boolean) => {
      t = setTimeout(() => { setPoppleHintVisible(showing); cycle(!showing); }, showing ? 4000 : 15000);
    };
    cycle(true); // show first after 15s, visible for 4s, repeat
    // start: hidden → show after 15s
    t = setTimeout(() => { setPoppleHintVisible(true); cycle(false); }, 15000);
    return () => clearTimeout(t);
  }, []);
  const doneTodayCount = todos.filter(t =>
    t.completed && !t.destroyedAt && t.completedAt &&
    new Date(t.completedAt).toDateString() === now.toDateString()
  ).length;
  const totalActive = activeTodos.length;
  const summary = totalActive === 0 ? 'all clear for today' : null;

  const handleToggleTodo = (id: string, completed: boolean) => {
    onToggleTodo(id);
    if (!completed) {
      // Show positive reinforcement messages, then task moves to game screen
      const encouragementMessages = [
        "Bubble incoming.",
        "Done. It's heading to your space.",
        "That one counted.",
        "Popped off the list.",
        "Off the list, into the world.",
        "It's real now."
      ];
      
      const randomMessage = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
      toast.success(randomMessage, { duration: 3500 });
    }
  };

  const handleDeleteTodo = (id: string) => {
    onDeleteTodo(id);
    toast('Task removed', { duration: 2500 });
  };

  const startEditing = (id: string, currentText: string) => {
    setEditingId(id);
    setEditingText(currentText);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = () => {
    if (editingId) {
      const trimmedText = editingText.trim();
      const originalText = todos.find(t => t.id === editingId)?.text;
      
      if (trimmedText === '') {
        // Delete task if all text is removed
        onDeleteTodo(editingId);
        toast.success('Task deleted! ️', { duration: 2500 });
      } else if (trimmedText !== originalText) {
        // Update task if text changed
        onEditTodo(editingId, trimmedText);
        toast.success('Task updated! ️', { duration: 2500 });
      }
    }
    cancelEditing();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Page scroll container */}
      <div className="absolute inset-0 flex flex-col" id="tasks-scroll-container">
        <div className="flex-1 pt-6 px-4 flex flex-col min-h-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="pixel-notebook rounded-t-2xl shadow-lg border border-white/60 flex-1 pb-32">
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div onClick={() => setChatOpen(true)} onMouseEnter={showHint} onMouseLeave={hideHint} className="cursor-pointer flex-shrink-0 -mt-2 relative flex flex-col items-center">
                      <AnimatePresence>
                        {poppleHintVisible && (
                          <div className="absolute pointer-events-none" style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 }}>
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.85 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.9 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                              className="bg-gray-800 text-white rounded-lg shadow-lg relative"
                              style={{ padding: 8, whiteSpace: 'nowrap' }}
                            >
                              <span className="font-pixel" style={{ fontSize: 7, lineHeight: 1, display: 'block', marginTop: -2 }}>task support?</span>
                              <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5px] w-0 h-0"
                                   style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1f2937' }} />
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                      <PoppleCharacter expression="idle" pendingCount={0} onClick={() => setChatOpen(true)} size={48} mode="idle" silent accessory={accessory} />
                    </div>
                    <h1 className="text-xl font-pixel text-gray-900" role="heading" aria-level="1">Hi there!</h1>
                  </div>
                  <span className="font-space-mono text-xs text-gray-400 mt-1">
                    {now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {summary ? (
                  <p className="font-space-mono text-sm text-gray-400 mt-1" aria-live="polite">{summary}</p>
                ) : null}
              </div>
              <div className="px-6 pt-0 pb-0">
                {activeTodos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-600 py-8">
                    <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
                      {todos.length === 0 ? (
                        <>
                          <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center mb-4">
                        <img 
                          src={pixelNoTasksIcon}
                          alt="Pixelated notebook icon for empty task list"
                          className="w-full h-full object-contain"
                          style={{ 
                            imageRendering: 'pixelated',
                            imageRendering: '-moz-crisp-edges',
                            imageRendering: 'crisp-edges',
                            WebkitImageRendering: 'pixelated',
                            msInterpolationMode: 'nearest-neighbor'
                          }}
                        />
                      </div>
                          <p className="font-space-mono text-sm text-gray-700 text-center">
                            Nothing floating yet.
                          </p>
                          <p className="font-space-mono text-xs text-center text-gray-500 max-w-xs">
                            Add a task and watch it appear in your space.
                          </p>
                        </>
                      ) : (
                        <>
                          
                          <h2 className="font-space-mono text-sm text-gray-700 text-center">
                            Your space is full.
                          </h2>
                          <p className="font-space-mono text-xs text-center text-gray-500 max-w-xs">
                            Head to Your Space to pop them and earn XP.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12 py-2">

                    {/* ── Start here ── */}
                    {startHere && (
                      <div className="space-y-1">
                        <div className="px-1">
                          <span className="font-pixel text-[10px] text-gray-900">Start here <span className="text-gray-400">(1)</span></span>
                        </div>
                        <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm px-1">
                          <TodoItemWithBadge
                            todo={startHere.todo}
                            badge={startHere.badge}
                            index={activeTodos.indexOf(startHere.todo)}
                            editingId={editingId}
                            editingText={editingText}
                            onToggleTodo={handleToggleTodo}
                            onStartEditing={startEditing}
                            onEditKeyDown={handleEditKeyDown}
                            onSetEditingText={setEditingText}
                            onSaveEdit={saveEdit}
                            onUpdateNotes={onUpdateNotes}
                            onUpdateDueDate={onUpdateDueDate}
                            onTogglePriority={onTogglePriority}
                            todayStr={todayStr}
                          />
                        </div>
                      </div>
                    )}

                    {/* ── Today ── */}
                    {todayTasks.length > 0 && (
                      <div className="space-y-1">
                        <div className="px-1">
                          <span className="font-pixel text-[10px] text-gray-900">Today <span className="text-gray-400">({todayTasks.length})</span></span>
                        </div>
                        {todayTasks.map(({ todo, badge }) => (
                          <div key={todo.id} className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm px-1">
                            <TodoItemWithBadge
                              todo={todo}
                              badge={badge}
                              index={activeTodos.indexOf(todo)}
                              editingId={editingId}
                              editingText={editingText}
                              onToggleTodo={handleToggleTodo}
                              onStartEditing={startEditing}
                              onEditKeyDown={handleEditKeyDown}
                              onSetEditingText={setEditingText}
                              onSaveEdit={saveEdit}
                              onUpdateNotes={onUpdateNotes}
                              onUpdateDueDate={onUpdateDueDate}
                            onTogglePriority={onTogglePriority}
                            todayStr={todayStr}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Someday ── */}
                    {somedayTasks.length > 0 && (
                      <div className="space-y-1">
                        <button
                          className="px-3 py-2.5 flex items-center justify-between w-full bg-gray-900 rounded-xl"
                          onClick={() => setSomedayOpen(o => !o)}
                        >
                          <span className="font-pixel text-[10px] text-white">Someday <span className="text-gray-400">({somedayTasks.length})</span></span>
                          <span className={`font-space-mono text-sm text-gray-400 transition-transform duration-200 inline-block ${somedayOpen ? 'rotate-90' : ''}`}>›</span>
                        </button>
                        <AnimatePresence>
                          {somedayOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden space-y-1.5"
                            >
                              {somedayTasks.map(({ todo, badge }) => (
                                <div key={todo.id} className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm px-1">
                                  <TodoItemWithBadge
                                    todo={todo}
                                    badge={badge}
                                    index={activeTodos.indexOf(todo)}
                                    editingId={editingId}
                                    editingText={editingText}
                                    onToggleTodo={handleToggleTodo}
                                    onStartEditing={startEditing}
                                    onEditKeyDown={handleEditKeyDown}
                                    onSetEditingText={setEditingText}
                                    onSaveEdit={saveEdit}
                                    onUpdateNotes={onUpdateNotes}
                                    onUpdateDueDate={onUpdateDueDate}
                            onTogglePriority={onTogglePriority}
                            todayStr={todayStr}
                                  />
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* ── Done today ── */}
                    {doneTodayCount > 0 && (
                      <div className="bg-gray-800 rounded-xl px-4 py-2 flex items-center justify-between">
                        <span className="font-pixel text-[10px] text-white">Done today</span>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <span className="font-space-mono text-xs text-emerald-300">{doneTodayCount}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>


      {/* ── FAB — add task ── */}
      <div ref={fabContainerRef} className="fixed right-4 z-20 flex flex-col items-end gap-2" style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom) + 1rem)' }}>
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              key="fab-input"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 360 }}
              className="flex flex-col gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-2xl"
              style={{ minWidth: 260 }}
            >
              <div className="flex items-center gap-2">
                <input
                  ref={fabInputRef}
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newTaskText.trim()) {
                      onAddTodo(newTaskText.trim(), newTaskDue || undefined);
                      setNewTaskText(''); setNewTaskDue(''); setFabOpen(false); setShowDatePicker(false);
                    }
                    if (e.key === 'Escape') { setFabOpen(false); setNewTaskText(''); setNewTaskDue(''); setShowDatePicker(false); }
                  }}
                  placeholder="add a task…"
                  className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 font-space-mono text-sm outline-none"
                  autoFocus
                />
                {newTaskText.trim() && (
                  <button
                    onClick={() => {
                      onAddTodo(newTaskText.trim(), newTaskDue || undefined);
                      setNewTaskText(''); setNewTaskDue(''); setFabOpen(false); setShowDatePicker(false);
                    }}
                    className="text-gray-400 hover:text-gray-900 transition-colors font-space-mono text-xs"
                  >
                    ↵
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {newTaskDue ? (
                  <button
                    onClick={() => { setNewTaskDue(''); setShowDatePicker(false); }}
                    className="flex items-center gap-1 bg-cyan-50 border border-cyan-300 text-cyan-700 font-space-mono text-[10px] px-2 py-0.5 rounded-md"
                  >
                    {newTaskDue === todayStr
                      ? 'today'
                      : newTaskDue === (() => { const d = new Date(now); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
                        ? 'tomorrow'
                        : new Date(newTaskDue + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="text-cyan-400 ml-0.5">×</span>
                  </button>
                ) : (
                  <>
                    <button onClick={() => setNewTaskDue(todayStr)} className="font-space-mono text-[10px] text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 border border-gray-200 hover:border-cyan-300 px-2 py-0.5 rounded-md transition-all">today</button>
                    <button onClick={() => { const d = new Date(now); d.setDate(d.getDate() + 1); setNewTaskDue(d.toISOString().split('T')[0]); }} className="font-space-mono text-[10px] text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 border border-gray-200 hover:border-cyan-300 px-2 py-0.5 rounded-md transition-all">tomorrow</button>
                    <button onClick={() => { const d = new Date(); setCalMonth({ year: d.getFullYear(), month: d.getMonth() }); setShowDatePicker(p => !p); }} className="font-space-mono text-[10px] text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 border border-gray-200 hover:border-cyan-300 px-2 py-0.5 rounded-md transition-all">pick date</button>
                  </>
                )}
              </div>
              {/* Custom calendar */}
              <AnimatePresence>
                {showDatePicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 mt-1"
                  >
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 font-space-mono text-sm">‹</button>
                      <span className="font-space-mono text-[10px] text-gray-700 uppercase tracking-wide">
                        {new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={() => setCalMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 font-space-mono text-sm">›</button>
                    </div>
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="text-center font-space-mono text-[9px] text-gray-400 py-0.5">{d}</div>
                      ))}
                    </div>
                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-y-0.5">
                      {(() => {
                        const firstDay = new Date(calMonth.year, calMonth.month, 1).getDay();
                        const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
                        const cells: React.ReactNode[] = [];
                        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                        for (let d = 1; d <= daysInMonth; d++) {
                          const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const isPast = dateStr < todayStr;
                          const isSelected = dateStr === newTaskDue;
                          const isToday = dateStr === todayStr;
                          cells.push(
                            <button
                              key={d}
                              disabled={isPast}
                              onClick={() => { setNewTaskDue(dateStr); setShowDatePicker(false); }}
                              className={`w-full aspect-square flex items-center justify-center rounded-lg font-space-mono text-[10px] transition-all
                                ${isPast ? 'text-gray-300 cursor-default' : ''}
                                ${isSelected ? 'bg-gray-900 text-white' : ''}
                                ${isToday && !isSelected ? 'border border-gray-900 text-gray-900' : ''}
                                ${!isPast && !isSelected && !isToday ? 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-700' : ''}
                              `}
                            >{d}</button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={() => {
            if (fabOpen) { setFabOpen(false); setNewTaskText(''); setNewTaskDue(''); setShowDatePicker(false); }
            else { setFabOpen(true); setTimeout(() => fabInputRef.current?.focus(), 50); }
          }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-2xl"
        >
          <motion.span animate={{ rotate: fabOpen ? 45 : 0 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="text-2xl leading-none select-none" style={{ marginTop: -2 }}>+</motion.span>
        </motion.button>
      </div>

      {/* ── Popple chat — portal to document.body so it covers the nav bar ── */}
      {createPortal(
        <AnimatePresence>
          {chatOpen && (
            <ChatErrorBoundary>
              <PoppleChat
                onAddTodo={onAddTodo}
                onClose={() => setChatOpen(false)}
              />
            </ChatErrorBoundary>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}