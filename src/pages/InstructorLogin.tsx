import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, ChevronDown, User, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

const APPOINTMENTS = [
  {
    date: 'Today, 24 Oct',
    items: [
      { id: 1, time: '09:00 AM', type: '1 Hour Driving Lesson', client: 'Sarah Jenkins', status: 'Approved' },
      { id: 2, time: '11:30 AM', type: 'Driving Test Package', client: 'Michael Chen', status: 'Pending' }
    ]
  },
  {
    date: 'Tomorrow, 25 Oct',
    items: [
      { id: 3, time: '10:00 AM', type: '2 Hours Lesson', client: 'Emma Wilson', status: 'Approved' }
    ]
  }
];

export function InstructorLogin() {
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<number | null>(null);

  return (
    <div className="pt-24 bg-brand-offwhite min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-64 bg-brand-black text-white shrink-0 min-h-screen p-6 sticky top-0 md:h-screen overflow-y-auto z-20"
      >
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-full bg-brand-red flex items-center justify-center shrink-0">
            <span className="text-white font-display font-bold text-sm">W</span>
          </div>
          <span className="font-display font-bold text-lg leading-none tracking-tight">Instructor Panel</span>
        </div>

        <nav className="flex flex-col gap-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-brand-red rounded-xl font-medium">
            <Calendar className="w-5 h-5" />
            Appointments
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors">
            <Clock className="w-5 h-5" />
            Events
          </a>
          <div className="my-4 h-px bg-white/10" />
          <Link to="/" className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-medium transition-colors mt-auto">
            Log out
          </Link>
        </nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 lg:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">Appointments</h1>
              <p className="text-brand-black/60">Manage your upcoming driving lessons and tests.</p>
            </div>
          </div>

          <div className="space-y-12">
            {APPOINTMENTS.map((group, i) => (
              <div key={i} className="relative">
                <div className="sticky top-24 z-10 bg-brand-offwhite/80 backdrop-blur-md py-4 mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-red" />
                    {group.date}
                  </h2>
                </div>
                
                <div className="space-y-4 pl-4 border-l-2 border-black/5 relative">
                  {group.items.map((apt, j) => (
                    <motion.div 
                      key={apt.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: j * 0.1 }}
                      className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 relative hover:border-black/10 transition-colors"
                    >
                      <div className="absolute top-1/2 -left-[21px] w-4 h-4 rounded-full bg-white border-2 border-brand-red -translate-y-1/2" />
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 font-bold text-brand-red mb-1">
                            <Clock className="w-4 h-4" />
                            {apt.time}
                          </div>
                          <h3 className="text-lg font-bold mb-2">{apt.type}</h3>
                          <div className="flex items-center gap-2 text-sm text-brand-black/60">
                            <User className="w-4 h-4" />
                            {apt.client}
                          </div>
                        </div>

                        <div className="relative">
                          <button 
                            onClick={() => setActiveStatusDropdown(activeStatusDropdown === apt.id ? null : apt.id)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors",
                              apt.status === 'Approved' ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                            )}
                          >
                            {apt.status === 'Approved' && <CheckCircle2 className="w-4 h-4" />}
                            {apt.status}
                            <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                          </button>
                          
                          {activeStatusDropdown === apt.id && (
                            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-xl border border-black/5 overflow-hidden z-20 origin-top-right animate-in fade-in zoom-in-95 duration-200">
                              <button onClick={() => setActiveStatusDropdown(null)} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-black/5">Approved</button>
                              <button onClick={() => setActiveStatusDropdown(null)} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-black/5">Pending</button>
                              <button onClick={() => setActiveStatusDropdown(null)} className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-black/5 text-red-600">Cancel</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
