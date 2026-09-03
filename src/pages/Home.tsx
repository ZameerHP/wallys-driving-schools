import { motion, useScroll, useTransform, useReducedMotion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, ArrowRight, ChevronDown, Users, Award, Clock, Shield } from 'lucide-react';
import { PACKAGES, TESTIMONIALS, BLOG_POSTS } from '../lib/content';

// Animated counter component
function AnimatedCounter({ target, suffix = '', duration = 2 }: { target: number; suffix?: string; duration?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = target / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Floating particle component
function FloatingParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? 'rgba(227, 34, 42, 0.4)' : 'rgba(255, 255, 255, 0.15)',
          }}
          animate={{
            y: [0, -30 - Math.random() * 40, 0],
            x: [0, (Math.random() - 0.5) * 20, 0],
            opacity: [0.2, 0.7, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

export function Home() {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const headlineLines = ["Are You Looking for a", "Car for the", "Driving Test?"];

  const STATS = [
    { icon: Users, value: 500, suffix: '+', label: 'Happy Students' },
    { icon: Award, value: 99, suffix: '%', label: 'Pass Rate' },
    { icon: Clock, value: 10, suffix: '+', label: 'Years Experience' },
    { icon: Shield, value: 100, suffix: '%', label: 'Safety Record' },
  ];

  // Stagger container
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="bg-brand-offwhite" ref={containerRef}>
      {/* HERO SECTION */}
      <section className="relative h-screen w-full overflow-hidden bg-brand-black">
        {/* Cinematic Video Background */}
        <motion.div 
          style={{ y, opacity }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-0 bg-brand-black overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent z-10" />
          <motion.video 
            autoPlay muted loop playsInline
            initial={{ scale: 1 }}
            animate={{ scale: shouldReduceMotion ? 1 : 1.05 }}
            transition={{ duration: 20, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            className="w-full h-full object-cover opacity-80"
            src="https://assets.mixkit.co/videos/preview/mixkit-driving-on-a-highway-at-sunset-22445-large.mp4"
            poster="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=2000"
          />
        </motion.div>

        {/* Floating Particles */}
        <FloatingParticles />

        {/* Content Container */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full mt-20">
            <div className="flex flex-col items-start relative pl-6">
              {/* Tick rail with glow */}
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '100%', opacity: 1 }}
                transition={{ delay: 0.2, duration: 1 }}
                className="absolute left-0 top-2 bottom-2 w-1 border-l-2 border-dashed border-brand-red/60"
                style={{ boxShadow: '0 0 10px rgba(227,34,42,0.3)' }}
              />
              
              <div className="text-5xl md:text-7xl font-display font-bold text-white leading-[1.05] tracking-tight">
                {headlineLines.map((line, i) => (
                  <div key={i} className="overflow-hidden">
                    <motion.div
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 60, rotateX: shouldReduceMotion ? 0 : 15 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ 
                        delay: shouldReduceMotion ? 0 : 0.35 + (i * 0.12), 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 20 
                      }}
                      style={{ willChange: "transform, opacity" }}
                      className="relative pb-2"
                    >
                      {line}
                      {i === 2 && (
                        <svg className="absolute w-full h-4 -bottom-1 left-0 text-brand-red overflow-visible" viewBox="0 0 100 10" preserveAspectRatio="none">
                          <motion.path 
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ delay: shouldReduceMotion ? 0 : 0.7, duration: 0.6 }}
                            d="M0 5 Q 25 10, 50 5 T 100 5" 
                            fill="transparent" 
                            stroke="currentColor" 
                            strokeWidth="4" 
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </motion.div>
                  </div>
                ))}
              </div>
              
              <motion.p 
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: shouldReduceMotion ? 0 : 0.85, duration: 0.4 }}
                style={{ willChange: "transform, opacity" }}
                className="mt-6 text-xl text-white/90 font-medium max-w-lg"
              >
                Learn From The Expert. Sydney's fastest-growing driving school providing safe and reliable training.
              </motion.p>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <motion.div
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30, scale: shouldReduceMotion ? 1 : 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: shouldReduceMotion ? 0 : 1.0, type: "spring", stiffness: 300, damping: 20 }}
                  style={{ willChange: "transform, opacity" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to="/book-now" className="inline-block bg-brand-red text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_30px_rgba(227,34,42,0.4)] hover:shadow-[0_0_40px_rgba(227,34,42,0.6)]">
                    Get Started
                  </Link>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30, scale: shouldReduceMotion ? 1 : 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: shouldReduceMotion ? 0 : 1.06, type: "spring", stiffness: 300, damping: 20 }}
                  style={{ willChange: "transform, opacity" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link to="/about" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 backdrop-blur-sm">
                    Read More
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </motion.div>
              </div>
            </div>

            {/* Right side visual accent */}
            <div className="hidden lg:flex items-center justify-center relative h-[600px] w-full">
              <motion.div 
                initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: shouldReduceMotion ? 0 : 1.2, type: "spring", stiffness: 200, damping: 15 }}
                className="relative"
              >
                {/* Orbiting Dashed Circle */}
                <motion.div 
                  animate={{ rotate: shouldReduceMotion ? 0 : 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-40px] rounded-full border-[3px] border-dashed border-brand-red/40"
                />
                
                {/* Second orbiting ring */}
                <motion.div 
                  animate={{ rotate: shouldReduceMotion ? 0 : -360 }}
                  transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-80px] rounded-full border border-white/10"
                />
                
                {/* Trust Badge */}
                <div className="w-40 h-40 bg-brand-red rounded-full flex flex-col items-center justify-center shadow-[0_0_60px_rgba(227,34,42,0.5)] relative z-10 pulse-glow">
                  <Star className="w-10 h-10 text-white mb-2 fill-white" />
                  <span className="text-white font-bold text-center leading-tight text-lg">Top Rated<br/>School</span>
                </div>

                {/* Floating mini badges */}
                <motion.div
                  animate={{ y: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-16 right-4 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10"
                >
                  <span className="text-white font-bold text-sm">⭐ 5.0 Rating</span>
                </motion.div>

                <motion.div
                  animate={{ y: [5, -5, 5] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-12 -left-8 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10"
                >
                  <span className="text-white font-bold text-sm">500+ Students</span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-white/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* STATS BANNER */}
      <section className="relative z-10 -mt-16 mb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-brand-black rounded-[28px] p-8 md:p-10 shadow-2xl border border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group"
              >
                <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-red/20 transition-colors duration-300">
                  <stat.icon className="w-6 h-6 text-brand-red" />
                </div>
                <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-white/50 text-sm font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-32 bg-brand-offwhite text-brand-black overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* 3D Tilt Image Stack */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative h-[600px] group perspective-1000"
            >
              <div className="absolute inset-0 rounded-[40px] overflow-hidden shadow-2xl transition-transform duration-700 ease-out group-hover:rotate-y-12 group-hover:-rotate-x-12">
                <img src="https://images.unsplash.com/photo-1595054173872-3580455c11f7?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Driving Lesson" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/30 to-transparent" />
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, type: "spring" }}
                className="absolute -bottom-10 -right-10 w-2/3 h-2/3 rounded-[40px] border-[8px] border-brand-offwhite overflow-hidden shadow-2xl transition-transform duration-700 ease-out group-hover:translate-x-4 group-hover:-translate-y-4"
              >
                <img src="https://images.unsplash.com/photo-1606821812822-7cd60e5eb3e8?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Instructor" />
              </motion.div>
              
              {/* Experience badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                className="absolute top-6 -right-4 bg-brand-red text-white rounded-2xl px-5 py-4 shadow-xl z-10"
              >
                <div className="text-2xl font-bold">10+</div>
                <div className="text-xs font-medium opacity-80">Years Exp</div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="flex flex-col items-start"
            >
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-brand-red font-bold uppercase tracking-wider mb-4 flex items-center gap-2"
              >
                <motion.div 
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-brand-red rounded-full" 
                />
                Get To Know Us
              </motion.span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Ready to Learn Driving in Our Latest Models Vehicles
              </h2>
              <p className="text-lg text-brand-black/70 mb-8">
                Wally's Driving School is proud to be one of Sydney's fastest-growing driving schools. Our team is made up of highly qualified, professional, and patient Driver Trainers who are friendly and supportive, ensuring every student feels at ease behind the wheel.
              </p>
              
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 mb-8 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <p className="text-brand-black/80 font-medium italic relative z-10">
                  "Our mission is to create safe, confident, and capable drivers, while making the learning process both enjoyable and stress-free. We provide Class C licence training in dual-controlled automatic vehicles, offering a safe and reliable environment for learners."
                </p>
              </motion.div>

              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-6 w-full mb-10"
              >
                <motion.div variants={staggerItem} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                    <CheckCircle2 />
                  </div>
                  <span className="font-bold">Online Traffic School</span>
                </motion.div>
                <motion.div variants={staggerItem} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                    <Star />
                  </div>
                  <span className="font-bold">Expert Instructor</span>
                </motion.div>
              </motion.div>

              <div className="w-full mb-10">
                <div className="flex justify-between font-bold mb-2">
                  <span>Driving Skill</span>
                  <span>100%</span>
                </div>
                <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    transition={{ duration: 1.5, type: "spring" }}
                    viewport={{ once: true }}
                    className="h-full bg-gradient-to-r from-brand-red to-red-400 rounded-full relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                  </motion.div>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/about" className="bg-brand-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-red transition-all duration-300 shadow-lg hover:shadow-xl">
                  Discover More
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PACKAGES PREVIEW */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-brand-red font-bold uppercase tracking-wider mb-4 block">Pricing Plans</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold">Choose Your Package</h2>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ x: 5 }}
            >
               <Link to="/packages" className="flex items-center gap-2 font-bold hover:text-brand-red transition-colors group">
                 View All Packages <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </Link>
            </motion.div>
          </div>

          <div className="flex overflow-x-auto pb-12 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar gap-6">
            {PACKAGES.slice(0, 4).map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="min-w-[320px] md:min-w-[400px] snap-center bg-brand-offwhite rounded-[32px] p-8 border border-black/5 hover:shadow-2xl hover:border-brand-red/10 transition-all duration-500 group cursor-pointer relative overflow-hidden"
              >
                {/* Shimmer overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-red/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </div>
                
                <div className="relative z-10">
                  <div className="bg-brand-red text-white inline-block px-4 py-2 rounded-full font-bold text-sm mb-6 shadow-[0_0_15px_rgba(227,34,42,0.2)]">
                    {pkg.label}
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2">{pkg.title}</h3>
                  <div className="text-4xl font-display font-bold text-brand-red mb-6">${pkg.price}</div>
                  <p className="text-brand-black/70 mb-8 line-clamp-3">{pkg.description || 'Professional driving instruction.'}</p>
                  
                  <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }}>
                    <Link to="/book-now" className="w-12 h-12 rounded-full bg-brand-black text-white flex items-center justify-center group-hover:bg-brand-red group-hover:shadow-[0_0_20px_rgba(227,34,42,0.4)] transition-all duration-300">
                      <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform" />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-brand-offwhite overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="w-full md:w-1/3"
            >
              <span className="text-brand-red font-bold uppercase tracking-wider mb-4 block">Testimonials</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">What They Say About Us</h2>
              <p className="text-brand-black/60 mb-8">
                Read genuine reviews from our students who have successfully passed their driving tests with our professional instruction.
              </p>
              <div className="flex gap-4">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:border-brand-red hover:text-brand-red transition-all duration-300"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 rounded-full bg-brand-black text-white flex items-center justify-center hover:bg-brand-red hover:shadow-[0_0_20px_rgba(227,34,42,0.3)] transition-all duration-300"
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="w-full md:w-2/3"
            >
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-white rounded-[40px] p-10 md:p-12 shadow-xl relative overflow-hidden group"
              >
                {/* Animated gradient border glow */}
                <div className="absolute inset-0 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'linear-gradient(135deg, rgba(227,34,42,0.1), transparent, rgba(227,34,42,0.05))' }} />
                
                <div className="absolute top-12 right-12 opacity-10">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                
                <div className="flex gap-1 mb-8 relative z-10">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 400 }}
                    >
                      <Star className="w-6 h-6 text-[#FFB800] fill-[#FFB800]" />
                    </motion.div>
                  ))}
                </div>
                
                <p className="text-xl md:text-2xl font-medium text-brand-black/80 leading-relaxed mb-10 relative z-10">
                  "{TESTIMONIALS[0]?.quote || 'An excellent driving school.'}"
                </p>
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-brand-offwhite ring-4 ring-brand-red/10">
                    <img src={TESTIMONIALS[0]?.avatar} alt={TESTIMONIALS[0]?.author} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{TESTIMONIALS[0]?.author}</div>
                    <div className="text-brand-red font-medium">{TESTIMONIALS[0]?.title}</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BLOG / NEWS SECTION */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-brand-red font-bold uppercase tracking-wider mb-4 block">Latest News</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold">Articles & Tips</h2>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BLOG_POSTS.slice(0, 3).map((post, i) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="bg-brand-offwhite rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col"
              >
                <div className="h-48 overflow-hidden relative">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 bg-brand-red text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    {post.date}
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="text-xl font-display font-bold mb-4 group-hover:text-brand-red transition-colors duration-300 line-clamp-2">
                    {post.title}
                  </h3>
                  <Link to={`/blog/${post.id}`} className="mt-auto inline-flex items-center gap-2 font-bold hover:text-brand-red transition-colors text-sm group/link">
                    Read More
                    <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING BANNER */}
      <section className="py-20 bg-brand-offwhite px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-brand-black rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden group"
          >
            <div className="relative z-10">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-6xl font-display font-bold text-white mb-8"
              >
                Book Your First Driving Lesson Today
              </motion.h2>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/book-now" className="inline-block bg-brand-red text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_30px_rgba(227,34,42,0.4)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                  Book Now
                </Link>
              </motion.div>
            </div>
            
            {/* Background pattern with animation */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute -right-20 -top-20 w-96 h-96 border-[40px] border-brand-red rounded-full" 
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                className="absolute -left-20 -bottom-20 w-96 h-96 border-[40px] border-brand-red rounded-full" 
              />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
