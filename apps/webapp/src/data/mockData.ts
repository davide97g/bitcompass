// Mock data for the internal knowledge base application

export interface Person {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  skills: string[];
  expertise: string[];
  projects: string[];
  problemsSolved: string[];
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  icon: string;
  technologies: string[];
  tips: string[];
  relatedProjects: string[];
  relatedProblems: string[];
  relatedPeople: string[];
}

export interface Problem {
  id: string;
  title: string;
  status: 'open' | 'solved' | 'in-progress';
  description: string;
  solution?: string;
  technologies: string[];
  relatedProjects: string[];
  relatedPeople: string[];
  createdAt: string;
  solvedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  context: string;
  techStack: string[];
  status: 'active' | 'completed' | 'on-hold' | 'planning';
  relatedProblems: string[];
  team: string[];
  startDate: string;
  endDate?: string;
}

export interface AutomationStep {
  order: number;
  title: string;
  description: string;
}

export interface Automation {
  id: string;
  title: string;
  description: string;
  category: 'onboarding' | 'deployment' | 'monitoring' | 'notifications' | 'data-sync' | 'development' | 'other';
  steps: AutomationStep[];
  videoThumbnail: string;
  triggerLabel?: string;
  /** Step order numbers (1-based) where AI is used to speed up the flow */
  stepsWithAI?: number[];
  /** Productivity benefits, e.g. "-30% writing test time", "+50% coverage" */
  benefits?: string[];
  /** Person IDs of authors (clickable on card/detail; shown on person detail page) */
  authors?: string[];
  /** Dev automations: link to GitHub repo (workflows, scripts). Mock URL. */
  githubUrl?: string;
  /** Non-dev automations: optional doc link (Google Drive, Word, PDF). Mock URL. */
  docLink?: string;
}

// People data
export const people: Person[] = [
  {
    id: 'p1',
    name: 'Sarah Chen',
    role: 'Senior Frontend Engineer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    email: 'sarah.chen@company.com',
    skills: ['React', 'TypeScript', 'GraphQL', 'CSS', 'Testing'],
    expertise: ['Frontend', 'Performance', 'Accessibility'],
    projects: ['proj1', 'proj3'],
    problemsSolved: ['prob1', 'prob3'],
  },
  {
    id: 'p2',
    name: 'Marcus Johnson',
    role: 'DevOps Lead',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    email: 'marcus.johnson@company.com',
    skills: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'CI/CD'],
    expertise: ['DevOps', 'Cloud Infrastructure', 'Security'],
    projects: ['proj2', 'proj4'],
    problemsSolved: ['prob2', 'prob5'],
  },
  {
    id: 'p3',
    name: 'Emily Rodriguez',
    role: 'Machine Learning Engineer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    email: 'emily.rodriguez@company.com',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps', 'Data Science'],
    expertise: ['AI', 'Machine Learning', 'NLP'],
    projects: ['proj3', 'proj5'],
    problemsSolved: ['prob4'],
  },
  {
    id: 'p4',
    name: 'David Kim',
    role: 'Backend Engineer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    email: 'david.kim@company.com',
    skills: ['Node.js', 'PostgreSQL', 'Redis', 'GraphQL', 'Microservices'],
    expertise: ['Backend', 'API Design', 'Database Optimization'],
    projects: ['proj1', 'proj2', 'proj4'],
    problemsSolved: ['prob1', 'prob2'],
  },
  {
    id: 'p5',
    name: 'Priya Patel',
    role: 'Security Engineer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    email: 'priya.patel@company.com',
    skills: ['Security Auditing', 'Penetration Testing', 'OAuth', 'Encryption'],
    expertise: ['Security', 'Compliance', 'Identity Management'],
    projects: ['proj2', 'proj5'],
    problemsSolved: ['prob5', 'prob6'],
  },
  {
    id: 'p6',
    name: 'Alex Thompson',
    role: 'Full Stack Developer',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    email: 'alex.thompson@company.com',
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    expertise: ['Full Stack', 'System Design'],
    projects: ['proj1', 'proj3', 'proj4'],
    problemsSolved: ['prob3'],
  },
];

