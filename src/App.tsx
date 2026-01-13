import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignIn } from './components/SignIn';
import { SignUp } from './components/SignUp';
import { Landing } from './pages/Landing';
import { MealDetails } from './pages/MealDetails';
import { Dashboard } from './pages/Dashboard';
import { Subscribe } from './pages/Subscribe';
import { CustomerWallet } from './pages/CustomerWallet';
import { AdminPanel } from './pages/AdminPanel';
import { KitchenDashboard } from './pages/KitchenDashboard';
import { DeliveryDashboard } from './pages/DeliveryDashboard';
import { PageViewer } from './pages/PageViewer';
import { supabase } from './lib/supabase';

function AuthPage() {
  const [showSignIn, setShowSignIn] = useState(true);

  return showSignIn ? (
    <SignIn onToggle={() => setShowSignIn(false)} />
  ) : (
    <SignUp onToggle={() => setShowSignIn(true)} />
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={<Landing />}
      />
      <Route
        path="/meals/:id"
        element={<MealDetails />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscribe"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <Subscribe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerWallet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['kitchen_staff']}>
            <KitchenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={['delivery_person']}>
            <DeliveryDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/page/:slug"
        element={
          <ProtectedRoute>
            <PageViewer />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function CustomCSSInjector() {
  useEffect(() => {
    const loadCustomCSS = async () => {
      try {
        const existingStyle = document.getElementById('custom-css');
        if (existingStyle) {
          existingStyle.remove();
        }

        const { data, error } = await supabase
          .from('custom_css')
          .select('*')
          .eq('is_enabled', true)
          .maybeSingle();

        if (error) throw error;

        if (data && data.css_content) {
          const styleElement = document.createElement('style');
          styleElement.id = 'custom-css';
          styleElement.setAttribute('type', 'text/css');
          styleElement.textContent = data.css_content;
          document.head.appendChild(styleElement);
        }
      } catch (error) {
        console.error('Error loading custom CSS:', error);
      }
    };

    loadCustomCSS();

    const channel = supabase
      .channel('custom_css_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_css'
        },
        () => {
          loadCustomCSS();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      const styleElement = document.getElementById('custom-css');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CustomCSSInjector />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
