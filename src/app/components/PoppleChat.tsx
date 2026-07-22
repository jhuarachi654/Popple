import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PoppleCharacter from './PoppleCharacter';
import type { ExtractedTask } from './TaskSwipeDeck';

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: 'user' | 'popple';
  text?: string;
  imagePreview?: string;
  tasks?: ExtractedTask[];
  isTyping?: boolean;
  isSampleHint?: boolean;
};

interface Props {
  onAddTodo: (title: string) => void;
  onClose: () => void;
}

// ── Coach memory ──────────────────────────────────────────────────────────────

const MEMORY_KEY = 'popple-coach-memory';
function loadMemory(): { title: string; outcome: 'accepted' | 'declined' }[] {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) ?? '[]'); } catch { return []; }
}
function saveMemory(entries: { title: string; outcome: 'accepted' | 'declined' }[]) {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(-10))); } catch {}
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://popple-api.johannahuarachi.workers.dev';
const DIFF: Record<string, { pill: string; label: string }> = {
  easy:   { pill: 'bg-emerald-100 text-emerald-700', label: 'quick win'   },
  medium: { pill: 'bg-amber-100 text-amber-700',     label: 'some effort' },
  hard:   { pill: 'bg-rose-100 text-rose-700',       label: 'big one'     },
};

// ── Task card (inline in chat) ────────────────────────────────────────────────

function TaskCard({ task, onAdd }: { task: ExtractedTask; onAdd: () => void }) {
  const [added, setAdded] = useState(false);
  const diff = DIFF[task.difficulty_guess] ?? DIFF.easy;
  return (
    <div className="pixel-notebook rounded-xl p-3 flex items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className={`font-space-mono text-[9px] px-1.5 py-0.5 rounded-full ${diff.pill}`}>{diff.label}</span>
        <p className="font-pixel text-sm text-gray-900 leading-snug">{task.title}</p>
        <p className="font-space-mono text-[10px] text-gray-400 leading-relaxed">{task.coach_note}</p>
      </div>
      <button
        onClick={() => { if (!added) { onAdd(); setAdded(true); } }}
        className={`flex-shrink-0 mt-1 font-pixel text-[9px] px-3 py-1.5 rounded-lg transition-colors ${
          added ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white active:scale-95'
        }`}
      >
        {added ? 'added ✓' : '+ add'}
      </button>
    </div>
  );
}

// ── Single chat bubble ────────────────────────────────────────────────────────

