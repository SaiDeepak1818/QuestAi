import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays, FileSpreadsheet, Plus, Trash2, Loader2, Check,
  AlertCircle, ArrowLeft, ChevronDown, ChevronUp, BookOpen, FolderOpen,
  Clock, Zap, Terminal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PlannerView } from './PlannerView';
import { PlannerGenerating } from './PlannerGenerating';
import { generatePlannerQCPdf } from '../lib/plannerQCPdf';

function CountSelector({ label, desc, value, onChange, color }) {
  const colors = {
    green: { bar: 'bg-emerald-500', label: 'text-emerald-400', border: 'border-emerald-500/20' },
    blue:  { bar: 'bg-blue-500',    label: 'text-blue-400',    border: 'border-blue-500/20'    },
    red:   { bar: 'bg-red-500',     label: 'text-red-400',     border: 'border-red-500/20'     }
  }[color] || { bar: 'bg-brand-primary', label: 'text-brand-primary', border: 'border-brand-primary/20' };

  return (
    <div className={cn('p-4 rounded-2xl border glass-panel space-y-3', colors.border)}>
      <div>
        <p className={cn('text-[10px] font-black uppercase tracking-widest', colors.label)}>{label}</p>
        <p className="text-[9px] text-foreground/30 font-mono mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => onChange(Math.max(1, value - 1))} className="w-8 h-8 rounded-xl glass-panel border border-white/10 flex items-center justify-center text-foreground/50 hover:text-foreground font-black text-lg cursor-pointer transition-colors">−</button>
        <span className="text-2xl font-black text-foreground w-8 text-center">{value}</span>
        <button onClick={() => onChange(Math.min(10, value + 1))} className="w-8 h-8 rounded-xl glass-panel border border-white/10 flex items-center justify-center text-foreground/50 hover:text-foreground font-black text-lg cursor-pointer transition-colors">+</button>
      </div>
      <div className="flex gap-0.5 h-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={cn('flex-1 rounded-full transition-colors duration-200', i < value ? colors.bar : 'bg-white/10')} />
        ))}
      </div>
    </div>
  );
}

