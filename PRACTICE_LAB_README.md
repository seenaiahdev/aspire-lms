# 🧪 Practice Lab - Complete Guide

## Overview
The Practice Lab is a full-featured coding environment built into the LMS that provides students with a VS Code-like experience for solving programming challenges.

## ✨ Key Features

### 1. **Multi-Language Support**
- JavaScript (Node.js)
- Python
- Java
- C++

Each language includes:
- Starter code templates
- Automated test runners
- Language-specific test cases

### 2. **Full VS Code Experience**
- **Real VS Code Editor** powered by StackBlitz
- **Terminal Access** for running code
- **File Explorer** to navigate files
- **Output Panel** for viewing results
- **Debugging Tools** available

### 3. **Automated Test Cases**
Each problem includes:
- Multiple test cases with expected outputs
- Automated test runners
- Pass/Fail feedback
- Score calculation

### 4. **Submission System**
- **LocalStorage persistence** - saves submissions automatically
- **Submission history** - review past attempts
- **Code preview** - see submitted code
- **Timestamp tracking** - when you submitted
- **Language tracking** - which language you used

### 5. **Security Features**
- ❌ AI Copilot disabled
- ❌ IntelliSense suggestions disabled
- ❌ Auto-complete disabled
- ✅ Manual coding only
- ✅ Fair assessment environment

## 📁 File Structure

```
src/
├── screens/
│   ├── PracticeScreen.tsx       # Main practice lab screen
│   └── WorkspaceScreen.tsx      # Coding workspace
├── data/
│   ├── mock.ts                  # Practice problems data
│   └── problemConfigs.ts        # Detailed problem configurations
└── types.ts                     # TypeScript interfaces
```

## 🎯 Available Problems

### Problem 1: Two Sum
- **Difficulty:** Easy
- **Category:** Arrays
- **Points:** 10 XP
- **Test Cases:** 5
- **Languages:** JavaScript, Python, Java, C++

**Description:** Given an array of integers and a target, return indices of two numbers that sum to target.

### Problem 2: Hello World
- **Difficulty:** Easy
- **Category:** Basics
- **Points:** 5 XP
- **Test Cases:** 1
- **Languages:** JavaScript, Python, Java, C++

**Description:** Create a function that returns "Hello World".

## 🚀 How to Use

### For Students:

1. **Browse Problems**
   - Navigate to Practice Lab
   - View statistics (solved, streak, points, success rate)
   - Filter by difficulty (Easy, Medium, Hard)

2. **Select a Problem**
   - Click "Solve" on any problem
   - Or click "Solve Now" on the Daily Challenge

3. **Choose Language**
   - Select from JavaScript, Python, Java, or C++
   - Switch languages anytime (code will reset)

4. **Write Code**
   - Use the full VS Code editor
   - Access terminal, file explorer, debugging tools
   - Write your solution in the starter code

5. **Run Tests**
   - Click "Run Tests" button
   - Terminal will execute test cases
   - See pass/fail results with scores

6. **Submit**
   - Click "Submit" when ready
   - Code is saved to localStorage
   - Problem marked as solved
   - XP points awarded

7. **Review History**
   - Go to "Practice History" tab
   - See all past submissions
   - Click "Review Code" to view submitted code
   - Check timestamps and languages used

## 🔧 Technical Details

### StackBlitz Integration
The workspace uses **StackBlitz SDK** to embed a full VS Code environment:

```typescript
sdk.embedProject('stackblitz-container', {
  title: problemTitle,
  template: 'node' | 'python',
  files: {
    'solution.js': starterCode,
    'test.js': testRunner,
    'package.json': {...},
    '.vscode/settings.json': {...}
  }
}, {
  openFile: 'solution.js',
  view: 'default',
  theme: 'dark',
  terminalHeight: 50
})
```

### LocalStorage Schema

**Submission Data:**
```json
{
  "problemId": "pp1",
  "language": "javascript",
  "code": "function twoSum(nums, target) {...}",
  "timestamp": "2026-08-05T10:30:00.000Z",
  "projectUrl": "https://stackblitz.com/edit/..."
}
```

