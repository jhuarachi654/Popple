import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Todo } from '../App';
import pixelNoTasksIcon from 'figma:asset/5765ff71efcec8f85a51ea67d9c56fb1dafbd5a1.png';

interface DailyLogScreenProps {
  todos: Todo[];
  onRestoreTask: (id: string) => void;
  isGuestMode?: boolean;
}

// ── Keyword classifier ────────────────────────────────────────────────────
const TYPE_PATTERNS: { type: string; label: string; keywords: string[] }[] = [
  { type: 'email',    label: 'email / message tasks', keywords: ['email', 'message', 'reply', 'respond', 'slack', 'text', 'call', 'ping', 'dm', 'send'] },
  { type: 'admin',   label: 'admin tasks',            keywords: ['pay', 'bill', 'invoice', 'form', 'file', 'submit', 'renew', 'schedule', 'book', 'appoint', 'register'] },
  { type: 'errand',  label: 'errands',                keywords: ['buy', 'pick up', 'get', 'grab', 'shop', 'store', 'groceries', 'pharmacy', 'drop off'] },
  { type: 'creative',label: 'creative tasks',         keywords: ['write', 'design', 'draft', 'draw', 'sketch', 'create', 'build', 'make', 'edit', 'record'] },
  { type: 'research',label: 'research tasks',         keywords: ['research', 'look up', 'find', 'read', 'review', 'check', 'look into', 'explore'] },
];

function classifyType(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { type, keywords } of TYPE_PATTERNS) {
    if (keywords.some(k => lower.includes(k))) return type;
  }
  return null;
}

function typeLabelFor(type: string): string {
  return TYPE_PATTERNS.find(p => p.type === type)?.label ?? type;
}

// ── Time-of-day bucketing ─────────────────────────────────────────────────
function timeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Patterns engine ───────────────────────────────────────────────────────
function derivePatterns(todos: Todo[]) {
  const completed = todos.filter(t => t.completed && t.completedAt && !t.destroyedAt);

  const cutoff = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  completed.forEach(t => {
    if (new Date(t.completedAt!).getTime() >= cutoff)
      dayCounts[new Date(t.completedAt!).getDay()]++;
  });
  const rhythm = [1,2,3,4,5,6,0].map(d => dayCounts[d]);

  const timeCounts = { morning: 0, afternoon: 0, evening: 0 };
  completed.forEach(t => { timeCounts[timeOfDay(new Date(t.completedAt!))]++; });
  const bestTime = (Object.entries(timeCounts).sort((a,b) => b[1]-a[1])[0][0]) as 'morning'|'afternoon'|'evening';
  const hasRhythmData = completed.length >= 3;
  const timeBarData = [
    { label: 'morning', count: timeCounts.morning },
    { label: 'afternoon', count: timeCounts.afternoon },
    { label: 'evening', count: timeCounts.evening },
  ];

  const typeStats: Record<string, { totalDays: number; count: number }> = {};
  todos.filter(t => !t.destroyedAt).forEach(t => {
    const type = classifyType(t.text);
    if (!type) return;
    if (!typeStats[type]) typeStats[type] = { totalDays: 0, count: 0 };
    const created = new Date(t.createdAt).getTime();
    const resolved = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
    typeStats[type].totalDays += (resolved - created) / (1000 * 60 * 60 * 24);
    typeStats[type].count++;
  });

  let waitType: string | null = null;
  let waitAvgDays = 0;
  Object.entries(typeStats).forEach(([type, s]) => {
    if (s.count < 2) return;
    const avg = s.totalDays / s.count;
    if (avg > waitAvgDays) { waitAvgDays = avg; waitType = type; }
  });

  return { rhythm, bestTime, hasRhythmData, waitType, waitAvgDays: Math.round(waitAvgDays), timeBarData };
}

// ── Log helpers ───────────────────────────────────────────────────────────
interface GroupedTodos {
  [date: string]: { added: Todo[]; completed: Todo[]; destroyed: Todo[] };
}

function getLocalDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function groupTodosByDate(todos: Todo[]): GroupedTodos {
  const grouped: GroupedTodos = {};
  todos.forEach(todo => {
    const key = todo.destroyedAt
      ? getLocalDateString(todo.destroyedAt)
      : todo.completed && todo.completedAt
        ? getLocalDateString(todo.completedAt)
        : getLocalDateString(todo.createdAt);
    if (!grouped[key]) grouped[key] = { added: [], completed: [], destroyed: [] };
    if (todo.destroyedAt) grouped[key].destroyed.push(todo);
    else if (todo.completed && todo.completedAt) grouped[key].completed.push(todo);
    else grouped[key].added.push(todo);
  });
  return grouped;
}

