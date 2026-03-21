import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// Lazy-loaded pages
const CLIPage = lazy(() => import("./pages/CLIPage"));
const CompassProjectDetailPage = lazy(() => import("./pages/CompassProjectDetailPage"));
const CompassProjectsPage = lazy(() => import("./pages/CompassProjectsPage"));
const GlossaryPage = lazy(() => import("./pages/GlossaryPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const MCPPage = lazy(() => import("./pages/MCPPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const RuleDetailPage = lazy(() => import("./pages/RuleDetailPage"));
const GroupDetailPage = lazy(() => import("./pages/GroupDetailPage"));
const GroupsPage = lazy(() => import("./pages/GroupsPage"));
const RulesPage = lazy(() => import("./pages/RulesPage"));
const StatsPage = lazy(() => import("./pages/StatsPage"));
const UserDetailPage = lazy(() => import("./pages/UserDetailPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const WelcomePage = lazy(() => import("./pages/WelcomePage"));
const LandingPage = lazy(() => import("./pages/landing/LandingPage"));

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
          <Route path="/landing" element={<LandingPage />} />
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
            <Route path="/skills" element={<RulesPage />} />
            <Route path="/skills/:id" element={<RuleDetailPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:id" element={<GroupDetailPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/projects" element={<CompassProjectsPage />} />
            <Route path="/projects/:id" element={<CompassProjectDetailPage />} />
            <Route path="/cli" element={<CLIPage />} />
            <Route path="/mcp" element={<MCPPage />} />
            <Route path="/stats" element={<StatsPage />} />
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
