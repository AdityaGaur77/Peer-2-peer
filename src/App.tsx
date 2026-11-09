import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { ClassBanner } from './components/NextClass';
import { Nav } from './components/Nav';
import { ScrollTop } from './components/ScrollTop';
import { ScrollFx } from './components/ScrollFx';
import { SignInModal } from './components/SignInModal';
import { ToastHost } from './components/ToastHost';
import { About } from './pages/About';
import { Admin } from './pages/Admin';
import { Certificate } from './pages/Certificate';
import { Dashboard } from './pages/Dashboard';
import { Flyer } from './pages/Flyer';
import { GuideStudent } from './pages/GuideStudent';
import { GuideTutor } from './pages/GuideTutor';
import { Home } from './pages/Home';
import { Join } from './pages/Join';
import { NotFound } from './pages/NotFound';
import { Sessions } from './pages/Sessions';
import { Teach } from './pages/Teach';
import { Tutors } from './pages/Tutors';

const TITLES: Record<string, string> = {
  '/': 'Peer 2 Peer — tutoring by students',
  '/sessions': 'Classes — Peer 2 Peer',
  '/tutors': 'Teachers — Peer 2 Peer',
  '/teach': 'Teach a class — Peer 2 Peer',
  '/about': 'Our story — Peer 2 Peer',
  '/dashboard': 'Your dashboard — Peer 2 Peer',
  '/certificate': 'Volunteer certificate — Peer 2 Peer',
  '/admin': 'Team console — Peer 2 Peer',
  '/guide/tutor': 'Set up your class — Peer 2 Peer',
  '/guide/student': 'How Peer 2 Peer works — Peer 2 Peer',
  '/join': "You're invited — Peer 2 Peer",
};

const KNOWN = new Set(Object.keys(TITLES));

function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title =
      TITLES[pathname] ??
      (pathname.startsWith('/flyer/')
        ? 'Session flyer — Peer 2 Peer'
        : !KNOWN.has(pathname)
        ? 'Page not found — Peer 2 Peer'
        : 'Peer 2 Peer — tutoring by students');
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <>
      <ScrollTop />
      <ScrollFx />
      <RouteMeta />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main">
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
            <Route path="/join" element={<Join />} />
            <Route path="/flyer/:id" element={<Flyer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <ClassBanner />
      <SignInModal />
      <ToastHost />
    </>
  );
}
