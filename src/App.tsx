import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
  return (
    <Router>
      <SmoothScroll>
        <Nav />
        <AnimatedRoutes />
        <Footer />
      </SmoothScroll>
    </Router>
  );
}
