# 🏗️ Practice Lab - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRACTICE LAB SYSTEM                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    1. PRACTICE SCREEN                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Stats Dashboard                                    │    │
│  │  [Solved: 1/2] [Streak: 7d] [Points: 5] [Rate: 50%]│    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Daily Challenge Banner                             │    │
│  │  "Binary Tree Path Sum"  [Solve Now →]             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Tabs: [Problems] [MCQs] [Practice History]                │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │  Problem List (if Problems tab)      │                  │
│  │  ┌────────────────────────────────┐  │                  │
│  │  │ ✅ Hello World        [Review] │  │                  │
│  │  │    Easy • Basics • 5 XP        │  │                  │
│  │  └────────────────────────────────┘  │                  │
│  │  ┌────────────────────────────────┐  │                  │
│  │  │ ○ Two Sum             [Solve]  │  │                  │
│  │  │    Easy • Arrays • 10 XP       │  │                  │
│  │  └────────────────────────────────┘  │                  │
│  └──────────────────────────────────────┘                  │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │  Practice History (if History tab)   │                  │
│  │  ┌────────────────────────────────┐  │                  │
│  │  │ ✅ Hello World                 │  │                  │
│  │  │    JavaScript • 2 hours ago    │  │                  │
│  │  │    Code Preview...             │  │                  │
│  │  │         [Review Code →]        │  │                  │
│  │  └────────────────────────────────┘  │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Click "Solve" or "Review"
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    2. WORKSPACE SCREEN                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Top Navigation                                     │    │
│  │  [← Back] Two Sum                                   │    │
│  │  [JS] [Python] [Java] [C++]                         │    │
│  │  [Run Code] [Run Tests] [Reset] [Submit]           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────┬────────────────────────────────────────┐  │
│  │             │                                        │  │
│  │  Problem    │     VS Code Editor (StackBlitz)       │  │
│  │ Description │                                        │  │
│  │             │  ┌──────────────────────────────────┐ │  │
│  │  • Title    │  │ solution.js          × │         │ │  │
│  │  • Diff     │  ├──────────────────────────────────┤ │  │
│  │  • Category │  │ 1  function twoSum(nums, target) │ │  │
│  │             │  │ 2    // Your code here           │ │  │
│  │  Examples   │  │ 3                                 │ │  │
│  │  • Input    │  │ 4  }                              │ │  │
│  │  • Output   │  │ 5                                 │ │  │
│  │  • Explain  │  └──────────────────────────────────┘ │  │
│  │             │                                        │  │
│  │ Constraints │  ┌──────────────────────────────────┐ │  │
│  │  • List     │  │ TERMINAL                         │ │  │
│  │             │  │ $ node test.js                   │ │  │
│  │ Test Cases  │  │ Running tests...                 │ │  │
│  │  • 5 cases  │  │ ✓ Test 1 passed                  │ │  │
│  │             │  │ ✓ Test 2 passed                  │ │  │
│  │ Security    │  │ Score: 100%                      │ │  │
│  │ Notice      │  └──────────────────────────────────┘ │  │
│  │             │                                        │  │
│  │   420px     │           Flex-1 (Responsive)         │  │
│  └─────────────┴────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐    ┌──────────────────┐    ┌─────────────┐
│   mock.ts        │    │ problemConfigs.ts│    │ localStorage│
│                  │    │                  │    │             │
│ • practiceProblems    │ • pp1 (Two Sum)  │    │ • submission_pp1│
│   - pp1 (Two Sum)│    │   - description  │    │ • submission_pp2│
│   - pp2 (Hello)  │    │   - examples     │    │ • practiceProblems│
│                  │    │   - test cases   │    │             │
│ • Basic metadata │    │   - 4 languages  │    │ • User data │
│   - id, title    │    │                  │    │   persisted │
│   - difficulty   │    │ • pp2 (Hello)    │    │             │
│   - points       │    │   - Same struct  │    │             │
└──────────────────┘    └──────────────────┘    └─────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ↓
                    ┌────────────────────────┐
                    │   React Components     │
                    │                        │
                    │ • PracticeScreen       │
                    │ • WorkspaceScreen      │
                    └────────────────────────┘
