const fs = require('fs');
let code = fs.readFileSync('src/pages/BookNow.tsx', 'utf8');

// Replace Wizard Form Area container
code = code.replace(
  'className="lg:col-span-3 bg-white rounded-[36px] p-8 md:p-12 shadow-xl border border-black/5 min-h-[500px] lg:h-[calc(100vh-250px)] lg:max-h-[800px] lg:overflow-y-auto flex flex-col justify-between"',
  'className="lg:col-span-3 bg-white rounded-[36px] p-8 md:p-12 shadow-xl border border-black/5 min-h-[500px] lg:h-[calc(100vh-250px)] lg:max-h-[800px] flex flex-col justify-between"'
);

// We need to change the AnimatePresence layout.
// Find the start of AnimatePresence: `<AnimatePresence mode="wait">`
// Replace with `<div className="flex-grow overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">\n              <AnimatePresence mode="wait">`
code = code.replace(
  '<AnimatePresence mode="wait">',
  '<div className="flex-grow overflow-y-auto pr-2 sm:pr-4 custom-scrollbar mb-6">\n                <AnimatePresence mode="wait">'
);

// Find the Stepper Buttons comment
code = code.replace(
  '{/* Stepper Buttons */}',
  '</AnimatePresence>\n              </div>\n\n              {/* Stepper Buttons */}'
);

// Remove the closing AnimatePresence tag that was at the end
code = code.replace(
  '                </div>\n              </AnimatePresence>\n            )}',
  '                </div>\n            )}'
);

fs.writeFileSync('src/pages/BookNow.tsx', code);