function formatDate(date: Date) {
  const today = new Date();
  if (getLocalDateString(date) === getLocalDateString(today)) return 'Today';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── Component ─────────────────────────────────────────────────────────────
export default function DailyLogScreen({ todos, onRestoreTask, isGuestMode = false }: DailyLogScreenProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [peakNudgeOn, setPeakNudgeOn] = useState(() => {
    try { return localStorage.getItem('popple-peak-nudge') === '1'; } catch { return false; }
  });
  const [boostSlowOn, setBoostSlowOn] = useState(() => {
    try { return localStorage.getItem('popple-boost-slow-tasks') === '1'; } catch { return false; }
  });

  const togglePeakNudge = () => {
    const next = !peakNudgeOn;
    setPeakNudgeOn(next);
    try { next ? localStorage.setItem('popple-peak-nudge', '1') : localStorage.removeItem('popple-peak-nudge'); } catch {}
  };
  const toggleBoostSlow = () => {
    const next = !boostSlowOn;
    setBoostSlowOn(next);
    try {
      if (next) {
        localStorage.setItem('popple-boost-slow-tasks', '1');
        if (waitType) localStorage.setItem('popple-slow-task-type', waitType);
      } else {
        localStorage.removeItem('popple-boost-slow-tasks');
        localStorage.removeItem('popple-slow-task-type');
      }
    } catch {}
  };
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    requestAnimationFrame(() => { scrollRef.current?.scrollTo({ top: 0 }); });
  }, []);

  const { bestTime, hasRhythmData, waitType, waitAvgDays, timeBarData } = useMemo(() => {
    const result = derivePatterns(todos);
    if (result.hasRhythmData) {
      try { localStorage.setItem('popple-best-time', result.bestTime); } catch {}
    }
    return result;
  }, [todos]);
  const somedayCount = useMemo(() => todos.filter(t => !t.completed && !t.destroyedAt && !t.dueDate).length, [todos]);
  const [somedayNudgeDismissed, setSomedayNudgeDismissed] = useState(() => {
    try { return localStorage.getItem('popple-someday-nudge-dismissed') === new Date().toISOString().split('T')[0]; } catch { return false; }
  });
  const showSomedayNudge = somedayCount >= 3 && !somedayNudgeDismissed;

  const groupedTodos = useMemo(() => groupTodosByDate(todos), [todos]);
  const sortedDates = Object.keys(groupedTodos).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const handleRestore = (id: string, text: string) => {
    onRestoreTask(id);
    toast.success(`"${text.length > 30 ? text.slice(0, 30) + '…' : text}" restored`, { duration: 2500 });
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute inset-0">
        <div className="pt-6 px-4 h-full flex flex-col pb-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
            <div ref={scrollRef} className="pixel-notebook rounded-t-2xl shadow-lg border border-white/60 px-6 flex-1 pb-32">
              {/* Header */}
              <div className="pt-6 pb-2">
                <h1 className="text-xl font-pixel text-gray-900">Record</h1>
              </div>

              <div className="space-y-12 pt-2">
              {/* ── Patterns ── */}
              <div>
                <div className="px-1 mb-3">
                  <span className="font-pixel text-[10px] text-gray-900">How it's going</span>
                </div>

                <div className="space-y-3">
                  {/* Peak time */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
                    {hasRhythmData ? (
                      <>
                        <p className="font-pixel text-[10px] text-gray-900 leading-relaxed">
                          {bestTime === 'morning'
                            ? 'You tend to finish tasks in the morning.'
                            : bestTime === 'afternoon'
                            ? 'You tend to finish tasks in the afternoon.'
                            : 'You tend to finish tasks in the evening.'}
                        </p>
                        <p className="font-space-mono text-xs text-gray-500 mt-2">
                          {(() => {
                            const bucket = timeBarData.find(b => b.label === bestTime);
                            const total = timeBarData.reduce((s, b) => s + b.count, 0);
                            return bucket && total > 0
                              ? `${bucket.count} of your last ${total} completions were in the ${bestTime}.`
                              : null;
                          })()}
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <p className="font-space-mono text-[10px] text-gray-500 leading-relaxed">
                            {peakNudgeOn
                              ? `Popple will check in with you during the ${bestTime}.`
                              : `Popple can check in with a task during the ${bestTime}.`}
                          </p>
                          <button
                            onClick={togglePeakNudge}
                            className={`ml-3 flex-shrink-0 font-space-mono text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                              peakNudgeOn
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-500'
                            }`}
                          >
                            {peakNudgeOn ? 'on' : 'turn on'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-pixel text-[10px] text-gray-900 leading-relaxed">Your peak time is still forming.</p>
                        <p className="font-space-mono text-xs text-gray-500 mt-2">Complete a few more tasks and Popple will find your rhythm.</p>
                      </>
                    )}
                  </div>

                  {/* What slows down */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3.5">
                    {waitType ? (
                      <>
                        <p className="font-pixel text-[10px] text-gray-900 leading-relaxed">
                          {typeLabelFor(waitType).charAt(0).toUpperCase() + typeLabelFor(waitType).slice(1)}{waitAvgDays > 1 ? ` take about ${waitAvgDays} days on average to get done.` : ' take the longest to get done.'}
                        </p>
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <p className="font-space-mono text-[10px] text-gray-500 leading-relaxed">
                            {boostSlowOn
                              ? `Popple moves ${typeLabelFor(waitType)} to Start Here first.`
                              : `Popple can move ${typeLabelFor(waitType)} to the top.`}
                          </p>
                          <button
                            onClick={toggleBoostSlow}
                            className={`ml-3 flex-shrink-0 font-space-mono text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                              boostSlowOn
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-500'
                            }`}
                          >
                            {boostSlowOn ? 'on' : 'turn on'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-pixel text-[10px] text-gray-900 leading-relaxed">No patterns yet on what slows you down.</p>
                        <p className="font-space-mono text-xs text-gray-500 mt-2">Popple will flag task types that tend to sit longest.</p>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* ── Someday review nudge ── */}
              {showSomedayNudge && (
                <div>
                  <div className="bg-gray-900 rounded-xl px-4 py-4">
                    <p className="font-space-mono text-[10px] text-gray-400 uppercase tracking-widest mb-2">someday pile</p>
                    <p className="font-space-mono text-xs text-gray-300 leading-relaxed mb-4">
                      you've got {somedayCount} tasks sitting in someday. worth a quick review?
                    </p>
                    <button
                      onClick={() => {
                        setSomedayNudgeDismissed(true);
                        try { localStorage.setItem('popple-someday-nudge-dismissed', new Date().toISOString().split('T')[0]); } catch {}
                      }}
                      className="font-space-mono text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* ── Log ── */}
              <div className="space-y-3 pb-4 pb-4">
                <div className="px-1">
                  <span className="font-pixel text-[10px] text-gray-900">Log</span>
                </div>

                {sortedDates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
                    <img
                      src={pixelNoTasksIcon}
                      alt="Empty"
                      className="w-20 h-20 object-contain"
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <p className="font-space-mono text-xs text-gray-400 text-center">your story starts here.</p>
                  </div>
                ) : (
                  sortedDates.map((dateString, dayIndex) => {
                    const [y, m, d] = dateString.split('-').map(Number);
                    const date = new Date(y, m - 1, d);
                    const dayData = groupedTodos[dateString];
                    const hasActivity = dayData.added.length > 0 || dayData.completed.length > 0 || dayData.destroyed.length > 0;
                    if (!hasActivity) return null;
                    const isExpanded = expandedDay === dateString;

                    return (
                      <motion.div
                        key={dateString}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: dayIndex * 0.05 }}
                        className="overflow-hidden"
                      >
                        {/* Accordion header */}
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : dateString)}
                          className={`w-full px-4 py-3 flex items-center justify-between rounded-xl border transition-all duration-200 touch-manipulation select-none ${
                            isExpanded
                              ? 'bg-gray-800 border-gray-600/40'
                              : 'bg-gray-900 border-gray-700/30'
                          }`}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          <span className="font-space-mono text-sm text-white">{formatDate(date)}</span>
                          <div className="flex items-center gap-3">
                            {/* Counts */}
                            <div className="flex items-center gap-2 font-space-mono text-[10px]">
                              {dayData.added.length > 0 && (
                                <span className="text-gray-400">{dayData.added.length} added</span>
                              )}
                              {dayData.completed.length > 0 && (
                                <span className="text-cyan-400">{dayData.completed.length} done</span>
                              )}
                              {dayData.destroyed.length > 0 && (
                                <span className="text-gray-500">{dayData.destroyed.length} removed</span>
                              )}
                            </div>
                            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </motion.div>
                          </div>
                        </button>

                        {/* Expanded tasks */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="pt-1.5 space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {/* Active tasks */}
                                {dayData.added.map(todo => (
                                  <div key={`added-${todo.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2.5 flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-space-mono text-xs text-gray-900 break-words">{todo.text}</p>
                                      <p className="font-space-mono text-[10px] text-gray-400 mt-0.5">added · {formatTime(todo.createdAt)}</p>
                                    </div>
                                  </div>
                                ))}
                                {/* Completed tasks */}
                                {dayData.completed.map(todo => (
                                  <div key={`done-${todo.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2.5 flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-space-mono text-xs text-gray-400 line-through break-words">{todo.text}</p>
                                      <p className="font-space-mono text-[10px] text-cyan-500 mt-0.5">done · {todo.completedAt && formatTime(todo.completedAt)}</p>
                                    </div>
                                    <button
                                      onClick={() => handleRestore(todo.id, todo.text)}
                                      className="flex-shrink-0 font-space-mono text-[10px] text-gray-400 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2 py-0.5 rounded-md transition-all"
                                    >
                                      restore
                                    </button>
                                  </div>
                                ))}
                                {/* Destroyed tasks */}
                                {dayData.destroyed.map(todo => (
                                  <div key={`destroyed-${todo.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2.5 flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-space-mono text-xs text-gray-400 line-through break-words">{todo.text}</p>
                                      <p className="font-space-mono text-[10px] text-gray-400 mt-0.5">removed · {todo.destroyedAt && formatTime(todo.destroyedAt)}</p>
                                    </div>
                                    <button
                                      onClick={() => handleRestore(todo.id, todo.text)}
                                      className="flex-shrink-0 font-space-mono text-[10px] text-gray-400 hover:text-gray-900 border border-gray-200 hover:border-gray-400 px-2 py-0.5 rounded-md transition-all"
                                    >
                                      restore
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </div>
              </div>{/* end space-y-12 */}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
