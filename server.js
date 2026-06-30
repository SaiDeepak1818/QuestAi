import express from "express";
import path from "path";
import mongoose from "mongoose";
import Groq from "groq-sdk";

import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import * as XLSX from 'xlsx';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET    = process.env.JWT_SECRET    || 'dev-secret-key-change-in-production';
const TVA_AUTH_URL  = (process.env.TVA_AUTH_URL || 'https://backend-timesheet.neoqlabs.com').replace(/\/+$/, '');
const BCRYPT_ROUNDS = 10;

// MongoDB Connection Setup
async function connectToMongoDB() {
  const customUri = process.env.MONGODB_URI;
  let uriToUse = customUri;

  if (!uriToUse) {
    console.warn("MONGODB_URI not configured. Running in offline/demo mode. Some features will be limited.");
    return;
  }

  // Handle placeholders like '<deepudama1818_db_user >' or '<password>' inside the URI
  if (uriToUse.includes("<") || uriToUse.includes(">")) {
    console.warn("MONGODB_URI contains angular brackets or placeholders. Sanitizing...");
    uriToUse = uriToUse
      .replace(/<deepudama1818_db_user\s*>/g, "deepudama1818_db_user")
      .replace(/<password>/g, "x6k1E4rSKAa2emer")
      .replace(/<[^>]+>/g, ""); // Strip other bracketed placeholders safely
  }

  const maskedUri = uriToUse.replace(/:([^@]+)@/, ":****@");
  console.log(`Connecting to MongoDB of target: ${maskedUri}`);

  try {
    await mongoose.connect(uriToUse, {
      serverSelectionTimeoutMS: 5000 // Timeout early to prevent blocking
    });
    console.log("Connected to MongoDB Atlas successfully.");
  } catch (err) {
    console.error("MongoDB Atlas connection failure:", err.message);
    console.warn("Application will start successfully without database tracking. Features will degrade gracefully.");
  }
}

connectToMongoDB();

mongoose.connection.on('error', err => {
  console.error('MongoDB runtime error:', err);
});

// Schemas
const GenerationSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  topic: String,
  type: String, // 'coding' | 'mcq'
  timestamp: { type: Date, default: Date.now },
  questions: Array,
  client: String,
  stack: String,
  domain: String,
  track: String,
  course: String,
  difficulty: String
});

const Generation = mongoose.model("Generation", GenerationSchema);

// User schema — supports both local auth and TVA timesheet auth
const UserSchema = new mongoose.Schema({
  username:     { type: String, unique: true },   // employeeId from TVA, or custom
  passwordHash: String,
  displayName:  String,
  // TVA Timesheet profile fields (populated on TVA login, auto-synced each session)
  employeeId:   { type: String, default: null },
  email:        { type: String, default: null },
  tvaRole:      { type: String, default: 'employee' }, // admin|teamlead|employee|programmanager|hr
  teamLead:     { type: String, default: null },
  tvaProfile:   { type: mongoose.Schema.Types.Mixed, default: null },
  createdAt:    { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Course schema to persist created tracks/courses
const CourseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  track: String,
  name: String,
  createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', CourseSchema);

// Format template schema — per-track, per-type, per-user customizable output structure
const FormatTemplateSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  track:  { type: String, required: true },
  course: { type: String, default: '' },
  type:   { type: String, enum: ['coding', 'mcq'], required: true },
  format: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});
const FormatTemplate = mongoose.model('FormatTemplate', FormatTemplateSchema);

// Planner schema — weekly content plan generated from Excel uploads
const PlannerWeekSchema = new mongoose.Schema({
  weekNumber: Number,
  weekLabel:  String,
  topic:      String,
  subtopics:  [String],
  additionalContext: String,
  skillBuilder:      { questions: { type: Array, default: [] } },
  practiceAtHome:    { questions: { type: Array, default: [] } },
  challengeYourself: { questions: { type: Array, default: [] } }
}, { _id: false });

const PlannerSchema = new mongoose.Schema({
  userId:                 mongoose.Schema.Types.ObjectId,
  courseName:             { type: String, required: true },
  track:                  String,
  plannerFile:            String,
  skillBuilderCount:      { type: Number, default: 3 },
  practiceAtHomeCount:    { type: Number, default: 3 },
  challengeYourselfCount: { type: Number, default: 2 },
  weeks:    [PlannerWeekSchema],
  createdAt: { type: Date, default: Date.now }
});
const Planner = mongoose.model('Planner', PlannerSchema);

// ── Per-user encrypted API key storage ────────────────────────────────────────
const UserApiKeySchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, required: true },
  provider:     { type: String, enum: ['groq', 'openai', 'anthropic', 'gemini', 'mistral', 'deepseek', 'nvidia'], required: true },
  encryptedKey: { type: String, required: true },
  iv:           { type: String, required: true },
  authTag:      { type: String, required: true },
  model:        { type: String, default: '' },
  updatedAt:    { type: Date,   default: Date.now }
});
UserApiKeySchema.index({ userId: 1, provider: 1 }, { unique: true });
const UserApiKey = mongoose.model('UserApiKey', UserApiKeySchema);

// ── Per-user token usage tracking (today's consumption per provider) ──────────
const TokenUsageSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, required: true },
  provider:     { type: String, required: true },
  date:         { type: String, required: true }, // 'YYYY-MM-DD' UTC
  tokensUsed:   { type: Number, default: 0 },
  requestCount: { type: Number, default: 0 },
  updatedAt:    { type: Date,   default: Date.now }
});
TokenUsageSchema.index({ userId: 1, provider: 1, date: 1 }, { unique: true });
const TokenUsage = mongoose.model('TokenUsage', TokenUsageSchema);

const dbConnected = () => mongoose.connection.readyState === 1;

// ── Encryption helpers (AES-256-GCM) ─────────────────────────────────────────

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET || 'questai-dev-secret-change-in-prod';
  return crypto.scryptSync(secret, 'questai-salt-v1', 32);
}

function encryptApiKey(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

function decryptApiKey(encryptedKey, ivBase64, authTagBase64) {
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedKey, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

// ── JSON cleaner — fixes unescaped newlines/tabs inside JSON string values ─────
// Groq (and some other models) sometimes emit actual \n characters inside string
// values instead of the two-character escape sequence \\n, making the JSON invalid.
// This function walks the raw string character-by-character and escapes any bare
// control characters that appear inside a quoted string.
function sanitiseJsonStrings(raw) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { esc = true; out += ch; continue; }
    if (ch === '"') { inStr = !inStr; out += ch; continue; }
    if (inStr) {
      if      (ch === '\n') { out += '\\n';  continue; }
      else if (ch === '\r') { out += '\\r';  continue; }
      else if (ch === '\t') { out += '\\t';  continue; }
    }
    out += ch;
  }
  return out;
}

// ── Unified AI caller — Groq / OpenAI / Anthropic ────────────────────────────

