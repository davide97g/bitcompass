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

// Helper functions to get related data
export const getPersonById = (id: string) => people.find(p => p.id === id);
export const getTopicById = (id: string) => topics.find(t => t.id === id);
export const getProblemById = (id: string) => problems.find(p => p.id === id);
export const getProjectById = (id: string) => projects.find(p => p.id === id);

export const getPersonsByIds = (ids: string[]) => ids.map(id => getPersonById(id)).filter(Boolean) as Person[];
export const getTopicsByIds = (ids: string[]) => ids.map(id => getTopicById(id)).filter(Boolean) as Topic[];
export const getProblemsByIds = (ids: string[]) => ids.map(id => getProblemById(id)).filter(Boolean) as Problem[];
export const getProjectsByIds = (ids: string[]) => ids.map(id => getProjectById(id)).filter(Boolean) as Project[];

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

  return {
    people: matchedPeople,
    topics: matchedTopics,
    problems: matchedProblems,
    projects: matchedProjects,
    hasResults: matchedPeople.length > 0 || matchedTopics.length > 0 || matchedProblems.length > 0 || matchedProjects.length > 0,
  };
};
