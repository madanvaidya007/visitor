import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import Index from "./pages/Index";
import AuthPage from "./components/auth/AuthPage";
import NotFound from "./pages/NotFound";
import Profile from "./pages/visitor/Profile";
import VisitRequests from "./pages/visitor/VisitRequests";
import MyVisits from "./pages/visitor/MyVisits";
import Documents from "./pages/visitor/Documents";
import VisitorRequests from "./pages/host/VisitorRequests";
import MyVisitors from "./pages/host/MyVisitors";
import InviteVisitor from "./pages/host/InviteVisitor";
import ZoneAccess from "./pages/host/ZoneAccess";
import ScanQRCode from "./pages/security/ScanQRCode";
import ZoneMonitoring from "./pages/security/ZoneMonitoring";
import SecurityAlerts from "./pages/security/SecurityAlerts";
import Evacuation from "./pages/security/Evacuation";
import GuardDashboard from "./pages/guard/GuardDashboard";
import { FaceRecognitionDashboard } from "./components/FaceRecognition/FaceRecognitionDashboard";
import { AdminDashboard } from "./components/dashboard/AdminDashboard";
import QuickRegistration from "./pages/reception/QuickRegistration";
import VisitorQueue from "./pages/reception/VisitorQueue";
import GeneratePass from "./pages/reception/GeneratePass";
import VisitorSearch from "./pages/reception/VisitorSearch";
import ZoneManagement from "./pages/reception/ZoneManagement";
import UserManagement from "./pages/reception/UserManagement";
import Reports from "./pages/reception/Reports";
import Blacklist from "./pages/reception/Blacklist";
import Analytics from "./pages/reception/Analytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={
            <DashboardLayout>
              <Index />
            </DashboardLayout>
          } />
          
          {/* Visitor Routes */}
          <Route path="/profile" element={
            <DashboardLayout>
              <Profile />
            </DashboardLayout>
          } />
          <Route path="/visit-requests" element={
            <DashboardLayout>
              <VisitRequests />
            </DashboardLayout>
          } />
          <Route path="/my-visits" element={
            <DashboardLayout>
              <MyVisits />
            </DashboardLayout>
          } />
          <Route path="/documents" element={
            <DashboardLayout>
              <Documents />
            </DashboardLayout>
          } />
          
          {/* Host Routes */}
          <Route path="/visitor-requests" element={
            <DashboardLayout>
              <VisitorRequests />
            </DashboardLayout>
          } />
          <Route path="/my-visitors" element={
            <DashboardLayout>
              <MyVisitors />
            </DashboardLayout>
          } />
          <Route path="/invite-visitor" element={
            <DashboardLayout>
              <InviteVisitor />
            </DashboardLayout>
          } />
          <Route path="/zones" element={
            <DashboardLayout>
              <ZoneAccess />
            </DashboardLayout>
          } />
          
          {/* Reception Routes */}
          <Route path="/quick-registration" element={
            <DashboardLayout>
              <QuickRegistration />
            </DashboardLayout>
          } />
          <Route path="/visitor-queue" element={
            <DashboardLayout>
              <VisitorQueue />
            </DashboardLayout>
          } />
          <Route path="/generate-pass" element={
            <DashboardLayout>
              <GeneratePass />
            </DashboardLayout>
          } />
          <Route path="/visitor-search" element={
            <DashboardLayout>
              <VisitorSearch />
            </DashboardLayout>
          } />
          <Route path="/zone-management" element={
            <DashboardLayout>
              <ZoneManagement />
            </DashboardLayout>
          } />
          
          {/* Admin Routes */}
          <Route path="/users" element={
            <DashboardLayout>
              <UserManagement />
            </DashboardLayout>
          } />
          <Route path="/reports" element={
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          } />
          <Route path="/settings" element={
            <DashboardLayout>
              <AdminDashboard />
            </DashboardLayout>
          } />
          <Route path="/blacklist" element={
            <DashboardLayout>
              <Blacklist />
            </DashboardLayout>
          } />
          <Route path="/analytics" element={
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          } />
          
          {/* Security Routes */}
          <Route path="/scan-qr" element={
            <DashboardLayout>
              <ScanQRCode />
            </DashboardLayout>
          } />
          <Route path="/zone-monitoring" element={
            <DashboardLayout>
              <ZoneMonitoring />
            </DashboardLayout>
          } />
          <Route path="/alerts" element={
            <DashboardLayout>
              <SecurityAlerts />
            </DashboardLayout>
          } />
          <Route path="/evacuation" element={
            <DashboardLayout>
              <Evacuation />
            </DashboardLayout>
          } />
          <Route path="/visitor-tracking" element={
            <DashboardLayout>
              <div>Visitor Tracking Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/face-recognition" element={
            <DashboardLayout>
              <FaceRecognitionDashboard />
            </DashboardLayout>
          } />
          
          {/* Guard Routes */}
          <Route path="/guard-dashboard" element={
            <DashboardLayout>
              <GuardDashboard />
            </DashboardLayout>
          } />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
