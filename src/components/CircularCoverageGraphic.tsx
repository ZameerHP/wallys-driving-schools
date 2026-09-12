import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Search, CheckCircle2, Phone, MessageCircle, Info } from 'lucide-react';

interface SuburbNode {
  name: string;
  postcode: string;
  x: number; // percentage coordinate 0-100
  y: number; // percentage coordinate 0-100
  hub?: boolean;
  rmsTestCentre?: boolean;
  type: 'core' | 'extended';
}

const COVERED_SUBURBS: SuburbNode[] = [
  // Primary Operations Hub
  { name: 'Mount Druitt', postcode: '2770', x: 44, y: 50, hub: true, rmsTestCentre: true, type: 'core' },
  { name: 'Rooty Hill', postcode: '2766', x: 50, y: 53, hub: true, type: 'core' },
  
  // Western Sector
  { name: 'St Marys', postcode: '2760', x: 32, y: 52, rmsTestCentre: true, type: 'core' },
  { name: 'Penrith', postcode: '2750', x: 20, y: 50, rmsTestCentre: true, type: 'extended' },
  { name: 'Jordan Springs', postcode: '2747', x: 23, y: 38, type: 'extended' },
  
  // Eastern Sector
  { name: 'Doonside', postcode: '2767', x: 60, y: 48, type: 'core' },
  { name: 'Blacktown', postcode: '2148', x: 72, y: 46, rmsTestCentre: true, type: 'core' },
  { name: 'Seven Hills', postcode: '2147', x: 80, y: 42, type: 'extended' },
  
  // Northern Sector
  { name: 'Plumpton', postcode: '2761', x: 48, y: 40, type: 'core' },
  { name: 'Oakhurst', postcode: '2761', x: 42, y: 35, type: 'core' },
  { name: 'Glendenning', postcode: '2761', x: 55, y: 36, type: 'core' },
  { name: 'Dean Park', postcode: '2761', x: 50, y: 30, type: 'core' },
  { name: 'Marsden Park', postcode: '2765', x: 40, y: 22, type: 'extended' },
  { name: 'Schofields', postcode: '2762', x: 62, y: 24, type: 'extended' },
  { name: 'The Ponds', postcode: '2769', x: 70, y: 26, type: 'extended' },
  
  // Southern Sector
  { name: 'Minchinbury', postcode: '2770', x: 45, y: 62, type: 'core' },
  { name: 'Eastern Creek', postcode: '2766', x: 54, y: 63, type: 'core' },
  { name: 'St Clair', postcode: '2759', x: 35, y: 65, type: 'core' },
  { name: 'Western Sydney Parklands', postcode: '2167', x: 63, y: 66, type: 'core' },
  { name: 'Wetherill Park', postcode: '2164', x: 70, y: 72, type: 'extended' }
];

const OUT_OF_AREA = [
  { name: 'Blue Mountains', x: 8, y: 55 },
  { name: 'Parramatta', x: 92, y: 58 },
  { name: 'Castle Hill', x: 85, y: 18 },
  { name: 'Liverpool', x: 82, y: 82 }
];

