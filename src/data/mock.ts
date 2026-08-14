import type {
  User, Course, Assignment, LiveClass, Quiz, Project,
  Notification, Badge, Certificate, LeaderboardEntry, Resource,
  CommunityPost, ScheduleItem, PracticeProblem, JobOpportunity, Instructor,
} from '@/types';

export const currentUser: User = {
  id: 'u1',
  name: 'New Student',
  email: 'student@aspirenext.edu',
  avatar: '',
  role: 'Student',
  program: 'Engineering Degree',
  semester: 1,
  joinedDate: 'Aug 2026',
  xp: 0,
  level: 1,
  streak: 0,
  rank: 120,
  bio: 'No biography set yet. Go to Settings to introduce yourself!',
  skills: [],
  socials: [
    { label: 'GitHub', value: 'Not connected' },
    { label: 'LinkedIn', value: 'Not connected' },
    { label: 'Portfolio', value: 'Not connected' },
  ],
};

const instructors: Instructor[] = [
  {
    id: 'i1', name: 'Kavitha Chowdary', title: 'Senior ML Engineer, ex-Google',
    avatar: '', rating: 0, students: 0,
    courses: 0, bio: '10+ years building production ML systems at scale.',
  },
  {
    id: 'i2', name: 'Srinivas Rao', title: 'Staff Engineer, ex-Amazon',
    avatar: '', rating: 0, students: 0,
    courses: 0, bio: 'Distributed systems expert and passionate educator.',
  },
  {
    id: 'i3', name: 'Venkata Sai', title: 'Frontend Architect, ex-Stripe',
    avatar: '', rating: 0, students: 0,
    courses: 0, bio: 'Design systems and performance optimization specialist.',
  },
];