// Topics data
export const topics: Topic[] = [
  {
    id: 't1',
    name: 'Frontend Development',
    description: 'Modern frontend technologies, frameworks, and best practices for building responsive and accessible user interfaces.',
    icon: 'Monitor',
    technologies: ['React', 'TypeScript', 'Next.js', 'CSS', 'Tailwind', 'GraphQL'],
    tips: [
      'Use React Query for server state management to reduce boilerplate',
      'Implement code splitting with React.lazy() for better performance',
      'Always test components with React Testing Library for user-centric tests',
      'Use CSS custom properties for theming consistency',
    ],
    relatedProjects: ['proj1', 'proj3'],
    relatedProblems: ['prob1', 'prob3'],
    relatedPeople: ['p1', 'p6'],
  },
  {
    id: 't2',
    name: 'DevOps & Infrastructure',
    description: 'Cloud infrastructure, deployment pipelines, containerization, and operational excellence practices.',
    icon: 'Server',
    technologies: ['Kubernetes', 'Docker', 'AWS', 'Terraform', 'GitHub Actions', 'ArgoCD'],
    tips: [
      'Use Infrastructure as Code (IaC) for all cloud resources',
      'Implement GitOps workflows for consistent deployments',
      'Set up proper monitoring and alerting from day one',
      'Use feature flags for safe deployments',
    ],
    relatedProjects: ['proj2', 'proj4'],
    relatedProblems: ['prob2', 'prob5'],
    relatedPeople: ['p2', 'p4'],
  },
  {
    id: 't3',
    name: 'AI & Machine Learning',
    description: 'Machine learning systems, model deployment, and AI integration patterns for production applications.',
    icon: 'Brain',
    technologies: ['Python', 'TensorFlow', 'PyTorch', 'MLflow', 'Hugging Face', 'LangChain'],
    tips: [
      'Version your models and data alongside your code',
      'Start with simple models and iterate based on metrics',
      'Implement proper model monitoring in production',
      'Use vector databases for semantic search use cases',
    ],
    relatedProjects: ['proj3', 'proj5'],
    relatedProblems: ['prob4'],
    relatedPeople: ['p3'],
  },
  {
    id: 't4',
    name: 'Security',
    description: 'Application security, identity management, compliance, and secure development practices.',
    icon: 'Shield',
    technologies: ['OAuth 2.0', 'OIDC', 'HashiCorp Vault', 'SAST/DAST', 'WAF'],
    tips: [
      'Never store secrets in code - use secret managers',
      'Implement proper input validation on both client and server',
      'Regular security audits and penetration testing',
      'Use principle of least privilege for all access controls',
    ],
    relatedProjects: ['proj2', 'proj5'],
    relatedProblems: ['prob5', 'prob6'],
    relatedPeople: ['p5'],
  },
  {
    id: 't5',
    name: 'Backend Development',
    description: 'API design, database optimization, microservices architecture, and backend best practices.',
    icon: 'Database',
    technologies: ['Node.js', 'PostgreSQL', 'Redis', 'GraphQL', 'gRPC', 'RabbitMQ'],
    tips: [
      'Design APIs with clear versioning strategy from the start',
      'Use database connection pooling for scalability',
      'Implement proper caching strategies at multiple layers',
      'Write comprehensive API documentation with OpenAPI/Swagger',
    ],
    relatedProjects: ['proj1', 'proj2', 'proj4'],
    relatedProblems: ['prob1', 'prob2'],
    relatedPeople: ['p4', 'p6'],
  },
];

