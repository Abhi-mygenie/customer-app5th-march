import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { RestaurantConfigProvider } from './context/RestaurantConfigContext';
import CartWrapper from './components/CartWrapper/CartWrapper';
import CartBar from './components/CartBar/CartBar';
import LandingPage from './pages/LandingPage';
import DiningMenu from './pages/DiningMenu';
import MenuItems from './pages/MenuItems';
import AboutUs from './pages/AboutUs';
import ContactPage from './pages/ContactPage';
import FeedbackPage from './pages/FeedbackPage';
import ReviewOrder from './pages/ReviewOrder';
import OrderSuccess from './pages/OrderSuccess';
import Login from './pages/Login';
import Profile from './pages/Profile';
import AdminSettings from './pages/AdminSettings';
import PasswordSetup from './pages/PasswordSetup';
import ScrollToTop from './components/ScrollToTop/scrollToTop';

// Create a QueryClient instance with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 10 minutes
      staleTime: 10 * 60 * 1000, // 10 minutes
      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (optional, can be disabled)
      refetchOnWindowFocus: false,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RestaurantConfigProvider>
        <Router>
        <ScrollToTop />
          <CartWrapper>
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/:restaurantId/password-setup" element={<PasswordSetup />} />
              
              {/* Most specific routes first - Station routes with restaurant ID */}
              <Route path="/:restaurantId/menu" element={<MenuItems />} />
              <Route path="/:restaurantId/menu/:stationId" element={<MenuItems />} />

              
              {/* Menu routes with restaurant ID */}
              <Route path="/:restaurantId/stations" element={<DiningMenu />} />
              
              {/* About Us page with restaurant ID */}
              <Route path="/:restaurantId/about" element={<AboutUs />} />
              
              {/* Contact page with restaurant ID */}
              <Route path="/:restaurantId/contact" element={<ContactPage />} />
              
              {/* Feedback page with restaurant ID */}
              <Route path="/:restaurantId/feedback" element={<FeedbackPage />} />
              
              {/* Review Order page with restaurant ID */}
              <Route path="/:restaurantId/review-order" element={<ReviewOrder />} />

              {/* Review Order page with restaurant ID and station ID */}
              <Route path="/:restaurantId/:stationId/review-order" element={<ReviewOrder />} />
              
              {/* Order Success page with restaurant ID */}
              <Route path="/:restaurantId/order-success" element={<OrderSuccess />} />
        
              {/* Landing page with restaurant ID */}
              <Route path="/:restaurantId" element={<LandingPage />} />
              
              {/* Fallback routes (without restaurant ID) */}
              <Route path="/menu/:stationId" element={<MenuItems />} />
              <Route path="/menu" element={<DiningMenu />} />
              {/* <Route path="/order-success" element={<OrderSuccess />} /> */}
              <Route path="/" element={<LandingPage />} />
            </Routes>
            <CartBar />
          </CartWrapper>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-dark)',
                color: 'var(--text-white)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-md)',
                fontFamily: 'var(--font-body)',
              },
            }}
          />
        </Router>
        </RestaurantConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
