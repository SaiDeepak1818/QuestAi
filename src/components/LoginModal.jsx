import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Mail, Lock, Zap, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

export const LoginModal = ({ onSuccess, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onSuccess();
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-3xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-lg glass-panel rounded-[48px] border border-white/10 p-12 relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-12 h-12 rounded-2xl glass-panel flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-white/10 transition-all border border-white/5"
        >
          <X size={20} />
        </button>

        <div className="mb-12 text-center relative z-10">
          <motion.div 
            animate={{ 
              boxShadow: ["0 0 20px rgba(99,102,241,0.2)", "0 0 50px rgba(99,102,241,0.4)", "0 0 20px rgba(99,102,241,0.2)"]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-20 h-20 bg-brand-primary/20 rounded-[28px] flex items-center justify-center mx-auto mb-8 border border-brand-primary/30"
          >
             <ShieldCheck size={36} className="text-brand-primary shadow-[0_0_20px_rgba(99,102,241,1)]" />
          </motion.div>
          <h2 className="text-4xl font-black tracking-tightest uppercase mb-3">
            {isLogin ? 'SYSTEM ACCESS' : 'NEURAL REGISTER'}
          </h2>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.3em]">Protocol Alpha-1 Verification Port</p>
            <div className="w-12 h-1 bg-brand-primary rounded-full mt-2" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 ml-2">Vector Identity</label>
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-brand-primary transition-colors">
                <Mail size={18} />
              </div>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="identity@neural.track"
                className="w-full bg-white/5 border border-white/5 rounded-[24px] py-6 pl-16 pr-6 font-semibold text-white focus:outline-none focus:bg-white/10 focus:border-brand-primary/50 transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 ml-2">Encryption Key</label>
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-foreground/20 group-focus-within:text-brand-primary transition-colors">
                <Lock size={18} />
              </div>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full bg-white/5 border border-white/5 rounded-[24px] py-6 pl-16 pr-6 font-semibold text-white focus:outline-none focus:bg-white/10 focus:border-brand-primary/50 transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background font-black py-6 rounded-[24px] shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-brand-violet/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">
              {loading ? 'SYNCHRONIZING...' : isLogin ? 'INITIATE SESSION' : 'ESTABLISH NODE'}
            </span>
            {!loading && <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
            {loading && <RefreshCw size={20} className="animate-spin relative z-10" />}
          </button>
        </form>

        <div className="mt-12 text-center relative z-10">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.15em] hover:text-brand-primary transition-colors flex items-center gap-2 mx-auto group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/10 group-hover:bg-brand-primary transition-colors" />
            {isLogin ? "Request New Vector Invitation" : "Existing Identity? Authenticate"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
