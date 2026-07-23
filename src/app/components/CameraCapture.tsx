import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowsClockwise } from '@phosphor-icons/react';

interface Props {
  onCapture: (dataUrl: string, base64: string, mimeType: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = async (facing: 'environment' | 'user') => {
    // Stop existing stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    setReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setReady(true);
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions and try again.");
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, [facingMode]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || !ready) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const mimeType = 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, 0.92);
    const base64 = dataUrl.split(',')[1];

    // Brief delay so flash is visible before closing
    setTimeout(() => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCapture(dataUrl, base64, mimeType);
    }, 220);
  };

  const flip = () => setFacingMode(f => f === 'environment' ? 'user' : 'environment');

  return (
    <motion.div
      className="fixed inset-0 z-[10020] bg-black flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Flash overlay */}
        <AnimatePresence>
          {flash && (
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Corner brackets */}
        {ready && (
          <>
            {[['top-8 left-8', 'border-t-2 border-l-2'], ['top-8 right-8', 'border-t-2 border-r-2'],
              ['bottom-8 left-8', 'border-b-2 border-l-2'], ['bottom-8 right-8', 'border-b-2 border-r-2']
            ].map(([pos, border], i) => (
              <div key={i} className={`absolute w-7 h-7 border-white/70 ${pos} ${border}`} />
            ))}
            <p className="absolute bottom-6 left-0 right-0 text-center font-space-mono text-[10px] text-white/50 tracking-widest">
              tap to scan
            </p>
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="font-space-mono text-sm text-white/70">{error}</p>
          </div>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black px-8 pb-10 pt-6 flex items-center justify-between"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>

        {/* Close */}
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.88 }}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
        >
          <X size={20} weight="bold" />
        </motion.button>

        {/* Shutter */}
        <motion.button
          onClick={capture}
          whileTap={{ scale: 0.9 }}
          disabled={!ready}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30"
        >
          <div className="w-14 h-14 rounded-full bg-white" />
        </motion.button>

        {/* Flip camera */}
        <motion.button
          onClick={flip}
          whileTap={{ scale: 0.88 }}
          className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white"
        >
          <ArrowsClockwise size={20} />
        </motion.button>
      </div>
    </motion.div>
  );
}
