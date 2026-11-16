import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { LoadingState } from '@/components/ui/LoadingState';
import { SubmissionFilesProvider } from '@/features/submission/SubmissionFilesContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RequireAuth } from '@/features/auth/RequireAuth';

/** Lazy-loads a named export so each route ships as its own small chunk. */
function page<K extends string>(loader: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => loader().then((module) => ({ default: module[name] })));
}

const SubmitPage = page(() => import('@/pages/SubmitPage'), 'SubmitPage');
const AboutPage = page(() => import('@/pages/AboutPage'), 'AboutPage');
const ContactPage = page(() => import('@/pages/ContactPage'), 'ContactPage');
const EcuServicesPage = page(() => import('@/pages/EcuServicesPage'), 'EcuServicesPage');
const TcuServicesPage = page(() => import('@/pages/TcuServicesPage'), 'TcuServicesPage');
const HowItWorksPage = page(() => import('@/pages/HowItWorksPage'), 'HowItWorksPage');
const B2BPartnershipsPage = page(() => import('@/pages/B2BPartnershipsPage'), 'B2BPartnershipsPage');
const PrivacyPolicyPage = page(() => import('@/pages/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsPage = page(() => import('@/pages/TermsPage'), 'TermsPage');
const CookiePolicyPage = page(() => import('@/pages/CookiePolicyPage'), 'CookiePolicyPage');
const LoginPage = page(() => import('@/pages/LoginPage'), 'LoginPage');
const NotFoundPage = page(() => import('@/pages/NotFoundPage'), 'NotFoundPage');
const DashboardPage = page(() => import('@/pages/DashboardPage'), 'DashboardPage');
const JobDetailPage = page(() => import('@/pages/JobDetailPage'), 'JobDetailPage');
const MessagesPage = page(() => import('@/pages/MessagesPage'), 'MessagesPage');
const ProfilePage = page(() => import('@/pages/ProfilePage'), 'ProfilePage');
const PartnerSubmitPage = page(() => import('@/pages/PartnerSubmitPage'), 'PartnerSubmitPage');
const AdminLayout = page(() => import('@/features/admin/AdminLayout'), 'AdminLayout');
const AdminDashboard = page(() => import('@/features/admin/AdminDashboard'), 'AdminDashboard');
const AdminJobsPage = page(() => import('@/features/admin/AdminJobsPage'), 'AdminJobsPage');
const AdminJobDetail = page(() => import('@/features/admin/AdminJobDetail'), 'AdminJobDetail');
const AdminCustomersPage = page(() => import('@/features/admin/AdminCustomersPage'), 'AdminCustomersPage');
const AdminPartnersPage = page(() => import('@/features/admin/AdminPartnersPage'), 'AdminPartnersPage');
const AdminMessagesPage = page(() => import('@/features/admin/AdminMessagesPage'), 'AdminMessagesPage');
const AdminFaqPage = page(() => import('@/features/admin/AdminFaqPage'), 'AdminFaqPage');
const AdminSettingsPage = page(() => import('@/features/admin/AdminSettingsPage'), 'AdminSettingsPage');
const AdminPersonDetail = lazy(() => import('@/features/admin/AdminPersonDetail').then((m) => ({ default: m.AdminPersonDetail })));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait for lazy content, then jump to the anchor (for example #messages).
      const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 400);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubmissionFilesProvider>
          <ScrollToTop />
          <Suspense fallback={<div className="min-h-screen bg-canvas"><LoadingState /></div>}>
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
              <Route path="/dashboard/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
              <Route path="/dashboard/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
              <Route path="/dashboard/submit" element={<RequireAuth><PartnerSubmitPage /></RequireAuth>} />

              <Route path="/admin" element={<RequireAuth adminOnly><AdminLayout /></RequireAuth>}>
                <Route index element={<AdminDashboard />} />
                <Route path="jobs" element={<AdminJobsPage />} />
                <Route path="jobs/:reference" element={<AdminJobDetail />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="customers/:id" element={<AdminPersonDetail kind="customer" />} />
                <Route path="partners" element={<AdminPartnersPage />} />
                <Route path="partners/:id" element={<AdminPersonDetail kind="partner" />} />
                <Route path="messages" element={<AdminMessagesPage />} />
                <Route path="faq" element={<AdminFaqPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          <CookieBanner />
        </SubmissionFilesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
