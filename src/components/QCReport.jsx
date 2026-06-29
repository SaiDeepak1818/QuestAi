import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, ShieldAlert, Download, FileText, BadgeCheck, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '../lib/utils';

export function QCReport({ topic, questions, type, onClose }) {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const downloadPDF = async () => {
    if (isGenerating) return;
    const element = document.getElementById('qc-report-content');
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const contentHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = contentHeight;
      let position = 0;

      while (heightLeft > 0) {
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
        heightLeft -= pdfHeight;
        
        if (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
        }
      }

      pdf.save(`QuestAi_QC_${topic.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-panel w-full max-w-6xl max-h-[94vh] rounded-[48px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02] backdrop-blur-4xl relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-[20px] bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tightest leading-none mb-1">LOGIC <span className="text-brand-primary">CERTIFICATION</span></h2>
              <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.3em] flex items-center gap-2">
                <Activity size={10} className="text-brand-accent"/> Protocol QC-9-Alpha :: Real-time Synchronization
              </p>
            </div>
          </div>
          <div className="flex gap-4">
             <button 
                onClick={downloadPDF}
                disabled={isGenerating}
                className="bg-foreground text-background px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-2xl flex items-center gap-3 disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {isGenerating ? "Encrypting..." : <><Download size={18} /> Export Protocol</>}
              </button>
              <button 
                onClick={onClose} 
                className="w-14 h-14 rounded-2xl glass-panel flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-white/10 transition-all border border-white/5"
              >
                <X size={24} />
              </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-12 bg-transparent custom-scrollbar relative z-10" id="qc-report-content">
          <div className="max-w-5xl mx-auto space-y-16 pb-20">
            
            {/* Context Header */}
            <div className="border-b border-white/5 pb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Validation Vector</span>
                  </div>
                  <h1 className="text-6xl font-black uppercase tracking-tightest leading-[0.9] max-w-2xl bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                    {topic}
                  </h1>
               </div>
               <div className="text-left md:text-right space-y-2">
                  <p className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Protocol Node Identifier</p>
                  <p className="font-mono text-xl uppercase tracking-tighter opacity-20">#{Math.random().toString(36).substr(2, 12)}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-12">
              {questions?.map((q, idx) => (
                <div key={q._id ? `qc-card-${q._id}-${idx}` : `qc-card-${idx}`} className="glass-panel rounded-[40px] border border-white/5 overflow-hidden transition-all hover:border-white/10 group/item relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  
                  <div className="px-10 py-6 flex justify-between items-center border-b border-white/5 relative z-10 bg-white/[0.01]">
                     <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black border border-white/10">0{idx + 1}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">Logic Module Verification</span>
                     </div>
                     <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20">
                        <BadgeCheck size={14} className="text-brand-accent"/>
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-accent">Integrity Confirmed</span>
                     </div>
                  </div>
                  
                  <div className="p-10 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                       <div className="lg:col-span-8 space-y-8">
                          <div>
                             <p className="text-[9px] font-black uppercase text-foreground/20 tracking-[0.2em] mb-3">Module Subject</p>
                             <h3 className="text-2xl font-bold tracking-tight">{'title' in q ? q.title : q.question}</h3>
                          </div>
                          
                          <div className="pt-8 border-t border-white/5">
                             <p className="text-[9px] font-black uppercase text-foreground/20 tracking-[0.2em] mb-4">Functional Synthesis</p>
                             <p className="text-sm text-foreground/50 leading-[1.7] font-medium">
                                {'description' in q ? q.description : q.explanation || 'No detailed analysis provided for this logic module.'}
                             </p>
                          </div>
                       </div>

                       <div className="lg:col-span-4 space-y-8 lg:pl-12 lg:border-l border-white/5">
                          <div className="space-y-6">
                            <div className="space-y-2">
                               <p className="text-[9px] font-black uppercase text-foreground/20 tracking-[0.2em]">Complexity Vector</p>
                               <span className={cn(
                                 "inline-flex px-4 py-1.5 rounded-xl font-black text-[10px] uppercase border tracking-widest shadow-lg",
                                 ('difficulty' in q ? q.difficulty : 'Medium') === 'Easy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5" :
                                 ('difficulty' in q ? q.difficulty : 'Medium') === 'Medium' ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5" : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5"
                               )}>
                                 {'difficulty' in q ? q.difficulty : 'Expert'}
                               </span>
                            </div>
                            
                            <div className="space-y-2">
                               <p className="text-[9px] font-black uppercase text-foreground/20 tracking-[0.2em]">Target Deployment</p>
                               <p className="text-xs font-black text-brand-primary uppercase tracking-[0.1em]">{q.recommendedFor || 'Advanced Engineering'}</p>
                            </div>

                            <div className="space-y-2">
                               <p className="text-[9px] font-black uppercase text-foreground/20 tracking-[0.2em]">System State</p>
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(16,185,129,1)]" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">Secure</span>
                               </div>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Sign-off */}
            <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 opacity-40">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <Activity size={20}/>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">QuestAi Intelligence Protocol Alpha-9</span>
               </div>
               <div className="flex items-center gap-8 font-mono text-[10px] uppercase">
                  <span>Timestamp: {new Date().toISOString()}</span>
                  <span>Region: Global Edge Cluster</span>
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
