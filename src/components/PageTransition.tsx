import { motion } from "framer-motion";
import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <>
      <motion.div
        key={`page-${location.pathname}`}
        initial={{ x: "0%", opacity: 0 }}
        animate={{ x: "0%", opacity: 1 }}
        exit={{ x: "-20%", opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        className="w-full h-full min-h-screen"
      >
        {children}
      </motion.div>
      <motion.div
        key={`wipe-${location.pathname}`}
        initial={{ x: "100%" }}
        animate={{ x: "-100%" }}
        exit={{ x: "-100%" }}
        transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
        className="fixed inset-0 z-[100] bg-brand-black pointer-events-none"
      />
    </>
  );
}
