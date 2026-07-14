import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Nav } from './components/Nav';
import { ScrollTop } from './components/ScrollTop';
import { SignInModal } from './components/SignInModal';
import { ToastHost } from './components/ToastHost';
import { About } from './pages/About';
import { Admin } from './pages/Admin';
import { Certificate } from './pages/Certificate';
import { Dashboard } from './pages/Dashboard';
import { GuideStudent } from './pages/GuideStudent';
import { GuideTutor } from './pages/GuideTutor';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Sessions } from './pages/Sessions';
import { Teach } from './pages/Teach';
import { Tutors } from './pages/Tutors';

const TITLES: Record<string, string> = {
  '/': 'Relay — free peer tutoring in Python & AI',
  '/sessions': 'Free sessions — Relay',
  '/tutors': 'The crew — Relay',
  '/teach': 'Become a tutor — Relay',
  '/about': 'Why it\'s free — Relay',
  '/dashboard': 'Your dashboard — Relay',
  '/certificate': 'Volunteer certificate — Relay',
  '/admin': 'Founder console — Relay',
  '/guide/tutor': 'Post your first class — Relay',
  '/guide/student': 'How Relay works — Relay',
};

function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? 'Relay — free peer tutoring';
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <>
      <ScrollTop />
      <RouteMeta />
      <Nav />
      <main>
        {/* keyed by path so a crash on one page never strands the next */}
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/tutors" element={<Tutors />} />
            <Route path="/teach" element={<Teach />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/certificate" element={<Certificate />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/guide/tutor" element={<GuideTutor />} />
            <Route path="/guide/student" element={<GuideStudent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <SignInModal />
      <ToastHost />
    </>
  );
}
