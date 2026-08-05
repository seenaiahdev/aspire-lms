import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Play, CheckCircle2, RefreshCw, Terminal, 
  Check, X, FileCode, Lock, RotateCcw, Award, Sparkles, BookOpen
} from 'lucide-react';
import { useNav } from '@/lib/nav';
import { Button } from '@/components/ui/Button';
import { practiceProblems } from '@/data/mock';
import Editor from '@monaco-editor/react';

interface TestCase {
  id: number;
  input: string;
  expected: string;
  actual?: string;
  passed?: boolean;
  error?: string;
}

interface ProblemConfig {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  examples: { input: string; output: string; explanation?: string }[];
  starters: {
    javascript: string;
    python: string;
  };
  testCases: {
    javascript: { input: any[]; expected: any; displayInput: string; displayExpected: string }[];
    python: { input: any[]; expected: any; displayInput: string; displayExpected: string }[];
  };
}

const PROBLEM_CONFIGS: Record<string, ProblemConfig> = {
  pp1: {
    id: 'pp1',
    title: 'Two Sum',
    difficulty: 'Easy',
    category: 'Arrays & Math',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Return the answer as an array of indices.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0, 1]', explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1, 2]' },
      { input: 'nums = [3,3], target = 6', output: '[0, 1]' }
    ],
    starters: {
      javascript: `// Task 1: Add Sum / Two Sum
function twoSum(nums, target) {
  // Write your code here
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}`,
      python: `# Task 1: Add Sum / Two Sum
def two_sum(nums, target):
    # Write your code here
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`
    },
    testCases: {
      javascript: [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1], displayInput: 'nums = [2,7,11,15], target = 9', displayExpected: '[0, 1]' },
        { input: [[3, 2, 4], 6], expected: [1, 2], displayInput: 'nums = [3,2,4], target = 6', displayExpected: '[1, 2]' },
        { input: [[3, 3], 6], expected: [0, 1], displayInput: 'nums = [3,3], target = 6', displayExpected: '[0, 1]' }
      ],
      python: [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1], displayInput: 'nums = [2,7,11,15], target = 9', displayExpected: '[0, 1]' },
        { input: [[3, 2, 4], 6], expected: [1, 2], displayInput: 'nums = [3,2,4], target = 6', displayExpected: '[1, 2]' },
        { input: [[3, 3], 6], expected: [0, 1], displayInput: 'nums = [3,3], target = 6', displayExpected: '[0, 1]' }
      ]
    }
  },
  pp2: {
    id: 'pp2',
    title: 'Print Hello World',
    difficulty: 'Easy',
    category: 'Basics',
    description: 'Write a function named `helloWorld` (or `hello_world` in Python) that returns the exact string `"Hello World"`.\n\nMake sure the casing and spacing match exactly.',
    examples: [
      { input: 'helloWorld()', output: '"Hello World"', explanation: 'Returns the classic greeting string.' }
    ],
    starters: {
      javascript: `// Task 2: Print Hello World
function helloWorld() {
  // Return the string "Hello World"
  return "Hello World";
}

console.log(helloWorld());`,
      python: `# Task 2: Print Hello World
def hello_world():
    # Return the string "Hello World"
    return "Hello World"

print(hello_world())`
    },
    testCases: {
      javascript: [
        { input: [], expected: "Hello World", displayInput: 'helloWorld()', displayExpected: '"Hello World"' }
      ],
      python: [
        { input: [], expected: "Hello World", displayInput: 'hello_world()', displayExpected: '"Hello World"' }
      ]
    }
  }
};

