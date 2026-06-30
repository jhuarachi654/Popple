import React from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle, Circle, Clock } from 'lucide-react';
import type { Todo } from '../App';

interface DailyLogScreenProps {
  todos: Todo[];
}

interface GroupedTodos {
  [date: string]: {
    added: Todo[];
    completed: Todo[];
  };
}

export default function DailyLogScreen({ todos }: DailyLogScreenProps) {
  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
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
      // Group by creation date
      const createdDate = todo.createdAt.toISOString().split('T')[0];
      if (!grouped[createdDate]) {
        grouped[createdDate] = { added: [], completed: [] };
      }
      grouped[createdDate].added.push(todo);
      
      // Group by completion date if completed
      if (todo.completed && todo.completedAt) {
        const completedDate = todo.completedAt.toISOString().split('T')[0];
        if (!grouped[completedDate]) {
          grouped[completedDate] = { added: [], completed: [] };
        }
        grouped[completedDate].completed.push(todo);
      }
    });
    
    return grouped;
  };

  const groupedTodos = groupTodosByDate();
  const sortedDates = Object.keys(groupedTodos).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="px-6 py-6 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <h1 className="text-2xl font-medium text-gray-900">Daily Progress</h1>
        <p className="text-sm text-gray-600 mt-1">
          Chronological view of your task activity
        </p>
      </div>

      {/* Task Timeline */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {sortedDates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-gray-400"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm text-center mt-2">
              Start adding tasks to see your daily progress
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateString, dayIndex) => {
              const date = new Date(dateString);
              const dayData = groupedTodos[dateString];
              const hasActivity = dayData.added.length > 0 || dayData.completed.length > 0;
              
              if (!hasActivity) return null;
              
              return (
                <motion.div
                  key={dateString}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm"
                >
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {formatDate(date)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {date.toLocaleDateString('en-US', { 
                          year: 'numeric',
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Task Activities */}
                  <div className="space-y-3">
                    {/* Tasks Added */}
                    {dayData.added.map((todo, todoIndex) => (
                      <motion.div
                        key={`added-${todo.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (dayIndex * 0.1) + (todoIndex * 0.05) }}
                        className="flex items-start gap-3 py-2"
                      >
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <Circle className="w-3 h-3 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 break-words">
                            {todo.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                              Added
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(todo.createdAt)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Tasks Completed */}
                    {dayData.completed.map((todo, todoIndex) => (
                      <motion.div
                        key={`completed-${todo.id}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (dayIndex * 0.1) + ((dayData.added.length + todoIndex) * 0.05) }}
                        className="flex items-start gap-3 py-2"
                      >
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 break-words">
                            {todo.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              Completed
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {todo.completedAt && formatTime(todo.completedAt)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Day Summary */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {dayData.added.length} task{dayData.added.length !== 1 ? 's' : ''} added
                    </span>
                    <span>
                      {dayData.completed.length} task{dayData.completed.length !== 1 ? 's' : ''} completed
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}