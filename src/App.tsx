import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Pages
import CreateEntryPage from "@/pages/CreateEntryPage";
import AssistantPage from "./pages/AssistantPage";
import AutomationDetailPage from "./pages/AutomationDetailPage";
import AutomationsPage from "./pages/AutomationsPage";
import CLIPage from "./pages/CLIPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import PeoplePage from "./pages/PeoplePage";
import PersonDetailPage from "./pages/PersonDetailPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import ProblemsPage from "./pages/ProblemsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import ActivityLogDetailPage from "./pages/ActivityLogDetailPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import RuleDetailPage from "./pages/RuleDetailPage";
import RulesPage from "./pages/RulesPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import TopicsPage from "./pages/TopicsPage";

// Layout
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RootRedirect } from "./components/RootRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Root: recover OAuth hash before any redirect */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* App routes with layout (auth required when Supabase configured) */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
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
            <Route path="/logs" element={<ActivityLogsPage />} />
            <Route path="/logs/:id" element={<ActivityLogDetailPage />} />
            <Route path="/cli" element={<CLIPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/create" element={<CreateEntryPage />} />
            <Route path="/create/:type" element={<CreateEntryPage />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
