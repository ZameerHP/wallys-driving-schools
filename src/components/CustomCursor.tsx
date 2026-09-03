import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export function CustomCursor() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const cursorTextRef = useRef<HTMLSpanElement>(null);
  const [cursorText, setCursorText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Disable on touch devices
    if (typeof window !== 'undefined') {
      const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      if (isTouch) {
        setIsTouchDevice(true);
        return;
      }
    }

    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    // High performance GSAP quickTo
    const setDotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power2.out' });
    const setDotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power2.out' });
    const setRingX = gsap.quickTo(ring, 'x', { duration: 0.3, ease: 'power3.out' });
    const setRingY = gsap.quickTo(ring, 'y', { duration: 0.3, ease: 'power3.out' });

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      if (!isVisible) setIsVisible(true);

      setDotX(clientX);
      setDotY(clientY);
      setRingX(clientX);
      setRingY(clientY);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    // Magnetic and hover delegate listener
    const handleElementHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest('a, button, [data-cursor], [data-magnetic], input, select, textarea, .cursor-pointer');
      
      if (interactive) {
        setIsHovered(true);
        const customText = interactive.getAttribute('data-cursor-text');
        if (customText) {
          setCursorText(customText);
        } else {
          setCursorText('');
        }
      } else {
        setIsHovered(false);
        setCursorText('');
      }
    };

    // Magnetic effect handler
    const magneticElements = document.querySelectorAll<HTMLElement>('[data-magnetic]');
    const cleanups: Array<() => void> = [];

    magneticElements.forEach((el) => {
      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(el, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.3,
          ease: 'power2.out',
        });
      };

      const onLeave = () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.3)',
        });
      };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);

      cleanups.push(() => {
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
      });
    });

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleElementHover);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleElementHover);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      cleanups.forEach((c) => c());
    };
  }, [isVisible]);

  if (isTouchDevice) return null;

  return (
    <>
      {/* Precision Center Dot */}
      <div
        ref={cursorDotRef}
        className="pointer-events-none fixed top-0 left-0 z-[999999] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-300"
        style={{
          width: isHovered ? '0px' : '6px',
          height: isHovered ? '0px' : '6px',
          backgroundColor: '#E3222A',
          boxShadow: '0 0 10px rgba(227, 34, 42, 0.8)',
          opacity: isVisible ? 1 : 0,
        }}
      />

      {/* Fluid Trailing Ring with Mix-Blend Mode */}
      <div
        ref={cursorRingRef}
        className="pointer-events-none fixed top-0 left-0 z-[999998] flex items-center justify-center -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
        style={{
          width: isHovered ? (cursorText ? '80px' : '52px') : '32px',
          height: isHovered ? (cursorText ? '80px' : '52px') : '32px',
          border: isHovered ? '1.5px solid rgba(227, 34, 42, 0.9)' : '1px solid rgba(255, 255, 255, 0.4)',
          backgroundColor: isHovered ? 'rgba(227, 34, 42, 0.12)' : 'transparent',
          backdropFilter: isHovered ? 'blur(4px)' : 'none',
          boxShadow: isHovered ? '0 0 25px rgba(227, 34, 42, 0.35)' : 'none',
          opacity: isVisible ? 1 : 0,
        }}
      >
        {cursorText && (
          <span 
            ref={cursorTextRef}
            className="text-[10px] font-bold uppercase tracking-widest text-white drop-shadow-md select-none"
          >
            {cursorText}
          </span>
        )}
      </div>
    </>
  );
}
