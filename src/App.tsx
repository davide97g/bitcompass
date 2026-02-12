import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Pages
import ActivityLogDayDetailPage from "./pages/ActivityLogDayDetailPage";
import ActivityLogDetailPage from "./pages/ActivityLogDetailPage";
import ActivityLogsPage from "./pages/ActivityLogsPage";
import AutomationDetailPage from "./pages/AutomationDetailPage";
import AutomationsPage from "./pages/AutomationsPage";
import CLIPage from "./pages/CLIPage";
import CompassProjectDetailPage from "./pages/CompassProjectDetailPage";
import CompassProjectsPage from "./pages/CompassProjectsPage";
import GlossaryPage from "./pages/GlossaryPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import MCPPage from "./pages/MCPPage";
import NotFound from "./pages/NotFound";
import PeoplePage from "./pages/PeoplePage";
import PersonDetailPage from "./pages/PersonDetailPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import ProblemsPage from "./pages/ProblemsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectsPage from "./pages/ProjectsPage";
import RuleDetailPage from "./pages/RuleDetailPage";
import RulesPage from "./pages/RulesPage";
import TopicDetailPage from "./pages/TopicDetailPage";
import TopicsPage from "./pages/TopicsPage";
import WelcomePage from "./pages/WelcomePage";

// Layout
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RootRedirect } from "./components/RootRedirect";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          
          {/* Root: recover OAuth hash before any redirect */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* App routes with layout (auth required when Supabase configured) */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path="/home" element={<HomePage />} />
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
            <Route path="/compass-projects" element={<CompassProjectsPage />} />
            <Route path="/compass-projects/:id" element={<CompassProjectDetailPage />} />
            <Route path="/logs" element={<ActivityLogsPage />} />
            <Route path="/logs/day/:date" element={<ActivityLogDayDetailPage />} />
            <Route path="/logs/:id" element={<ActivityLogDetailPage />} />
            <Route path="/cli" element={<CLIPage />} />
            <Route path="/mcp" element={<MCPPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