// Problems data
export const problems: Problem[] = [
  {
    id: 'prob1',
    title: 'GraphQL N+1 Query Performance Issues',
    status: 'solved',
    description: 'The customer dashboard was experiencing slow load times due to N+1 query problems in our GraphQL resolvers. Each customer query was triggering multiple database calls.',
    solution: 'Implemented DataLoader for batching and caching database requests. Added query complexity analysis to prevent expensive queries. Response times improved by 80%.',
    technologies: ['GraphQL', 'Node.js', 'PostgreSQL', 'DataLoader'],
    relatedProjects: ['proj1'],
    relatedPeople: ['p1', 'p4'],
    createdAt: '2024-08-15',
    solvedAt: '2024-09-02',
  },
  {
    id: 'prob2',
    title: 'Kubernetes Pod Memory Leaks in Production',
    status: 'solved',
    description: 'Production pods were experiencing OOM kills every few days. Memory usage was growing steadily without clear cause.',
    solution: 'Identified a connection pool that was not properly releasing connections. Implemented proper cleanup handlers and added memory monitoring dashboards.',
    technologies: ['Kubernetes', 'Node.js', 'Prometheus', 'Grafana'],
    relatedProjects: ['proj2', 'proj4'],
    relatedPeople: ['p2', 'p4'],
    createdAt: '2024-07-20',
    solvedAt: '2024-08-05',
  },
  {
    id: 'prob3',
    title: 'React Bundle Size Exceeding Performance Budget',
    status: 'solved',
    description: 'Our main React bundle grew to over 2MB, causing poor initial load times especially on mobile devices.',
    solution: 'Implemented code splitting, lazy loading for routes, and tree shaking. Replaced heavy libraries with lighter alternatives. Bundle reduced to 450KB.',
    technologies: ['React', 'Webpack', 'JavaScript'],
    relatedProjects: ['proj1', 'proj3'],
    relatedPeople: ['p1', 'p6'],
    createdAt: '2024-06-10',
    solvedAt: '2024-06-25',
  },
  {
    id: 'prob4',
    title: 'ML Model Inference Latency Too High',
    status: 'in-progress',
    description: 'Our recommendation model is taking 2+ seconds for inference, causing poor user experience in the product feed.',
    technologies: ['Python', 'TensorFlow', 'Redis', 'Docker'],
    relatedProjects: ['proj5'],
    relatedPeople: ['p3'],
    createdAt: '2024-10-01',
  },
  {
    id: 'prob5',
    title: 'Securing Internal APIs After Zero-Trust Migration',
    status: 'solved',
    description: 'After moving to a zero-trust architecture, internal services needed new authentication mechanisms for service-to-service communication.',
    solution: 'Implemented mTLS for all internal communication with automatic certificate rotation. Added service mesh with Istio for traffic management.',
    technologies: ['Kubernetes', 'Istio', 'mTLS', 'HashiCorp Vault'],
    relatedProjects: ['proj2'],
    relatedPeople: ['p2', 'p5'],
    createdAt: '2024-05-15',
    solvedAt: '2024-07-01',
  },
  {
    id: 'prob6',
    title: 'GDPR Compliance for User Data Export',
    status: 'open',
    description: 'We need to implement a user-friendly way for customers to request and receive all their personal data in a portable format.',
    technologies: ['Node.js', 'PostgreSQL', 'AWS S3'],
    relatedProjects: ['proj1'],
    relatedPeople: ['p5'],
    createdAt: '2024-10-15',
  },
];

// Projects data
export const projects: Project[] = [
  {
    id: 'proj1',
    name: 'Customer Portal 2.0',
    description: 'Complete redesign of the customer-facing portal with improved UX, performance, and new features.',
    context: 'The existing portal was built 5 years ago and needed modernization to meet current user expectations and support new business features.',
    techStack: ['React', 'TypeScript', 'GraphQL', 'Node.js', 'PostgreSQL'],
    status: 'active',
    relatedProblems: ['prob1', 'prob3', 'prob6'],
    team: ['p1', 'p4', 'p6'],
    startDate: '2024-03-01',
  },
  {
    id: 'proj2',
    name: 'Platform Migration to Kubernetes',
    description: 'Migrating all services from EC2-based deployment to a Kubernetes cluster for better scalability and reliability.',
    context: 'Growing infrastructure costs and deployment complexity drove the need for container orchestration.',
    techStack: ['Kubernetes', 'Docker', 'Terraform', 'AWS EKS', 'ArgoCD', 'Istio'],
    status: 'active',
    relatedProblems: ['prob2', 'prob5'],
    team: ['p2', 'p4', 'p5'],
    startDate: '2024-01-15',
  },
  {
    id: 'proj3',
    name: 'AI-Powered Search',
    description: 'Implementing semantic search across our documentation and product catalog using vector embeddings.',
    context: 'Users were struggling to find relevant information with keyword-based search. AI-powered semantic search will improve discoverability.',
    techStack: ['Python', 'LangChain', 'Pinecone', 'React', 'FastAPI'],
    status: 'active',
    relatedProblems: [],
    team: ['p1', 'p3', 'p6'],
    startDate: '2024-06-01',
  },
  {
    id: 'proj4',
    name: 'Real-time Analytics Dashboard',
    description: 'Building a real-time analytics platform for business metrics and operational monitoring.',
    context: 'Leadership needs real-time visibility into key business metrics. Current reporting has 24-hour delays.',
    techStack: ['React', 'Node.js', 'Apache Kafka', 'ClickHouse', 'WebSockets'],
    status: 'planning',
    relatedProblems: ['prob2'],
    team: ['p2', 'p4', 'p6'],
    startDate: '2024-11-01',
  },
  {
    id: 'proj5',
    name: 'Recommendation Engine v2',
    description: 'Next-generation product recommendation system using deep learning for personalized suggestions.',
    context: 'Current rule-based recommendations have low engagement. ML-based personalization expected to increase conversions by 15%.',
    techStack: ['Python', 'TensorFlow', 'Redis', 'FastAPI', 'Docker'],
    status: 'active',
    relatedProblems: ['prob4'],
    team: ['p3', 'p5'],
    startDate: '2024-08-01',
  },
];

