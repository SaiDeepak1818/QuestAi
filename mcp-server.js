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
import crypto from 'crypto';

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

// ── Factory: create a fresh McpServer with all tools registered ───────────────
// One instance per session for correct HTTP session isolation.
function buildServer() {
  const s = new McpServer({ name: 'questai', version: '3.0.0' });

  // ── Tool: generate_questions ──────────────────────────────────────────────
  s.tool(
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
      await notifyFrontend(jobId, topic, type, count, track, client, course, 'running');
      const context = `Client: ${client} | Track: ${track} | Course: ${course} | Difficulty: ${difficulty}`;

      if (type === 'coding') {
        const style = source === 'leetcode'
          ? `LeetCode-inspired (set a realistic leetcodeNumber for each)`
          : `original real-world scenarios (use different domains: healthcare, banking, logistics, gaming, e-commerce)`;

        return {
          content: [{
            type: 'text',
            text: `[QuestAI timer started — ${QUESTAI_URL}]
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
        {"input": "sample input variation", "output": "expected output variation", "isPublic": true},
        {"input": "edge case 1", "output": "edge output 1", "isPublic": false},
        {"input": "edge case 2", "output": "edge output 2", "isPublic": false},
        {"input": "edge case 3", "output": "edge output 3", "isPublic": false},
        {"input": "stress test 1", "output": "stress output 1", "isPublic": false},
        {"input": "stress test 2", "output": "stress output 2", "isPublic": false},
        {"input": "stress test 3", "output": "stress output 3", "isPublic": false},
        {"input": "boundary min", "output": "boundary min output", "isPublic": false},
        {"input": "boundary max", "output": "boundary max output", "isPublic": false},
        {"input": "large input 1", "output": "large output 1", "isPublic": false},
        {"input": "large input 2", "output": "large output 2", "isPublic": false},
        {"input": "special case 1", "output": "special output 1", "isPublic": false},
        {"input": "special case 2", "output": "special output 2", "isPublic": false}
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
- testCases MUST have exactly 15 entries: first 3 public (isPublic: true, match sampleInput/sampleOutput + one variation), then 12 private (isPublic: false) covering edge cases, stress tests, boundary values, special cases
- Return the JSON immediately, no preamble

After generating the JSON, call **questai.save_questions** with jobId="${jobId}", type="${type}", track="${track}", course="${course}", client="${client}", difficulty="${difficulty}", and the questions JSON string to save to QuestAI.`
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: `[QuestAI timer started — ${QUESTAI_URL}]
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

  // ── Tool: save_questions ──────────────────────────────────────────────────
  s.tool(
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

      let saved = false;
      try {
        const resp = await fetch(`${QUESTAI_URL}/api/mcp/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-mcp-secret': MCP_SECRET },
          body: JSON.stringify({ jobId, questions: parsed, topic, type, track, course, client, difficulty })
        });
        saved = resp.ok;
      } catch { /* server might not be running */ }

      await notifyFrontend(jobId, topic || 'Questions', type, parsed.length, track, client, course, 'done');

      return {
        content: [{
          type: 'text',
          text: [
            `✅ ${parsed.length} questions saved to QuestAI`,
            saved ? `📂 Open Content Bank → ${QUESTAI_URL}` : `⚠️ QuestAI server not running — questions saved in session only`,
            '',
            'Summary:',
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

  // ── Tool: generate_planner ────────────────────────────────────────────────
  s.tool(
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

  // ── Tool: save_planner ────────────────────────────────────────────────────
  s.tool(
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

  // ── Tool: list_tracks ─────────────────────────────────────────────────────
  s.tool('list_tracks', 'List all QuestAI technology tracks.', {}, async () => ({
    content: [{ type: 'text', text: '# QuestAI Tracks\n\n' + TVA_TRACKS.map((t,i) => `${i+1}. ${t}`).join('\n') }]
  }));

  // ── Tool: list_clients ────────────────────────────────────────────────────
  s.tool('list_clients', 'List all QuestAI TVA clients.', {}, async () => ({
    content: [{ type: 'text', text: '# QuestAI Clients\n\n' + TVA_CLIENTS.map((c,i) => `${i+1}. ${c}`).join('\n') }]
  }));

  return s;
}

// ── OAuth 2.0 in-memory stores ────────────────────────────────────────────────
const oauthClients = new Map();   // clientId → { redirectUris }
const oauthCodes   = new Map();   // code     → { clientId, redirectUri, codeChallenge, expiresAt }
const oauthTokens  = new Map();   // token    → { clientId, createdAt }

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'https://questai-mcp.onrender.com';

const readBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => resolve(data));
  req.on('error', reject);
});

// ── Connect — stdio (Claude Code tab) or HTTP (Claude.ai web) ─────────────────
const HTTP_PORT = parseInt(process.env.MCP_HTTP_PORT || process.env.PORT || '0');

if (HTTP_PORT) {
  // sessionId → { transport: StreamableHTTPServerTransport, createdAt: number }
  const sessions = new Map();

  // Prune sessions older than 1 hour every 10 minutes
  setInterval(() => {
    const cutoff = Date.now() - 3_600_000;
    for (const [id, { createdAt }] of sessions) {
      if (createdAt < cutoff) sessions.delete(id);
    }
  }, 600_000).unref();

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, MCP_SERVER_URL);

    // CORS — required for browser-based Claude.ai calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'questai-mcp', version: '3.0.0', sessions: sessions.size }));
      return;
    }

    // ── OAuth metadata discovery ──────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-authorization-server') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        issuer: MCP_SERVER_URL,
        authorization_endpoint: `${MCP_SERVER_URL}/oauth/authorize`,
        token_endpoint:         `${MCP_SERVER_URL}/oauth/token`,
        registration_endpoint:  `${MCP_SERVER_URL}/oauth/register`,
        response_types_supported:            ['code'],
        grant_types_supported:               ['authorization_code'],
        code_challenge_methods_supported:    ['S256'],
        token_endpoint_auth_methods_supported: ['none']
      }));
      return;
    }

    // ── Dynamic Client Registration ───────────────────────────────────────────
    if (req.method === 'POST' && url.pathname === '/oauth/register') {
      try {
        const body = JSON.parse(await readBody(req));
        const clientId = `qai_${crypto.randomUUID().replace(/-/g, '')}`;
        oauthClients.set(clientId, { redirectUris: body.redirect_uris || [] });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          client_id:                   clientId,
          client_name:                 body.client_name || 'Claude',
          redirect_uris:               body.redirect_uris || [],
          token_endpoint_auth_method:  'none',
          grant_types:                 ['authorization_code'],
          response_types:              ['code']
        }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_request' }));
      }
      return;
    }

    // ── Authorization endpoint — auto-approve ─────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/oauth/authorize') {
      const clientId      = url.searchParams.get('client_id');
      const redirectUri   = url.searchParams.get('redirect_uri');
      const state         = url.searchParams.get('state');
      const codeChallenge = url.searchParams.get('code_challenge');
      const code = crypto.randomUUID();
      oauthCodes.set(code, { clientId, redirectUri, codeChallenge, expiresAt: Date.now() + 300_000 });
      const redirect = new URL(redirectUri);
      redirect.searchParams.set('code', code);
      if (state) redirect.searchParams.set('state', state);
      res.writeHead(302, { Location: redirect.toString() });
      res.end();
      return;
    }

    // ── Token endpoint ────────────────────────────────────────────────────────
    if (req.method === 'POST' && url.pathname === '/oauth/token') {
      try {
        const raw    = await readBody(req);
        const params = raw.startsWith('{') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
        const code   = params.code;
        const entry  = oauthCodes.get(code);
        if (!entry || Date.now() > entry.expiresAt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid_grant' }));
          return;
        }
        oauthCodes.delete(code);
        const token = crypto.randomUUID();
        oauthTokens.set(token, { clientId: entry.clientId, createdAt: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: token, token_type: 'Bearer', expires_in: 86400 }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_request' }));
      }
      return;
    }

    // ── MCP requests — require valid OAuth Bearer token ───────────────────────
    const authHeader  = req.headers['authorization'] || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!bearerToken || !oauthTokens.has(bearerToken)) {
      res.writeHead(401, {
        'Content-Type':    'application/json',
        'WWW-Authenticate': 'Bearer realm="QuestAI MCP"'
      });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // ── Session routing ───────────────────────────────────────────────────────
    const sessionId = req.headers['mcp-session-id'];

    if (sessionId && sessions.has(sessionId)) {
      // Reuse existing transport for this session
      const { transport } = sessions.get(sessionId);
      try {
        await transport.handleRequest(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'session_error' }));
        }
        sessions.delete(sessionId);
      }
      return;
    }

    // ── New session — create fresh server + transport pair ────────────────────
    const transport = new StreamableHTTPServerTransport({ sessionIdHeader: 'mcp-session-id' });
    const mcpServer = buildServer();

    // Save session BEFORE handleRequest so later requests can find it
    if (transport.sessionId) {
      sessions.set(transport.sessionId, { transport, createdAt: Date.now() });
      transport.onclose = () => sessions.delete(transport.sessionId);
    }

    await mcpServer.connect(transport);

    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'mcp_error' }));
      }
      if (transport.sessionId) sessions.delete(transport.sessionId);
    }
  });

  httpServer.listen(HTTP_PORT, () => {
    console.error(`[QuestAI MCP] HTTP server listening on port ${HTTP_PORT}`);
    console.error(`[QuestAI MCP] OAuth discovery → ${MCP_SERVER_URL}/.well-known/oauth-authorization-server`);
  });

} else {
  // ── Local stdio mode — used by Claude Code ────────────────────────────────
  const s = buildServer();
  const transport = new StdioServerTransport();
  await s.connect(transport);
}
