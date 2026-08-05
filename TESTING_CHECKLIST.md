# 🧪 Practice Lab - Testing Checklist

## Complete Functionality Test Guide

### ✅ Pre-Testing Setup
1. Start the development server: `npm run dev`
2. Navigate to Practice Lab section
3. Open browser console (F12) to see any errors

---

## 🎯 TEST 1: Problem Opening & Closing

### Test 1.1: Open Problem from List
- [ ] Click on "Hello World" problem
- [ ] **Expected:** Navigate to WorkspaceScreen
- [ ] **Check:** URL changes to `/workspace?id=pp2&mode=solve`
- [ ] **Check:** Problem title shows "Hello World" in top nav
- [ ] **Check:** Left panel shows problem description

### Test 1.2: Back Button (Close Problem)
- [ ] Click the back arrow (←) button in top nav
- [ ] **Expected:** Navigate back to PracticeScreen
- [ ] **Check:** URL changes back to `/practice`
- [ ] **Check:** Problem list is visible
- [ ] **Check:** Stats dashboard shows correct data

### Test 1.3: Open from Daily Challenge
- [ ] Click "Solve Now" on Daily Challenge banner
- [ ] **Expected:** Navigate to workspace
- [ ] **Check:** Problem opens correctly

---

## 🌐 TEST 2: Language Switching

### Test 2.1: Switch from JavaScript to Python
**Starting Point:** Open "Hello World" problem
- [ ] Click "Python" in language selector
- [ ] **Expected:** Confirmation dialog appears
- [ ] Click "OK" to confirm
- [ ] **Check:** Editor reloads with Python starter code
- [ ] **Check:** File shows `solution.py` in editor
- [ ] **Check:** Code changes to Python syntax

### Test 2.2: Switch from Python to Java
- [ ] Click "Java" in language selector
- [ ] Confirm the switch
- [ ] **Check:** Editor shows `Solution.java`
- [ ] **Check:** Code uses Java class syntax

### Test 2.3: Switch from Java to C++
- [ ] Click "C++" in language selector
- [ ] Confirm the switch
- [ ] **Check:** Editor shows `solution.cpp`
- [ ] **Check:** Code uses C++ syntax with `#include`

### Test 2.4: Switch Back to JavaScript
- [ ] Click "JavaScript" in language selector
- [ ] Confirm the switch
- [ ] **Check:** Editor shows `solution.js`
- [ ] **Check:** Code back to JavaScript function syntax

### Test 2.5: Cancel Language Switch
- [ ] Click different language
- [ ] Click "Cancel" on confirmation
- [ ] **Check:** Language remains unchanged
- [ ] **Check:** Code is not reset

---

## ▶️ TEST 3: Run Code Button

### Test 3.1: Run JavaScript Code
**Starting Point:** "Hello World" in JavaScript
- [ ] Write solution: `return "Hello World";`
- [ ] Click "Run Code" button
- [ ] **Expected:** Terminal opens at bottom
- [ ] **Check:** Command executes: `node solution.js`
- [ ] **Check:** No errors appear (might not show output without console.log)

### Test 3.2: Run Code with Console Log
- [ ] Add `console.log(helloWorld());` at bottom of file
- [ ] Click "Run Code"
- [ ] **Check:** Terminal shows "Hello World"

### Test 3.3: Run Code Before Loading
- [ ] Refresh page, immediately click "Run Code"
- [ ] **Expected:** Alert shows "⚠️ Editor is still loading..."
- [ ] Wait for editor to load, try again
- [ ] **Check:** Works correctly after loading

---

## 🧪 TEST 4: Run Tests Button

### Test 4.1: Run Tests - Hello World (JavaScript)
**Starting Point:** "Hello World" in JavaScript with correct solution
- [ ] Write solution: `return "Hello World";`
- [ ] Click "Run Tests" button
- [ ] **Expected:** Terminal opens
- [ ] **Check:** Command executes: `node test.js`
- [ ] **Check:** Output shows test results:
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

