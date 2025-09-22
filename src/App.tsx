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
              <div>Quick Registration Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/visitor-queue" element={
            <DashboardLayout>
              <div>Visitor Queue Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/generate-pass" element={
            <DashboardLayout>
              <div>Generate Pass Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/visitor-search" element={
            <DashboardLayout>
              <div>Visitor Search Page - Coming Soon</div>
            </DashboardLayout>
          } />
          
          {/* Admin Routes */}
          <Route path="/users" element={
            <DashboardLayout>
              <div>User Management Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/reports" element={
            <DashboardLayout>
              <div>Reports Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/settings" element={
            <DashboardLayout>
              <div>System Settings Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/blacklist" element={
            <DashboardLayout>
              <div>Blacklist Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/analytics" element={
            <DashboardLayout>
              <div>Analytics Page - Coming Soon</div>
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
              <div>Zone Monitoring Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/alerts" element={
            <DashboardLayout>
              <div>Security Alerts Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/evacuation" element={
            <DashboardLayout>
              <div>Evacuation Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/visitor-tracking" element={
            <DashboardLayout>
              <div>Visitor Tracking Page - Coming Soon</div>
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
