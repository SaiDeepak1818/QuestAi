import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Info,
  BrainCircuit,
  User,
  ArrowRight,
  TrendingUp,
  Edit2,
  Save,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';

export function MCQCard({ mcq, index }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(mcq.question);
  const [editedOptions, setEditedOptions] = useState([...(mcq.options || [])]);
  const [editedExplanation, setEditedExplanation] = useState(mcq.explanation);
  const [editedRecommendedFor, setEditedRecommendedFor] = useState(mcq.recommendedFor);
  const [isCopyingMcq, setIsCopyingMcq] = useState(false);

  const handleOptionChange = (idx, value) => {
    const updated = [...editedOptions];
    updated[idx] = value;
    setEditedOptions(updated);
  };

  const copyMcqDetails = () => {
    let textToCopy = `Question: ${editedQuestion}\n\n`;
    editedOptions.forEach((option, idx) => {
      textToCopy += `${String.fromCharCode(65 + idx)}) ${option}\n`;
    });
    textToCopy += `\nCorrect Answer: ${String.fromCharCode(65 + mcq.correctAnswer)}\n`;
    textToCopy += `\nRecommended For: ${editedRecommendedFor}\n`;
    textToCopy += `\nExplanation:\n${editedExplanation}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopyingMcq(true);
    setTimeout(() => setIsCopyingMcq(false), 2000);
  };

  const isCorrect = selectedOption === mcq.correctAnswer;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={cn(
        "glass-card rounded-[40px] p-10 transition-all duration-500 relative overflow-hidden group border border-white/5",
        selectedOption !== null && (isCorrect ? "shadow-[0_0_40px_rgba(16,185,129,0.15)] ring-1 ring-brand-accent/30" : "shadow-[0_0_40px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30")
      )}
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:rotate-45 group-hover:scale-150 transition-transform duration-1000">
         <BrainCircuit size={160} className="text-brand-primary" />
      </div>

      <div className="relative z-10">
        {/* Company context banner for DB case-study MCQs */}
        {mcq.companyContext && (
          <div className="mb-6 px-4 py-2 rounded-2xl bg-blue-500/8 border border-blue-500/15 flex items-center gap-3">
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 font-mono">Case Study</span>
            <span className="text-[10px] font-black text-blue-300">{mcq.companyContext.name}</span>
            <span className="text-[9px] text-blue-400/60 font-mono">·</span>
            <span className="text-[9px] text-blue-400/70 font-mono">{mcq.companyContext.industry}</span>
            {mcq.concept && (
              <span className="ml-auto text-[8px] bg-brand-primary/20 text-brand-primary border border-brand-primary/20 px-2 py-0.5 rounded-lg font-mono uppercase tracking-widest">
                {mcq.concept}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-black text-brand-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                {index + 1}
              </div>
              <div className="flex gap-2">
                <span className="text-[9px] font-black tracking-[0.2em] px-4 py-1.5 rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase">
                  Assessment
                </span>
                <span className="glass-panel text-brand-cyan text-[9px] font-black px-4 py-1.5 rounded-xl border border-brand-cyan/20 uppercase tracking-widest flex items-center gap-2">
                   <TrendingUp size={12}/> Logic Level 4
                </span>
              </div>
           </div>

           <div className="flex items-center gap-2.5 relative z-20">
             <button
               onClick={() => setIsEditing(!isEditing)}
               className={cn(
                 "p-3 rounded-xl border transition-all text-[10px] font-black uppercase flex items-center gap-2",
                 isEditing 
                   ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                   : "bg-black/[0.02] dark:bg-white/5 border-black/[0.05] dark:border-white/5 text-foreground/60 dark:text-white/40 hover:text-foreground dark:hover:text-white"
               )}
             >
               {isEditing ? <Save size={13}/> : <Edit2 size={13}/>}
               <span className="hidden sm:inline">{isEditing ? "Save" : "Edit"}</span>
             </button>
             
             <button
               onClick={copyMcqDetails}
               className="p-3 rounded-xl border bg-black/[0.02] dark:bg-white/5 border-black/[0.05] dark:border-white/5 text-foreground/60 dark:text-white/40 hover:text-foreground dark:hover:text-white transition-all text-[10px] font-black uppercase flex items-center gap-2"
             >
               {isCopyingMcq ? <Check size={13} className="text-emerald-500"/> : <Copy size={13}/>}
               <span className="hidden sm:inline">{isCopyingMcq ? "Copied" : "Copy"}</span>
             </button>
           </div>
        </div>

        {/* Scenario / business context for DB MCQs */}
        {mcq.scenario && (
          <div className="mb-8 p-5 rounded-[24px] glass-panel bg-brand-primary/5 border border-brand-primary/10">
            <div className="flex items-center gap-2 mb-3 text-brand-primary opacity-70">
              <Info size={13}/>
              <span className="text-[9px] font-black uppercase tracking-widest">Business Context</span>
            </div>
            <p className="text-xs text-foreground/50 leading-relaxed font-medium whitespace-pre-wrap">
              {mcq.scenario}
            </p>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-2 mb-10">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Edit Assessment Question</label>
            <textarea
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              rows={3}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-brand-primary/50 focus:bg-black/10 dark:focus:bg-white/10 transition-all text-xl font-display font-medium text-foreground dark:text-white font-sans resize-y animate-in fade-in duration-300"
            />
          </div>
        ) : (
          <h3 className="text-2xl lg:text-3xl font-display font-bold leading-tight mb-12 text-foreground tracking-tightest">
            {editedQuestion}
          </h3>
        )}

        <div className="space-y-4">
          {mcq.options?.map((option, optIdx) => {
            const isOptionSelected = selectedOption === optIdx;
            const isOptionCorrect = mcq.correctAnswer === optIdx;
            
            let stateStyle = "glass-panel bg-white/5 text-foreground/60 border-white/5 hover:bg-white/10 hover:text-foreground hover:scale-[1.01] hover:translate-x-2";
            
            if (selectedOption !== null) {
              if (isOptionCorrect) stateStyle = "bg-brand-accent/20 border-brand-accent/40 text-brand-accent shadow-[0_0_20px_rgba(16,185,129,0.2)]";
              else if (isOptionSelected) stateStyle = "bg-red-500/20 border-red-500/40 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
              else stateStyle = "opacity-20 grayscale pointer-events-none scale-95";
            }

            const indicators = [
              "bg-indigo-600/20 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.1)]",
              "bg-brand-violet/20 text-brand-violet border-brand-violet/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]",
              "bg-brand-primary/20 text-brand-primary border-brand-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
              "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
            ];

            return (
              <button
                key={optIdx}
                disabled={selectedOption !== null || isEditing}
                onClick={() => setSelectedOption(optIdx)}
                className={cn(
                  "w-full text-left p-6 lg:p-7 rounded-[28px] border transition-all duration-500 flex items-center justify-between group/opt font-bold relative overflow-hidden",
                  stateStyle
                )}
              >
                <div className="flex items-center gap-6 relative z-10 w-full">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black border transition-all",
                    isOptionSelected 
                    ? (isOptionCorrect ? "bg-brand-accent text-white border-brand-accent" : "bg-red-500 text-white border-red-500") 
                    : (indicators[optIdx] || "bg-white/5 border-white/10 group-hover/opt:border-brand-primary/50")
                  )}>
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedOptions[optIdx]}
                      onChange={(e) => handleOptionChange(optIdx, e.target.value)}
                      className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 rounded-xl outline-none focus:border-brand-primary/50 text-base font-medium text-foreground dark:text-white font-sans"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-lg tracking-tight font-medium flex-1">{editedOptions[optIdx]}</span>
                  )}
                </div>
                {selectedOption !== null && isOptionCorrect && (
                  <CheckCircle2 size={24} className="text-brand-accent shrink-0 relative z-10 ml-4 animate-in zoom-in spin-in-12 duration-500" />
                )}
                {selectedOption !== null && isOptionSelected && !isOptionCorrect && (
                  <XCircle size={24} className="text-red-500 shrink-0 relative z-10 ml-4 animate-in zoom-in spin-in-12 duration-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-12 flex items-center justify-between pt-10 border-t border-white/5">
           <div className="space-y-1 flex-1 mr-4">
              <span className="text-[10px] font-black uppercase text-foreground/20 tracking-[0.3em] block">Integration Layer</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedRecommendedFor}
                  onChange={(e) => setEditedRecommendedFor(e.target.value)}
                  className="w-full max-w-sm mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1 rounded-xl outline-none focus:border-brand-primary/50 text-xs font-black text-brand-primary uppercase tracking-widest font-sans"
                />
              ) : (
                <span className="text-xs font-black text-brand-primary uppercase tracking-widest flex items-center gap-2 mt-1">
                  <BrainCircuit size={14}/> {editedRecommendedFor}
                </span>
              )}
           </div>
          
          <AnimatePresence>
            {selectedOption !== null && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0, x: 20 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                onClick={() => setShowExplanation(!showExplanation)}
                className="px-6 py-3 rounded-2xl glass-panel text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary flex items-center gap-2 hover:bg-white/10 transition-all border border-brand-primary/20"
              >
                {showExplanation ? 'Lock Proof' : 'Verify Logic'} <ArrowRight size={14}/>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {((selectedOption !== null && showExplanation) || isEditing) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 overflow-hidden"
            >
              <div className="p-6 rounded-[24px] glass-panel bg-brand-primary/5 border border-brand-primary/10 relative">
                <div className="flex items-center gap-2 mb-3 text-brand-primary opacity-60">
                  <Info size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Neural Breakdown</span>
                </div>
                {isEditing ? (
                  <div className="space-y-1.5 w-full">
                    <textarea
                      value={editedExplanation}
                      onChange={(e) => setEditedExplanation(e.target.value)}
                      rows={4}
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 rounded-xl outline-none focus:border-brand-primary/50 text-xs font-medium text-foreground dark:text-white font-sans resize-y custom-scrollbar"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                    {editedExplanation}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
