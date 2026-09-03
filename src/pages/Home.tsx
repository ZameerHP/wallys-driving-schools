import { motion, useScroll, useTransform, useReducedMotion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, ArrowRight, ArrowLeft, ChevronDown, Users, Award, Clock, Shield, Quote } from 'lucide-react';
import { PACKAGES, TESTIMONIALS, BLOG_POSTS } from '../lib/content';
import { TiltCard } from '../components/TiltCard';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
      {[...Array(18)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 1.5,
            height: Math.random() * 4 + 1.5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? 'rgba(227, 34, 42, 0.45)' : 'rgba(255, 255, 255, 0.2)',
          }}
          animate={{
            y: [0, -35 - Math.random() * 45, 0],
            x: [0, (Math.random() - 0.5) * 25, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.6, 1],
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
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Testimonials Carousel State
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialDirection, setTestimonialDirection] = useState(0);
  const [isTestimonialPaused, setIsTestimonialPaused] = useState(false);

  const nextTestimonial = () => {
    setTestimonialDirection(1);
    setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const prevTestimonial = () => {
    setTestimonialDirection(-1);
    setTestimonialIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  const goToTestimonial = (idx: number) => {
    setTestimonialDirection(idx > testimonialIndex ? 1 : -1);
    setTestimonialIndex(idx);
  };

  useEffect(() => {
    if (isTestimonialPaused) return;
    const interval = setInterval(() => {
      setTestimonialDirection(1);
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isTestimonialPaused]);

  const currentTestimonial = TESTIMONIALS[testimonialIndex] || TESTIMONIALS[0];

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
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-0 bg-brand-black overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20 z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent z-10" />
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
                style={{ boxShadow: '0 0 10px rgba(227,34,42,0.4)' }}
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
                Learn From The Expert. Sydney's fastest-growing driving school providing safe, accredited and reliable training.
              </motion.p>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <div data-magnetic>
                  <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30, scale: shouldReduceMotion ? 1 : 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 1.0, type: "spring", stiffness: 300, damping: 20 }}
                    style={{ willChange: "transform, opacity" }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link 
                      to="/book-now" 
                      data-cursor-text="BOOK"
                      className="inline-flex items-center gap-2 bg-brand-red text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_30px_rgba(227,34,42,0.4)] hover:shadow-[0_0_40px_rgba(227,34,42,0.6)]"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </motion.div>
                </div>

                <div data-magnetic>
                  <motion.div
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30, scale: shouldReduceMotion ? 1 : 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: shouldReduceMotion ? 0 : 1.06, type: "spring", stiffness: 300, damping: 20 }}
                    style={{ willChange: "transform, opacity" }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link 
                      to="/about" 
                      data-cursor-text="ABOUT"
                      className="group inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg text-white border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-300 backdrop-blur-sm"
                    >
                      <span>Read More</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right side visual accent with orbiting rings */}
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
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-45px] rounded-full border-[3px] border-dashed border-brand-red/40"
                />
                
                {/* Second orbiting ring */}
                <motion.div 
                  animate={{ rotate: shouldReduceMotion ? 0 : -360 }}
                  transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-85px] rounded-full border border-white/10"
                />
                
                {/* Trust Badge */}
                <div 
                  data-magnetic
                  className="w-40 h-40 bg-brand-red rounded-full flex flex-col items-center justify-center shadow-[0_0_60px_rgba(227,34,42,0.6)] relative z-10 pulse-glow cursor-pointer"
                >
                  <Star className="w-10 h-10 text-white mb-2 fill-white" />
                  <span className="text-white font-bold text-center leading-tight text-lg">Top Rated<br/>School</span>
                </div>

                {/* Floating mini badges */}
                <motion.div
                  animate={{ y: [-6, 6, -6] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-16 right-4 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 shadow-xl"
                >
                  <span className="text-white font-bold text-sm">⭐ 5.0 Rating</span>
                </motion.div>

                <motion.div
                  animate={{ y: [6, -6, 6] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-12 -left-8 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 shadow-xl"
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
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none"
        >
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-brand-red" />
          </motion.div>
        </motion.div>
      </section>

      {/* STATS BANNER */}
      <section className="relative z-10 -mt-16 mb-8 px-4">
        <div className="max-w-6xl mx-auto">
          <TiltCard maxTilt={8} glareEffect={true} className="rounded-[32px]">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="bg-brand-black/95 backdrop-blur-xl rounded-[32px] p-8 md:p-10 shadow-2xl border border-white/10 grid grid-cols-2 md:grid-cols-4 gap-8"
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
                  <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-red/20 group-hover:scale-110 transition-all duration-300">
                    <stat.icon className="w-6 h-6 text-brand-red" />
                  </div>
                  <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-white/50 text-sm font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </TiltCard>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-32 bg-brand-offwhite text-brand-black overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* 3D Tilt Image Stack */}
            <TiltCard maxTilt={10} className="relative h-[600px] rounded-[40px]">
              <div className="absolute inset-0 rounded-[40px] overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1595054173872-3580455c11f7?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Driving Lesson" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/35 to-transparent" />
              </div>
              <div className="absolute -bottom-8 -right-8 w-2/3 h-2/3 rounded-[36px] border-[8px] border-brand-offwhite overflow-hidden shadow-2xl">
                <img src="https://images.unsplash.com/photo-1606821812822-7cd60e5eb3e8?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Instructor" />
              </div>
              
              {/* Experience badge */}
              <div className="absolute top-6 -right-2 bg-brand-red text-white rounded-2xl px-5 py-4 shadow-xl z-20">
                <div className="text-2xl font-bold">10+</div>
                <div className="text-xs font-medium opacity-85">Years Exp</div>
              </div>
            </TiltCard>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="flex flex-col items-start"
            >
              <span className="text-brand-red font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                <motion.div 
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-brand-red rounded-full" 
                />
                Get To Know Us
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight">
                Ready to Learn Driving in Our Latest Models Vehicles
              </h2>
              <p className="text-lg text-brand-black/70 mb-8 leading-relaxed">
                Wally's Driving School is proud to be one of Sydney's fastest-growing driving schools. Our team is made up of highly qualified, professional, and patient Driver Trainers who are friendly and supportive, ensuring every student feels at ease behind the wheel.
              </p>
              
              <TiltCard maxTilt={6} className="bg-white p-8 rounded-3xl shadow-sm border border-black/5 mb-8 w-full">
                <p className="text-brand-black/85 font-medium italic relative z-10">
                  "Our mission is to create safe, confident, and capable drivers, while making the learning process both enjoyable and stress-free. We provide Class C licence training in dual-controlled automatic vehicles, offering a safe and reliable environment for learners."
                </p>
              </TiltCard>

              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-6 w-full mb-10"
              >
                <motion.div variants={staggerItem} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                    <CheckCircle2 />
                  </div>
                  <span className="font-bold">Online Traffic School</span>
                </motion.div>
                <motion.div variants={staggerItem} className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-brand-red/10 flex items-center justify-center text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
                    <Star />
                  </div>
                  <span className="font-bold">Expert Instructor</span>
                </motion.div>
              </motion.div>

              <div className="w-full mb-10">
                <div className="flex justify-between font-bold mb-2 text-sm">
                  <span>Driving Skill Mastery</span>
                  <span className="text-brand-red">100%</span>
                </div>
                <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden">
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

              <div data-magnetic>
                <Link 
                  to="/about" 
                  data-cursor-text="MORE"
                  className="inline-flex items-center gap-2 bg-brand-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-red transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <span>Discover More</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* PACKAGES PREVIEW */}
      <section className="py-32 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div>
              <span className="text-brand-red font-bold uppercase tracking-wider mb-3 block">Pricing Plans</span>
              <h2 className="text-4xl md:text-5xl font-display font-bold">Choose Your Package</h2>
            </div>
            <div data-magnetic>
              <Link 
                to="/packages" 
                data-cursor-text="ALL"
                className="flex items-center gap-2 font-bold hover:text-brand-red transition-colors group text-base"
              >
                View All Packages <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-12 -mx-4 px-4 snap-x snap-mandatory hide-scrollbar gap-6">
            {PACKAGES.slice(0, 4).map((pkg, i) => (
              <TiltCard 
                key={pkg.id} 
                maxTilt={8}
                className="min-w-[320px] md:min-w-[400px] snap-center rounded-[32px] bg-brand-offwhite p-8 border border-black/5 hover:border-brand-red/20 transition-all duration-500 group flex flex-col justify-between"
              >
                <div>
                  <div className="bg-brand-red text-white inline-block px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider mb-6 shadow-[0_0_15px_rgba(227,34,42,0.3)]">
                    {pkg.label}
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2 tracking-tight">{pkg.title}</h3>
                  <div className="text-4xl font-display font-bold text-brand-red mb-6">${pkg.price} AUD</div>
                  <p className="text-brand-black/70 mb-8 line-clamp-3 text-sm leading-relaxed">{pkg.description || 'Professional driving instruction with RMS approved vehicles.'}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5">
                  <span className="text-xs font-semibold text-brand-black/60">Includes dual controls</span>
                  <div data-magnetic>
                    <Link 
                      to="/book-now" 
                      data-cursor-text="BOOK"
                      className="w-12 h-12 rounded-full bg-brand-black text-white flex items-center justify-center group-hover:bg-brand-red group-hover:shadow-[0_0_20px_rgba(227,34,42,0.5)] transition-all duration-300"
                    >
                      <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform" />
                    </Link>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION - 7 VERIFIED STUDENT REVIEWS CAROUSEL */}
      <section className="py-28 bg-brand-offwhite overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-14 items-center">
            {/* Left Column: Heading, Subtitle & Interactive Navigation */}
            <div className="w-full lg:w-1/3 flex flex-col items-start">
              <span className="text-brand-red font-bold uppercase tracking-wider mb-3 block text-xs">
                Verified Student Reviews
              </span>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 tracking-tight text-brand-black">
                What Our Student are Saying?
              </h2>
              <p className="text-brand-black/60 mb-8 text-base leading-relaxed">
                Read genuine reviews from our students who passed their driving tests on their first attempt with our instruction.
              </p>

              {/* Counter & Arrow Controls */}
              <div className="flex items-center gap-6 mb-8">
                <div className="flex items-center gap-1.5 font-display text-sm font-bold text-brand-black/60">
                  <span className="text-3xl font-bold text-brand-black font-display">0{testimonialIndex + 1}</span>
                  <span className="text-brand-black/30">/</span>
                  <span className="text-sm font-bold text-brand-black/40">0{TESTIMONIALS.length}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div data-magnetic>
                    <button
                      onClick={prevTestimonial}
                      data-cursor-text="PREV"
                      aria-label="Previous testimonial"
                      className="w-12 h-12 rounded-full border border-black/15 bg-white flex items-center justify-center hover:border-brand-red hover:text-brand-red hover:shadow-lg transition-all duration-300 active:scale-90 cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>

                  <div data-magnetic>
                    <button
                      onClick={nextTestimonial}
                      data-cursor-text="NEXT"
                      aria-label="Next testimonial"
                      className="w-12 h-12 rounded-full bg-brand-black text-white flex items-center justify-center hover:bg-brand-red hover:shadow-[0_0_25px_rgba(227,34,42,0.4)] transition-all duration-300 active:scale-90 cursor-pointer"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Pagination Dots */}
              <div className="flex items-center gap-2">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToTestimonial(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      testimonialIndex === i
                        ? 'w-8 bg-brand-red shadow-[0_0_10px_rgba(227,34,42,0.5)]'
                        : 'w-2.5 bg-black/15 hover:bg-black/35'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right Column: Active Testimonial Card with 3D Tilt & Smooth Transition */}
            <div 
              className="w-full lg:w-2/3"
              onMouseEnter={() => setIsTestimonialPaused(true)}
              onMouseLeave={() => setIsTestimonialPaused(false)}
            >
              <div className="min-h-[420px] flex items-center">
                <AnimatePresence mode="wait" custom={testimonialDirection}>
                  <motion.div
                    key={currentTestimonial.id}
                    custom={testimonialDirection}
                    variants={{
                      enter: (dir: number) => ({
                        x: dir > 0 ? 50 : -50,
                        opacity: 0,
                        scale: 0.98,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        scale: 1,
                        transition: {
                          x: { type: "spring", stiffness: 320, damping: 28 },
                          opacity: { duration: 0.3 },
                        },
                      },
                      exit: (dir: number) => ({
                        x: dir > 0 ? -50 : 50,
                        opacity: 0,
                        scale: 0.98,
                        transition: {
                          x: { type: "spring", stiffness: 320, damping: 28 },
                          opacity: { duration: 0.25 },
                        },
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="w-full"
                  >
                    <TiltCard maxTilt={5} className="bg-white rounded-[40px] p-8 sm:p-12 shadow-xl border border-black/5 relative overflow-hidden">
                      {/* Decorative watermark quote mark */}
                      <div className="absolute top-8 right-8 opacity-[0.06] select-none pointer-events-none">
                        <Quote className="w-24 h-24 text-brand-black" />
                      </div>

                      {/* Header with 5 stars & verified badge */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-1.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 text-[#FFB800] fill-[#FFB800]" />
                          ))}
                          <span className="ml-2 text-xs font-bold text-brand-black/70 bg-black/5 px-2.5 py-1 rounded-full">
                            5.0 Star Rating
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200/60 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          Verified Student Pass
                        </span>
                      </div>

                      {/* Verbatim Student Quote */}
                      <p className="text-lg sm:text-xl md:text-2xl font-medium text-brand-black/85 leading-relaxed mb-10 min-h-[120px] flex items-center">
                        "{currentTestimonial.quote}"
                      </p>

                      {/* Author Info & Styled DP Badge */}
                      <div className="flex items-center gap-4 pt-6 border-t border-black/5">
                        {currentTestimonial.dpType === 'badge' ? (
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center font-black ${currentTestimonial.dpBg} ${currentTestimonial.dpColor} shadow-md shrink-0`}>
                            <span className="text-[11px] sm:text-xs tracking-wider uppercase font-black">{currentTestimonial.dpText}</span>
                            <span className="text-[7px] tracking-widest text-zinc-400 uppercase font-semibold">STUDENT</span>
                          </div>
                        ) : (
                          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-2xl ${currentTestimonial.dpBg} ${currentTestimonial.dpColor} shadow-md shrink-0`}>
                            {currentTestimonial.dpText}
                          </div>
                        )}

                        <div>
                          <h4 className="font-display font-bold text-lg sm:text-xl text-brand-black">
                            {currentTestimonial.author}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-brand-red font-semibold">
                            <span>{currentTestimonial.title}</span>
                            <span className="w-1 h-1 rounded-full bg-brand-red/40" />
                            <span className="text-xs text-brand-black/50 font-normal">NSW Road Test</span>
                          </div>
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOG / NEWS SECTION */}
      <section className="py-28 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-brand-red font-bold uppercase tracking-wider mb-3 block">Latest Guides</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold">Articles & Tips</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BLOG_POSTS.slice(0, 3).map((post, i) => (
              <TiltCard
                key={post.id}
                maxTilt={8}
                className="bg-brand-offwhite rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-black/5 flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 overflow-hidden relative">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                    <div className="absolute top-4 left-4 bg-brand-red text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                      {post.date}
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl font-display font-bold mb-4 group-hover:text-brand-red transition-colors duration-300 line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                </div>
                <div className="px-8 pb-8">
                  <Link to={`/blog/${post.id}`} data-cursor-text="READ" className="inline-flex items-center gap-2 font-bold hover:text-brand-red transition-colors text-sm">
                    Read More
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING BANNER */}
      <section className="py-20 bg-brand-offwhite px-4">
        <div className="max-w-7xl mx-auto">
          <TiltCard maxTilt={5} className="rounded-[40px]">
            <div className="bg-brand-black rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden group shadow-2xl">
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 tracking-tight">
                  Book Your First Driving Lesson Today
                </h2>
                <div data-magnetic>
                  <Link 
                    to="/book-now" 
                    data-cursor-text="BOOK"
                    className="inline-block bg-brand-red text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_30px_rgba(227,34,42,0.4)]"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
              
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute -right-20 -top-20 w-96 h-96 border-[40px] border-brand-red rounded-full" />
                <div className="absolute -left-20 -bottom-20 w-96 h-96 border-[40px] border-brand-red rounded-full" />
              </div>
            </div>
          </TiltCard>
        </div>
      </section>
    </div>
  );
}
