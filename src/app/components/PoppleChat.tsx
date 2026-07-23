import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import PoppleCharacter from './PoppleCharacter';
import PhotoScanFlow from './PhotoScanFlow';
import CameraCapture from './CameraCapture';
import { Camera, Image, ArrowElbowDownLeft, Microphone, ArrowRight } from '@phosphor-icons/react';
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

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://popple-api.johanna-huarachi.workers.dev';

// Returns a conversational reply if the text isn't a task, otherwise null
function getConversationalReply(text: string): string | null {
  const t = text.trim().toLowerCase();
  const clean = t.replace(/[^a-z0-9 ']/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);

  // Greetings
  if (/^(hey|hi|hello|sup|yo|hiya|howdy|heya|helo|hai)\b/.test(clean) && words.length <= 4) {
    const replies = [
      "hey!! what are we tackling today?",
      "hi!! ready when you are — what's on your mind?",
      "hey you!! tell me what needs doing.",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // How are you / status check
  if (/how are you|how('?re| are) (you|things|it going)|you good|you okay|you alright/.test(clean)) {
    return "honestly thriving. you?? also — what tasks do we have today?";
  }

  // Emotional / overwhelmed
  if (/^(ugh+|ughhh|argh|ahh+|omg|oh no|oh god|help|stressed|overwhelmed|exhausted|tired|burnt out|so much|too much|a lot|lots|so many)\b/.test(clean)
    || /i (have|got) (so much|a lot|too much|tons|loads)/.test(clean)
    || /i('?m| am) (stressed|overwhelmed|exhausted|tired|lost|behind|stuck|so behind)/.test(clean)) {
    const replies = [
      "okay okay, take a breath. tell me everything — I'll help you sort it.",
      "sounds like a lot. just start talking and I'll pull out the tasks.",
      "got you. what's weighing on you most right now?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // Confusion / surprise
  if (/^(wait|huh|what|wut|hmm+|hm+|um+|uh+)\b/.test(clean) && words.length <= 3) {
    return "ha — sorry if that was confusing! want to try again?";
  }

  // Sadness / frustration (short emotional expressions)
  if (/^(:\(|:\-\(|sad|ugh|bleh|meh|nope|nah|no)$/.test(t.replace(/\s/g, '')) && words.length <= 2) {
    return "aw, that's okay. what's going on? maybe I can help.";
  }

  // Acknowledgements / short affirmations
  if (/^(thanks|thank you|thx|ty|cheers|cool|nice|ok|okay|great|awesome|perfect|got it|sounds good|yep|yeah|sure|yup|k)\b/.test(clean) && words.length <= 3) {
    return "anytime! anything else you need help with?";
  }

  // Task-like signals — let it through to AI
  const taskSignals = /\b(need to|have to|should|must|want to|going to|gonna|gotta|buy|call|email|text|send|write|fix|clean|wash|do|finish|complete|submit|schedule|book|pick up|drop off|remind|check|review|read|pay|order|update|make|get|find|prepare|plan|set up|move|pack|unpack|reply|respond)\b/;
  if (taskSignals.test(clean)) return null;

  // Anything very short with no task verbs — conversational
  if (words.length <= 2) {
    return "hmm, not sure what to do with that! try telling me something you need to get done.";
  }

  // Let the AI handle anything else
  return null;
}
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

function ChatBubble({ msg, onAddTodo, onUseSample, accessory }: { msg: ChatMessage; onAddTodo: (title: string) => void; onUseSample?: () => void; accessory: import('./PoppleCharacter').PoppleAccessory }) {
  const isUser = msg.role === 'user';

  if (msg.isTyping) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <PoppleCharacter expression="waiting" pendingCount={0} onClick={() => {}} size={56} mode="idle" silent accessory={accessory} />
        </div>
        <div className="flex gap-1 pt-4">
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
      <div className="flex items-start gap-2 pl-12">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onUseSample}
          className="flex flex-col gap-1.5 text-left"
        >
          <div className="overflow-hidden rounded-2xl border-2 border-gray-200 shadow-md" style={{ width: 140, height: 100 }}>
            <img src="/sample-desk.jpg" alt="sample desk" className="w-full h-full object-cover" />
          </div>
          <span className="flex items-center gap-1 font-space-mono text-[10px] text-gray-400">
            <ArrowRight size={10} />
            {msg.text}
          </span>
        </motion.button>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {msg.text && (
          <div className="min-w-[80px] max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gray-900 text-white font-space-mono text-base leading-relaxed">
            {msg.text}
          </div>
        )}
        {msg.imagePreview && (
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ width: 140, height: 100 }}>
            <img src={msg.imagePreview} alt="attached" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  }

  // Popple message — avatar on the left
  return (
    <div className="flex items-start gap-3">
      {/* Popple avatar */}
      <div className="flex-shrink-0 mt-0.5">
        <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={56} mode="idle" silent accessory={accessory} />
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {msg.text && (
          <p className="min-w-[96px] font-space-mono text-base text-gray-800 leading-relaxed pt-2">
            {msg.text}
          </p>
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
    { id: 'hint', role: 'popple', text: "try the sample photo", isSampleHint: true },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [memory, setMemory] = useState(() => loadMemory());
  const [poppleExpression, setPoppleExpression] = useState<'idle' | 'waiting' | 'celebrating'>('idle');

  // Photo scan flow state
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanTasks, setScanTasks] = useState<ExtractedTask[] | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scanAcceptedRef = useRef<ExtractedTask[]>([]);

  const accessory = useMemo(() => {
    try { return (localStorage.getItem('popple-accessory') as import('./PoppleCharacter').PoppleAccessory) ?? null; } catch { return null; }
  }, []);

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

    const reply = getConversationalReply(text);
    if (reply) {
      setMessages(prev => [...prev, { id: `popple-${Date.now()}`, role: 'popple', text: reply }]);
      return;
    }

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

  // ── Photo → scan flow ─────────────────────────────────────────────────────

  const startScan = useCallback(async (dataUrl: string, base64: string, mimeType: string) => {
    scanAcceptedRef.current = [];
    setScanImage(dataUrl);
    setScanTasks(null);
    const recentActivity = memory.filter(e => e.outcome === 'accepted').slice(-5).map(e => e.title);
    try {
      const res = await fetch(`${API_BASE}/ai/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType, recentActivity }),
      });
      const data = await res.json() as { tasks?: ExtractedTask[] };
      setScanTasks(data.tasks ?? []);
    } catch {
      setScanTasks([]);
    }
  }, [memory]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      startScan(dataUrl, base64, mimeType);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [startScan]);

  const handleUseSample = useCallback(async () => {
    setMessages(prev => prev.filter(m => !m.isSampleHint));
    const res = await fetch('/sample-desk.jpg');
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/webp';
      startScan(dataUrl, base64, mimeType);
    };
    reader.readAsDataURL(blob);
  }, [startScan]);

  // ── Handle task adds ──────────────────────────────────────────────────────

  const handleAddTodo = useCallback((title: string) => {
    onAddTodo(title);
    const updated = [...memory, { title, outcome: 'accepted' as const }].slice(-10);
    setMemory(updated);
    saveMemory(updated);
    setPoppleExpression('celebrating');
    setTimeout(() => setPoppleExpression('idle'), 2000);
  }, [onAddTodo, memory]);

  const handleScanAccept = useCallback((task: ExtractedTask) => {
    handleAddTodo(task.title);
    scanAcceptedRef.current = [...scanAcceptedRef.current, task];
  }, [handleAddTodo]);

  const handleScanDecline = useCallback((task: ExtractedTask) => {
    const updated = [...memory, { title: task.title, outcome: 'declined' as const }].slice(-10);
    setMemory(updated);
    saveMemory(updated);
  }, [memory]);

  const handleScanDone = useCallback(() => {
    const accepted = scanAcceptedRef.current;
    scanAcceptedRef.current = [];
    setScanImage(null);
    setScanTasks(null);

    // Post scan summary back into chat
    const n = accepted.length;
    const followUp = n === 0
      ? "no worries — nothing added. scan again whenever you're ready."
      : n === 1
      ? `added "${accepted[0].title}" to your list. one down!`
      : `added ${n} tasks to your list. let's knock them out.`;

    setMessages(prev => [
      ...prev,
      {
        id: `scan-summary-${Date.now()}`,
        role: 'popple' as const,
        text: followUp,
        tasks: accepted.length > 0 ? accepted : undefined,
      },
    ]);
  }, []);

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
          <ChatBubble key={msg.id} msg={msg} onAddTodo={handleAddTodo} onUseSample={handleUseSample} accessory={accessory} />
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
              {/* Camera (live) */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setCameraOpen(true)}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white"
              >
                <Camera size={18} />
              </motion.button>
              {/* Photo from library */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => photoInputRef.current?.click()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white"
              >
                <Image size={18} />
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
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white disabled:opacity-40"
                >
                  <ArrowElbowDownLeft size={18} weight="bold" />
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onPointerDown={handleMicDown}
                  onPointerUp={handleMicUp}
                  disabled={!hasSpeechAPI}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white touch-none select-none disabled:opacity-30"
                  title="Hold to speak"
                >
                  <Microphone size={18} />
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

      {/* Camera capture — portal */}
      {cameraOpen && createPortal(
        <AnimatePresence>
          <CameraCapture
            onCapture={(dataUrl, base64, mimeType) => {
              setCameraOpen(false);
              startScan(dataUrl, base64, mimeType);
            }}
            onClose={() => setCameraOpen(false)}
          />
        </AnimatePresence>,
        document.body
      )}

      {/* Photo scan flow — portal so it covers everything */}
      {scanImage && createPortal(
        <AnimatePresence>
          <PhotoScanFlow
            imagePreview={scanImage}
            tasks={scanTasks}
            onAccept={handleScanAccept}
            onDecline={handleScanDecline}
            onDone={handleScanDone}
          />
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