function ChatBubble({ msg, onAddTodo, onUseSample }: { msg: ChatMessage; onAddTodo: (title: string) => void; onUseSample?: () => void }) {
  const isUser = msg.role === 'user';

  if (msg.isTyping) {
    return (
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          <PoppleCharacter expression="waiting" pendingCount={0} onClick={() => {}} size={32} mode="idle" silent />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 mt-0.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    );
  }

  if (msg.isSampleHint) {
    return (
      <div className="flex items-start gap-2 pl-10">
        <div className="flex flex-col gap-1.5">
          <span className="font-space-mono text-xs text-gray-400">{msg.text}</span>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onUseSample}
            className="overflow-hidden rounded-2xl border-2 border-gray-200 shadow-md active:scale-95 transition-transform"
            style={{ width: 220, height: 160 }}
          >
            <img src="/sample-room.webp" alt="sample room" className="w-full h-full object-cover" />
          </motion.button>
        </div>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {msg.text && (
          <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gray-900 text-white font-space-mono text-sm leading-relaxed">
            {msg.text}
          </div>
        )}
        {msg.imagePreview && (
          <div className="max-w-[60%] rounded-2xl overflow-hidden border border-gray-200">
            <img src={msg.imagePreview} alt="attached" className="w-full object-cover" />
          </div>
        )}
      </div>
    );
  }

  // Popple message — avatar on the left
  return (
    <div className="flex items-start gap-2">
      {/* Popple avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={32} mode="idle" silent />
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {msg.text && (
          <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-gray-100 text-gray-800 font-space-mono text-sm leading-relaxed">
            {msg.text}
          </div>
        )}
        {msg.tasks && msg.tasks.length > 0 && (
          <div className="w-full space-y-2">
            {msg.tasks.map(task => (
              <TaskCard key={task.id} task={task} onAdd={() => onAddTodo(task.title)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main chat component ───────────────────────────────────────────────────────

export default function PoppleChat({ onAddTodo, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'intro', role: 'popple', text: "hey! tell me what's on your mind — or show me a list." },
    { id: 'hint', role: 'popple', text: "💡 try the sample photo →", isSampleHint: true },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [memory, setMemory] = useState(() => loadMemory());
  const [poppleExpression, setPoppleExpression] = useState<'idle' | 'waiting' | 'celebrating'>('idle');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSpeechAPI = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60);
  };

  useEffect(scrollToBottom, [messages]);

  // ── Extract tasks from any input ─────────────────────────────────────────

  const extractAndRespond = useCallback(async (
    payload: { transcript?: string; image?: string; mimeType?: string },
    userMsgId: string,
  ) => {
    const typingId = `typing-${Date.now()}`;
    setMessages(prev => [...prev, { id: typingId, role: 'popple', isTyping: true }]);
    setPoppleExpression('waiting');
    setIsProcessing(true);

    const recentActivity = memory.filter(e => e.outcome === 'accepted').slice(-5).map(e => e.title);

    try {
      const res = await fetch(`${API_BASE}/ai/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, recentActivity }),
      });
      const data = await res.json() as { tasks?: ExtractedTask[] };
      const tasks = data.tasks ?? [];

      setMessages(prev => prev.map(m =>
        m.id === typingId
          ? {
              id: typingId,
              role: 'popple' as const,
              text: tasks.length === 0
                ? "hmm, couldn't spot any tasks in that — try again?"
                : tasks.length === 1
                ? "got one thing from that:"
                : `caught ${tasks.length} things:`,
              tasks: tasks.length > 0 ? tasks : undefined,
            }
          : m
      ));
      setPoppleExpression('idle');
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === typingId ? { id: typingId, role: 'popple' as const, text: "something went wrong — try again?" } : m
      ));
      setPoppleExpression('idle');
    } finally {
      setIsProcessing(false);
    }
  }, [memory]);

  // ── Text send ─────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isProcessing) return;
    setInputText('');
    const msgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: msgId, role: 'user', text }]);
    await extractAndRespond({ transcript: text }, msgId);
  }, [inputText, isProcessing, extractAndRespond]);

  // ── Voice ─────────────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!hasSpeechAPI) return;
    const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    recognitionRef.current = rec;
    let interim = '';
    rec.onresult = (e) => {
      interim = Array.from(e.results).map(r => r[0].transcript).join('');
      setLiveTranscript(interim);
    };
    rec.onerror = () => { setIsListening(false); setLiveTranscript(''); };
    setLiveTranscript('');
    setIsListening(true);
    rec.start();
  }, [hasSpeechAPI]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onend = null;
    rec.stop();
    const text = liveTranscript.trim();
    setIsListening(false);
    setLiveTranscript('');
    if (!text) return;
    const msgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: msgId, role: 'user', text }]);
    extractAndRespond({ transcript: text }, msgId);
  }, [liveTranscript, extractAndRespond]);

  const handleMicDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startListening();
  }, [startListening]);

  const handleMicUp = useCallback(() => {
    if (isListening) stopListening();
  }, [isListening, stopListening]);

  // ── Photo ─────────────────────────────────────────────────────────────────

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      const msgId = `user-${Date.now()}`;
      setMessages(prev => [...prev, { id: msgId, role: 'user', imagePreview: dataUrl }]);
      extractAndRespond({ image: base64, mimeType }, msgId);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [extractAndRespond]);

  // ── Sample photo ─────────────────────────────────────────────────────────

  const handleUseSample = useCallback(async () => {
    const msgId = `user-${Date.now()}`;
    setMessages(prev => [
      ...prev.filter(m => !m.isSampleHint),
      { id: msgId, role: 'user', imagePreview: '/sample-room.webp' },
    ]);
    const res = await fetch('/sample-room.webp');
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/webp';
      extractAndRespond({ image: base64, mimeType }, msgId);
    };
    reader.readAsDataURL(blob);
  }, [extractAndRespond]);

  // ── Handle task adds from cards ───────────────────────────────────────────

  const handleAddTodo = useCallback((title: string) => {
    onAddTodo(title);
    const updated = [...memory, { title, outcome: 'accepted' as const }].slice(-10);
    setMemory(updated);
    saveMemory(updated);
    setPoppleExpression('celebrating');
    setTimeout(() => setPoppleExpression('idle'), 2000);
  }, [onAddTodo, memory]);

  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[10002] flex flex-col bg-white"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-pixel text-sm text-gray-900">Popple</p>
          <p className="font-space-mono text-[9px] text-gray-400">your task buddy</p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
      >
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} onAddTodo={handleAddTodo} onUseSample={handleUseSample} />
        ))}
      </div>

      {/* Input bar */}
      <div
        className="flex-shrink-0 border-t border-gray-100 px-4 py-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            /* Listening state */
            <motion.div
              key="listening"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="flex items-center gap-3 bg-gray-900 rounded-2xl px-4 py-3"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 0.7, repeat: Infinity }}
              />
              <p className="flex-1 font-space-mono text-sm text-white/70 leading-relaxed truncate">
                {liveTranscript || 'listening…'}
              </p>
              <button
                onPointerUp={handleMicUp}
                className="flex-shrink-0 font-space-mono text-[10px] text-white/40 border border-white/20 rounded-lg px-2.5 py-1"
              >
                send
              </button>
            </motion.div>
          ) : (
            /* Normal input */
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="flex items-center gap-2 bg-gray-900 rounded-2xl px-3 py-2"
            >
              {/* Photo */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => photoInputRef.current?.click()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base"
              >
                📷
              </motion.button>

              {/* Text */}
              <input
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                placeholder="tell me what's on your mind…"
                disabled={isProcessing}
                className="flex-1 bg-transparent text-white placeholder-gray-500 font-space-mono text-sm outline-none"
              />

              {/* Send or Mic */}
              {inputText.trim() ? (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleSend}
                  disabled={isProcessing}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-space-mono text-sm text-white disabled:opacity-40"
                >
                  ↵
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onPointerDown={handleMicDown}
                  onPointerUp={handleMicUp}
                  disabled={!hasSpeechAPI}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-base touch-none select-none disabled:opacity-30"
                  title="Hold to speak"
                >
                  🎙
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoChange}
      />
    </motion.div>
  );
}
