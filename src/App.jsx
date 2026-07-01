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
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Edit2, 
  Save, 
  LayoutDashboard, 
  Settings, 
  Database, 
  Sparkles, 
  User, 
  Trash2, 
  Plus, 
  LogOut, 
  Moon, 
  Sun,
  Zap,
  Maximize2,
  Minimize2,
  Activity, 
  CheckSquare, 
  FileCode, 
  Key, 
  Mail, 
  Layers, 
  Lock,
  FileSpreadsheet, 
  RefreshCw,
  ImagePlus,
  CalendarDays,
  Clock,
  BrainCircuit,
  Info,
  Sliders,
  Bell,
  Globe,
  PlusCircle,
  TrendingUp,
  Search,
  BookOpen,
  Home,
  Power,
  FolderOpen,
  LayoutGrid,
  List,
  ArrowLeft,
  Columns,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Download,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { downloadMCQsAsExcel } from './lib/excelExport';
import { downloadQuestionsAsPDF } from './lib/pdfExport';
import { generateCodingQuestions, generateMCQs } from './lib/gemini';
import { cn } from './lib/utils';
import { CodingCard } from './components/CodingCard';
import { MCQCard } from './components/MCQCard';
import { QLoader } from './components/QLoader';
import { PlannerPage } from './components/PlannerPage';
import { PlannerView } from './components/PlannerView';
import { ContentWeb } from './components/ContentWeb';




// Quotes shown in MCP loading overlay
const MCP_QUOTES = [
  "Teaching machines to think, one question at a time.",
  "Cross-referencing 1,000+ coding patterns for uniqueness.",
  "Real-world domains: Healthcare · Banking · Logistics · Gaming.",
  "Calibrating difficulty to your track level...",
  "Ensuring each question uses a different domain scenario.",
  "Building problems that make developers genuinely think.",
  "Edge cases are features, not bugs. Adding them now.",
  "O(N log N) time complexity? Verified and enforced.",
  "Compiling complete solutions in Java, Python, C++ and C.",
  "Quality over quantity — every question hand-crafted by AI.",
  "Scenario engines initialised. Content pipeline running.",
  "Zero memorisation questions. Deep conceptual understanding only.",
];

// Setup Mock User Info
const defaultUser = {
  name: "Sai Deepak D Y",
  empId: "neo10506",
  initials: "SD",
  department: "Swift Ops",
  role: "admin"
};