// ── Course group card: expandable, shows its planners ─────────────────────────
function CourseGroupCard({ courseName, track, planners, onOpenPlanner, onDeletePlanner, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const totalQ = planners.reduce((s, p) =>
    s + (p.weeks || []).reduce((ws, w) =>
      ws + ['skillBuilder','practiceAtHome','challengeYourself'].reduce((ss, k) => ss + (w[k]?.questions?.length || 0), 0), 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl border border-white/5 overflow-hidden"
    >
      <button onClick={() => setOpen(p => !p)}
        className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
            <FolderOpen size={20} className="text-brand-primary" />
          </div>
          <div className="text-left">
            <p className="text-lg font-black text-foreground">{courseName}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest font-mono bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-lg">{track}</span>
              <span className="text-[9px] text-foreground/30 font-mono">{planners.length} planner{planners.length !== 1 ? 's' : ''} · {totalQ} questions</span>
            </div>
          </div>
        </div>
        {open ? <ChevronUp size={18} className="text-foreground/30 shrink-0" /> : <ChevronDown size={18} className="text-foreground/30 shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 pb-6 pt-2 space-y-3 border-t border-white/5">
              {planners.map((p, idx) => {
                const wks = p.weeks?.length || 0;
                const qs = (p.weeks || []).reduce((s, w) =>
                  s + ['skillBuilder','practiceAtHome','challengeYourself'].reduce((a, k) => a + (w[k]?.questions?.length || 0), 0), 0);
                return (
                  <div key={p._id || idx}
                    onClick={() => onOpenPlanner(p)}
                    className="flex items-center gap-4 p-4 rounded-2xl glass-panel border border-white/5 hover:border-brand-primary/20 cursor-pointer transition-all group"
                  >
                    <CalendarDays size={18} className="text-brand-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground">
                        {wks} week{wks !== 1 ? 's' : ''} · {qs} questions
                      </p>
                      {p.createdAt && (
                        <p className="text-[9px] text-foreground/30 font-mono mt-0.5">
                          Generated {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-foreground/20 font-mono group-hover:text-brand-primary transition-colors">Open →</span>
                      {p._id && (
                        <button
                          onClick={e => { e.stopPropagation(); onDeletePlanner(p._id); }}
                          className="p-1.5 rounded-xl text-foreground/20 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Map track → main category (matching the content bank's trackGroups)
const TRACK_TO_CATEGORY = {
  'C': 'Problem Solving', 'C++': 'Problem Solving', 'Java': 'Problem Solving',
  'Python': 'Problem Solving', 'DSA': 'Problem Solving', 'DAA': 'Problem Solving',
  'Aptitude': 'Problem Solving',
  'SQL': 'Database', 'MongoDB': 'Database', 'PostgreSQL': 'Database', 'NoSQL': 'Database',
  '.NET': 'Project', 'AI/ML': 'Project', 'AWS': 'Project', 'Angular': 'Project',
  'Azure': 'Project', 'C#': 'Project', 'Cybersecurity': 'Project',
};

export function PlannerPage({ apiFetch, showToast, getActiveFormat, tracksWithCourses = {}, trackGroups = {}, onGetMcpPrompt }) {
  const [planners,       setPlanners]       = useState([]);
  const [courses,        setCourses]        = useState([]); // from /api/courses
  const [trackCatFilter, setTrackCatFilter] = useState('');
  const [activePlanner,  setActivePlanner]  = useState(null);
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [selectedCategory,  setSelectedCategory]  = useState('All');
  const [isLoading,      setIsLoading]      = useState(true);
  const [mode,           setMode]           = useState('list'); // 'list' | 'create'

  // Form fields
  const [courseName,             setCourseName]             = useState('');
  const [selectedTrack,          setSelectedTrack]          = useState('');
  const [trackInput,             setTrackInput]             = useState('');
  const [parsedWeeks,            setParsedWeeks]            = useState([]);
  const [fileName,               setFileName]               = useState('');
  const [skillBuilderCount,      setSkillBuilderCount]      = useState(3);
  const [practiceAtHomeCount,    setPracticeAtHomeCount]    = useState(3);
  const [challengeYourselfCount, setChallengeYourselfCount] = useState(2);

  // Progress
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [genProgress,    setGenProgress]    = useState({ current: 0, total: 0, weekName: '' });
  const [genLog,         setGenLog]         = useState([]);

  // Rate-limit countdown state
  const [isRLWait,       setIsRLWait]       = useState(false);
  const [rlSecsLeft,     setRlSecsLeft]     = useState(0);
  const [rlSecsTotal,    setRlSecsTotal]    = useState(0);
  const [rlNextLabel,    setRlNextLabel]    = useState('');

  // QC PDF state (set after generation completes)
  const [qcPdf,          setQcPdf]          = useState(null);
  // Partial weeks — populated as each week finishes (for live preview & stop-save)
  const [partialWeeks,   setPartialWeeks]   = useState([]);

  const fileRef    = useRef(null);
  const abortRLRef = useRef(false); // cancel rate-limit wait
  const stopGenRef  = useRef(false); // cancel entire generation loop

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Countdown wait respecting the Groq free-tier 1-minute TPM window.
  // totalMs  = milliseconds left in the current rate-limit window
  // nextLabel = "Week N: Topic" shown during the wait
  const countdownWait = async (totalMs, nextLabel) => {
    abortRLRef.current = false;
    setIsRLWait(true);
    setRlNextLabel(nextLabel);
    const secs = Math.ceil(totalMs / 1000);
    setRlSecsTotal(secs);
    setRlSecsLeft(secs);
    const deadline = Date.now() + totalMs;
    while (Date.now() < deadline) {
      if (abortRLRef.current) break;
      await sleep(400);
      setRlSecsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }
    setIsRLWait(false);
  };

  // Stop generation mid-loop (saves whatever was built so far)
  const handleStopGeneration = () => {
    stopGenRef.current  = true;
    abortRLRef.current  = true; // also abort any active rate-limit wait
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        apiFetch('/api/planners'),
        apiFetch('/api/courses').catch(() => null)
      ]);
      if (pr.ok) setPlanners(await pr.json());
      if (cr?.ok) setCourses(await cr.json());
    } catch {}
    setIsLoading(false);
  };

  // Group planners by courseName, then filter by selected category
  const grouped = planners.reduce((acc, p) => {
    const key = `${p.courseName}||${p.track}`;
    if (!acc[key]) acc[key] = { courseName: p.courseName, track: p.track, planners: [] };
    acc[key].planners.push(p);
    return acc;
  }, {});

  const CATEGORIES = ['All', 'Problem Solving', 'Database', 'Project'];
  const filteredGrouped = Object.values(grouped).filter(g =>
    selectedCategory === 'All' || TRACK_TO_CATEGORY[g.track] === selectedCategory
  );

  const fileToBase64 = f => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

  const handleUpload = async (file) => {
    if (!file) return;
    setIsParsingExcel(true);
    setFileName(file.name);
    try {
      const b64 = await fileToBase64(file);
      const r = await apiFetch('/api/planner/parse-excel', {
        method: 'POST',
        body: JSON.stringify({ fileBase64: b64, fileName: file.name })
      });
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        showToast(r.status === 413 ? 'File too large — try a smaller Excel' : `Server error (${r.status})`, true);
        setIsParsingExcel(false); return;
      }
      const body = await r.json();
      if (!r.ok) showToast(body.error || 'Parse failed', true);
      else if (!body.weeks?.length) showToast('No weeks found — check Week and Topic columns', true);
      else { setParsedWeeks(body.weeks); showToast(`✓ Found ${body.weeks.length} weeks`); }
    } catch (e) { showToast('Upload error: ' + e.message, true); }
    setIsParsingExcel(false);
  };

  const trackFinal = selectedTrack || trackInput.trim();

  const handleGenerate = async () => {
    if (!courseName.trim()) { showToast('Enter a course name', true); return; }
    if (!trackFinal)        { showToast('Select or enter a track', true); return; }
    if (!parsedWeeks.length){ showToast('Upload an Excel planner first', true); return; }

    setIsGenerating(true);
    setGenLog([]);
    setQcPdf(null);
    stopGenRef.current = false;
    setPartialWeeks([]);
    setMode('generating'); // ← switch to full-screen generating page immediately
    const fmt = getActiveFormat ? getActiveFormat() : '';
    const built = [];

    // Read active provider from localStorage (set in App.jsx Settings)
    let currentProvider = localStorage.getItem('qa_provider') || 'groq';
    let currentModel    = localStorage.getItem('qa_model')    || '';

    // ── Rate-limit strategy ──────────────────────────────────────────────────
    // Groq free tier: ~12 000 TPM. Each week uses ~11 000 tokens.
    // After each week we wait out whatever is left of the 62-second window
    // so the bucket is full again before the next request.
    const RATE_WINDOW_MS = 75_000; // 75 s — generous window so the bucket refills fully
    const MIN_WAIT_MS    = 15_000; // always wait at least 15 s between weeks

    let shownError    = false;
    let shouldAbort   = false;
    let weekStartedAt = null; // timestamp when the last API call began

    for (let i = 0; i < parsedWeeks.length; i++) {
      if (shouldAbort) {
        const wk = parsedWeeks[i];
        built.push({ ...wk, skillBuilder: { questions: [] }, practiceAtHome: { questions: [] }, challengeYourself: { questions: [] } });
        setGenLog(p => [...p, { n: wk.weekNumber, topic: wk.topic, status: 'error' }]);
        continue;
      }

      // ── Wait for rate-limit window (skip for first week) ──────────────────
      if (weekStartedAt !== null) {
        const elapsed  = Date.now() - weekStartedAt;
        const waitMs   = Math.max(MIN_WAIT_MS, RATE_WINDOW_MS - elapsed);
        if (waitMs > 0) {
          const nw = parsedWeeks[i];
          await countdownWait(waitMs, `Week ${nw.weekNumber}: ${nw.topic}`);
        }
      }

      // ── Stop check (user pressed Stop) ───────────────────────────────────
      if (stopGenRef.current) {
        for (let j = i; j < parsedWeeks.length; j++) {
          const wkj = parsedWeeks[j];
          built.push({ ...wkj, skillBuilder: { questions: [] }, practiceAtHome: { questions: [] }, challengeYourself: { questions: [] } });
          setGenLog(p => [...p, { n: wkj.weekNumber, topic: wkj.topic, status: 'error' }]);
        }
        break;
      }

      // ── Generate this week ────────────────────────────────────────────────
      const wk = parsedWeeks[i];
      weekStartedAt = Date.now();
      setGenProgress({ current: i + 1, total: parsedWeeks.length, weekName: `Week ${wk.weekNumber}: ${wk.topic}` });
      setGenLog(p => [...p, { n: wk.weekNumber, topic: wk.topic, status: 'generating' }]);

      try {
        const r = await apiFetch('/api/planner/generate-week', {
          method: 'POST',
          body: JSON.stringify({
            topic: wk.topic, subtopics: wk.subtopics || [],
            week: wk.weekNumber, track: trackFinal, course: courseName,
            skillBuilderCount, practiceAtHomeCount, challengeYourselfCount,
            customFormat: fmt,
            provider: currentProvider,
            model:    currentModel || undefined
          })
        });
        if (r.ok) {
          const sec = await r.json();

          // ── Handle automatic provider failover ────────────────────────────
          if (sec.switchedFrom) {
            currentProvider = sec.providerUsed;
            currentModel    = ''; // use default model for the new provider
            showToast(`⚡ ${sec.switchedFrom} limit — switched to ${sec.providerUsed}`, false);
          }

          const builtWeek = { ...wk, skillBuilder: { questions: sec.skillBuilder || [] }, practiceAtHome: { questions: sec.practiceAtHome || [] }, challengeYourself: { questions: sec.challengeYourself || [] } };
          built.push(builtWeek);
          setPartialWeeks(p => [...p, builtWeek]);
          setGenLog(p => p.map(l => l.n === wk.weekNumber
            ? { ...l, status: 'done', providerUsed: sec.providerUsed || currentProvider, switchedFrom: sec.switchedFrom || null }
            : l
          ));
        } else {
          let errMsg = `Week ${wk.weekNumber} generation failed (HTTP ${r.status})`;
          try { const errBody = await r.json(); if (errBody?.error) errMsg = errBody.error; } catch {}
          if (r.status === 402) shouldAbort = true;
          throw new Error(errMsg);
        }
      } catch (err) {
        if (!shownError) {
          showToast(err?.message || 'Generation failed — add your API key in Settings', true);
          shownError = true;
        }
        built.push({ ...wk, skillBuilder: { questions: [] }, practiceAtHome: { questions: [] }, challengeYourself: { questions: [] } });
        setGenLog(p => p.map(l => l.n === wk.weekNumber ? { ...l, status: 'error' } : l));
      }
    }

    let saved = null;
    try {
      const r = await apiFetch('/api/planners', {
        method: 'POST',
        body: JSON.stringify({ courseName, track: trackFinal, plannerFile: fileName, skillBuilderCount, practiceAtHomeCount, challengeYourselfCount, weeks: built })
      });
      if (r.ok) { saved = await r.json(); setPlanners(p => [saved, ...p]); showToast(`✓ ${courseName} planner ready!`); }
    } catch { showToast('Generated but DB save failed', false); }

    // ── Generate QC PDF ─────────────────────────────────────────────────────
    try {
      const qc = generatePlannerQCPdf({
        courseName,
        track: trackFinal,
        weeks: built,
        skillBuilderCount,
        practiceAtHomeCount,
        challengeYourselfCount,
      });
      setQcPdf(qc);
    } catch (e) {
      console.warn('QC PDF generation failed:', e);
    }

    // Store the planner for the "View Planner" button in PlannerGenerating
    setActivePlanner(saved || { courseName, track: trackFinal, weeks: built, createdAt: new Date().toISOString() });
    setIsGenerating(false);
    // Don't call resetCreate() here — stay on 'generating' page so user can
    // download the QC PDF and then click "View Planner"
  };

  const resetCreate = () => {
    abortRLRef.current = true; // cancel any in-progress rate-limit wait
    stopGenRef.current = true; // stop generation loop if still running
    setMode('list'); setCourseName(''); setSelectedTrack(''); setTrackInput('');
    setParsedWeeks([]); setFileName(''); setGenLog([]);
    setIsRLWait(false); setRlSecsLeft(0); setRlSecsTotal(0); setRlNextLabel('');
    setQcPdf(null);
    setActivePlanner(null);
    setPartialWeeks([]);
  };

  // Fetch full planner (with questions) before opening — the list endpoint strips questions for speed
  const handleOpenPlanner = async (p) => {
    if (p._id && !p._id.startsWith('local-')) {
      setLoadingPlanner(true);
      try {
        const r = await apiFetch(`/api/planners/${p._id}`);
        if (r.ok) { setActivePlanner(await r.json()); setLoadingPlanner(false); return; }
      } catch {}
      setLoadingPlanner(false);
    }
    setActivePlanner(p); // fallback to whatever we have
  };

  const deletePlanner = async (id) => {
    if (!confirm('Delete this planner and all its questions?')) return;
    try {
      await apiFetch(`/api/planners/${id}`, { method: 'DELETE' });
      setPlanners(p => p.filter(x => x._id !== id));
      showToast('✓ Planner deleted');
    } catch { showToast('Delete failed', true); }
  };

  // ─── Loading full planner ───────────────────────────────────────────────────
  if (loadingPlanner) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-foreground/30">
        <Loader2 size={22} className="animate-spin text-brand-primary" />
        <span className="text-sm font-bold">Loading planner…</span>
      </div>
    );
  }

  // ─── Full-screen generation page ────────────────────────────────────────────
  if (mode === 'generating') {
    return (
      <PlannerGenerating
        courseName={courseName}
        track={trackFinal}
        genLog={genLog}
        genProgress={genProgress}
        isRLWait={isRLWait}
        rlSecsLeft={rlSecsLeft}
        rlSecsTotal={rlSecsTotal}
        rlNextLabel={rlNextLabel}
        isGenerating={isGenerating}
        qcPdf={qcPdf}
        partialWeeks={partialWeeks}
        onStop={handleStopGeneration}
        onViewPlanner={() => {
          // activePlanner is already set; switching mode away from 'generating'
          // causes the `if (activePlanner)` branch to render PlannerView
          setMode('view');
        }}
        onBack={() => { resetCreate(); }}
      />
    );
  }

  // ─── Planner view (after generation or when opening an existing planner) ────
  if (activePlanner) {
    return <PlannerView planner={activePlanner} onBack={() => { setActivePlanner(null); setMode('list'); }} />;
  }

  // ─── Create flow ────────────────────────────────────────────────────────────
  if (mode === 'create') {
    const totalPerWeek = skillBuilderCount + practiceAtHomeCount + challengeYourselfCount;

    // Use all tracks from tracksWithCourses prop; fall back to /api/courses
    const allTracksFromProp = Object.keys(tracksWithCourses);
    const hasPropTracks = allTracksFromProp.length > 0;

    // Category groups: prefer prop, fall back to TRACK_TO_CATEGORY
    const catNames = hasPropTracks
      ? Object.keys(trackGroups).filter(cat => Object.values(trackGroups[cat] || {}).length > 0 || Object.keys(trackGroups).includes(cat))
      : ['Problem Solving', 'Database', 'Project'];

    const tracksForCat = (cat) => {
      if (hasPropTracks && trackGroups[cat]) {
        // trackGroups[cat] can be an object (track → courses[]) or an array
        const val = trackGroups[cat];
        const keys = Array.isArray(val) ? val : Object.keys(val);
        return keys.filter(t => tracksWithCourses[t]);
      }
      // Fallback: from /api/courses
      return [...new Set(courses.map(c => c.track).filter(Boolean))].filter(t => !cat || TRACK_TO_CATEGORY[t] === cat);
    };

    const displayCats = catNames.filter(cat => tracksForCat(cat).length > 0);
    const filteredTracks = trackCatFilter
      ? tracksForCat(trackCatFilter)
      : (hasPropTracks ? allTracksFromProp : [...new Set(courses.map(c => c.track).filter(Boolean))]);

    // Course suggestions for selected track
    const trackCourses = selectedTrack
      ? (tracksWithCourses[selectedTrack] || courses.filter(c => c.track === selectedTrack).map(c => c.name))
      : [];

    return (
      <div className="space-y-6 max-w-2xl mx-auto pb-10">
        <div className="flex items-center gap-3">
          <button onClick={resetCreate} className="p-2.5 rounded-2xl glass-panel border border-white/10 text-foreground/50 hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-black text-foreground">New Content Planner</h2>
            <p className="text-[9px] text-foreground/30 font-mono uppercase tracking-widest">All tracks supported · Excel-driven</p>
          </div>
        </div>

        {/* Course + Track */}
        <div className="glass-card rounded-3xl border border-white/5 p-6 space-y-5">
          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest font-mono">01 — Course Details</p>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-foreground/40 font-mono">Course Name</label>
            {trackCourses.length > 0 && !courseName && (
              <div className="flex gap-2 flex-wrap mb-2">
                {trackCourses.slice(0, 8).map((name, i) => (
                  <button key={i} onClick={() => setCourseName(typeof name === 'string' ? name : name.name || '')}
                    className="px-3 py-1.5 rounded-xl glass-panel border border-white/5 text-[10px] font-black text-foreground/50 hover:text-brand-primary hover:border-brand-primary/30 cursor-pointer transition-all"
                  >{typeof name === 'string' ? name : name.name}</button>
                ))}
              </div>
            )}
            <input type="text" value={courseName} onChange={e => setCourseName(e.target.value)}
              placeholder="e.g. SKG 2026, SKCET Batch A, DSA Bootcamp"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-foreground placeholder-foreground/20 focus:outline-none focus:border-brand-primary/50 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-wider text-foreground/40 font-mono">Track</label>

            {/* Category filter tabs */}
            {displayCats.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setTrackCatFilter('')}
                  className={cn('px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer',
                    trackCatFilter === '' ? 'bg-brand-primary text-white' : 'glass-panel border border-white/5 text-foreground/30 hover:text-foreground'
                  )}>All</button>
                {displayCats.map(cat => (
                  <button key={cat} onClick={() => setTrackCatFilter(cat)}
                    className={cn('px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer',
                      trackCatFilter === cat ? 'bg-brand-primary text-white' : 'glass-panel border border-white/5 text-foreground/30 hover:text-foreground'
                    )}>{cat}</button>
                ))}
              </div>
            )}

            {/* Track buttons */}
            {filteredTracks.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {filteredTracks.map(t => (
                  <button key={t} onClick={() => { setSelectedTrack(t); setTrackInput(''); }}
                    className={cn('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
                      selectedTrack === t ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'glass-panel border border-white/5 text-foreground/40 hover:text-foreground hover:bg-white/5'
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <input type="text" value={selectedTrack ? '' : trackInput}
              onChange={e => { setTrackInput(e.target.value); setSelectedTrack(''); }}
              placeholder={selectedTrack ? `Selected: ${selectedTrack} (click to type a different one)` : "Or type: DSA, DBMS, Python, OS, Networks…"}
              onFocus={() => setSelectedTrack('')}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm font-bold text-foreground placeholder-foreground/20 focus:outline-none focus:border-brand-primary/50 transition-colors"
            />
            {trackFinal && (
              <p className="text-[9px] text-brand-primary font-mono">Track: <span className="font-black">{trackFinal}</span></p>
            )}
          </div>

          {/* Excel Upload */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-wider text-foreground/40 font-mono">Excel Content Planner</label>
            <div onClick={() => fileRef.current?.click()}
              className={cn('border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all',
                parsedWeeks.length > 0 ? 'border-brand-accent/40 bg-brand-accent/5' : 'border-white/10 hover:border-brand-primary/40 hover:bg-white/[0.02]'
              )}>
              {isParsingExcel ? (
                <div className="space-y-2"><Loader2 size={28} className="animate-spin text-brand-primary mx-auto" /><p className="text-[10px] text-foreground/40 font-mono">Parsing…</p></div>
              ) : parsedWeeks.length > 0 ? (
                <div className="space-y-2">
                  <Check size={28} className="text-brand-accent mx-auto" />
                  <p className="text-sm font-black text-brand-accent">{parsedWeeks.length} Weeks Detected</p>
                  <p className="text-[9px] text-foreground/30 font-mono">{fileName}</p>
                  <p className="text-[9px] text-brand-primary font-mono cursor-pointer hover:underline">Click to change file</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileSpreadsheet size={32} className="text-foreground/20 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-foreground/40">Click to upload your Excel planner</p>
                    <p className="text-[9px] text-foreground/20 font-mono mt-1">.xlsx · .xls · Columns: Week, Topic, Subtopics</p>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </div>

            {parsedWeeks.length > 0 && (
              <div className="rounded-2xl glass-panel border border-white/5 overflow-hidden max-h-52 overflow-y-auto divide-y divide-white/5">
                {parsedWeeks.map(w => (
                  <div key={w.weekNumber} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02]">
                    <span className="text-[9px] font-black text-brand-primary font-mono w-8 shrink-0">W{w.weekNumber}</span>
                    <span className="text-[11px] font-bold text-foreground/80 flex-1 truncate">{w.topic}</span>
                    {w.subtopics?.length > 0 && <span className="text-[9px] text-foreground/20 font-mono shrink-0">{w.subtopics.length} sub</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Question counts */}
        {parsedWeeks.length > 0 && (
          <div className="glass-card rounded-3xl border border-white/5 p-6 space-y-5">
            <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest font-mono">02 — Questions Per Section (per week)</p>
            <div className="grid grid-cols-3 gap-4">
              <CountSelector label="Skill Builder"       desc="Easy — foundation"  value={skillBuilderCount}       onChange={setSkillBuilderCount}      color="green" />
              <CountSelector label="Practice at Home"    desc="Medium — practice"  value={practiceAtHomeCount}    onChange={setPracticeAtHomeCount}    color="blue"  />
              <CountSelector label="Challenge Yourself"  desc="Hard — mastery"     value={challengeYourselfCount} onChange={setChallengeYourselfCount} color="red"   />
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
              <p className="text-[10px] text-foreground/30 font-mono">
                {parsedWeeks.length} weeks × {totalPerWeek} Q/week = <span className="text-foreground font-black">{parsedWeeks.length * totalPerWeek} questions total</span>
              </p>
            </div>
          </div>
        )}

        {parsedWeeks.length > 0 && (
          <>
            {/* Time estimate callout */}
            {!isGenerating && parsedWeeks.length > 1 && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
                <Clock size={14} className="text-brand-primary shrink-0" />
                <p className="text-[9px] text-foreground/40 font-mono leading-relaxed">
                  Groq free tier: <span className="text-foreground/60 font-black">1 week per minute</span> ·{' '}
                  {parsedWeeks.length} weeks ={' '}
                  <span className="text-brand-primary font-black">~{parsedWeeks.length} min total</span>
                </p>
              </div>
            )}

            {/* GET MCP PROMPT — let Claude generate via MCP */}
            {onGetMcpPrompt && (
              <button
                onClick={() => onGetMcpPrompt({ courseName, track: trackFinal, client: 'General', skillBuilderCount, practiceAtHomeCount, challengeYourselfCount })}
                disabled={!courseName.trim() || !trackFinal}
                className="w-full py-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 disabled:opacity-40 text-brand-primary font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Terminal size={14} />
                Get MCP Prompt · Generate with Claude
              </button>
            )}

            <button onClick={handleGenerate} disabled={isGenerating || !courseName.trim() || !trackFinal}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-brand-primary/20 cursor-pointer"
            >
              {parsedWeeks.length > 1
                ? <><CalendarDays size={16} />Generate {parsedWeeks.length} Weeks · ~{parsedWeeks.length} min</>
                : <><CalendarDays size={16} />Generate Planner</>
              }
            </button>
          </>
        )}

        {/* Generation log is now shown on the dedicated PlannerGenerating page */}
      </div>
    );
  }

  // ─── List view — grouped by course ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">Content Planner</h2>
          <p className="text-[10px] text-foreground/30 font-mono uppercase tracking-widest mt-0.5">
            Excel-driven weekly question sets · All tracks
          </p>
        </div>
        <button onClick={() => setMode('create')}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-brand-primary/20 cursor-pointer"
        >
          <Plus size={14} /> New Planner
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-foreground/20"><Loader2 size={24} className="animate-spin" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <CalendarDays size={40} className="text-foreground/10 mx-auto" />
          <div>
            <p className="font-black text-foreground/30">No planners yet</p>
            <p className="text-[10px] text-foreground/20 font-mono mt-1">Upload an Excel planner to generate structured week-by-week question sets for any track</p>
          </div>
          <button onClick={() => setMode('create')}
            className="inline-flex items-center gap-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <Plus size={14} /> Create Your First Planner
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Category filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['All', 'Problem Solving', 'Database', 'Project'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer',
                  selectedCategory === cat
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                    : 'glass-panel border border-white/5 text-foreground/40 hover:text-foreground hover:bg-white/5'
                )}
              >
                {cat === 'All'
                  ? `All (${planners.length})`
                  : `${cat} (${Object.values(grouped).filter(g => TRACK_TO_CATEGORY[g.track] === cat).length})`
                }
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredGrouped.map((group, idx) => (
              <CourseGroupCard
                key={`${group.courseName}||${group.track}`}
                courseName={group.courseName}
                track={group.track}
                planners={group.planners}
                onOpenPlanner={handleOpenPlanner}
                onDeletePlanner={deletePlanner}
                defaultOpen={idx === 0}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