```

---

## Button Click Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   BUTTON CLICK HANDLERS                      │
└─────────────────────────────────────────────────────────────┘

1. RUN CODE BUTTON
   ↓
   Check: Is editor ready (vmInstance)?
   ↓
   No  → Show alert: "⚠️ Editor is still loading..."
   ↓
   Yes → Open terminal
   ↓
   Execute command:
   • JavaScript: node solution.js
   • Python: python solution.py
   • Java: javac Solution.java && java Solution
   • C++: g++ solution.cpp -o solution && ./solution
   ↓
   Terminal shows output

─────────────────────────────────────────────────────────────

2. RUN TESTS BUTTON
   ↓
   Check: Is editor ready?
   ↓
   Yes → Open terminal
   ↓
   Execute test command:
   • JavaScript: node test.js
   • Python: python test.py
   • Java: javac + java TestRunner
   • C++: g++ test.cpp && ./test
   ↓
   Terminal shows:
   🧪 Running Test Cases...
   ✓ Test 1: passed
   ✓ Test 2: passed
   📊 Results: 5 passed, 0 failed
   💯 Score: 100%

─────────────────────────────────────────────────────────────

3. RESET BUTTON
   ↓
   Show confirmation:
   "⚠️ Reset your code? Cannot be undone."
   ↓
   User clicks OK?
   ↓
   Yes → Force reload editor
   ↓
   Editor reloads with fresh starter code
   ↓
   All changes lost

─────────────────────────────────────────────────────────────

4. SUBMIT BUTTON
   ↓
   Check: Is editor ready?
   ↓
   Show confirmation:
   "🚀 Submit your solution?"
   ↓
   User clicks OK?
   ↓
   Yes → Show loading spinner
   ↓
   Get code from editor:
   await vmInstance.getFsSnapshot()
   ↓
   Create submission object:
   {
     problemId: "pp1",
     language: "javascript",
     code: "function...",
     timestamp: "2026-08-05...",
     projectUrl: "https://..."
   }
   ↓
   Save to localStorage:
   localStorage.setItem('submission_pp1', JSON.stringify(data))
   ↓
   Update problem as solved
   ↓
   Show success alert:
   "✅ Submission Successful!
    Problem: Two Sum
    Language: JavaScript
    Points: 10 XP"
   ↓
   Wait 1.5 seconds
   ↓
   Navigate back to Practice screen
   ↓
   Stats updated, problem shows ✓

─────────────────────────────────────────────────────────────

5. LANGUAGE SELECTOR (e.g., click "Python")
   ↓
   Check: Already selected?
   ↓
   No → Show confirmation:
   "🔄 Switch to Python?
    ⚠️ Your current code will be reset."
   ↓
   User clicks OK?
   ↓
   Yes → Set isReady = false
   ↓
   Show loading: "Loading Python Environment..."
   ↓
   Change language state to "python"
   ↓
   useEffect triggered
   ↓
   Create new project files:
   • solution.py (Python starter code)
   • test.py (Python test runner)
   • README.md
   • .vscode/settings.json
   ↓
   Call StackBlitz SDK:
   sdk.embedProject(..., files, template: 'python')
   ↓
   Wait for StackBlitz to load
   ↓
   Set vmInstance
   ↓
   Set isReady = true
   ↓
   Editor ready with Python code!

─────────────────────────────────────────────────────────────

6. BACK BUTTON
   ↓
   Navigate to practice screen
   ↓
   navigate('practice')
   ↓
   Workspace closes
   ↓
   Practice screen shows updated stats
```

---

## LocalStorage Structure

```
┌─────────────────────────────────────────────────────────────┐
│                  BROWSER LOCAL STORAGE                       │
└─────────────────────────────────────────────────────────────┘

Key: submission_pp1
Value: {
  "problemId": "pp1",
  "language": "javascript",
  "code": "function twoSum(nums, target) {\n  const map...",
  "timestamp": "2026-08-05T10:30:00.000Z",
  "projectUrl": "https://stackblitz.com/edit/pp1-1720351234567"
}

Key: submission_pp2
Value: {
  "problemId": "pp2",
  "language": "python",
  "code": "class Solution:\n    def helloWorld(self)...",
  "timestamp": "2026-08-05T12:45:00.000Z",
  "projectUrl": "https://stackblitz.com/edit/pp2-1720358456789"
}

Key: practiceProblems (optional - for persistence)
Value: [
  {
    "id": "pp1",
    "title": "Two Sum",
    "solved": true,
    "attempts": 2
  },
  {
    "id": "pp2",
    "title": "Hello World",
    "solved": true,
    "attempts": 1
  }
]
```

---

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│                     (Main Router)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────┬──────────────┐
                            │             │              │
                    ┌───────▼──────┐  ┌──▼────────┐  ┌─▼─────┐
                    │PracticeScreen│  │WorkspaceScreen│  │Other│
                    └──────────────┘  └──────────────┘  └─────┘
                            │                 │
        ┌───────────────────┼─────┐          │
        │                   │     │          │
   ┌────▼────┐    ┌────────▼──┐  │    ┌─────▼──────┐
   │StatCards│    │Problem List│  │    │StackBlitz  │
   └─────────┘    └────────────┘  │    │ Embed      │
                                   │    └────────────┘
                         ┌─────────▼────────┐
                         │Practice History  │
                         │  • Submissions   │
                         │  • Code Preview  │
                         │  • Review Button │
                         └──────────────────┘

