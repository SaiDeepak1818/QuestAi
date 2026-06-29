import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Code2, 
  Terminal, 
  CheckCircle2, 
  Cpu,
  Copy,
  Check,
  Play,
  HelpCircle,
  LogIn,
  LogOut,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code,
  ArrowRight,
  Edit2,
  Save
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

export function CodingCard({ question, index, images = [] }) {
  // Detect DB question: has solutions.sql field OR has questionNumber (connected series)
  const isDbQuestion = Boolean(question.solutions?.sql !== undefined && !question.solutions?.python);
  const [selectedLanguage, setSelectedLanguage] = useState(isDbQuestion ? 'sql' : 'python');
  const [showCode, setShowCode] = useState(false);
  const [showTestCases, setShowTestCases] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(question.title);
  const [editedDescription, setEditedDescription] = useState(question.description);
  const [isCopyingQuestion, setIsCopyingQuestion] = useState(false);

  // References to auto scroll parts
  const editSectionRef = useRef(null);
  const testCasesSectionRef = useRef(null);
  const codeSectionRef = useRef(null);

  // Auto-scroll side-effects on stage/toggle change
  useEffect(() => {
    if (isEditing && editSectionRef.current) {
      setTimeout(() => {
        editSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isEditing]);

  useEffect(() => {
    if (showTestCases && testCasesSectionRef.current) {
      setTimeout(() => {
        testCasesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    }
  }, [showTestCases]);

  useEffect(() => {
    if (showCode && codeSectionRef.current) {
      setTimeout(() => {
        codeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
    }
  }, [showCode]);

  const copyQuestionDetails = () => {
    const textToCopy = `Title: ${editedTitle}\n\nDifficulty: ${question.difficulty}\n\nDescription:\n${editedDescription}`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopyingQuestion(true);
    setTimeout(() => setIsCopyingQuestion(false), 2000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(question.solutions[selectedLanguage] || '');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  useEffect(() => {
    setSelectedLanguage('python');
  }, []);

  const simulateRun = () => {
    setIsRunning(true);
    setTestResults(null);
    setShowTestCases(true); // Auto-open verification suite layout
    setTimeout(() => {
      setIsRunning(false);
      setTestResults({ 
        passed: 15, 
        total: 15, 
        results: Array(15).fill(true) 
      });
    }, 2000);
  };

  // Render description: replace [IMAGE:N] markers with actual uploaded images
  const renderDescription = (text) => {
    if (!text) return null;
    if (!images?.length || !text.includes('[IMAGE:')) {
      return <ReactMarkdown>{text}</ReactMarkdown>;
    }
    const parts = text.split(/(\[IMAGE:\d+\])/);
    return (
      <div className="space-y-3">
        {parts.map((part, i) => {
          const m = part.match(/^\[IMAGE:(\d+)\]$/);
          if (m) {
            const img = images[parseInt(m[1])];
            if (!img) return null;
            return (
              <div key={i} className="my-4 text-center">
                <img
                  src={img.dataUrl}
                  alt={img.label || `Diagram ${parseInt(m[1]) + 1}`}
                  className="max-w-full rounded-2xl border border-white/10 mx-auto"
                />
                {img.label && (
                  <p className="text-[9px] text-foreground/40 mt-1.5 font-mono uppercase tracking-widest">
                    {img.label}
                  </p>
                )}
              </div>
            );
          }
          return part ? <ReactMarkdown key={i}>{part}</ReactMarkdown> : null;
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card rounded-[40px] overflow-hidden group border border-white/5 relative"
    >
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
         <Code2 size={180} />
      </div>

      <div className="p-10 relative z-10">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Content Pane */}
          <div className="flex-1 space-y-8">
            {/* Company context banner for DB case-study questions */}
            {question.companyContext && (
              <div className="mb-2 px-4 py-2 rounded-2xl bg-blue-500/8 border border-blue-500/15 flex items-center gap-3">
                <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 font-mono">Case Study</span>
                <span className="text-[10px] font-black text-blue-300">{question.companyContext.name}</span>
                <span className="text-[9px] text-blue-400/60 font-mono">·</span>
                <span className="text-[9px] text-blue-400/70 font-mono">{question.companyContext.industry}</span>
                {question.questionNumber && (
                  <>
                    <span className="text-[9px] text-blue-400/60 font-mono ml-auto">Q{question.questionNumber}</span>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-black text-brand-primary shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                 {index + 1}
               </div>
               <div className="flex gap-2">
                 <span className={cn(
                   "text-[9px] font-black tracking-widest px-4 py-1.5 rounded-xl uppercase border shadow-lg",
                   question.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' : 
                   question.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5' : 
                   'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5'
                 )}>
                   {question.difficulty}
                 </span>
                 {question.leetcodeNumber ? (
                   <span className="bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20 text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest">
                     Leetcode #{question.leetcodeNumber}
                   </span>
                 ) : (
                   <span className="glass-panel text-foreground/40 text-[9px] font-black px-4 py-1.5 rounded-xl border border-white/5 uppercase tracking-widest">
                     Module v1.0
                   </span>
                 )}
               </div>
            </div>

            {isEditing ? (
              <div ref={editSectionRef} className="space-y-6 w-full">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Edit Challenge Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-brand-primary/50 focus:bg-black/10 dark:focus:bg-white/10 transition-all text-xl font-display font-medium text-foreground dark:text-white font-sans"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Edit Challenge Description</label>
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={8}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-brand-primary/50 focus:bg-black/10 dark:focus:bg-white/10 transition-all text-sm font-medium text-foreground dark:text-white resize-y custom-scrollbar font-sans"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-4xl lg:text-5xl font-black tracking-tightest leading-tight transition-all text-foreground dark:text-white">
                  {editedTitle}
                </h2>
                <div className="text-foreground/50 font-medium leading-[1.7] prose prose-invert max-w-none prose-sm">
                  {renderDescription(editedDescription)}
                </div>
              </div>
            )}

            <div className="flex gap-10 pt-8 border-t border-white/5">
               <div className="space-y-1">
                  <span className="text-2xl font-black block">{question.testCases?.length || 0}</span>
                  <span className="text-[10px] font-black uppercase text-foreground/30 tracking-[0.2em]">Test Scenarios</span>
               </div>
               <div className="space-y-1">
                  <span className="text-2xl font-black block">2.4ms</span>
                  <span className="text-[10px] font-black uppercase text-foreground/30 tracking-[0.2em]">Compute Cycle</span>
               </div>
            </div>
          </div>

          {/* Action Pane */}
          <div className="lg:w-80 shrink-0">
            <div className="glass-panel p-8 rounded-[32px] border border-white/10 flex flex-col justify-between h-full relative overflow-hidden group/card">
               <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
               
               <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-8 opacity-60">
                    <Terminal size={16} className="text-brand-primary"/>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Logic Hub</h4>
                  </div>

                  <div className="space-y-3">
                     <button 
                       onClick={simulateRun}
                       disabled={isRunning}
                       className="w-full py-5 rounded-[20px] bg-brand-primary text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:translate-y-[-2px] active:scale-95 transition-all disabled:opacity-50 shadow-2xl shadow-brand-primary/20 relative overflow-hidden group/btn"
                     >
                       <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                       {isRunning ? <RefreshCw className="animate-spin" size={14}/> : <Play size={14} fill="currentColor"/>}
                       Verify Logic
                     </button>
                     <button 
                       onClick={() => setShowCode(!showCode)}
                       className="w-full py-5 rounded-[20px] glass-panel border border-white/5 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all text-foreground/60"
                     >
                       <Code size={14}/> {showCode ? 'Close Source' : 'View Source'}
                     </button>
                     <button 
                       onClick={() => setIsEditing(!isEditing)}
                       className={cn(
                         "w-full py-5 rounded-[20px] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all",
                         isEditing 
                           ? "bg-emerald-500 text-white hover:translate-y-[-2px] shadow-lg shadow-emerald-500/20" 
                           : "glass-panel border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10"
                       )}
                     >
                       {isEditing ? <Save size={14}/> : <Edit2 size={14}/>}
                       {isEditing ? 'Save Question' : 'Edit Question'}
                     </button>
                     <button 
                       onClick={copyQuestionDetails}
                       className="w-full py-5 rounded-[20px] glass-panel border border-white/5 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/5 transition-all text-foreground/60"
                     >
                       {isCopyingQuestion ? <Check size={14} className="text-emerald-500"/> : <Copy size={14}/>}
                       {isCopyingQuestion ? 'Details Copied' : 'Copy Question'}
                     </button>
                  </div>
               </div>

                <div className="mt-12 pt-8 border-t border-white/5 space-y-6 relative z-10">
                  <div className="flex justify-between items-center">
                     <span className="text-[9px] font-black uppercase text-foreground/20 tracking-[0.2em] flex items-center gap-2">
                       <Cpu size={14}/> Health
                     </span>
                     {testResults && (
                       <span className="text-[10px] font-black text-brand-accent uppercase flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         {testResults.passed}/{testResults.total} Passed
                       </span>
                     )}
                  </div>
                  <div className="flex gap-1.5 h-1">
                     {[...Array(15)].map((_, i) => (
                        <div key={i} className={cn(
                          "flex-1 rounded-full transition-all duration-300",
                          isRunning ? "bg-brand-primary/20 animate-pulse" :
                          testResults ? "bg-brand-accent" : "bg-white/5"
                        )} />
                     ))}
                  </div>
                  <button 
                    onClick={() => setShowTestCases(!showTestCases)}
                    className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-brand-primary flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                   >
                     System Details {showTestCases ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Expandable Sections */}
        <AnimatePresence>
          {showTestCases && (
            <motion.div
              ref={testCasesSectionRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-12 pt-12 border-t border-white/5 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-foreground/40">
                  <LayoutDashboard size={16} className="text-brand-primary"/> Logic Verification Suite
                </h3>
                <span className="text-[10px] font-mono opacity-20 uppercase tracking-tighter">Cluster Protocol Alpha-9</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pr-4 overflow-x-hidden">
                {question.testCases?.map((tc, idx) => (
                  <div key={idx} className="p-8 rounded-[32px] glass-panel border border-white/5 space-y-6 relative group/case">
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/case:opacity-10 transition-opacity">
                        <Cpu size={40} />
                     </div>
                     <div className="flex justify-between items-center relative z-10">
                        <span className={cn(
                          "text-[9px] font-black px-3 py-1 rounded-lg uppercase border tracking-widest",
                          tc.isPublic ? "bg-brand-accent/10 text-brand-accent border-brand-accent/20" : "bg-brand-primary/10 text-brand-primary border-brand-primary/20"
                        )}>
                          Scenario 0{idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                           <div className={cn("w-1 h-1 rounded-full", tc.isPublic ? "bg-brand-accent" : "bg-brand-primary")} />
                           <span className="text-[9px] font-bold text-foreground/30 uppercase">{tc.isPublic ? 'Public' : 'Hidden'}</span>
                        </div>
                     </div>
                     <div className="space-y-4 relative z-10">
                        <div className="space-y-1.5">
                           <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">Input Buffer</p>
                           <pre className="text-[11px] bg-white/5 p-4 rounded-xl border border-white/5 font-mono overflow-auto custom-scrollbar">{tc.input}</pre>
                        </div>
                        <div className="space-y-1.5">
                           <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest">Expected Result</p>
                           <pre className="text-[11px] bg-white/10 text-brand-accent p-4 rounded-xl border border-white/5 font-mono overflow-auto custom-scrollbar">{tc.output}</pre>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {showCode && (
            <motion.div
              ref={codeSectionRef}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-12 overflow-hidden"
            >
              <div className="rounded-[40px] border border-white/10 overflow-hidden glass-panel bg-black/40 shadow-2xl backdrop-blur-3xl">
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-white/5">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {(isDbQuestion ? ['sql', 'explanation'] : ['python', 'cpp', 'java', 'c']).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedLanguage(lang)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          selectedLanguage === lang
                            ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
                            : "text-foreground/40 hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {lang === 'cpp' ? 'C++' : lang === 'explanation' ? 'Explanation' : lang}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="w-12 h-12 rounded-2xl glass-panel text-foreground/60 hover:text-foreground hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center group"
                  >
                    {isCopied ? <Check size={20} className="text-brand-accent" /> : <Copy size={20} className="group-hover:scale-110 transition-transform" />}
                  </button>
                </div>
                <div className="p-10 font-mono text-sm leading-7 overflow-x-auto custom-scrollbar">
                  <pre className={cn(
                    "whitespace-pre-wrap",
                    selectedLanguage === 'explanation' ? "text-foreground/70 font-sans text-sm leading-relaxed" : "text-brand-primary/80"
                  )}>
                    {selectedLanguage === 'explanation'
                      ? (question.solutions?.explanation || 'No explanation provided.')
                      : String(question.solutions?.[selectedLanguage] || '').replace(/\\n/g, '\n')
                    }
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function RefreshCw(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function LayoutDashboard(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    );
  }