// Automations data
export const automations: Automation[] = [
  {
    id: 'auto1',
    title: 'New Hire Onboarding',
    description: 'Automatically provision accounts, send welcome emails, and add new team members to the right channels and tools.',
    category: 'onboarding',
    triggerLabel: 'New user in HR system',
    videoThumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop',
    authors: [],
    docLink: 'https://drive.google.com/file/d/1abc-onboarding-runbook/view?usp=sharing',
    steps: [
      { order: 1, title: 'Detect new hire', description: 'Webhook triggers when a new employee is added to the HR system.' },
      { order: 2, title: 'Create accounts', description: 'Provision Slack, Google Workspace, and internal tools via APIs.' },
      { order: 3, title: 'Send welcome pack', description: 'Email welcome letter and onboarding checklist to the new hire.' },
      { order: 4, title: 'Add to channels', description: 'Add user to team Slack channels and assign onboarding buddy.' },
    ],
  },
  {
    id: 'auto2',
    title: 'Staging to Production Deploy',
    description: 'Run tests on staging, then promote to production with approval and automatic rollback on failure.',
    category: 'deployment',
    triggerLabel: 'Merge to main',
    videoThumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=450&fit=crop',
    authors: [],
    docLink: 'https://docs.google.com/document/d/2def-deploy-playbook/edit',
    steps: [
      { order: 1, title: 'Build & test', description: 'CI runs unit and integration tests on the new commit.' },
      { order: 2, title: 'Deploy to staging', description: 'Deploy to staging environment and run E2E tests.' },
      { order: 3, title: 'Approval gate', description: 'Notify team lead; deployment proceeds after approval or timeout.' },
      { order: 4, title: 'Production deploy', description: 'Deploy to production with health checks and automatic rollback on failure.' },
    ],
  },
  {
    id: 'auto3',
    title: 'Alert Triage & Escalation',
    description: 'When an alert fires, enrich with context, notify the right on-call engineer, and escalate if unresolved.',
    category: 'monitoring',
    triggerLabel: 'PagerDuty alert',
    videoThumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    authors: [],
    docLink: 'https://drive.google.com/file/d/3ghi-alert-runbook.pdf/view',
    steps: [
      { order: 1, title: 'Receive alert', description: 'PagerDuty sends incident to this workflow.' },
      { order: 2, title: 'Enrich context', description: 'Fetch recent deploys, logs, and metrics for the affected service.' },
      { order: 3, title: 'Notify on-call', description: 'Send Slack message and push notification to the current on-call engineer.' },
      { order: 4, title: 'Escalate if needed', description: 'If not acknowledged in 15 min, escalate to team lead and create Jira ticket.' },
    ],
  },
  {
    id: 'auto4',
    title: 'PR Review Reminders',
    description: 'Remind reviewers when PRs are waiting, and ping the author when reviews are complete.',
    category: 'notifications',
    triggerLabel: 'PR opened or updated',
    videoThumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop',
    authors: [],
    docLink: 'https://docs.google.com/document/d/4jkl-pr-reminders-setup/edit',
    steps: [
      { order: 1, title: 'PR created', description: 'GitHub webhook fires when a PR is opened or new commits are pushed.' },
      { order: 2, title: 'Assign reviewers', description: 'Auto-assign reviewers based on code ownership or round-robin.' },
      { order: 3, title: 'Remind reviewers', description: 'Send Slack reminder after 24h if PR has no reviews.' },
      { order: 4, title: 'Notify author', description: 'When all reviews are done, notify the author to address feedback or merge.' },
    ],
  },
  {
    id: 'auto5',
    title: 'Daily Sync: CRM to Analytics',
    description: 'Sync customer and deal data from Salesforce to the data warehouse every night for reporting.',
    category: 'data-sync',
    triggerLabel: 'Scheduled 2am UTC',
    videoThumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop',
    authors: [],
    docLink: 'https://drive.google.com/file/d/5mno-crm-sync-spec.docx/view',
    steps: [
      { order: 1, title: 'Extract from Salesforce', description: 'Query changed accounts, contacts, and opportunities since last run.' },
      { order: 2, title: 'Transform', description: 'Map fields, deduplicate, and apply business rules.' },
      { order: 3, title: 'Load to warehouse', description: 'Upsert into BigQuery tables used by BI tools.' },
      { order: 4, title: 'Notify on failure', description: 'If any step fails, send alert to data team and retry once.' },
    ],
  },
  {
    id: 'auto6',
    title: 'Customer Support Ticket Routing',
    description: 'Route incoming support tickets to the right team based on product and priority.',
    category: 'other',
    triggerLabel: 'New ticket in Zendesk',
    videoThumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
    authors: [],
    docLink: 'https://docs.google.com/document/d/6pqr-ticket-routing-guide/edit',
    steps: [
      { order: 1, title: 'Parse ticket', description: 'Extract product, priority, and customer tier from the ticket.' },
      { order: 2, title: 'Match rules', description: 'Apply routing rules (e.g. billing → finance, bug → engineering).' },
      { order: 3, title: 'Assign queue', description: 'Add ticket to the correct team queue in Zendesk.' },
      { order: 4, title: 'Slack notification', description: 'Post in the team channel with ticket summary and link.' },
    ],
  },
  // Developer-focused automations
  {
    id: 'auto7',
    title: 'Automatic Translations',
    description: 'When new or updated copy is merged, extract translation keys, send to translation service, and open a PR with updated locale files.',
    category: 'development',
    triggerLabel: 'Merge to main (i18n paths)',
    videoThumbnail: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&h=450&fit=crop',
    githubUrl: 'https://github.com/company-compass/automation-i18n',
    stepsWithAI: [2, 3],
    benefits: ['-40% time on i18n updates', '+60% locale coverage', '-50% manual translation requests'],
    authors: ['p1', 'p6'],
    steps: [
      { order: 1, title: 'Detect i18n changes', description: 'CI detects changes under locales/ or to translation keys in code.' },
      { order: 2, title: 'Extract new keys', description: 'AI extracts missing keys and suggests context for translators; builds payload for translation API.' },
      { order: 3, title: 'Fetch translations', description: 'AI-assisted translation service (e.g. Lokalise, Phrase) for configured target locales.' },
      { order: 4, title: 'Open translation PR', description: 'Create a branch, update JSON/YAML locale files, and open PR for review.' },
    ],
  },
  {
    id: 'auto8',
    title: 'E2E Assistant',
    description: 'On PR open or test failure, suggest or generate E2E tests for changed flows and run them in a sandbox environment.',
    category: 'development',
    triggerLabel: 'PR opened or E2E failure',
    videoThumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=450&fit=crop',
    githubUrl: 'https://github.com/company-compass/e2e-assistant-workflow',
    stepsWithAI: [1, 2, 3],
    benefits: ['-30% writing test time', '+50% E2E coverage', '-60% flaky test triage time'],
    authors: ['p1', 'p6'],
    steps: [
      { order: 1, title: 'Analyze changed code', description: 'AI parses PR diff to identify affected routes, components, and user flows.' },
      { order: 2, title: 'Suggest test scenarios', description: 'AI suggests E2E scenarios (Playwright/Cypress) for critical paths.' },
      { order: 3, title: 'Generate or run tests', description: 'AI generates test skeleton; run existing and new E2E in sandbox.' },
      { order: 4, title: 'Post results to PR', description: 'Comment on PR with test results, coverage delta, and links to artifacts.' },
    ],
  },
  {
    id: 'auto9',
    title: 'Autocomplete Test Data Forms',
    description: 'When a developer focuses a form in dev/staging, suggest realistic test data and one-click fill for all fields.',
    category: 'development',
    triggerLabel: 'Form focus in dev/staging',
    videoThumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=450&fit=crop',
    githubUrl: 'https://github.com/company-compass/form-test-data-extension',
    stepsWithAI: [2, 3],
    benefits: ['-45% form testing time', '+35% test data variety', 'Fewer invalid submissions'],
    authors: ['p1', 'p4'],
    steps: [
      { order: 1, title: 'Detect form context', description: 'Browser extension or dev overlay detects form in a dev/staging origin.' },
      { order: 2, title: 'Infer field types', description: 'AI uses labels, placeholders, and input types to map fields to data kinds (email, name, etc.).' },
      { order: 3, title: 'Generate test data', description: 'AI fills from Faker-like library or team-defined fixtures (e.g. valid VAT, addresses).' },
      { order: 4, title: 'One-click apply', description: 'Developer clicks "Fill test data"; form is populated and optionally submitted for quick checks.' },
    ],
  },
  {
    id: 'auto10',
    title: 'SonarQube Issue Autofix',
    description: 'When SonarQube reports new issues on a branch, attempt automatic fixes and push a follow-up commit or comment with suggestions.',
    category: 'development',
    triggerLabel: 'SonarQube quality gate',
    videoThumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop',
    githubUrl: 'https://github.com/company-compass/sonarqube-autofix-action',
    stepsWithAI: [2, 3],
    benefits: ['-55% time fixing code smells', '+25% auto-fixed issues', 'Faster quality gate pass'],
    authors: ['p4', 'p5'],
    steps: [
      { order: 1, title: 'Fetch SonarQube report', description: 'After analysis, retrieve new issues (bugs, vulnerabilities, code smells) for the branch.' },
      { order: 2, title: 'Classify fixable issues', description: 'AI filters issues that have known autofix patterns and suggests safe fixes.' },
      { order: 3, title: 'Apply fixes', description: 'LLM-assisted patches fix safe issues; run linter/tests to validate.' },
      { order: 4, title: 'Push or comment', description: 'Push a commit with fixes or post a PR comment with suggested patches and links to Sonar.' },
    ],
  },
  {
    id: 'auto11',
    title: 'Daily Recap Summary',
    description: 'Every morning, aggregate commits, PRs, reviews, and deploy activity into a short daily recap and post it in the team channel.',
    category: 'development',
    triggerLabel: 'Scheduled 8:00 AM',
    videoThumbnail: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=450&fit=crop',
    githubUrl: 'https://github.com/company-compass/daily-recap-workflow',
    stepsWithAI: [2, 3],
    benefits: ['-70% time reading updates', '+40% team awareness', 'Fewer missed follow-ups'],
    authors: ['p2', 'p6'],
    steps: [
      { order: 1, title: 'Collect activity', description: 'Query GitHub/GitLab and CI for last 24h: merges, open PRs, reviews, deploys, failed builds.' },
      { order: 2, title: 'Build summary', description: 'AI summarizes by repo and author; highlights blocked PRs, new bugs, and success metrics.' },
      { order: 3, title: 'Generate digest', description: 'AI formats a short markdown or Slack message with sections and links.' },
      { order: 4, title: 'Post to channel', description: 'Send daily recap to #engineering or team-specific Slack channel.' },
    ],
  },
];