async function callAI({ provider = 'groq', model, apiKey, systemPrompt, userPrompt, maxTokens = 8000 }) {
  // ── OpenAI ────────────────────────────────────────────────────────────────
  if (provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: maxTokens
    });
    const content = sanitiseJsonStrings(resp.choices[0].message.content);
    return { content, usage: { inputTokens: resp.usage?.prompt_tokens||0, outputTokens: resp.usage?.completion_tokens||0, totalTokens: resp.usage?.total_tokens||0 } };
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const resp = await client.messages.create({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: maxTokens,
      system: systemPrompt + '\n\nCRITICAL: Return ONLY a raw valid JSON object. No markdown fences, no preamble, no explanation — just the JSON.',
      messages: [{ role: 'user', content: userPrompt }]
    });
    const text = resp.content[0].text.trim();
    // Strip any accidental markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const content = sanitiseJsonStrings(jsonMatch ? jsonMatch[0] : text);
    return { content, usage: { inputTokens: resp.usage?.input_tokens||0, outputTokens: resp.usage?.output_tokens||0, totalTokens: (resp.usage?.input_tokens||0)+(resp.usage?.output_tokens||0) } };
  }

  // ── OpenAI-compatible providers (Gemini, Mistral, DeepSeek, NVIDIA) ───────
  const COMPAT_CONFIGS = {
    gemini:   { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', defaultModel: 'gemini-1.5-flash',             jsonMode: true  },
    mistral:  { baseURL: 'https://api.mistral.ai/v1',                                defaultModel: 'mistral-small-latest',          jsonMode: true  },
    deepseek: { baseURL: 'https://api.deepseek.com',                                 defaultModel: 'deepseek-chat',                 jsonMode: true  },
    nvidia:   { baseURL: 'https://integrate.api.nvidia.com/v1',                      defaultModel: 'meta/llama-3.1-70b-instruct',  jsonMode: false },
  };

  if (COMPAT_CONFIGS[provider]) {
    const { default: OpenAI } = await import('openai');
    const cfg = COMPAT_CONFIGS[provider];
    const client = new OpenAI({ apiKey, baseURL: cfg.baseURL });
    const createArgs = {
      model:       model || cfg.defaultModel,
      messages:    [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7,
      max_tokens:  maxTokens,
    };
    if (cfg.jsonMode) createArgs.response_format = { type: 'json_object' };
    const resp = await client.chat.completions.create(createArgs);
    const raw = resp.choices[0].message.content.trim();
    const usage = { inputTokens: resp.usage?.prompt_tokens||0, outputTokens: resp.usage?.completion_tokens||0, totalTokens: resp.usage?.total_tokens||0 };
    if (!cfg.jsonMode) {
      const m = raw.match(/\{[\s\S]*\}/);
      return { content: sanitiseJsonStrings(m ? m[0] : raw), usage };
    }
    return { content: sanitiseJsonStrings(raw), usage };
  }

  // ── Groq (default) ────────────────────────────────────────────────────────
  // NOTE: We intentionally do NOT use response_format: { type: 'json_object' }
  // because Groq's validator rejects any JSON string value that contains an
  // actual newline character (common in multi-line code solutions), returning
  // 400 json_validate_failed even when the content is semantically correct.
  // Instead we strip markdown fences and fix bare control characters ourselves.
  const { default: Groq } = await import('groq-sdk');
  const client = new Groq({ apiKey });
  const resp = await client.chat.completions.create({
    model: model || 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt + '\n\nIMPORTANT: Return ONLY a raw JSON object starting with { and ending with }. No markdown code fences, no preamble, no explanation.' },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: maxTokens
  });
  const raw = resp.choices[0].message.content.trim();
  // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  // Extract the outermost JSON object/array
  const jsonMatch = stripped.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : stripped;
  // Fix bare newlines/tabs inside string values
  const usage = { inputTokens: resp.usage?.prompt_tokens||0, outputTokens: resp.usage?.completion_tokens||0, totalTokens: resp.usage?.total_tokens||0 };
  return { content: sanitiseJsonStrings(jsonStr), usage };
}

// ── Get user's decrypted API key (falls back to server env key for Groq) ──────

async function getUserApiKey(userId, provider) {
  if (dbConnected()) {
    const record = await UserApiKey.findOne({ userId, provider });
    if (record) {
      return {
        apiKey: decryptApiKey(record.encryptedKey, record.iv, record.authTag),
        model: record.model || null
      };
    }
  }
  // Fall back to server env keys
  if (provider === 'groq'   && process.env.GROQ_API_KEY)   return { apiKey: process.env.GROQ_API_KEY,   model: null };
  if (provider === 'gemini' && process.env.GEMINI_API_KEY) return { apiKey: process.env.GEMINI_API_KEY, model: null };
  return null;
}

