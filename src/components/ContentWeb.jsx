import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ── Original theme helper (unchanged) ─────────────────────────────────────────
const getWebTheme = (categoryName, index) => {
  const themes = [
    {
      primary: '#2563eb', secondary: '#60a5fa', glow: 'rgba(37,99,235,0.4)',
      particle: '#93c5fd', gradient: 'from-blue-600/10 to-indigo-900/20',
      accentColor: 'rgb(37,99,235)', stopColors: ['#2563eb','#1d4ed8']
    },
    {
      primary: '#1d4ed8', secondary: '#a8c5f4', glow: 'rgba(29,78,216,0.4)',
      particle: '#cbd5e1', gradient: 'from-blue-700/10 to-slate-900/20',
      accentColor: 'rgb(29,78,216)', stopColors: ['#1d4ed8','#1e40af']
    },
    {
      primary: '#0284c7', secondary: '#38bdf8', glow: 'rgba(2,132,199,0.4)',
      particle: '#7dd3fc', gradient: 'from-sky-600/10 to-teal-900/20',
      accentColor: 'rgb(2,132,199)', stopColors: ['#0284c7','#0369a1']
    },
    {
      primary: '#3b82f6', secondary: '#22d3ee', glow: 'rgba(59,130,246,0.4)',
      particle: '#67e8f9', gradient: 'from-blue-500/10 to-cyan-950/20',
      accentColor: 'rgb(59,130,246)', stopColors: ['#3b82f6','#2563eb']
    }
  ];
  if (categoryName === 'Problem Solving') return themes[0];
  if (categoryName === 'Project')         return themes[1];
  if (categoryName === 'Database')        return themes[2];
  return themes[index % themes.length];
};

// ── Original saggy-ring path helper (unchanged) ────────────────────────────────
const getSaggyPath = (cx, cy, radius, numSpokes = 8) => {
  let path = '';
  for (let i = 0; i < numSpokes; i++) {
    const angle1 = (i / numSpokes) * Math.PI * 2 - Math.PI / 2;
    const angle2 = ((i + 1) / numSpokes) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle1) * radius;
    const y1 = cy + Math.sin(angle1) * radius;
    const x2 = cx + Math.cos(angle2) * radius;
    const y2 = cy + Math.sin(angle2) * radius;
    const midAngle = (angle1 + angle2) / 2;
    const ctrlX = cx + Math.cos(midAngle) * radius * 0.88;
    const ctrlY = cy + Math.sin(midAngle) * radius * 0.88;
    path += i === 0
      ? `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`
      : ` Q ${ctrlX} ${ctrlY} ${x2} ${y2}`;
  }
  return path + ' Z';
};

// ── Original center-text renderer (unchanged) ──────────────────────────────────
const renderCenterText = (cx, cy, text, isCardActive) => {
  const parts = text.split(' ');
  const fontSize  = isCardActive ? '13.5' : '11';
  const yOffset   = isCardActive ? 10 : 8;
  if (parts.length > 1) {
    return (
      <>
        <text y={cy - yOffset} x={cx} fill="#ffffff" fontSize={fontSize} fontWeight="900"
          textAnchor="middle" alignmentBaseline="middle" className="font-display tracking-wider transition-all duration-300">
          {parts[0].toUpperCase()}
        </text>
        <text y={cy + yOffset} x={cx} fill="#ffffff" fontSize={fontSize} fontWeight="900"
          textAnchor="middle" alignmentBaseline="middle" className="font-display tracking-wider transition-all duration-300">
          {parts[1].toUpperCase()}
        </text>
      </>
    );
  }
  return (
    <text y={cy} x={cx} fill="#ffffff" fontSize={isCardActive ? '12' : '10'} fontWeight="900"
      textAnchor="middle" alignmentBaseline="middle" className="font-display tracking-wider transition-all duration-300">
      {text.toUpperCase()}
    </text>
  );
};

// ── Stable star data (generated once at module load, never re-renders) ────────
const STARS = Array.from({ length: 65 }, (_, i) => ({
  x:    ((i * 17.37 + 7)  % 100).toFixed(2),
  y:    ((i * 11.73 + 3)  % 100).toFixed(2),
  size: i % 7 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
  op:   (0.10 + (i % 5) * 0.06).toFixed(2),
  blue: i % 4 === 0,
}));

