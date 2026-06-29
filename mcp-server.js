/**
 * QuestAI MCP Server — Claude-native generation
 *
 * NO external API calls for generation.
 * The tool provides the prompt structure and schema to Claude,
 * Claude generates using its own model in the current session.
 * The QuestAI app gets notified for the live timer overlay.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import http from 'http';

const QUESTAI_URL = process.env.QUESTAI_URL || 'http://localhost:3000';
const MCP_SECRET  = process.env.MCP_SECRET  || 'questai-mcp-2025';

// ── TVA data ──────────────────────────────────────────────────────────────────
const TVA_CLIENTS = [
  'Parul University', 'SKG (Sri Krishna Group)',
  'Kumaraguru College of Technology', 'Rajalakshmi Engineering College',
  "St. Joseph's College of Engineering", 'LTIMindtree', 'Hexaware', 'iamneo Internal'
];

const TVA_TRACKS = [
  'DSA', 'Aptitude', 'C', 'C++', 'Java', 'Java Full Stack', 'Python', 'Python / ML',
  '.NET', 'React', 'Node.js', 'Angular', 'Vue.js', 'MySQL', 'MongoDB',
  'AWS', 'Azure', 'Docker', 'AI/ML', 'Cybersecurity', 'SDET', 'SAP', 'DAA'
];

// ── Notify QuestAI frontend (for the live timer overlay) ──────────────────────
async function notifyFrontend(jobId, topic, type, count, track, client, course, status) {
  try {
    await fetch(`${QUESTAI_URL}/api/mcp/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mcp-secret': MCP_SECRET },
      body: JSON.stringify({ jobId, topic, type, count, track, client, course, status })
    });
  } catch {
    // Frontend is optional — app might not be running
  }
}

// ── MCP Server ────────────────────────────────────────────────────────────────
const server = new McpServer({ name: 'questai', version: '3.0.0' });

// ── Tool: generate_questions ──────────────────────────────────────────────────
server.tool(
  'generate_questions',
  'Prepares a structured generation prompt for Claude to create coding or MCQ questions. Claude generates using its own model — no external API needed. The QuestAI app will show a live timer.',
  {
    topic:      z.string().describe('Topic (e.g. "Binary Search Trees", "Java Generics", "SQL Joins")'),
    type:       z.enum(['coding', 'mcq']).default('coding'),
    count:      z.number().int().min(1).max(20).default(10),
    track:      z.enum([
      'DSA','Aptitude','C','C++','Java','Java Full Stack','Python','Python / ML',
      '.NET','React','Node.js','Angular','Vue.js','MySQL','MongoDB',
      'AWS','Azure','Docker','AI/ML','Cybersecurity','SDET','SAP','DAA'
    ]).default('DSA'),
    client:     z.string().default('General'),
    course:     z.string().default('General'),
    difficulty: z.enum(['Easy','Medium','Hard']).default('Medium'),
    source:     z.enum(['non-leetcode','leetcode']).default('non-leetcode'),
  },
  async ({ topic, type, count, track, client, course, difficulty, source }) => {
    const jobId = `mcp-${Date.now()}`;

    // Notify the QuestAI app — this starts the timer overlay in the browser
    await notifyFrontend(jobId, topic, type, count, track, client, course, 'running');

    // Build the generation instruction for Claude
    const context = `Client: ${client} | Track: ${track} | Course: ${course} | Difficulty: ${difficulty}`;

    if (type === 'coding') {
      const style = source === 'leetcode'
        ? `LeetCode-inspired (set a realistic leetcodeNumber for each)`
        : `original real-world scenarios (use different domains: healthcare, banking, logistics, gaming, e-commerce)`;

      return {
        content: [{
          type: 'text',
          text: `[QuestAI timer started in browser — http://localhost:3000]
Job ID: ${jobId}

Generate exactly ${count} ${difficulty} coding challenge(s) about **"${topic}"** for the **${track}** track.
Style: ${style}
Context: ${context}

**Output format — return ONLY this JSON, no markdown fences:**
\`\`\`json
{
  "questions": [
    {
      "title": "Problem Title",
      "description": "**SCENARIO**\\n\\n[Company name + industry. What system/data is involved. What specific problem occurred. Business impact. Engineering constraints.]\\n\\n**PROBLEM STATEMENT**\\n\\n[Formal: 'Given X, compute Y.' Input description with types. Output description. Edge cases. Time/space complexity required.]",
      "difficulty": "${difficulty}",
      "tags": ["tag1", "tag2"],
      "inputFormat": "Input format description",
      "outputFormat": "Output format description",
      "sampleInput": "sample input here",
      "sampleOutput": "sample output here",
      "constraints": "1 ≤ N ≤ 10^5",
      "leetcodeNumber": null,
      "testCases": [
        {"input": "sample input 1", "output": "expected output 1", "isPublic": true},
        {"input": "sample input 2", "output": "expected output 2", "isPublic": true},
        {"input": "edge case input", "output": "edge case output", "isPublic": false},
        {"input": "stress test input", "output": "stress test output", "isPublic": false},
        {"input": "boundary input", "output": "boundary output", "isPublic": false}
      ],
      "solutions": {
        "java": "// COMPLETE Java program with main()",
        "python": "# COMPLETE Python program",
        "cpp": "// COMPLETE C++ program",
        "c": "// COMPLETE C program"
      }
    }
  ]
}
\`\`\`

Rules:
- ALL solutions must be complete, compilable programs — no stubs or placeholder comments
- Each question MUST use a different real-world domain
- testCases must have exactly 5 entries: 2 public (isPublic: true) matching sampleInput/sampleOutput, then 3 private hidden cases
- Return the JSON immediately, no preamble

After generating the JSON, call **questai.save_questions** with jobId="${jobId}", type="${type}", track="${track}", course="${course}", client="${client}", difficulty="${difficulty}", and the questions JSON string to save to QuestAI.`
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: `[QuestAI timer started in browser — http://localhost:3000]
Job ID: ${jobId}

Generate exactly ${count} ${difficulty} MCQ questions about **"${topic}"** for the **${track}** track.
Context: ${context}

**Output format — return ONLY this JSON, no markdown fences:**
\`\`\`json
{
  "questions": [
    {
      "question": "Question text here",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "answer": "A",
      "explanation": "Clear explanation of why A is correct and why others are wrong",
      "difficulty": "${difficulty}",
      "tags": ["tag1", "tag2"]
    }
  ]
}
\`\`\`

Rules:
- Test deep conceptual understanding, not memorization
- All wrong options must be plausible
- Return JSON immediately, no preamble

After generating the JSON, call **questai.save_questions** with jobId="${jobId}", type="${type}", track="${track}", course="${course}", client="${client}", difficulty="${difficulty}", and the questions JSON string to save to QuestAI.`
        }]
      };
    }
  }
);

// ── Tool: save_questions ──────────────────────────────────────────────────────
server.tool(
  'save_questions',
  'Saves Claude-generated questions to the QuestAI app and marks the generation complete (closes the timer overlay). Call this after Claude generates the JSON from generate_questions.',
  {
    jobId:      z.string().describe('The Job ID returned by generate_questions'),
    questions:  z.string().describe('The full JSON string of generated questions'),
    topic:      z.string().optional(),
    type:       z.enum(['coding', 'mcq']).default('coding'),
    track:      z.string().default('DSA'),
    course:     z.string().default('General'),
    client:     z.string().default('General'),
    difficulty: z.string().default('Medium'),
  },
  async ({ jobId, questions, topic, type, track, course, client, difficulty }) => {
    let parsed;
    try {
      const raw = JSON.parse(questions);
      parsed = raw.questions || (Array.isArray(raw) ? raw : [raw]);
    } catch {
      return { content: [{ type: 'text', text: '❌ Invalid JSON. Make sure you pass the full JSON string from the generate step.' }] };
    }

    // Save to QuestAI backend
    let saved = false;
    try {
      const resp = await fetch(`${QUESTAI_URL}/api/mcp/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mcp-secret': MCP_SECRET },
        body: JSON.stringify({ jobId, questions: parsed, topic, type, track, course, client, difficulty })
      });
      saved = resp.ok;
    } catch {
      // Server might not be running — that's OK
    }

    // Notify frontend — done (closes timer, shows results)
    await notifyFrontend(jobId, topic || 'Questions', type, parsed.length, track, client, course, 'done');

    return {
      content: [{
        type: 'text',
        text: [
          `✅ ${parsed.length} questions saved to QuestAI`,
          saved ? `📂 Open Content Bank → http://localhost:3000` : `⚠️ QuestAI server not running — questions saved in session only`,
          ``,
          `Summary:`,
          ...parsed.slice(0, 5).map((q, i) =>
            type === 'coding'
              ? `  ${i+1}. ${q.title || `Q${i+1}`} (${q.difficulty || difficulty})`
              : `  ${i+1}. ${(q.question || `Q${i+1}`).slice(0, 60)}...`
          ),
          parsed.length > 5 ? `  ... and ${parsed.length - 5} more` : ''
        ].filter(l => l !== undefined).join('\n')
      }]
    };
  }
);

// ── Tool: generate_planner ───────────────────────────────────────────────────
server.tool(
  'generate_planner',
  'Prepares a structured generation prompt for Claude to create a full content planner (weekly question sets). Attach the Excel planner file to this chat first, then call this tool.',
  {
    courseName:             z.string().describe('Course or batch name (e.g. "SKG 2026 DSA Bootcamp")'),
    track:                  z.string().default('DSA').describe('Technology track (e.g. "DSA", "Java", "Python")'),
    client:                 z.string().default('General'),
    weeks:                  z.string().describe('JSON array of {weekNumber, topic, subtopics[]} parsed from the attached Excel'),
    skillBuilderCount:      z.number().int().min(1).max(5).default(3),
    practiceAtHomeCount:    z.number().int().min(1).max(5).default(3),
    challengeYourselfCount: z.number().int().min(1).max(5).default(2),
  },
  async ({ courseName, track, client, weeks, skillBuilderCount, practiceAtHomeCount, challengeYourselfCount }) => {
    let parsedWeeks;
    try { parsedWeeks = JSON.parse(weeks); } catch {
      return { content: [{ type: 'text', text: '❌ Invalid weeks JSON. Pass a valid JSON array of {weekNumber, topic, subtopics[]}.' }] };
    }
    const jobId = `mcp-planner-${Date.now()}`;
    await notifyFrontend(jobId, courseName, 'planner', parsedWeeks.length, track, client, '', 'running');

    const totalPerWeek = skillBuilderCount + practiceAtHomeCount + challengeYourselfCount;

    return {
      content: [{
        type: 'text',
        text: `[QuestAI Planner overlay started — ${QUESTAI_URL}]
Job ID: ${jobId}

Generate a complete content planner for **"${courseName}"** (${track} · ${client}).
${parsedWeeks.length} weeks · ${totalPerWeek} questions/week (${skillBuilderCount} Easy + ${practiceAtHomeCount} Medium + ${challengeYourselfCount} Hard).

**Output ONLY this JSON — no markdown fences, no preamble:**
{
  "weeks": [
    {
      "weekNumber": 1,
      "topic": "topic name",
      "subtopics": ["sub1", "sub2"],
      "skillBuilder": {
        "questions": [
          {
            "title": "Problem Title",
            "description": "**SCENARIO**\\n\\n[context]\\n\\n**PROBLEM STATEMENT**\\n\\n[formal statement]",
            "difficulty": "Easy",
            "tags": ["tag1"],
            "inputFormat": "...", "outputFormat": "...",
            "sampleInput": "...", "sampleOutput": "...",
            "constraints": "1 ≤ N ≤ 10^5",
            "solutions": { "java": "// complete program", "python": "# complete", "cpp": "// complete", "c": "// complete" }
          }
        ]
      },
      "practiceAtHome": { "questions": [/* ${practiceAtHomeCount} Medium questions, same schema */] },
      "challengeYourself": { "questions": [/* ${challengeYourselfCount} Hard questions, same schema */] }
    }
  ]
}