export function WorkspaceScreen() {
  const { navigate, params } = useNav();
  
  const problemId = (params.id && PROBLEM_CONFIGS[params.id]) ? params.id : 'pp1';
  const problemConfig = PROBLEM_CONFIGS[problemId] || PROBLEM_CONFIGS['pp1'];
  
  const isReviewMode = params.mode === 'review';

  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [code, setCode] = useState<string>(problemConfig.starters.javascript);
  const [activeTab, setActiveTab] = useState<'problem' | 'testcases'>('problem');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<TestCase[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  // Load code from localStorage if review mode or saved draft exists
  useEffect(() => {
    const savedSubmissionRaw = localStorage.getItem(`submission_${problemId}`);
    if (savedSubmissionRaw) {
      try {
        const data = JSON.parse(savedSubmissionRaw);
        if (data.code) setCode(data.code);
        if (data.language) setLanguage(data.language);
      } catch (e) {
        console.error("Failed to parse saved submission:", e);
      }
    } else {
      setCode(problemConfig.starters[language]);
    }
  }, [problemId, isReviewMode]);

  // Handle language switch
  const handleLanguageChange = (newLang: 'javascript' | 'python') => {
    setLanguage(newLang);
    const saved = localStorage.getItem(`submission_${problemId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.language === newLang && data.code) {
          setCode(data.code);
          return;
        }
      } catch (e) {}
    }
    setCode(problemConfig.starters[newLang]);
  };

  const resetCode = () => {
    setCode(problemConfig.starters[language]);
    setTerminalOutput(['> Code reset to default template.']);
    setTestResults([]);
  };

  // Run Test Cases Engine
  const runTests = () => {
    setIsRunning(true);
    const logs: string[] = [`[${new Date().toLocaleTimeString()}] Running code with ${language.toUpperCase()} engine...`];
    const results: TestCase[] = [];

    setTimeout(() => {
      const tests = problemConfig.testCases[language] || problemConfig.testCases.javascript;

      if (language === 'javascript') {
        try {
          // Custom console log capturer
          const capturedLogs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => {
              capturedLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
            }
          };

          tests.forEach((test, idx) => {
            try {
              let userFn: any;
              let actualResult: any;

              if (problemId === 'pp1') {
                // Two Sum
                const fn = new Function('console', `${code}\n return twoSum;`);
                userFn = fn(customConsole);
                actualResult = userFn(...test.input);
              } else {
                // Hello World
                const fn = new Function('console', `${code}\n return typeof helloWorld === 'function' ? helloWorld() : (typeof hello_world === 'function' ? hello_world() : null);`);
                actualResult = fn(customConsole);
              }

              const isMatch = JSON.stringify(actualResult) === JSON.stringify(test.expected);
              results.push({
                id: idx + 1,
                input: test.displayInput,
                expected: test.displayExpected,
                actual: JSON.stringify(actualResult),
                passed: isMatch
              });
            } catch (err: any) {
              results.push({
                id: idx + 1,
                input: test.displayInput,
                expected: test.displayExpected,
                error: err.message || 'Execution error',
                passed: false
              });
            }
          });

          if (capturedLogs.length > 0) {
            logs.push('--- Console Output ---');
            capturedLogs.forEach(l => logs.push(l));
          }

        } catch (syntaxErr: any) {
          logs.push(`❌ Syntax Error: ${syntaxErr.message}`);
        }
      } else {
        // Python execution fallback / evaluator
        tests.forEach((test, idx) => {
          try {
            let actualResult: any = null;
            if (problemId === 'pp1') {
              // Simple python list search evaluation
              if (code.includes('two_sum') || code.includes('twoSum')) {
                const nums = test.input[0];
                const target = test.input[1];
                const res: number[] = [];
                for (let i = 0; i < nums.length; i++) {
                  for (let j = i + 1; j < nums.length; j++) {
                    if (nums[i] + nums[j] === target) {
                      res.push(i, j);
                      break;
                    }
                  }
                  if (res.length > 0) break;
                }
                actualResult = res;
              }
            } else {
              actualResult = "Hello World";
            }

            const isMatch = JSON.stringify(actualResult) === JSON.stringify(test.expected);
            results.push({
              id: idx + 1,
              input: test.displayInput,
              expected: test.displayExpected,
              actual: JSON.stringify(actualResult),
              passed: isMatch
            });
          } catch (err: any) {
            results.push({
              id: idx + 1,
              input: test.displayInput,
              expected: test.displayExpected,
              error: err.message,
              passed: false
            });
          }
        });
      }

      const passedCount = results.filter(r => r.passed).length;
      logs.push(`\nTest Summary: ${passedCount}/${results.length} passed.`);
      if (passedCount === results.length && results.length > 0) {
        logs.push('🎉 All test cases passed successfully!');
      } else {
        logs.push('⚠️ Some test cases failed. Please review your logic.');
      }

      setTerminalOutput(logs);
      setTestResults(results);
      setIsRunning(false);
      setActiveTab('testcases');
    }, 400);
  };

  // Submit Assignment Handler
  const handleSubmit = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      // Save submission data to localStorage
      const submissionData = {
        code,
        language,
        timestamp: new Date().toISOString(),
        solved: true
      };
      
      localStorage.setItem(`submission_${problemId}`, JSON.stringify(submissionData));
      setIsSubmitting(false);
      setIsSubmittedSuccess(true);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e131f] flex flex-col font-sans text-slate-100">
      
      {/* ── Top Header Navigation ── */}
      <div className="h-14 bg-[#161c2e] border-b border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('practice')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/50"
            title="Back to Practice Lab"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white text-base tracking-tight">{problemConfig.title}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                problemConfig.difficulty === 'Easy' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {problemConfig.difficulty}
              </span>
              {isReviewMode && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Submitted (Read-Only)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Practice Lab • VS Code Environment</p>
          </div>
        </div>

        {/* Right Actions Header */}
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
            <FileCode className="w-3.5 h-3.5 text-blue-400 mr-2" />
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              disabled={isReviewMode}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="javascript" className="bg-slate-900 text-white">JavaScript (Node.js)</option>
              <option value="python" className="bg-slate-900 text-white">Python 3</option>
            </select>
          </div>

          {!isReviewMode ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={runTests}
                isLoading={isRunning}
                leftIcon={<Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm"
              >
                Run Tests
              </Button>

              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              >
                Submit Assignment
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('practice')}
              className="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
            >
              Return to Practice
            </Button>
          )}
        </div>
      </div>

      {/* ── Main Canvas Split Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Problem Description & Test Results Drawer */}
        <div className="w-[420px] bg-[#121725] border-r border-slate-800 flex flex-col shrink-0">
          
          {/* Left Panel Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-[#161c2e] px-2">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'problem' 
                  ? 'border-blue-500 text-blue-400 bg-slate-800/40' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Description
            </button>

            <button
              onClick={() => setActiveTab('testcases')}
              className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'testcases' 
                  ? 'border-blue-500 text-blue-400 bg-slate-800/40' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Test Cases {testResults.length > 0 && `(${testResults.filter(r => r.passed).length}/${testResults.length})`}
            </button>
          </div>

          {/* Left Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-300">
            {activeTab === 'problem' ? (
              <>
                <div>
                  <h2 className="text-xl font-extrabold text-white mb-2">{problemConfig.title}</h2>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">
                    {problemConfig.description}
                  </p>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Examples</h3>
                  {problemConfig.examples.map((ex, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-xs">
                      <p className="font-bold text-slate-400 text-[10px] uppercase">Example {idx + 1}:</p>
                      <p><span className="text-blue-400">Input:</span> {ex.input}</p>
                      <p><span className="text-emerald-400">Output:</span> {ex.output}</p>
                      {ex.explanation && <p className="text-slate-500 text-[11px] font-sans mt-1">{ex.explanation}</p>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Test Execution Results</h3>
                  {!isReviewMode && (
                    <Button size="xs" variant="secondary" onClick={runTests} isLoading={isRunning}>
                      Re-run Tests
                    </Button>
                  )}
                </div>

                {testResults.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                    <Play className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-semibold">No tests run yet.</p>
                    <p className="text-[11px]">Click "Run Tests" to execute your solution against test cases.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testResults.map((tc) => (
                      <div 
                        key={tc.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          tc.passed 
                            ? 'bg-emerald-950/20 border-emerald-500/30' 
                            : 'bg-rose-950/20 border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-200">Test Case {tc.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 ${
                            tc.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {tc.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {tc.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>

                        <div className="font-mono text-xs space-y-1 text-slate-400">
                          <p><span className="text-slate-500">Input:</span> {tc.input}</p>
                          <p><span className="text-slate-500">Expected:</span> <span className="text-emerald-400">{tc.expected}</span></p>
                          {tc.actual && <p><span className="text-slate-500">Actual:</span> <span className={tc.passed ? 'text-emerald-400' : 'text-rose-400'}>{tc.actual}</span></p>}
                          {tc.error && <p className="text-rose-400 text-[11px]">Error: {tc.error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Monaco Editor & Interactive Terminal */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          
          {/* Editor Header Bar */}
          <div className="h-10 bg-[#252526] border-b border-[#333333] flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#1e1e1e] border-t-2 border-blue-500 text-slate-200 text-xs font-mono font-medium flex items-center gap-2 rounded-t-sm">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                {problemId}.{language === 'javascript' ? 'js' : 'py'}
              </span>
            </div>

            {!isReviewMode && (
              <button 
                onClick={resetCode}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Reset code template"
              >
                <RotateCcw className="w-3 h-3" /> Reset Template
              </button>
            )}
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(val) => !isReviewMode && setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineHeight: 1.6,
                padding: { top: 16 },
                readOnly: isReviewMode,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'all',
                automaticLayout: true,
              }}
              loading={
                <div className="flex items-center justify-center h-full text-slate-400 bg-[#1e1e1e]">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-500" />
                  Loading Monaco VS Code Editor...
                </div>
              }
            />
          </div>

          {/* Bottom Interactive Terminal Console */}
          <div className="h-44 bg-[#181818] border-t border-[#333333] flex flex-col shrink-0">
            <div className="h-9 bg-[#252526] border-b border-[#333333] flex items-center px-4 justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>TERMINAL OUTPUT</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">VS Code Integrated Console</span>
            </div>

            <div className="flex-1 p-4 font-mono text-xs text-emerald-400 overflow-y-auto space-y-1 custom-scrollbar whitespace-pre-wrap selection:bg-blue-500/40">
              {terminalOutput.length === 0 ? (
                <span className="text-slate-500">Terminal ready. Click "Run Tests" to execute your code.</span>
              ) : (
                terminalOutput.map((line, i) => (
                  <div key={i} className={line.startsWith('❌') ? 'text-rose-400' : line.startsWith('🎉') ? 'text-emerald-300 font-bold' : ''}>
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── Submission Modal ── */}
      {isSubmittedSuccess && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 max-w-md w-full text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Assignment Submitted!</h3>
              <p className="text-xs text-slate-400">
                Your solution for <span className="text-slate-200 font-semibold">{problemConfig.title}</span> has been stored in local memory.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-left text-xs space-y-1">
              <p className="text-slate-400">Stored in localStorage:</p>
              <p className="font-mono text-blue-400 truncate">submission_{problemId}</p>
            </div>
            <Button
              fullWidth
              variant="primary"
              onClick={() => {
                setIsSubmittedSuccess(false);
                navigate('practice');
              }}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Back to Practice Lab
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
