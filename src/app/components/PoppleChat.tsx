import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import PoppleCharacter from './PoppleCharacter';
import CameraCapture from './CameraCapture';
import { Camera, Image, ArrowElbowDownLeft, Microphone, ArrowRight, Check } from '@phosphor-icons/react';
import type { ExtractedTask } from './TaskSwipeDeck';
import type { PoppleAccessory } from './PoppleCharacter';

// ── Types ─────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: 'user' | 'popple';
  text?: string;
  imagePreview?: string;
  tasks?: ExtractedTask[];
  isTyping?: boolean;
  isSampleHint?: boolean;
  scanPhase?: string; // progressive loading label
};

type ActiveScan = {
  tasks: ExtractedTask[];
  selected: boolean[];
};

interface Props {
  onAddTodo: (title: string) => void;
  onClose: () => void;
}

const MEMORY_KEY = 'popple-coach-memory';
function loadMemory(): { title: string; outcome: 'accepted' | 'declined' }[] {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) ?? '[]'); } catch { return []; }
}
function saveMemory(entries: { title: string; outcome: 'accepted' | 'declined' }[]) {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(entries.slice(-10))); } catch {}
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://popple-api.johanna-huarachi.workers.dev';

const SCAN_PHASES = [
  'looking at your photo…',
  'spotting what needs doing…',
  'almost there…',
];

