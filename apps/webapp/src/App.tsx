import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Lazy-loaded pages
const AutomationDetailPage = lazy(() => import("./pages/AutomationDetailPage"));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const CLIPage = lazy(() => import("./pages/CLIPage"));
const CompassProjectDetailPage = lazy(() => import("./pages/CompassProjectDetailPage"));
const CompassProjectsPage = lazy(() => import("./pages/CompassProjectsPage"));
const GlossaryPage = lazy(() => import("./pages/GlossaryPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MCPPage = lazy(() => import("./pages/MCPPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PeoplePage = lazy(() => import("./pages/PeoplePage"));
const PersonDetailPage = lazy(() => import("./pages/PersonDetailPage"));
const ProblemDetailPage = lazy(() => import("./pages/ProblemDetailPage"));
const ProblemsPage = lazy(() => import("./pages/ProblemsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const RuleDetailPage = lazy(() => import("./pages/RuleDetailPage"));
const GroupDetailPage = lazy(() => import("./pages/GroupDetailPage"));
const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const UserDetailPage = lazy(() => import("./pages/UserDetailPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const TopicDetailPage = lazy(() => import("./pages/TopicDetailPage"));
const TopicsPage = lazy(() => import("./pages/TopicsPage"));
const WelcomePage = lazy(() => import("./pages/WelcomePage"));

// Layout (kept eager — they're needed on every route)
import { AppLock } from "./components/AppLock";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RootRedirect } from "./components/RootRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Suspense>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Root: recover OAuth hash before any redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* App routes with layout (auth required when Supabase configured) */}
          <Route element={
            <RequireAuth>
              <AppLock>
                <AppLayout />
              </AppLock>
            </RequireAuth>
          }>
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/topics/:id" element={<TopicDetailPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/people" element={<PeoplePage />} />
            <Route path="/people/:id" element={<PersonDetailPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/automations/:id" element={<AutomationDetailPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/rules/:id" element={<RuleDetailPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/compass-projects" element={<CompassProjectsPage />} />
            <Route path="/compass-projects/:id" element={<CompassProjectDetailPage />} />
            <Route path="/cli" element={<CLIPage />} />
            <Route path="/mcp" element={<MCPPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
