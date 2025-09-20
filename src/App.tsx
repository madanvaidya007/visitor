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
              <div>Visit Requests Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/my-visits" element={
            <DashboardLayout>
              <div>My Visits Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/documents" element={
            <DashboardLayout>
              <div>Documents Page - Coming Soon</div>
            </DashboardLayout>
          } />
          
          {/* Host Routes */}
          <Route path="/visitor-requests" element={
            <DashboardLayout>
              <div>Visitor Requests Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/my-visitors" element={
            <DashboardLayout>
              <div>My Visitors Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/invite-visitor" element={
            <DashboardLayout>
              <div>Invite Visitor Page - Coming Soon</div>
            </DashboardLayout>
          } />
          <Route path="/zones" element={
            <DashboardLayout>
              <div>Zone Access Page - Coming Soon</div>
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
              <div>Scan QR Code Page - Coming Soon</div>
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