Rules:
- Each week's questions MUST align with that week's topic/subtopics
- skillBuilder = Easy, practiceAtHome = Medium, challengeYourself = Hard
- ALL solutions must be complete, compilable programs
- Use different real-world domain scenarios across questions
- Return the complete JSON immediately

Weeks to generate (${parsedWeeks.length} total):
${parsedWeeks.map(w => `  Week ${w.weekNumber}: ${w.topic}${w.subtopics?.length ? ` | ${w.subtopics.slice(0,4).join(', ')}` : ''}`).join('\n')}

After generating the complete JSON, call **questai.save_planner** with jobId="${jobId}", courseName="${courseName}", track="${track}", client="${client}", and the full planner JSON string.`
      }]
    };
  }
);

// ── Tool: save_planner ────────────────────────────────────────────────────────
server.tool(
  'save_planner',
  'Saves Claude-generated content planner to QuestAI and closes the generation overlay. Call this after generating the full planner JSON from generate_planner.',
  {
    jobId:      z.string().describe('The Job ID returned by generate_planner'),
    planner:    z.string().describe('The full JSON string of the generated planner with weeks array'),
    courseName: z.string().optional(),
    track:      z.string().default('DSA'),
    client:     z.string().default('General'),
  },
  async ({ jobId, planner, courseName, track, client }) => {
    let parsed;
    try { parsed = JSON.parse(planner); } catch {
      return { content: [{ type: 'text', text: '❌ Invalid JSON. Pass the full planner JSON string from the generate step.' }] };
    }
    const weeks = parsed.weeks || (Array.isArray(parsed) ? parsed : []);
    const totalQ = weeks.reduce((s, w) =>
      s + ['skillBuilder','practiceAtHome','challengeYourself'].reduce((a, k) => a + (w[k]?.questions?.length || 0), 0), 0);

    let saved = false;
    try {
      const resp = await fetch(`${QUESTAI_URL}/api/mcp/save-planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mcp-secret': MCP_SECRET },
        body: JSON.stringify({ jobId, courseName, track, client, weeks })
      });
      saved = resp.ok;
    } catch { /* server might not be running */ }

    await notifyFrontend(jobId, courseName || 'Planner', 'planner', weeks.length, track, client, '', 'done');

    return {
      content: [{
        type: 'text',
        text: [
          `✅ ${weeks.length}-week planner saved to QuestAI (${totalQ} questions total)`,
          saved ? `📂 Open Content Planner → ${QUESTAI_URL}` : `⚠️ QuestAI server not running — saved in session only`,
          '',
          'Summary:',
          ...weeks.slice(0, 6).map(w => {
            const q = ['skillBuilder','practiceAtHome','challengeYourself'].reduce((s, k) => s + (w[k]?.questions?.length || 0), 0);
            return `  Week ${w.weekNumber}: ${w.topic} (${q}Q)`;
          }),
          weeks.length > 6 ? `  … and ${weeks.length - 6} more weeks` : ''
        ].filter(Boolean).join('\n')
      }]
    };
  }
);