// ── The spider-web SVG card (original logic, carousel-aware) ──────────────────
function WebCard({ category, webIdx, theme, children, tracksWithCourses, isCenter, onNavigate,
                   hoveredNode, setHoveredNode, hoveredParent, setHoveredParent }) {
  const width = 620, height = 620;
  const cx = width / 2, cy = height / 2;
  const rings    = [95, 162, 228, 285];
  const numSpokes = 8;

  // Place children on spokes/rings (original algorithm)
  const placedChildren = [];
  const occupied = new Set();
  children.forEach((childName, idx) => {
    let spokeIdx = (idx * 2) % 8;
    let ringIdx  = 1 + (idx % 3);
    let attempts = 0;
    while (occupied.has(`${spokeIdx}-${ringIdx}`) && attempts < 8) {
      spokeIdx = (spokeIdx + 1) % 8;
      attempts++;
    }
    occupied.add(`${spokeIdx}-${ringIdx}`);
    const angle = (spokeIdx / 8) * Math.PI * 2 - Math.PI / 2;
    const radius = rings[ringIdx];
    placedChildren.push({
      name: childName,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      spokeIdx, ringIdx, angle, radius,
      count: (tracksWithCourses[childName] || []).length,
    });
  });

  const coursesInWeb  = children.reduce((s, c) => s + (tracksWithCourses[c] || []).length, 0);
  const isParentHov   = hoveredParent === category;
  const isNodeActive  = isCenter; // only allow node interaction on center card

  return (
    <div className="relative flex flex-col items-center w-full h-full p-5">
      {/* Card top meta */}
      <div className="w-full flex justify-between items-center mb-1 z-20">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">
          WEB 0{webIdx + 1}
        </span>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-full font-mono">
          {children.length} tracks
        </span>
      </div>

      {/* Title */}
      <div className="w-full text-left mb-2 z-20">
        <h4 className="text-base font-extrabold text-white">{category}</h4>
        <p className="text-[10px] text-slate-400 font-sans mt-0.5">
          {coursesInWeb} course path{coursesInWeb === 1 ? '' : 's'} linked
        </p>
      </div>

      {/* Spider-web SVG (original) */}
      <div className="relative w-full flex-1 flex items-center justify-center overflow-visible">
        <motion.div
          className="w-full h-full flex items-center justify-center overflow-visible"
          animate={{ scale: isCenter ? 1.08 : 1.0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%"
            className="z-10 drop-shadow-md overflow-visible">
            <defs>
              <filter id={`glow-${webIdx}`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <radialGradient id={`centerGrad-${webIdx}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor={theme.stopColors[0]} />
                <stop offset="100%" stopColor={theme.stopColors[1]} />
              </radialGradient>
            </defs>

            {/* Ambient outer ring */}
            <circle cx={cx} cy={cy} r={265} fill="none" stroke={theme.primary} strokeWidth={1} opacity={0.03} />

            {/* Saggy concentric rings */}
            {rings.map((radius, rIdx) => {
              const isRingHov = hoveredNode && hoveredNode.category === category && hoveredNode.ringIdx === rIdx;
              return (
                <motion.path
                  key={`ring-${rIdx}`}
                  d={getSaggyPath(cx, cy, radius, numSpokes)}
                  fill="none"
                  stroke={theme.primary}
                  strokeWidth={isRingHov ? 3 : 1.8}
                  opacity={isRingHov ? 0.55 : 0.24}
                  filter={`url(#glow-${webIdx})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isRingHov ? 0.55 : 0.24, strokeWidth: isRingHov ? 3 : 1.8 }}
                  transition={{ duration: 1.5, delay: rIdx * 0.12 }}
                />
              );
            })}

            {/* Radial spokes */}
            {[...Array(numSpokes)].map((_, spokeIdx) => {
              const angle    = (spokeIdx / numSpokes) * Math.PI * 2 - Math.PI / 2;
              const isSpokeHov = hoveredNode && hoveredNode.category === category && hoveredNode.spokeIdx === spokeIdx;
              return (
                <motion.line
                  key={`spoke-${spokeIdx}`}
                  x1={cx} y1={cy}
                  x2={cx + Math.cos(angle) * 300}
                  y2={cy + Math.sin(angle) * 300}
                  stroke={theme.primary}
                  strokeWidth={isSpokeHov ? 3 : 1.6}
                  opacity={isSpokeHov ? 0.55 : 0.22}
                  filter={`url(#glow-${webIdx})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: isSpokeHov ? 0.55 : 0.22, strokeWidth: isSpokeHov ? 3 : 1.6 }}
                  transition={{ duration: 1.2, delay: spokeIdx * 0.06 }}
                />
              );
            })}

            {/* Drift particles */}
            {[...Array(6)].map((_, i) => (
              <motion.circle
                key={`part-${i}`}
                cx={cx + (i - 3) * 60}
                cy={cy + (i - 2.5) * 50}
                r={1.2 + (i % 2) * 0.8}
                fill={theme.particle}
                opacity={0.25}
                animate={{ x: [0, Math.sin(i) * 25, 0], y: [0, Math.cos(i) * 25, 0], opacity: [0.15, 0.5, 0.15] }}
                transition={{ duration: 5 + i * 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}

            {/* Child track nodes */}
            {placedChildren.map((node, cIdx) => {
              const isHov    = hoveredNode && hoveredNode.category === category && hoveredNode.name === node.name;
              const nodeR    = isHov ? 20 : isCenter ? 16 : 13;
              const fontSize = isHov ? '14' : isCenter ? '12' : '11';
              const rW       = isHov ? Math.max(node.name.length * 9 + 22, 88) : isCenter ? Math.max(node.name.length * 8.5 + 20, 80) : Math.max(node.name.length * 7.8 + 18, 70);
              const rH       = isHov ? 26 : isCenter ? 23 : 21;
              const lY       = isHov ? 28 : isCenter ? 24 : 21;

              return (
                <g key={`child-${node.name}-${cIdx}`}
                  className={isNodeActive ? 'cursor-pointer' : ''}
                  onClick={() => isNodeActive && onNavigate(category, node.name)}
                  onMouseEnter={() => isNodeActive && setHoveredNode({ category, ...node })}
                  onMouseLeave={() => isNodeActive && setHoveredNode(null)}
                >
                  {node.count > 0 && (
                    <circle cx={node.x} cy={node.y} r={isHov ? 19 : isCenter ? 16 : 13}
                      fill="none" stroke={theme.secondary} strokeWidth={1} opacity={0.7}
                      className="animate-ping" style={{ animationDuration: '3.5s' }}
                    />
                  )}
                  {isHov && (
                    <motion.line x1={cx} y1={cy} x2={node.x} y2={node.y}
                      stroke={theme.secondary} strokeWidth={2} opacity={0.65}
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }}
                    />
                  )}
                  <motion.circle cx={node.x} cy={node.y} r={nodeR}
                    fill={isHov ? theme.secondary : theme.primary}
                    stroke="#ffffff" strokeWidth={isCenter ? 2.0 : 1.5}
                    animate={{ filter: isHov ? `drop-shadow(0 0 10px ${theme.secondary})` : `drop-shadow(0 0 4px ${theme.primary}99)` }}
                  />
                  <g transform={`translate(${node.x}, ${node.y + lY})`}>
                    <rect x={-rW / 2} y={-rH / 2} width={rW} height={rH} rx={5}
                      fill={isHov ? 'rgba(10,15,30,0.95)' : 'rgba(15,23,42,0.75)'}
                      stroke={isHov ? theme.secondary : 'rgba(255,255,255,0.08)'} strokeWidth={1}
                    />
                    <text fill={isHov ? '#ffffff' : 'rgba(241,245,249,0.9)'}
                      fontSize={fontSize} fontWeight={isHov ? '850' : '650'}
                      textAnchor="middle" alignmentBaseline="middle" pointerEvents="none"
                      className="font-sans" y={isHov ? 2 : 0}>
                      {node.name}
                    </text>
                    {node.count > 0 && (
                      <g transform={`translate(${rW / 2 - 1}, ${-rH / 2 + 1})`}>
                        <circle r={isCenter ? 8.5 : 7.5} fill={theme.secondary}
                          stroke={isHov ? '#0a0f1e' : '#0f172a'} strokeWidth={1} />
                        <text fill="#0a0f1d" fontSize={isCenter ? '9' : '8'} fontWeight="900"
                          textAnchor="middle" alignmentBaseline="middle" pointerEvents="none" className="font-sans">
                          {node.count}
                        </text>
                      </g>
                    )}
                  </g>
                </g>
              );
            })}

            {/* Central hub disc */}
            <g className="cursor-pointer"
              onMouseEnter={() => isNodeActive && setHoveredParent(category)}
              onMouseLeave={() => isNodeActive && setHoveredParent(null)}
            >
              <circle cx={cx} cy={cy} r={isParentHov ? 58 : isCenter ? 52 : 47}
                fill={`url(#centerGrad-${webIdx})`} stroke={theme.primary} strokeWidth={2.5}
                filter={`url(#glow-${webIdx})`} style={{ opacity: 0.9, transition: 'all 0.2s ease-in-out' }}
              />
              <circle cx={cx} cy={cy} r={isParentHov ? 53 : isCenter ? 48 : 43}
                fill="#0d0f17" stroke={theme.secondary} strokeWidth={1.5} opacity={0.3}
                style={{ transition: 'all 0.2s ease-in-out' }}
              />
              {renderCenterText(cx, cy, category, isCenter)}
            </g>
          </svg>
        </motion.div>
      </div>

      {/* Bottom hint */}
      <div className="mt-1 text-[10px] text-slate-500 font-medium font-sans flex items-center gap-1">
        {isCenter ? '🎯 Click nodes to drill down' : '← click to focus'}
      </div>
    </div>
  );
}

// ── Main carousel component ────────────────────────────────────────────────────
export function ContentWeb({ trackGroups = {}, tracksWithCourses = {}, onNavigate = () => {} }) {
  const [hoveredNode,   setHoveredNode]   = useState(null);
  const [hoveredParent, setHoveredParent] = useState(null);
  const [activeIdx,     setActiveIdx]     = useState(0);

  const categories = Object.keys(trackGroups);
  const total      = categories.length || 1;

  let totalTracks = 0, totalCourses = 0;
  categories.forEach(cat => {
    (trackGroups[cat] || []).forEach(t => {
      totalTracks++;
      totalCourses += (tracksWithCourses[t] || []).length;
    });
  });

  const prev = () => { setHoveredNode(null); setActiveIdx(i => (i - 1 + total) % total); };
  const next = () => { setHoveredNode(null); setActiveIdx(i => (i + 1)         % total); };

  const getPos = (idx) => {
    const diff = ((idx - activeIdx) % total + total) % total;
    if (diff === 0)          return 'center';
    if (diff === 1)          return 'right';
    if (diff === total - 1)  return 'left';
    return 'hidden';
  };

  // CSS 3D transforms per position
  const TRANSFORMS = {
    center: {
      transform: 'translateX(-50%) translateY(-50%) scale(1) rotateY(0deg)',
      opacity: 1, zIndex: 30, filter: 'brightness(1)',
    },
    left: {
      transform: 'translateX(-138%) translateY(-50%) scale(0.76) rotateY(26deg)',
      opacity: 0.82, zIndex: 20, filter: 'brightness(0.65)',
    },
    right: {
      transform: 'translateX(38%) translateY(-50%) scale(0.76) rotateY(-26deg)',
      opacity: 0.82, zIndex: 20, filter: 'brightness(0.65)',
    },
  };

  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4 border-b border-slate-200/80 dark:border-white/5 pb-4">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            🕸️ Technology Learning Webs
          </h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Interactive roadmap hubs. Click any track node to manage its course structure.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
            {totalTracks} TRACKS
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-500/15 text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono">
            {totalCourses} COURSES
          </div>
        </div>
      </div>

      {/* ── 3D Carousel ─────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-3xl overflow-hidden"
        style={{ height: '640px', perspective: '1400px' }}
      >
        {/* Starfield background */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #0d1b2a 0%, #030810 70%, #020508 100%)' }}
        >
          {STARS.map((s, i) => (
            <div key={i} className="absolute rounded-full"
              style={{
                left: `${s.x}%`, top: `${s.y}%`,
                width: `${s.size}px`, height: `${s.size}px`,
                backgroundColor: s.blue ? '#60a5fa' : '#ffffff',
                opacity: s.op,
              }}
            />
          ))}
        </div>

        {/* ‹ Prev */}
        <button onClick={prev}
          className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(0,0,0,0.65)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(0,0,0,0.45)'; }}
        >
          <ChevronLeft size={19} />
        </button>

        {/* › Next */}
        <button onClick={next}
          className="absolute right-5 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all"
          style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.65)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(0,0,0,0.65)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'rgba(0,0,0,0.45)'; }}
        >
          <ChevronRight size={19} />
        </button>

        {/* Cards */}
        {categories.map((category, idx) => {
          const pos = getPos(idx);
          if (pos === 'hidden') return null;
          const theme    = getWebTheme(category, idx);
          const children = trackGroups[category] || [];
          const isCenter = pos === 'center';
          const t        = TRANSFORMS[pos];

          return (
            <div
              key={category}
              onClick={() => !isCenter && setActiveIdx(idx)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '430px',
                height: '580px',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.55s cubic-bezier(0.34,1.2,0.64,1), opacity 0.45s ease, filter 0.45s ease',
                cursor: isCenter ? 'default' : 'pointer',
                ...t,
              }}
            >
              {/* Card glass body */}
              <div className="w-full h-full rounded-[28px] overflow-hidden"
                style={{
                  background: isCenter
                    ? 'rgba(12,16,28,0.92)'
                    : 'rgba(8,11,20,0.80)',
                  border: isCenter
                    ? `1px solid ${theme.primary}55`
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isCenter
                    ? `0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${theme.glow}`
                    : '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                <WebCard
                  category={category}
                  webIdx={idx}
                  theme={theme}
                  children={children}
                  tracksWithCourses={tracksWithCourses}
                  isCenter={isCenter}
                  onNavigate={onNavigate}
                  hoveredNode={hoveredNode}
                  setHoveredNode={setHoveredNode}
                  hoveredParent={hoveredParent}
                  setHoveredParent={setHoveredParent}
                />
              </div>
            </div>
          );
        })}

        {/* Dot indicators */}
        <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2.5 z-50">
          {categories.map((_, idx) => (
            <button key={idx} onClick={() => setActiveIdx(idx)}
              className="rounded-full cursor-pointer transition-all duration-300"
              style={{
                height: '7px',
                width:  idx === activeIdx ? '28px' : '7px',
                backgroundColor: idx === activeIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
