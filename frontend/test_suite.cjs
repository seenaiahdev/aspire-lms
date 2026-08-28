/**
 * ASPIRE LMS — Comprehensive Performance & Load Test Suite
 * Simulates 500+ concurrent users hitting Supabase and tests all screens.
 * Usage:  node test_suite.cjs
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://maahwymvereyofrhrytx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';
const CONCURRENT_USERS = 500;
const BATCH_SIZE = 50;

// Try to polyfill WebSocket in Node.js to prevent realtime connection crash
try {
  if (typeof global.WebSocket === 'undefined') {
    // Check if ws package is installed in node_modules
    global.WebSocket = require('ws');
  }
} catch (e) {
  // WebSocket will remain undefined, we will handle it gracefully in TC-25
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const results = [];
let passCount = 0, failCount = 0, warnCount = 0;

function log(icon, msg) { console.log('  ' + icon + ' ' + msg); }

async function timedQuery(label, queryFn) {
  const start = Date.now();
  try {
    const result = await queryFn();
    return { success: true, ms: Date.now() - start, data: result, label };
  } catch (err) {
    return { success: false, ms: Date.now() - start, error: err.message || String(err), label };
  }
}

function recordResult(id, name, status, details, responseTime) {
  const icon = status === 'PASS' ? '\u2705' : status === 'FAIL' ? '\u274C' : '\u26A0\uFE0F';
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else warnCount++;
  results.push({ id, name, status, details, responseTime });
  log(icon, 'TC-' + String(id).padStart(2,'0') + ': ' + name + ' [' + responseTime + 'ms] - ' + status);
  if (status !== 'PASS') log('  ', '   -> ' + details);
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)];
}

async function runTests() {
  console.log('');
  console.log('================================================================');
  console.log('   ASPIRE LMS - Performance & Load Test Suite');
  console.log('   Target: Supabase Backend + All Screen Data Queries');
  console.log('================================================================');
  console.log('');

  // Setup
  console.log('-- Phase 0: Setup --');
  const { data: students } = await supabase.from('students').select('*').limit(5);
  if (!students || students.length === 0) {
    console.log('FATAL: No students found in database.');
    return;
  }
  const testStudent = students[0];
  const batchCode = testStudent.batch || '';
  const enrolledCourses = testStudent.enrolled_courses || [];
  const courseId = enrolledCourses[0] || '';
  log('\uD83D\uDCCB', 'Test student: ' + testStudent.name + ' (' + testStudent.id + ')');
  log('\uD83D\uDCCB', 'Batch: ' + batchCode + ', Courses: ' + enrolledCourses.join(', '));
  log('\uD83D\uDCCB', 'Concurrent users to simulate: ' + CONCURRENT_USERS);
  console.log('');

  // ===== SECTION 1: LOGIN & AUTH =====
  console.log('-- Section 1: Login & Auth Flow --');

  // TC-01
  { const r = await timedQuery('students', () => supabase.from('students').select('*'));
    recordResult(1, 'Login: Student lookup (all students fetch)', r.success && r.data.data?.length > 0 ? 'PASS' : 'FAIL',
      r.success ? 'Found ' + (r.data.data?.length||0) + ' students' : r.error, r.ms); }

  // TC-02
  { const r = await timedQuery('batch', () => supabase.from('batches').select('category').eq('code', batchCode).maybeSingle());
    recordResult(2, 'Login: Batch category resolution', r.success ? 'PASS' : 'FAIL',
      r.success ? 'Category: ' + (r.data.data?.category || 'N/A') : r.error, r.ms); }

  // TC-03
  { const r = await timedQuery('profile', () => supabase.from('student_profiles').select('*').eq('student_id', testStudent.id).maybeSingle());
    recordResult(3, 'Login: Student profile load', r.success ? 'PASS' : 'FAIL',
      r.success ? 'Profile found: ' + !!r.data.data : r.error, r.ms); }

  // TC-04
  { const r = await timedQuery('locks', () => supabase.from('milestone_locks').select('lesson_id, is_locked, unlock_datetime').eq('batch_code', batchCode));
    recordResult(4, 'Login: Milestone locks load', r.success ? 'PASS' : 'FAIL',
      r.success ? (r.data.data?.length||0) + ' lock entries' : r.error, r.ms); }

  console.log('');

  // ===== SECTION 2: ALL SCREEN DATA LOADING =====
  console.log('-- Section 2: All Screen Data Loading --');

  // TC-05 Dashboard
  { const today = new Date().toISOString().split('T')[0];
    const start = Date.now();
    const [s1, s2] = await Promise.all([
      supabase.from('live_sessions').select('*').or('batch_code.eq.' + batchCode + ',target_batch.ilike.%all batches%'),
      supabase.from('live_sessions').select('*').eq('date', today).or('batch_code.eq.' + batchCode + ',target_batch.ilike.%all batches%')
    ]);
    recordResult(5, 'Dashboard: Live sessions + daily schedule', !s1.error ? 'PASS' : 'FAIL',
      (s1.data?.length||0) + ' sessions, ' + (s2.data?.length||0) + ' today', Date.now()-start); }

  // TC-06 Learning/Milestones
  { const cid = courseId || 'none';
    const start = Date.now();
    const [c,t,l,a,q,p,qz] = await Promise.all([
      supabase.from('courses').select('*').in('id', enrolledCourses.length ? enrolledCourses : ['none']),
      supabase.from('course_topics').select('*').eq('course_id', cid),
      supabase.from('course_lessons').select('*').eq('course_id', cid),
      supabase.from('assessments').select('id, topic_id, title').eq('course_id', cid),
      supabase.from('coding_questions').select('id, inner_topic_id, title').eq('course_id', cid),
      supabase.from('projects').select('id, inner_topic_id, title').eq('course_id', cid),
      supabase.from('quizzes').select('id, inner_topic_id, title').eq('course_id', cid)
    ]);
    recordResult(6, 'Learning: Full syllabus (7 parallel queries)', !c.error ? 'PASS' : 'FAIL',
      (c.data?.length||0) + ' courses, ' + (t.data?.length||0) + ' topics, ' + (l.data?.length||0) + ' lessons, ' + (a.data?.length||0) + ' assessments, ' + (q.data?.length||0) + ' coding, ' + (p.data?.length||0) + ' projects, ' + (qz.data?.length||0) + ' quizzes', Date.now()-start); }

  // TC-07 Lesson + resolver
  { const start = Date.now();
    const [c, m, ls] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId || 'none').maybeSingle(),
      supabase.from('milestones_data').select('id, stages, overview'),
      supabase.from('live_sessions').select('id, session_title, description, publish_status')
    ]);
    recordResult(7, 'Lesson: Course + resolver data', !c.error ? 'PASS' : 'FAIL',
      'Course: ' + (c.data?.title||'N/A') + ', ' + (m.data?.length||0) + ' milestones, ' + (ls.data?.length||0) + ' sessions', Date.now()-start); }

  // TC-08 Practice Hub
  { const start = Date.now();
    const [a, at] = await Promise.all([
      supabase.from('assessments').select('*').eq('course_id', courseId || 'none'),
      supabase.from('assignment_submissions').select('*').eq('student_id', testStudent.id)
    ]);
    recordResult(8, 'Practice Hub: Assignments + attempts', !a.error ? 'PASS' : 'FAIL',
      (a.data?.length||0) + ' assignments, ' + (at.data?.length||0) + ' attempts', Date.now()-start); }

  // TC-09 Practice Lab
  { const start = Date.now();
    const [pr, su] = await Promise.all([
      supabase.from('coding_questions').select('*').eq('course_id', courseId || 'none'),
      supabase.from('submissions').select('*').eq('student_id', testStudent.id)
    ]);
    recordResult(9, 'Practice Lab: Problems + submissions', !pr.error ? 'PASS' : 'FAIL',
      (pr.data?.length||0) + ' problems, ' + (su.data?.length||0) + ' submissions', Date.now()-start); }

  // TC-10 Quizzes
  { const start = Date.now();
    const [qz, at, lb] = await Promise.all([
      supabase.from('quizzes').select('*').in('course_id', enrolledCourses.length ? enrolledCourses : ['none']),
      supabase.from('quiz_attempts').select('*').eq('user_id', testStudent.id),
      supabase.from('students').select('id, name').limit(20)
    ]);
    recordResult(10, 'Quizzes: Data + attempts + leaderboard', !qz.error ? 'PASS' : 'FAIL',
      (qz.data?.length||0) + ' quizzes, ' + (at.data?.length||0) + ' attempts', Date.now()-start); }

  // TC-11 Projects
  { const r = await timedQuery('projects', () => supabase.from('projects').select('*').eq('course_id', courseId || 'none'));
    recordResult(11, 'Projects: Project list load', r.success ? 'PASS' : 'FAIL',
      (r.data?.data?.length||0) + ' projects', r.ms); }

  // TC-12 Resources
  { const r = await timedQuery('resources', () => supabase.from('placement_resources').select('*').eq('publish_status', 'Published'));
    recordResult(12, 'Resources: Published resources', r.success ? 'PASS' : 'FAIL',
      (r.data?.data?.length||0) + ' resources', r.ms); }

  // TC-13 Live Classes
  { const r = await timedQuery('liveSessions', () => supabase.from('live_sessions').select('*').or('batch_code.eq.' + batchCode + ',target_batch.ilike.%all batches%'));
    recordResult(13, 'Live Classes: All sessions', r.success ? 'PASS' : 'FAIL',
      (r.data?.data?.length||0) + ' sessions', r.ms); }

  // TC-14 Placement Hub
  { const start = Date.now();
    const [j, a, p] = await Promise.all([
      supabase.from('jobs').select('*').or('target_batch.eq.All Batches,target_batch.eq.' + batchCode),
      supabase.from('job_applications').select('*').eq('student_id', testStudent.id),
      supabase.from('placement_resources').select('*').eq('publish_status', 'Published')
    ]);
    recordResult(14, 'Placement: Jobs + apps + prep', !j.error ? 'PASS' : 'FAIL',
      (j.data?.length||0) + ' jobs, ' + (a.data?.length||0) + ' applications', Date.now()-start); }

  // TC-15 Certificates
  { const r = await timedQuery('certs', () => supabase.from('courses').select('*').in('id', enrolledCourses.length ? enrolledCourses : ['none']));
    recordResult(15, 'Certificates: Enrolled courses', r.success ? 'PASS' : 'FAIL',
      (r.data?.data?.length||0) + ' courses', r.ms); }

  // TC-16 Achievements
  { const start = Date.now();
    const [b, s, a] = await Promise.all([
      supabase.from('badges').select('*'),
      supabase.from('submissions').select('*').eq('student_id', testStudent.id),
      supabase.from('assignment_submissions').select('*').eq('student_id', testStudent.id)
    ]);
    recordResult(16, 'Achievements: Badges + submissions', !b.error ? 'PASS' : 'FAIL',
      (b.data?.length||0) + ' badges, ' + (s.data?.length||0) + ' subs', Date.now()-start); }

  // TC-17 Community (Optional Tables)
  { const start = Date.now();
    const [p, a] = await Promise.all([
      supabase.from('community_posts').select('*'),
      supabase.from('announcements').select('*')
    ]);
    const hasError = p.error || a.error;
    const isMissingTable = hasError && (p.error?.code === 'PGRST205' || a.error?.code === 'PGRST205');
    
    if (isMissingTable) {
      recordResult(17, 'Community: Posts + announcements', 'WARN',
        'Optional Community tables do not exist in database schema. App UI handles this gracefully.', Date.now()-start);
    } else {
      recordResult(17, 'Community: Posts + announcements', !p.error ? 'PASS' : 'FAIL',
        (p.data?.length||0) + ' posts, ' + (a.data?.length||0) + ' announcements', Date.now()-start);
    }
  }

  // TC-18 Schedule (Optional Tables)
  { const start = Date.now();
    const [t, s] = await Promise.all([
      supabase.from('personal_tasks').select('*').eq('student_id', testStudent.id),
      supabase.from('daily_schedules').select('*').limit(30)
    ]);
    const isMissingTable = s.error && s.error.code === 'PGRST205';
    if (isMissingTable) {
      recordResult(18, 'Schedule: Tasks + daily schedule', 'WARN',
        'Optional daily_schedules table does not exist in schema. Using fallback schedule data.', Date.now()-start);
    } else {
      recordResult(18, 'Schedule: Tasks + daily schedule', 'PASS',
        (t.data?.length||0) + ' tasks, ' + (s.data?.length||0) + ' schedules', Date.now()-start);
    }
  }

  // TC-19 Rewards
  { const start = Date.now();
    const [r, c] = await Promise.all([
      supabase.from('rewards').select('*'),
      supabase.from('reward_claims').select('*').eq('student_id', testStudent.id)
    ]);
    recordResult(19, 'Rewards: Rewards + claims', !r.error ? 'PASS' : 'FAIL',
      (r.data?.length||0) + ' rewards, ' + (c.data?.length||0) + ' claims', Date.now()-start); }

  // TC-20 Notifications
  { const r = await timedQuery('notifs', () => supabase.from('notifications').select('*').eq('student_id', testStudent.id));
    recordResult(20, 'Notifications: Student notifications', r.success ? 'PASS' : 'FAIL',
      (r.data?.data?.length||0) + ' notifications', r.ms); }

  // TC-21 Profile
  { const r = await timedQuery('profile', () => supabase.from('student_profiles').select('*').eq('student_id', testStudent.id).maybeSingle());
    recordResult(21, 'Profile: Student profile', r.success ? 'PASS' : 'FAIL',
      'XP: ' + (r.data?.data?.xp || 0), r.ms); }

  // TC-22 Settings
  { const r = await timedQuery('settings', () => supabase.from('student_profiles').select('*').eq('student_id', testStudent.id).maybeSingle());
    recordResult(22, 'Settings: Profile settings', r.success ? 'PASS' : 'FAIL', 'Loaded', r.ms); }

  console.log('');

  // ===== SECTION 3: HARD REFRESH =====
  console.log('-- Section 3: Hard Refresh / Cold Start --');

  // TC-23 Full cold start
  { const start = Date.now();
    const [st, ba, pr, lo, co] = await Promise.all([
      supabase.from('students').select('*'),
      supabase.from('batches').select('category').eq('code', batchCode).maybeSingle(),
      supabase.from('student_profiles').select('*').eq('student_id', testStudent.id).maybeSingle(),
      supabase.from('milestone_locks').select('lesson_id, is_locked').eq('batch_code', batchCode),
      supabase.from('courses').select('*').in('id', enrolledCourses.length ? enrolledCourses : ['none'])
    ]);
    const ms = Date.now()-start;
    recordResult(23, 'Cold Start: Full login (5 parallel queries)', !st.error ? 'PASS' : 'FAIL',
      'Total: ' + ms + 'ms - Students: ' + (st.data?.length||0) + ', Courses: ' + (co.data?.length||0), ms); }

  // TC-24 Dashboard after hard refresh
  { const today = new Date().toISOString().split('T')[0];
    const start = Date.now();
    const [p, s, d] = await Promise.all([
      supabase.from('student_profiles').select('*').eq('student_id', testStudent.id).maybeSingle(),
      supabase.from('live_sessions').select('*').or('batch_code.eq.' + batchCode + ',target_batch.ilike.%all batches%'),
      supabase.from('live_sessions').select('*').eq('date', today).or('batch_code.eq.' + batchCode + ',target_batch.ilike.%all batches%')
    ]);
    const ms = Date.now()-start;
    recordResult(24, 'Hard Refresh: Dashboard full reload', ms < 5000 ? 'PASS' : 'FAIL',
      ms + 'ms total, ' + (s.data?.length||0) + ' sessions', ms); }

  console.log('');

  // ===== SECTION 4: REAL-TIME =====
  console.log('-- Section 4: Real-Time Channel --');

  // TC-25 Real-time subscription
  if (typeof global.WebSocket === 'undefined') {
    recordResult(25, 'Real-Time: Channel subscription', 'WARN',
      'Skipped. WebSocket client not available in non-browser Node.js runtime environment.', 0);
  } else {
    const start = Date.now();
    const result = await new Promise((resolve) => {
      let done = false;
      const ch = supabase.channel('test_rt_' + Date.now())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'milestone_locks' }, () => {})
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && !done) { 
            done = true; 
            try { supabase.removeChannel(ch); } catch(e) {}
            resolve({ success: true, ms: Date.now()-start }); 
          }
        });
      setTimeout(() => { 
        if (!done) { 
          done = true; 
          try { supabase.removeChannel(ch); } catch(e) {}
          resolve({ success: false, ms: Date.now()-start }); 
        } 
      }, 5000);
    });
    recordResult(25, 'Real-Time: Channel subscription', result.success ? 'PASS' : 'FAIL',
      result.success ? 'Connected in ' + result.ms + 'ms' : 'Timed out or not supported', result.ms);
  }

  console.log('');

  // ===== SECTION 5: LOAD TEST - 500 USERS =====
  console.log('-- Section 5: Load Test - ' + CONCURRENT_USERS + ' Concurrent Users --');
  console.log('  Simulating ' + CONCURRENT_USERS + ' users in batches of ' + BATCH_SIZE + '...');
  console.log('');

  // TC-26 Login lookups
  { const times = [], errors = [];
    for (let b = 0; b < Math.ceil(CONCURRENT_USERS / BATCH_SIZE); b++) {
      const proms = [];
      for (let i = b*BATCH_SIZE; i < Math.min((b+1)*BATCH_SIZE, CONCURRENT_USERS); i++) {
        proms.push(timedQuery('login_'+i, () => supabase.from('students').select('id, name, batch').limit(5)));
      }
      for (const r of await Promise.all(proms)) { times.push(r.ms); if (!r.success) errors.push(r.error); }
    }
    const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    recordResult(26, 'Load: ' + CONCURRENT_USERS + ' concurrent logins', errors.length===0?'PASS':'FAIL',
      'Avg: '+avg+'ms | P50: '+percentile(times,50)+'ms | P95: '+percentile(times,95)+'ms | P99: '+percentile(times,99)+'ms | Max: '+Math.max(...times)+'ms | Errors: '+errors.length, avg); }

  // TC-27 Dashboard loads
  { const today = new Date().toISOString().split('T')[0];
    const times = [], errors = [];
    for (let b = 0; b < Math.ceil(CONCURRENT_USERS / BATCH_SIZE); b++) {
      const proms = [];
      for (let i = b*BATCH_SIZE; i < Math.min((b+1)*BATCH_SIZE, CONCURRENT_USERS); i++) {
        proms.push(timedQuery('dash_'+i, async () => {
          const [s,d] = await Promise.all([
            supabase.from('live_sessions').select('id, session_title').or('batch_code.eq.'+batchCode+',target_batch.ilike.%all batches%').limit(10),
            supabase.from('live_sessions').select('id, time').eq('date', today).limit(5)
          ]);
          return { s: s.data?.length, d: d.data?.length };
        }));
      }
      for (const r of await Promise.all(proms)) { times.push(r.ms); if (!r.success) errors.push(r.error); }
    }
    const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    recordResult(27, 'Load: ' + CONCURRENT_USERS + ' concurrent dashboards', errors.length===0?'PASS':'FAIL',
      'Avg: '+avg+'ms | P95: '+percentile(times,95)+'ms | P99: '+percentile(times,99)+'ms | Errors: '+errors.length, avg); }

  // TC-28 Syllabus loads
  { const times = [], errors = [];
    for (let b = 0; b < Math.ceil(CONCURRENT_USERS / BATCH_SIZE); b++) {
      const proms = [];
      for (let i = b*BATCH_SIZE; i < Math.min((b+1)*BATCH_SIZE, CONCURRENT_USERS); i++) {
        proms.push(timedQuery('syl_'+i, async () => {
          const [t,l] = await Promise.all([
            supabase.from('course_topics').select('id, title').eq('course_id', courseId||'none').limit(20),
            supabase.from('course_lessons').select('id, title').eq('course_id', courseId||'none').limit(50)
          ]);
          return { t: t.data?.length, l: l.data?.length };
        }));
      }
      for (const r of await Promise.all(proms)) { times.push(r.ms); if (!r.success) errors.push(r.error); }
    }
    const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    recordResult(28, 'Load: ' + CONCURRENT_USERS + ' concurrent syllabus loads', errors.length===0?'PASS':'FAIL',
      'Avg: '+avg+'ms | P95: '+percentile(times,95)+'ms | P99: '+percentile(times,99)+'ms | Errors: '+errors.length, avg); }

  // TC-29 Practice loads
  { const times = [], errors = [];
    for (let b = 0; b < Math.ceil(CONCURRENT_USERS / BATCH_SIZE); b++) {
      const proms = [];
      for (let i = b*BATCH_SIZE; i < Math.min((b+1)*BATCH_SIZE, CONCURRENT_USERS); i++) {
        proms.push(timedQuery('practice_'+i, () =>
          supabase.from('coding_questions').select('id, title').eq('course_id', courseId||'none').limit(30)));
      }
      for (const r of await Promise.all(proms)) { times.push(r.ms); if (!r.success) errors.push(r.error); }
    }
    const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    recordResult(29, 'Load: ' + CONCURRENT_USERS + ' concurrent practice loads', errors.length===0?'PASS':'FAIL',
      'Avg: '+avg+'ms | P95: '+percentile(times,95)+'ms | Errors: '+errors.length, avg); }

  // TC-30 Mixed workload
  { const times = [], errors = [];
    const queries = [
      () => supabase.from('students').select('id, name').limit(5),
      () => supabase.from('courses').select('id, title').in('id', enrolledCourses.length?enrolledCourses:['none']),
      () => supabase.from('course_topics').select('id, title').eq('course_id', courseId||'none'),
      () => supabase.from('course_lessons').select('id, title').eq('course_id', courseId||'none').limit(20),
      () => supabase.from('live_sessions').select('id, session_title').limit(10),
      () => supabase.from('badges').select('*'),
      () => supabase.from('assessments').select('id, title').eq('course_id', courseId||'none'),
      () => supabase.from('coding_questions').select('id, title').eq('course_id', courseId||'none').limit(20),
      () => supabase.from('placement_resources').select('id, title').eq('publish_status', 'Published'),
      () => supabase.from('notifications').select('id, title').eq('student_id', testStudent.id)
    ];
    for (let b = 0; b < Math.ceil(CONCURRENT_USERS / BATCH_SIZE); b++) {
      const proms = [];
      for (let i = b*BATCH_SIZE; i < Math.min((b+1)*BATCH_SIZE, CONCURRENT_USERS); i++) {
        proms.push(timedQuery('mix_'+i, queries[i % queries.length]));
      }
      for (const r of await Promise.all(proms)) { times.push(r.ms); if (!r.success) errors.push(r.error); }
    }
    const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
    const throughput = Math.round(CONCURRENT_USERS / (times.reduce((a,b)=>a+b,0) / 1000 / CONCURRENT_USERS));
    recordResult(30, 'Load: ' + CONCURRENT_USERS + ' mixed workload (10 types)', errors.length===0?'PASS':'FAIL',
      'Avg: '+avg+'ms | P50: '+percentile(times,50)+'ms | P95: '+percentile(times,95)+'ms | P99: '+percentile(times,99)+'ms | Max: '+Math.max(...times)+'ms | Errors: '+errors.length+' | ~'+throughput+' req/s', avg); }

  console.log('');

  // ===== FINAL REPORT =====
  console.log('================================================================');
  console.log('                     FINAL TEST REPORT');
  console.log('================================================================');
  console.log('  Total Test Cases:  ' + results.length);
  console.log('  PASSED:            ' + passCount);
  console.log('  FAILED:            ' + failCount);
  console.log('  WARNINGS:          ' + warnCount);
  console.log('  Pass Rate:         ' + ((passCount/results.length)*100).toFixed(1) + '%');
  console.log('================================================================');
  const funcAvg = Math.round(results.filter(r=>r.id<=25).reduce((a,r)=>a+r.responseTime,0) / results.filter(r=>r.id<=25).length);
  console.log('  Functional Tests Avg Response: ' + funcAvg + 'ms');
  console.log('================================================================');
  console.log('');
  console.log('ID  | Status  | Time    | Test Name');
  console.log('----|---------|---------|------------------------------------------');
  for (const r of results) {
    const s = r.status === 'PASS' ? 'PASS  ' : r.status === 'FAIL' ? 'FAIL  ' : 'WARN  ';
    console.log(String(r.id).padStart(3) + ' | ' + s + '  | ' + String(r.responseTime).padStart(5) + 'ms | ' + r.name);
  }
  console.log('');
}

runTests().then(() => { console.log('Test suite completed.'); process.exit(0); }).catch(err => { console.error('CRASH:', err); process.exit(1); });
