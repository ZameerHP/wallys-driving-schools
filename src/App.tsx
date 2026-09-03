import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SmoothScroll } from './components/SmoothScroll';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { PageTransition } from './components/PageTransition';
import { Home } from './pages/Home';
import { Packages } from './pages/Packages';
import { Services } from './pages/Services';
import { About } from './pages/About';
import { Faqs } from './pages/Faqs';
import { Blog } from './pages/Blog';
import { BookNow } from './pages/BookNow';
import { CoverageArea } from './pages/CoverageArea';
import { ManageBooking } from './pages/ManageBooking';
import { InstructorLogin } from './pages/InstructorLogin';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Home /></PageTransition>} />
        <Route path="/packages" element={<PageTransition><Packages /></PageTransition>} />
        <Route path="/services" element={<PageTransition><Services /></PageTransition>} />
        <Route path="/about" element={<PageTransition><About /></PageTransition>} />
        <Route path="/faqs" element={<PageTransition><Faqs /></PageTransition>} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/book-now" element={<PageTransition><BookNow /></PageTransition>} />
        <Route path="/coverage-area" element={<PageTransition><CoverageArea /></PageTransition>} />
        <Route path="/manage-booking" element={<PageTransition><ManageBooking /></PageTransition>} />
        <Route path="/instructor-login" element={<PageTransition><InstructorLogin /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState(true);

  // Fallback to ensure users don't get stuck if the video fails to load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 4000); // Fallback wait time
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {showPreloader && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.05,
              filter: "blur(10px)",
              transition: { duration: 1.2, ease: [0.76, 0, 0.24, 1] } 
            }}
            className="fixed inset-0 z-[99999] bg-white flex items-center justify-center pointer-events-auto"
          >
            <motion.video 
              autoPlay 
              muted 
              playsInline
              onEnded={() => setShowPreloader(false)}
              onError={() => setShowPreloader(false)}
              className="w-full max-w-[600px] object-contain p-8 outline-none border-none pointer-events-none mix-blend-multiply"
              src="/assets/aistudio/intro.mp4"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Router>
        <SmoothScroll>
          <Nav />
          <AnimatedRoutes />
          <Footer />
        </SmoothScroll>
      </Router>
    </>
  );
}