export function CircularCoverageGraphic() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSuburb, setHoveredSuburb] = useState<SuburbNode | null>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbNode | null>(COVERED_SUBURBS[0]);

  const filteredSuburbs = COVERED_SUBURBS.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.postcode.includes(searchQuery)
  );

  const isSearchMatching = searchQuery.trim().length > 0;
  const isMatchFound = filteredSuburbs.length > 0;

  return (
    <div className="w-full bg-[#0b1329] text-white rounded-[36px] sm:rounded-[44px] p-4 sm:p-8 md:p-10 shadow-2xl border border-sky-900/40 relative overflow-hidden">
      {/* Background Decorative Mesh & Radial Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header controls & live suburb checker */}
      <div className="relative z-20 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sky-800/30 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-widest mb-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block" />
            Active Service Zone
          </div>
          <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2.5">
            Western Sydney Coverage Zone
          </h3>
          <p className="text-xs sm:text-sm text-sky-200/70 mt-1 max-w-xl">
            Free door-to-door pickup & drop-off within our ~20 km radius circle across all listed Western Sydney suburbs.
          </p>
        </div>

        {/* Search Suburb Pill */}
        <div className="w-full lg:w-80">
          <div className="relative">
            <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suburb or postcode (e.g. 2766)..."
              className="w-full bg-sky-950/60 border border-sky-500/40 focus:border-sky-400 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-sky-300/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sky-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Instant Search Result Notification */}
          {isSearchMatching && (
            <div className="mt-2 text-xs font-medium">
              {isMatchFound ? (
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Found {filteredSuburbs.length} matching area(s) — Free pickup available!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Outside primary circle. Message Wallsy for custom availability!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main SVG & Interactive Circular Coverage Graphic */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] max-h-[620px] bg-[#070e20] rounded-[28px] sm:rounded-[36px] border border-sky-500/20 overflow-hidden shadow-inner flex items-center justify-center select-none">
        
        {/* Subtle Map Grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c70d_1px,transparent_1px),linear-gradient(to_bottom,#0284c70d_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {/* SVG Graphic Canvas */}
        <svg 
          viewBox="0 0 800 500" 
          className="w-full h-full absolute inset-0 z-10"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Sky Blue Radial Glow for the circular service zone */}
            <radialGradient id="skyCircleGradient" cx="48%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.22" />
              <stop offset="90%" stopColor="#0369a1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
            </radialGradient>

            {/* Pulsing ring filter */}
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Major Highway / Motorway Network Paths (Stylized road geometry) */}
          {/* M4 Western Motorway (Horizontal East-West) */}
          <path 
            d="M 50 280 C 180 275, 300 270, 420 268 C 550 266, 680 260, 780 255" 
            stroke="#0284c7" 
            strokeWidth="3" 
            strokeOpacity="0.4"
            fill="none" 
          />
          {/* Great Western Highway (A44) */}
          <path 
            d="M 60 250 C 200 255, 360 250, 500 248 C 620 245, 720 238, 770 230" 
            stroke="#38bdf8" 
            strokeWidth="2" 
            strokeDasharray="4 4"
            strokeOpacity="0.35"
            fill="none" 
          />
          {/* M7 Westlink (Diagonal North-South) */}
          <path 
            d="M 450 40 C 470 120, 480 200, 460 300 C 440 380, 520 440, 580 480" 
            stroke="#0ea5e9" 
            strokeWidth="3" 
            strokeOpacity="0.45"
            fill="none" 
          />

          {/* ROAD LABELS */}
          <text x="140" y="270" fill="#38bdf8" fillOpacity="0.6" fontSize="9" fontWeight="bold" letterSpacing="1">
            M4 MOTORWAY
          </text>
          <text x="495" y="100" fill="#38bdf8" fillOpacity="0.6" fontSize="9" fontWeight="bold" letterSpacing="1" transform="rotate(75, 495, 100)">
            M7 WESTLINK
          </text>
          <text x="150" y="242" fill="#7dd3fc" fillOpacity="0.5" fontSize="8" letterSpacing="1">
            GREAT WESTERN HWY (A44)
          </text>

          {/* ======================================================== */}
          {/* THE PROMINENT BLUE / SKY-BLUE SERVICE AREA COVERAGE CIRCLE */}
          {/* ======================================================== */}

          {/* 1. Outer Pulse Ambient Ring */}
          <circle 
            cx="390" 
            cy="250" 
            r="230" 
            fill="none" 
            stroke="#38bdf8" 
            strokeWidth="1.5" 
            strokeDasharray="6 6"
            strokeOpacity="0.3"
          />

          {/* 2. Inner concentric radius guides (10km, 15km) */}
          <circle 
            cx="390" 
            cy="250" 
            r="120" 
            fill="none" 
            stroke="#38bdf8" 
            strokeWidth="1" 
            strokeDasharray="4 4"
            strokeOpacity="0.2"
          />
          <text x="395" y="138" fill="#7dd3fc" fillOpacity="0.5" fontSize="8" fontWeight="semibold">
            ~10 km Radius
          </text>

          <circle 
            cx="390" 
            cy="250" 
            r="175" 
            fill="none" 
            stroke="#38bdf8" 
            strokeWidth="1" 
            strokeDasharray="4 4"
            strokeOpacity="0.25"
          />
          <text x="395" y="82" fill="#7dd3fc" fillOpacity="0.5" fontSize="8" fontWeight="semibold">
            ~15 km Radius
          </text>

          {/* 3. MAIN SKY-BLUE SERVICE CIRCLE (Primary Coverage Zone) */}
          <circle 
            cx="390" 
            cy="250" 
            r="215" 
            fill="url(#skyCircleGradient)" 
            stroke="#38bdf8" 
            strokeWidth="3" 
            strokeOpacity="0.85"
            filter="url(#glowFilter)"
          />

          {/* Top badge on circle: ~20KM SERVICE RADIUS */}
          <g transform="translate(390, 35)">
            <rect 
              x="-85" 
              y="-12" 
              width="170" 
              height="24" 
              rx="12" 
              fill="#0284c7" 
              stroke="#38bdf8" 
              strokeWidth="1.5" 
            />
            <text 
              x="0" 
              y="4" 
              fill="#ffffff" 
              fontSize="10" 
              fontWeight="bold" 
              textAnchor="middle" 
              letterSpacing="0.5"
            >
              ~20 KM SERVICE RADIUS
            </text>
          </g>

          {/* Bottom badge on circle: FREE DOOR-TO-DOOR PICKUP */}
          <g transform="translate(390, 465)">
            <rect 
              x="-95" 
              y="-12" 
              width="190" 
              height="24" 
              rx="12" 
              fill="#0369a1" 
              stroke="#38bdf8" 
              strokeWidth="1.5" 
            />
            <text 
              x="0" 
              y="4" 
              fill="#ffffff" 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle" 
              letterSpacing="0.5"
            >
              FREE HOME & SCHOOL PICKUP
            </text>
          </g>
        </svg>

        {/* OUT-OF-AREA PERIPHERAL LABELS */}
        {OUT_OF_AREA.map((out, idx) => (
          <div 
            key={idx}
            style={{ left: `${out.x}%`, top: `${out.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-40 hover:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-1 text-[10px] text-sky-200/60 font-semibold px-2 py-0.5 rounded-full border border-sky-800/30 bg-sky-950/40 whitespace-nowrap">
              <span>{out.name}</span>
            </div>
          </div>
        ))}

        {/* INTERACTIVE SUBURB NODES / PINS */}
        {COVERED_SUBURBS.map((suburb) => {
          const isSelected = selectedSuburb?.name === suburb.name;
          const isHovered = hoveredSuburb?.name === suburb.name;
          const matchesSearch = isSearchMatching && suburb.name.toLowerCase().includes(searchQuery.toLowerCase());
          
          return (
            <div
              key={suburb.name}
              style={{ left: `${suburb.x}%`, top: `${suburb.y}%` }}
              onMouseEnter={() => setHoveredSuburb(suburb)}
              onMouseLeave={() => setHoveredSuburb(null)}
              onClick={() => setSelectedSuburb(suburb)}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
            >
              {/* Hub / Center Pin for Mount Druitt / Rooty Hill */}
              {suburb.hub ? (
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-8 h-8 rounded-full bg-brand-red/30 animate-ping pointer-events-none" />
                  <div className="w-5 h-5 rounded-full bg-brand-red text-white flex items-center justify-center shadow-[0_0_15px_rgba(227,34,42,0.8)] border-2 border-white">
                    <MapPin className="w-3 h-3" />
                  </div>
                  
                  {/* Pin label */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg border border-white/20">
                    {suburb.name}
                  </div>
                </div>
              ) : (
                /* Regular Suburb Node */
                <div className="relative flex flex-col items-center">
                  <div 
                    className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                      matchesSearch 
                        ? 'bg-emerald-400 border-white scale-150 shadow-[0_0_12px_#34d399]' 
                        : isSelected || isHovered
                          ? 'bg-sky-400 border-white scale-125 shadow-[0_0_10px_#38bdf8]'
                          : suburb.rmsTestCentre
                            ? 'bg-amber-400 border-amber-200 shadow-[0_0_8px_#fbbf24]'
                            : 'bg-sky-600 border-sky-300 group-hover:bg-sky-400'
                    }`} 
                  />

                  {/* Text Badge */}
                  <div 
                    className={`mt-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap transition-all ${
                      matchesSearch
                        ? 'bg-emerald-500 text-black shadow-md scale-110'
                        : isSelected || isHovered
                          ? 'bg-sky-400 text-black shadow-md'
                          : 'bg-sky-950/80 text-sky-100/90 border border-sky-800/40 group-hover:text-white group-hover:border-sky-500/60'
                    }`}
                  >
                    {suburb.name}
                  </div>
                </div>
              )}

              {/* Hover / Click Tooltip */}
              <AnimatePresence>
                {(isHovered || (isSelected && !hoveredSuburb)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl border border-sky-500/40 shadow-2xl z-30 pointer-events-none text-left"
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{suburb.name}</span>
                      <span className="text-[10px] text-sky-400">NSW {suburb.postcode}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Covered for Free Pickup
                    </div>
                    {suburb.rmsTestCentre && (
                      <div className="text-[10px] text-amber-300 font-medium mt-1">
                        ★ RMS Testing Centre Location
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Suburb Badges and Details Footer */}
      <div className="mt-6 pt-5 border-t border-sky-800/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-brand-red border border-white" />
            <span className="text-sky-200/80">Primary Operations Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-sky-200/80">RMS Driving Test Centres</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-sky-200/80">Door-to-Door Service Suburbs</span>
          </div>
        </div>

        {/* Action WhatsApp Contact */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-sky-200/70 hidden sm:inline">
            Suburbs outside the circle?
          </span>
          <a
            href="https://wa.me/61406693301?text=Hi%20Wallsy,%20can%20you%20confirm%20if%20you%20can%20pick%20me%20up%20from%20my%20suburb?"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Ask Wallsy on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