### Test 4.2: Run Tests - Incorrect Solution
- [ ] Change solution to: `return "Wrong";`
- [ ] Click "Run Tests"
- [ ] **Check:** Terminal shows:
```
✗ Test 1: Basic test: Return "Hello World"
  Expected: "Hello World"
  Got: "Wrong"

📊 Results: 0 passed, 1 failed
💯 Score: 0%
```

### Test 4.3: Run Tests - Two Sum Problem
- [ ] Navigate back, open "Two Sum"
- [ ] Write correct solution or use starter code
- [ ] Click "Run Tests"
- [ ] **Check:** All 5 test cases run
- [ ] **Check:** See pass/fail for each test
- [ ] **Check:** Final score shown

### Test 4.4: Run Tests in Python
- [ ] Switch to Python
- [ ] Write solution in Python syntax
- [ ] Click "Run Tests"
- [ ] **Check:** Command: `python test.py`
- [ ] **Check:** Test results appear in terminal

---

## 🔄 TEST 5: Reset Button

### Test 5.1: Reset After Writing Code
- [ ] Write some code in the editor
- [ ] Click "Reset" button
- [ ] **Expected:** Confirmation dialog appears
- [ ] Click "OK"
- [ ] **Check:** Code returns to starter template
- [ ] **Check:** All changes are lost

### Test 5.2: Cancel Reset
- [ ] Write some code
- [ ] Click "Reset"
- [ ] Click "Cancel" on confirmation
- [ ] **Check:** Code remains unchanged

---

## 📤 TEST 6: Submit Button

### Test 6.1: Submit Solution
**Starting Point:** "Hello World" with correct solution
- [ ] Write solution: `return "Hello World";`
- [ ] Click "Submit" button
- [ ] **Expected:** Confirmation dialog appears
- [ ] Click "OK" to confirm
- [ ] **Expected:** Loading state shows on button
- [ ] **Check:** Success alert appears after ~1.5 seconds:
```
✅ Submission Successful!

Problem: Hello World
Language: JavaScript
Points Earned: 5 XP

You can review your submission anytime...
```
- [ ] Click "OK" on alert
- [ ] **Check:** Navigate back to Practice screen
- [ ] **Check:** Problem shows green checkmark (solved)

### Test 6.2: Check LocalStorage
- [ ] Open browser DevTools → Application → Local Storage
- [ ] Find key: `submission_pp2`
- [ ] **Check:** Value contains:
  - `problemId: "pp2"`
  - `language: "javascript"`
  - `code: "function helloWorld()..."`
  - `timestamp: "2026-08-05T..."`
  - `projectUrl: "https://stackblitz.com/..."`

### Test 6.3: Submit Without Code
- [ ] Delete all code from editor
- [ ] Click "Submit"
- [ ] Confirm submission
- [ ] **Check:** Submission still works (saves empty/incomplete code)

### Test 6.4: Submit Before Loading
- [ ] Refresh page, immediately click "Submit"
- [ ] **Expected:** Alert shows "⚠️ Editor is still loading..."

---

## 📜 TEST 7: Practice History Tab

### Test 7.1: View Submission History
**Starting Point:** After submitting at least one problem
- [ ] Navigate to "Practice History" tab
- [ ] **Check:** Submitted problem appears in list
- [ ] **Check:** Shows:
  - Problem title
  - Language used
  - Time ago (e.g., "Just now", "2 hours ago")
  - Green checkmark icon
  - "Review Code" button

### Test 7.2: Review Submitted Code
- [ ] Click "Review Code" button on a submission
- [ ] **Expected:** Navigate to workspace in review mode
- [ ] **Check:** Problem opens
- [ ] **Check:** Shows "(Review Mode)" in top nav
- [ ] **Check:** Action buttons (Run Tests, Submit) are hidden
- [ ] **Check:** Back button still works

### Test 7.3: Code Preview in History
- [ ] Check code preview in history card
- [ ] **Check:** First 10 lines of code shown
- [ ] **Check:** Shows "..." if code is longer
- [ ] **Check:** Syntax highlighting (dark background)
- [ ] **Check:** File name shown (e.g., "solution.js")
- [ ] **Check:** "Submitted" badge shown

