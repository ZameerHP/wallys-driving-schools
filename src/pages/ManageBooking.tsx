import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function ManageBooking() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="pt-32 pb-24 bg-brand-black min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Background accents */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute -left-40 top-20 w-96 h-96 border-[40px] border-brand-red rounded-full mix-blend-screen" />
        <div className="absolute right-0 bottom-0 w-[800px] h-[800px] bg-brand-red rounded-full mix-blend-screen filter blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/60">Enter your credentials to access your account.</p>
          </div>

          <form className="flex flex-col gap-6">
            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">Email or Username</label>
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white/80 mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-red focus:bg-white/10 transition-colors"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-brand-red text-white font-bold rounded-xl py-4 hover:bg-brand-red/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(227,34,42,0.3)] mt-2">
              Sign In
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="#" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Forgot your password? <span className="text-brand-red underline decoration-brand-red/30 underline-offset-4">Reset Password</span>
            </a>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center text-white/40 text-sm">
          <Link to="/" className="hover:text-white transition-colors">← Back to Wallys Driving School</Link>
        </div>
      </div>
    </div>
  );
}