function getConversationalReply(text: string): string | null {
  const t = text.trim().toLowerCase();
  const clean = t.replace(/[^a-z0-9 ']/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (/^(hey|hi|hello|sup|yo|hiya|howdy|heya|helo|hai)\b/.test(clean) && words.length <= 4) {
    const r = ["hey!! what are we tackling today?", "hi!! ready when you are — what's on your mind?", "hey you!! tell me what needs doing."];
    return r[Math.floor(Math.random() * r.length)];
  }
  if (/how are you|how('?re| are) (you|things|it going)|you good|you okay|you alright/.test(clean))
    return "honestly thriving. you?? also — what tasks do we have today?";
  if (/^(ugh+|ughhh|argh|ahh+|omg|oh no|oh god|help|stressed|overwhelmed|exhausted|tired|burnt out|so much|too much|a lot|lots|so many)\b/.test(clean)
    || /i (have|got) (so much|a lot|too much|tons|loads)/.test(clean)
    || /i('?m| am) (stressed|overwhelmed|exhausted|tired|lost|behind|stuck|so behind)/.test(clean)) {
    const r = ["okay okay, take a breath. tell me everything — I'll help you sort it.", "sounds like a lot. just start talking and I'll pull out the tasks.", "got you. what's weighing on you most right now?"];
    return r[Math.floor(Math.random() * r.length)];
  }
  if (/^(wait|huh|what|wut|hmm+|hm+|um+|uh+)\b/.test(clean) && words.length <= 3)
    return "ha — sorry if that was confusing! want to try again?";
  if (/^(:\(|:\-\(|sad|ugh|bleh|meh|nope|nah|no)$/.test(t.replace(/\s/g, '')) && words.length <= 2)
    return "aw, that's okay. what's going on? maybe I can help.";
  if (/^(thanks|thank you|thx|ty|cheers|cool|nice|ok|okay|great|awesome|perfect|got it|sounds good|yep|yeah|sure|yup|k)\b/.test(clean) && words.length <= 3)
    return "anytime! anything else you need help with?";
  const taskSignals = /\b(need to|have to|should|must|want to|going to|gonna|gotta|buy|call|email|text|send|write|fix|clean|wash|do|finish|complete|submit|schedule|book|pick up|drop off|remind|check|review|read|pay|order|update|make|get|find|prepare|plan|set up|move|pack|unpack|reply|respond)\b/;
  if (taskSignals.test(clean)) return null;
  if (words.length <= 2) return "hmm, not sure what to do with that! try telling me something you need to get done.";
  return null;
}

// ── Progressive scan loading bubble ──────────────────────────────────────────

function ScanLoadingBubble({ accessory }: { accessory: PoppleAccessory }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPhase(p => Math.min(p + 1, SCAN_PHASES.length - 1)), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <PoppleCharacter expression="waiting" pendingCount={0} onClick={() => {}} size={56} mode="idle" silent accessory={accessory} />
      </div>
      <div className="pt-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="font-space-mono text-base text-gray-400"
          >
            {SCAN_PHASES[phase]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ msg, onUseSample, accessory }: {
  msg: ChatMessage;
  onUseSample?: () => void;
  accessory: PoppleAccessory;
}) {
  const isUser = msg.role === 'user';

  if (msg.scanPhase) return <ScanLoadingBubble accessory={accessory} />;

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
      <div className="flex items-start gap-2 pl-14">
        <motion.button whileTap={{ scale: 0.97 }} onClick={onUseSample} className="flex flex-col gap-1.5 text-left">
          <div className="overflow-hidden rounded-2xl border-2 border-gray-200 shadow-md" style={{ width: 140, height: 100 }}>
            <img src="/sample-desk.jpg" alt="sample" className="w-full h-full object-cover" />
          </div>
          <span className="flex items-center gap-1 font-space-mono text-[10px] text-gray-400">
            <ArrowRight size={10} />{msg.text}
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
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ width: 160, height: 120 }}>
            <img src={msg.imagePreview} alt="attached" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        <PoppleCharacter expression="idle" pendingCount={0} onClick={() => {}} size={56} mode="idle" silent accessory={accessory} />
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {msg.text && (
          <p className="min-w-[96px] font-space-mono text-base text-gray-800 leading-relaxed pt-2">{msg.text}</p>
        )}
        {msg.tasks && msg.tasks.length > 0 && (
          <ul className="space-y-1 pt-1">
            {msg.tasks.map(task => (
              <li key={task.id} className="font-space-mono text-sm text-gray-500 before:content-['·'] before:mr-2">
                {task.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Task checklist panel (above input) ───────────────────────────────────────

function ScanChecklist({ scan, onConfirm, onDismiss }: {
  scan: ActiveScan;
  onConfirm: (selected: boolean[]) => void;
  onDismiss: () => void;
}) {
  const [selected, setSelected] = useState(scan.selected);
  const count = selected.filter(Boolean).length;

  const toggle = (i: number) => setSelected(prev => prev.map((v, j) => j === i ? !v : v));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="flex-shrink-0 mx-4 mb-2 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1">
        <p className="font-space-mono text-xs text-gray-400">check the ones you want to add</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {scan.tasks.map((task, i) => (
          <li key={task.id}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50"
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                selected[i] ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
              }`}>
                {selected[i] && <Check size={11} weight="bold" className="text-white" />}
              </div>
              <span className="font-space-mono text-sm text-gray-800 leading-snug">{task.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100">
        <motion.button
          onClick={() => onConfirm(selected)}
          whileTap={{ scale: 0.97 }}
          disabled={count === 0}
          className="flex-1 bg-gray-900 text-white font-space-mono text-xs py-2.5 rounded-xl disabled:opacity-30"
        >
          {count === 0 ? 'select tasks' : `Add ${count} task${count > 1 ? 's' : ''}`}
        </motion.button>
        <motion.button
          onClick={onDismiss}
          whileTap={{ scale: 0.97 }}
          className="font-space-mono text-xs text-gray-400 px-3 py-2.5"
        >
          skip all
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main chat ─────────────────────────────────────────────────────────────────

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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeScan, setActiveScan] = useState<ActiveScan | null>(null);

  const accessory = useMemo(() => {
    try { return (localStorage.getItem('popple-accessory') as PoppleAccessory) ?? null; } catch { return null; }
  }, []);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSpeechAPI = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const scrollToBottom = () => { setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60); };
  useEffect(scrollToBottom, [messages]);

  const handleAddTodo = useCallback((title: string) => {
    onAddTodo(title);
    const updated = [...memory, { title, outcome: 'accepted' as const }].slice(-10);
    setMemory(updated);
    saveMemory(updated);
  }, [onAddTodo, memory]);

  // ── Confirm scan selection ────────────────────────────────────────────────

  const handleScanConfirm = useCallback((selected: boolean[]) => {
    if (!activeScan) return;
    const accepted = activeScan.tasks.filter((_, i) => selected[i]);
    accepted.forEach(t => handleAddTodo(t.title));
    setActiveScan(null);

    const n = accepted.length;
    const followUp = n === 0
      ? "no worries — nothing added. scan again whenever you're ready."
      : n === 1 ? `added "${accepted[0].title}" to your list. one down!`
      : `added ${n} tasks to your list. let's knock them out.`;

    setMessages(prev => [...prev, {
      id: `scan-summary-${Date.now()}`,
      role: 'popple',
      text: followUp,
      tasks: accepted.length > 0 ? accepted : undefined,
    }]);
  }, [activeScan, handleAddTodo]);

  const handleScanDismiss = useCallback(() => {
    setActiveScan(null);
    setMessages(prev => [...prev, {
      id: `scan-dismiss-${Date.now()}`,
      role: 'popple',
      text: "no worries — nothing added. scan again whenever you're ready.",
    }]);
  }, []);

  // ── Photo scan ────────────────────────────────────────────────────────────

  const startScan = useCallback(async (dataUrl: string, base64: string, mimeType: string) => {
    // Post photo as user message
    const loadingId = `scan-loading-${Date.now()}`;
    setMessages(prev => prev
      .filter(m => !m.isSampleHint)
      .concat(
        { id: `user-photo-${Date.now()}`, role: 'user', imagePreview: dataUrl },
        { id: loadingId, role: 'popple', scanPhase: 'loading' },
      )
    );

    const recentActivity = memory.filter(e => e.outcome === 'accepted').slice(-5).map(e => e.title);

    try {
      const res = await fetch(`${API_BASE}/ai/extract-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType, recentActivity }),
      });
      const data = await res.json() as { tasks?: ExtractedTask[] };
      const tasks = data.tasks ?? [];

      if (tasks.length === 0) {
        setMessages(prev => prev.map(m =>
          m.id === loadingId ? { id: loadingId, role: 'popple' as const, text: "hmm, couldn't spot any tasks in that photo." } : m
        ));
        return;
      }

      setMessages(prev => prev.map(m =>
        m.id === loadingId
          ? { id: loadingId, role: 'popple' as const, text: `spotted ${tasks.length} thing${tasks.length > 1 ? 's' : ''} — check the ones you want:` }
          : m
      ));
      setActiveScan({ tasks, selected: tasks.map(() => true) });
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? { id: loadingId, role: 'popple' as const, text: "something went wrong — try again?" } : m
      ));
    }
  }, [memory]);

  // ── Text extract ──────────────────────────────────────────────────────────

  const extractAndRespond = useCallback(async (payload: { transcript?: string }, _userMsgId: string) => {
    const typingId = `typing-${Date.now()}`;
    setMessages(prev => [...prev, { id: typingId, role: 'popple', isTyping: true }]);
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
        m.id === typingId ? {
          id: typingId, role: 'popple' as const,
          text: tasks.length === 0 ? "hmm, couldn't spot any tasks in that — try again?"
            : tasks.length === 1 ? "got one thing from that:" : `caught ${tasks.length} things:`,
          tasks: tasks.length > 0 ? tasks : undefined,
        } : m
      ));
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === typingId ? { id: typingId, role: 'popple' as const, text: "something went wrong — try again?" } : m
      ));
    } finally {
      setIsProcessing(false);
    }
  }, [memory]);

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

  const startListening = useCallback(() => {
    if (!hasSpeechAPI) return;
    const SR = (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition) as typeof SpeechRecognition;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    recognitionRef.current = rec;
    rec.onresult = (e) => setLiveTranscript(Array.from(e.results).map(r => r[0].transcript).join(''));
    rec.onerror = () => { setIsListening(false); setLiveTranscript(''); };
    setLiveTranscript(''); setIsListening(true); rec.start();
  }, [hasSpeechAPI]);

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    rec.onend = null; rec.stop();
    const text = liveTranscript.trim();
    setIsListening(false); setLiveTranscript('');
    if (!text) return;
    const msgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: msgId, role: 'user', text }]);
    extractAndRespond({ transcript: text }, msgId);
  }, [liveTranscript, extractAndRespond]);

  const handleMicDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId); startListening();
  }, [startListening]);
  const handleMicUp = useCallback(() => { if (isListening) stopListening(); }, [isListening, stopListening]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      startScan(dataUrl, base64, header.match(/:(.*?);/)?.[1] ?? 'image/jpeg');
    };
    reader.readAsDataURL(file); e.target.value = '';
  }, [startScan]);

  const handleUseSample = useCallback(async () => {
    const res = await fetch('/sample-desk.jpg');
    const blob = await res.blob();
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      startScan(dataUrl, base64, header.match(/:(.*?);/)?.[1] ?? 'image/webp');
    };
    reader.readAsDataURL(blob);
  }, [startScan]);

  useEffect(() => { return () => { recognitionRef.current?.stop(); }; }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[10002] flex flex-col bg-white"
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 32, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <p className="font-pixel text-sm text-gray-900">Popple</p>
          <p className="font-space-mono text-[9px] text-gray-400">your task buddy</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm active:scale-90 transition-transform">✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} onUseSample={handleUseSample} accessory={accessory} />
        ))}
      </div>

      {/* Task checklist — above input when scan is ready */}
      <AnimatePresence>
        {activeScan && (
          <ScanChecklist
            scan={activeScan}
            onConfirm={handleScanConfirm}
            onDismiss={handleScanDismiss}
          />
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div key="listening" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="flex items-center gap-3 bg-gray-900 rounded-2xl px-4 py-3">
              <motion.div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.7, repeat: Infinity }} />
              <p className="flex-1 font-space-mono text-sm text-white/70 leading-relaxed truncate">{liveTranscript || 'listening…'}</p>
              <button onPointerUp={handleMicUp} className="flex-shrink-0 font-space-mono text-[10px] text-white/40 border border-white/20 rounded-lg px-2.5 py-1">send</button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="flex items-center gap-2 bg-gray-900 rounded-2xl px-3 py-2">
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setCameraOpen(true)}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Camera size={18} />
              </motion.button>
              <motion.button whileTap={{ scale: 0.85 }} onClick={() => photoInputRef.current?.click()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Image size={18} />
              </motion.button>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                placeholder="tell me what's on your mind…"
                disabled={isProcessing}
                className="flex-1 bg-transparent text-white placeholder-gray-500 font-space-mono text-sm outline-none"
              />
              {inputText.trim() ? (
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleSend} disabled={isProcessing}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white disabled:opacity-40">
                  <ArrowElbowDownLeft size={18} weight="bold" />
                </motion.button>
              ) : (
                <motion.button whileTap={{ scale: 0.85 }} onPointerDown={handleMicDown} onPointerUp={handleMicUp}
                  disabled={!hasSpeechAPI}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white touch-none select-none disabled:opacity-30">
                  <Microphone size={18} />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />

      {cameraOpen && createPortal(
        <AnimatePresence>
          <CameraCapture
            onCapture={(dataUrl, base64, mimeType) => { setCameraOpen(false); startScan(dataUrl, base64, mimeType); }}
            onClose={() => setCameraOpen(false)}
          />
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