// ── Detect rate-limit / quota errors from any provider ───────────────────────
function isRateLimitError(err) {
  if (!err) return false;
  const msg    = (err.message || '').toLowerCase();
  const status = err.status || err.statusCode || (err.response && err.response.status) || 0;
  return (
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('tokens per day') ||
    msg.includes('tokens per minute') ||
    msg.includes('tpd') || msg.includes('tpm') ||
    msg.includes('limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('429')
  );
}

// ── Excel parsing helpers ─────────────────────────────────────────────────────

function extractWeekNumber(str) {
  const m = String(str).match(/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // Try to get rows with auto-detected headers first
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]).map(k => k.toLowerCase().trim());

  const colIdx = (keywords) => keys.findIndex(k => keywords.some(kw => k.includes(kw)));
  const weekCol    = colIdx(['week', 'wk', 'sl', 'no.', 'sno', 's.no']);
  const topicCol   = colIdx(['topic', 'subject', 'content', 'module', 'chapter', 'title']);
  const subCol     = colIdx(['subtopic', 'detail', 'concept', 'sub-topic', 'points']);
  const notesCol   = colIdx(['note', 'objective', 'outcome', 'remark', 'context']);

  const origKeys = Object.keys(rows[0]);
  const seen = new Set();
  const weeks = [];

  rows.forEach((row, rowIdx) => {
    const vals = origKeys.map(k => String(row[k] || '').trim());

    let weekNum = weekCol >= 0 ? extractWeekNumber(vals[weekCol]) : null;
    if (!weekNum) weekNum = rowIdx + 1;

    let topic = '';
    if (topicCol >= 0) {
      topic = vals[topicCol];
    } else if (weekCol >= 0 && weekCol + 1 < vals.length) {
      topic = vals[weekCol + 1];
    } else {
      topic = vals.find((v, i) => i > 0 && v.length > 1) || vals[0] || '';
    }

    const subtopics = subCol >= 0 && vals[subCol]
      ? vals[subCol].split(/[,;\n|·•]/).map(s => s.trim()).filter(Boolean)
      : [];

    const notes = notesCol >= 0 ? vals[notesCol] : '';

    if (topic && !seen.has(weekNum)) {
      seen.add(weekNum);
      weeks.push({
        weekNumber: weekNum,
        weekLabel: `Week ${weekNum}`,
        topic,
        subtopics,
        additionalContext: notes
      });
    }
  });

  return weeks.sort((a, b) => a.weekNumber - b.weekNumber);
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Auth middleware to verify JWT tokens
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    readyState: mongoose.connection.readyState
  });
});

  app.post("/api/history", verifyToken, async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB is not connected. Skipping DB save and returning simulated response.");
        return res.status(202).json({
          ...req.body,
          userId: req.user.userId,
          _id: "local-" + Date.now(),
          note: "Offline/Local storage active"
        });
      }
      const generation = new Generation({
        ...req.body,
        userId: req.user.userId
      });
      await generation.save();
      res.json(generation);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/history", verifyToken, async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("MongoDB is not connected. Returning empty history array.");
        return res.json([]);
      }
      const history = await Generation.find({ userId: req.user.userId }).sort({ timestamp: -1 });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // User registration (very small demo - not for production)
  app.post('/api/users', async (req, res) => {
    try {
      const { username, password, displayName } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

      const existing = await User.findOne({ username });
      if (existing) return res.status(409).json({ error: 'User already exists' });

      // Hash password with bcrypt
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const u = new User({ username, passwordHash: hash, displayName });
      await u.save();

      // Generate token for immediate login after registration
      const token = jwt.sign(
        { userId: u._id, username: u.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        username: u.username,
        displayName: u.displayName
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Login — tries TVA timesheet first, falls back to local F.R.I.D.A.Y auth
  app.post('/api/login', async (req, res) => {
    try {
      const { username, password, employeeId } = req.body;
      const loginId = (employeeId || username || '').trim();
      if (!loginId || !password) return res.status(400).json({ error: 'Missing credentials' });

      // ── Step 1: TVA Timesheet Auth ─────────────────────────────────────────
      if (TVA_AUTH_URL) {
        try {
          const tvaResp = await fetch(`${TVA_AUTH_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ employeeId: loginId, password }),
            signal:  AbortSignal.timeout(8000)
          });

          if (tvaResp.ok) {
            const tvaData = await tvaResp.json();
            const tv = tvaData.user;

            // Upsert user in F.R.I.D.A.Y DB — sync TVA profile on every login
            let user = await User.findOne({ username: tv.employeeId });
            if (!user) {
              user = new User({
                username:     tv.employeeId,
                passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
                displayName:  tv.name,
                employeeId:   tv.employeeId,
                email:        tv.email || null,
                tvaRole:      tv.role,
                teamLead:     tv.teamLead || null,
                tvaProfile:   tv
              });
              await user.save().catch(() => {});
            } else {
              user.displayName = tv.name;
              user.email       = tv.email || user.email;
              user.tvaRole     = tv.role;
              user.teamLead    = tv.teamLead || null;
              user.tvaProfile  = tv;
              await user.save().catch(() => {});
            }

            const token = jwt.sign(
              {
                userId:      user._id,
                username:    tv.employeeId,
                displayName: tv.name,
                role:        tv.role,
                tvaProfile:  tv
              },
              JWT_SECRET,
              { expiresIn: '24h' }
            );

            return res.json({
              token,
              username:    tv.employeeId,
              displayName: tv.name,
              role:        tv.role,
              tvaProfile:  tv
            });
          }

          if (tvaResp.status === 401) {
            return res.status(401).json({ error: 'Invalid credentials' });
          }
          // TVA server error — fall through to local auth
        } catch (tvaErr) {
          console.warn('[TVA Auth] Unreachable, falling back to local auth:', tvaErr.message);
        }
      }

      // ── Step 2: No TVA configured — reject login ──────────────────────────
      // F.R.I.D.A.Y only accepts iamneo Timesheet credentials.
      // Set TVA_AUTH_URL in your environment to enable login.
      return res.status(401).json({
        error: TVA_AUTH_URL
          ? 'Timesheet server unreachable. Please try again.'
          : 'Authentication service not configured. Contact your administrator.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Current user profile — returns TVA data if available
  app.get('/api/me', verifyToken, async (req, res) => {
    try {
      if (req.user.tvaProfile) {
        return res.json({
          userId:      req.user.userId,
          username:    req.user.username,
          displayName: req.user.displayName,
          role:        req.user.role,
          tvaProfile:  req.user.tvaProfile
        });
      }
      const user = await User.findById(req.user.userId).select('-passwordHash');
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({
        userId:      user._id,
        username:    user.username,
        displayName: user.displayName,
        role:        user.tvaRole || 'employee',
        tvaProfile:  user.tvaProfile || null
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Groq prompts ────────────────────────────────────────────────────────────

  const CODING_SYSTEM_PROMPT = `You are a world-class DSA & programming challenge creator who writes industry-grade problems.

RULE 1 — DESCRIPTION FORMAT (MANDATORY):
The "description" field must have exactly two labelled sections separated by a blank line (use the literal two-character sequence backslash-n twice: \\n\\n between sections):

**SCENARIO** — Write 5 full sentences: (1) Company name and industry. (2) What system/data is involved and its normal purpose. (3) What specific problem or failure occurred. (4) Business or user impact if unsolved. (5) Engineering constraints the team is working under.

**PROBLEM STATEMENT** — Write 5 full sentences: (1) Formal statement: "Given X, compute Y." (2) Exact input description (types, structure, line format). (3) Exact output description. (4) Edge cases to handle. (5) Required time/space complexity.

RULE 2 — SOLUTIONS (CRITICAL — READ CAREFULLY):
All 4 solutions must be COMPLETE STANDALONE PROGRAMS that compile and run as-is. No helper-class-only stubs.

LANGUAGE-SPECIFIC REQUIRED STRUCTURE:

C — Must start with #include directives and have int main() that reads stdin and prints to stdout.

C++ — Must start with #include <bits/stdc++.h>, then using namespace std;, then helper functions if any, then int main() that reads stdin and prints stdout.

JAVA — CRITICAL: There must be exactly ONE file with ONE top-level "public class Main". Any helper types (TreeNode, ListNode, Node, etc.) MUST be declared as STATIC INNER CLASSES inside Main. NEVER output a standalone "public class TreeNode" or any other standalone class — that is a compile error. The ONLY valid Java structure is:
  import java.util.*;
  public class Main {
    static class TreeNode { int val; TreeNode left, right; TreeNode(int v){val=v;} }
    static int bsearch(int[] a, int t) {
      int lo = 0, hi = a.length - 1;
      while (lo <= hi) { int m=(lo+hi)/2; if(a[m]==t) return m; if(a[m]<t) lo=m+1; else hi=m-1; }
      return -1;
    }
    public static void main(String[] args) {
      Scanner sc = new Scanner(System.in);
      int n = sc.nextInt(), t = sc.nextInt();
      int[] a = new int[n]; for (int i=0;i<n;i++) a[i]=sc.nextInt();
      System.out.println(bsearch(a, t));
    }
  }

PYTHON — Must have all imports at top, the algorithm as a function, and if __name__ == '__main__': block that reads stdin and prints stdout.

LENGTH: Up to 50 lines per solution is acceptable. For data-structure problems (trees, graphs, linked lists), define the node class as an inner/static class — that is INCLUDED in the 50-line budget.
ESCAPE RULE: newlines in code = \\n (backslash + n). Never embed actual newline characters inside the JSON string.

RULE 3 — UNIQUE REAL-LIFE SCENARIOS:
Each question must use a DIFFERENT domain: logistics, healthcare, banking, gaming, transport, e-commerce, education, cybersecurity, agriculture, social media. Scenario must explain WHY this algorithm solves the real problem. No generic "given an array" openers.

RULE 4 — TEST CASES (MANDATORY — NEVER OMIT):
Every question MUST include exactly 15 test cases. First 3: isPublic=true (match sampleInput/sampleOutput + one variation). Remaining 12: isPublic=false (edge cases, stress tests, boundary values). Input/output values are plain strings ONLY — never JSON objects or curly braces. Newlines within a test input: use \\n. Trees: "5\\n1 3 null null 2". Arrays: "5\\n3 1 4 1 5". Numbers: "42". MISSING testCases = INVALID response.

RULE 5 — CONSTRAINTS AND METADATA:
Specific constraints ("1 ≤ n ≤ 10^5"). Leetcode source: set realistic leetcodeNumber (1–3200). Creative scenario-based titles only.

RESPONSE FORMAT — return ONLY a valid JSON object. No markdown fences. No preamble. No trailing text.
Each solution string: use \\n for newlines in code (TWO characters: backslash then n). No actual newlines inside strings. Up to 50 lines per solution is acceptable. JAVA: all code in ONE file — static inner classes inside public class Main, plus main(String[] args).

Example of the required JSON structure (your actual content will be different — this is only showing the format):
{"questions":[{"id":"q1","title":"Minimising Delivery Route Costs at SwiftShip Logistics","description":"**SCENARIO**\\n\\nSwiftShip Logistics is a last-mile delivery company operating 5000 daily routes across Tamil Nadu. The route planning system stores delivery stop distances as an integer array and needs to compute the minimum total cost to traverse all stops. A recent database migration corrupted the distance values for 15% of routes, causing drivers to take unnecessarily long paths and increasing fuel costs by 40%. The engineering team has 48 hours to deploy a fix before the monthly audit. All corrected values fit within standard integer range and the algorithm must process each route in real time.\\n\\n**PROBLEM STATEMENT**\\n\\nGiven an array of N non-negative integers representing distances between consecutive delivery stops, find the minimum sum of distances if you are allowed to skip at most one stop. Your program reads N on the first line and the N values on the second line. It must print a single integer: the minimum possible sum after removing at most one element. Handle the edge case where N equals 1 (output 0). The solution must run in O(N) time and O(1) extra space.","inputFormat":"Line 1: N (number of stops, 1 <= N <= 100000). Line 2: N space-separated non-negative integers.","outputFormat":"Single integer: minimum sum after removing at most one element.","constraints":"1 <= N <= 100000, 0 <= each value <= 10^6","sampleInput":"5\\n3 1 4 1 5","sampleOutput":"10","leetcodeNumber":null,"difficulty":"Easy","recommendedFor":"Beginners learning array traversal","testCases":[{"input":"5\\n3 1 4 1 5","output":"10","isPublic":true},{"input":"1\\n7","output":"0","isPublic":true},{"input":"3\\n10 2 5","output":"12","isPublic":true},{"input":"4\\n0 0 0 0","output":"0","isPublic":false},{"input":"2\\n1000000 999999","output":"1000000","isPublic":false},{"input":"6\\n5 3 8 1 9 2","output":"27","isPublic":false},{"input":"5\\n0 1 2 3 4","output":"9","isPublic":false},{"input":"1\\n0","output":"0","isPublic":false},{"input":"5\\n100000 100000 100000 100000 100000","output":"400000","isPublic":false},{"input":"3\\n5 5 5","output":"10","isPublic":false},{"input":"4\\n1 2 3 4","output":"9","isPublic":false},{"input":"5\\n9 8 7 6 5","output":"30","isPublic":false},{"input":"2\\n0 1000000","output":"1000000","isPublic":false},{"input":"4\\n3 1 4 1","output":"8","isPublic":false},{"input":"5\\n1 1 1 1 1","output":"4","isPublic":false}],"solutions":{"c":"#include <stdio.h>\\nint main() {\\n    int n; scanf(\"%d\", &n);\\n    long long arr[100001], total = 0, maxVal = 0;\\n    for (int i = 0; i < n; i++) {\\n        scanf(\"%lld\", &arr[i]);\\n        total += arr[i];\\n        if (arr[i] > maxVal) maxVal = arr[i];\\n    }\\n    if (n == 1) { printf(\"0\\n\"); return 0; }\\n    printf(\"%lld\\n\", total - maxVal);\\n    return 0;\\n}","cpp":"#include <bits/stdc++.h>\\nusing namespace std;\\nint main() {\\n    int n; cin >> n;\\n    vector<long long> a(n);\\n    long long total = 0, maxVal = 0;\\n    for (int i = 0; i < n; i++) {\\n        cin >> a[i]; total += a[i];\\n        maxVal = max(maxVal, a[i]);\\n    }\\n    cout << (n == 1 ? 0 : total - maxVal) << endl;\\n    return 0;\\n}","java":"import java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        long total = 0, maxVal = 0;\\n        for (int i = 0; i < n; i++) {\\n            long v = sc.nextLong(); total += v;\\n            if (v > maxVal) maxVal = v;\\n        }\\n        System.out.println(n == 1 ? 0 : total - maxVal);\\n    }\\n}","python":"def main():\\n    n = int(input())\\n    a = list(map(int, input().split()))\\n    if n == 1:\\n        print(0)\\n        return\\n    print(sum(a) - max(a))\\nif __name__ == '__main__':\\n    main()"}}]}`;

  const MCQ_SYSTEM_PROMPT = `You are an expert examiner specializing in Data Structures and Algorithms.

RULES:
1. Every question must directly match the requested topic, track, course, and context.
2. Each question must have exactly 4 answer options.
3. correctAnswer is a 0-based index (0=A, 1=B, 2=C, 3=D).
4. Explanations must be clear and educational.
5. Specify who each question is recommended for.
6. Do not generate unrelated or generic questions.

RESPONSE FORMAT — return ONLY a valid JSON object, no markdown fences, no extra text:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct",
      "recommendedFor": "Target audience"
    }
  ]
}`;

  // ── Database-specific prompts (connected case-study format) ─────────────────

  const DATABASE_CODING_SYSTEM_PROMPT = `You are an expert database instructor creating a connected, real-world SQL/NoSQL case study.

CRITICAL RULES:
1. ALL questions in this set belong to ONE cohesive case study about a SINGLE specific real-world company.
2. Choose a SPECIFIC company archetype and name it (e.g. "NovaMart E-commerce", "PulseClinic Hospital", "SkyAir Airline Booking"). Never use "Company X" or generic names.
3. Every question description MUST be at least 6 lines covering: company background, the data problem they face, what tables exist, business stakes, what this task accomplishes, and any extra business rules.
4. Questions MUST build progressively — Q1 establishes the schema, Q2+ reference that schema and data.
5. NO concept repetition — each question tests a distinct SQL/DB skill.
6. Solutions must be fully working, valid SQL with inline comments.
7. sampleOutput must be formatted as a pipe-separated table.
8. If the user's format includes [IMAGE:N] markers, include them verbatim inside the "description" field at the appropriate position.

COMPANY ARCHETYPES (rotate; never repeat same type twice in a row):
E-commerce | Hospital | Banking | University | Airline | Hotel | Restaurant Chain | Logistics | Library | Gaming Platform | Insurance | Real Estate | Telecom

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no extra text:
{
  "companyContext": {
    "name": "NovaMart",
    "industry": "E-commerce",
    "description": "Two-sentence description of the company and the database challenge they hired this team to solve."
  },
  "questions": [
    {
      "id": "q1",
      "title": "Unique, Descriptive Question Title",
      "description": "Line 1: Company introduction — name, industry, size, what they do.\\nLine 2: The specific database challenge or expansion they are facing right now.\\nLine 3: What tables and data currently exist and what they represent in the business.\\nLine 4: The business impact if this query is wrong — what stakeholders depend on it.\\nLine 5: Exactly what this task asks the student to write and what the result represents.\\nLine 6: Any extra business rules, constraints, or context unique to this scenario.",
      "inputFormat": "Full schema — CREATE TABLE statements with column names, types, constraints, and foreign keys. Include 3-5 INSERT rows per table.",
      "outputFormat": "Expected query result formatted as a pipe table:\\n| column1 | column2 | column3 |\\n|---------|---------|---------|\\n| value1  | value2  | value3  |",
      "constraints": "• SQL Dialect: MySQL / PostgreSQL\\n• Difficulty: Easy\\n• Concepts: Basic SELECT, WHERE, ORDER BY",
      "sampleInput": "Minimal reproducible CREATE TABLE + INSERT statements",
      "sampleOutput": "Exact result the student's query should produce for the sample data",
      "difficulty": "Easy|Medium|Hard",
      "recommendedFor": "Target student level",
      "questionNumber": 1,
      "buildUpon": "None — establishes the base schema for this case study",
      "solutions": {
        "sql": "-- Full working SQL with step-by-step inline comments\\nSELECT ...\\nFROM ...\\nWHERE ...;",
        "explanation": "Step-by-step plain-English explanation of what each clause does and why it is correct"
      },
      "testCases": [
        { "input": "Sample data scenario 1", "output": "Expected result 1", "isPublic": true },
        { "input": "Sample data scenario 2", "output": "Expected result 2", "isPublic": true },
        { "input": "Edge case", "output": "Edge case result", "isPublic": false }
      ]
    }
  ]
}`;

  const DATABASE_MCQ_SYSTEM_PROMPT = `You are an expert database examiner creating a connected conceptual MCQ case study.

CRITICAL RULES:
1. ALL questions belong to ONE case study about a SINGLE specific real-world company.
2. Each question MUST have a "scenario" field (6+ lines) providing rich business context BEFORE the actual question text.
3. Questions build progressively — later ones reference schema/context established earlier.
4. NO concept repetition — each question covers a distinct topic: normalization, keys, joins, aggregations, indexing, transactions, ACID, ER modeling, etc.
5. Options must be concrete and plausible — no obviously wrong choices. All four options should seem reasonable to someone who hasn't studied.
6. Scenarios must feel authentic — use real column names, realistic row counts, plausible business rules.

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no extra text:
{
  "companyContext": {
    "name": "Company name",
    "industry": "Industry",
    "description": "Two-sentence summary of the company and its database situation."
  },
  "questions": [
    {
      "id": "q1",
      "scenario": "Line 1: Introduce the company — name, industry, scale.\\nLine 2: Describe the database they have built and its purpose.\\nLine 3: What tables exist, how they are related, and what data volume looks like.\\nLine 4: A specific technical decision or problem the DBA team is currently debating.\\nLine 5: What went wrong or what improvement is needed.\\nLine 6: Why this concept is directly relevant to fixing their problem.",
      "question": "Based on this scenario, which approach should the team use to [specific goal]?",
      "options": ["Concrete, plausible Option A", "Concrete, plausible Option B", "Concrete, plausible Option C", "Concrete, plausible Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation referencing the company scenario — why the correct option fixes the problem and why each wrong option would fail or cause issues",
      "recommendedFor": "Target student level",
      "concept": "Normalization | Primary Keys | Foreign Keys | JOINs | Indexing | Transactions | ACID | ER Modeling | Aggregations"
    }
  ]
}`;

  // ── /api/generate ────────────────────────────────────────────────────────────

  app.post("/api/generate", verifyToken, async (req, res) => {
    const { type, topic, count, source, difficulty, context = {} } = req.body;
    if (!topic || !count) {
      return res.status(400).json({ error: "Missing topic or count" });
    }
    // Resolve user's API key and provider
    const reqProvider = context.provider || 'groq';
    const reqModel    = context.model    || null;
    const keyInfo     = await getUserApiKey(req.user.userId, reqProvider);
    if (!keyInfo) {
      return res.status(402).json({
        error: `No API key for "${reqProvider}" — go to Settings → API Keys to add your key.`
      });
    }

    const contextBlock = [
      `Client: ${context.client || "General"}`,
      `Stack: ${context.stack || "General"}`,
      `Domain: ${context.domain || "General"}`,
      `Track: ${context.track || "General"}`,
      `Course/Lesson: ${context.course || "General"}`,
      `Generation mode: ${context.mode || "questions"}`,
      `Tone: ${context.tone || "Professional"}`,
      context.additionalContext ? `Additional instructions: ${context.additionalContext}` : ""
    ].filter(Boolean).join("\n");

    // Inject custom format template if provided
    const customFormat = context.customFormat?.trim() || '';
    const formatInstruction = customFormat
      ? `\n\nFORMAT REQUIREMENT — Each question's content MUST strictly follow this structure:\n${customFormat}`
      : '';

    // Detect database tracks
    const DB_TRACK_KEYWORDS = ['sql', 'mongodb', 'postgresql', 'nosql', 'dbms', 'database'];
    const isDbTrack = DB_TRACK_KEYWORDS.some(k => (context.track || '').toLowerCase().includes(k));

    try {
      if (type === "coding") {
        const userPrompt = source === "leetcode"
          ? `Generate exactly ${count} coding challenge(s) inspired by real LeetCode problems about "${topic}" for the "${context.track || 'DSA'}" track with "${difficulty}" difficulty. Set a realistic leetcodeNumber for each.\nIMPORTANT: Each question MUST use a COMPLETELY DIFFERENT real-world domain/industry setting to frame the LeetCode-style problem. Rotate through: healthcare, logistics, banking, gaming, social media, e-commerce, transport, education, cybersecurity.\nALL solutions must be COMPLETE programs — include all imports/headers and a main() function demonstrating the sample I/O. Code must compile and run without modification.\n\nContext:\n${contextBlock}`
          : `Generate exactly ${count} unique coding challenge(s) about "${topic}" for the "${context.track || 'DSA'}" track with "${difficulty}" difficulty.\nIMPORTANT: Each question MUST use a COMPLETELY DIFFERENT real-world domain/company scenario — rotate through healthcare, logistics, banking, gaming, social media, e-commerce, transport, education, cybersecurity. Never repeat the same domain in one batch.\nALL solutions must be COMPLETE programs — include all imports/headers and a main() function that reads the sample input and prints the output. Code must run as-is without modification.\n\nContext:\n${contextBlock}`;

        const rawContent = await callAI({
          provider:     reqProvider,
          model:        reqModel || keyInfo.model || undefined,
          apiKey:       keyInfo.apiKey,
          systemPrompt: (isDbTrack ? DATABASE_CODING_SYSTEM_PROMPT : CODING_SYSTEM_PROMPT) + formatInstruction,
          userPrompt:   userPrompt,
          maxTokens:    16000
        });
        const data = JSON.parse(rawContent);
        const questions = data.questions || [];
        const enriched = (isDbTrack && data.companyContext)
          ? questions.map(q => ({ ...q, companyContext: data.companyContext }))
          : questions;
        res.json(enriched);

      } else {
        const userPrompt = `Generate exactly ${count} advanced DSA MCQ(s) about "${topic}".\n\nContext:\n${contextBlock}`;

        const rawContent = await callAI({
          provider:     reqProvider,
          model:        reqModel || keyInfo.model || undefined,
          apiKey:       keyInfo.apiKey,
          systemPrompt: (isDbTrack ? DATABASE_MCQ_SYSTEM_PROMPT : MCQ_SYSTEM_PROMPT) + formatInstruction,
          userPrompt:   userPrompt,
          maxTokens:    4000
        });

        const data = JSON.parse(rawContent);
        const questions = data.questions || [];
        const enriched = (isDbTrack && data.companyContext)
          ? questions.map(q => ({ ...q, companyContext: data.companyContext }))
          : questions;
        res.json(enriched);
      }
    } catch (error) {
      console.error("Generation error:", error?.message || error);
      // Extract a clean message from Groq / OpenAI API errors (they embed JSON in the message string)
      let userMsg = error?.message || 'Generation failed';
      try {
        // Groq SDK wraps: "400 {\"error\":{\"message\":\"...\",\"code\":\"json_validate_failed\",...}}"
        const jsonPart = userMsg.match(/\{[\s\S]*\}/)?.[0];
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart);
          const inner = parsed?.error?.message || parsed?.message;
          const code  = parsed?.error?.code;
          if (code === 'json_validate_failed') {
            userMsg = 'Generation failed: the AI produced malformed JSON. This usually means token limit was reached mid-response. Try reducing question count or switching to a different provider.';
          } else if (inner) {
            userMsg = inner;
          }
        }
      } catch {}
      res.status(500).json({ error: userMsg });
    }
  });

  // Courses persistence
  app.post('/api/courses', verifyToken, async (req, res) => {
    try {
      const { track, name } = req.body;
      if (!track || !name) return res.status(400).json({ error: 'Missing track or name' });
      if (mongoose.connection.readyState !== 1) {
        return res.status(202).json({ track, name, userId: req.user.userId, _id: 'local-' + Date.now(), note: 'offline' });
      }
      const c = new Course({ track, name, userId: req.user.userId });
      await c.save();
      res.json(c);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/courses', verifyToken, async (req, res) => {
    try {
      if (mongoose.connection.readyState !== 1) return res.json([]);
      const list = await Course.find({ userId: req.user.userId }).sort({ createdAt: -1 });
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // ── BYOK: list which providers are configured (never return actual keys) ────
  app.get('/api/user/api-keys', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.json({ groq: false, openai: false, anthropic: false });
      const records = await UserApiKey.find({ userId: req.user.userId });
      const result = { groq: false, openai: false, anthropic: false, gemini: false, mistral: false, deepseek: false };
      const models = {};
      records.forEach(r => {
        result[r.provider] = true;
        models[r.provider] = r.model || '';
      });
      res.json({ configured: result, models });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── BYOK: save / update a provider key ────────────────────────────────────
  app.put('/api/user/api-key', verifyToken, async (req, res) => {
    try {
      const { provider, apiKey, model = '' } = req.body;
      if (!provider || !apiKey) return res.status(400).json({ error: 'provider and apiKey required' });
      if (!['groq', 'openai', 'anthropic', 'gemini', 'mistral', 'deepseek', 'nvidia'].includes(provider))
        return res.status(400).json({ error: 'Invalid provider' });
      if (!dbConnected()) return res.status(503).json({ error: 'DB offline — key not saved' });
      const encrypted = encryptApiKey(apiKey);
      await UserApiKey.findOneAndUpdate(
        { userId: req.user.userId, provider },
        { ...encrypted, model, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      res.json({ success: true, provider, model });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── BYOK: delete a provider key ────────────────────────────────────────────
  app.delete('/api/user/api-key/:provider', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.status(503).json({ error: 'DB offline' });
      await UserApiKey.findOneAndDelete({ userId: req.user.userId, provider: req.params.provider });
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── BYOK: update model only (no key change) ───────────────────────────────
  app.patch('/api/user/api-key/model', verifyToken, async (req, res) => {
    try {
      const { provider, model } = req.body;
      if (!provider) return res.status(400).json({ error: 'provider required' });
      if (!dbConnected()) return res.status(503).json({ error: 'DB offline' });
      await UserApiKey.findOneAndUpdate(
        { userId: req.user.userId, provider },
        { model, updatedAt: new Date() }
      );
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── BYOK: test a key without saving ───────────────────────────────────────
  app.post('/api/user/api-key/test', verifyToken, async (req, res) => {
    const { provider, apiKey, model } = req.body;
    if (!provider || !apiKey) return res.status(400).json({ error: 'provider and apiKey required' });
    const start = Date.now();
    try {
      await callAI({
        provider, apiKey,
        model: model || (
          provider === 'openai'    ? 'gpt-4o-mini' :
          provider === 'anthropic' ? 'claude-3-5-haiku-20241022' :
          provider === 'gemini'    ? 'gemini-1.5-flash' :
          provider === 'mistral'   ? 'mistral-small-latest' :
          provider === 'deepseek'  ? 'deepseek-chat' :
          provider === 'nvidia'    ? 'meta/llama-3.1-70b-instruct' :
          'llama-3.3-70b-versatile'
        ),
        systemPrompt: 'You are a helpful assistant. Respond with minimal valid JSON.',
        userPrompt: 'Reply with: {"ok":true}',
        maxTokens: 128
      });
      res.json({ success: true, latencyMs: Date.now() - start });
    } catch (err) {
      // 429 = quota/billing — key IS valid, account just has no credits
      const msg = err.message || '';
      const status = err.status || err.statusCode || 0;
      const isQuota = status === 429 || msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('exceeded');
      // 401/403 = bad key
      const isBadKey = status === 401 || status === 403 || msg.includes('401') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('api key');

      if (isQuota) {
        // Key authenticates fine — no credits is a billing issue, not a key issue
        return res.json({
          success: true,
          warning: 'quota',
          latencyMs: Date.now() - start,
          message: provider === 'openai'
            ? 'Key is valid — but your OpenAI account has no credits. Add billing at platform.openai.com/account/billing'
            : provider === 'anthropic'
            ? 'Key is valid — but your Anthropic account has no credits. Add billing at console.anthropic.com'
            : 'Key is valid but quota is exceeded. Check your Groq usage.'
        });
      }

      res.status(isBadKey ? 401 : 400).json({ success: false, error: msg });
    }
  });

  // ── BYOK: get today's token usage per provider ────────────────────────────
  app.get('/api/user/token-usage', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.json([]);
      const today = new Date().toISOString().split('T')[0];
      const records = await TokenUsage.find({ userId: req.user.userId, date: today }).lean();
      res.json(records);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // Get all format templates for the logged-in user
  app.get('/api/formats', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.json([]);
      const formats = await FormatTemplate.find({ userId: req.user.userId });
      res.json(formats);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Upsert (create or update) a format template for a track+type combination
  app.put('/api/formats', verifyToken, async (req, res) => {
    try {
      const { track, course = '', type, format } = req.body;
      if (!track || !type || !format) {
        return res.status(400).json({ error: 'Missing track, type, or format' });
      }
      if (!dbConnected()) {
        return res.status(202).json({ track, type, format, note: 'offline' });
      }
      const doc = await FormatTemplate.findOneAndUpdate(
        { userId: req.user.userId, track, type },
        { track, course, type, format, userId: req.user.userId, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Excel parse ────────────────────────────────────────────────────────────
  app.post('/api/planner/parse-excel', verifyToken, async (req, res) => {
    try {
      const { fileBase64, fileName } = req.body;
      if (!fileBase64) return res.status(400).json({ error: 'Missing file data' });
      const buffer = Buffer.from(fileBase64, 'base64');
      const weeks = parseExcelBuffer(buffer);
      if (weeks.length === 0) {
        return res.status(422).json({ error: 'No week/topic data found. Ensure your sheet has Week and Topic columns.' });
      }
      res.json({ weeks, fileName: fileName || 'planner.xlsx' });
    } catch (err) {
      res.status(500).json({ error: 'Excel parse failed: ' + err.message });
    }
  });

  // ── Generate one week (all 3 sections in one Groq call) ────────────────────
  app.post('/api/planner/generate-week', verifyToken, async (req, res) => {
    try {
      const {
        topic, subtopics = [], week, track, course,
        skillBuilderCount = 3, practiceAtHomeCount = 3, challengeYourselfCount = 2,
        customFormat = ''
      } = req.body;

      if (!topic) return res.status(400).json({ error: 'Missing topic' });

      const reqProvider = req.body.provider || 'groq';
      const reqModel    = req.body.model    || null;
      const keyInfo     = await getUserApiKey(req.user.userId, reqProvider);
      if (!keyInfo) {
        return res.status(402).json({ error: `No API key for "${reqProvider}" — add it in Settings.` });
      }

      const formatInstruction = customFormat.trim()
        ? `\n\nFORMAT REQUIREMENT — follow this structure for each question:\n${customFormat}`
        : '';

      const systemPrompt = `You are a world-class DSA & programming curriculum designer creating structured weekly practice sets.

Generate THREE categories of questions for the given week topic. EVERY question must follow ALL of these rules:

DESCRIPTION FORMAT — The "description" field MUST have TWO clearly labelled sections:
  **SCENARIO** (5+ sentences): Name the company/org, describe the system and data, explain what went wrong or what needs computing, state the real-world stakes, and mention what constraints the engineering team is operating under.
  **PROBLEM STATEMENT** (5+ sentences): Formal "given X, compute Y" statement, exact input specification (data types, structure), exact output specification, important edge cases, and performance requirement (time/space complexity).
  Use "\\n\\n" to separate SCENARIO from PROBLEM STATEMENT inside the string.

SOLUTIONS — Every solution (c, cpp, java, python) MUST be a COMPLETE STANDALONE PROGRAM:
  ✓ All necessary #include / import statements at the top
  ✓ int main() for C/C++, if __name__ == '__main__': for Python
  ✓ Reads input from stdin, prints output to stdout — copy-paste into any online compiler and it runs
  ✗ NEVER write only a helper function without main()
  ✗ NEVER write placeholder comments like "// solution here"
  Up to 50 lines per solution is fine.

JAVA RULES (CRITICAL):
  ✓ ONE file, ONE top-level class named exactly "Main"
  ✓ Any helper type (TreeNode, ListNode, Node, Edge) MUST be a static inner class INSIDE Main
  ✓ public static void main(String[] args) MUST be inside Main
  ✗ NEVER output a standalone "public class TreeNode" or "class Solution" — that is a compile error
  The correct Java structure is always:
    import java.util.*;
    public class Main {
      static class TreeNode { int val; TreeNode left, right; TreeNode(int v){val=v;} }
      static <ReturnType> solve(<params>) { /* algorithm */ }
      public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        /* read input, call solve(), print output */
      }
    }

OTHER PER-QUESTION RULES:
• Use a DIFFERENT real-world domain per question (rotate: hospital, bank, warehouse, game, social network, transport, school, farm, space, factory)
• Scenario-based title only (NOT generic — "Routing Trucks with Dijkstra" not "Shortest Path")
• Include exactly 15 test cases: first 3 isPublic=true (match sampleInput/sampleOutput + one variation), remaining 12 isPublic=false (edge cases, stress tests, boundary values, special cases)
• ALL test case input/output: plain-text strings only (space-separated or newline-separated). NEVER JSON objects inside test cases. Trees → level-order array "5\\n1 3 2 null 4", graphs → adjacency list, linked lists → "1 2 3 4 5".

CATEGORIES:
1. skillBuilder — Easy: foundational, builds initial understanding, simpler constraints
2. practiceAtHome — Medium: reinforces concept through varied application, moderate complexity
3. challengeYourself — Hard: demands deep understanding, optimization, or creative insight

CRITICAL: You MUST populate ALL THREE arrays. If asked for N questions per category, generate EXACTLY N in each.

⚠ SOLUTIONS ARE COMPLETE PROGRAMS — NEVER STUBS: Every solution string you generate MUST contain a real, compilable, working algorithm for that specific question. You MUST NOT output placeholder comments like "/* read input */", "pass  # logic here", "// solution here", or any other stub. The schema below shows EXAMPLE solutions for a "find maximum" problem — your solutions will have different algorithms but must follow the same complete-program structure.

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no preamble:
{
  "skillBuilder": [
    {
      "id": "sb1",
      "title": "...",
      "description": "**SCENARIO**\\n\\n[Company name and industry]. [What the system does and what data it uses]. [What went wrong or what needs to be computed]. [Real-world stakes if unsolved]. [Engineering constraints].\\n\\n**PROBLEM STATEMENT**\\n\\n[Formal: given X compute Y]. [Input specification]. [Output specification]. [Edge cases]. [Performance requirement O(?) time/space].",
      "inputFormat": "...",
      "outputFormat": "...",
      "constraints": "...",
      "sampleInput": "...",
      "sampleOutput": "...",
      "difficulty": "Easy",
      "recommendedFor": "...",
      "testCases": [
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false }
      ],
      "solutions": {
        "c": "#include <stdio.h>\\nint main() {\\n    int n; scanf(\"%d\", &n);\\n    long long v, mx = -9000000000LL;\\n    for (int i = 0; i < n; i++) { scanf(\"%lld\", &v); if (v > mx) mx = v; }\\n    printf(\"%lld\\n\", mx);\\n    return 0;\\n}",
        "cpp": "#include <bits/stdc++.h>\\nusing namespace std;\\nint main() {\\n    int n; cin >> n;\\n    vector<long long> a(n);\\n    for (auto& x : a) cin >> x;\\n    cout << *max_element(a.begin(), a.end()) << \"\\n\";\\n    return 0;\\n}",
        "java": "import java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        long mx = Long.MIN_VALUE;\\n        for (int i = 0; i < n; i++) { long v = sc.nextLong(); if (v > mx) mx = v; }\\n        System.out.println(mx);\\n    }\\n}",
        "python": "def main():\\n    n = int(input())\\n    a = list(map(int, input().split()))\\n    print(max(a))\\nif __name__ == '__main__':\\n    main()"
      }
    }
  ],
  "practiceAtHome": [
    {
      "id": "pa1",
      "title": "...",
      "description": "**SCENARIO**\\n\\n[Company name and industry]. [What the system does and what data it uses]. [What went wrong or what needs to be computed]. [Real-world stakes if unsolved]. [Engineering constraints].\\n\\n**PROBLEM STATEMENT**\\n\\n[Formal: given X compute Y]. [Input specification]. [Output specification]. [Edge cases]. [Performance requirement O(?) time/space].",
      "inputFormat": "...",
      "outputFormat": "...",
      "constraints": "...",
      "sampleInput": "...",
      "sampleOutput": "...",
      "difficulty": "Medium",
      "recommendedFor": "...",
      "testCases": [
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false }
      ],
      "solutions": {
        "c": "#include <stdio.h>\\nint main() {\\n    int n; scanf(\"%d\", &n);\\n    long long v, mx = -9000000000LL;\\n    for (int i = 0; i < n; i++) { scanf(\"%lld\", &v); if (v > mx) mx = v; }\\n    printf(\"%lld\\n\", mx);\\n    return 0;\\n}",
        "cpp": "#include <bits/stdc++.h>\\nusing namespace std;\\nint main() {\\n    int n; cin >> n;\\n    vector<long long> a(n);\\n    for (auto& x : a) cin >> x;\\n    cout << *max_element(a.begin(), a.end()) << \"\\n\";\\n    return 0;\\n}",
        "java": "import java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        long mx = Long.MIN_VALUE;\\n        for (int i = 0; i < n; i++) { long v = sc.nextLong(); if (v > mx) mx = v; }\\n        System.out.println(mx);\\n    }\\n}",
        "python": "def main():\\n    n = int(input())\\n    a = list(map(int, input().split()))\\n    print(max(a))\\nif __name__ == '__main__':\\n    main()"
      }
    }
  ],
  "challengeYourself": [
    {
      "id": "cy1",
      "title": "...",
      "description": "**SCENARIO**\\n\\n[Company name and industry]. [What the system does and what data it uses]. [What went wrong or what needs to be computed]. [Real-world stakes if unsolved]. [Engineering constraints].\\n\\n**PROBLEM STATEMENT**\\n\\n[Formal: given X compute Y]. [Input specification]. [Output specification]. [Edge cases]. [Performance requirement O(?) time/space].",
      "inputFormat": "...",
      "outputFormat": "...",
      "constraints": "...",
      "sampleInput": "...",
      "sampleOutput": "...",
      "difficulty": "Hard",
      "recommendedFor": "...",
      "testCases": [
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": true },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false },
        { "input": "...", "output": "...", "isPublic": false }
      ],
      "solutions": {
        "c": "#include <stdio.h>\\nint main() {\\n    int n; scanf(\"%d\", &n);\\n    long long v, mx = -9000000000LL;\\n    for (int i = 0; i < n; i++) { scanf(\"%lld\", &v); if (v > mx) mx = v; }\\n    printf(\"%lld\\n\", mx);\\n    return 0;\\n}",
        "cpp": "#include <bits/stdc++.h>\\nusing namespace std;\\nint main() {\\n    int n; cin >> n;\\n    vector<long long> a(n);\\n    for (auto& x : a) cin >> x;\\n    cout << *max_element(a.begin(), a.end()) << \"\\n\";\\n    return 0;\\n}",
        "java": "import java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        int n = sc.nextInt();\\n        long mx = Long.MIN_VALUE;\\n        for (int i = 0; i < n; i++) { long v = sc.nextLong(); if (v > mx) mx = v; }\\n        System.out.println(mx);\\n    }\\n}",
        "python": "def main():\\n    n = int(input())\\n    a = list(map(int, input().split()))\\n    print(max(a))\\nif __name__ == '__main__':\\n    main()"
      }
    }
  ]
}${formatInstruction}`;

      const userPrompt = `Week ${week}: ${topic}${subtopics.length ? '\nSubtopics: ' + subtopics.join(', ') : ''}
Track: ${track || 'Problem Solving'} | Course: ${course || ''}

Generate:
• ${skillBuilderCount} Skill Builder question(s) — Easy
• ${practiceAtHomeCount} Practice at Home question(s) — Medium
• ${challengeYourselfCount} Challenge Yourself question(s) — Hard`;

      // Groq free tier limit: 12 000 TPM (input + max_tokens counted together).
      // Input is ~2 600 tokens, so max_tokens must stay ≤ 9 400 to avoid a
      // "Request too large" 400 error before any generation happens.
      // Scale with question count: ~900 tokens per question + 1 500 JSON overhead.
      const totalQ = skillBuilderCount + practiceAtHomeCount + challengeYourselfCount;
      const dynamicMaxTokens = Math.min(9000, Math.max(3000, totalQ * 900 + 1500));

      // ── Multi-provider failover chain ────────────────────────────────────────
      // Primary provider is tried first. If it hits a rate-limit (TPM or TPD),
      // we automatically fall back to each other saved key in priority order.
      const PROVIDER_FAILOVER_ORDER = ['groq', 'gemini', 'openai', 'anthropic', 'nvidia', 'mistral', 'deepseek'];
      const FAILOVER_DEFAULT_MODELS = {
        groq:      'llama-3.3-70b-versatile',
        gemini:    'gemini-1.5-flash',
        openai:    'gpt-4o-mini',
        anthropic: 'claude-3-5-haiku-20241022',
        nvidia:    'meta/llama-3.1-70b-instruct',
        mistral:   'mistral-small-latest',
        deepseek:  'deepseek-chat',
      };

      // Build chain starting with primary
      const failoverChain = [{ provider: reqProvider, keyInfo }];
      if (dbConnected()) {
        try {
          const otherRecs = await UserApiKey.find({ userId: req.user.userId, provider: { $ne: reqProvider } }).lean();
          for (const fp of PROVIDER_FAILOVER_ORDER) {
            if (fp === reqProvider) continue;
            const rec = otherRecs.find(r => r.provider === fp);
            if (rec) {
              failoverChain.push({
                provider: fp,
                keyInfo: { apiKey: decryptApiKey(rec.encryptedKey, rec.iv, rec.authTag), model: rec.model || null }
              });
            }
          }
        } catch {} // non-fatal — just means no failover
      }

      let rawContent = null, aiUsage = null;
      let usedProvider = reqProvider, switchedFrom = null, lastRLError = null;

      for (let fi = 0; fi < failoverChain.length; fi++) {
        const { provider: fp, keyInfo: fki } = failoverChain[fi];
        try {
          const result = await callAI({
            provider:  fp,
            model:     (fi === 0 ? reqModel : null) || fki.model || FAILOVER_DEFAULT_MODELS[fp] || undefined,
            apiKey:    fki.apiKey,
            systemPrompt,
            userPrompt,
            maxTokens: dynamicMaxTokens
          });
          rawContent   = result.content;
          aiUsage      = result.usage;
          usedProvider = fp;
          if (fi > 0) {
            switchedFrom = reqProvider;
            console.log(`[Failover] Switched from ${reqProvider} → ${fp} (week ${week})`);
          }
          break; // success
        } catch (err) {
          const isRL = isRateLimitError(err);
          if (isRL && fi < failoverChain.length - 1) {
            console.warn(`[Failover] ${fp} rate limited — trying next provider`);
            lastRLError = err;
            continue;
          }
          throw err; // non-rate-limit error or last provider
        }
      }

      if (!rawContent) throw (lastRLError || new Error('All providers exhausted'));

      // ── Track token usage (non-blocking fire-and-forget) ─────────────────
      if (aiUsage && aiUsage.totalTokens > 0 && dbConnected()) {
        const today = new Date().toISOString().split('T')[0];
        TokenUsage.findOneAndUpdate(
          { userId: req.user.userId, provider: usedProvider, date: today },
          { $inc: { tokensUsed: aiUsage.totalTokens, requestCount: 1 }, $set: { updatedAt: new Date() } },
          { upsert: true }
        ).catch(() => {});
      }

      const data = JSON.parse(rawContent);
      res.json({
        skillBuilder:      data.skillBuilder      || [],
        practiceAtHome:    data.practiceAtHome    || [],
        challengeYourself: data.challengeYourself || [],
        providerUsed:   usedProvider,
        switchedFrom:   switchedFrom || null,
        tokensUsed:     aiUsage?.totalTokens || null
      });
    } catch (err) {
      console.error('Planner week generation error:', err?.message || err);
      let userMsg = err?.message || 'Planner generation failed';
      try {
        const jsonPart = userMsg.match(/\{[\s\S]*\}/)?.[0];
        if (jsonPart) {
          const parsed = JSON.parse(jsonPart);
          const code  = parsed?.error?.code;
          const inner = parsed?.error?.message || parsed?.message;
          if (code === 'json_validate_failed') {
            userMsg = 'Generation failed: token limit reached mid-response. Try reducing questions per section or switching to a different provider.';
          } else if (inner) {
            userMsg = inner;
          }
        }
      } catch {}
      res.status(500).json({ error: userMsg });
    }
  });

  // ── Planner CRUD ────────────────────────────────────────────────────────────

  // Save a new planner
  app.post('/api/planners', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) {
        return res.status(202).json({ ...req.body, _id: 'local-' + Date.now(), createdAt: new Date(), note: 'offline' });
      }
      const planner = new Planner({ ...req.body, userId: req.user.userId });
      await planner.save();
      res.json(planner);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // List planners (questions stripped for speed)
  app.get('/api/planners', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.json([]);
      const planners = await Planner.find({ userId: req.user.userId })
        .select('courseName track plannerFile skillBuilderCount practiceAtHomeCount challengeYourselfCount createdAt weeks.weekNumber weeks.topic weeks.weekLabel')
        .sort({ createdAt: -1 });
      res.json(planners);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get one planner with full questions
  app.get('/api/planners/:id', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.status(503).json({ error: 'DB offline' });
      const planner = await Planner.findOne({ _id: req.params.id, userId: req.user.userId });
      if (!planner) return res.status(404).json({ error: 'Not found' });
      res.json(planner);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete a planner
  app.delete('/api/planners/:id', verifyToken, async (req, res) => {
    try {
      if (!dbConnected()) return res.status(503).json({ error: 'DB offline' });
      await Planner.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── MCP Integration ──────────────────────────────────────────────────────────
  // In-memory job store (per-process, resets on server restart)
  const mcpJobs = new Map(); // jobId → job object

  // POST /api/mcp/trigger — MCP server calls this to start a generation job
  app.post('/api/mcp/trigger', async (req, res) => {
    const secret = req.headers['x-mcp-secret'];
    if (secret !== (process.env.MCP_SECRET || 'friday-mcp-2025')) {
      return res.status(401).json({ error: 'Unauthorized — wrong MCP secret' });
    }
    const { topic, type = 'coding', count = 10, track = 'DSA', client = 'General', difficulty = 'Medium', source = 'non-leetcode' } = req.body;
    if (!topic) return res.status(400).json({ error: 'topic is required' });

    const jobId = `mcp-${Date.now()}`;
    const job = {
      id: jobId, topic, type, count: parseInt(count) || 10, track, client,
      difficulty, source, status: 'running', startedAt: Date.now(),
      result: null, error: null, completedAt: null
    };
    mcpJobs.set(jobId, job);

    // Keep only last 5 jobs
    if (mcpJobs.size > 5) {
      const oldest = [...mcpJobs.keys()].slice(0, mcpJobs.size - 5);
      oldest.forEach(k => mcpJobs.delete(k));
    }

    // Run generation asynchronously so we can return jobId immediately
    (async () => {
      try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY not set in environment');
        const DB_TRACK_KEYWORDS = ['sql', 'mongodb', 'postgresql', 'nosql', 'dbms', 'database'];
        const isDbTrack = DB_TRACK_KEYWORDS.some(k => (track || '').toLowerCase().includes(k));
        const contextBlock = `Client: ${client}\nTrack: ${track}\nDifficulty: ${difficulty}`;

        let questions = [];
        if (type === 'coding') {
          const userPrompt = source === 'leetcode'
            ? `Generate exactly ${count} coding challenge(s) inspired by real LeetCode problems about "${topic}" for "${track}" track with "${difficulty}" difficulty. Set a realistic leetcodeNumber for each.\nContext:\n${contextBlock}`
            : `Generate exactly ${count} unique coding challenge(s) about "${topic}" for "${track}" track with "${difficulty}" difficulty.\nContext:\n${contextBlock}`;
          const r = await callAI({ provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey, systemPrompt: isDbTrack ? DATABASE_CODING_SYSTEM_PROMPT : CODING_SYSTEM_PROMPT, userPrompt, maxTokens: 16000 });
          const data = JSON.parse(r.content);
          questions = data.questions || [];
        } else {
          const userPrompt = `Generate exactly ${count} advanced MCQ(s) about "${topic}" for "${track}" track.\nContext:\n${contextBlock}`;
          const r = await callAI({ provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey, systemPrompt: isDbTrack ? DATABASE_MCQ_SYSTEM_PROMPT : MCQ_SYSTEM_PROMPT, userPrompt, maxTokens: 4000 });
          const data = JSON.parse(r.content);
          questions = data.questions || [];
        }

        job.result = questions;
        job.status = 'done';
        job.completedAt = Date.now();
        console.log(`[MCP] Job ${jobId} completed — ${questions.length} questions`);
      } catch (err) {
        job.error = err.message;
        job.status = 'error';
        job.completedAt = Date.now();
        console.error(`[MCP] Job ${jobId} failed:`, err.message);
      }
    })();

    res.json({ jobId, status: 'running', topic, type, count: job.count });
  });

  // POST /api/mcp/notify — MCP server posts job updates (Claude generates directly, this just tracks state)
  app.post('/api/mcp/notify', (req, res) => {
    const secret = req.headers['x-mcp-secret'];
    if (secret !== (process.env.MCP_SECRET || 'friday-mcp-2025')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { jobId, topic, type, count, track, client, course, status, result } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId required' });

    if (status === 'running') {
      mcpJobs.set(jobId, {
        id: jobId, topic, type, count: parseInt(count) || 10, track: track || 'DSA',
        client: client || 'General', course: course || '', status: 'running',
        startedAt: Date.now(), result: null, error: null, completedAt: null
      });
      // Keep last 5
      if (mcpJobs.size > 5) {
        const oldest = [...mcpJobs.keys()].slice(0, mcpJobs.size - 5);
        oldest.forEach(k => mcpJobs.delete(k));
      }
    } else if (mcpJobs.has(jobId)) {
      const job = mcpJobs.get(jobId);
      job.status = status;
      job.completedAt = Date.now();
      if (result) job.result = result;
    }
    res.json({ ok: true });
  });

  // POST /api/mcp/save — saves Claude-generated questions from MCP session
  app.post('/api/mcp/save', async (req, res) => {
    const secret = req.headers['x-mcp-secret'];
    if (secret !== (process.env.MCP_SECRET || 'friday-mcp-2025')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { jobId, questions, topic, type, track, client, course, difficulty } = req.body;
    if (!questions || !Array.isArray(questions)) return res.status(400).json({ error: 'questions array required' });

    // Update job status to done
    if (mcpJobs.has(jobId)) {
      const job = mcpJobs.get(jobId);
      job.status = 'done';
      job.result = questions;
      job.completedAt = Date.now();
    }

    // Save to MongoDB if connected
    try {
      if (dbConnected()) {
        const g = new Generation({
          topic: topic || 'MCP Generated',
          type:  type  || 'coding',
          track, client, course: course || '', difficulty,
          questions,
          timestamp: new Date()
        });
        await g.save();
      }
    } catch (err) {
      console.error('[MCP save]', err.message);
    }

    res.json({ ok: true, saved: questions.length });
  });

  // POST /api/mcp/save-planner — saves Claude-generated planner from MCP session
  app.post('/api/mcp/save-planner', async (req, res) => {
    const secret = req.headers['x-mcp-secret'];
    if (secret !== (process.env.MCP_SECRET || 'friday-mcp-2025')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { jobId, courseName, track, client, weeks } = req.body;
    if (!weeks || !Array.isArray(weeks)) return res.status(400).json({ error: 'weeks array required' });

    if (mcpJobs.has(jobId)) {
      const job = mcpJobs.get(jobId);
      job.status = 'done';
      job.result = weeks;
      job.topic = courseName || job.topic;
      job.completedAt = Date.now();
    }

    try {
      if (dbConnected()) {
        const planner = new Planner({
          courseName: courseName || 'MCP Generated',
          track: track || 'DSA',
          plannerFile: 'mcp-generated',
          weeks,
          createdAt: new Date()
        });
        await planner.save();
      }
    } catch (err) {
      console.error('[MCP save-planner]', err.message);
    }

    res.json({ ok: true, saved: weeks.length });
  });

  // GET /api/mcp/status — frontend polls this to detect active MCP jobs
  app.get('/api/mcp/status', (req, res) => {
    const jobs = [...mcpJobs.values()].sort((a, b) => b.startedAt - a.startedAt);
    const active = jobs.find(j => j.status === 'running') || jobs[0] || null;
    if (!active) return res.json({ status: 'idle' });
    res.json({
      jobId:       active.id,
      status:      active.status,
      topic:       active.topic,
      type:        active.type,
      count:       active.count,
      track:       active.track,
      course:      active.course || '',
      client:      active.client || '',
      difficulty:  active.difficulty || 'Medium',
      startedAt:   active.startedAt,
      completedAt: active.completedAt || null,
      result:      active.status === 'done' ? active.result : null,
      error:       active.error || null
    });
  });

  // GET /api/mcp/status/:jobId — MCP server polls a specific job
  app.get('/api/mcp/status/:jobId', (req, res) => {
    const job = mcpJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      jobId:       job.id,
      status:      job.status,
      topic:       job.topic,
      type:        job.type,
      count:       job.count,
      track:       job.track,
      startedAt:   job.startedAt,
      completedAt: job.completedAt || null,
      result:      job.status === 'done' ? job.result : null,
      error:       job.error || null
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

// ── Global JSON error handler (Express 5 — catches async route throws) ─────
// Without this, Express 5 returns HTML 500 for unhandled async errors,
// which breaks every frontend .json() call.
app.use((err, req, res, next) => {
  console.error('[Express error]', err?.message || err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
