// Resource Content Data Store
const resourceContents: Record<string, { filename: string; mimeType: string; content: string }> = {
  r1: {
    filename: 'React_Cheat_Sheet_2024.md',
    mimeType: 'text/markdown',
    content: `# React 18/19 Developer Cheat Sheet (2024 Edition)
AspireLMS Enterprise Learning Resources

---

## 1. Core Hooks Quick Reference

### useState
\`\`\`tsx
const [state, setState] = useState<string>('initialValue');
// Functional update
setState(prev => prev + 1);
\`\`\`

### useEffect
\`\`\`tsx
useEffect(() => {
  const subscription = subscribeToData();
  return () => subscription.unsubscribe(); // Cleanup
}, [dependency]);
\`\`\`

### useMemo & useCallback
\`\`\`tsx
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
const memoizedCallback = useCallback(() => { doSomething(a, b); }, [a, b]);
\`\`\`

### useRef
\`\`\`tsx
const inputRef = useRef<HTMLInputElement>(null);
inputRef.current?.focus();
\`\`\`

---

## 2. Component Design Patterns

### Compound Components
\`\`\`tsx
export function Modal({ children }: { children: React.ReactNode }) {
  return <div className="modal-overlay">{children}</div>;
}
Modal.Header = function Header({ children }: { children: React.ReactNode }) {
  return <div className="modal-header">{children}</div>;
};
\`\`\`

---

## 3. Best Practices Checklist
- [x] Use custom hooks for complex business logic.
- [x] Always clean up side-effects in \`useEffect\`.
- [x] Wrap large list rendering in React.memo or virtualized lists.
- [x] Use TypeScript strict mode for prop validation.
`,
  },
  r2: {
    filename: 'System_Design_Roadmap.md',
    mimeType: 'text/markdown',
    content: `# System Design Architecture Roadmap & Patterns
AspireLMS Enterprise Learning Resources

---

## 1. High Availability Architecture
\`\`\`
[Client / Mobile App]
        │
        ▼
 [Cloudflare CDN / WAF]
        │
        ▼
   [Nginx Load Balancer (Round-Robin / Least Connections)]
        │
  ┌─────┴─────┐
  ▼           ▼
[API Server 1] [API Server 2]
  │           │
  ├───────────┼──────────┐
  ▼           ▼          ▼
[Redis Cache] [PostgreSQL (Primary)] ──► [PostgreSQL (Read Replica)]
\`\`\`

---

## 2. Key Scaling Strategies
1. **Vertical Scaling (Scale Up)**: Increase CPU, RAM, NVMe SSD on a single machine.
2. **Horizontal Scaling (Scale Out)**: Add stateless server nodes behind a Load Balancer.
3. **Database Sharding**: Partition data horizontally across nodes by \`user_id\` hash.
4. **Caching Layer**: Redis / Memcached with TTL & LRU eviction strategy.
5. **Asynchronous Processing**: Celery / RabbitMQ / Apache Kafka for background jobs.
`,
  },
  r3: {
    filename: 'ML_Math_Foundations.md',
    mimeType: 'text/markdown',
    content: `# Mathematics for Machine Learning & Deep Learning
AspireLMS Enterprise Learning Resources

---

## 1. Linear Algebra Essentials
- **Vectors & Matrices**: Representation of data samples \\(X \\in \\mathbb{R}^{n \\times d}\\).
- **Dot Product & Cosine Similarity**:
  $$\\text{similarity} = \\frac{A \\cdot B}{\\|A\\| \\|B\\|}$$
- **Eigenvalues & Eigenvectors**: Used in Principal Component Analysis (PCA) for dimensionality reduction.

---

## 2. Differential Calculus & Optimization
- **Gradient Descent**:
  $$\\theta_{t+1} = \\theta_t - \\eta \\nabla L(\\theta_t)$$
- **Chain Rule**: Foundation of Neural Network Backpropagation.

---

## 3. Probability & Statistics
- **Bayes' Theorem**:
  $$P(A|B) = \\frac{P(B|A) P(A)}{P(B)}$$
- **Loss Functions**:
  - Mean Squared Error (Regression): $$MSE = \\frac{1}{n} \\sum (y_i - \\hat{y}_i)^2$$
  - Binary Cross-Entropy (Classification): $$BCE = -[y \\log(\\hat{y}) + (1-y) \\log(1-\\hat{y})]$$
`,
  },
  r4: {
    filename: 'DSA_Pattern_Guide.md',
    mimeType: 'text/markdown',
    content: `# Data Structures & Algorithms Pattern Guide
AspireLMS Enterprise Learning Resources

---

## Top 14 Coding Interview Patterns

### 1. Two Pointers Pattern
\`\`\`python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        curr_sum = nums[left] + nums[right]
        if curr_sum == target:
            return [left, right]
        elif curr_sum < target:
            left += 1
        else:
            right -= 1
    return []
\`\`\`

### 2. Sliding Window Pattern
\`\`\`python
def max_sub_array_of_size_k(k, arr):
    max_sum, window_sum, window_start = 0, 0, 0
    for window_end in range(len(arr)):
        window_sum += arr[window_end]
        if window_end >= k - 1:
            max_sum = max(max_sum, window_sum)
            window_sum -= arr[window_start]
            window_start += 1
    return max_sum
\`\`\`

### 3. Fast & Slow Pointers (Floyd's Cycle Finding)
### 4. Merge Intervals
### 5. Cyclic Sort
### 6. In-place Reversal of a LinkedList
### 7. BFS & DFS for Trees and Graphs
`,
  },
  r5: {
    filename: 'Project_Proposal_Template.md',
    mimeType: 'text/markdown',
    content: `# Enterprise Project Proposal & Technical Specification
AspireLMS Learning Resources

---

## Executive Summary
- **Project Name**: [Insert Project Name]
- **Author / Lead**: [Your Name]
- **Target Completion Date**: [Target Date]

## 1. Problem Statement
Describe the business problem, target audience pain points, and current limitations.

## 2. Solution Overview
High-level description of proposed platform features and architecture.

## 3. Technology Stack Selection
- **Frontend**: React / Next.js, Tailwind CSS
- **Backend**: Node.js / FastAPI / Python
- **Database**: PostgreSQL / BigQuery
- **Deployment**: Vercel / Docker / AWS

## 4. Implementation Milestones
| Phase | Feature Scope | Estimated Time |
| :--- | :--- | :--- |
| Phase 1 | UI Prototypes & API Setup | 1 Week |
| Phase 2 | Core Business Logic | 2 Weeks |
| Phase 3 | Testing & Production Deploy | 1 Week |
`,
  },
  r6: {
    filename: 'AWS_Services_Quick_Reference.md',
    mimeType: 'text/markdown',
    content: `# AWS Cloud Services Quick Reference & CLI Cheat Sheet
AspireLMS Enterprise Learning Resources

---

## 1. Core Compute & Storage
- **Amazon EC2**: Virtual Machines in the cloud.
- **AWS Lambda**: Serverless event-driven execution.
- **Amazon S3**: Object storage bucket solution.

## 2. AWS CLI Quick Commands

### S3 Operations
\`\`\`bash
# List all buckets
aws s3 ls

# Sync local directory to bucket
aws s3 sync ./dist s3://my-app-bucket --delete
\`\`\`

### EC2 Operations
\`\`\`bash
# Describe running instances
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"
\`\`\`
`,
  },
};

/**
 * Triggers a file download directly in the user's web browser.
 */
export function triggerFileDownload(title: string, resourceId?: string, customContent?: string) {
  const resource = resourceId ? resourceContents[resourceId] : undefined;

  const filename = resource ? resource.filename : `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_aspire_lms.md`;
  const content = resource ? resource.content : (customContent || `# ${title}\n\nDownloaded from AspireLMS Enterprise Resources.\nUpdated: ${new Date().toLocaleDateString()}`);
  const mimeType = resource ? resource.mimeType : 'text/markdown';

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
