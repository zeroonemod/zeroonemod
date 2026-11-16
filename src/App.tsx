import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { HomePage } from '@/pages/HomePage';
import { SubmitPage } from '@/pages/SubmitPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { EcuServicesPage } from '@/pages/EcuServicesPage';
import { TcuServicesPage } from '@/pages/TcuServicesPage';
import { HowItWorksPage } from '@/pages/HowItWorksPage';
import { B2BPartnershipsPage } from '@/pages/B2BPartnershipsPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsPage } from '@/pages/TermsPage';
import { CookiePolicyPage } from '@/pages/CookiePolicyPage';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ComingSoonPage } from '@/components/layout/ComingSoonPage';
import { SubmissionFilesProvider } from '@/features/submission/SubmissionFilesContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RequireAuth } from '@/features/auth/RequireAuth';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubmissionFilesProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/submit" element={<SubmitPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/ecu-services" element={<EcuServicesPage />} />
            <Route path="/tcu-services" element={<TcuServicesPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/b2b-partnerships" element={<B2BPartnershipsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookie-policy" element={<CookiePolicyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/dashboard/jobs/:reference" element={<RequireAuth><JobDetailPage /></RequireAuth>} />
            <Route path="/dashboard/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/admin" element={<ComingSoonPage title="Admin Panel" />} />
            <Route path="*" element={<ComingSoonPage title="Page not found" eyebrow="404" />} />
          </Routes>
        </SubmissionFilesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
