import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, BookOpen, Brain, Trophy, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { CodingCard } from './CodingCard';


const SECTION_CONFIG = {
  skillBuilder: {
    label: 'Skill Builder',
    Icon: BookOpen,
    desc: 'Foundation-level · Easy',
    colors: { border: 'border-emerald-500/15', bg: 'bg-emerald-500/5', icon: 'bg-emerald-500/15 text-emerald-400', label: 'text-emerald-400', dot: 'bg-emerald-500' }
  },
  practiceAtHome: {
    label: 'Practice at Home',
    Icon: Brain,
    desc: 'Reinforcement · Medium',
    colors: { border: 'border-blue-500/15', bg: 'bg-blue-500/5', icon: 'bg-blue-500/15 text-blue-400', label: 'text-blue-400', dot: 'bg-blue-500' }
  },
  challengeYourself: {
    label: 'Challenge Yourself',
    Icon: Trophy,
    desc: 'Mastery test · Hard',
    colors: { border: 'border-red-500/15', bg: 'bg-red-500/5', icon: 'bg-red-500/15 text-red-400', label: 'text-red-400', dot: 'bg-red-500' }
  }
};

function SectionCard({ sectionKey, questions = [] }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SECTION_CONFIG[sectionKey];
  if (!cfg) return null;
  const { colors } = cfg;

  return (
    <div className={cn('rounded-3xl border overflow-hidden glass-panel', colors.border)}>
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-2xl flex items-center justify-center shrink-0', colors.icon)}>
            <cfg.Icon size={16} />
          </div>
          <div className="text-left">
            <p className={cn('text-[11px] font-black uppercase tracking-widest', colors.label)}>{cfg.label}</p>
            <p className="text-[9px] text-foreground/30 font-mono mt-0.5">{cfg.desc} · {questions.length} question{questions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {questions.length > 0 && (
            <div className="flex gap-1">
              {questions.slice(0, 6).map((_, i) => (
                <div key={i} className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
              ))}
            </div>
          )}
          {expanded ? <ChevronUp size={15} className="text-foreground/30" /> : <ChevronDown size={15} className="text-foreground/30" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn('px-5 pb-5 space-y-3 border-t border-white/5 pt-4', colors.bg)}>
              {questions.length === 0 ? (
                <p className="text-[10px] text-foreground/20 italic font-mono py-3 text-center">No questions generated for this section.</p>
              ) : (
                questions.map((q, i) => (
                  <CodingCard key={q.id || `${sectionKey}-${i}`} question={q} index={i} images={[]} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WeekCard({ week, defaultOpen = false }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const totalQ = ['skillBuilder', 'practiceAtHome', 'challengeYourself']
    .reduce((s, k) => s + (week[k]?.questions?.length || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl border border-white/5 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex flex-col items-center justify-center shrink-0">
            <span className="text-[8px] font-black text-brand-primary/50 uppercase tracking-wider">WK</span>
            <span className="text-xl font-black text-brand-primary leading-none">{week.weekNumber}</span>
          </div>
          <div className="text-left min-w-0">
            <p className="text-lg font-black text-foreground leading-tight">{week.topic || `Week ${week.weekNumber}`}</p>
            {week.subtopics?.length > 0 && (
              <p className="text-[9px] text-foreground/30 font-mono mt-1">
                {week.subtopics.slice(0, 5).join(' · ')}{week.subtopics.length > 5 ? ' …' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-lg font-black text-foreground">{totalQ}</p>
            <p className="text-[8px] text-foreground/20 font-mono uppercase">questions</p>
          </div>
          {week.error && <span className="text-[9px] text-red-400 font-mono">⚠ error</span>}
          {expanded ? <ChevronUp size={18} className="text-foreground/30" /> : <ChevronDown size={18} className="text-foreground/30" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-4 space-y-3 border-t border-white/5">
              <SectionCard sectionKey="skillBuilder"      questions={week.skillBuilder?.questions      || []} />
              <SectionCard sectionKey="practiceAtHome"    questions={week.practiceAtHome?.questions    || []} />
              <SectionCard sectionKey="challengeYourself" questions={week.challengeYourself?.questions || []} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PlannerView({ planner, onBack }) {
  const weeksCount = planner.weeks?.length || 0;
  const totalQ = (planner.weeks || []).reduce((s, w) =>
    s + ['skillBuilder', 'practiceAtHome', 'challengeYourself']
      .reduce((a, k) => a + (w[k]?.questions?.length || 0), 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <button
          onClick={onBack}
          className="mt-1 p-2.5 rounded-2xl glass-panel border border-white/10 text-foreground/50 hover:text-foreground transition-all shrink-0 cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black text-foreground">{planner.courseName}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary font-mono bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-lg">
              {planner.track || 'Problem Solving'}
            </span>
            <span className="text-[10px] text-foreground/30 font-mono">{weeksCount} weeks · {totalQ} questions</span>
            {planner.createdAt && (
              <span className="text-[10px] text-foreground/20 font-mono">
                {new Date(planner.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(planner.weeks || []).map((week, i) => (
          <WeekCard key={week.weekNumber ?? i} week={week} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