export const courses: Course[] = [
  {
    id: 'c1',
    title: 'Python Full Stack + DSA with AI',
    subtitle: 'Master Python, Advanced Backend Architectures, Frontend Technologies, and DSA Interview Prep',
    category: 'Web Development',
    level: 'Intermediate',
    instructor: instructors[2],
    thumbnail: '/python-full-stack.png',
    banner: '/python-full-stack.png',
    rating: 0, reviews: 0, students: 0, duration: '162 hours', lessons: 90,
    progress: 0,
    tags: ['Python', 'Django', 'React', 'DSA'],
    description: 'Master fullstack development and DSA using Python. Build modern client-server architectures, containerize with Docker, deploy to the cloud, and solve complex algorithms.',
    price: 0, enrolled: true, updatedAt: '2 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1: Frontend & Programming Foundations',
        modules: [
          // ════════ STAGE 1: FRONT END + REPOSITORY ════════
          {
            id: 'm1_git',
            title: 'Git & GitHub Version Control',
            duration: '5h',
            lessons: [
              { id: 'l_git_1', title: 'Git Architecture & Version Control Concepts', completed: false, video: { duration: '1h 00m', completed: false, preview: true }, assessment: { duration: '15m', completed: false } },
              { id: 'l_git_2', title: 'Core Git Commands: init, add, commit, push, pull', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_git_3', title: 'Branching Strategy & Merge Conflicts', completed: false, video: { duration: '1h 00m', completed: false }, assessment: { duration: '15m', completed: false } },
              { id: 'l_git_4', title: 'GitHub Pull Requests & Collaboration Workflows', completed: false, video: { duration: '45m', completed: false }, practice: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_html',
            title: 'HTML5 & Web Architecture',
            duration: '6h',
            lessons: [
              { id: 'l_html_1', title: 'Web Architecture & Client-Server Communication Model', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_html_2', title: 'HTML5 Document Structure & Semantic Elements', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_html_3', title: 'HTML Forms, Input Types, & Client-Side Validation', completed: false, video: { duration: '1h 15m', completed: false }, assessment: { duration: '15m', completed: false } },
              { id: 'l_html_4', title: 'HTML Tables, Media Tags & Accessibility', completed: false, video: { duration: '1h 15m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_css_fund',
            title: 'CSS3 Fundamentals & Box Model',
            duration: '5h',
            lessons: [
              { id: 'l_css_1', title: 'CSS Syntax, Rules, and Element/Class/ID Selectors', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_css_2', title: 'The CSS Box Model: Margin, Padding, Border, & Content', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_css_3', title: 'CSS Colors, Typography, & Visual Backgrounds', completed: false, video: { duration: '1h 00m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_css_adv',
            title: 'Advanced CSS Layouts & Responsive Design',
            duration: '5h',
            lessons: [
              { id: 'l_css_adv_1', title: 'Flexbox Architecture & Practical Alignments', completed: false, video: { duration: '1h 00m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_css_adv_2', title: 'CSS Grid System & Multi-Column Layouts', completed: false, video: { duration: '1h 00m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_css_adv_3', title: 'Positioning: Relative, Absolute, Fixed, Sticky', completed: false, video: { duration: '1h 00m', completed: false }, assessment: { duration: '15m', completed: false } },
              { id: 'l_css_adv_4', title: 'Media Queries & Responsive UI Design Patterns', completed: false, video: { duration: '1h 00m', completed: false }, practice: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_bootstrap',
            title: 'Bootstrap 5 Framework',
            duration: '4h',
            lessons: [
              { id: 'l_boot_1', title: 'Bootstrap 5 Grid System & Responsive Utilities', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_boot_2', title: 'Bootstrap Components (Navbar, Modals, Cards, Forms)', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_boot_3', title: 'Customizing Bootstrap Styles & Themes', completed: false, video: { duration: '45m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_js_ess',
            title: 'JavaScript Essentials & Control Flow',
            duration: '5h',
            lessons: [
              { id: 'l_js_1', title: 'JS Setup, Variables (var, let, const), & Data Types', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_js_2', title: 'Operators, Expressions, and Conditional Statements', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_js_3', title: 'Loops: for, while, forEach, & Iterations', completed: false, video: { duration: '1h 45m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_js_func',
            title: 'JavaScript Functions, Objects & Arrays',
            duration: '6h',
            lessons: [
              { id: 'l_js_func_1', title: 'Function Declarations, Expressions, & Arrow Functions', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_js_func_2', title: 'Advanced Array Methods (map, filter, reduce)', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_js_func_3', title: 'Object Manipulation & Higher-Order Functions', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm1_dom',
            title: 'DOM Manipulation & Event Handling',
            duration: '5h',
            lessons: [
              { id: 'l_dom_1', title: 'Selecting and Modifying DOM Elements Dynamically', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_dom_2', title: 'Event Listeners, Bubbling, and Delegation Patterns', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } },
              { id: 'l_dom_3', title: 'Form Validation & Dynamic HTML Creation', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm1_es6',
            title: 'Modern ES6+ & Asynchronous JS',
            duration: '5h',
            lessons: [
              { id: 'l_es6_1', title: 'Destructuring, Spread/Rest Operators, and Modules', completed: false, video: { duration: '1h 00m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_es6_2', title: 'Promises, Async/Await, and Fetch API Integration', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_es6_3', title: 'Handling JSON Data & Dynamic API Integrations', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]      {
        id: 's2',
        title: 'Stage 2: Backend + DSA',
        modules: [
          {
            id: 'm2_py_fund',
            title: 'Python Programming Fundamentals',
            duration: '6h',
            lessons: [
              { id: 'l_py_1', title: 'Python Setup, Variables, Data Types & Control Flow', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_py_2', title: 'Functions & Variable Scope in Python', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_py_3', title: 'Built-in Data Structures: Lists, Tuples, Sets, Dicts', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_py_adv',
            title: 'Advanced Python & Exception Handling',
            duration: '5h',
            lessons: [
              { id: 'l_py_adv_1', title: 'Decorators, Generators, and Iterators in Python', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_py_adv_2', title: 'File I/O & Error Handling: try-except-finally', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_py_adv_3', title: 'Context Managers & Custom Exceptions', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_oop',
            title: 'Object-Oriented Programming (OOP)',
            duration: '6h',
            lessons: [
              { id: 'l_oop_1', title: 'Classes, Objects, and Constructors: __init__', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_oop_2', title: 'OOP Principles: Inheritance, Polymorphism, Encapsulation, & Abstraction', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_oop_3', title: 'Advanced OOP: Dunder Methods & Design Patterns', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_sql',
            title: 'SQL & Relational Databases (MySQL)',
            duration: '6h',
            lessons: [
              { id: 'l_sql_1', title: 'RDBMS Concepts & SQL DDL: CREATE, ALTER', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_sql_2', title: 'SQL DML: INSERT, UPDATE, DELETE & Select Queries', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_sql_3', title: 'Filtering, Aggregations, & GROUP BY Clauses', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_sql_adv',
            title: 'Advanced SQL & PostgreSQL Integration',
            duration: '5h',
            lessons: [
              { id: 'l_sql_adv_1', title: 'SQL Joins: Inner, Left, Right, Full & Subqueries', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_sql_adv_2', title: 'Database Indexing, Transactions (ACID), & Foreign Keys', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_sql_adv_3', title: 'PostgreSQL Environment Setup & Shell Commands', completed: false, video: { duration: '1h 15m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm2_django_setup',
            title: 'Django Framework Setup & Architecture',
            duration: '5h',
            lessons: [
              { id: 'l_django_1', title: 'MVT Architecture & Creating Django Projects/Apps', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_django_2', title: 'Directory Structure & Settings Configuration', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_django_3', title: 'Request-Response Lifecycle, Views & Routing', completed: false, video: { duration: '1h 15m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm2_django_temp',
            title: 'Django Templates & Static Files Setup',
            duration: '5h',
            lessons: [
              { id: 'l_django_temp_1', title: 'Django Template Language (DTL), Filters, & Tags', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_django_temp_2', title: 'Template Inheritance & Layout Strategies', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_django_temp_3', title: 'Handling Static Files & User Media Uploads', completed: false, video: { duration: '1h 15m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm2_django_models',
            title: 'Django Models & Database ORM',
            duration: '6h',
            lessons: [
              { id: 'l_django_mod_1', title: 'Model Fields & Relationships: OneToOne, ForeignKey, ManyToMany', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_django_mod_2', title: 'Django ORM Queries & Migrations Management', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_django_mod_3', title: 'Admin Interface Customization & Model Managers', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_django_forms',
            title: 'Django Forms, Authentication & Auth',
            duration: '6h',
            lessons: [
              { id: 'l_django_forms_1', title: 'Django Forms & ModelForms with CSRF Protection', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_django_forms_2', title: 'User Authentication System: Login, Logout, Register', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_django_forms_3', title: 'Permission & Group Management in Django', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_drf_core',
            title: 'Django REST Framework (DRF) Core',
            duration: '6h',
            lessons: [
              { id: 'l_drf_1', title: 'REST API Architecture & DRF Setup', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_drf_2', title: 'Serializers & ModelSerializers in DRF', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_drf_3', title: 'Function & Class-Based Views: APIView, Generic Views', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_drf_adv',
            title: 'DRF Advanced: ViewSets, JWT Auth & Testing',
            duration: '6h',
            lessons: [
              { id: 'l_drf_adv_1', title: 'ViewSets, Routers, & Custom API Actions', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_drf_adv_2', title: 'JWT Authentication: SimpleJWT Integration & Permissions', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_drf_adv_3', title: 'Filtering, Pagination, & API Testing with pytest/Postman', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_redis',
            title: 'Redis Caching & AWS S3 Cloud Storage',
            duration: '5h',
            lessons: [
              { id: 'l_redis_1', title: 'Redis Installation & Caching Django Views/Queries', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_redis_2', title: 'File Uploads & Cloud Storage Integration: AWS S3', completed: false, video: { duration: '1h 15m', completed: false }, practice: { duration: '15m', completed: false } },
              { id: 'l_redis_3', title: 'Using Cloudinary for Media & CDN Optimization', completed: false, video: { duration: '1h 15m', completed: false }, assessment: { duration: '15m', completed: false } }
            ]
          },
          {
            id: 'm2_dsa1',
            title: 'Data Structures using Python - Part 1',
            duration: '6h',
            lessons: [
              { id: 'l_dsa1_1', title: 'Time & Space Complexity: Big-O Notation Analysis', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_dsa1_2', title: 'Arrays, Matrix Operations & Linked Lists: Singly & Doubly', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_dsa1_3', title: 'Stacks & Queues: Implementations & Use Cases', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          },
          {
            id: 'm2_dsa2',
            title: 'Data Structures & Algorithms - Part 2',
            duration: '6h',
            lessons: [
              { id: 'l_dsa2_1', title: 'Recursion & Searching Algorithms: Linear, Binary Search', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_dsa2_2', title: 'Sorting Algorithms: Bubble, Quick, Merge Sort', completed: false, video: { duration: '1h 30m', completed: false }, practice: { duration: '30m', completed: false } },
              { id: 'l_dsa2_3', title: 'Trees: Binary Trees, BST Traversals & Operations', completed: false, video: { duration: '1h 30m', completed: false }, assessment: { duration: '30m', completed: false } }
            ]
          }
        ]
      },  ]
      },

        ]
      },
      {
        id: 's3',
        title: 'Stage 3: AI, Integration & Deployment',
        modules: [
      {
        id: 'm3_ai',
        title: 'Introduction to AI, Prompt Engineering & LLMs',
        duration: '5h', lessons: [
          { id: 'l_ai_1', title: 'Ecosystem: AI vs ML vs DL vs LLMs', duration: '1h 30m', type: 'video', completed: false, preview: false },
          { id: 'l_ai_2', title: 'Google Gemini & OpenAI API Setup and Access', duration: '1h 30m', type: 'video', completed: false, preview: false },
          { id: 'l_ai_3', title: 'Prompt Engineering Strategies & Few-Shot Prompting', duration: '2h 00m', type: 'reading', completed: false, preview: false },
        ]
      },
      {
        id: 'm3_langchain',
        title: 'AI Integration with Python & LangChain',
        duration: '6h', lessons: [
          { id: 'l_lang_1', title: 'LangChain Framework Basics & Prompt Templates', duration: '2h 00m', type: 'video', completed: false, preview: false },
          { id: 'l_lang_2', title: 'Chains, Memory, & Django Backend Integrations', duration: '2h 00m', type: 'video', completed: false, preview: false },
          { id: 'l_lang_3', title: 'Building Intelligent AI Chatbots with Custom Knowledge', duration: '2h 00m', type: 'project', completed: false, preview: false },
        ]
      },
      {
        id: 'm3_docker',
        title: 'Docker Containerization & Cloud Deployment',
        duration: '5h', lessons: [
          { id: 'l_dock_1', title: 'Docker Concepts, Installation & Core Commands', duration: '1h 30m', type: 'video', completed: false, preview: false },
          { id: 'l_dock_2', title: 'Dockerfile creation & Containerizing Django/DB', duration: '1h 45m', type: 'video', completed: false, preview: false },
          { id: 'l_dock_3', title: 'Docker Compose & Deploying Full Stack App to Cloud', duration: '1h 45m', type: 'video', completed: false, preview: false },
        ]
      },

        ]
      },
      {
        id: 's4',
        title: 'Stage 4: Career Launchpad',
        modules: [
      {
        id: 'm4_sysdesign',
        title: 'System Design & Software Architecture',
        duration: '5h', lessons: [
          { id: 'l_sys_1', title: 'System Design Fundamentals: HLD vs LLD', duration: '1h 30m', type: 'video', completed: false, preview: false },
          { id: 'l_sys_2', title: 'Load Balancing, Database Sharding & Caching', duration: '1h 45m', type: 'video', completed: false, preview: false },
          { id: 'l_sys_3', title: 'Scalable Architecture & High Availability Designs', duration: '1h 45m', type: 'reading', completed: false, preview: false },
        ]
      },
      {
        id: 'm4_cap1',
        title: 'Capstone Project Mentoring & Review - 1',
        duration: '4h', lessons: [
          { id: 'l_cap1_1', title: 'Project Scope Finalization & Architecture Validation', duration: '2h 00m', type: 'video', completed: false, preview: false },
          { id: 'l_cap1_2', title: 'Database Schema Design & DRF API Contract Review', duration: '2h 00m', type: 'project', completed: false, preview: false },
        ]
      },
      {
        id: 'm4_cap2',
        title: 'Capstone Project Development & Mentoring - 2',
        duration: '5h', lessons: [
          { id: 'l_cap2_1', title: 'Frontend-Backend API Integrations & State Setup', duration: '2h 00m', type: 'video', completed: false, preview: false },
          { id: 'l_cap2_2', title: 'AI Feature Tuning, Security Auditing, & Optimization', duration: '3h 00m', type: 'video', completed: false, preview: false },
        ]
      },
      {
        id: 'm4_portfolio',
        title: 'Resume Building, LinkedIn & GitHub Portfolio',
        duration: '4h', lessons: [
          { id: 'l_port_1', title: 'Creating ATS-Compliant Tech Resume Profiles', duration: '2h 00m', type: 'video', completed: false, preview: false },
          { id: 'l_port_2', title: 'GitHub Repo Presentation, Readme Designs, & LinkedIn', duration: '2h 00m', type: 'reading', completed: false, preview: false },
        ]
      },
      {
        id: 'm4_mock',
        title: 'Mock Technical Interviews & Valedictory',
        duration: '4h', lessons: [
          { id: 'l_mock_1', title: 'DSA Live Coding Problem Solving Practices', duration: '2h 00m', type: 'video', completed: false, preview: false },
          { id: 'l_mock_2', title: 'Technical HR Mock Interviews & Prep Guides', duration: '2h 00m', type: 'video', completed: false, preview: false },
        ]
      }
        ]
      }
    ],
  },
  {
    id: 'c2',
    title: 'Machine Learning Fundamentals',
    subtitle: 'From linear regression to neural networks',
    category: 'AI & ML',
    level: 'Beginner',
    instructor: instructors[0],
    thumbnail: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&q=80',
    rating: 4.8, reviews: 890, students: 5200, duration: '36h', lessons: 78,
    progress: 0,
    tags: ['Python', 'TensorFlow', 'Neural Networks'],
    description: 'Start your ML journey with intuitive explanations and hands-on projects. Build your first models and understand the math behind them.',
    price: 0, enrolled: true, updatedAt: '5 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'ML Basics', duration: '5h', lessons: [
        { id: 'l1', title: 'What is Machine Learning?', duration: '12:00', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Linear Regression', duration: '28:00', type: 'video', completed: false, preview: false },
        { id: 'l3', title: 'Classification Basics', duration: '25:30', type: 'video', completed: false, preview: false },
      ]},
        ]
      }
    ],
  },
  {
    id: 'c3',
    title: 'System Design Mastery',
    subtitle: 'Design scalable distributed systems',
    category: 'System Design',
    level: 'Advanced',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
    rating: 4.9, reviews: 2100, students: 11200, duration: '28h', lessons: 54,
    progress: 0,
    tags: ['Architecture', 'Scalability', 'Microservices'],
    description: 'Learn to design systems that handle millions of users. Covers caching, load balancing, databases, and real-world case studies.',
    price: 0, enrolled: true, updatedAt: '1 week ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'Core Concepts', duration: '5h', lessons: [
        { id: 'l1', title: 'Scalability Fundamentals', duration: '20:00', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Load Balancing', duration: '18:30', type: 'video', completed: false, preview: false },
      ]},
        ]
      }
    ],
  },
  {
    id: 'c4',
    title: 'Data Structures & Algorithms',
    subtitle: 'Crack coding interviews with confidence',
    category: 'DSA',
    level: 'Intermediate',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1516259762381-22954a1c4a31?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1516259762381-22954a1c4a31?w=1200&q=80',
    rating: 4.7, reviews: 3400, students: 18900, duration: '48h', lessons: 120,
    progress: 0,
    tags: ['Algorithms', 'Data Structures', 'Interview Prep'],
    description: 'Comprehensive DSA course with 300+ problems, pattern-based learning, and mock interview practice.',
    price: 0, enrolled: false, updatedAt: '3 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [],
      }
    ],
  },
  {
    id: 'c5',
    title: 'Cloud Architecture on AWS',
    subtitle: 'Build and deploy cloud-native applications',
    category: 'Cloud',
    level: 'Advanced',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1451187580453-466d7ca8d488?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1451187580453-466d7ca8d488?w=1200&q=80',
    rating: 4.8, reviews: 670, students: 4300, duration: '32h', lessons: 64,
    progress: 0,
    tags: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    description: 'Master AWS services, containerization, and infrastructure as code. Includes real-world deployment projects.',
    price: 0, enrolled: false, updatedAt: '1 week ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [],
      }
    ],
  },
  {
    id: 'c6',
    title: 'UI/UX Design Principles',
    subtitle: 'Design products people love',
    category: 'Design',
    level: 'Beginner',
    instructor: instructors[2],
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1561070791-2526d30994b8?w=1200&q=80',
    rating: 4.9, reviews: 1500, students: 9800, duration: '24h', lessons: 48,
    progress: 0,
    tags: ['Figma', 'Design Systems', 'User Research'],
    price: 0, enrolled: false, updatedAt: '4 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [],
      }
    ],
  },
  {
    id: 's1',
    title: 'Professional Communication & Soft Skills',
    subtitle: 'Learn professional email writing, technical speaking, group discussions, and interview skills.',
    category: 'Communication or Soft Skills',
    level: 'Beginner',
    instructor: instructors[2],
    thumbnail: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80',
    rating: 4.9, reviews: 340, students: 1500, duration: '10h', lessons: 18,
    progress: 0,
    tags: ['Speaking', 'Writing', 'Leadership'],
    description: 'Practical communication guide for engineers. Learn how to write concise emails, present your engineering ideas to executives, and lead sprint planning meetings with high confidence.',
    price: 0, enrolled: true, updatedAt: '1 day ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'Foundations of Communication', duration: '5h', lessons: [
        { id: 'l1', title: 'Introduction to Executive Communication', duration: '10:15', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Speaking with Authority & Clarity', duration: '15:20', type: 'video', completed: false, preview: false },
        { id: 'l3', title: 'Presenting Technical Architecture', duration: '12:45', type: 'video', completed: false, preview: false },
      ]}
        ]
      }
    ],
  },
  {
    id: 'a1',
    title: 'Quantitative Aptitude & Logical Reasoning',
    subtitle: 'Master numerical problem solving, mental math, logical charts, and coding test puzzles.',
    category: 'Aptitude & Reasoning',
    level: 'Intermediate',
    instructor: instructors[0],
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80',
    rating: 4.8, reviews: 890, students: 3400, duration: '18h', lessons: 30,
    progress: 0,
    tags: ['Aptitude', 'Math', 'Interviews'],
    description: 'Learn speed math shortcuts, shortcut formulas, probability, combinations, and analytical reasoning techniques commonly asked in top tech screening rounds.',
    price: 0, enrolled: true, updatedAt: '3 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'Number Systems & Math', duration: '5h', lessons: [
        { id: 'l1', title: 'Speed Math Techniques', duration: '15:00', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Ratio & Proportions Shortcuts', duration: '20:10', type: 'video', completed: false, preview: false },
        { id: 'l3', title: 'Probability Rules', duration: '22:15', type: 'video', completed: false, preview: false },
      ]}
        ]
      }
    ],
  },
  {
    id: 'p1',
    title: 'Personal Portfolio & Capstone Projects',
    subtitle: 'Design, develop, and host your personal portfolio to showcase your practical coding labs.',
    category: 'Portfolio',
    level: 'Intermediate',
    instructor: instructors[2],
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
    rating: 4.9, reviews: 450, students: 1900, duration: '12h', lessons: 16,
    progress: 0,
    tags: ['Next.js', 'Framer Motion', 'Tailwind CSS'],
    description: 'Build a premium engineering portfolio site. Includes case studies of your projects, contact forms, interactive project grids, and search engine optimization.',
    price: 0, enrolled: true, updatedAt: '5 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'Design & Set Up', duration: '5h', lessons: [
        { id: 'l1', title: 'Portfolio Architecture & UX Design', duration: '14:24', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Adding Framer Motion Animations', duration: '24:45', type: 'video', completed: false, preview: false },
      ]}
        ]
      }
    ],
  },
  {
    id: 'r1',
    title: 'Technical Resume Building',
    subtitle: 'Step-by-step guidance to write professional resumes and format templates for job applications.',
    category: 'Resume',
    level: 'Beginner',
    instructor: instructors[1],
    thumbnail: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=1200&q=80',
    rating: 5.0, reviews: 760, students: 4200, duration: '5h', lessons: 9,
    progress: 0,
    tags: ['Resume', 'Career', 'Tech Jobs'],
    description: 'Write a high-performance tech resume that matches ATS scanner algorithms, highlights metrics, and gets you interview callbacks.',
    price: 0, enrolled: true, updatedAt: '2 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'ATS Rules', duration: '5h', lessons: [
        { id: 'l1', title: 'ATS Scanners Explained', duration: '12:00', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Action Verbs & Key Metrics', duration: '18:40', type: 'video', completed: false, preview: false },
      ]}
        ]
      }
    ],
  },
  {
    id: 'l1',
    title: 'LinkedIn Optimization & Networking',
    subtitle: 'Complete guide to setting up your LinkedIn profile, listing skills, and connecting with tech mentors.',
    category: 'LinkedIn',
    level: 'Beginner',
    instructor: instructors[2],
    thumbnail: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800&q=80',
    banner: 'https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=1200&q=80',
    rating: 4.9, reviews: 540, students: 3600, duration: '7h', lessons: 12,
    progress: 0,
    tags: ['LinkedIn', 'Branding', 'Networking'],
    description: 'Grow your LinkedIn personal brand, write search-optimized headlines, and get inbound recruiter requests.',
    price: 0, enrolled: true, updatedAt: '4 days ago',
    stages: [
      {
        id: 's1',
        title: 'Stage 1',
        modules: [
      { id: 'm1', title: 'Profile Setup', duration: '5h', lessons: [
        { id: 'l1', title: 'LinkedIn Profile SEO Audit', duration: '14:10', type: 'video', completed: false, preview: true },
        { id: 'l2', title: 'Writing Recruiter-Friendly Summaries', duration: '22:15', type: 'video', completed: false, preview: false },
      ]}
        ]
      }
    ],
  }
];

export const assignments: Assignment[] = [
  { id: 'a1', title: 'Build a REST API with Authentication', course: 'Full-Stack Web Dev', courseId: 'c1', dueDate: 'Tomorrow, 11:59 PM', status: 'pending', maxGrade: 100, description: 'Create a complete REST API with JWT authentication, rate limiting, and input validation. Include documentation.', attachments: 3 },
  { id: 'a2', title: 'Neural Network from Scratch', course: 'ML Fundamentals', courseId: 'c2', dueDate: 'Aug 8, 11:59 PM', status: 'pending', maxGrade: 100, description: 'Implement a neural network using only NumPy. Train it on the MNIST dataset and achieve 95%+ accuracy.', attachments: 2 },
  { id: 'a3', title: 'Design a URL Shortener', course: 'System Design', courseId: 'c3', dueDate: 'Aug 12, 11:59 PM', status: 'pending', maxGrade: 100, description: 'Design a URL shortening service that handles 100M URLs with 99.99% uptime. Submit architecture diagram and trade-off analysis.', attachments: 1 },
  { id: 'a4', title: 'React Component Library', course: 'Full-Stack Web Dev', courseId: 'c1', dueDate: 'Submitted Aug 1', status: 'reviewed', grade: 92, maxGrade: 100, feedback: 'Excellent work on accessibility and documentation. Consider adding more edge case tests.', description: 'Build a reusable component library with 10+ components.', attachments: 5 },
  { id: 'a5', title: 'Database Schema Design', course: 'Full-Stack Web Dev', courseId: 'c1', dueDate: 'Jul 28', status: 'overdue', maxGrade: 100, description: 'Design a normalized database schema for an e-commerce platform.', attachments: 0 },
  { id: 'a6', title: 'Linear Regression Implementation', course: 'ML Fundamentals', courseId: 'c2', dueDate: 'Submitted Jul 30', status: 'submitted', maxGrade: 100, description: 'Implement linear regression with gradient descent.', attachments: 2 },
];

const c1 = courses[0];
const allLessons = c1.stages?.flatMap((s: any) => s.modules.flatMap((m: any) => m.lessons)) || [];
const previewLesson = allLessons.find((l: any) => l.preview);
const previewIndex = allLessons.indexOf(previewLesson);
const nextLesson = previewIndex !== -1 && previewIndex + 1 < allLessons.length ? allLessons[previewIndex + 1] : null;
const prevLesson = previewIndex > 0 ? allLessons[previewIndex - 1] : null;

export const liveClasses: LiveClass[] = [
  {
    id: 'lc1',
    title: 'Live Workshop: Introduction to Version Control & Git Architecture',
    course: 'Python Full Stack + DSA with AI',
    instructor: instructors[1], // Srinivas Rao
    scheduledAt: new Date().toISOString(), // Use current time for "Live"
    duration: '120m',
    status: 'ongoing',
    participants: 1240,
    thumbnail: 'https://images.unsplash.com/photo-1618401479427-c8ef9465fbe1?w=800&q=80' // Realistic GitHub interface and code
  },
  {
    id: 'lc2',
    title: 'Upcoming: Git Commands: init, add, commit, push, pull',
    course: 'Python Full Stack + DSA with AI',
    instructor: instructors[0], // Kavitha Chowdary
    scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: '90m',
    status: 'upcoming',
    participants: 856,
    thumbnail: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=800&q=80' // Realistic terminal window
  }
];

if (previewLesson) {
  liveClasses.push({
    id: previewLesson.id,
    title: previewLesson.title,
    course: c1.title,
    instructor: instructors[2],
    status: 'ongoing',
    scheduledAt: 'Today, 4:00 PM',
    duration: previewLesson.duration || '90 min',
    participants: 142,
    thumbnail: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=800&q=80',
  });
}

if (nextLesson) {
  liveClasses.push({
    id: nextLesson.id,
    title: nextLesson.title,
    course: c1.title,
    instructor: instructors[2],
    status: 'upcoming',
    scheduledAt: 'Tomorrow, 2:00 PM',
    duration: nextLesson.duration || '60 min',
    participants: 89,
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  });
}

if (prevLesson) {
  liveClasses.push({
    id: prevLesson.id,
    title: prevLesson.title,
    course: c1.title,
    instructor: instructors[2],
    status: 'completed',
    scheduledAt: 'Yesterday, 10:00 AM',
    duration: prevLesson.duration || '45 min',
    participants: 215,
    thumbnail: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=800&q=80',
  });
}

export const quizzes: Quiz[] = [
  { id: 'q1', title: 'Git & GitHub Basics Quiz', course: 'Version Control', questions: 15, duration: '20 min', status: 'upcoming', maxScore: 100, dueDate: 'Aug 5', difficulty: 'Beginner' },
  { id: 'q2', title: 'HTML5 Semantic Elements Quiz', course: 'Web Architecture', questions: 20, duration: '25 min', status: 'upcoming', maxScore: 100, dueDate: 'Aug 10', difficulty: 'Beginner' },
  { id: 'q3', title: 'CSS3 Box Model Test', course: 'CSS3 Fundamentals', questions: 25, duration: '30 min', status: 'upcoming', maxScore: 100, dueDate: 'Aug 15', difficulty: 'Beginner' },
];

export const projects: Project[] = [
  // ════════ MINI PROJECTS ════════
  { id: 'proj-s1', title: 'Python Data Analyzer', course: 'Module 2: Python Fundamentals', projectType: 'mini', status: 'assigned', locked: true, difficulty: 'Beginner', skills: ['Python', 'Pandas', 'Data Cleaning'], description: 'Build a Python script that analyzes, cleans, and generates insights from raw CSV data.', dueDate: 'Aug 20' },
  { id: 'proj-s2', title: 'Django REST API & Redis Cache', course: 'Module 3: Backend & DSA', projectType: 'mini', status: 'assigned', locked: true, difficulty: 'Intermediate', skills: ['Python', 'Django', 'Redis'], description: 'Build a robust Django REST API with JWT authentication and Redis caching for database queries.', dueDate: 'Sep 10' },

  // ════════ MAJOR PROJECTS ════════
  { id: 'proj-s3', title: 'Enterprise Fullstack E-Commerce', course: 'Module 4: Fullstack Integration', projectType: 'major', status: 'assigned', locked: true, difficulty: 'Advanced', skills: ['React', 'Django', 'PostgreSQL', 'Docker'], description: 'Develop a complete React frontend integrated with a Django REST backend. Includes auth, payments, and Docker deployment.', dueDate: 'Oct 05' },

  // ════════ CAPSTONE PROJECTS ════════
  { id: 'proj-s4', title: 'Capstone Project: Coming Soon', course: 'Final Stage: Career Launchpad', projectType: 'capstone', status: 'assigned', difficulty: 'Advanced', skills: ['System Design', 'React', 'Django', 'AWS'], description: 'Design and deploy a scalable Learning Management System using a microservices architecture. Details will be unlocked soon.', dueDate: 'TBD' },
];

export const notifications: Notification[] = [];

export const badges: Badge[] = [
  { id: 'b1', name: 'Fast Learner', description: 'Complete 5 lessons in a day', icon: 'Zap', earned: true, date: 'Jul 15', rarity: 'rare' },
  { id: 'b2', name: 'Streak Master', description: 'Maintain a 30-day streak', icon: 'Flame', earned: true, date: 'Jul 30', rarity: 'epic' },
  { id: 'b3', name: 'Quiz Champion', description: 'Score 90+ on 10 quizzes', icon: 'Trophy', earned: true, date: 'Jul 22', rarity: 'epic' },
  { id: 'b4', name: 'Helping Hand', description: 'Answer 50 community doubts', icon: 'HeartHandshake', earned: true, date: 'Jul 18', rarity: 'rare' },
  { id: 'b5', name: 'Code Wizard', description: 'Solve 100 coding problems', icon: 'Code2', earned: false, rarity: 'legendary' },
  { id: 'b6', name: 'Early Bird', description: 'Study before 7 AM for a week', icon: 'Sunrise', earned: false, rarity: 'common' },
  { id: 'b7', name: 'Team Player', description: 'Complete 5 group projects', icon: 'Users', earned: true, date: 'Jul 10', rarity: 'common' },
  { id: 'b8', name: 'Perfectionist', description: 'Score 100 on 5 assignments', icon: 'Sparkles', earned: false, rarity: 'legendary' },
];

export const certificates: Certificate[] = [
  { id: 'cert1', title: 'JavaScript Essentials', course: 'JavaScript Mastery', issuedDate: 'Jun 2024', verifyId: 'ASP-JS-2024-0892', grade: 'A+' },
  { id: 'cert2', title: 'CSS & Responsive Design', course: 'Modern CSS Patterns', issuedDate: 'May 2024', verifyId: 'ASP-CSS-2024-0451', grade: 'A' },
  { id: 'cert3', title: 'Git & Version Control', course: 'DevOps Fundamentals', issuedDate: 'Apr 2024', verifyId: 'ASP-GIT-2024-0233', grade: 'A+' },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Ishita Verma', avatar: 'https://i.pravatar.cc/200?img=20', xp: 18200, level: 32, streak: 89, trend: 'same' },
  { rank: 2, name: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', xp: 15600, level: 28, streak: 62, trend: 'up' },
  { rank: 3, name: 'Aarav Sharma', avatar: 'https://i.pravatar.cc/200?img=12', xp: 12450, level: 24, streak: 47, trend: 'up' },
  { rank: 4, name: 'Neha Gupta', avatar: 'https://i.pravatar.cc/200?img=31', xp: 11800, level: 23, streak: 35, trend: 'down' },
  { rank: 5, name: 'Arjun Reddy', avatar: 'https://i.pravatar.cc/200?img=11', xp: 10200, level: 21, streak: 28, trend: 'up' },
  { rank: 6, name: 'Sneha Iyer', avatar: 'https://i.pravatar.cc/200?img=24', xp: 9800, level: 20, streak: 41, trend: 'same' },
  { rank: 7, name: 'Vikram Singh', avatar: 'https://i.pravatar.cc/200?img=13', xp: 8900, level: 19, streak: 15, trend: 'down' },
];

export const resources: Resource[] = [
  { id: 'r1', title: 'HTML5 & CSS3 Flexbox Cheat Sheet', type: 'cheatsheet', category: 'Web Architecture', size: '1.2 MB', downloads: 3400, updatedAt: '2 days ago' },
  { id: 'r2', title: 'Git & GitHub Workflow Guide', type: 'pdf', category: 'Version Control', size: '2.8 MB', downloads: 5600, updatedAt: '1 week ago' },
  { id: 'r3', title: 'Python DSA Master Notes', type: 'notes', category: 'Backend & DSA', size: '5.2 MB', downloads: 2100, updatedAt: '3 days ago' },
  { id: 'r4', title: 'Django REST Framework Auth Flow', type: 'roadmap', category: 'Backend & DSA', size: '3.7 MB', downloads: 8900, updatedAt: '5 days ago' },
  { id: 'r5', title: 'LangChain Prompts Template', type: 'template', category: 'AI & Deployment', size: '340 KB', downloads: 1200, updatedAt: '1 day ago' },
  { id: 'r6', title: 'Docker Compose Microservices Template', type: 'template', category: 'AI & Deployment', size: '1.1 MB', downloads: 4500, updatedAt: '1 week ago' },
  { id: 'r7', title: 'System Design Interview Cheatsheet', type: 'cheatsheet', category: 'Career Launchpad', size: '4.5 MB', downloads: 8500, updatedAt: '2 weeks ago' },
];

export const communityPosts: CommunityPost[] = [
  { id: 'cp1', author: 'Dr. Priya Nair', avatar: 'https://i.pravatar.cc/200?img=45', role: 'mentor', content: 'Reminder: The ML project submissions are due next Friday. Make sure to include your model evaluation metrics and not just accuracy. Reach out if you need help!', time: '1h ago', likes: 124, comments: 18, tags: ['ML', 'Deadline'], liked: false },
  { id: 'cp2', author: 'Karan Patel', avatar: 'https://i.pravatar.cc/200?img=15', role: 'student', content: 'Finally solved the "Design a Rate Limiter" problem after 3 days! The token bucket algorithm makes so much sense now. Anyone else working on system design problems?', time: '3h ago', likes: 67, comments: 12, tags: ['SystemDesign', 'Wins'], liked: true },
  { id: 'cp3', author: 'Ishita Verma', avatar: 'https://i.pravatar.cc/200?img=20', role: 'student', content: 'Has anyone tried the new coding challenge? I am stuck on the dynamic programming approach for the coin change variant. Any hints without spoiling the solution?', time: '5h ago', likes: 34, comments: 8, tags: ['DSA', 'Help'], liked: false },
  { id: 'cp4', author: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/200?img=33', role: 'mentor', content: 'Great discussion in today\'s system design live class! For those who asked, here is the link to the Twitter architecture case study we discussed. Study the caching layer carefully.', time: '8h ago', likes: 201, comments: 25, tags: ['SystemDesign', 'Resources'], liked: true },
];

export const scheduleItems: ScheduleItem[] = [
  { id: 's1', title: 'Python Basics Live Class', type: 'class', date: 'Today', time: '4:00 PM', duration: '90 min', course: 'Python Full Stack + DSA with AI', location: 'Live Session' },
];

export const practiceProblems: PracticeProblem[] = [
  { id: 'pp1', title: 'Write Semantic Elements for a Blog Post', difficulty: 'Easy', category: 'HTML5 Structure', solved: false, attempts: 0, successRate: 92, points: 10 },
  { id: 'pp2', title: 'Create a Form with Client-Side Validation', difficulty: 'Medium', category: 'HTML5 Forms', solved: false, attempts: 0, successRate: 85, points: 15 },
  { id: 'pp3', title: 'Apply Box Model Properties to a Card Layout', difficulty: 'Easy', category: 'CSS3 Box Model', solved: false, attempts: 0, successRate: 88, points: 15 },
];

export const jobOpportunities: JobOpportunity[] = [
  { id: 'j1', company: 'TCS', role: 'Python Developer', logo: '/tcs.png', location: 'Hyderabad, India', type: 'Full-time', salary: '4-7 LPA', postedDate: '1 day ago', match: 98, skills: ['Python', 'Django', 'AWS', 'DSA'], status: 'open' },
];

export const announcements = [
  { id: 'an1', title: 'New ML Course Launch', message: 'Advanced Deep Learning course is now available. Enroll now for early access!', time: '2h ago', priority: 'high' as const },
  { id: 'an2', title: 'Hackathon 2024 Registration Open', message: 'Register for the annual 48-hour hackathon. Prize pool: 2 Lakhs.', time: '1d ago', priority: 'medium' as const },
  { id: 'an3', title: 'Library Maintenance', message: 'The resource library will be under maintenance on Aug 5, 2-4 AM IST.', time: '2d ago', priority: 'low' as const },
];

export const weeklyActivity = [
  { day: 'Mon', hours: 3.5, lessons: 4 },
  { day: 'Tue', hours: 4.2, lessons: 6 },
  { day: 'Wed', hours: 2.8, lessons: 3 },
  { day: 'Thu', hours: 5.1, lessons: 7 },
  { day: 'Fri', hours: 3.9, lessons: 5 },
  { day: 'Sat', hours: 6.2, lessons: 8 },
  { day: 'Sun', hours: 4.5, lessons: 5 },
];

export const attendanceData = {
  present: 92,
  absent: 5,
  late: 3,
  total: 100,
  monthly: [
    { month: 'Feb', rate: 95 },
    { month: 'Mar', rate: 88 },
    { month: 'Apr', rate: 91 },
    { month: 'May', rate: 94 },
    { month: 'Jun', rate: 89 },
    { month: 'Jul', rate: 92 },
  ],
};

export const recentActivity = [
  { id: 'ra1', action: 'Completed lesson', target: 'State Management Patterns', course: 'Full-Stack Web Dev', time: '2h ago', icon: 'CheckCircle' },
  { id: 'ra2', action: 'Submitted assignment', target: 'React Component Library', course: 'Full-Stack Web Dev', time: '5h ago', icon: 'Upload' },
  { id: 'ra3', action: 'Earned badge', target: 'Streak Master', course: '', time: '1d ago', icon: 'Award' },
  { id: 'ra4', action: 'Scored', target: '88/100 on ML Basics Quiz', course: 'ML Fundamentals', time: '2d ago', icon: 'TrendingUp' },
  { id: 'ra5', action: 'Joined live class', target: 'Intro to Cloud Architecture', course: 'Cloud Architecture', time: '3d ago', icon: 'Radio' },
];

export const mentorMessages = [
  { id: 'mm1', from: 'Dr. Priya Nair', avatar: 'https://i.pravatar.cc/200?img=45', message: 'Great progress on the ML course! Your neural network implementation looks solid. Let me know if you need help with the next module.', time: '3h ago', unread: true },
  { id: 'mm2', from: 'Rohan Mehta', avatar: 'https://i.pravatar.cc/200?img=33', message: 'Your system design submission was excellent. Consider exploring the caching chapter next.', time: '1d ago', unread: false },
];