### Test 7.4: Empty History State
- [ ] Clear localStorage: `localStorage.clear()`
- [ ] Refresh page, go to "Practice History"
- [ ] **Check:** Empty state appears:
  - Clock icon
  - "No Submissions Yet"
  - "Browse Problems" button
- [ ] Click "Browse Problems"
- [ ] **Check:** Switches to "Coding Problems" tab

### Test 7.5: Multiple Submissions
- [ ] Submit both problems (Hello World + Two Sum)
- [ ] Go to Practice History
- [ ] **Check:** Both submissions appear
- [ ] **Check:** Sorted by most recent first
- [ ] **Check:** Different languages show correctly

---

## 📊 TEST 8: Stats Dashboard

### Test 8.1: Solved Count
- [ ] Note current solved count
- [ ] Submit a new problem
- [ ] Return to Practice screen
- [ ] **Check:** Solved count increases
- [ ] **Check:** Format: "X/2" (e.g., "1/2")

### Test 8.2: Total Points
- [ ] Check points before submission
- [ ] Submit "Hello World" (5 XP)
- [ ] **Check:** Points increase by 5
- [ ] Submit "Two Sum" (10 XP)
- [ ] **Check:** Points increase by 10
- [ ] **Check:** Total shows 15 XP

### Test 8.3: Success Rate
- [ ] With 0 solved: shows "0%"
- [ ] With 1/2 solved: shows "50%"
- [ ] With 2/2 solved: shows "100%"

---

## 🎨 TEST 9: UI/UX Elements

### Test 9.1: Loading States
- [ ] Refresh workspace page
- [ ] **Check:** Loading message appears:
  - "Loading JavaScript Environment..."
  - Spinning refresh icon
- [ ] Wait for load
- [ ] **Check:** Loading disappears
- [ ] **Check:** Buttons become enabled

### Test 9.2: Button States
- [ ] Before editor loads:
  - **Check:** All action buttons disabled (gray)
- [ ] After editor loads:
  - **Check:** All buttons enabled (colored)
- [ ] During submission:
  - **Check:** Submit button shows spinner
  - **Check:** Submit button text changes to loading state

### Test 9.3: Language Selector Active State
- [ ] Check language selector
- [ ] **Check:** Active language has blue background
- [ ] **Check:** Inactive languages are gray
- [ ] **Check:** Hover shows lighter gray

### Test 9.4: Problem List Hover
- [ ] Hover over problem cards
- [ ] **Check:** Background changes to light gray
- [ ] **Check:** "Solve" or "Review" button appears
- [ ] **Check:** Smooth transition animation

---

## 🔒 TEST 10: Security Features

### Test 10.1: AI Copilot Disabled
- [ ] Open VS Code editor in workspace
- [ ] Try to trigger Copilot (if installed)
- [ ] **Check:** No AI suggestions appear
- [ ] **Check:** Settings notice shows "Strict Mode Enabled"

### Test 10.2: Auto-Complete Disabled
- [ ] Start typing code
- [ ] **Check:** No IntelliSense popups
- [ ] **Check:** Only basic syntax highlighting

---

## 🐛 TEST 11: Error Handling

### Test 11.1: Invalid Code Syntax
- [ ] Write invalid JavaScript: `function test( { return }`
- [ ] Click "Run Tests"
- [ ] **Check:** Terminal shows syntax error
- [ ] **Check:** No app crash

### Test 11.2: Missing Problem Config
- [ ] Manually navigate to: `/workspace?id=invalid`
- [ ] **Expected:** "Problem Not Found" screen
- [ ] **Check:** "Back to Practice" button works

### Test 11.3: Network Issues (StackBlitz)
- [ ] Disable internet
- [ ] Try to open workspace
- [ ] **Check:** Loading state persists or error shown
- [ ] **Check:** App doesn't crash

---

## 📱 TEST 12: Responsive Design

### Test 12.1: Desktop (1920x1080)
- [ ] View Practice screen
- [ ] **Check:** All 4 stat cards in one row
- [ ] **Check:** Problem list readable
- [ ] Open workspace
- [ ] **Check:** Left panel (420px) + Editor visible
- [ ] **Check:** Terminal accessible

