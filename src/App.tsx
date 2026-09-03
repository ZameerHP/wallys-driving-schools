import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Play video with audio unmuted if allowed, or muted autoplay
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay policy fallback
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }

    // Safety fallback: if video stalls or doesn't exist, transition to website after 5s
    const fallbackTimer = setTimeout(() => {
      setShowPreloader(false);
    }, 5000);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleVideoFinish = () => {
    setShowPreloader(false);
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showPreloader && (
          <motion.div
            key="intro-video-preloader"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.04,
              filter: "blur(12px)",
              transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] } 
            }}
            onClick={handleVideoFinish}
            className="fixed inset-0 z-[999999] bg-[#000000] flex items-center justify-center cursor-pointer select-none overflow-hidden m-0 p-0 border-none outline-none shadow-none"
            style={{ 
              backgroundColor: '#000000',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              margin: 0,
              padding: 0
            }}
          >
            {/* Pure black backdrop with video — NO border, NO shadow, NO other color */}
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              playsInline
              onEnded={handleVideoFinish}
              onError={handleVideoFinish}
              className="w-full h-full object-contain"
              style={{ 
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                backgroundColor: '#000000',
                display: 'block',
                margin: 'auto',
                width: '100vw',
                height: '100vh',
                objectFit: 'contain'
              }}
            >
              <source src="/assets/aistudio/intro.mp4" type="video/mp4" />
              <source src="/intro.mp4" type="video/mp4" />
              <source src="/assets/intro.mp4" type="video/mp4" />
            </video>

            {/* Subtle skip indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="absolute bottom-6 right-8 text-white/40 hover:text-white text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full border border-white/10 hover:border-white/30 bg-black/50 backdrop-blur-sm transition-all"
            >
              Click anywhere to Skip ✕
            </motion.div>
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