// ── Tool: list_tracks ─────────────────────────────────────────────────────────
server.tool('list_tracks', 'List all QuestAI technology tracks.', {}, async () => ({
  content: [{ type: 'text', text: '# QuestAI Tracks\n\n' + TVA_TRACKS.map((t,i) => `${i+1}. ${t}`).join('\n') }]
}));

// ── Tool: list_clients ────────────────────────────────────────────────────────
server.tool('list_clients', 'List all QuestAI TVA clients.', {}, async () => ({
  content: [{ type: 'text', text: '# QuestAI Clients\n\n' + TVA_CLIENTS.map((c,i) => `${i+1}. ${c}`).join('\n') }]
}));

// ── Connect — stdio (Code tab) or HTTP (Claude.ai web) ───────────────────────
// Railway injects PORT automatically; MCP_HTTP_PORT overrides locally
const HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || process.env.PORT || '0');

if (HTTP_PORT) {
  // ── Remote HTTP mode — used by Claude.ai web chat ─────────────────────────
  const httpServer = http.createServer(async (req, res) => {
    // Health check — Railway uses this to confirm the service is up
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'questai-mcp', version: '3.0.0' }));
      return;
    }

    // CORS for Claude.ai
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Optional bearer token auth
    const token = process.env.MCP_AUTH_TOKEN;
    if (token) {
      const auth = req.headers['authorization'] || '';
      if (!auth.startsWith('Bearer ') || auth.slice(7) !== token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    }

    const transport = new StreamableHTTPServerTransport({ sessionIdHeader: 'mcp-session-id' });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(HTTP_PORT, () => {
    console.error(`[QuestAI MCP] HTTP server running on port ${HTTP_PORT}`);
    console.error(`[QuestAI MCP] Register this URL in Claude.ai → Settings → Integrations`);
  });
} else {
  // ── Local stdio mode — used by Claude Code tab ────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