UI Components Used:
├── Card, CardBody
├── Badge
├── Button
├── Tabs
├── DifficultyBadge (StatusChip)
├── ProgressBar
└── Icons (Lucide)
```

---

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                   PRACTICE SCREEN STATE                      │
└─────────────────────────────────────────────────────────────┘

useState:
├── tab: 'problems' | 'mcqs' | 'history'
├── difficulty: 'all' | 'Easy' | 'Medium' | 'Hard'
├── submissions: Submission[]
└── problems: PracticeProblem[]

useEffect:
└── Load submissions from localStorage on mount

Derived State:
├── filtered: problems filtered by difficulty
└── solved: count of solved problems

─────────────────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────┐
│                   WORKSPACE SCREEN STATE                     │
└─────────────────────────────────────────────────────────────┘

useState:
├── isSubmitting: boolean
├── language: 'javascript' | 'python' | 'java' | 'cpp'
├── vmInstance: VM | null
└── isReady: boolean

Props from Router:
├── params.id: problem ID
└── params.mode: 'solve' | 'review'

useEffect (on language change):
└── Load StackBlitz with new language files

Functions:
├── handleRunCode()
├── handleRunTests()
├── handleReset()
├── handleSubmit()
└── handleLanguageChange()
```

---

## File Structure

```
project/
│
├── src/
│   ├── screens/
│   │   ├── PracticeScreen.tsx      ← Main practice screen
│   │   └── WorkspaceScreen.tsx     ← Coding workspace
│   │
│   ├── data/
│   │   ├── mock.ts                 ← 2 practice problems
│   │   └── problemConfigs.ts       ← Complete problem data
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Tabs.tsx
│   │   │   └── StatusChip.tsx
│   │   │
│   │   └── layout/
│   │       ├── AppShell.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── nav.tsx                 ← Navigation hook
│   │   ├── routes.ts
│   │   └── utils.ts
│   │
│   ├── types.ts                    ← TypeScript interfaces
│   └── index.css                   ← Global styles
│
├── Documentation/
│   ├── PRACTICE_LAB_README.md      ← User guide
│   ├── TESTING_CHECKLIST.md        ← QA tests
│   ├── BUTTON_FUNCTIONALITY_GUIDE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── ARCHITECTURE_DIAGRAM.md     ← This file
│
├── package.json                    ← Dependencies
└── vite.config.ts                  ← Build config
```

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      TECH STACK                              │
└─────────────────────────────────────────────────────────────┘

Frontend Framework:
├── React 18.3
└── TypeScript 5.5

Styling:
├── Tailwind CSS 3.4
└── Custom CSS (scrollbars, animations)

Editor:
├── StackBlitz SDK 1.11
└── Embedded VS Code

Icons:
└── Lucide React 0.344

Build Tool:
└── Vite 5.4

Storage:
└── Browser localStorage

State Management:
└── React useState/useEffect (no external library)

Routing:
└── Custom useNav hook
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
└─────────────────────────────────────────────────────────────┘

Layer 1: VS Code Settings
┌────────────────────────────────────────┐
│ .vscode/settings.json                  │
│ {                                      │
│   "editor.inlineSuggest.enabled": false│
│   "github.copilot.enable": false       │
│   "editor.quickSuggestions": false     │
│ }                                      │
└────────────────────────────────────────┘
         ↓
Layer 2: StackBlitz Configuration
┌────────────────────────────────────────┐
│ • Sandboxed environment                │
│ • Isolated from host system            │
│ • No external package installation     │
│ • Controlled file access               │
└────────────────────────────────────────┘
         ↓
Layer 3: UI Indicators
┌────────────────────────────────────────┐
│ "🔒 Strict Mode Enabled"               │
│ "AI auto-complete tools are disabled"  │
└────────────────────────────────────────┘
```

---

## Performance Optimization

```
Optimization Strategy:

1. Lazy Loading
   └── StackBlitz iframe loads only when workspace opens

2. State Management
   └── Minimal re-renders with proper useState placement

3. LocalStorage
   └── Efficient JSON serialization
   └── Only store necessary data

4. Code Splitting
   └── Separate routes for Practice and Workspace

5. Memoization
   └── Filtered problems calculated on-demand
   └── Stats computed from stored data

6. Debouncing
   └── Button clicks have built-in delays
   └── Prevents double-submissions
```

---

## Error Handling

```
Error Handling Strategy:

┌─────────────────────────────────────┐
│   User Action (e.g., Submit)       │
└─────────────────────────────────────┘
              ↓
      ┌───────────────┐
      │  try { ... }  │
      └───────────────┘
              │
      ┌───────┴────────┐
      │                │
  Success          Error
      │                │
      ↓                ↓
  Continue      ┌──────────────┐
  execution     │ catch(error) │
                └──────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
      console.error         Show user-friendly
      (for debugging)        alert message
            │                     │
            ↓                     ↓
      Developer sees      User sees:
      technical error     "❌ Action failed.
                          Please try again."
```

---

This architecture provides a **robust, scalable, and maintainable** Practice Lab system! 🏗️
