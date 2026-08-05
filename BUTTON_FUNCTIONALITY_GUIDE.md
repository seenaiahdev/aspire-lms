# 🎮 Practice Lab - Button Functionality Guide

## Quick Reference for All Buttons

---

## 📍 **Practice Screen Buttons**

### 1. **"Solve Now" Button** (Daily Challenge Banner)
**Location:** Top banner with gradient background
**What it does:**
- Opens the daily challenge problem in workspace
- Navigates to WorkspaceScreen with special problem ID
**Click behavior:** Immediate navigation

### 2. **"Solve" Button** (On Problem Cards)
**Location:** Each problem card (appears on hover)
**What it does:**
- Opens selected problem in workspace
- Sets mode to "solve"
**Click behavior:** Navigate to `/workspace?id=pp1&mode=solve`

### 3. **"Review" Button** (On Solved Problems)
**Location:** Problem cards that are marked as solved
**What it does:**
- Opens problem in read-only review mode
- Hides action buttons (Run Tests, Submit)
**Click behavior:** Navigate to `/workspace?id=pp1&mode=review`

### 4. **"Browse Problems" Button** (Empty History State)
**Location:** Practice History tab when no submissions exist
**What it does:**
- Switches to "Coding Problems" tab
**Click behavior:** Changes active tab

### 5. **"Review Code" Button** (Practice History)
**Location:** Each submission card in Practice History tab
**What it does:**
- Opens the submitted problem with original code
- Opens in review mode
**Click behavior:** Navigate to workspace with stored code

---

## 📍 **Workspace Screen Buttons**

### Top Navigation Bar:

#### 1. **← Back Button**
**Location:** Left side of top nav
**Icon:** Arrow left
**What it does:**
- Closes current problem
- Returns to Practice screen
- Preserves all state (stats, history)
**Click behavior:** 
```javascript
navigate('practice')
```
**No confirmation** - immediate navigation

---

#### 2. **Language Selector Buttons**
**Location:** Center of top nav (4 buttons in a row)
**Options:** JavaScript | Python | Java | C++

**What it does:**
- Switches coding language
- Reloads editor with new starter code
- Shows confirmation dialog first

**Click behavior:**
```
Step 1: Show confirmation dialog
"🔄 Switch to Python?
⚠️ Your current code will be reset to the starter template.
Make sure to save any important work before switching."

Step 2: If user clicks OK
- Set isReady to false (show loading)
- Change language state
- Trigger useEffect to reload StackBlitz
- Load new starter code for selected language

Step 3: If user clicks Cancel
- Keep current language
- No changes made
```

**Active State:**
- Blue background = currently selected
- Gray background = available options
- Hover effect = lighter gray

---

#### 3. **"Run Code" Button** 🆕
**Location:** Right side of top nav
**Icon:** Terminal icon
**Color:** Dark gray (slate-700)
**What it does:**
- Executes your solution file in terminal
- Shows console output
- Good for testing with console.log()

**Click behavior:**
```javascript
// Check if editor is ready
if (!vmInstance) {
  alert('⚠️ Editor is still loading. Please wait...');
  return;
}

// Open terminal
await vmInstance.editor.openTerminal();

// Run command based on language
JavaScript: terminal.run('node solution.js')
Python:     terminal.run('python solution.py')
Java:       terminal.run('javac Solution.java && java Solution')
C++:        terminal.run('g++ solution.cpp -o solution && ./solution')
```

**Expected Output:**
- Your console.log() statements
- Any runtime errors
- Program output

**Example:**
```javascript
// If you have:
console.log(helloWorld());

// Terminal shows:
Hello World
```

---

#### 4. **"Run Tests" Button**
**Location:** Right side of top nav
**Icon:** Play icon
**Color:** Green (emerald-600)
**What it does:**
- Executes test file with all test cases
- Shows pass/fail results
- Calculates score

**Click behavior:**
```javascript
// Check if editor is ready
if (!vmInstance) {
  alert('⚠️ Editor is still loading. Please wait...');
  return;
}

// Open terminal
await vmInstance.editor.openTerminal();

// Run test command based on language
JavaScript: terminal.run('node test.js')
Python:     terminal.run('python test.py')
Java:       terminal.run('javac Solution.java TestRunner.java && java TestRunner')
C++:        terminal.run('g++ test.cpp -o test && ./test')
```

**Expected Output:**
```
🧪 Running Hello World Test Cases...
==================================================
✓ Test 1: Basic test: Return "Hello World"
  Expected: "Hello World"
  Got: "Hello World" ✓

==================================================
📊 Results: 1 passed, 0 failed
💯 Score: 100%

🎉 Perfect! You got it right!
```

**Use this when:**
- You want to validate your solution
- Check if you pass all test cases
- See which tests are failing

---

#### 5. **"Reset" Button**
**Location:** Right side of top nav
**Icon:** Rotate counter-clockwise icon
**Color:** Gray (secondary)
**What it does:**
- Restores original starter code
- Loses all your changes
- Shows confirmation first

**Click behavior:**
```
Step 1: Show confirmation
"⚠️ Are you sure you want to reset your code?

This will restore the starter code and cannot be undone."

Step 2: If user clicks OK
- Temporarily switch language to force reload
- Switch back to original language
- Editor reloads with fresh starter code
- All changes lost

Step 3: If user clicks Cancel
- No changes made
- Your code remains intact
```

**Use this when:**
- You want to start over
- Your code is too messy
- You want fresh starter template

**⚠️ Warning:** Cannot be undone!

---

#### 6. **"Submit" Button**
**Location:** Right side of top nav (rightmost)
**Icon:** Check circle icon
**Color:** Blue (primary-600) with glow effect
**What it does:**
- Saves your code to localStorage
- Marks problem as solved
- Awards XP points
- Adds to Practice History

