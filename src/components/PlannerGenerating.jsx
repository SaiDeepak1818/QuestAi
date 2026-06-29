/**
 * PlannerGenerating.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen generation page shown after the user clicks "Generate Planner".
 * Receives live state props from PlannerPage and renders:
 *   • In-app week-done notifications (slide in from top, auto-dismiss)
 *   • Countdown ring (depletes clockwise) with QLabs bolt logo inside
 *   • "Next week" label + estimated time remaining
 *   • Cycling coffee/patience quotes
 *   • "Wanna play a game?" button → iframe modal (Neon Clash Arcade)
 *   • Scrollable per-week generation log
 *   • After completion: Download QC PDF + View Planner buttons
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, AlertCircle, Loader2, Clock, Zap, Download,
  ArrowRight, Gamepad2, X, ChevronDown, ChevronUp, StopCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Quotes cycling during wait ────────────────────────────────────────────────
const QUOTES = [
  { text: 'Go brew yourself a coffee ☕', sub: 'You deserve a break while the AI works' },
  { text: 'Quality content takes time ✨',    sub: 'Each minute = one week of brilliant questions' },
  { text: 'The AI is thinking really hard',   sub: 'Crafting scenario-based problems for your students' },
  { text: 'DSA problems don\'t solve themselves', sub: 'Luckily, we do that part for you' },
  { text: 'Patience loads the best content', sub: 'Your students will thank you for this' },
  { text: 'Week by week, building something amazing 🚀', sub: 'Sit back and watch it come together' },
  { text: 'Meanwhile… close your eyes', sub: 'Imagine students solving the perfect problem set' },
  { text: 'The best curriculum is worth waiting for', sub: 'Real-world scenarios, four language solutions, test cases' },
  { text: 'Grab some water, stretch a bit 💧', sub: 'Healthy developer = better code reviews' },
  { text: 'Every second = better questions', sub: 'The token bucket is filling up again…' },
  { text: 'Your content planner is coming to life 📚', sub: 'AI + your Excel = magic' },
  { text: 'Almost there… keep the faith ⚡', sub: 'One week at a time, one minute at a time' },
];

// ── QLabs bolt path (from QLoader.jsx, viewBox 0 0 128 210) ──────────────────
const BOLT_PATH = 'M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z';

// ── Ring constants ────────────────────────────────────────────────────────────
const RING_R   = 68;   // radius of the countdown arc
const RING_CX  = 100;  // center x in 200×200 viewBox
const RING_CY  = 100;  // center y
const RING_CIRC = 2 * Math.PI * RING_R;

// ── Week-done notification ────────────────────────────────────────────────────
function WeekNotification({ n, topic }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{   opacity: 0, y: -20, scale: 0.94  }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel border border-emerald-500/25 shadow-xl shadow-emerald-500/10"
    >
      <div className="w-7 h-7 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
        <Check size={14} className="text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest font-mono">
          Week {n} done!
        </p>
        <p className="text-[10px] text-foreground/40 font-mono truncate">{topic}</p>
      </div>
    </motion.div>
  );
}

// ── Provider-failover notification ────────────────────────────────────────────
function FailoverNotification({ from, to }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0,   scale: 1    }}
      exit={{   opacity: 0, y: -20, scale: 0.94  }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel border border-amber-500/30 shadow-xl shadow-amber-500/10"
    >
      <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <Zap size={14} className="text-amber-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-amber-400 uppercase tracking-widest font-mono">
          Provider switched!
        </p>
        <p className="text-[10px] text-foreground/40 font-mono">
          {from} limit reached → now using {to}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PlannerGenerating({
  courseName,
  track,
  genLog       = [],   // [{ n, topic, status }]
  genProgress  = { current: 0, total: 0 },
  isRLWait     = false,
  rlSecsLeft   = 0,
  rlSecsTotal  = 62,
  rlNextLabel  = '',
  isGenerating  = true,
  qcPdf         = null,   // { blob, filename } | null
  partialWeeks  = [],     // weeks completed so far (for live preview)
  onStop,                 // user pressed Stop Generation
  onViewPlanner,
  onBack,
}) {
  // ── Local state ──────────────────────────────────────────────────────────────
  const [notifications,  setNotifications]  = useState([]);
  const [quoteIdx,       setQuoteIdx]       = useState(0);
  const [quoteVisible,   setQuoteVisible]   = useState(true);
  const [gameOpen,       setGameOpen]       = useState(false);
  const [logExpanded,    setLogExpanded]    = useState(true);

  const prevDoneRef = useRef(0);
  const notifId     = useRef(0);

  // ── Watch for newly-completed weeks + provider failover → push notifications ─
  useEffect(() => {
    const done = genLog.filter(l => l.status === 'done');
    if (done.length > prevDoneRef.current) {
      const newest = done[done.length - 1];

      // Week-done notification
      const id = ++notifId.current;
      setNotifications(prev => [...prev.slice(-2), { id, type: 'week', n: newest.n, topic: newest.topic }]);
      setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 4000);

      // Provider-switched notification (shows alongside, lasts longer)
      if (newest.switchedFrom) {
        const fid = ++notifId.current;
        setNotifications(prev => [
          ...prev.slice(-2),
          { id: fid, type: 'failover', from: newest.switchedFrom, to: newest.providerUsed }
        ]);
        setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== fid)); }, 6000);
      }

      prevDoneRef.current = done.length;
    }
  }, [genLog]);

  // ── Cycle quotes every 5 seconds (fade out → swap → fade in) ────────────────
  useEffect(() => {
    const cycle = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(cycle);
  }, []);

  // ── ESC to close game ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setGameOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────────
  const doneCount  = genLog.filter(l => l.status === 'done').length;
  const errorCount = genLog.filter(l => l.status === 'error').length;
  const allDone    = !isGenerating;
  const progress   = genProgress.total ? genProgress.current / genProgress.total : 0;
  const minsLeft   = Math.max(0, genProgress.total - genProgress.current);

  // Ring: starts full, depletes clockwise as countdown progresses
  // strokeDashoffset = CIRC × (secsLeft / secsTotal) → full at start, 0 at end
  const ringOffset = rlSecsTotal > 0
    ? RING_CIRC * (rlSecsLeft / rlSecsTotal)
    : (isRLWait ? 0 : RING_CIRC);

  const quote = QUOTES[quoteIdx];

  // ── Download QC PDF ──────────────────────────────────────────────────────────
  const handleDownloadQC = () => {
    if (!qcPdf) return;
    const url = URL.createObjectURL(qcPdf.blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = qcPdf.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col">

      {/* ── Notification stack (top-center) ────────────────────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n =>
            n.type === 'failover'
              ? <FailoverNotification key={n.id} from={n.from} to={n.to} />
              : <WeekNotification     key={n.id} n={n.n} topic={n.topic} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Main scrollable content ─────────────────────────────────────────── */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-3">
            <Zap size={11} className="text-brand-primary" />
            <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest font-mono">
              {allDone ? 'Generation Complete' : 'Generating Content'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-foreground">{courseName}</h2>
          <p className="text-[10px] text-foreground/30 font-mono uppercase tracking-widest">{track}</p>
        </div>

        {/* Overall progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-black text-foreground/30 font-mono uppercase">
            <span>
              {allDone
                ? `${doneCount} done · ${errorCount} failed`
                : isRLWait
                  ? 'Rate limit cooldown…'
                  : `Generating week ${genProgress.current}…`}
            </span>
            <span>{genProgress.current}/{genProgress.total}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-primary rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
          {!allDone && minsLeft > 0 && (
            <p className="text-[9px] text-foreground/20 font-mono text-right">
              ~{minsLeft} min remaining
            </p>
          )}
        </div>

        {/* ── Countdown Ring (shown during rate-limit wait OR while generating) */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <svg
              viewBox="0 0 200 200"
              className="w-52 h-52 drop-shadow-2xl"
              style={{ filter: 'drop-shadow(0 0 20px rgba(37,99,235,0.3))' }}
            >
              {/* Outer decorative ring */}
              <circle cx={RING_CX} cy={RING_CY} r={RING_R + 14}
                fill="none" stroke="rgba(37,99,235,0.06)" strokeWidth="1" />

              {/* Background track */}
              <circle cx={RING_CX} cy={RING_CY} r={RING_R}
                fill="rgba(7,3,19,0.8)"
                stroke="rgba(255,255,255,0.04)" strokeWidth="12" />

              {/* Active arc — starts full, depletes clockwise */}
              <circle
                cx={RING_CX} cy={RING_CY} r={RING_R}
                fill="none"
                stroke={allDone ? '#22c55e' : '#2563eb'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={allDone ? 0 : ringOffset}
                transform={`rotate(-90 ${RING_CX} ${RING_CY})`}
                style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.5s ease' }}
              />

              {/* Tick marks (every 6 seconds = every 10°) */}
              {Array.from({ length: 12 }, (_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const r1 = RING_R + 18; const r2 = RING_R + 22;
                return (
                  <line key={i}
                    x1={RING_CX + r1 * Math.cos(angle)} y1={RING_CY + r1 * Math.sin(angle)}
                    x2={RING_CX + r2 * Math.cos(angle)} y2={RING_CY + r2 * Math.sin(angle)}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* QLabs bolt logo + countdown label (centered in ring via absolute) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              {/* QLabs bolt */}
              <svg viewBox="0 0 128 210" className="w-8 h-12 mb-1"
                style={{ filter: `drop-shadow(0 0 8px ${allDone ? '#22c55e' : '#2563eb'})` }}>
                <path d={BOLT_PATH}
                  fill={allDone ? '#22c55e' : '#2563eb'}
                  opacity="0.25"
                />
                <path d={BOLT_PATH}
                  fill="none"
                  stroke={allDone ? '#22c55e' : '#2563eb'}
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Countdown seconds OR done checkmark */}
              {allDone ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Check size={18} className="text-emerald-400" />
                </div>
              ) : isRLWait ? (
                <>
                  <span className="text-3xl font-black text-foreground leading-none tabular-nums">
                    {rlSecsLeft}
                  </span>
                  <span className="text-[8px] text-foreground/30 font-mono uppercase tracking-wider">seconds</span>
                </>
              ) : (
                <Loader2 size={22} className="animate-spin text-brand-primary" />
              )}
            </div>
          </div>

          {/* Label below ring */}
          <AnimatePresence mode="wait">
            {allDone ? (
              <motion.p key="done"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm font-black text-emerald-400 text-center">
                All {genProgress.total} weeks generated! 🎉
              </motion.p>
            ) : isRLWait ? (
              <motion.div key="wait"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center space-y-0.5">
                <p className="text-[9px] text-brand-primary/60 font-mono uppercase tracking-widest">
                  Token cooldown · next up
                </p>
                <p className="text-sm font-black text-foreground">{rlNextLabel}</p>
              </motion.div>
            ) : (
              <motion.p key="gen"
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-sm font-black text-foreground/60 text-center">
                {genProgress.weekName || 'Preparing…'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* ── Quotes (shown when waiting OR always) ────────────────────────── */}
        <div className="h-16 flex flex-col items-center justify-center">
          <motion.div
            animate={{ opacity: quoteVisible ? 1 : 0, y: quoteVisible ? 0 : 4 }}
            transition={{ duration: 0.35 }}
            className="text-center space-y-1 px-4"
          >
            <p className="text-sm font-black text-foreground/70">{quote.text}</p>
            <p className="text-[9px] text-foreground/25 font-mono">{quote.sub}</p>
          </motion.div>
        </div>

        {/* ── Game button ───────────────────────────────────────────────────── */}
        {!allDone && (
          <div className="flex justify-center">
            <button
              onClick={() => setGameOpen(true)}
              className="group flex items-center gap-3 px-5 py-3 rounded-2xl glass-panel border border-white/10 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                <Gamepad2 size={15} className="text-brand-primary" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-foreground uppercase tracking-wider">Wanna play a game?</p>
                <p className="text-[8px] text-foreground/30 font-mono">Neon Clash Arcade · while you wait</p>
              </div>
              <ArrowRight size={14} className="text-foreground/20 group-hover:text-brand-primary transition-colors ml-1" />
            </button>
          </div>
        )}

        {/* ── Stop Generation button (visible while generating) ─────────────── */}
        <AnimatePresence>
          {isGenerating && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={onStop}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/50 text-red-400 font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
            >
              <StopCircle size={16} />
              Stop &amp; Save Progress
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── QC PDF + View Planner (after done) ───────────────────────────── */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {/* QC download */}
              {qcPdf && (
                <button
                  onClick={handleDownloadQC}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl glass-panel border border-brand-primary/25 hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                    <Download size={14} className="text-brand-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-foreground uppercase tracking-wider">
                      Download QC Alignment Report
                    </p>
                    <p className="text-[8px] text-foreground/30 font-mono">
                      Coverage · difficulty · completeness · per-week breakdown
                    </p>
                  </div>
                </button>
              )}

              {/* View Planner */}
              <button
                onClick={onViewPlanner}
                className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-brand-primary/20 cursor-pointer"
              >
                <Check size={16} />
                View Generated Planner
                <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Per-week log (collapsible) ────────────────────────────────────── */}
        <div className="glass-card rounded-3xl border border-white/5 overflow-hidden">
          <button
            onClick={() => setLogExpanded(p => !p)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-foreground/30 uppercase tracking-widest font-mono">
                Week Log
              </span>
              <span className="text-[9px] text-foreground/20 font-mono">
                {doneCount} ✓ · {errorCount} ✗ · {genLog.filter(l=>l.status==='generating').length} active
              </span>
            </div>
            {logExpanded
              ? <ChevronUp size={14} className="text-foreground/30" />
              : <ChevronDown size={14} className="text-foreground/30" />
            }
          </button>

          <AnimatePresence>
            {logExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-1.5 max-h-60 overflow-y-auto">
                  {genLog.map(l => (
                    <div key={l.n}
                      className={cn(
                        'flex items-center gap-2.5 py-1.5 px-3 rounded-xl transition-colors',
                        l.status === 'generating' && 'bg-brand-primary/5 border border-brand-primary/10',
                        l.status === 'done'       && 'opacity-70',
                        l.status === 'error'      && 'bg-red-500/5 border border-red-500/10',
                      )}
                    >
                      {l.status === 'done'       && <Check       size={12} className="text-emerald-400 shrink-0" />}
                      {l.status === 'error'      && <AlertCircle size={12} className="text-red-400 shrink-0" />}
                      {l.status === 'generating' && <Loader2     size={12} className="animate-spin text-brand-primary shrink-0" />}
                      {l.status === 'queued'     && <Clock       size={12} className="text-foreground/20 shrink-0" />}
                      <span className={cn(
                        'text-[10px] font-mono flex-1 truncate',
                        l.status === 'done'       && 'text-foreground/50',
                        l.status === 'error'      && 'text-red-400/70',
                        l.status === 'generating' && 'text-brand-primary font-bold',
                        l.status === 'queued'     && 'text-foreground/20',
                      )}>
                        W{l.n}: {l.topic}
                      </span>
                      {/* Provider badge + failover indicator */}
                      {l.status === 'done' && l.providerUsed && (
                        <span className={cn(
                          'text-[7px] font-black uppercase font-mono px-1.5 py-0.5 rounded-md shrink-0',
                          l.switchedFrom
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-400/60'
                        )}>
                          {l.switchedFrom ? '⚡ ' : ''}{l.providerUsed}
                        </span>
                      )}
                      {l.status === 'done' && !l.providerUsed && (
                        <span className="text-[8px] text-emerald-400/50 font-mono shrink-0">✓</span>
                      )}
                    </div>
                  ))}
                  {/* Queued future weeks (not yet in genLog) */}
                  {isGenerating && genLog.length < genProgress.total && (
                    <p className="text-[9px] text-foreground/15 font-mono px-3 pt-1">
                      + {genProgress.total - genLog.length} weeks queued…
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Partial content preview (live as each week completes) ────────── */}
        <AnimatePresence>
          {partialWeeks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl border border-white/5 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest font-mono">
                  Generated So Far · {partialWeeks.length} week{partialWeeks.length !== 1 ? 's' : ''} ready
                </p>
              </div>
              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                {partialWeeks.map((wk, idx) => {
                  const sbQ  = wk.skillBuilder?.questions?.length  || 0;
                  const pahQ = wk.practiceAtHome?.questions?.length || 0;
                  const cyQ  = wk.challengeYourself?.questions?.length || 0;
                  const total = sbQ + pahQ + cyQ;
                  return (
                    <div key={idx} className="flex items-center gap-4 px-5 py-3">
                      <div className="w-6 h-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Check size={11} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-foreground truncate">
                          Week {wk.weekNumber}: {wk.topic}
                        </p>
                        <p className="text-[8px] text-foreground/30 font-mono mt-0.5">
                          {sbQ} SB · {pahQ} PAH · {cyQ} CY · {total} total
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Game Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {gameOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{   scale: 0.92, opacity: 0, y: 20  }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              className="relative w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setGameOpen(false)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all cursor-pointer backdrop-blur-sm"
              >
                <X size={16} />
              </button>

              {/* Game iframe */}
              <iframe
                src="/games/neon-clash-arcade.html"
                title="Neon Clash Arcade"
                allow="autoplay"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