// Helper functions to get related data
export const getPersonById = (id: string) => people.find(p => p.id === id);
export const getTopicById = (id: string) => topics.find(t => t.id === id);
export const getProblemById = (id: string) => problems.find(p => p.id === id);
export const getProjectById = (id: string) => projects.find(p => p.id === id);
export const getAutomationById = (id: string) => automations.find(a => a.id === id);

export const getPersonsByIds = (ids: string[]) => ids.map(id => getPersonById(id)).filter(Boolean) as Person[];
export const getTopicsByIds = (ids: string[]) => ids.map(id => getTopicById(id)).filter(Boolean) as Topic[];
export const getProblemsByIds = (ids: string[]) => ids.map(id => getProblemById(id)).filter(Boolean) as Problem[];
export const getProjectsByIds = (ids: string[]) => ids.map(id => getProjectById(id)).filter(Boolean) as Project[];
export const getAutomationsByIds = (ids: string[]) => ids.map(id => getAutomationById(id)).filter(Boolean) as Automation[];

export const getAutomationsByAuthor = (personId: string) =>
  automations.filter((a) => a.authors?.includes(personId));

// Search function
export const searchAll = (query: string) => {
  const q = query.toLowerCase();
  
  const matchedPeople = people.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.role.toLowerCase().includes(q) ||
    p.skills.some(s => s.toLowerCase().includes(q)) ||
    p.expertise.some(e => e.toLowerCase().includes(q))
  );

  const matchedTopics = topics.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.technologies.some(tech => tech.toLowerCase().includes(q))
  );

  const matchedProblems = problems.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.technologies.some(t => t.toLowerCase().includes(q))
  );

  const matchedProjects = projects.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.techStack.some(t => t.toLowerCase().includes(q))
  );

  const matchedAutomations = automations.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q) ||
    a.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
  );

  return {
    people: matchedPeople,
    topics: matchedTopics,
    problems: matchedProblems,
    projects: matchedProjects,
    automations: matchedAutomations,
    hasResults: matchedPeople.length > 0 || matchedTopics.length > 0 || matchedProblems.length > 0 || matchedProjects.length > 0 || matchedAutomations.length > 0,
  };
};
