import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import type { Todo } from '../App';
import pixelNoTasksIcon from 'figma:asset/5765ff71efcec8f85a51ea67d9c56fb1dafbd5a1.png';

interface TaskHistoryScreenProps {
  todos: Todo[];
  onRestoreTask: (id: string) => void;
}

interface GroupedTodos {
  [date: string]: {
    added: Todo[];
    completed: Todo[];
    destroyed: Todo[];
  };
}

export default function TaskHistoryScreen({ 
  todos, 
  onRestoreTask
}: TaskHistoryScreenProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Helper function to get local date string (YYYY-MM-DD) 
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    
    // Use local date strings for consistent comparison
    const dateString = getLocalDateString(date);
    const todayString = getLocalDateString(today);
    
    if (dateString === todayString) return 'Today';
    
    // For all other dates, show the full date format
    return date.toLocaleDateString('en-US', { 
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Group todos by date
  const groupTodosByDate = (): GroupedTodos => {
    const grouped: GroupedTodos = {};
    
    todos.forEach(todo => {
      // Determine the current state of the task and group accordingly
      if (todo.destroyedAt) {
        // Task was destroyed - show in destroyed section on destruction date
        const destroyedDate = getLocalDateString(todo.destroyedAt);
        if (!grouped[destroyedDate]) {
          grouped[destroyedDate] = { added: [], completed: [], destroyed: [] };
        }
        grouped[destroyedDate].destroyed.push(todo);
      } else if (todo.completed && todo.completedAt) {
        // Task is completed but not destroyed - show in completed section on completion date
        const completedDate = getLocalDateString(todo.completedAt);
        if (!grouped[completedDate]) {
          grouped[completedDate] = { added: [], completed: [], destroyed: [] };
        }
        grouped[completedDate].completed.push(todo);
      } else {
        // Task is active (not completed, not destroyed) - show in added section on creation date
        const createdDate = getLocalDateString(todo.createdAt);
        if (!grouped[createdDate]) {
          grouped[createdDate] = { added: [], completed: [], destroyed: [] };
        }
        grouped[createdDate].added.push(todo);
      }
    });
    
    return grouped;
  };

  const groupedTodos = groupTodosByDate();
  const sortedDates = Object.keys(groupedTodos).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const toggleDay = (dateString: string) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    const newExpanded = new Set<string>();
    if (!expandedDays.has(dateString)) {
      // Only allow one expanded at a time
      newExpanded.add(dateString);
    }
    // If clicking the same one, it closes (newExpanded stays empty)
    setExpandedDays(newExpanded);
  };

  const handleRestoreTask = (taskId: string, taskText: string) => {
    onRestoreTask(taskId);
    toast.success(`"${taskText.length > 30 ? taskText.substring(0, 30) + '...' : taskText}" restored to active tasks!`, { duration: 3000 });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Floating Game UI Container with Notebook Background */}
      <div className="flex-1 p-4 flex flex-col">
        {/* Header Container */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className=""
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-t-2xl shadow-lg border border-white/60 border-b-0 p-6 pixel-notebook">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-pixel text-gray-900" role="heading" aria-level="1">Record</h1>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Task Timeline Container - Fixed Height with Scrolling */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-b-2xl shadow-lg border border-white/60 border-t-0 pixel-notebook flex-1 flex flex-col overflow-hidden">
            {/* Fixed Height Scrollable Container for Date Containers */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6" style={{ 
              WebkitOverflowScrolling: 'touch',
              height: '100%',
              maxHeight: 'calc(100vh - 200px)' // Ensure it doesn't exceed viewport
            }}>
              <div className="min-h-full">
                {sortedDates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-600 py-12">
                    <div className="w-32 h-32 flex items-center justify-center mb-4">
                      <img 
                        src={pixelNoTasksIcon}
                        alt="Pixelated icon for empty task history"
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
                    <p className="font-space-mono text-sm text-gray-700">Your story starts here. Add your first task.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                {sortedDates.map((dateString, dayIndex) => {
                  // Create date in local timezone by parsing YYYY-MM-DD
                  const [year, month, day] = dateString.split('-').map(Number);
                  const date = new Date(year, month - 1, day); // month is 0-indexed
                  const dayData = groupedTodos[dateString];
                  const hasActivity = dayData.added.length > 0 || dayData.completed.length > 0 || dayData.destroyed.length > 0;
                  const isExpanded = expandedDays.has(dateString);
                  
                  if (!hasActivity) return null;
                  
                  return (
                    <motion.div
                      key={dateString}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: dayIndex * 0.1 }}
                      className="overflow-hidden"
                    >
                      {/* Collapsible Date Header */}
                      <button
                        onClick={() => toggleDay(dateString)}
                        className={`w-full px-4 py-4 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-gray-400/30 text-white rounded-xl border border-gray-500/30 touch-manipulation select-none transition-all duration-200 ${
                          isExpanded 
                            ? 'bg-gray-700 shadow-lg' 
                            : 'bg-gray-800'
                        }`}
                        style={{
                          minHeight: '60px',
                          WebkitTapHighlightColor: 'transparent',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          touchAction: 'manipulation'
                        }}
                        aria-expanded={expandedDays.has(dateString)}
                        aria-label={`${expandedDays.has(dateString) ? 'Collapse' : 'Expand'} tasks for ${formatDate(date)}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <h3 className="font-space-mono text-white text-sm font-medium">
                              {formatDate(date)}
                            </h3>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Summary counts */}
                          <div className="flex items-center gap-3 text-xs text-gray-300">
                            {dayData.added.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Circle className="w-3 h-3 text-gray-400" />
                                {dayData.added.length}
                              </span>
                            )}
                            {dayData.completed.length > 0 && (
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                {dayData.completed.length}
                              </span>
                            )}
                            {dayData.destroyed.length > 0 && (
                              <span className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-purple-400 rounded-sm" />
                                {dayData.destroyed.length}
                              </span>
                            )}
                          </div>
                          
                          {/* Expand/collapse icon */}
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ 
                              duration: 0.25,
                              ease: "easeInOut"
                            }}
                            className="flex items-center justify-center w-6 h-6"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-300" />
                          </motion.div>
                        </div>
                      </button>

                      {/* Expandable Task Activities */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ 
                              duration: 0.3, 
                              ease: "easeInOut"
                            }}
                            className="task-history-dropdown-content bg-transparent overflow-hidden"
                            style={{
                              transformOrigin: 'top',
                              backfaceVisibility: 'hidden',
                              WebkitBackfaceVisibility: 'hidden'
                            }}
                          >
                            <div className="pl-4 pt-3 pb-2">
                              {/* Fixed height scrollable container for tasks */}
                              <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                              {/* Tasks Added */}
                              <AnimatePresence mode="popLayout">
                                {dayData.added.map((todo, todoIndex) => (
                                  <motion.div
                                    key={`added-${todo.id}`}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    transition={{ delay: todoIndex * 0.05, duration: 0.3 }}
                                    className="flex items-center justify-between py-3 px-4 bg-gray-100/90 rounded-lg group hover:bg-gray-100 transition-all duration-200 border border-gray-200/70 backdrop-blur-sm"
                                  >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-space-mono text-sm text-gray-900 break-words mb-1">
                                      {todo.text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="font-space-mono text-xs text-gray-700 bg-gray-300/80 px-2 py-0.5 rounded-full">
                                        Added
                                      </span>
                                      <span className="font-space-mono text-xs text-gray-600">
                                        {formatTime(todo.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Restore button only for inactive tasks (completed or destroyed) */}
                                  {(todo.completed || todo.destroyedAt) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRestoreTask(todo.id, todo.text)}
                                      className="opacity-90 group-hover:opacity-100 focus:opacity-100 transition-all px-3 py-1 bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 hover:text-black text-xs rounded-md border border-gray-200 shadow-sm flex-shrink-0"
                                      aria-label={`Restore task "${todo.text}" to active tasks`}
                                    >
                                      Restore
                                    </Button>
                                  )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>

                              {/* Tasks Completed */}
                              <AnimatePresence mode="popLayout">
                                {dayData.completed.map((todo, todoIndex) => (
                                  <motion.div
                                    key={`completed-${todo.id}`}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    transition={{ delay: (dayData.added.length + todoIndex) * 0.05, duration: 0.3 }}
                                    className="flex items-center justify-between py-3 px-4 bg-gray-100/90 rounded-lg group hover:bg-gray-100 transition-all duration-200 border border-gray-200/70 backdrop-blur-sm"
                                  >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-space-mono text-sm text-gray-900 break-words mb-1">
                                      {todo.text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="font-space-mono text-xs text-white bg-emerald-500/90 px-2 py-0.5 rounded-full">
                                        Completed
                                      </span>
                                      <span className="font-space-mono text-xs text-gray-600">
                                        {todo.completedAt && formatTime(todo.completedAt)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Restore button for completed tasks */}
                                  {(todo.completed || todo.destroyedAt) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRestoreTask(todo.id, todo.text)}
                                      className="opacity-90 group-hover:opacity-100 focus:opacity-100 transition-all px-3 py-1 bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 hover:text-black text-xs rounded-md border border-gray-200 shadow-sm flex-shrink-0"
                                      aria-label={`Restore task "${todo.text}" to active tasks`}
                                    >
                                      Restore
                                    </Button>
                                  )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>

                              {/* Tasks Destroyed */}
                              <AnimatePresence mode="popLayout">
                                {dayData.destroyed.map((todo, todoIndex) => (
                                  <motion.div
                                    key={`destroyed-${todo.id}`}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    transition={{ delay: (dayData.added.length + dayData.completed.length + todoIndex) * 0.05, duration: 0.3 }}
                                    className="flex items-center justify-between py-3 px-4 bg-gray-100/90 rounded-lg group hover:bg-gray-100 transition-all duration-200 border border-gray-200/70 backdrop-blur-sm"
                                  >
                                  <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-space-mono text-sm text-gray-900 break-words mb-1">
                                      {todo.text}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="font-space-mono text-xs text-white bg-purple-500/90 px-2 py-0.5 rounded-full">
                                         Destroyed
                                      </span>
                                      <span className="font-space-mono text-xs text-gray-600">
                                        {todo.destroyedAt && formatTime(todo.destroyedAt)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Restore button for destroyed tasks */}
                                  {(todo.completed || todo.destroyedAt) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRestoreTask(todo.id, todo.text)}
                                      className="opacity-90 group-hover:opacity-100 focus:opacity-100 transition-all px-3 py-1 bg-white hover:bg-gray-50 focus:bg-gray-50 text-gray-900 hover:text-black text-xs rounded-md border border-gray-200 shadow-sm flex-shrink-0"
                                      aria-label={`Restore task "${todo.text}" to active tasks`}
                                    >
                                      Restore
                                    </Button>
                                  )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    );
                  })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}