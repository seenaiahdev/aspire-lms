# Aspire LMS - Bug Reports

## BUG-001
**Title:** Login accepts any 10-digit number without backend validation
**Severity:** Critical
**Priority:** P1
**Environment:** Production (Vercel) / All Environments
**Browser:** All
**Viewport:** All
**Page:** Login Screen
**URL:** `/login`
**Preconditions:** User is on the login page.
**Steps to Reproduce:**
1. Open login page.
2. Enter a fake 10-digit number (e.g., 0000000000).
3. Click Login.
**Expected Result:** System should check if the number exists in the database and return an error if unregistered.
**Actual Result:** System blindly accepts the number and proceeds to the OTP screen after a 600ms mock delay.
**Frequency:** 100%
**Possible Root Cause:** The application is completely frontend-only. `LoginScreen.tsx` lacks API integration for authentication.
**Recommended Fix:** Implement backend authentication API and replace the `setTimeout` mock with an actual fetch request.

---

## BUG-002
**Title:** Any 4-digit OTP successfully logs the user in
**Severity:** Critical
**Priority:** P1
**Environment:** Production (Vercel)
**Browser:** All
**Viewport:** All
**Page:** Login Screen
**URL:** `/login`
**Preconditions:** User has reached the OTP verification step.
**Steps to Reproduce:**
1. Enter any 4 digits into the OTP fields.
2. Click Verify.
**Expected Result:** The OTP should be validated against the server. Incorrect OTPs should be rejected.
**Actual Result:** Any 4 digits are accepted, and the user is redirected to the Dashboard via `login()` context method which sets a `localStorage` flag.
**Frequency:** 100%
**Possible Root Cause:** Missing backend integration for OTP validation.
**Recommended Fix:** Integrate with an authentication service (e.g., Supabase Auth or custom API) to verify the OTP.

---

## BUG-003
**Title:** Course Progress is not persisted across sessions/devices
**Severity:** High
**Priority:** P2
**Environment:** Production (Vercel)
**Browser:** All
**Page:** Course / Lesson Screens
**Preconditions:** User completes a lesson.
**Steps to Reproduce:**
1. Complete a lesson or quiz.
2. Clear localStorage or open the app in an Incognito window.
3. Log in again.
**Expected Result:** Course progress should be saved to the user's profile and restored.
**Actual Result:** Progress is lost because it relies entirely on static mock data and local browser state.
**Frequency:** 100%
**Possible Root Cause:** Frontend-only architecture.
**Recommended Fix:** Implement a database backend to track user-specific progress metrics.

---

## BUG-004
**Title:** Mock Data causes identical experience for all 120+ synthetic users
**Severity:** Medium
**Priority:** P3
**Environment:** Production (Vercel)
**Page:** Dashboard / Profile
**Steps to Reproduce:**
1. Log in with different synthetic phone numbers.
2. Observe the profile name, course list, and progress.
**Expected Result:** Each user should see their specific enrolled courses and personal details.
**Actual Result:** Every user sees the exact same hardcoded mock data.
**Frequency:** 100%
**Possible Root Cause:** The app uses `src/data/mock.ts` for all data rendering instead of fetching user-specific data from an API.
**Recommended Fix:** Replace mock data with dynamic API calls based on the authenticated user's session token.