**Click behavior:**
```javascript
Step 1: Check if editor is ready
if (!vmInstance) {
  alert('⚠️ Editor is still loading...');
  return;
}

Step 2: Show confirmation
"🚀 Submit your solution?
Make sure you have tested your code before submitting."

Step 3: If user clicks OK
- Show loading spinner on button
- Get current code from editor via getFsSnapshot()
- Create submission object:
  {
    problemId: "pp2",
    language: "javascript",
    code: "function helloWorld() {...}",
    timestamp: "2026-08-05T10:30:00.000Z",
    projectUrl: "https://stackblitz.com/edit/..."
  }
- Save to localStorage: `submission_${problemId}`
- Mark problem as solved
- Update stats

Step 4: Show success message
"✅ Submission Successful!

Problem: Hello World
Language: JavaScript  
Points Earned: 5 XP

You can review your submission anytime from the Practice History tab."

Step 5: Navigate back to Practice screen
- Stats updated (solved count, points, success rate)
- Problem shows green checkmark
```

**Loading States:**
- Before click: Blue with "Submit" text
- During submission: Shows spinner, text changes
- After success: Navigate away (1.5s delay)

**Use this when:**
- You've tested your code
- All tests pass
- You're confident in your solution

---

## 🎯 **Button Combinations & Workflows**

### Workflow 1: First Time Solving
```
1. Click "Solve" → Opens workspace
2. Write solution
3. Click "Run Code" → See output
4. Click "Run Tests" → Check if pass
5. Fix errors if needed
6. Click "Run Tests" again
7. Click "Submit" → Save and earn XP
```

### Workflow 2: Trying Different Languages
```
1. Open problem in JavaScript
2. Click "Run Tests" → See results
3. Click "Python" → Switch language
4. Write Python solution
5. Click "Run Tests" → Compare results
6. Click "Submit" → Save in Python
```

### Workflow 3: Reset and Retry
```
1. Write messy code
2. Click "Reset" → Start fresh
3. Write clean solution
4. Click "Run Tests" → Validate
5. Click "Submit" → Save
```

### Workflow 4: Review Past Submission
```
1. Go to Practice History tab
2. Click "Review Code" → Open workspace
3. See your old code (read-only)
4. Click "← Back" → Return to practice
```

---

## ⚠️ **Button States & Conditions**

### Disabled States:
All action buttons (Run Code, Run Tests, Reset, Submit) are **disabled** when:
- Editor is still loading (isReady = false)
- Shows gray color
- Cursor shows "not-allowed"

### Enabled States:
Buttons become **enabled** when:
- Editor fully loaded (isReady = true)
- StackBlitz iframe ready
- vmInstance exists

### Hidden States:
Some buttons are **hidden** in:
- **Review Mode:** Run Code, Run Tests, Reset, Submit all hidden
- **Only visible:** Back button and language selector

---

## 🔧 **Technical Details**

### Button Click Flow:
```javascript
User clicks button
    ↓
Check if editor ready (vmInstance exists)
    ↓
Show confirmation dialog (if needed)
    ↓
Execute main action
    ↓
Show loading state (if needed)
    ↓
Complete action
    ↓
Show success/error message
    ↓
Navigate or update UI
```

### Error Handling:
Every button has try-catch blocks:
```javascript
try {
  // Execute action
} catch (error) {
  console.error('Failed:', error);
  alert('❌ Action failed. Please try again.');
}
```

---

## 📱 **Mobile/Responsive Behavior**

On smaller screens:
- Language buttons might stack
- Action buttons might wrap to next row
- Icons remain visible
- Text might be abbreviated

---

## 🎨 **Visual Feedback**

### Hover Effects:
- **Back button:** Gray → Darker gray
- **Language buttons:** Gray → Light gray (inactive) | Blue (active)
- **Run Code:** Dark gray → Darker
- **Run Tests:** Green → Darker green  
- **Reset:** Gray → Darker gray
- **Submit:** Blue → Darker blue with glow

### Active/Loading States:
- **Submit (loading):** Shows spinner, text hidden
- **Language (active):** Blue background, white text
- **Disabled:** Gray, opacity reduced, no hover

---

## 💡 **Best Practices**

### For Students:
1. **Always test before submitting** - Use "Run Tests" first
2. **Save important code** - Copy to clipboard before "Reset"
3. **Try different languages** - Great for learning
4. **Use "Run Code"** - Add console.log() to debug

### For Developers:
1. **Check isReady** - Before executing any action
2. **Show confirmations** - For destructive actions (Reset, Submit)
3. **Handle errors** - Always have try-catch
4. **Provide feedback** - Loading states, success messages

---

## 🐛 **Troubleshooting**

### Button not working?
1. Check if editor is fully loaded
2. Open browser console (F12)
3. Look for error messages
4. Check if vmInstance exists

### Terminal not showing output?
1. Click button again
2. Check if terminal is open at bottom
3. Scroll down in terminal
4. Command might take time to execute

### Submit not saving?
1. Check localStorage permissions
2. Check console for errors
3. Verify getFsSnapshot() works
4. Try clearing localStorage and retry

---

## ✅ **Summary**

| Button | Action | Confirmation | Navigation | Side Effects |
|--------|--------|--------------|------------|--------------|
| Back | Close problem | No | Yes (→ Practice) | None |
| Language | Switch lang | Yes | No | Resets code |
| Run Code | Execute solution | No | No | Shows output |
| Run Tests | Run test cases | No | No | Shows results |
| Reset | Restore starter | Yes | No | Loses changes |
| Submit | Save solution | Yes | Yes (→ Practice) | Updates stats, localStorage |

---

**Remember:** Test your code before submitting! 🎯
