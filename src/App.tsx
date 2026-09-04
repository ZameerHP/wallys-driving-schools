import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { SmoothScroll } from './components/SmoothScroll';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { PageTransition } from './components/PageTransition';
import { CustomCursor } from './components/CustomCursor';
import { NoiseOverlay } from './components/NoiseOverlay';
import { Home } from './pages/Home';
import { Packages } from './pages/Packages';
import { Services } from './pages/Services';
import { About } from './pages/About';
import { Faqs } from './pages/Faqs';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
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
        <Route path="/blog/:id" element={<PageTransition><BlogPost /></PageTransition>} />
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

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.currentTime = 0;
      
      const startPlay = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      };

      if (video.readyState >= 3) {
        startPlay();
      } else {
        video.addEventListener('canplay', startPlay, { once: true });
      }
    }

    // Safety fallback: if video doesn't end on its own within 4.5 seconds
    const fallbackTimer = setTimeout(() => {
      setShowPreloader(false);
    }, 4500);

    return () => clearTimeout(fallbackTimer);
  }, []);

  const handleVideoFinish = () => {
    setShowPreloader(false);
  };

  return (
    <>
      {/* Luxury Film Grain Overlay */}
      <NoiseOverlay />

      {/* Lag-Free Magnetic Custom Cursor */}
      <CustomCursor />

      {/* Zero-Lag Fullscreen Video Intro */}
      <AnimatePresence mode="wait">
        {showPreloader ? (
          <motion.div
            key="intro-video-preloader"
            initial={{ opacity: 1 }}
            exit={{ 
              opacity: 0,
              scale: 1.02,
              transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] } 
            }}
            onClick={handleVideoFinish}
            className="fixed inset-0 z-[999999] bg-[#FFFFFF] flex items-center justify-center cursor-pointer select-none overflow-hidden m-0 p-0"
            style={{ 
              backgroundColor: '#FFFFFF',
              border: 'none',
              boxShadow: 'none',
              outline: 'none',
              margin: 0,
              padding: 0
            }}
          >
            <video 
              ref={videoRef}
              src="/assets/intro.mp4"
              autoPlay 
              muted 
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              onEnded={handleVideoFinish}
              onError={handleVideoFinish}
              className="w-full h-full object-contain"
              style={{ 
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                backgroundColor: '#FFFFFF',
                display: 'block',
                margin: 'auto',
                width: '100vw',
                height: '100vh',
                objectFit: 'contain',
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
            />

            {/* Minimal Skip Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="absolute bottom-6 right-8 text-black/50 hover:text-black text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full border border-black/10 hover:border-black/30 bg-white/80 backdrop-blur-md transition-all shadow-sm"
            >
              Skip ✕
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="main-website"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Router>
              <SmoothScroll>
                <Nav />
                <AnimatedRoutes />
                <Footer />
              </SmoothScroll>
            </Router>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