export default function App() {
  // Navigation & Authentication
  const [appOpening, setAppOpening] = useState(true);
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [userRole, setUserRole] = useState('admin'); // 'employee' or 'admin'
  const [loginIdInput, setLoginIdInput] = useState('neo10506');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  
  // App Logic States
  const [generations, setGenerations] = useState([]);
  const [activeGeneration, setActiveGeneration] = useState(null);
  const [state, setState] = useState('idle'); // 'idle' | 'generating' | 'results' | 'error'
  const isGenerating = state === 'generating'; // convenience alias used in generate form
  const [dbStatus, setDbStatus] = useState('connected');

  // MCP real-time job tracking
  const [mcpJob, setMcpJob] = useState(null); // {jobId, topic, type, count, track, status, startedAt}
  const [mcpOverlay, setMcpOverlay] = useState(false); // show the timer overlay
  const [overlayMsg, setOverlayMsg] = useState('Connecting to AI engine');
  // Rotating quote in MCP overlay
  const [mcpQuoteIdx, setMcpQuoteIdx] = useState(0);
  // MCP prompt modal (copy-to-clipboard)
  const [mcpPromptModal, setMcpPromptModal] = useState(false);
  const [mcpPromptText, setMcpPromptText] = useState('');
  // Arcade modal
  const [arcadeOpen, setArcadeOpen] = useState(false);
  
  // Settings Tab Navigation
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');

  // Taxonomy Lists (Dynamic) — seeded from TVA real data
  const [taxTracks, setTaxTracks] = useState([
    // Problem Solving
    'DSA', 'Aptitude', 'C', 'C++',
    // Languages / Frameworks
    'Java', 'Java Full Stack', 'Python', 'Python / ML', '.NET',
    // Web
    'React', 'Node.js', 'Angular', 'Vue.js',
    // Databases
    'MySQL', 'MongoDB',
    // Cloud / DevOps
    'AWS', 'Azure', 'Docker',
    // Specializations
    'AI/ML', 'Cybersecurity', 'SDET', 'SAP', 'DAA'
  ]);
  const [taxClients, setTaxClients] = useState([
    // University partners
    'Parul University', 'SKG (Sri Krishna Group)', 'Kumaraguru College of Technology',
    'Rajalakshmi Engineering College', "St. Joseph's College of Engineering",
    // Corporate clients
    'LTIMindtree', 'Hexaware',
    // Internal
    'iamneo Internal'
  ]);
  const [taxDomains, setTaxDomains] = useState(['Software Engineering', 'Data Science', 'DevOps', 'Cloud Computing']);
  const [taxStacks, setTaxStacks] = useState(['Full Stack', 'DSA', 'Web Dev', 'Python', 'Cloud', 'SDET']);
  const [taxCourses, setTaxCourses] = useState([
    'NerdX DSA Program', 'NerdX Aptitude Program', 'Java Fundamentals',
    'Spring Boot Essentials', 'Python Fundamentals', 'React Fundamentals',
    '.NET & Azure Bootcamp', 'Machine Learning Foundations', 'Cybersecurity Essentials'
  ]);
  const [taxModules, setTaxModules] = useState([
    'Week 1 – Foundations', 'Week 2 – Core Concepts', 'Week 3 – Advanced Topics',
    'Week 4 – Problem Solving', 'Assessment & Project'
  ]);

  // Content Bank state — grouped from real TVA programmes
  const [trackGroups, setTrackGroups] = useState({
    'Problem Solving':       ['DSA', 'Aptitude', 'C', 'C++', 'DAA'],
    'Languages & Frameworks':['Java', 'Java Full Stack', 'Python', 'Python / ML', '.NET'],
    'Web & Frontend':        ['React', 'Node.js', 'Angular', 'Vue.js'],
    'Databases':             ['MySQL', 'MongoDB'],
    'Cloud & DevOps':        ['AWS', 'Azure', 'Docker'],
    'Specializations':       ['AI/ML', 'Cybersecurity', 'SDET', 'SAP'],
  });
  const [tracksWithCourses, setTracksWithCourses] = useState({
    'DSA': [
      'NerdX DSA Program', 'BCA/MCA DSA Bootcamp',
      'Data Structures Essentials', 'Algorithm Design & Analysis',
      'Competitive Programming Prep'
    ],
    'Aptitude': [
      'NerdX Aptitude Program', 'Quantitative Reasoning Bootcamp',
      'Verbal Reasoning & Logic', 'Number Theory & Arithmetic'
    ],
    'C': [
      'C Programming Fundamentals', 'KCT Sem I C Revision',
      'Pointers & Memory Management', 'File Handling in C'
    ],
    'C++': [
      'REC Summer C++ Program', 'C++ Object-Oriented Programming',
      'STL & Algorithms in C++', 'C++ for Competitive Coding'
    ],
    'Java': [
      'Java Fundamentals', 'OOP in Java', 'Collections & Generics',
      'Java 8+ Features', 'JDBC & MySQL Integration'
    ],
    'Java Full Stack': [
      'LTIMindtree Full Stack Java', 'Spring Boot Essentials',
      'Microservices with Spring Boot', 'REST APIs with Spring',
      'Full Stack with Angular + Java'
    ],
    'Python': [
      'Python Fundamentals', 'Data Structures in Python',
      'Hexaware Python Mentorship B3', 'Hexaware Python Mentorship B4',
      'Django Web Development'
    ],
    'Python / ML': [
      'NumPy & Pandas Essentials', 'Machine Learning Foundations',
      'Scikit-Learn Practicals', 'Deep Learning & Neural Networks'
    ],
    '.NET': [
      'LTIMindtree .NET Training', 'C# Fundamentals',
      'ASP.NET Core Web API', 'Cloud Azure with .NET'
    ],
    'React': [
      'React Fundamentals', 'React Hooks & Context API',
      'Redux State Management', 'Next.js Essentials'
    ],
    'Node.js': [
      'Node.js Fundamentals', 'Express.js Framework',
      'REST API Development with Node', 'Node.js & MongoDB Integration'
    ],
    'Angular': [
      'Angular Fundamentals', 'RxJS & Observables',
      'Angular Forms & Routing', 'Angular with Spring Boot'
    ],
    'Vue.js': [
      'Vue.js Fundamentals', 'Vue 3 Composition API', 'Vuex State Management'
    ],
    'MySQL': [
      'SQL Fundamentals', 'Advanced MySQL Queries',
      'Database Design & Normalization', 'Stored Procedures & Triggers'
    ],
    'MongoDB': [
      'MongoDB Fundamentals', 'Mongoose with Node.js',
      'Aggregation Pipeline', 'MongoDB Atlas & Cloud'
    ],
    'AWS': [
      'AWS Cloud Practitioner', 'EC2 & S3 Essentials',
      'AWS Lambda & Serverless', 'AWS DevOps Pipeline'
    ],
    'Azure': [
      'Azure Fundamentals (AZ-900)', 'Cloud Infrastructure Services',
      'Azure DevOps Pipeline', 'Azure with .NET'
    ],
    'Docker': [
      'Docker Fundamentals', 'Docker Compose & Networking',
      'Kubernetes Essentials', 'CI/CD with Docker & Jenkins'
    ],
    'AI/ML': [
      'VIT-WILP M.Tech AI/ML Program', 'Machine Learning Algorithms',
      'Deep Learning Essentials', 'NLP Fundamentals'
    ],
    'Cybersecurity': [
      'LTIMindtree CySec Track', 'Network Security Fundamentals',
      'Ethical Hacking Essentials', 'OWASP Top 10 Practicals'
    ],
    'SDET': [
      'LTIMindtree SDET Track', 'Selenium WebDriver',
      'API Testing with Postman', 'Test Automation Frameworks'
    ],
    'SAP': [
      'SAP ABAP Fundamentals', 'SAP S/4HANA Basics', 'SAP FICO Overview'
    ],
    'DAA': [
      'Design & Analysis of Algorithms', 'Complexity Theory',
      'Dynamic Programming Deep Dive', 'Graph Algorithms'
    ],
  });
  const [contentBankCategory, setContentBankCategory] = useState(null);
  const [contentBankTrack, setContentBankTrack] = useState(null);
  const [contentBankCourse, setContentBankCourse] = useState(null);
  const [contentBankSearchQuery, setContentBankSearchQuery] = useState('');
  const [contentBankFullscreen, setContentBankFullscreen] = useState(false);
  const [bankViewMode, setBankViewMode] = useState('grid');
  

  // Custom Content Bank Modal states
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankModalType, setBankModalType] = useState('track'); // 'track' or 'course'
  const [bankModalInput, setBankModalInput] = useState('');

  // Split View states
  const [isSplitView, setIsSplitView] = useState(false);
  const [selectedSplitQIndex, setSelectedSplitQIndex] = useState(0);

  // Add/Remove values for profile/settings list
  const [inputs, setInputs] = useState({
    profileName: defaultUser.name,
    profileEmpId: defaultUser.empId,
    profileDept: defaultUser.department,
    newTrack: '',
    newClient: '',
    newModule: '',
    newCourse: ''
  });

  // Generator Options State
  const [selectedClient, setSelectedClient] = useState('Parul University');
  const [selectedStack, setSelectedStack] = useState('Full Stack');
  const [selectedDomain, setSelectedDomain] = useState('Software Engineering');
  const [selectedTrack, setSelectedTrack] = useState('DSA');
  const [selectedCourse, setSelectedCourse] = useState('NerdX DSA Program');
  const [topic, setTopic] = useState('Binary Search Trees');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generationMode, setGenerationMode] = useState('questions'); // 'questions' | 'assessment'
  const [selectedType, setSelectedType] = useState('coding'); // 'coding' | 'mcq'
  const [count, setCount] = useState(10);
  const [sourceType, setSourceType] = useState('non-leetcode'); // 'non-leetcode' | 'leetcode'
  const [difficulty, setDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard'
  const [activeTone, setActiveTone] = useState('Professional');
  const [engine, setEngine] = useState('auto_route'); // 'auto_route' | 'gemini_pro' | 'gemini_flash'

  // Content Bank Filters State
  const [bankSearch, setBankSearch] = useState('');
  const [bankTypeFilter, setBankTypeFilter] = useState('');
  const [bankDiffFilter, setBankDiffFilter] = useState('');

  // ── Default format templates per track category ───────────────────────────
  const DEFAULT_FORMATS = {
    problem_solving: `TITLE: [Unique descriptive problem title]

SCENARIO: [Engaging real-world context that motivates the problem — describe the setting, characters, or system involved]

PROBLEM STATEMENT: [Clear, unambiguous description of what needs to be computed or solved]

INPUT FORMAT:
[Describe each line of input — data types, ranges, separators]

OUTPUT FORMAT:
[Describe the expected output — exact format, ordering, separators]

CONSTRAINTS:
• 1 ≤ N ≤ 10^5
• All values fit in a 32-bit integer
• Time limit: O(N log N) or better

SAMPLE INPUT:
5
1 2 3 4 5

SAMPLE OUTPUT:
15

TEST CASES: 15 total (3 visible to students, 12 hidden for grading)

SOLUTIONS: Full working optimal code in C, C++, Java, Python — 4-space indented, with inline comments`,

    database: `CASE STUDY — [Company Name] ([Industry])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUSINESS CONTEXT (minimum 6 lines — no one-liners):
[Line 1: Company name, industry, size — what they do and who they serve]
[Line 2: The specific database challenge or expansion they are currently facing]
[Line 3: What tables and data already exist, and what business activity they capture]
[Line 4: The business impact if this query/operation is wrong — who depends on it]
[Line 5: Exactly what the student must write and what their result will be used for]
[Line 6: Any extra business rules, edge cases, or domain-specific constraints]

SERIES POSITION: Question [N] of [Total] | Builds on: [previous question title or "None — establishes base schema"]

[IMAGE:0]

DATABASE SCHEMA:
Table: [table_name]
  • [column_name]  [TYPE]  [PRIMARY KEY / FOREIGN KEY / NOT NULL / DEFAULT]
  [List ALL columns for EVERY table in the connected schema]
Relationships:
  • [table1].[fk_column] → [table2].[pk_column]  ([ON DELETE CASCADE / RESTRICT])

SAMPLE DATA (3–5 realistic rows per table):
Table: [table_name]
| [col1]   | [col2]   | [col3]   |
|----------|----------|----------|
| value1   | value2   | value3   |

TASK: [One clear, specific instruction — exactly what SQL/NoSQL the student must write. No ambiguity.]

EXPECTED OUTPUT (pipe-formatted table):
| [result_col1]  | [result_col2]  |
|----------------|----------------|
| expected_val1  | expected_val2  |

TECHNICAL NOTES:
• SQL Dialect: MySQL / PostgreSQL / Standard SQL
• Difficulty: Easy / Medium / Hard
• Core Concept: [SELECT | JOIN | GROUP BY | Subquery | Window Function | Index | Transaction | Normalization]
• Prerequisite: [Previous question title or "None — this establishes the base schema"]`
  };

  // Format template state — keyed by "track|type"
  const [trackFormats, setTrackFormats] = useState({});
  const [showFormatEditor, setShowFormatEditor] = useState(false);
  const [isSavingFormat, setIsSavingFormat] = useState(false);
  // Images attached to format templates — shown at [IMAGE:N] positions in rendered questions
  const [trackFormatImages, setTrackFormatImages] = useState({});
  const [currentSessionImages, setCurrentSessionImages] = useState([]);
  const formatTextareaRef = useRef(null);

  // ── BYOK: per-user API key state ─────────────────────────────────────────
  const [userApiKeys,    setUserApiKeys]    = useState({ groq: false, openai: false, anthropic: false, gemini: false, mistral: false, deepseek: false, nvidia: false });
  const [userApiModels,  setUserApiModels]  = useState({ groq: '', openai: '', anthropic: '', gemini: '', mistral: '', deepseek: '', nvidia: '' });
  const [tokenUsage,     setTokenUsage]     = useState({}); // { [provider]: { tokensUsed, requestCount } }
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('qa_provider') || 'groq');
  const [activeModel,    setActiveModel]    = useState(() => localStorage.getItem('qa_model')    || 'llama-3.3-70b-versatile');
  const [keyPanelProvider, setKeyPanelProvider] = useState('groq');
  const [keyInput,       setKeyInput]       = useState('');
  const [showKeyInput,   setShowKeyInput]   = useState(false);
  const [isSavingKey,    setIsSavingKey]    = useState(false);
  const [isTestingKey,   setIsTestingKey]   = useState(false);
  const [keyTestResult,  setKeyTestResult]  = useState(null); // null | 'ok' | 'fail'

  // Planners loaded for content bank track injection
  const [bankPlanners,        setBankPlanners]        = useState([]);
  const [activePlannerInBank, setActivePlannerInBank] = useState(null);

  // Clock
  const [currentTime, setCurrentTime] = useState('');

  // Theme support effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Turn off initial app opening loader after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAppOpening(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Recover session from localStorage on app load
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken?.startsWith('demo-token-')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return;
    }

    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setInputs(prev => ({
          ...prev,
          profileName: user.displayName || user.username,
          profileEmpId: user.username
        }));
        setIsLoggedIn(true);
      } catch (err) {
        console.warn('Failed to recover session');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Initial Fetches
  useEffect(() => {
    fetchHistory();
    checkHealth();
    fetchFormats();
    fetchUserApiKeys();
    // Load planners for content bank track injection
    apiFetch('/api/planners').then(r => r.ok && r.json().then(setBankPlanners)).catch(() => {});
    // fetch persisted courses
    (async () => {
      try {
        const r = await apiFetch('/api/courses');
        if (!r.ok) return; // Skip if not ok
        const list = await r.json();
        if (Array.isArray(list) && list.length) {
          setTracksWithCourses(prev => {
            const copy = { ...prev };
            list.forEach(c => {
              if (!copy[c.track]) copy[c.track] = [];
              if (!copy[c.track].some(x => x.toLowerCase() === c.name.toLowerCase())) {
                copy[c.track] = [...copy[c.track], c.name];
              }
            });
            return copy;
          });
          setTaxCourses(prev => {
            const copy = [...prev];
            list.forEach(c => {
              if (!copy.some(x => x.toLowerCase() === c.name.toLowerCase())) copy.push(c.name);
            });
            return copy;
          });
        }
      } catch (err) {
        // ignore
      }
    })();
    
    // Set up Time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync classification states if taxonomy changes
  useEffect(() => {
    if (taxClients.length && !taxClients.includes(selectedClient)) setSelectedClient(taxClients[0]);
    if (taxStacks.length && !taxStacks.includes(selectedStack)) setSelectedStack(taxStacks[0]);
    if (taxDomains.length && !taxDomains.includes(selectedDomain)) setSelectedDomain(taxDomains[0]);
    if (taxTracks.length && !taxTracks.includes(selectedTrack)) setSelectedTrack(taxTracks[0]);
  }, [taxTracks, taxClients, taxDomains, taxStacks]);

  // Dynamically populate tracksWithCourses and taxTracks from generations
  useEffect(() => {
    if (!generations || generations.length === 0) return;
    setTracksWithCourses(prev => {
      const copy = { ...prev };
      generations.forEach(g => {
        if (!g.track || !g.track.trim()) return;
        const trackCleaned = g.track.trim();

        // Find if this track is already in the list case-insensitively
        let matchedTrackKey = Object.keys(copy).find(
          k => k.toLowerCase() === trackCleaned.toLowerCase()
        );

        if (!matchedTrackKey) {
          matchedTrackKey = trackCleaned;
          copy[matchedTrackKey] = [];
        }

        if (g.course && g.course.trim()) {
          const courseCleaned = g.course.trim();
          const exists = copy[matchedTrackKey].some(
            c => c.toLowerCase() === courseCleaned.toLowerCase()
          );
          if (!exists) {
            copy[matchedTrackKey] = [...copy[matchedTrackKey], courseCleaned];
          }
        }
      });
      return copy;
    });

    setTaxTracks(prev => {
      const copy = [...prev];
      generations.forEach(g => {
        if (g.track && g.track.trim()) {
          const trackCleaned = g.track.trim();
          const exists = copy.some(t => t.toLowerCase() === trackCleaned.toLowerCase());
          if (!exists) {
            copy.push(trackCleaned);
          }
        }
      });
      return copy;
    });

    // Auto-categorize new tracks into trackGroups
    setTrackGroups(prev => {
      const copy = { ...prev };
      const allCurrentTracks = Object.values(copy).flat();

      generations.forEach(g => {
        if (!g.track || !g.track.trim()) return;
        const trackCleaned = g.track.trim();

        // Check if track is already categorized
        const isAlreadyCategorized = allCurrentTracks.some(t => t.toLowerCase() === trackCleaned.toLowerCase());
        if (isAlreadyCategorized) return;

        // Auto-categorize based on naming patterns
        let category = 'Problem Solving'; // default category

        if (trackCleaned.includes('ML') || trackCleaned.includes('AI')) {
          category = 'AI/ML';
        } else if (trackCleaned.includes('Database') || trackCleaned.includes('SQL') || trackCleaned.includes('MongoDB') || trackCleaned.includes('PostgreSQL')) {
          category = 'Database';
        } else if (trackCleaned.includes('.NET') || trackCleaned.includes('Azure') || trackCleaned.includes('AWS') || trackCleaned.includes('Cloud')) {
          category = 'Cloud & Infrastructure';
        }

        // Ensure category exists
        if (!copy[category]) {
          copy[category] = [];
        }

        // Add track to category if not already there
        if (!copy[category].some(t => t.toLowerCase() === trackCleaned.toLowerCase())) {
          copy[category].push(trackCleaned);
        }
      });

      return copy;
    });
  }, [generations]);

  // ── MCP job polling — detects when Claude triggers generation via MCP ─────────
  useEffect(() => {
    const pollMcp = async () => {
      try {
        const resp = await fetch('/api/mcp/status');
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.status === 'idle') {
          // If we were showing the overlay and job is now gone, clear it
          if (mcpOverlay && mcpJob && (Date.now() - (mcpJob.startedAt || 0)) > 5000) {
            setMcpOverlay(false);
          }
          return;
        }
        // Active or recently completed job
        setMcpJob(data);
        if (data.status === 'running') {
          setMcpOverlay(true);
        }
        if (data.status === 'done' && mcpOverlay) {
          if (data.type === 'planner') {
            // Re-save planner with authenticated userId
            if (data.result && Array.isArray(data.result) && data.result.length > 0) {
              try {
                await apiFetch('/api/planners', {
                  method: 'POST',
                  body: JSON.stringify({
                    courseName: data.topic || 'MCP Generated',
                    track: data.track || 'DSA',
                    plannerFile: 'mcp-generated',
                    weeks: data.result
                  })
                });
              } catch { /* ignore */ }
            }
            setTimeout(() => {
              setMcpOverlay(false);
              setMcpJob(null);
              showPage('planner');
            }, 3000);
          } else {
            // Re-save questions with authenticated userId so they appear in history
            if (data.result && Array.isArray(data.result) && data.result.length > 0) {
              try {
                await apiFetch('/api/history', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    topic: data.topic || 'MCP Generated',
                    type: data.type || 'coding',
                    track: data.track || 'DSA',
                    course: data.course || '',
                    client: data.client || 'General',
                    difficulty: data.difficulty || 'Medium',
                    questions: data.result,
                    source: 'mcp'
                  })
                });
              } catch { /* ignore */ }
            }
            await fetchHistory();
            setTimeout(() => {
              setMcpOverlay(false);
              setMcpJob(null);
              const jTrack  = data.track;
              const jCourse = data.course;
              const jCat    = getCategoryForTrack(jTrack);
              if (jCat)    setContentBankCategory(jCat);
              if (jTrack)  setContentBankTrack(jTrack);
              if (jCourse) setContentBankCourse(jCourse);
              showPage('contentbank');
            }, 3000);
          }
        }
        if (data.status === 'error' && mcpOverlay) {
          setTimeout(() => {
            setMcpOverlay(false);
            setMcpJob(null);
          }, 4000);
        }
      } catch {
        // Ignore poll errors silently
      }
    };
    const interval = setInterval(pollMcp, 2000);
    return () => clearInterval(interval);
  }, [mcpOverlay, mcpJob]);

  // Rotate quotes during MCP overlay
  useEffect(() => {
    if (!mcpOverlay) { setMcpQuoteIdx(0); return; }
    const t = setInterval(() => setMcpQuoteIdx(i => (i + 1) % MCP_QUOTES.length), 3500);
    return () => clearInterval(t);
  }, [mcpOverlay]);

  // Build the full MCP prompt from the current generate form state
  const handleGetMcpPrompt = () => {
    if (!topic.trim()) { showToast('Enter a topic first!', true); return; }
    const type = generationMode === 'coding' ? 'coding' : 'mcq';
    const format = getActiveFormat();
    const lines = [
      `Use questai generate_questions with these parameters:`,
      `  topic: "${topic}"`,
      `  type: ${type}`,
      `  count: ${count}`,
      `  track: "${selectedTrack}"`,
      `  client: "${selectedClient}"`,
      `  course: "${selectedCourse}"`,
      `  difficulty: "${difficulty}"`,
      `  source: "${sourceType}"`,
    ];
    if (additionalContext.trim()) {
      lines.push(``, `Additional context:`, additionalContext.trim());
    }
    if (format) {
      lines.push(``, `Use this exact output format for every question:`, format);
    }
    setMcpPromptText(lines.join('\n'));
    setMcpPromptModal(true);
  };

  // Build MCP prompt for planner generation (called from PlannerPage via prop)
  const handleGetMcpPlannerPrompt = ({ courseName, track, client, skillBuilderCount, practiceAtHomeCount, challengeYourselfCount }) => {
    if (!courseName?.trim()) { showToast('Enter a course name first!', true); return; }
    if (!track) { showToast('Select a track first!', true); return; }
    const lines = [
      `I need to generate a F.R.I.D.A.Y Content Planner. Please:`,
      ``,
      `1. Read my attached Excel planner file to extract:`,
      `   - Week number from the "Week" column`,
      `   - Topic from the "Topic" column`,
      `   - Subtopics from the "Subtopics" column (comma-separated, optional)`,
      ``,
      `2. Call questai.generate_planner with these parameters:`,
      `   courseName: "${courseName}"`,
      `   track: "${track}"`,
      `   client: "${client || 'General'}"`,
      `   skillBuilderCount: ${skillBuilderCount}`,
      `   practiceAtHomeCount: ${practiceAtHomeCount}`,
      `   challengeYourselfCount: ${challengeYourselfCount}`,
      `   weeks: [extracted JSON array from the Excel — [{weekNumber, topic, subtopics[]}, ...]]`,
      ``,
      `3. Generate coding questions for every week as instructed by the tool.`,
      ``,
      `4. Call questai.save_planner with jobId, courseName, track, client, and the full planner JSON.`,
    ];
    setMcpPromptText(lines.join('\n'));
    setMcpPromptModal(true);
  };

  // Find which content bank category a track belongs to
  const getCategoryForTrack = (track) => {
    for (const [cat, tracks] of Object.entries(trackGroups)) {
      if (tracks.some(t => t.toLowerCase() === (track || '').toLowerCase())) return cat;
    }
    return null;
  };

  const checkHealth = async () => {
    try {
      const response = await apiFetch('/api/health');
      if (!response.ok) {
        setDbStatus('error');
        return;
      }
      const data = await response.json();
      setDbStatus(data.mongodb === 'connected' ? 'connected' : 'error');
    } catch (err) {
      setDbStatus('error');
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await apiFetch('/api/history');
      if (!response.ok) {
        console.warn(`Failed to fetch history: ${response.status}`);
        return; // Don't crash, just skip loading
      }
      const data = await response.json();
      if (!Array.isArray(data)) return; // Validate data type

      const sorted = data
        .map(g => ({
          ...g,
          timestamp: typeof g.timestamp === 'string' ? new Date(g.timestamp) : g.timestamp
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      setGenerations(sorted);
      if (sorted.length > 0) {
        setActiveGeneration(sorted[0]);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };


  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast('Enter a topic first!', true);
      return;
    }
    setState('generating');
    setOverlayMsg('Connecting to AI engine...');
    
    // Update subtext slightly with animation simulation
    setTimeout(() => {
      setOverlayMsg(`Generating ${count} ${selectedType.toUpperCase()} questions...`);
    }, 1000);

    try {
      const generationContext = {
        client: selectedClient,
        stack: selectedStack,
        domain: selectedDomain,
        track: selectedTrack,
        course: selectedCourse,
        mode: generationMode,
        tone: activeTone,
        additionalContext: additionalContext.trim(),
        customFormat: getActiveFormat(),
        provider: activeProvider,
        model:    activeModel
      };
      let questions = [];
      if (selectedType === 'coding') {
        questions = await generateCodingQuestions(topic, count, sourceType, difficulty, generationContext);
      } else {
        questions = await generateMCQs(topic, count, generationContext);
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid or empty response from AI model");
      }

      // Add dynamic metadata tags to question results
      const finalQuestions = questions.map(q => ({
        ...q,
        recommendedFor: q.recommendedFor || `${selectedTrack} track - ${selectedClient}`
      }));

      const newGenPayload = {
        topic: topic,
        type: selectedType,
        questions: finalQuestions,
        client: selectedClient,
        stack: selectedStack,
        domain: selectedDomain,
        track: selectedTrack,
        course: selectedCourse,
        context: generationContext,
        difficulty: difficulty,
        timestamp: new Date().toISOString()
      };

      // Snapshot images for this generation (used to render [IMAGE:N] markers in question cards)
      setCurrentSessionImages(trackFormatImages[getFormatKey(selectedTrack, selectedType)] || []);

      const saveResponse = await apiFetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGenPayload)
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        throw new Error(error.error || `Server error: ${saveResponse.status}`);
      }

      const savedDoc = await saveResponse.json();
      if (!savedDoc._id) {
        throw new Error('Invalid response from server');
      }

      setGenerations(prev => [savedDoc, ...prev]);
      setActiveGeneration(savedDoc);
      setState('idle');
      showToast(`✓ ${finalQuestions.length} questions saved to database!`);

      // Pivot to content bank to preview results
      setCurrentPage('contentbank');
    } catch (error) {
      console.error("AI Generation error:", error);
      setState('idle');
      showToast(`Generation failed: ${error.message}`, true);
    }
  };

  // Helper for mock fallback questions to act as a fail-safe
  const generateFallbackData = (subject, type, num, diff) => {
    const list = [];
    for(let i = 0; i < num; i++) {
      if (type === 'coding') {
        list.push({
          id: `fb_q_${i}_${Date.now()}`,
          title: `${subject} Optimized Puzzle #${i+1}`,
          description: `Given a set of streaming node operations, implement an optimized approach to resolve the core dependencies for a complex **${subject}** layout.\n\n### Constraints\n- Optimal time complexity should be $O(N)$ or better.\n- Memory footprints strictly guarded to $64$ megabytes maximum space.`,
          inputFormat: `The first line presents the seed sequence integers. Subsequent logs map the query streams.`,
          outputFormat: `Return a binary vector state output reporting node validity.`,
          constraints: `1 <= N <= 10^5\n-10^9 <= query[i] <= 10^9`,
          sampleInput: `5\n10 20 15 30 25`,
          sampleOutput: `[1, 0, 1, 1, 0]`,
          difficulty: diff,
          leetcodeNumber: sourceType === 'leetcode' ? Math.floor(Math.random() * 3200) + 1 : null,
          recommendedFor: `${selectedTrack} - ${selectedCourse}`,
          testCases: [
            { input: "5\n10 20 15 30 25", output: "[1, 0, 1, 1, 0]", isPublic: true },
            { input: "3\n1 2 3", output: "[1, 1, 0]", isPublic: true },
            { input: "8\n9 4 5 12", output: "[0, 0, 1, 1]", isPublic: false }
          ],
          solutions: {
            python: `def solveNodeStructure(stream):\n    # Optimized Python Solver for ${subject}\n    results = []\n    for value in stream:\n        if value % 5 == 0:\n            results.append(1)\n        else:\n            results.append(0)\n    return results\n`,
            cpp: `// Optimized C++ Solver for ${subject}\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nvector<int> solveNode(vector<int>& arr) {\n    vector<int> res;\n    for(int val : arr) {\n        res.push_back(val % 5 == 0 ? 1 : 0);\n    }\n    return res;\n}\n`,
            java: `// Optimized Java Solver for ${subject}\nimport java.util.*;\n\npublic class Solution {\n    public List<Integer> solve(int[] input) {\n        List<Integer> list = new ArrayList<>();\n        for(int v : input) {\n            list.add(v % 5 == 0 ? 1 : 0);\n        }\n        return list;\n    }\n}\n`,
            c: `// Optimized C Solver for ${subject}\n#include <stdio.h>\n\nint* solveC(int* arr, int len) {\n    static int res[100];\n    for(int i = 0; i < len; i++) {\n        res[i] = arr[i] % 5 == 0 ? 1 : 0;\n    }\n    return res;\n}\n`
          }
        });
      } else {
        // MCQ
        const sampleQuestions = [
          `What is the average time complexity to resolve a dependency on a ${subject} element in worst-case conditions?`,
          `Which design pattern is best suited to partition streaming segments on a ${subject} module sequence?`,
          `Which storage strategy provides O(1) pointer allocations when updating tree-nodes of a ${subject} implementation?`,
          `How is memory allocated internally for recursively nested scopes of ${subject} routines?`
        ];
        const qText = sampleQuestions[i % sampleQuestions.length];
        list.push({
          id: `fb_q_${i}_${Date.now()}`,
          question: qText,
          options: [
            `Logarithmic O(log N) cycles`,
            `Linear scan O(N) constraints`,
            `Quadratic time decay O(N^2)`,
            `Amortized constant block O(1)`
          ],
          correctAnswer: i % 4,
          explanation: `A strict assessment reveals that processing elements under ${subject} structures scales incrementally, yielding a balanced log parameter in standard heaps, but deteriorating to linear constraints if left unbalanced.`,
          recommendedFor: `${selectedTrack} Level 3 Students`
        });
      }
    }
    return list;
  };

  // Toast alert system
  const [toasts, setToasts] = useState([]);
  const showToast = (message, isError = false) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Nav page routing logic keeping settings sub tab in mind
  const showPage = (pageName) => {
    if (pageName === 'taxonomy') {
      setCurrentPage('settings');
      setActiveSettingsTab('taxonomy');
    } else {
      setCurrentPage(pageName);
    }
    if (pageName === 'contentbank') {
      apiFetch('/api/planners').then(r => r.ok && r.json().then(setBankPlanners)).catch(() => {});
    }
  };

  // Helper function to make authenticated API calls with JWT token
  const apiFetch = (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
  };

  // Open a planner from the content bank — fetch full version (list endpoint strips questions)
  const openBankPlanner = async (p) => {
    if (p._id && !String(p._id).startsWith('local-')) {
      try {
        const r = await apiFetch(`/api/planners/${p._id}`);
        if (r.ok) { setActivePlannerInBank(await r.json()); return; }
      } catch {}
    }
    setActivePlannerInBank(p); // fallback
  };

  // Profile save updates
  const handleSaveProfile = () => {
    showToast('✓ Profile configuration updated!');
  };

  // ── Format Template helpers ───────────────────────────────────────────────

  const getTrackCategory = (track) => {
    const dbKeywords = ['sql', 'mongo', 'postgresql', 'nosql', 'database', 'db'];
    if (dbKeywords.some(k => (track || '').toLowerCase().includes(k))) return 'database';
    return 'problem_solving';
  };

  const getFormatKey = (track, type) => `${track || 'default'}|${type || 'coding'}`;

  const getActiveFormat = () => {
    const key = getFormatKey(selectedTrack, selectedType);
    if (trackFormats[key]) return trackFormats[key];
    const category = getTrackCategory(selectedTrack);
    return DEFAULT_FORMATS[category] || DEFAULT_FORMATS.problem_solving;
  };

  const fetchFormats = async () => {
    try {
      const r = await apiFetch('/api/formats');
      if (!r.ok) return;
      const list = await r.json();
      if (Array.isArray(list)) {
        const map = {};
        list.forEach(f => { map[getFormatKey(f.track, f.type)] = f.format; });
        setTrackFormats(map);
      }
    } catch { /* silent fail */ }
  };

  // ── BYOK helpers ─────────────────────────────────────────────────────────

  const PROVIDER_MODELS = {
    groq: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Recommended)' },
      { id: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B' },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B' },
    ],
    openai: [
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini (Cheapest)' },
      { id: 'gpt-4o',       label: 'GPT-4o' },
      { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo' },
    ],
    anthropic: [
      { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku (Cheapest)' },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-opus-4-5',            label: 'Claude Opus 4.5' },
    ],
    gemini: [
      { id: 'gemini-1.5-flash',     label: 'Gemini 1.5 Flash (FREE ✓)' },
      { id: 'gemini-1.5-pro',       label: 'Gemini 1.5 Pro' },
      { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Exp)' },
    ],
    mistral: [
      { id: 'mistral-small-latest', label: 'Mistral Small (Affordable)' },
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'open-mistral-nemo',    label: 'Mistral Nemo (Free tier)' },
    ],
    deepseek: [
      { id: 'deepseek-chat',     label: 'DeepSeek Chat (Very Cheap)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1 (Reasoning)' },
    ],
    nvidia: [
      { id: 'meta/llama-3.1-70b-instruct',          label: 'Llama 3.1 70B (Recommended)' },
      { id: 'meta/llama-3.1-8b-instruct',           label: 'Llama 3.1 8B (Fastest)' },
      { id: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B (NVIDIA)' },
    ],
  };

  const fetchUserApiKeys = async () => {
    try {
      const r = await apiFetch('/api/user/api-keys');
      if (r.ok) {
        const { configured, models } = await r.json();
        setUserApiKeys(configured || {});
        setUserApiModels(models || {});
      }
    } catch {}
    fetchTokenUsage(); // refresh token meter alongside key refresh
  };

  const fetchTokenUsage = async () => {
    try {
      const r = await apiFetch('/api/user/token-usage');
      if (r.ok) {
        const records = await r.json();
        const byProvider = {};
        records.forEach(rec => { byProvider[rec.provider] = rec; });
        setTokenUsage(byProvider);
      }
    } catch {}
  };

  const handleSaveApiKey = async () => {
    if (!keyInput.trim()) { showToast('Enter your API key first', true); return; }
    setIsSavingKey(true);
    setKeyTestResult(null);
    try {
      const model = activeModel && activeProvider === keyPanelProvider ? activeModel : (PROVIDER_MODELS[keyPanelProvider]?.[0]?.id || '');
      const r = await apiFetch('/api/user/api-key', {
        method: 'PUT',
        body: JSON.stringify({ provider: keyPanelProvider, apiKey: keyInput.trim(), model })
      });
      if (r.ok) {
        setUserApiKeys(prev => ({ ...prev, [keyPanelProvider]: true }));
        setUserApiModels(prev => ({ ...prev, [keyPanelProvider]: model }));
        setKeyInput('');
        showToast(`✓ ${keyPanelProvider} key saved`);
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(err.error || 'Save failed', true);
      }
    } catch (e) { showToast('Error: ' + e.message, true); }
    setIsSavingKey(false);
  };

  const handleTestApiKey = async () => {
    if (!keyInput.trim()) { showToast('Enter a key to test', true); return; }
    setIsTestingKey(true);
    setKeyTestResult(null);
    try {
      const r = await apiFetch('/api/user/api-key/test', {
        method: 'POST',
        body: JSON.stringify({
          provider: keyPanelProvider,
          apiKey: keyInput.trim(),
          model: PROVIDER_MODELS[keyPanelProvider]?.[0]?.id || ''
        })
      });
      // Guard: if the server returned HTML/empty (error handler not yet set up or crash)
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        setKeyTestResult('fail');
        showToast(`Server error (${r.status}) — restart the dev server and try again`, true);
        setIsTestingKey(false);
        return;
      }
      const data = await r.json();
      if (r.ok && data.success) {
        if (data.warning === 'quota') {
          // Key is valid — account just has no billing credits
          setKeyTestResult('quota');
          showToast(`⚠ Key valid — no credits yet. Add billing to use generation.`, false);
        } else {
          setKeyTestResult('ok');
          showToast(`✓ ${keyPanelProvider} connected — ${data.latencyMs}ms`);
        }
      } else {
        setKeyTestResult('fail');
        showToast(data.error || 'Test failed — check your API key', true);
      }
    } catch (e) {
      setKeyTestResult('fail');
      showToast('Test failed: ' + e.message, true);
    }
    setIsTestingKey(false);
  };

  const handleDeleteApiKey = async (provider) => {
    if (!window.confirm(`Remove your ${provider} API key?`)) return;
    try {
      const r = await apiFetch(`/api/user/api-key/${provider}`, { method: 'DELETE' });
      if (r.ok) {
        setUserApiKeys(prev => ({ ...prev, [provider]: false }));
        if (activeProvider === provider) {
          const fallback = Object.entries(userApiKeys).find(([p, v]) => p !== provider && v)?.[0] || 'groq';
          setActiveProvider(fallback);
          localStorage.setItem('qa_provider', fallback);
        }
        showToast(`✓ ${provider} key removed`);
      }
    } catch (e) { showToast('Error: ' + e.message, true); }
  };

  const handleSetActiveProvider = (provider, model) => {
    setActiveProvider(provider);
    setActiveModel(model || PROVIDER_MODELS[provider]?.[0]?.id || '');
    localStorage.setItem('qa_provider', provider);
    localStorage.setItem('qa_model', model || PROVIDER_MODELS[provider]?.[0]?.id || '');
    showToast(`✓ Using ${provider} — ${model || PROVIDER_MODELS[provider]?.[0]?.id}`);
  };

  const handleSaveFormat = async () => {
    const key = getFormatKey(selectedTrack, selectedType);
    const currentVal = trackFormats[key] ?? getActiveFormat();
    setIsSavingFormat(true);
    try {
      const r = await apiFetch('/api/formats', {
        method: 'PUT',
        body: JSON.stringify({
          track: selectedTrack,
          course: selectedCourse || '',
          type: selectedType,
          format: currentVal
        })
      });
      if (r.ok) showToast('✓ Format template saved!');
      else showToast('Failed to save format', true);
    } catch {
      showToast('Failed to save format', true);
    } finally {
      setIsSavingFormat(false);
    }
  };

  const handleFormatImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const key = getFormatKey(selectedTrack, selectedType);
      const id = `img_${key}_${Date.now()}`;
      setTrackFormatImages(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), { id, dataUrl: ev.target.result, label: file.name.replace(/\.[^/.]+$/, '') }]
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-upload of same file
  };

  const insertImageMarker = (imageIndex) => {
    const textarea = formatTextareaRef.current;
    const key = getFormatKey(selectedTrack, selectedType);
    const marker = `[IMAGE:${imageIndex}]`;
    if (textarea) {
      const start = textarea.selectionStart ?? 0;
      const current = trackFormats[key] ?? getActiveFormat();
      const newVal = current.slice(0, start) + marker + current.slice(start);
      setTrackFormats(prev => ({ ...prev, [key]: newVal }));
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + marker.length;
        textarea.focus();
      }, 0);
    } else {
      // fallback: append to end
      const current = trackFormats[key] ?? getActiveFormat();
      setTrackFormats(prev => ({ ...prev, [key]: current + '\n' + marker }));
    }
    showToast(`Inserted [IMAGE:${imageIndex}] at cursor`);
  };

  // Authentication helpers (call backend)
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Login against the server so protected generation routes receive a real JWT.
  const handleLoginSubmit = async () => {
    if (!loginIdInput.trim() || !loginPasswordInput.trim()) return showToast('Enter credentials', true);
    setIsLoggingIn(true);

    try {
      const username = loginIdInput.trim();
      const password = loginPasswordInput.trim();
      const fallbackDisplayName = username.charAt(0).toUpperCase() + username.slice(1);

      let response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.status === 401) {
        response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, displayName: fallbackDisplayName })
        });
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Login failed');
      }

      const user = await response.json();
      const displayName = user.displayName || user.username || fallbackDisplayName;

      localStorage.setItem('authToken', user.token);
      localStorage.setItem('user', JSON.stringify({
        username: user.username || username,
        displayName: displayName
      }));

      setIsLoggedIn(true);
      setInputs(prev => ({ ...prev, profileName: displayName, profileEmpId: user.username || username }));
      showToast(`✓ Welcome, ${displayName}!`);
      setCurrentPage('dashboard');

      // Clear inputs
      setLoginIdInput('');
      setLoginPasswordInput('');
    } catch (err) {
      showToast(err.message || 'Login failed', true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Taxonomy management
  const handleAddTaxItem = (category) => {
    const key = category === 'tracks' ? 'newTrack' :
                category === 'clients' ? 'newClient' :
                category === 'modules' ? 'newModule' : 'newCourse';
    const val = inputs[key]?.trim();
    if (!val) return;

    if (category === 'tracks') {
      setTaxTracks(prev => [...prev, val]);
      setTracksWithCourses(prev => ({ ...prev, [val]: prev[val] || [] }));
      if (contentBankCategory && !contentBankTrack) {
        setTrackGroups(prev => ({
          ...prev,
          [contentBankCategory]: [...(prev[contentBankCategory] || []), val]
        }));
      }
    }
    else if (category === 'clients') setTaxClients(prev => [...prev, val]);
    else if (category === 'modules') setTaxModules(prev => [...prev, val]);
    else if (category === 'courses') setTaxCourses(prev => [...prev, val]);

    setInputs(prev => ({ ...prev, [key]: '' }));
    showToast(`✓ Category ${val} successfully added!`);
  };

  const handleDelTaxItem = (category, selectId) => {
    const select = document.getElementById(selectId);
    if (!select || select.selectedIndex < 0) {
      showToast('Please select a taxonomy item to delete', true);
      return;
    }
    const idx = select.selectedIndex;
    let deletedName = '';
    
    if (category === 'tracks') {
      deletedName = taxTracks[idx];
      setTaxTracks(prev => prev.filter((_, i) => i !== idx));
      setTracksWithCourses(prev => {
        const copy = { ...prev };
        delete copy[deletedName];
        return copy;
      });
    } else if (category === 'clients') {
      deletedName = taxClients[idx];
      setTaxClients(prev => prev.filter((_, i) => i !== idx));
    } else if (category === 'modules') {
      deletedName = taxModules[idx];
      setTaxModules(prev => prev.filter((_, i) => i !== idx));
    } else if (category === 'courses') {
      deletedName = taxCourses[idx];
      setTaxCourses(prev => prev.filter((_, i) => i !== idx));
    }
    
    showToast(`Removed: ${deletedName}`);
  };

  // Format and export handlers
  const handleExport = () => {
    if (!activeGeneration) {
      showToast('No active question set loaded to export', true);
      return;
    }
    if (activeGeneration.type === 'mcq') {
      downloadMCQsAsExcel(activeGeneration.questions, activeGeneration.topic);
      showToast('Excel document compiled and downloaded successfully!');
    } else {
      const blob = new Blob([JSON.stringify(activeGeneration.questions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FRIDAY_Coding_${activeGeneration.topic.replace(/\s+/g, '_')}.json`;
      a.click();
      showToast('Saved JSON descriptor dataset!');
    }
  };

  // Filtration computation for Content Bank list matching HTML script exactly!
  const getFilteredQuestions = () => {
    if (!generations.length) return [];
    
    // Gather questions from active pack or all packs if undefined
    let pool = [];
    const targetSource = activeGeneration ? [activeGeneration] : generations;
    targetSource.forEach(g => {
      g.questions?.forEach(q => {
        pool.push({
          ...q,
          _packId: g._id || g.timestamp,
          _packTopic: g.topic,
          _packType: g.type,
          _packDifficulty: g.difficulty || 'Medium'
        });
      });
    });

    if (bankSearch.trim()) {
      const s = bankSearch.toLowerCase();
      pool = pool.filter(q => 
        (q.title || q.question || '').toLowerCase().includes(s) ||
        (q.description || q.explanation || '').toLowerCase().includes(s)
      );
    }
    if (bankTypeFilter) {
      pool = pool.filter(q => q._packType === bankTypeFilter);
    }
    if (bankDiffFilter) {
      pool = pool.filter(q => q.difficulty === bankDiffFilter || q._packDifficulty === bankDiffFilter);
    }

    return pool;
  };

  const getFilteredCourseQuestions = (trackName, courseName) => {
    if (!generations.length) return [];
    let pool = [];

    generations.forEach(g => {
      const trackMatch = g.track?.toLowerCase() === trackName.toLowerCase() || 
                         (!g.track && g.topic?.toLowerCase().indexOf(trackName.toLowerCase()) !== -1);
      const courseMatch = g.course?.toLowerCase() === courseName.toLowerCase() || 
                          (!g.course && g.topic?.toLowerCase().indexOf(courseName.toLowerCase()) !== -1);
      
      if (trackMatch && courseMatch) {
        g.questions?.forEach(q => {
          pool.push({
            ...q,
            _packId: g._id || g.timestamp,
            _packTopic: g.topic,
            _packType: g.type,
            _packDifficulty: g.difficulty || 'Medium'
          });
        });
      }
    });

    if (bankSearch.trim()) {
      const s = bankSearch.toLowerCase();
      pool = pool.filter(q => 
        (q.title || q.question || '').toLowerCase().includes(s) ||
        (q.description || q.explanation || '').toLowerCase().includes(s)
      );
    }
    if (bankTypeFilter) {
      pool = pool.filter(q => q._packType === bankTypeFilter);
    }
    if (bankDiffFilter) {
      pool = pool.filter(q => q.difficulty === bankDiffFilter || q._packDifficulty === bankDiffFilter);
    }

    return pool;
  };

  const handleBankModalSubmit = async () => {
    const val = bankModalInput.trim();
    if (!val) {
      showToast('Please enter a valid name', true);
      return;
    }

    if (bankModalType === 'course') {
      if (!contentBankTrack) {
        showToast('Please select a track before creating a course.', true);
        return;
      }
      // Persist course to server (and update local state)
      try {
        const resp = await apiFetch('/api/courses', { method: 'POST', body: JSON.stringify({ track: contentBankTrack, name: val }) });
        const saved = await resp.json();
        setTracksWithCourses(prev => ({
          ...prev,
          [contentBankTrack]: [...(prev[contentBankTrack] || []), val]
        }));
      } catch (err) {
        setTracksWithCourses(prev => ({
          ...prev,
          [contentBankTrack]: [...(prev[contentBankTrack] || []), val]
        }));
      }
      setTaxCourses(prev => {
        if (prev.includes(val)) return prev;
        return [...prev, val];
      });
      showToast(`Created course: ${val}`);
    } else if (bankModalType === 'track') {
      setTracksWithCourses(prev => ({
        ...prev,
        [val]: prev[val] || []
      }));
      setTaxTracks(prev => {
        if (prev.includes(val)) return prev;
        return [...prev, val];
      });
      if (contentBankCategory) {
        setTrackGroups(prev => ({
          ...prev,
          [contentBankCategory]: [...(prev[contentBankCategory] || []).filter(x => x !== val), val]
        }));
      }
      showToast(`Created track: ${val}`);
    } else if (bankModalType === 'category') {
      setTrackGroups(prev => {
        if (prev[val]) return prev;
        return {
          ...prev,
          [val]: []
        };
      });
      showToast(`Created category: ${val}`);
    }

    setBankModalOpen(false);
    setBankModalInput('');
  };


  const filteredQList = getFilteredQuestions();

  // Compute stat ratios to feed activity chart nicely
  const getWeekdayActivityRatio = () => {
    // Weekday array mapping
    const activity = [25, 60, 40, 85, 55, 30, 20]; // Default mock values
    // Adapt heights dynamic based on generated count to make chart alive!
    if (generations.length > 0) {
      activity[3] = Math.min(95, 45 + generations.length * 10);
      activity[1] = Math.min(95, 30 + generations.length * 7);
    }
    return activity;
  };

  const chartHeights = getWeekdayActivityRatio();
  const displayedPage = isLoggedIn ? currentPage : 'login';

  return (
    <div className="w-screen h-screen overflow-hidden text-foreground bg-background flex flex-col font-sans select-none relative">
      <div className="friday-watermark">F.R.I.D.A.Y</div>
      
      {/* Dynamic Toast Alerts Renderer */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              "shadow-2xl text-xs font-bold py-2.5 px-6 rounded-full transition-all duration-300 transform translate-y-0",
              t.isError ? "bg-[#ef4444] text-white" : "bg-[#10b981] text-white"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Main Core Frame */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Page 1: Auth Screen (Full Custom Render inside SPA) */}
        {displayedPage === 'login' && (
          <div className="flex-1 bg-[#f2f2f7] dark:bg-[#0d0b1e] flex flex-col overflow-y-auto">
            {/* Login Header brand */}
            <div className="h-14 glass-topbar px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 btn-coral-glass rounded-lg flex items-center justify-center">
                  <Zap size={14} className="text-white fill-white/20 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-black tracking-widest text-white uppercase font-display">F.R.I.D.A.Y</div>
                  <div className="text-[9px] text-[#64748b] font-mono tracking-wider font-bold">Q LABS</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Theme Mode Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-black/[0.04] dark:bg-[#0f172a] hover:bg-black/[0.08] dark:hover:bg-[#1e293b] border border-black/[0.06] dark:border-white/10 text-amber-500 dark:text-amber-400 cursor-pointer"
                  title="Switch Theme"
                >
                  {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-mono font-bold tracking-wider text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                  AUTHENTICATION_BRIDGE_ACTIVE
                </div>
              </div>
            </div>

            {/* Login Center Column */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-[450px] glass-card rounded-2xl p-9 shadow-2xl relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#eb6658] to-[rgba(235,102,88,0.55)] rounded-t-2xl" />
                
                <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mb-1.5 flex items-center gap-2">
                  <span className="w-5 h-[1.5px] bg-blue-500/30 inline-block" />
                  SESSION_INIT
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white mb-1.5">F.R.I.D.A.Y</h2>
                <div className="text-xs text-emerald-400 font-mono mb-6">{`>_ AWAITING_CREDENTIALS`}</div>

                {/* Role Tabs layout removed to keep login focused on employee access only */}
                <div className="mb-6 text-xs font-bold tracking-widest uppercase text-slate-400">Employee access only</div>

                {/* Username Input */}
                <div className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">EMPLOYEE_ID</div>
                <div className="relative mb-4.5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><User size={13} /></span>
                  <input 
                    type="text" 
                    value={loginIdInput}
                    onChange={(e) => setLoginIdInput(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono font-medium text-emerald-400 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                    placeholder="neo10506"
                  />
                </div>

                {/* Password Input */}
                <div className="text-[9px] font-bold tracking-widest text-slate-400 uppercase mb-1.5">PASSWORD</div>
                <div className="relative mb-7">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Lock size={13} /></span>
                  <input 
                    type="password" 
                    value={loginPasswordInput}
                    onChange={(e) => setLoginPasswordInput(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 pl-10 pr-10 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
                    placeholder="••••••••"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                    <CheckCircle2 size={13} className="text-emerald-500/70" />
                  </span>
                </div>

                {/* Form Action */}
                <button 
                  onClick={handleLoginSubmit}
                  disabled={isLoggingIn}
                  className="w-full btn-coral-glass text-white py-3 rounded-xl text-xs font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <>
                      <Zap size={13} className="text-blue-200 fill-blue-200/20 animate-bounce" />
                      <span>BUFFERING ACCESS BRIDGE...</span>
                    </>
                  ) : (
                    <>
                      <span>AUTHENTICATE</span>
                    </>
                  )}
                </button>
                  <div className="text-center text-[11px] text-slate-500 mt-5">
                    <span>Enter your employee credentials to continue.</span>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Wrapper for Authenticated Pages (Includes Left Sidebar & Columns layout) */}
        {displayedPage !== 'login' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Sidebar — 5 nav items (bolt→home, generate, tracks, planner, settings) */}
            <div className="w-14 glass-sidebar flex flex-col items-center py-4 gap-1.5 shrink-0 select-none">

              {/* 1 · QLabs bolt logo → Home / Dashboard */}
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer mb-1",
                  currentPage === 'dashboard'
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
                title="Home"
              >
                <svg viewBox="0 0 128 210" className="w-4 h-6" aria-hidden="true">
                  <path d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"
                    fill={currentPage === 'dashboard' ? 'white' : 'currentColor'} />
                </svg>
              </button>

              <div className="w-6 h-[1px] bg-slate-200/60 dark:bg-slate-800/60" />

              {/* 2 · Generate — AI question synthesizer */}
              <button
                onClick={() => showPage('generate')}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
                  currentPage === 'generate'
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
                title="Generate"
              >
                <Sparkles size={16} />
              </button>

              {/* 3 · Tracks — Content Bank */}
              <button
                onClick={() => showPage('contentbank')}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
                  currentPage === 'contentbank'
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
                title="Tracks"
              >
                <Layers size={16} />
              </button>

              {/* 4 · Planner → Content */}
              <button
                onClick={() => showPage('planner')}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
                  currentPage === 'planner'
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
                title="Planner → Content"
              >
                <CalendarDays size={16} />
              </button>

              {/* 5 · Settings */}
              <button
                onClick={() => showPage('settings')}
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
                  currentPage === 'settings'
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-white hover:bg-white/5"
                )}
                title="Settings"
              >
                <Settings size={16} />
              </button>

              <div className="flex-1" />

              {/* Theme switcher */}
              <div className="w-9 py-1 bg-slate-100 dark:bg-[#070a13] border border-slate-200/60 dark:border-indigo-500/10 rounded-full flex flex-col items-center gap-1.5 p-1 select-none shadow-sm">
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
                    theme === 'dark'
                      ? "bg-[#0c1222] text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)] border border-amber-500/10"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                  title="Dark Theme"
                >
                  <Moon size={13} className={cn(theme === 'dark' && "fill-amber-400/10")} />
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
                    theme === 'light'
                      ? "bg-white text-blue-600 shadow-md border border-slate-200/40"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-200"
                  )}
                  title="Light Theme"
                >
                  <Sun size={13} />
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('user');
                  setIsLoggedIn(false);
                  setInputs(prev => ({ ...prev, profileName: '', profileEmpId: '' }));
                  setCurrentPage('login');
                  setGenerations([]);
                  showToast('✓ Logged out successfully');
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 text-red-500 bg-red-500/10 hover:bg-red-500/20 cursor-pointer mb-1 shadow-sm border border-red-500/10"
                title="Log Out"
              >
                <Power size={15} />
              </button>
            </div>

            {/* Core Content Shell */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground">
              
              {/* Horizontal Topbar with brand IAMNEO logo and user capsule */}
              <div className="h-14 glass-topbar px-6 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-xs font-black tracking-widest text-slate-800 dark:text-white uppercase font-display">IAMNEO</span>
                  <span className="w-[1.5px] h-4 bg-slate-200 dark:bg-slate-800/80 mx-1.5" />
                  <span className="text-[10px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase font-mono">
                    {currentPage === 'dashboard' ? 'DASHBOARD' :
                     currentPage === 'generate'  ? 'SYNTHESIZER_ENGINE' :
                     currentPage === 'settings'  ? 'SYSTEM_SETTINGS' :
                     currentPage === 'planner'   ? 'CONTENT_PLANNER' : 'LOGIC_CONTENT_BANK'}
                  </span>
                </div>
                
                {/* Right side user indicator capsule */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-300">{inputs.profileName || defaultUser?.name || 'User'}</span>
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-black">
                    {(inputs.profileName || defaultUser?.name || 'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Unique Scrollable Page Body */}
              <div className={cn("flex-1 overflow-hidden select-text", currentPage === 'generate' ? "flex flex-col" : "overflow-y-auto")}>

                {/* ============ PAGE 2: DASHBOARD ============ */}
                {currentPage === 'dashboard' && (
                  <div className="space-y-5 p-6 overflow-y-auto animate-in fade-in duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                          <LayoutDashboard size={16} className="text-blue-400" />
                        </div>
                        <div>
                          <h1 className="text-lg font-black text-white tracking-tight">My Activity Hub</h1>
                          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-0.5">Question Generation Workspace</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { checkHealth(); fetchHistory(); showToast('Refreshed'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-transparent text-slate-400 hover:text-white hover:border-white/20 text-xs font-bold tracking-wider transition-all cursor-pointer">
                          <RefreshCw size={12} /><span>REFRESH</span>
                        </button>
                        <button onClick={() => setCurrentPage('generate')} className="flex items-center gap-2 px-4 py-2 rounded-xl btn-coral-glass text-white text-xs font-black tracking-wider transition-all cursor-pointer">
                          <Plus size={13} /><span>NEW GENERATION</span>
                        </button>
                      </div>
                    </div>

                    {/* Filter bar */}
                    <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl glass-card">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel">
                        <span className="text-[9px] font-black text-blue-400 font-mono uppercase tracking-widest">FROM</span>
                        <span className="text-xs text-white font-mono">dd/mm/yyyy</span>
                        <CalendarDays size={11} className="text-slate-600" />
                      </div>
                      <span className="text-slate-700 font-bold">→</span>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel">
                        <span className="text-[9px] font-black text-blue-400 font-mono uppercase tracking-widest">TO</span>
                        <span className="text-xs text-white font-mono">dd/mm/yyyy</span>
                        <CalendarDays size={11} className="text-slate-600" />
                      </div>
                      <div className="flex items-center gap-1 p-1 rounded-xl glass-panel">
                        {['TW','14d','30d','90d'].map(r => {
                          const active = (inputs.selectedTimeRange || '30d') === r;
                          return (
                            <button key={r} onClick={() => setInputs(p => ({ ...p, selectedTimeRange: r }))}
                              className={cn('px-3 py-1.5 text-[9px] font-black tracking-wider uppercase rounded-lg transition-all cursor-pointer',
                                active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
                              )}>
                              {r}
                            </button>
                          );
                        })}
                        <button className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white cursor-pointer transition-colors rounded-lg hover:bg-white/5">
                          <RefreshCw size={11} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel ml-auto">
                        <span className="text-[9px] font-black text-slate-500 font-mono uppercase tracking-widest">TYPE</span>
                        <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                          className="bg-transparent text-xs text-white outline-none cursor-pointer">
                          <option value="">All Types</option>
                          <option value="mcq">MCQ</option>
                          <option value="coding">Coding</option>
                          <option value="theory">Theory</option>
                        </select>
                        <ChevronDown size={11} className="text-slate-500" />
                      </div>
                    </div>

                    {/* 4 Stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'MY GENERATIONS', icon: <LayoutDashboard size={18} />, color: 'blue',
                          value: generations.length },
                        { label: 'THIS WEEK', icon: <CalendarDays size={18} />, color: 'emerald',
                          value: generations.filter(g => { try { return (Date.now() - new Date(g.createdAt || g.timestamp || 0)) < 604800000; } catch { return false; } }).length },
                        { label: 'TOTAL QUESTIONS', icon: <CheckSquare size={18} />, color: 'purple',
                          value: generations.reduce((a, g) => a + (g.questions?.length || 0), 0) },
                        { label: 'CONTENT BUNDLES', icon: <Database size={18} />, color: 'amber',
                          value: generations.length },
                      ].map(s => (
                        <div key={s.label} className="p-5 rounded-2xl glass-card hover:-translate-y-0.5 transition-all">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center',
                            s.color === 'blue'    ? 'bg-blue-500/15 text-blue-400' :
                            s.color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400' :
                            s.color === 'purple'  ? 'bg-purple-500/15 text-purple-400' :
                                                    'bg-amber-500/15 text-amber-400'
                          )}>{s.icon}</div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono mt-4">{s.label}</p>
                          <p className="text-3xl font-black text-white mt-1">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                      {/* Weekly Activity */}
                      <div className="lg:col-span-6 p-5 rounded-2xl glass-card">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">WEEKLY ACTIVITY</p>
                        <div className="flex items-end justify-between h-28 gap-2 mt-6 px-1">
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, i) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-2">
                              <div
                                className={cn('w-full rounded-t-lg transition-all duration-500', (chartHeights[i] || 20) > 60 ? 'bg-blue-600' : 'bg-blue-500/20')}
                                style={{ height: `${chartHeights[i] || 20}px` }}
                              />
                              <span className="text-[9px] font-mono text-slate-500 uppercase">{day}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Output Mix */}
                      <div className="lg:col-span-3 p-5 rounded-2xl glass-card flex flex-col items-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono w-full text-left">OUTPUT MIX</p>
                        <div className="relative w-24 h-24 my-4">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8"/>
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="9" strokeDasharray="251" strokeDashoffset="75" strokeLinecap="round"/>
                            <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="9" strokeDasharray="251" strokeDashoffset="170" strokeLinecap="round"/>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-black text-white">{generations.length}</span>
                          </div>
                        </div>
                        <div className="space-y-2 w-full text-xs">
                          {[
                            ['PPT',   '#3b82f6', generations.filter(g => g.type === 'mcq').length],
                            ['Notes', '#a855f7', generations.filter(g => g.type === 'coding').length],
                            ['Total', '#64748b', generations.length],
                          ].map(([l, c, v]) => (
                            <div key={l} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                                <span className="text-slate-400">{l}</span>
                              </div>
                              <span className="text-white font-black">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Tracks */}
                      <div className="lg:col-span-3 p-5 rounded-2xl glass-card">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">TOP TRACKS</p>
                        <div className="mt-4 space-y-3">
                          {['DSA','Java','Python','Java Full Stack','Cybersecurity','Data Analytics','Aptitude'].map(track => {
                            const count = generations.filter(g => g.track === track).length;
                            const maxVal = Math.max(...['DSA','Java','Python','Java Full Stack','Cybersecurity','Data Analytics','Aptitude'].map(t => generations.filter(g => g.track === t).length), 1);
                            return (
                              <div key={track} className="flex items-center gap-3">
                                <span className="text-[11px] text-slate-400 w-28 truncate">{track}</span>
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(count / maxVal) * 100}%` }} />
                                </div>
                                <span className="text-[11px] text-white font-black w-4 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Recent Generations table */}
                    <div className="rounded-2xl glass-card overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">RECENT GENERATIONS</p>
                        <button onClick={() => showPage('contentbank')} className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest cursor-pointer transition-colors">
                          View All →
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-white/[0.04]">
                              {['TITLE','TYPE','TRACK','THEME','STATUS','GENERATED'].map(h => (
                                <th key={h} className="px-5 py-3 text-left text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {generations.slice(0, 8).map((g, i) => (
                              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3 text-white font-medium max-w-[180px] truncate">{g.topic || g.title || '—'}</td>
                                <td className="px-5 py-3">
                                  <span className={cn('px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider',
                                    g.type === 'mcq'    ? 'bg-blue-500/15 text-blue-400' :
                                    g.type === 'coding' ? 'bg-purple-500/15 text-purple-400' :
                                                          'bg-slate-500/15 text-slate-400'
                                  )}>{g.type || 'MCQ'}</span>
                                </td>
                                <td className="px-5 py-3 text-slate-400">{g.track || '—'}</td>
                                <td className="px-5 py-3 text-slate-400">{g.tone || activeTone || 'Professional'}</td>
                                <td className="px-5 py-3">
                                  <span className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400">Done</span>
                                </td>
                                <td className="px-5 py-3 text-slate-500 font-mono">
                                  {g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                </td>
                              </tr>
                            ))}
                            {!generations.length && (
                              <tr>
                                <td colSpan={6} className="px-5 py-12 text-center text-slate-600 text-sm">No generations yet</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}


                {/* ============ PAGE 3: QUESTION GENERATOR FORM ============ */}
                {currentPage === 'generate' && (
                  <div className="flex gap-6 p-6 h-full overflow-hidden animate-in fade-in duration-200">
                    {/* Left: Form */}
                    <div className="flex-1 min-w-0 space-y-4 overflow-y-auto pr-1">
                      {/* Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                          <Sparkles size={16} className="text-blue-400" />
                        </div>
                        <h1 className="text-lg font-black text-white">Generate Content</h1>
                      </div>

                      {/* Type tabs */}
                      <div className="flex gap-1 p-1 rounded-xl glass-panel w-fit">
                        {[
                          ['questions', 'MCQ QUESTIONS'],
                          ['coding',    'CODING LOGIC'],
                          ['assessment','THEORY / NOTES'],
                        ].map(([val, lbl]) => (
                          <button key={val} onClick={() => {
                            setGenerationMode(val);
                            setSelectedType(val === 'coding' ? 'coding' : 'mcq');
                          }}
                            className={cn('px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase cursor-pointer transition-all',
                              generationMode === val ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
                            )}>
                            {lbl}
                          </button>
                        ))}
                      </div>

                      {/* 00 / CLASSIFY AS */}
                      <div className="p-5 rounded-2xl glass-card space-y-4">
                        <p className="text-[9px] font-black text-slate-500 font-mono uppercase tracking-widest">
                          <span className="text-slate-700 mr-2">00 /</span> CLASSIFY AS
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            ['TRACK',  selectedTrack,  setSelectedTrack,  taxTracks.map(t => [t,t])],
                            ['CLIENT', selectedClient, setSelectedClient, taxClients.map(c => [c,c])],
                            ['COURSE', selectedCourse, setSelectedCourse, (tracksWithCourses[selectedTrack] || []).map(c => [c,c])],
                            ['DOMAIN', selectedDomain, setSelectedDomain, taxDomains.map(d => [d,d])],
                          ].map(([label, value, setter, options]) => (
                            <div key={label} className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">{label}</label>
                              <select value={value} onChange={e => setter(e.target.value)}
                                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer focus:border-blue-500/40 transition-colors">
                                <option value="">Select {label.toLowerCase()}...</option>
                                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 01 / TOPIC */}
                      <div className="p-5 rounded-2xl glass-card space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-slate-500 font-mono uppercase tracking-widest">
                            <span className="text-slate-700 mr-2">01 /</span> TOPIC
                          </p>
                          <span className="text-[10px] text-slate-600 font-mono">{topic.length}/80</span>
                        </div>
                        <input
                          value={topic}
                          onChange={e => setTopic(e.target.value.slice(0, 80))}
                          placeholder="e.g. Binary Search Trees, Java Generics, Spring Boot..."
                          className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/40 transition-colors"
                        />
                      </div>

                      {/* 02 / CONTEXT BRIEF */}
                      <div className="p-5 rounded-2xl glass-card space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-black text-slate-500 font-mono uppercase tracking-widest">
                            <span className="text-slate-700 mr-2">02 /</span> CONTENT BRIEF
                          </p>
                          <div className="flex gap-1 p-0.5 rounded-lg glass-panel">
                            {['TEXT','URL'].map((t, ti) => (
                              <button key={t} className={cn('px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all',
                                ti === 0 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'
                              )}>{t}</button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={additionalContext}
                          onChange={e => setAdditionalContext(e.target.value)}
                          rows={5}
                          placeholder="Describe focus areas, learning objectives, or any context for the questions..."
                          className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500/40 resize-none transition-colors"
                        />
                        <p className="text-[10px] text-slate-600 font-mono text-right">{additionalContext.length} chars</p>
                      </div>

                      {/* 03 / QUESTION SETTINGS */}
                      <div className="p-5 rounded-2xl glass-card space-y-4">
                        <p className="text-[9px] font-black text-slate-500 font-mono uppercase tracking-widest">
                          <span className="text-slate-700 mr-2">03 /</span> QUESTION SETTINGS
                        </p>

                        {/* Number of questions */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">NUMBER OF QUESTIONS</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={count}
                              onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                              className="w-20 glass-input rounded-xl px-3 py-2.5 text-sm text-white text-center outline-none focus:border-blue-500/40 transition-colors font-mono"
                            />
                            <div className="flex items-center gap-1.5">
                              {[5, 10, 15, 20].map(n => (
                                <button key={n} onClick={() => setCount(n)}
                                  className={cn('w-9 h-9 rounded-lg text-xs font-black cursor-pointer transition-all',
                                    count === n
                                      ? 'bg-blue-600 text-white'
                                      : 'glass-panel text-slate-500 hover:text-white hover:bg-white/5'
                                  )}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* LeetCode toggle — Coding mode only */}
                        {generationMode === 'coding' && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">PROBLEM SOURCE</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSourceType('non-leetcode')}
                                className={cn('flex-1 py-3 px-4 rounded-xl text-left cursor-pointer transition-all border',
                                  sourceType === 'non-leetcode'
                                    ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                                    : 'bg-[#0f172a] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20'
                                )}>
                                <p className="text-[10px] font-black uppercase tracking-wider">Custom Problems</p>
                                <p className="text-[9px] opacity-60 mt-0.5 font-mono">Original scenarios</p>
                              </button>
                              <button
                                onClick={() => setSourceType('leetcode')}
                                className={cn('flex-1 py-3 px-4 rounded-xl text-left cursor-pointer transition-all border',
                                  sourceType === 'leetcode'
                                    ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
                                    : 'bg-[#0f172a] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20'
                                )}>
                                <p className="text-[10px] font-black uppercase tracking-wider">LeetCode Style</p>
                                <p className="text-[9px] opacity-60 mt-0.5 font-mono">Numbered problems</p>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right: Config panel */}
                    <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
                      {/* Tone Matrix */}
                      <div className="p-5 rounded-2xl glass-card space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                          <BrainCircuit size={13} className="text-slate-500" /> TONE MATRIX
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {['Professional','Academic','Casual','Technical','Executive','Creative'].map(t => (
                            <button key={t} onClick={() => setActiveTone(t)}
                              className={cn('px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all',
                                activeTone === t ? 'bg-blue-600 text-white' : 'bg-black/[0.04] dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/5'
                              )}>{t}</button>
                          ))}
                        </div>
                      </div>

                      {/* Neural Engine */}
                      <div className="p-5 rounded-2xl glass-card space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                          <Cpu size={13} className="text-slate-500" /> NEURAL ENGINE
                        </p>
                        <div className="space-y-2">
                          {[
                            { id: 'auto_route', label: 'AUTO_ROUTE', sub: 'Smart provider selection',   icon: '⚡' },
                            { id: 'nvidia',     label: 'NVIDIA_NIM', sub: 'High-throughput inference',   icon: '🟢' },
                            { id: 'groq',       label: 'GROQ_INFER', sub: 'Ultra-fast generation',       icon: '🟡' },
                            { id: 'openai',     label: 'GPT-4o',      sub: 'Highest quality',             icon: '🔵' },
                          ].map(e => (
                            <button key={e.id} onClick={() => setEngine(e.id)}
                              className={cn('w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all text-left',
                                engine === e.id
                                  ? 'bg-blue-600/15 border border-blue-500/30'
                                  : 'glass-panel hover:border-white/10'
                              )}>
                              <span className="text-base leading-none">{e.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-[10px] font-black uppercase tracking-wider', engine === e.id ? 'text-blue-400' : 'text-white')}>{e.label}</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">{e.sub}</p>
                              </div>
                              {engine === e.id && (
                                <div className="w-4 h-4 rounded-full border-2 border-blue-400 flex items-center justify-center shrink-0">
                                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Difficulty */}
                      <div className="p-5 rounded-2xl glass-card space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">DIFFICULTY</p>
                        <div className="flex gap-2">
                          {['Easy','Medium','Hard'].map(d => (
                            <button key={d} onClick={() => setDifficulty(d)}
                              className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all',
                                difficulty === d ? 'bg-blue-600 text-white' : 'bg-black/[0.04] dark:bg-[#0f172a] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/5'
                              )}>{d}</button>
                          ))}
                        </div>
                      </div>

                      {/* MCP Prompt button — primary CTA */}
                      <button
                        onClick={handleGetMcpPrompt}
                        disabled={!topic.trim()}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl btn-coral-glass disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[11px] tracking-widest uppercase cursor-pointer transition-all"
                      >
                        <Copy size={14} />
                        <span>GET MCP PROMPT</span>
                      </button>

                      {/* Generate via API (secondary) */}
                      <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !topic.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-white/[0.08] bg-transparent hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white font-black text-[10px] tracking-widest uppercase cursor-pointer transition-all mt-auto"
                      >
                        {isGenerating
                          ? <><Loader2 size={13} className="animate-spin" /><span>GENERATING...</span></>
                          : <><Zap size={13} /><span>GENERATE {count} {generationMode === 'coding' ? 'CODING' : generationMode === 'assessment' ? 'THEORY' : 'MCQ'} QUESTIONS</span></>
                        }
                      </button>
                    </div>
                  </div>
                )}



                {/* ============ PAGE 4: SYSTEM CONFIGURATION ============ */}
                {currentPage === 'settings' && (
                  <div className="max-w-[760px] mx-auto space-y-4 animate-in fade-in duration-250">
                    
                    {/* Header Controls */}
                    <div className="flex items-center justify-between text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/10 rounded-lg flex items-center justify-center text-slate-500 dark:text-gray-400">
                          <Settings size={13} />
                        </div>
                        <h2 className="text-lg font-bold tracking-tight">System Settings</h2>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 dark:text-gray-500 uppercase">CLUSTER: LOCALHOST // NODE ACTIVE</span>
                    </div>

                    {/* Sub settings tabs */}
                    <div className="flex bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/10 rounded-lg p-0.5 select-none overflow-x-auto no-scrollbar">
                      {[
                        { id: 'profile', label: 'PROFILE' },
                        { id: 'generation', label: 'GENERATION' },
                        { id: 'api', label: 'API & DATABASE' },
                        { id: 'notif', label: 'NOTIFICATIONS' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSettingsTab(tab.id)}
                          className={cn(
                            "flex-1 py-1.5 px-3 text-[9px] font-black tracking-widest uppercase rounded-md cursor-pointer transition-colors whitespace-nowrap",
                            activeSettingsTab === tab.id
                              ? "bg-indigo-600/10 text-indigo-600 dark:text-[#818cf8] border border-indigo-500/15 font-extrabold"
                              : "text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-350"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* PROFILE SETTINGS TAB */}
                    {activeSettingsTab === 'profile' && (
                      <div className="bg-card border border-slate-200/80 dark:border-[#1e293b]/50 rounded-xl p-5 space-y-4 shadow-sm text-slate-800 dark:text-white">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase text-slate-500 dark:text-gray-400 tracking-wider flex items-center gap-2">
                            <User size={13} /> Edit Profile Identity
                          </h3>
                          <button 
                            onClick={handleSaveProfile}
                            className="bg-indigo-600/10 text-indigo-600 dark:text-[#818cf8] border border-indigo-500/25 text-[9px] font-black hover:bg-indigo-500/20 px-3 py-1 rounded-md"
                          >
                            ✓ SAVE PROFILE
                          </button>
                        </div>

                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 rounded-full bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center font-black text-indigo-600 dark:text-white text-base">
                            {inputs.profileName.split(' ').map(n=>n[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800 dark:text-white">{inputs.profileName}</div>
                            <div className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">ID: {inputs.profileEmpId}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold text-[#6b7280] uppercase tracking-wider">FULL USER NAME</label>
                            <input 
                              type="text" 
                              value={inputs.profileName}
                              onChange={(e) => setInputs({ ...inputs, profileName: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#1a1a20] border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold text-[#6b7280] uppercase tracking-wider">EMPLOYEE MANAGER ID</label>
                            <input 
                              type="text" 
                              value={inputs.profileEmpId}
                              onChange={(e) => setInputs({ ...inputs, profileEmpId: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-[#1a1a20] border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold text-[#6b7280] uppercase tracking-wider">DEPARTMENT RAIL</label>
                          <input 
                            type="text" 
                            value={inputs.profileDept}
                            onChange={(e) => setInputs({ ...inputs, profileDept: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-[#1a1a20] border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* GENERATION SETTINGS CONTEXT */}
                    {activeSettingsTab === 'generation' && (
                      <div className="bg-card border border-slate-200/80 dark:border-[#1e293b]/50 rounded-xl p-5 space-y-4 shadow-sm text-slate-800 dark:text-white">
                        <h3 className="text-xs font-black uppercase text-slate-500 dark:text-gray-400 tracking-wider flex items-center gap-2">
                          <Sliders size={13} /> Synthesizer Setup Defaults
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold text-[#6b7280] uppercase tracking-wider">DEFAULT COUNT</label>
                            <input 
                              type="number" 
                              defaultValue={10} 
                              className="w-full bg-slate-50 dark:bg-[#1a1a20] border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold text-[#6b7280] uppercase tracking-wider">DEFAULT DIFFICULTY</label>
                            <select className="w-full bg-slate-50 dark:bg-[#1a1a20] border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-xs text-slate-800 dark:text-white focus:outline-none cursor-pointer">
                              <option>Easy</option>
                              <option selected>Medium</option>
                              <option>Hard</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}


                    {/* API AND INTEGRATIONS — replaced by BYOK panel below */}

                    {/* NOTIFICATIONS SETTINGS */}
                    {activeSettingsTab === 'notif' && (
                      <div className="bg-card border border-slate-200/80 dark:border-[#1e293b]/50 rounded-xl p-5 space-y-4 shadow-sm text-slate-800 dark:text-white">
                        <h3 className="text-xs font-black uppercase text-slate-500 dark:text-gray-400 tracking-wider flex items-center gap-2">
                          <Sliders size={13} /> Notification Profiles
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-gray-450 leading-relaxed font-sans">Configure alert metrics when automated compiles or AI synthesizers verify complete pools.</p>
                      </div>
                    )}

                    {/* ── API Provider (BYOK) ─────────────────────────────────── */}
                    {activeSettingsTab === 'api' && (
                        <div className="glass-card rounded-3xl border border-white/5 p-6 space-y-5 relative overflow-hidden">
                          {/* Coming Soon overlay */}
                          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm bg-[#090d18]/70 rounded-3xl gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                              <Lock size={28} className="text-yellow-400" />
                            </div>
                            <div className="text-center space-y-1">
                              <p className="text-white font-black text-xl tracking-tight">Coming Soon</p>
                              <p className="text-[11px] text-slate-400 font-mono uppercase tracking-widest">BYOK API Integration</p>
                              <p className="text-[10px] text-slate-500 mt-2 max-w-xs leading-relaxed">Custom API key support is under development. The platform currently uses secure server-side keys with automatic provider failover.</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">IN DEVELOPMENT</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 opacity-30 pointer-events-none">
                            <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0">
                              <Key size={16} className="text-brand-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-foreground">API Provider</h3>
                              <p className="text-[9px] text-foreground/30 font-mono uppercase tracking-widest mt-0.5">
                                Bring your own key — your tokens, your quota
                              </p>
                            </div>
                          </div>

                          {/* Provider grid — 4 cols for 7 providers */}
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { id: 'groq',      icon: '⚡', label: 'Groq',      tag: 'Free'  },
                              { id: 'gemini',    icon: '✦', label: 'Gemini',    tag: 'Free'  },
                              { id: 'nvidia',    icon: '🟢', label: 'NVIDIA',    tag: 'Free'  },
                              { id: 'deepseek',  icon: '🔮', label: 'DeepSeek',  tag: 'Cheap' },
                              { id: 'openai',    icon: '🤖', label: 'OpenAI',    tag: ''      },
                              { id: 'anthropic', icon: '🔶', label: 'Anthropic', tag: ''      },
                              { id: 'mistral',   icon: '🌀', label: 'Mistral',   tag: ''      },
                            ].map(p => (
                              <button
                                key={p.id}
                                onClick={() => { setKeyPanelProvider(p.id); setKeyInput(''); setKeyTestResult(null); }}
                                className={cn(
                                  'py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex flex-col items-center gap-1 relative',
                                  keyPanelProvider === p.id
                                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20'
                                    : 'glass-panel border border-white/5 text-foreground/40 hover:text-foreground hover:bg-white/5'
                                )}
                              >
                                {userApiKeys[p.id] && (
                                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                )}
                                <span>{p.icon}</span>
                                <span>{p.label}</span>
                                {p.tag && (
                                  <span className={cn(
                                    'text-[7px] px-1.5 py-0.5 rounded-md font-black',
                                    keyPanelProvider === p.id ? 'bg-white/20 text-white' : 'bg-brand-accent/10 text-brand-accent'
                                  )}>{p.tag}</span>
                                )}
                              </button>
                            ))}
                          </div>

                          {/* Status badge */}
                          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-center gap-2">
                              {userApiKeys[keyPanelProvider]
                                ? <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                                : <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
                              }
                              <span className="text-[10px] font-black text-foreground/50 uppercase tracking-widest font-mono">
                                {userApiKeys[keyPanelProvider] ? 'Key saved' : 'No key saved'}
                              </span>
                              {userApiModels[keyPanelProvider] && (
                                <span className="text-[9px] text-foreground/30 font-mono">· {userApiModels[keyPanelProvider]}</span>
                              )}
                            </div>
                            {userApiKeys[keyPanelProvider] && (
                              <button
                                onClick={() => handleDeleteApiKey(keyPanelProvider)}
                                className="text-[9px] text-red-400/60 hover:text-red-400 font-mono transition-colors cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Key input */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-wider text-foreground/40 font-mono">
                              {keyPanelProvider === 'groq'      ? 'Groq API Key — console.groq.com (Free)' :
                               keyPanelProvider === 'openai'    ? 'OpenAI API Key — platform.openai.com' :
                               keyPanelProvider === 'anthropic' ? 'Anthropic API Key — console.anthropic.com' :
                               keyPanelProvider === 'gemini'    ? 'Gemini API Key — aistudio.google.com/app/apikey (Free tier available)' :
                               keyPanelProvider === 'mistral'   ? 'Mistral API Key — console.mistral.ai' :
                               keyPanelProvider === 'deepseek'  ? 'DeepSeek API Key — platform.deepseek.com' :
                               keyPanelProvider === 'nvidia'    ? 'NVIDIA API Key — build.nvidia.com (Free tier: 1000 credits)' :
                               'API Key'}
                            </label>
                            <div className="flex gap-2">
                              <div className="flex-1 relative">
                                <input
                                  type={showKeyInput ? 'text' : 'password'}
                                  value={keyInput}
                                  onChange={e => { setKeyInput(e.target.value); setKeyTestResult(null); }}
                                  placeholder={
                                    userApiKeys[keyPanelProvider] ? '••••••••••••••••••••• (enter new to replace)' :
                                    keyPanelProvider === 'groq'      ? 'gsk_...' :
                                    keyPanelProvider === 'openai'    ? 'sk-proj-...' :
                                    keyPanelProvider === 'anthropic' ? 'sk-ant-...' :
                                    keyPanelProvider === 'gemini'    ? 'AIza...' :
                                    keyPanelProvider === 'mistral'   ? 'xxxxxxxxxxxxxxxxxxxxxxxx' :
                                    keyPanelProvider === 'deepseek'  ? 'sk-...' :
                                    keyPanelProvider === 'nvidia'    ? 'nvapi-...' : 'API key...'
                                  }
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-10 text-sm font-mono text-foreground placeholder-foreground/20 focus:outline-none focus:border-brand-primary/50 transition-colors"
                                />
                                <button
                                  onClick={() => setShowKeyInput(p => !p)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground cursor-pointer"
                                >
                                  {showKeyInput ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>

                            {/* Test result indicator */}
                            {keyTestResult && (
                              <div className={cn(
                                'flex items-center gap-2 text-[10px] font-black leading-relaxed',
                                keyTestResult === 'ok' ? 'text-brand-accent' :
                                keyTestResult === 'quota' ? 'text-amber-400' : 'text-red-400'
                              )}>
                                {keyTestResult === 'ok'
                                  ? '✓ Key verified — connection successful'
                                  : keyTestResult === 'quota'
                                  ? '⚠ Key is valid — but this account has no billing credits. Save the key anyway, then add credits at the provider dashboard.'
                                  : '✗ Connection failed — check your key is correct and not expired'}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={handleTestApiKey}
                                disabled={!keyInput.trim() || isTestingKey}
                                className="flex-1 py-2.5 rounded-2xl glass-panel border border-white/10 text-[10px] font-black uppercase tracking-wider text-foreground/50 hover:text-foreground hover:bg-white/5 disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                {isTestingKey
                                  ? <><span className="animate-spin inline-block">↻</span> Testing…</>
                                  : <><Wifi size={12} /> Test</>
                                }
                              </button>
                              <button
                                onClick={handleSaveApiKey}
                                disabled={!keyInput.trim() || isSavingKey}
                                className="flex-1 py-2.5 rounded-2xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
                              >
                                {isSavingKey
                                  ? <><span className="animate-spin inline-block">↻</span> Saving…</>
                                  : <><Key size={12} /> Save Key</>
                                }
                              </button>
                            </div>
                          </div>

                          {/* Model selector — only for currently saved + active */}
                          {userApiKeys[keyPanelProvider] && (
                            <div className="space-y-2 pt-2 border-t border-white/5">
                              <label className="text-[9px] font-black uppercase tracking-wider text-foreground/40 font-mono">
                                Model (used when this provider is active)
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {(PROVIDER_MODELS[keyPanelProvider] || []).map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => {
                                      setUserApiModels(prev => ({ ...prev, [keyPanelProvider]: m.id }));
                                      if (activeProvider === keyPanelProvider) {
                                        setActiveModel(m.id);
                                        localStorage.setItem('qa_model', m.id);
                                      }
                                      apiFetch('/api/user/api-key/model', {
                                        method: 'PATCH',
                                        body: JSON.stringify({ provider: keyPanelProvider, model: m.id })
                                      }).catch(() => {});
                                    }}
                                    className={cn(
                                      'px-3 py-1.5 rounded-xl text-[9px] font-black transition-all cursor-pointer',
                                      (userApiModels[keyPanelProvider] === m.id || (activeProvider === keyPanelProvider && activeModel === m.id))
                                        ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                                        : 'glass-panel border border-white/5 text-foreground/30 hover:text-foreground hover:bg-white/5'
                                    )}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Set as active provider button */}
                          {userApiKeys[keyPanelProvider] && (
                            <button
                              onClick={() => handleSetActiveProvider(keyPanelProvider, userApiModels[keyPanelProvider])}
                              className={cn(
                                'w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2',
                                activeProvider === keyPanelProvider
                                  ? 'bg-brand-accent/10 border border-brand-accent/20 text-brand-accent'
                                  : 'glass-panel border border-white/10 text-foreground/50 hover:text-foreground hover:bg-white/5'
                              )}
                            >
                              {activeProvider === keyPanelProvider
                                ? <><span>✓</span> Active Provider</>
                                : <>Use {keyPanelProvider} for generation</>
                              }
                            </button>
                          )}

                          {/* Active provider indicator */}
                          <div className="flex items-center gap-2 text-[9px] font-mono text-foreground/20">
                            <span>ACTIVE:</span>
                            <span className="text-brand-primary font-black uppercase">{activeProvider}</span>
                            <span>·</span>
                            <span>{activeModel}</span>
                          </div>

                          {/* ── Token Usage Meter ───────────────────────── */}
                          <div className="space-y-2 pt-3 border-t border-white/5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase tracking-widest text-foreground/30 font-mono">
                                Today's Token Usage
                              </span>
                              <button
                                onClick={fetchTokenUsage}
                                className="text-[8px] text-foreground/20 hover:text-foreground/50 font-mono transition-colors cursor-pointer"
                              >↻ refresh</button>
                            </div>

                            {tokenUsage[keyPanelProvider] ? (
                              keyPanelProvider === 'groq' ? (
                                <>
                                  <div className="flex justify-between text-[9px] font-mono text-foreground/30">
                                    <span>{(tokenUsage.groq.tokensUsed || 0).toLocaleString()} tokens used today</span>
                                    <span>100,000 limit</span>
                                  </div>
                                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full rounded-full transition-all duration-700',
                                        (tokenUsage.groq.tokensUsed || 0) > 90000 ? 'bg-red-500' :
                                        (tokenUsage.groq.tokensUsed || 0) > 70000 ? 'bg-amber-500' :
                                        'bg-brand-accent'
                                      )}
                                      style={{ width: `${Math.min(100, ((tokenUsage.groq.tokensUsed || 0) / 100000) * 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-[8px] text-foreground/20 font-mono">
                                    {Math.max(0, 100000 - (tokenUsage.groq.tokensUsed || 0)).toLocaleString()} tokens remaining · resets midnight UTC
                                  </p>
                                </>
                              ) : (
                                <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5">
                                  <span className="text-[9px] text-foreground/30 font-mono">
                                    {(tokenUsage[keyPanelProvider]?.tokensUsed || 0).toLocaleString()} tokens
                                    · {tokenUsage[keyPanelProvider]?.requestCount || 0} requests today
                                  </span>
                                  <span className="text-[8px] text-foreground/15 font-mono">today</span>
                                </div>
                              )
                            ) : (
                              <p className="text-[8px] text-foreground/15 font-mono py-1">
                                No usage recorded today for {keyPanelProvider} — data appears after first generation.
                              </p>
                            )}
                          </div>
                        </div>
                    )}

                  </div>
                )}

                {/* ============ PAGE: CONTENT PLANNER ============ */}
                {currentPage === 'planner' && (
                  <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-card custom-scrollbar">
                    <PlannerPage
                      apiFetch={apiFetch}
                      showToast={showToast}
                      getActiveFormat={getActiveFormat}
                      tracksWithCourses={tracksWithCourses}
                      trackGroups={trackGroups}
                      onGetMcpPrompt={handleGetMcpPlannerPrompt}
                    />
                  </div>
                )}


                {/* ============ PAGE 5: CONTENT BANK ============ */}
                {currentPage === 'contentbank' && (
                  <div id="contentBankContainer" className={cn(
                    "flex-1 flex flex-col h-full select-none select-text duration-300",
                    contentBankFullscreen ? "fixed inset-0 z-[1000] bg-slate-900 p-6 overflow-y-auto" : "overflow-y-auto"
                  )}>
                    
                    {/* Breadcrumbs Navigation */}
                    <div id="contentBankBreadcrumbs" className="text-[10px] font-black tracking-widest text-[#64748b] dark:text-[#94a3b8] uppercase mb-1.5 flex items-center gap-1.5 font-mono select-none">
                      {contentBankCategory ? (
                        <>
                          <span id="breadcrumbHome" className="hover:text-indigo-600 dark:hover:text-white cursor-pointer transition-colors" onClick={() => { setContentBankCategory(null); setContentBankTrack(null); setContentBankCourse(null); }}>CONTENT BANK</span>
                          <span className="text-slate-400">/</span>
                          {contentBankTrack ? (
                            <>
                              <span id="breadcrumbCategory" className="hover:text-indigo-600 dark:hover:text-white cursor-pointer transition-colors" onClick={() => setContentBankTrack(null)}>{contentBankCategory}</span>
                              <span className="text-slate-400">/</span>
                              <span id="breadcrumbTrack" className="text-indigo-500 dark:text-blue-400">{contentBankTrack}</span>
                            </>
                          ) : (
                            <span id="breadcrumbCategoryActive" className="text-indigo-500 dark:text-blue-400">{contentBankCategory}</span>
                          )}
                        </>
                      ) : (
                        'CONTENT BANK'
                      )}
                    </div>

                    {/* Generation Archive Header */}
                    <div className="flex items-center justify-between mb-5 px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-700/50 border border-white/[0.08] flex items-center justify-center">
                          <Database size={16} className="text-slate-400" />
                        </div>
                        <h1 className="text-lg font-black text-white">Generation Archive</h1>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => fetchHistory && fetchHistory()} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-transparent text-slate-400 hover:text-white text-xs font-bold tracking-wider cursor-pointer transition-all">
                          <RefreshCw size={12} /><span>REFRESH</span>
                        </button>
                        <button onClick={() => {
                          const rows = generations.map(g => `${g.topic||g.title||''},${g.type||''},${g.track||''},${g.tone||''}`).join('\n');
                          const blob = new Blob([`TITLE,TYPE,TRACK,THEME\n${rows}`], { type: 'text/csv' });
                          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'generations.csv'; a.click();
                        }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-transparent text-slate-400 hover:text-white text-xs font-bold tracking-wider cursor-pointer transition-all">
                          <Download size={12} /><span>EXPORT CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Responsive Header Row exactly matching user screenshots */}
                    <div id="contentBankHeaderRow" className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 select-none shrink-0 bg-white/50 dark:bg-[#111827]/30 p-4 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-4">
                        {!contentBankCategory ? (
                          <div id="techTrackIcon" className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                            <Database size={20} />
                          </div>
                        ) : (
                          <button
                            id="btnBackToTracks"
                            onClick={() => {
                              if (contentBankCourse) {
                                setContentBankCourse(null);
                              } else if (contentBankTrack) {
                                setContentBankTrack(null);
                              } else {
                                setContentBankCategory(null);
                              }
                            }}
                            className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center justify-center shrink-0 transition-all cursor-pointer outline-none"
                          >
                            <ArrowLeft size={18} />
                          </button>
                        )}
                        <div>
                          <h1 id="contentBankTitle" className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white leading-tight">
                            {contentBankCategory ? (contentBankTrack ? contentBankTrack : contentBankCategory) : 'Select Category'}
                          </h1>
                          <p id="contentBankSubtitle" className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                            {contentBankCategory
                              ? (contentBankTrack ? 'Browse and manage course questions.' : 'Select a specific track from this category.')
                              : 'Choose a parent category to explore related tracks.'}
                          </p>
                        </div>
                      </div>

                      {/* Header Controls (View Toggles, Search, Action Button) */}
                      <div id="contentBankHeaderTools" className="flex flex-wrap items-center gap-3">
                        {/* Switcher style exactly like screenshot */}
                        <div id="toggleViewContainer" className="flex items-center bg-slate-100 dark:bg-[#1e293b]/50 border border-slate-200 dark:border-white/5 rounded-lg p-0.5 shadow-inner">
                          <button 
                            id="btnGridMode"
                            onClick={() => setBankViewMode('grid')}
                            className={cn(
                              "p-1.5 rounded-md transition-colors cursor-pointer outline-none",
                              bankViewMode === 'grid' 
                                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                            )}
                            title="Grid View"
                          >
                            <LayoutGrid size={14} />
                          </button>
                          <button 
                            id="btnListMode"
                            onClick={() => setBankViewMode('list')}
                            className={cn(
                              "p-1.5 rounded-md transition-colors cursor-pointer outline-none",
                              bankViewMode === 'list' 
                                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                                : "text-slate-400 hover:text-slate-650 dark:hover:text-slate-200"
                            )}
                            title="List View"
                          >
                            <List size={14} />
                          </button>
                        </div>

                        {/* Search Input for tracks/courses */}
                        {!contentBankCourse && (
                          <div id="bankSearchWrap" className="relative">
                            <input 
                              id="inpBankSearch"
                              type="text"
                              value={contentBankSearchQuery}
                              onChange={(e) => setContentBankSearchQuery(e.target.value)}
                              placeholder={!contentBankCategory ? "Search categories..." : !contentBankTrack ? "Search tracks..." : "Search courses..."}
                              className="w-48 pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-sans font-medium"
                            />
                            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                          </div>
                        )}

                        {/* Export or CREATE CATEGORY/TRACK/COURSE */}
                        {!contentBankCourse ? (
                          <button 
                            id="btnCreateTaxItem"
                            onClick={() => {
                              if (!contentBankCategory) {
                                setBankModalType('category');
                              } else {
                                setBankModalType(contentBankTrack ? 'course' : 'track');
                              }
                              setBankModalInput('');
                              setBankModalOpen(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-extrabold text-[10px] tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap shadow-sm uppercase leading-none"
                          >
                            {!contentBankCategory 
                              ? '+ CREATE CATEGORY' 
                              : (contentBankTrack ? '+ CREATE COURSE' : '+ CREATE TRACK')
                            }
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* View Components mapping */}
                    <div id="contentBankMainArea" className="flex-1 pr-1 custom-scrollbar">
                      
                      {/* 1. TRACKS LISTING VIEW */}
                      {!contentBankCategory && (
                        <div id="categoriesListingView">
                          {bankViewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {Object.keys(trackGroups)
                                .filter(categoryName => categoryName.toLowerCase().includes(contentBankSearchQuery.toLowerCase()))
                                .map(categoryName => {
                                  const childTracks = trackGroups[categoryName] || [];
                                  const coursesCount = childTracks.reduce((sum, trackName) => sum + (tracksWithCourses[trackName]?.length || 0), 0);
                                  return (
                                    <div 
                                      key={categoryName}
                                      onClick={() => {
                                        setContentBankCategory(categoryName);
                                        setContentBankTrack(null);
                                        setContentBankCourse(null);
                                        setContentBankSearchQuery('');
                                      }}
                                      className="group cursor-pointer select-none rounded-[20px] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#141418] hover:bg-slate-100/50 dark:hover:bg-slate-800/10 p-5 flex flex-col justify-between aspect-[1.58] hover:shadow-md transition-all duration-200"
                                    >
                                      <div className="text-indigo-600 dark:text-blue-400 mb-4 bg-indigo-50 dark:bg-blue-950/20 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                        <FolderOpen size={18} className="stroke-[1.8]" />
                                      </div>
                                      <div>
                                        <h3 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-blue-400 transition-colors">
                                          {categoryName}
                                        </h3>
                                        <span className="text-[11px] font-sans font-medium text-slate-400 dark:text-slate-500 font-bold">
                                          {childTracks.length} tracks · {coursesCount} courses
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#141418] rounded-2xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                              {Object.keys(trackGroups)
                                .filter(categoryName => categoryName.toLowerCase().includes(contentBankSearchQuery.toLowerCase()))
                                .map(categoryName => {
                                  const childTracks = trackGroups[categoryName] || [];
                                  const coursesCount = childTracks.reduce((sum, trackName) => sum + (tracksWithCourses[trackName]?.length || 0), 0);
                                  return (
                                    <div 
                                      key={categoryName}
                                      onClick={() => {
                                        setContentBankCategory(categoryName);
                                        setContentBankTrack(null);
                                        setContentBankCourse(null);
                                        setContentBankSearchQuery('');
                                      }}
                                      className="p-4 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/10 cursor-pointer text-xs transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <FolderOpen size={16} className="text-indigo-650 dark:text-blue-400" />
                                        <span className="font-bold text-slate-800 dark:text-white">{categoryName}</span>
                                      </div>
                                      <span className="text-[11px] font-sans text-slate-400 dark:text-slate-500 font-bold">
                                        {childTracks.length} tracks · {coursesCount} courses
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. COURSES & TECH STACKS LISTING */}
                      {contentBankCategory && !contentBankTrack && (
                        <div id="tracksListingView">
                          {bankViewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              
                              {(trackGroups[contentBankCategory] || [])
                                .filter(trackName => trackName.toLowerCase().includes(contentBankSearchQuery.toLowerCase()))
                                .map(trackName => {
                                  const courseCount = tracksWithCourses[trackName]?.length || 0;
                                  return (
                                    <div 
                                      key={trackName}
                                      onClick={() => {
                                        setContentBankTrack(trackName);
                                        setContentBankSearchQuery('');
                                      }}
                                      className="group cursor-pointer select-none rounded-[20px] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#141418] hover:bg-slate-100/50 dark:hover:bg-slate-800/10 p-5 flex flex-col justify-between aspect-[1.58] hover:shadow-md transition-all duration-200"
                                    >
                                      <div className="text-indigo-600 dark:text-blue-400 mb-4 bg-indigo-50 dark:bg-blue-950/20 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                        <FolderOpen size={18} className="stroke-[1.8]" />
                                      </div>
                                      <div>
                                        <h3 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-blue-400 transition-colors">
                                          {trackName}
                                        </h3>
                                        <span className="text-[11px] font-sans font-medium text-slate-400 dark:text-slate-500 font-bold">
                                          {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#141418] rounded-2xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                              {(trackGroups[contentBankCategory] || [])
                                .filter(trackName => trackName.toLowerCase().includes(contentBankSearchQuery.toLowerCase()))
                                .map(trackName => {
                                  const courseCount = tracksWithCourses[trackName]?.length || 0;
                                  return (
                                    <div 
                                      key={trackName}
                                      onClick={() => {
                                        setContentBankTrack(trackName);
                                        setContentBankSearchQuery('');
                                      }}
                                      className="p-4 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/10 cursor-pointer text-xs transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <FolderOpen size={16} className="text-indigo-650 dark:text-blue-400" />
                                        <span className="font-bold text-slate-800 dark:text-white">{trackName}</span>
                                      </div>
                                      <span className="text-[11px] font-sans text-slate-400 dark:text-slate-500 font-bold">
                                        {courseCount} {courseCount === 1 ? 'Course' : 'Courses'}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                      {contentBankTrack && !contentBankCourse && (
                        <div id="coursesListingView">
                          {bankViewMode === 'grid' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              
                              <div 
                                id="btnCreateCourseDashed"
                                onClick={() => {
                                  setBankModalType('course');
                                  setBankModalInput('');
                                  setBankModalOpen(true);
                                }}
                                className="group cursor-pointer select-none border-2 border-dashed border-slate-300 dark:border-white/10 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/5 dark:hover:border-blue-500/35 p-6 flex flex-col items-center justify-center aspect-[1.58] rounded-[20px] transition-all duration-200"
                              >
                                <Plus size={22} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-blue-400 mb-2 transition-colors" />
                                <span className="text-[10px] font-black tracking-widest text-slate-400 group-hover:text-indigo-650 dark:group-hover:text-blue-400 uppercase transition-colors text-center font-sans">
                                  CREATE NEW COURSE
                                </span>
                              </div>

                              {(tracksWithCourses[contentBankTrack] || [])
                                .filter(c => c.toLowerCase().includes(contentBankSearchQuery.toLowerCase()))
                                .map(courseName => {
                                  const matchesCount = generations.filter(g => 
                                    g.track?.toLowerCase() === contentBankTrack?.toLowerCase() && 
                                    g.course?.toLowerCase() === courseName?.toLowerCase()
                                  ).reduce((sum, g) => sum + (g.questions?.length || 0), 0);
                                  
                                  return (
                                    <div 
                                      key={courseName}
                                      onClick={() => {
                                        setContentBankCourse(courseName);
                                      }}
                                      className="group cursor-pointer select-none rounded-[20px] border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#141418] hover:bg-slate-100/50 dark:hover:bg-slate-800/10 p-5 flex flex-col justify-between aspect-[1.58] hover:shadow-md transition-all duration-200"
                                    >
                                      <div className="text-indigo-600 dark:text-blue-400 mb-4 bg-indigo-50 dark:bg-blue-950/20 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                        <BookOpen size={18} className="stroke-[1.8]" />
                                      </div>
                                      <div>
                                        <h3 className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-blue-400 transition-colors">
                                          {courseName}
                                        </h3>
                                        <span className="text-[11px] font-sans font-medium text-slate-400 dark:text-slate-500 font-bold">
                                          {matchesCount} {matchesCount === 1 ? 'Question' : 'Questions'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="border border-slate-200 dark:border-white/5 bg-white/40 dark:bg-[#141418] rounded-2xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                              {(tracksWithCourses[contentBankTrack] || [])
                                .filter(c => c.toLowerCase().includes(contentBankSearchQuery.toLowerCase()))
                                .map(courseName => {
                                  const matchesCount = generations.filter(g => 
                                    g.track?.toLowerCase() === contentBankTrack?.toLowerCase() && 
                                    g.course?.toLowerCase() === courseName?.toLowerCase()
                                  ).reduce((sum, g) => sum + (g.questions?.length || 0), 0);
                                  
                                  return (
                                    <div 
                                      key={courseName}
                                      onClick={() => {
                                        setContentBankCourse(courseName);
                                      }}
                                      className="p-4 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/10 cursor-pointer text-xs transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <BookOpen size={16} className="text-indigo-650 dark:text-blue-400" />
                                        <span className="font-bold text-slate-800 dark:text-white">{courseName}</span>
                                      </div>
                                      <span className="text-[11px] font-sans text-slate-400 dark:text-slate-500 font-bold font-mono">
                                        {matchesCount} {matchesCount === 1 ? 'Question' : 'Questions'}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Weekly Planners for this track ───────────────────────────────────── */}
                      {contentBankTrack && !contentBankCourse && bankPlanners.filter(p => p.track?.toLowerCase() === contentBankTrack?.toLowerCase()).length > 0 && (
                        <div className="mt-6 space-y-3">
                          <p className="text-[9px] font-black text-foreground/30 uppercase tracking-widest font-mono flex items-center gap-2 mb-1">
                            <CalendarDays size={11} className="opacity-50" /> Weekly Planners
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {bankPlanners
                              .filter(p => p.track?.toLowerCase() === contentBankTrack?.toLowerCase())
                              .map(p => {
                                const wks = p.weeks?.length || 0;
                                const qs = (p.weeks || []).reduce((s, w) =>
                                  s + ['skillBuilder','practiceAtHome','challengeYourself'].reduce((a, k) => a + (w[k]?.questions?.length || 0), 0), 0);
                                return (
                                  <div
                                    key={p._id}
                                    onClick={() => openBankPlanner(p)}
                                    className="group cursor-pointer select-none rounded-[20px] border border-brand-primary/20 bg-brand-primary/5 dark:bg-[#141418] hover:bg-brand-primary/10 p-5 flex flex-col justify-between aspect-[1.58] hover:shadow-md hover:shadow-brand-primary/10 transition-all duration-200"
                                  >
                                    <div className="text-brand-primary bg-brand-primary/10 border border-brand-primary/20 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                      <CalendarDays size={18} />
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-white leading-tight mb-1 group-hover:text-brand-primary transition-colors">
                                        {p.courseName}
                                      </h3>
                                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                        {wks} week{wks !== 1 ? 's' : ''} · {qs} question{qs !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            }
                          </div>
                        </div>
                      )}

                      {/* 3. QUESTIONS FOR COURSE VIEW */}
                      {contentBankTrack && contentBankCourse && (
                        <div id="courseQuestionsView" className="flex flex-col h-full bg-white dark:bg-[#141418]/60 border border-slate-200 dark:border-white/10 rounded-[20px] p-5 animate-fadeIn">
                          
                          {/* Inner Filter bar */}
                          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-3 mb-4 select-none text-[10px]">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0d0d0f] border border-slate-200 dark:border-white/10 rounded-lg p-1.5 px-3 min-w-[200px]">
                              <Search size={12} className="text-slate-400" />
                              <input 
                                id="inpCourseQSearch"
                                type="text" 
                                value={bankSearch}
                                onChange={(e) => setBankSearch(e.target.value)}
                                className="bg-transparent border-none text-slate-850 dark:text-white text-[11px] outline-none w-full"
                                placeholder="Search questions..."
                              />
                            </div>

                            <select 
                              id="selCourseQType"
                              value={bankTypeFilter}
                              onChange={(e) => setBankTypeFilter(e.target.value)}
                              className="bg-slate-50 dark:bg-[#0b0b0d] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-650 dark:text-gray-400 font-bold outline-none cursor-pointer"
                            >
                              <option value="">All Types</option>
                              <option value="coding">Coding</option>
                              <option value="mcq">MCQ</option>
                            </select>

                            <select 
                              id="selCourseQDiff"
                              value={bankDiffFilter}
                              onChange={(e) => setBankDiffFilter(e.target.value)}
                              className="bg-slate-50 dark:bg-[#0b0b0d] border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-650 dark:text-gray-400 font-bold outline-none cursor-pointer"
                            >
                              <option value="">All Difficulties</option>
                              <option value="Easy">Easy</option>
                              <option value="Medium">Medium</option>
                              <option value="Hard">Hard</option>
                            </select>

                            <button
                              id="btnToggleSplitView"
                              onClick={() => {
                                setIsSplitView(prev => !prev);
                                setSelectedSplitQIndex(0);
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition-all leading-none",
                                isSplitView 
                                  ? "bg-indigo-600/15 border-indigo-500/30 text-indigo-600 dark:text-[#818cf8]"
                                  : "bg-slate-50 dark:bg-[#0b0b0d] border-slate-200 dark:border-white/10 text-slate-650 dark:text-gray-450 hover:bg-slate-100 dark:hover:bg-white/5"
                              )}
                            >
                              <Columns size={12} />
                              {isSplitView ? 'Disable Split Screen' : 'Split Screen View'}
                            </button>

                            {/* Question counting stat */}
                            {(() => {
                              const pool = getFilteredCourseQuestions(contentBankTrack, contentBankCourse);
                              return (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-none ml-auto mr-2">
                                  {pool.length} matches
                                </div>
                              );
                            })()}

                            <button 
                              id="btnExportCourseQExcel"
                              onClick={() => {
                                const pool = getFilteredCourseQuestions(contentBankTrack, contentBankCourse);
                                if (!pool.length) {
                                  showToast('No questions available in this course to export', true);
                                  return;
                                }
                                downloadMCQsAsExcel(pool, `${contentBankTrack}_${contentBankCourse}`);
                                showToast('Excel sheet downloaded successfully!');
                              }}
                              className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/25 hover:bg-[#10b981]/15 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer font-sans transition-colors"
                            >
                              ↓ Excel Sheet
                            </button>

                            <button 
                              id="btnExportCourseQ"
                              onClick={async () => {
                                const pool = getFilteredCourseQuestions(contentBankTrack, contentBankCourse);
                                if (!pool.length) {
                                  showToast('No questions available in this course to export', true);
                                  return;
                                }
                                showToast('Compiling PDF with official iamneo badging...');
                                try {
                                  await downloadQuestionsAsPDF(pool, {
                                    track: contentBankTrack || selectedTrack,
                                    course: contentBankCourse || selectedCourse,
                                    client: selectedClient,
                                    stack: selectedStack,
                                    userName: inputs.profileName,
                                    userEmpId: inputs.profileEmpId,
                                    time: new Date().toLocaleString()
                                  });
                                  showToast('PDF document downloaded successfully!');
                                } catch (err) {
                                  showToast('Failed to compile badged PDF. Downloading basic PDF...', true);
                                  // Call sync or fall back
                                  try {
                                    await downloadQuestionsAsPDF(pool, {
                                      track: contentBankTrack || selectedTrack,
                                      course: contentBankCourse || selectedCourse,
                                      client: selectedClient,
                                      stack: selectedStack,
                                      userName: inputs.profileName,
                                      userEmpId: inputs.profileEmpId,
                                      time: new Date().toLocaleString()
                                    });
                                  } catch (fail) {
                                    console.error(fail);
                                  }
                                }
                              }}
                              className="bg-indigo-600/10 dark:bg-blue-600/10 text-indigo-600 dark:text-[#818cf8] border border-indigo-500/25 dark:border-blue-500/25 hover:bg-indigo-600/15 dark:hover:bg-blue-600/15 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer font-sans transition-colors"
                            >
                              ↓ PDF (Badged)
                            </button>

                            <button
                              id="btnFullscreen"
                              title={contentBankFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                              onClick={() => setContentBankFullscreen(prev => !prev)}
                              className={cn(
                                "p-2 rounded-lg border bg-slate-50 dark:bg-[#0b0b0d] border-slate-200 dark:border-white/10 text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all",
                                contentBankFullscreen ? "ring-2 ring-indigo-500" : ""
                              )}
                            >
                              {contentBankFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            </button>
                          </div>

                          {/* Render questions pool */}
                          <div className={cn(isSplitView ? "" : "space-y-4")}>
                            {(() => {
                              const pool = getFilteredCourseQuestions(contentBankTrack, contentBankCourse);
                              if (pool.length === 0) {
                                return (
                                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 gap-3">
                                    <BookOpen size={36} className="opacity-45 text-slate-400 dark:text-slate-500" />
                                    <div className="text-xs font-bold text-slate-750 dark:text-white">No questions generated yet</div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-sm font-sans lead-relaxed">No sequence pool matches this specific course track. You can generate questions using our advanced AI-powered synthesizer.</p>
                                    <button 
                                      id="btnNavigateToSynthesize"
                                      onClick={() => {
                                        setSelectedTrack(contentBankTrack);
                                        setSelectedCourse(contentBankCourse);
                                        showPage('generate');
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-2.5 px-5 rounded-lg text-[9px] uppercase tracking-widest mt-2 cursor-pointer transition-all"
                                    >
                                      Go Generate Questions
                                    </button>
                                  </div>
                                );
                              }

                              if (isSplitView) {
                                const safeIndex = Math.min(selectedSplitQIndex, pool.length - 1);
                                const qSelected = pool[safeIndex >= 0 ? safeIndex : 0];

                                return (
                                  <div className="flex flex-col lg:flex-row gap-5 items-stretch min-h-[500px]">
                                    {/* Left Pane: Split List */}
                                    <div className="w-full lg:w-80 shrink-0 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#09090b]/40 rounded-[24px] p-3 flex flex-col gap-2.5 max-h-[78vh] overflow-y-auto no-scrollbar select-none">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 mb-1 font-mono">
                                        Question List ({pool.length})
                                      </div>
                                      <div className="space-y-2">
                                        {pool.map((q, idx) => {
                                          const isSelected = idx === safeIndex;
                                          const isCoding = q._packType === 'coding';
                                          return (
                                            <div 
                                              key={`split-pool-item-${q._packId || 'id'}-${q._packType || 'type'}-${q.id || idx}-${idx}`}
                                              onClick={() => setSelectedSplitQIndex(idx)}
                                              className={cn(
                                                "p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-2 group/splititem select-none",
                                                isSelected 
                                                  ? "bg-indigo-600/10 dark:bg-blue-600/10 border-indigo-500/50 dark:border-blue-500/50 shadow-md ring-1 ring-indigo-500/10 dark:ring-blue-500/10" 
                                                  : "bg-white dark:bg-[#131316] border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/5"
                                              )}
                                            >
                                              {/* Vertical accent indicator row */}
                                              <div className={cn(
                                                "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
                                                isSelected 
                                                  ? (isCoding ? "bg-indigo-500 dark:bg-blue-500" : "bg-emerald-500") 
                                                  : "bg-transparent group-hover/splititem:bg-slate-300 dark:group-hover/splititem:bg-white/15"
                                              )} />

                                              <div className="flex items-center justify-between text-[8px] font-black tracking-widest uppercase">
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded",
                                                  isCoding 
                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                )}>
                                                  {isCoding ? 'CODING' : 'MCQ'}
                                                </span>
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded border leading-none font-sans",
                                                  q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 
                                                  q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 
                                                  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                                )}>
                                                  {q.difficulty}
                                                </span>
                                              </div>

                                              <div className={cn(
                                                "pl-1 text-xs font-extrabold line-clamp-2 transition-all leading-tight font-sans",
                                                isSelected 
                                                  ? "text-indigo-600 dark:text-blue-400" 
                                                  : "text-slate-800 dark:text-gray-300 group-hover/splititem:text-slate-900 dark:group-hover/splititem:text-white"
                                              )}>
                                                {(idx + 1)}. {q.title || (q.questions && q.questions[0]?.question) || q.question || "Untitled Question"}
                                              </div>

                                              {q.leetcodeNumber && (
                                                <div className="pl-1 text-[8px] font-black uppercase text-orange-500 dark:text-orange-400">
                                                  Leetcode #{q.leetcodeNumber}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Right Pane: Split Detail */}
                                    <div className="flex-1 min-w-0 border border-slate-200 dark:border-white/10 bg-slate-50/20 dark:bg-[#0c0c0e]/30 rounded-[24px] p-2.5 max-h-[78vh] overflow-y-auto no-scrollbar relative select-text">
                                      <AnimatePresence mode="wait">
                                        {qSelected && (
                                          <motion.div
                                            key={`selected-anim-${qSelected._packId || 'none'}-${qSelected._packType || 'type'}-${qSelected.id || safeIndex}-${safeIndex}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="h-full"
                                          >
                                            {qSelected._packType === 'coding' ? (
                                              <CodingCard
                                                question={qSelected}
                                                images={currentSessionImages}
                                                index={safeIndex}
                                              />
                                            ) : (
                                              <div className="max-w-2xl mx-auto py-2">
                                                <MCQCard 
                                                  mcq={qSelected} 
                                                  index={safeIndex} 
                                                />
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>
                                );
                              }

                              return pool.map((q, idx) => {
                                const isCodingCard = q._packType === 'coding';
                                return isCodingCard ? (
                                  <CodingCard
                                    key={`non-split-coding-${q._packId || 'none'}-${q.id || idx}-${idx}`}
                                    question={q}
                                    images={currentSessionImages}
                                    index={idx}
                                  />
                                ) : (
                                  <div key={`non-split-mcq-${q._packId || 'none'}-${q.id || idx}-${idx}`} className="max-w-2xl">
                                    <MCQCard 
                                      mcq={q} 
                                      index={idx} 
                                    />
                                  </div>
                                );
                              });
                            })()}
                          </div>

                        </div>
                      )}

                    </div>

                  </div>
                )}

                {/* Content Web - interactive spider web map */}
                {currentPage === 'dashboard' && (
                  <div className="mt-12 mb-8">
                    <div className="p-2">
                      <ContentWeb
                        trackGroups={trackGroups}
                        tracksWithCourses={tracksWithCourses}
                        onNavigate={(category, track) => {
                          setContentBankCategory(category);
                          setContentBankTrack(track);
                          setContentBankCourse(null);
                          showPage('contentbank');
                        }}
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* ── PlannerView overlay — opened from content bank track ──────────────── */}
              {activePlannerInBank && (
                <div className="fixed inset-0 z-[500] bg-card overflow-y-auto p-6 lg:p-8 custom-scrollbar">
                  <PlannerView planner={activePlannerInBank} onBack={() => setActivePlannerInBank(null)} />
                </div>
              )}

              {/* Sticky bottom status footer bar identical to user spec */}
              <div id="appStickyFooter" className="h-[26px] border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0d0d0f] px-3.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-gray-500 select-none flex-shrink-0">
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    AI Model Online
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                    DB Linked Atlas
                  </div>
                </div>
                <div className="font-mono">
                  {currentTime} IST · v3.0.0 · F.R.I.D.A.Y
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Custom Creation Modal for Tracks/Courses to bypass iframe alert/prompt constraints */}
      <AnimatePresence>
        {bankModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4 select-none pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden p-5"
            >
              <h3 className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-[#818cf8] uppercase mb-1 font-mono">
                {bankModalType === 'course' ? 'Create Course' : bankModalType === 'track' ? 'Create Track' : 'Create Category'}
              </h3>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white mb-3">
                {bankModalType === 'course' 
                  ? `New Course for ${contentBankTrack}` 
                  : bankModalType === 'track'
                    ? `New Track for ${contentBankCategory}`
                    : 'New Category (Parent Track)'
                }
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    Name
                  </label>
                  <input 
                    type="text" 
                    value={bankModalInput}
                    onChange={(e) => setBankModalInput(e.target.value)}
                    placeholder={
                      bankModalType === 'course' 
                        ? 'e.g. Enterprise Architecture with .NET' 
                        : bankModalType === 'track'
                          ? 'e.g. Kotlin'
                          : 'e.g. System Design'
                    }
                    className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 p-2.5 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium font-sans"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleBankModalSubmit();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5">
                <button 
                  onClick={() => setBankModalOpen(false)}
                  className="p-2 px-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 hover:bg-slate-100 dark:bg-transparent dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 font-extrabold text-[9px] uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBankModalSubmit}
                  className="p-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-widest cursor-pointer transition-colors shadow-sm"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synchronizing Full screen HTML QLoader shown during app opening, login and generate */}
      {(appOpening || isLoggingIn || state === 'generating') && (
        <QLoader
          label={
            appOpening
              ? "Initializing Q Labs..."
              : isLoggingIn
                ? "Checking Access Matrix..."
                : (overlayMsg || "Generating Questions...")
          }
          variant={isLoggingIn ? 'login' : state === 'generating' ? 'generating' : 'default'}
        />
      )}

      {/* MCP generation overlay — shown when Claude triggers a generation via MCP */}
      {mcpOverlay && mcpJob && (
        <div className="fixed inset-0 z-[9000] bg-[#090d18] flex flex-col items-center justify-center gap-5 animate-in fade-in duration-300"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 55%)' }}>

          {/* QLoader bolt animation (reusing CSS classes from QLoader component) */}
          <div className="ql-loader" style={{
            '--neon': '#3b82f6', '--neon-soft': '#60a5fa', '--neon-core': '#dbeafe',
            '--draw-stroke': '#93c5fd', '--loader-text': '#60a5fa',
            '--stage-bg': 'transparent', '--grid-op': '0',
            width: 'auto', height: 'auto', padding: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            position: 'relative'
          }}>
            <svg className="ql-bolt-svg" viewBox="0 0 128 210" style={{ width: 44, height: 'auto' }} aria-hidden>
              <path className="ql-pulse p1" d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
              <path className="ql-pulse p2" d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
              <path className="ql-track"    d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
              <path className="ql-fill"     d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
              <path className="ql-draw"     d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z"/>
            </svg>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest font-mono">
              {mcpJob.type === 'planner' ? 'MCP · BUILDING CONTENT PLANNER' : 'MCP TRIGGERED · CLAUDE GENERATING'}
            </p>
          </div>

          {/* Topic + context */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-xl font-black text-white">
              {mcpJob.type === 'planner'
                ? `${mcpJob.count}-Week Content Planner`
                : `${mcpJob.count} ${mcpJob.type === 'coding' ? 'Coding' : 'MCQ'} Questions`}
            </h1>
            <p className="text-sm text-slate-400 font-mono">
              <span className="text-white font-bold">{mcpJob.topic}</span>
              {mcpJob.track ? ` · ${mcpJob.track}` : ''}
              {mcpJob.course ? ` · ${mcpJob.course}` : ''}
            </p>
          </div>

          {/* Rotating quote */}
          <p className="text-[11px] text-slate-500 font-mono max-w-xs text-center italic min-h-[16px] transition-all duration-500">
            "{MCP_QUOTES[mcpQuoteIdx]}"
          </p>

          {/* Timer circle — counts UP from 0 clockwise */}
          {(() => {
            const elapsed = Math.round((Date.now() - (mcpJob.startedAt || Date.now())) / 1000);
            const expected = mcpJob.type === 'coding' ? 90 : 45;
            const pct = Math.min(100, (elapsed / expected) * 100);
            return (
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="54" fill="none"
                      stroke={mcpJob.status === 'done' ? '#22c55e' : mcpJob.status === 'error' ? '#ef4444' : '#3b82f6'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 54}`}
                      strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {mcpJob.status === 'done' ? (
                      <span className="text-2xl">✅</span>
                    ) : mcpJob.status === 'error' ? (
                      <span className="text-2xl">❌</span>
                    ) : (
                      <>
                        <span className="text-3xl font-black text-white tabular-nums">{elapsed}</span>
                        <span className="text-[9px] text-slate-500 font-mono uppercase">secs</span>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {mcpJob.status === 'done' ? 'Done — redirecting...' :
                   mcpJob.status === 'error' ? 'Generation failed' :
                   'Claude is generating...'}
                </p>
              </div>
            );
          })()}

          {/* Arcade game button — play while waiting */}
          {mcpJob.status === 'running' && (
            <button
              onClick={() => setArcadeOpen(true)}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl cursor-pointer transition-all group"
              style={{
                background: 'linear-gradient(135deg, rgba(255,45,149,0.12) 0%, rgba(139,92,246,0.12) 50%, rgba(0,240,255,0.12) 100%)',
                border: '1px solid rgba(139,92,246,0.35)',
                boxShadow: '0 0 24px -8px rgba(139,92,246,0.4)'
              }}
            >
              <span style={{ fontSize: 22 }}>🕹️</span>
              <div className="text-left">
                <p className="text-[11px] font-black text-white uppercase tracking-widest font-mono">Play Neon Clash Arcade</p>
                <p className="text-[9px] text-slate-500 font-mono">9 games · 2P & vs CPU · while Claude works</p>
              </div>
              <span className="text-slate-600 group-hover:text-purple-400 transition-colors text-xs">→</span>
            </button>
          )}

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500/40 animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>

          {/* Skip / dismiss button */}
          <button
            onClick={() => { setMcpOverlay(false); }}
            className="text-[9px] text-slate-600 hover:text-slate-400 font-mono uppercase tracking-widest cursor-pointer transition-colors mt-1"
          >
            Continue in background ↗
          </button>
        </div>
      )}

      {/* Neon Clash Arcade modal — full-screen iframe */}
      {arcadeOpen && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#070313]">
          {/* Thin header bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-[#0d0726]/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-lg">🕹️</span>
              <div>
                <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest font-mono">NEON CLASH ARCADE</p>
                <p className="text-[9px] text-slate-500 font-mono">Claude is still generating in background</p>
              </div>
            </div>
            <button
              onClick={() => setArcadeOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest font-mono cursor-pointer transition-all hover:border-blue-500/40"
            >
              <X size={12} /> BACK TO LOADER
            </button>
          </div>
          {/* Game iframe */}
          <iframe
            src="/neon-clash-arcade.html"
            className="flex-1 w-full border-none"
            title="Neon Clash Arcade"
            allow="autoplay"
          />
        </div>
      )}

      {/* MCP Prompt Modal — copy-to-clipboard prompt for Claude */}
      {mcpPromptModal && (
        <div className="fixed inset-0 z-[9500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setMcpPromptModal(false)}>
          <div className="w-full max-w-2xl rounded-3xl bg-[#111827] border border-white/[0.08] overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 120 220" fill="none">
                    <path d="M74 6 L30 112 L60 112 L46 202 L98 84 L66 84 Z" fill="#3b82f6"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest font-mono">MCP PROMPT</p>
                  <h2 className="text-sm font-black text-white">Copy &amp; paste into Claude Code tab</h2>
                </div>
              </div>
              <button onClick={() => setMcpPromptModal(false)}
                className="w-8 h-8 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Prompt box */}
            <div className="px-6 py-4">
              <div className="relative rounded-2xl bg-[#0a0f1e] border border-white/[0.06] overflow-hidden">
                <pre className="text-[11px] text-slate-300 font-mono p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">{mcpPromptText}</pre>
              </div>
              <p className="text-[9px] text-slate-600 font-mono mt-2">
                Tip: paste this into Claude Code tab → Claude calls F.R.I.D.A.Y tools → questions appear in your course card.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-6 pb-5">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(mcpPromptText).then(() => {
                    showToast('✓ Prompt copied to clipboard!');
                    setMcpPromptModal(false);
                  });
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] tracking-widest uppercase cursor-pointer transition-all">
                <Copy size={13} /> <span>COPY TO CLIPBOARD</span>
              </button>
              <button onClick={() => setMcpPromptModal(false)}
                className="px-5 py-3 rounded-xl border border-white/[0.08] text-slate-400 hover:text-white text-[10px] font-black tracking-widest uppercase cursor-pointer transition-all">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
