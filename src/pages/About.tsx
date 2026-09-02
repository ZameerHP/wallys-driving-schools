import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function About() {
  return (
    <div className="pt-32 bg-brand-offwhite min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-brand-black/50 mb-4 uppercase tracking-wider">
            <Link to="/" className="hover:text-brand-red">Wallys Driving School</Link>
            <span>/</span>
            <span className="text-brand-red">About</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold">ABOUT US</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-[40px] overflow-hidden shadow-2xl h-[500px]"
          >
            <img src="https://images.unsplash.com/photo-1595054173872-3580455c11f7?auto=format&fit=crop&q=80&w=1200" alt="About Us" className="w-full h-full object-cover" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-display font-bold mb-6">Building Safe & Confident Drivers</h2>
            <p className="text-lg text-brand-black/70 mb-6">
              Wally's Driving School is proud to be one of Sydney's fastest-growing driving schools. Our team is made up of highly qualified, professional, and patient Driver Trainers who are friendly and supportive, ensuring every student feels at ease behind the wheel.
            </p>
            <p className="text-lg text-brand-black/70 mb-8">
              Our mission is to create safe, confident, and capable drivers, while making the learning process both enjoyable and stress-free. We provide Class C licence training in dual-controlled automatic vehicles, offering a safe and reliable environment for learners.
            </p>
            
            <div className="w-full mb-10">
              <div className="flex justify-between font-bold mb-2">
                <span>Driving Skill Success Rate</span>
                <span>99%</span>
              </div>
              <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "99%" }}
                  transition={{ duration: 1.5, type: "spring" }}
                  viewport={{ once: true }}
                  className="h-full bg-brand-red rounded-full"
                />
              </div>
            </div>

            <Link to="/packages" className="bg-brand-black text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-brand-red transition-colors inline-block">
              Explore Our Packages
            </Link>
          </motion.div>
        </div>

        {/* Our Team Section */}
        <div className="mb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">Our Instructors</h2>
            <p className="text-lg text-brand-black/70 max-w-2xl mx-auto">
              Meet our team of professional and patient driving instructors dedicated to your success.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: 'alvert-tine',
                name: 'Alvert Tine',
                role: 'Senior Driving Instructor',
                image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600'
              },
              {
                id: 'sara-liner',
                name: 'Sara Liner',
                role: 'Driving Instructor',
                image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600'
              },
              {
                id: 'mark-wood',
                name: 'Mark Wood',
                role: 'Driving Instructor',
                image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600'
              }
            ].map((instructor, index) => (
              <motion.div
                key={instructor.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[32px] overflow-hidden shadow-lg shadow-black/5"
              >
                <div className="h-64 w-full">
                  <img src={instructor.image} alt={instructor.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-8 text-center">
                  <h3 className="text-2xl font-bold font-display text-brand-black mb-2">{instructor.name}</h3>
                  <p className="text-brand-red font-medium">{instructor.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Map Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-[40px] p-4 shadow-xl border border-black/5 overflow-hidden h-[500px] mb-24"
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

      {/* CLOSING BANNER */}
      <section className="pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-brand-black rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-8">Book Your First Driving Lesson Today</h2>
              <Link to="/book-now" className="inline-block bg-brand-red text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-white hover:text-brand-black transition-colors">
                Book Now
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