### Test 12.2: Laptop (1366x768)
- [ ] **Check:** Layout adjusts properly
- [ ] **Check:** Left panel might be narrower
- [ ] **Check:** All buttons visible

### Test 12.3: Tablet (iPad - 1024x768)
- [ ] **Check:** Stats in 2x2 grid
- [ ] **Check:** Language selector wraps if needed
- [ ] **Check:** Editor still functional

---

## ✨ TEST 13: Edge Cases

### Test 13.1: Rapid Button Clicks
- [ ] Click "Run Tests" multiple times rapidly
- [ ] **Check:** Terminal handles multiple executions
- [ ] **Check:** No crashes

### Test 13.2: Long Code Submission
- [ ] Write 500+ lines of code
- [ ] Submit
- [ ] **Check:** Saves to localStorage successfully
- [ ] **Check:** History shows first 10 lines only

### Test 13.3: Special Characters in Code
- [ ] Write code with emojis, unicode: `// 🎉 Hello!`
- [ ] Submit
- [ ] Review in history
- [ ] **Check:** Characters preserved correctly

### Test 13.4: Multiple Browser Tabs
- [ ] Open same problem in 2 tabs
- [ ] Submit in tab 1
- [ ] Refresh tab 2
- [ ] **Check:** Problem shows as solved in tab 2

---

## 🎯 TEST 14: Complete User Journey

### Full Workflow Test:
1. [ ] Start at Practice screen
2. [ ] View stats (all at 0)
3. [ ] Click on "Hello World"
4. [ ] Select Python language
5. [ ] Write solution
6. [ ] Click "Run Code" - see output
7. [ ] Click "Run Tests" - see test results
8. [ ] Fix any errors
9. [ ] Click "Submit"
10. [ ] Return to Practice screen
11. [ ] See updated stats (1/2 solved, 5 XP, 50%)
12. [ ] Click on "Two Sum"
13. [ ] Keep JavaScript
14. [ ] Write solution
15. [ ] Run tests
16. [ ] Submit
17. [ ] Check stats (2/2 solved, 15 XP, 100%)
18. [ ] Go to Practice History
19. [ ] See both submissions
20. [ ] Review "Two Sum" code
21. [ ] Navigate back
22. [ ] **Check:** Everything works smoothly

---

## 📋 Summary Checklist

### Critical Features:
- [ ] ✅ Problem opening works
- [ ] ✅ Problem closing (back button) works
- [ ] ✅ Language switching works (all 4 languages)
- [ ] ✅ Run Code button executes code
- [ ] ✅ Run Tests button executes tests
- [ ] ✅ Test results appear in terminal
- [ ] ✅ Reset button restores starter code
- [ ] ✅ Submit button saves to localStorage
- [ ] ✅ Practice History shows submissions
- [ ] ✅ Review Code opens in review mode
- [ ] ✅ Stats update after submissions
- [ ] ✅ All confirmations work
- [ ] ✅ Loading states work
- [ ] ✅ Error handling works

### Optional Enhancements (Future):
- [ ] MCQ Practice tab implementation
- [ ] Real-time collaboration
- [ ] Code hints system
- [ ] Video solutions
- [ ] Leaderboard integration

---

## 🚨 Known Issues to Check:

1. **StackBlitz Loading:**
   - Sometimes takes 5-10 seconds to load
   - Ensure buttons are disabled during loading

2. **Terminal Output:**
   - First command might not show output
   - Click "Run Tests" twice if needed

3. **LocalStorage Limits:**
   - Browser has ~5-10MB limit
   - Large code submissions might hit limits

4. **Language Switching:**
   - Always prompts confirmation (by design)
   - Code is reset (expected behavior)

---

## ✅ All Tests Passed?

If all tests pass, the Practice Lab is **production-ready**! 🎉

If any test fails:
1. Note the test number
2. Check browser console for errors
3. Verify network tab for failed requests
4. Check localStorage contents
5. Review code changes needed

---

**Last Updated:** August 5, 2026
**Tester:** _______________
**Status:** [ ] Pass [ ] Fail [ ] Needs Review
