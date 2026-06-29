/**
 * plannerQCPdf.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Generates a "Content Quality & Alignment Check" PDF after a planner run.
 * Uses jsPDF (already in package.json). No server needed — fully client-side.
 *
 * Quality metrics checked per week:
 *   1. Completeness  — did we get the expected number of questions per section?
 *   2. Coverage      — does question content mention the week's topic/subtopics?
 *   3. Difficulty    — are the three difficulty tiers correctly labeled?
 */

import { jsPDF } from 'jspdf';

// ── Colours (hex, no alpha) ────────────────────────────────────────────────────
const C = {
  bg:        [7,   3,  19],   // #070313
  surface:  [21,  12,  51],   // #150c33
  primary:  [37, 99, 235],    // #2563eb
  accent:   [34, 197, 94],    // #22c55e
  warn:     [245, 158, 11],   // #f59e0b
  danger:   [239, 68, 68],    // #ef4444
  white:    [255, 255, 255],
  muted:    [148, 163, 184],  // slate-400
  dim:      [51,  65,  85],   // slate-700
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function setFill(doc, rgb)   { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
function setDraw(doc, rgb)   { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }
function setFont(doc, rgb)   { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }

// Calculate keyword coverage: how many of the topic/subtopic keywords appear
// in question titles + descriptions?
function coverageScore(week) {
  const keywords = [
    week.topic,
    ...(week.subtopics || [])
  ]
    .join(' ')
    .toLowerCase()
    .split(/[\s,;./]+/)
    .filter(w => w.length > 3);

  if (!keywords.length) return 100;

  const allText = ['skillBuilder', 'practiceAtHome', 'challengeYourself']
    .flatMap(k => (week[k]?.questions || []))
    .map(q => `${q.title || ''} ${q.description || ''}`.toLowerCase())
    .join(' ');

  if (!allText.trim()) return 0;

  const matched = keywords.filter(kw => allText.includes(kw));
  return Math.round((matched.length / keywords.length) * 100);
}

// Section counts for a week
function weekCounts(week) {
  return {
    sb: week.skillBuilder?.questions?.length    || 0,
    pa: week.practiceAtHome?.questions?.length  || 0,
    cy: week.challengeYourself?.questions?.length || 0,
  };
}

// Status label + colour based on total questions and coverage
function weekStatus(counts, coverage, expectedSB, expectedPA, expectedCY) {
  const total    = counts.sb + counts.pa + counts.cy;
  const expected = expectedSB + expectedPA + expectedCY;
  if (total === 0)                                return { label: 'FAILED',   color: C.danger };
  if (total < expected || coverage < 50)          return { label: 'PARTIAL',  color: C.warn   };
  if (coverage >= 80)                             return { label: 'EXCELLENT', color: C.accent };
  return                                                 { label: 'OK',       color: C.primary };
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generatePlannerQCPdf({
  courseName,
  track,
  weeks = [],
  skillBuilderCount    = 3,
  practiceAtHomeCount  = 3,
  challengeYourselfCount = 2,
}) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW   = doc.internal.pageSize.getWidth();   // 210
  const PH   = doc.internal.pageSize.getHeight();  // 297
  const MARGIN = 14;
  const CW     = PW - MARGIN * 2;                  // content width
  let   y      = MARGIN;

  // ── Background ──────────────────────────────────────────────────────────────
  setFill(doc, C.bg);
  doc.rect(0, 0, PW, PH, 'F');

  // ── Page helper: add new page with bg ───────────────────────────────────────
  const newPage = () => {
    doc.addPage();
    setFill(doc, C.bg);
    doc.rect(0, 0, PW, PH, 'F');
    y = MARGIN;
  };

  // Ensure we have room; if not, add a new page
  const ensureSpace = (needed) => {
    if (y + needed > PH - MARGIN) newPage();
  };

  // ── Header band ─────────────────────────────────────────────────────────────
  setFill(doc, C.primary);
  doc.rect(0, 0, PW, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setFont(doc, C.white);
  doc.text('⚡  QUESTAI  ·  Content Quality & Alignment Report', MARGIN, 10);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setFont(doc, [200, 220, 255]);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`, MARGIN, 17);
  y = 32;

  // ── Title block ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setFont(doc, C.white);
  doc.text(courseName || 'Untitled Planner', MARGIN, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setFont(doc, C.muted);
  doc.text(`Track: ${track || '—'}   ·   ${weeks.length} week${weeks.length !== 1 ? 's' : ''}`, MARGIN, y);
  y += 10;

  // ── Summary stats bar ───────────────────────────────────────────────────────
  const totalQ = weeks.reduce((s, w) => {
    const c = weekCounts(w);
    return s + c.sb + c.pa + c.cy;
  }, 0);
  const successWeeks = weeks.filter(w => {
    const c = weekCounts(w);
    return (c.sb + c.pa + c.cy) > 0;
  }).length;
  const avgCoverage = weeks.length
    ? Math.round(weeks.reduce((s, w) => s + coverageScore(w), 0) / weeks.length)
    : 0;

  const stats = [
    { label: 'Total Questions', value: totalQ },
    { label: 'Weeks Completed', value: `${successWeeks}/${weeks.length}` },
    { label: 'Avg Coverage',    value: `${avgCoverage}%` },
    { label: 'Skill Builder',   value: weeks.reduce((s,w)=>s+(w.skillBuilder?.questions?.length||0),0) },
    { label: 'Practice Home',   value: weeks.reduce((s,w)=>s+(w.practiceAtHome?.questions?.length||0),0) },
    { label: 'Challenge',       value: weeks.reduce((s,w)=>s+(w.challengeYourself?.questions?.length||0),0) },
  ];

  const SW = CW / stats.length;
  stats.forEach((s, i) => {
    const sx = MARGIN + i * SW;
    setFill(doc, C.surface);
    doc.roundedRect(sx, y, SW - 2, 18, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setFont(doc, C.primary);
    doc.text(String(s.value), sx + SW / 2 - 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    setFont(doc, C.muted);
    doc.text(s.label, sx + SW / 2 - 2, y + 14, { align: 'center' });
  });
  y += 24;

  // ── Section header helper ────────────────────────────────────────────────────
  const sectionHeader = (title) => {
    ensureSpace(12);
    setFill(doc, C.dim);
    doc.rect(MARGIN, y, CW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setFont(doc, C.primary);
    doc.text(title.toUpperCase(), MARGIN + 3, y + 5.5);
    y += 12;
  };

  // ── Per-week table ───────────────────────────────────────────────────────────
  sectionHeader('Week-by-Week Alignment Check');

  // Table header row
  const cols = [
    { label: 'WK',     w: 10 },
    { label: 'TOPIC',  w: 52 },
    { label: 'SB',     w: 12 },
    { label: 'PA',     w: 12 },
    { label: 'CY',     w: 12 },
    { label: 'TOTAL',  w: 16 },
    { label: 'COVER',  w: 18 },
    { label: 'STATUS', w: 22 },
  ];
  const totalColW = cols.reduce((s, c) => s + c.w, 0);
  const colScale  = CW / totalColW;

  const drawTableRow = (cells, rowY, isBg, bgColor) => {
    if (isBg) {
      setFill(doc, bgColor || C.surface);
      doc.rect(MARGIN, rowY, CW, 7.5, 'F');
    }
    let cx = MARGIN;
    cells.forEach((cell, ci) => {
      const cw = cols[ci].w * colScale;
      doc.setFont('helvetica', cell.bold ? 'bold' : 'normal');
      doc.setFontSize(7);
      setFont(doc, cell.color || C.white);
      const txt = String(cell.text ?? '').substring(0, 30);
      doc.text(txt, cx + 2, rowY + 5);
      cx += cw;
    });
  };

  // Header
  setFill(doc, C.primary);
  doc.rect(MARGIN, y, CW, 7.5, 'F');
  let hx = MARGIN;
  cols.forEach(col => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setFont(doc, C.white);
    doc.text(col.label, hx + 2, y + 5);
    hx += col.w * colScale;
  });
  y += 8;

  // Data rows
  weeks.forEach((week, i) => {
    ensureSpace(9);
    const counts   = weekCounts(week);
    const total    = counts.sb + counts.pa + counts.cy;
    const coverage = coverageScore(week);
    const status   = weekStatus(counts, coverage, skillBuilderCount, practiceAtHomeCount, challengeYourselfCount);
    const coverColor = coverage >= 80 ? C.accent : coverage >= 50 ? C.warn : C.danger;

    drawTableRow([
      { text: `W${week.weekNumber}`,  bold: true, color: C.primary },
      { text: week.topic || '—' },
      { text: counts.sb,  color: counts.sb  >= skillBuilderCount    ? C.accent : C.warn },
      { text: counts.pa,  color: counts.pa  >= practiceAtHomeCount  ? C.accent : C.warn },
      { text: counts.cy,  color: counts.cy  >= challengeYourselfCount ? C.accent : C.warn },
      { text: total, bold: true },
      { text: `${coverage}%`, color: coverColor },
      { text: status.label, bold: true, color: status.color },
    ], y, true, i % 2 === 0 ? C.surface : C.bg);
    y += 8;
  });

  y += 6;

  // ── Difficulty distribution ──────────────────────────────────────────────────
  ensureSpace(60);
  sectionHeader('Difficulty Distribution');

  const diffCounts = { Easy: 0, Medium: 0, Hard: 0 };
  weeks.forEach(w => {
    ['skillBuilder', 'practiceAtHome', 'challengeYourself'].forEach(k => {
      (w[k]?.questions || []).forEach(q => {
        const d = q.difficulty || '';
        if (d === 'Easy') diffCounts.Easy++;
        else if (d === 'Medium') diffCounts.Medium++;
        else if (d === 'Hard') diffCounts.Hard++;
      });
    });
  });

  const diffTotal  = diffCounts.Easy + diffCounts.Medium + diffCounts.Hard || 1;
  const diffColors = { Easy: C.accent, Medium: C.warn, Hard: C.danger };
  const diffLabels = ['Easy', 'Medium', 'Hard'];
  const BAR_H = 10;
  const BAR_W = CW;

  diffLabels.forEach(label => {
    ensureSpace(BAR_H + 6);
    const pct = diffCounts[label] / diffTotal;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setFont(doc, C.muted);
    doc.text(`${label}`, MARGIN, y + 7);
    const barX = MARGIN + 22;
    const barW = CW - 22 - 28;
    setFill(doc, C.dim);
    doc.rect(barX, y, barW, BAR_H, 'F');
    setFill(doc, diffColors[label]);
    doc.rect(barX, y, barW * pct, BAR_H, 'F');
    setFont(doc, C.white);
    doc.text(`${diffCounts[label]} (${Math.round(pct*100)}%)`, barX + barW + 3, y + 7);
    y += BAR_H + 5;
  });

  y += 4;

  // ── Coverage details (per week) ──────────────────────────────────────────────
  ensureSpace(16);
  sectionHeader('Topic Coverage Detail');

  weeks.forEach(week => {
    ensureSpace(12);
    const coverage = coverageScore(week);
    const barW     = CW - 50;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setFont(doc, C.white);
    doc.text(`W${week.weekNumber} ${(week.topic || '').substring(0,35)}`, MARGIN, y + 5);
    setFill(doc, C.dim);
    doc.rect(MARGIN + 52, y, barW, 6, 'F');
    const cColor = coverage >= 80 ? C.accent : coverage >= 50 ? C.warn : C.danger;
    setFill(doc, cColor);
    doc.rect(MARGIN + 52, y, barW * (coverage / 100), 6, 'F');
    setFont(doc, C.white);
    doc.setFontSize(6);
    doc.text(`${coverage}%`, MARGIN + 52 + barW + 2, y + 4.5);
    y += 9;
  });

  y += 4;

  // ── Answer Key ──────────────────────────────────────────────────────────────
  const SECTION_LABELS = { skillBuilder: 'Skill Builder', practiceAtHome: 'Practice at Home', challengeYourself: 'Challenge Yourself' };
  const SECTION_COLORS = { skillBuilder: C.accent, practiceAtHome: C.warn, challengeYourself: C.danger };

  let hasAnswers = false;
  weeks.forEach(w => {
    ['skillBuilder', 'practiceAtHome', 'challengeYourself'].forEach(k => {
      if ((w[k]?.questions || []).some(q => q.solution || q.explanation || q.answer)) hasAnswers = true;
    });
  });

  if (hasAnswers) {
    ensureSpace(20);
    sectionHeader('Answer Key');

    weeks.forEach(week => {
      ['skillBuilder', 'practiceAtHome', 'challengeYourself'].forEach(section => {
        const qs = week[section]?.questions || [];
        if (!qs.length) return;

        qs.forEach((q, qi) => {
          const solution = q.solution || q.explanation || q.answer || '';
          if (!solution) return;

          // Question header row
          ensureSpace(12);
          setFill(doc, C.surface);
          doc.rect(MARGIN, y, CW, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          setFont(doc, SECTION_COLORS[section] || C.primary);
          const tag = `W${week.weekNumber} · ${SECTION_LABELS[section]} · Q${qi + 1}`;
          doc.text(tag, MARGIN + 2, y + 5.5);
          const diffLabel = q.difficulty ? ` [${q.difficulty}]` : '';
          setFont(doc, C.muted);
          doc.text(diffLabel, MARGIN + 2 + doc.getTextWidth(tag) + 2, y + 5.5);
          y += 9;

          // Question title
          if (q.title || q.problem) {
            ensureSpace(8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            setFont(doc, C.white);
            const titleLines = doc.splitTextToSize(String(q.title || q.problem || '').substring(0, 120), CW - 4);
            titleLines.slice(0, 2).forEach(line => {
              ensureSpace(7);
              doc.text(line, MARGIN + 2, y + 5);
              y += 6;
            });
          }

          // Solution / code
          const solLines = String(solution).split('\n').filter(l => l.trim()).slice(0, 28);
          doc.setFont('courier', 'normal');
          doc.setFontSize(6);
          setFont(doc, C.accent);
          solLines.forEach(line => {
            ensureSpace(6);
            const truncated = line.length > 90 ? line.substring(0, 90) + '…' : line;
            doc.text(truncated, MARGIN + 3, y + 4.5);
            y += 5.5;
          });

          y += 3;
        });
      });
    });
  }

  // ── Footer on last page ──────────────────────────────────────────────────────
  const lastY = PH - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  setFont(doc, C.dim);
  doc.text(
    `QuestAI · Planner Quality Report · ${new Date().toLocaleString('en-IN')}`,
    PW / 2, lastY,
    { align: 'center' }
  );

  // ── Output ───────────────────────────────────────────────────────────────────
  const filename = `${(courseName||'planner').replace(/\s+/g,'-')}-QC-${Date.now()}.pdf`;
  return { blob: doc.output('blob'), filename };
}
