import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star, Users, Award, CheckCircle2, ArrowRight } from 'lucide-react';

export function About() {
  return (
    <div className="pt-32 bg-brand-offwhite min-h-screen relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-24 left-0 w-96 h-96 bg-brand-red/5 rounded-full filter blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-brand-black/50 mb-3 uppercase tracking-widest">
            <Link to="/" className="hover:text-brand-red transition-colors">Wally's Driving School</Link>
            <span>/</span>
            <span className="text-brand-red font-semibold">About Our Academy</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-brand-black">ABOUT US</h1>
        </motion.div>

        {/* Story Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-28">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[40px] overflow-hidden shadow-2xl h-[520px] relative group"
          >
            <img 
              src="https://images.unsplash.com/photo-1595054173872-3580455c11f7?auto=format&fit=crop&q=80&w=1200" 
              alt="About Wally's Driving School" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase tracking-wider mb-2">
                <Star className="w-4 h-4 fill-brand-red" />
                Sydney's Trusted Driving Academy
              </div>
              <p className="text-xl font-display font-bold">Empowering safer drivers across NSW with patient, structured coaching.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-red uppercase tracking-widest bg-brand-red/10 px-4 py-1.5 rounded-full mb-4">
              Patient • Certified • High Pass Rate
            </div>
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-6 tracking-tight">
              Building Safe & Confident Drivers For Life
            </h2>
            <p className="text-base sm:text-lg text-brand-black/75 mb-6 leading-relaxed">
              Wally's Driving School is proud to be one of Sydney's fastest-growing driving academies. Our team is composed of highly qualified, patient Driver Trainers who are friendly and supportive, ensuring every learner feels completely at ease behind the wheel.
            </p>
            <p className="text-base sm:text-lg text-brand-black/75 mb-8 leading-relaxed">
              We provide Class C licence training in dual-controlled automatic vehicles, creating a calm and secure environment. Every standard 1-hour lesson gives you <strong>3 Logbook Hours</strong> under the NSW 3-for-1 scheme (up to 30 hours).
            </p>
            
            {/* Skill Bar */}
            <div className="w-full mb-10 bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex justify-between font-bold text-sm mb-2">
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-red" /> Practical Test First-Time Pass Rate</span>
                <span className="text-brand-red font-display text-lg">99%</span>
              </div>
              <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "99%" }}
                  transition={{ duration: 1.5, type: "spring" }}
                  viewport={{ once: true }}
                  className="h-full bg-gradient-to-r from-brand-red to-red-400 rounded-full"
                />
              </div>
            </div>

            <Link 
              to="/packages" 
              className="inline-flex items-center gap-2 bg-brand-black text-white px-8 py-4 rounded-full font-bold text-base hover:bg-brand-red transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span>Explore Our Packages</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* Our Team Section */}
        <div className="mb-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red">Dedicated Instructors</span>
            <h2 className="text-4xl md:text-5xl font-display font-bold mt-2 mb-4">Meet Your Expert Trainers</h2>
            <p className="text-base text-brand-black/70 max-w-2xl mx-auto">
              Fully insured, police checked, and RMS licensed professionals passionate about patient guidance.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: 'alvert-tine',
                name: 'Alvert Tine',
                role: 'Senior Driving Instructor',
                image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600',
                exp: '10+ Years Experience'
              },
              {
                id: 'sara-liner',
                name: 'Sara Liner',
                role: 'Driving Instructor & Safety Specialist',
                image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600',
                exp: '7+ Years Experience'
              },
              {
                id: 'mark-wood',
                name: 'Mark Wood',
                role: 'RMS Driving Test Specialist',
                image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600',
                exp: '8+ Years Experience'
              }
            ].map((instructor, index) => (
              <motion.div
                key={instructor.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-white rounded-[36px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-black/5 flex flex-col group"
              >
                <div className="h-72 w-full overflow-hidden relative">
                  <img 
                    src={instructor.image} 
                    alt={instructor.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  <div className="absolute top-4 right-4 bg-brand-black/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full">
                    {instructor.exp}
                  </div>
                </div>
                <div className="p-8 text-center flex-grow flex flex-col justify-center">
                  <h3 className="text-2xl font-bold font-display text-brand-black mb-1 group-hover:text-brand-red transition-colors">
                    {instructor.name}
                  </h3>
                  <p className="text-brand-red font-semibold text-sm mb-4">{instructor.role}</p>
                  <div className="flex items-center justify-center gap-1 text-[#FFB800]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#FFB800]" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Location Map */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-[40px] p-4 sm:p-6 shadow-2xl border border-black/5 overflow-hidden h-[500px] mb-24"
        >
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3316.156452094375!2d150.832614!3d-33.782457799999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x61e217baec8826d1%3A0xa738bb52089c7f1e!2sWallys%20Driving%20School!5e0!3m2!1sen!2s!4v1788371550806!5m2!1sen!2s" 
            width="100%" 
            height="100%" 
            style={{ border: 0, borderRadius: '32px' }} 
            allowFullScreen 
            loading="lazy" 
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </motion.div>
      </div>

      {/* Closing CTA */}
      <section className="pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-brand-black rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden group shadow-2xl"
          >
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-brand-red font-bold text-xs uppercase tracking-widest mb-3 block">Ready Behind The Wheel?</span>
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8 tracking-tight">
                Book Your First Driving Lesson Today
              </h2>
              <Link 
                to="/book-now" 
                className="inline-block bg-brand-red text-white px-10 py-5 rounded-full font-bold text-lg hover:bg-white hover:text-brand-black transition-all duration-300 shadow-[0_0_30px_rgba(227,34,42,0.4)]"
              >
                Book Online Now
              </Link>
            </div>
            
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -right-20 -top-20 w-96 h-96 border-[40px] border-brand-red rounded-full" />
              <div className="absolute -left-20 -bottom-20 w-96 h-96 border-[40px] border-brand-red rounded-full" />
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