**Storage Key:** `submission_${problemId}`

### Test Runner Format

**JavaScript Example:**
```javascript
const testCases = [
  { input: [[2,7,11,15], 9], expected: [0,1], desc: 'Example 1' },
  ...
];

testCases.forEach((test) => {
  const result = solution(...test.input);
  const isPassed = JSON.stringify(result) === JSON.stringify(test.expected);
  console.log(isPassed ? '✓ PASSED' : '✗ FAILED');
});
```

## 🎨 UI Components

### Practice Screen Features:
- **Stats Cards** - Solved, Streak, Points, Success Rate
- **Daily Challenge Banner** - Featured problem with bonus XP
- **Problem List** - Filterable by difficulty
- **Tabs** - Problems, MCQs, Practice History

### Workspace Screen Features:
- **Top Nav** - Back button, problem title, language selector, actions
- **Left Panel** - Problem description, examples, constraints, test cases
- **Right Panel** - Full VS Code editor with StackBlitz
- **Language Selector** - Switch between JS, Python, Java, C++
- **Action Buttons** - Run Tests, Reset, Submit

## 📊 Scoring System

- **Easy Problems:** 5-10 XP
- **Medium Problems:** 20-30 XP
- **Hard Problems:** 40-60 XP

Success rate calculated as: `(solved / total) * 100%`

## 🔐 Security & Fairness

### VS Code Settings (Locked):
```json
{
  "editor.inlineSuggest.enabled": false,
  "github.copilot.enable": false,
  "editor.quickSuggestions": false
}
```

These settings ensure:
- No AI assistance during coding
- Fair assessment environment
- Students learn by doing, not copying

## 🎓 Best Practices for Students

1. **Read Carefully** - Understand the problem before coding
2. **Check Examples** - Learn from provided examples
3. **Test Locally** - Use "Run Tests" before submitting
4. **Review History** - Learn from past submissions
5. **Try Different Languages** - Practice in multiple languages

## 🛠️ Developer Guide

### Adding New Problems:

1. **Update mock.ts:**
```typescript
export const practiceProblems: PracticeProblem[] = [
  {
    id: 'pp3',
    title: 'New Problem',
    difficulty: 'Medium',
    category: 'Algorithms',
    solved: false,
    attempts: 0,
    successRate: 0,
    points: 25
  },
];
```

2. **Add to problemConfigs.ts:**
```typescript
export const problemConfigs = {
  pp3: {
    id: 'pp3',
    title: 'New Problem',
    description: '...',
    examples: [...],
    constraints: [...],
    testCases: [...],
    languages: {
      javascript: {
        starterCode: '...',
        solution: '...',
        testRunner: '...'
      }
    }
  }
};
```

### Customizing UI:
- Modify `PracticeScreen.tsx` for problem list UI
- Modify `WorkspaceScreen.tsx` for coding environment
- Update `index.css` for styling

## 📦 Dependencies

```json
{
  "@stackblitz/sdk": "^1.9.0",
  "react": "^18.2.0",
  "lucide-react": "^0.263.1"
}
```

## 🐛 Troubleshooting

### StackBlitz not loading?
- Check internet connection
- Verify StackBlitz SDK is installed
- Check browser console for errors

### Tests not running?
- Ensure terminal is open
- Check file paths in test runner
- Verify language runtime is available

### Submissions not saving?
- Check browser localStorage permissions
- Verify localStorage is not full
- Check console for errors

## 🚧 Future Enhancements

- [ ] MCQ practice mode
- [ ] Real-time leaderboard
- [ ] Code complexity analysis
- [ ] Hints system
- [ ] Video solutions
- [ ] Discussion forum per problem
- [ ] Code comparison with optimal solution
- [ ] Time/space complexity tracking

## 📝 License
Part of AspireNext LMS - Educational Platform

---

**Built with ❤️ using React, TypeScript, and StackBlitz**
