import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UserRoleProvider } from "./contexts/UserRoleContext";
import { AppLayout } from "./components/layout/AppLayout";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import RestaurantDashboard from "./pages/dashboard/RestaurantDashboard";
import { useAuth } from "./contexts/AuthContext";
import DeliveriesPage from "./pages/DeliveriesPage";
import DeliveryDetailPage from "./pages/DeliveryDetailPage";
import SuppliersPage from "./pages/SuppliersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import RestaurantProfilePage from "./pages/RestaurantProfilePage";
import UploadReceiptPage from "./pages/UploadReceiptPage";
import NotFound from "./pages/NotFound";
import OnboardingPage from "./components/onboarding/OnboardingPage";

// Supplier Pages
import {
  SupplierDashboard,
  IncomingOrders,
  OutgoingDeliveries,
  DeliveryIssues,
  ProductCatalog,
  ConnectedRestaurants,
  SupplierAnalytics,
  RestaurantDetailPage
} from "./pages/supplier";

const queryClient = new QueryClient();

import { useEnsureUserRecord } from '@/hooks/useEnsureUserRecord';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  useEnsureUserRecord(); // Run auto-repair on all protected routes

  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function DashboardRoute() {
  const { user } = useAuth();

  if (!user) return null;

  // If no role is set, user MUST go to onboarding
  if (!user.role) {
    return <Navigate to="/onboarding" replace />;
  }

  return user.role === 'restaurant' ? <RestaurantDashboard /> : <AppLayout><SupplierDashboard /></AppLayout>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        <>
          <SignedIn>
            <Navigate to="/dashboard" replace />
          </SignedIn>
          <SignedOut>
            <LandingPage />
          </SignedOut>
        </>
      } />

      {/* Auth routes with Clerk */}
      <Route path="/login/*" element={
        <>
          <SignedIn>
            <Navigate to="/dashboard" replace />
          </SignedIn>
          <SignedOut>
            <LoginPage />
          </SignedOut>
        </>
      } />
      <Route path="/signup/*" element={
        <>
          <SignedIn>
            <Navigate to="/dashboard" replace />
          </SignedIn>
          <SignedOut>
            <SignupPage />
          </SignedOut>
        </>
      } />

      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRoute /></ProtectedRoute>} />
      <Route path="/deliveries" element={<ProtectedRoute><DeliveriesPage /></ProtectedRoute>} />
      <Route path="/deliveries/:deliveryId" element={<ProtectedRoute><DeliveryDetailPage /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute><SuppliersPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/restaurant/profile" element={<ProtectedRoute><RestaurantProfilePage /></ProtectedRoute>} />
      <Route path="/extract-receipt" element={<ProtectedRoute><UploadReceiptPage /></ProtectedRoute>} />
      <Route path="/verify-delivery/:deliveryId" element={<ProtectedRoute><UploadReceiptPage /></ProtectedRoute>} />

      {/* Supplier routes */}
      <Route path="/supplier/dashboard" element={<ProtectedRoute><AppLayout><SupplierDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/orders" element={<ProtectedRoute><AppLayout><IncomingOrders /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/deliveries" element={<ProtectedRoute><AppLayout><OutgoingDeliveries /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/issues" element={<ProtectedRoute><AppLayout><DeliveryIssues /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/products" element={<ProtectedRoute><AppLayout><ProductCatalog /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/restaurants" element={<ProtectedRoute><AppLayout><ConnectedRestaurants /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/restaurant/:restaurantId" element={<ProtectedRoute><AppLayout><RestaurantDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/supplier/analytics" element={<ProtectedRoute><AppLayout><SupplierAnalytics /></AppLayout></ProtectedRoute>} />

      {/* Onboarding */}
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes >
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <UserRoleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </UserRoleProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
