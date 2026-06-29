import React, { useEffect, useRef } from 'react';

const variantStyles = {
  default: {
    '--neon': '#5a4bff',
    '--neon-soft': '#8b7dff',
    '--neon-core': '#eceaff',
    '--draw-stroke': '#eceaff',
    '--loader-text': '#5a6080'
  },
  login: {
    '--neon': '#38bdf8',
    '--neon-soft': '#7dd3fc',
    '--neon-core': '#dbeafe',
    '--draw-stroke': '#dbeafe',
    '--loader-text': '#93c5fd'
  },
  generating: {
    '--neon': '#22c55e',
    '--neon-soft': '#86efac',
    '--neon-core': '#dcfce7',
    '--draw-stroke': '#d9f99d',
    '--loader-text': '#a7f3d0'
  }
};

export function QLoader({ label = "Loading", variant = 'default' }) {
  const drawRef = useRef(null);
  const svgRef = useRef(null);
  const style = variantStyles[variant] || variantStyles.default;

  useEffect(() => {
    try {
      if (drawRef.current && svgRef.current) {
        const len = Math.ceil(drawRef.current.getTotalLength());
        svgRef.current.style.setProperty('--len', len);
      }
    } catch (e) {
      console.warn("Failed to set SVG path length property", e);
    }
  }, []);

  return (
    <div className="ql-loader" style={style}>
      <svg ref={svgRef} className="ql-bolt-svg" viewBox="0 0 128 210" aria-label="Loading" role="img">
        <path className="ql-pulse p1" d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
        <path className="ql-pulse p2" d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
        <path className="ql-track"   d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
        <path className="ql-fill"    d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
        <path ref={drawRef} className="ql-draw" d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
      </svg>
      <span className="ql-loader-label" style={{ color: 'var(--loader-text)' }}>{label}</span>
    </div>
  );
}
