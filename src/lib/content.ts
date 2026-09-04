export const INSTRUCTORS = [
  {
    id: 'alvert-tine',
    name: 'Alvert Tine',
    role: 'Senior Driving Instructor',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'sara-liner',
    name: 'Sara Liner',
    role: 'Driving Instructor',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'mark-wood',
    name: 'Mark Wood',
    role: 'Driving Instructor',
    image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400'
  }
];

export const ADDITIONAL_SERVICES = [
  {
    id: 'instructor-training',
    title: 'Instructor Training',
    description: 'Professional training programs to become a certified driving instructor.',
    icon: 'Car'
  },
  {
    id: 'road-safety-guide',
    title: 'Road Safety Guide',
    description: 'Comprehensive road safety courses and guidelines for all drivers.',
    icon: 'ShieldCheck'
  },
  {
    id: 'driving-license',
    title: 'Driving License',
    description: 'Step-by-step assistance and training for obtaining your driving license.',
    icon: 'FileText'
  }
];

export const PACKAGES = [
  {
    id: '60-min-lesson',
    price: 65,
    hours: 3,
    title: '60 Minutes Lesson',
    label: '3 Log Book Hours',
    description: 'Focused one-hour guided lesson targeting specific logbook skills for learners or test prep.',
    category: 'Lessons'
  },
  {
    id: '2-hour-lesson',
    price: 130,
    hours: 6,
    title: '2 Hours Lesson',
    label: '6 Log Book Hours',
    description: 'Two-hour intensive session refining skills and building test readiness on local routes.',
    category: 'Lessons'
  },
  {
    id: '5-hours-pack',
    price: 315,
    hours: 15,
    title: '5 Hours Pack',
    label: '15 Log Book Hours',
    description: 'Five hours of training to assess skills and target weaknesses for intermediate learners.',
    category: 'Hour Packs'
  },
  {
    id: '10-hours-pack',
    price: 620,
    hours: 30,
    title: '10 Hours Pack',
    label: '30 Log Book Hours',
    description: 'Comprehensive 10-lesson course building essential vehicle control for absolute beginners.',
    category: 'Hour Packs'
  },
  {
    id: 'test-1-lesson',
    price: 200,
    hours: null,
    title: 'Driving Test Package',
    label: 'Car Hire & 1 Lesson',
    description: 'School car hire for the RMS test plus a 1-hour pre-test practice session.',
    category: 'Test Packages'
  },
  {
    id: 'test-2-lesson',
    price: 250,
    hours: null,
    title: 'Driving Test Package',
    label: 'Car Hire & 2 Lessons',
    description: 'School car hire for the RMS test plus a 2-hour pre-test practice session.',
    category: 'Test Packages'
  }
];

export interface TestimonialItem {
  id: number;
  quote: string;
  author: string;
  title: string;
  rating: number;
  dpType: 'badge' | 'initial';
  dpText: string;
  dpBg: string;
  dpColor: string;
}

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 1,
    author: 'Ishan Wickremasinghe',
    title: 'Driving Student',
    rating: 5,
    quote: "Had a great experience with Wally's Driving School! My instructor was patient, calm and explained everything clearly. They were flexible with scheduling and really helped build my confidence behind the wheel. Highly recommend if you are looking for a supportive and professional driving instructor",
    dpType: 'badge',
    dpText: 'ASPHALT',
    dpBg: 'bg-zinc-950 border border-amber-500/40',
    dpColor: 'text-amber-400'
  },
  {
    id: 2,
    author: 'Micheal Pablo',
    title: 'Driving Student',
    rating: 5,
    quote: "I had an excellent experience learning to drive with Wally. He is a great teacher—very professional, clear with instructions, and patient. From the very first lesson, he made me feel comfortable and confident behind the wheel. His calm approach and clear explanations helped me quickly understand both the basics and more advanced driving techniques. I highly recommend him to anyone looking for a supportive and skilled driving instructor. Thank you.",
    dpType: 'initial',
    dpText: 'M',
    dpBg: 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]',
    dpColor: 'text-white'
  },
  {
    id: 3,
    author: 'Timaima Koro',
    title: 'Driving Student',
    rating: 5,
    quote: "Amazing instructor! Patient, clear and made learning to drive very easy. Thanks to hes guidance I passed first attempt.",
    dpType: 'initial',
    dpText: 'T',
    dpBg: 'bg-emerald-600 shadow-[0_0_20px_rgba(5,150,105,0.4)]',
    dpColor: 'text-white'
  },
  {
    id: 4,
    author: 'Jia',
    title: 'Driving Student',
    rating: 5,
    quote: "Wally is a fantastic supportive. His c... stress-free. Tha... confidence! Highe... 10/10!!",
    dpType: 'initial',
    dpText: 'J',
    dpBg: 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.4)]',
    dpColor: 'text-white'
  },
  {
    id: 5,
    author: 'Lalit Sharma',
    title: 'Driving Student',
    rating: 5,
    quote: "Was facing problem in parallel parking but the trick which instructor gave me, worked and I passed my test in a one go.",
    dpType: 'initial',
    dpText: 'L',
    dpBg: 'bg-gradient-to-tr from-purple-600 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]',
    dpColor: 'text-white'
  },
  {
    id: 6,
    author: 'Phat Nguyen',
    title: 'Driving Student',
    rating: 5,
    quote: "Best teacher of the area. I was failed multiple time til I met him. +100 respect",
    dpType: 'initial',
    dpText: 'P',
    dpBg: 'bg-purple-700 shadow-[0_0_20px_rgba(126,34,206,0.4)]',
    dpColor: 'text-white'
  },
  {
    id: 7,
    author: 'Shahid Durrani',
    title: 'Driving Student',
    rating: 5,
    quote: "I passed my driving test on the first attempt thanks to their comprehensive lessons and supportive instructors. I highly recommend Wallys Driving School if you're looking to pass your test with confidence. Just make sure to practice as much as you can between lessons!",
    dpType: 'initial',
    dpText: 'S',
    dpBg: 'bg-sky-600 shadow-[0_0_20px_rgba(2,132,199,0.4)]',
    dpColor: 'text-white'
  }
];

export const BLOG_POSTS = [
  {
    id: 'post-1',
    title: '5 Ways That Can Develop Your Driving Skill',
    author: 'waleed_khurram',
    role: 'Teacher',
    date: '18 DEC 2023',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=600',
    content: `
      <p>Driving is much more than just operating a vehicle; it is a vital life skill that requires continuous refinement, spatial awareness, and situational judgment. Whether you are a brand-new learner or looking to sharpen your abilities behind the wheel, here are five proven ways to rapidly develop your driving skills:</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">1. Master Your Mirror and Blind Spot Checks</h3>
      <p>Habitual checking of your rearview and side mirrors every 5 to 8 seconds builds a complete 360-degree mental map of your surroundings. Always combine your mirror checks with a quick shoulder glance to eliminate blind spots before changing lanes or merging.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">2. Practice Defensive Driving</h3>
      <p>Anticipate the mistakes of other motorists rather than reacting to them at the last second. Keep a safe following distance (at least a 3-second gap in dry conditions) to give yourself adequate stopping time if traffic halts unexpectedly.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">3. Focus on Smooth Acceleration and Braking</h3>
      <p>Jerky movements indicate poor vehicle control. Practice easing onto the accelerator and applying progressive, smooth pressure to the brake pedal. Not only does this protect your vehicle's brakes, but it also creates a much more comfortable experience for your passengers.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">4. Expose Yourself to Diverse Conditions</h3>
      <p>Don't just practice on sunny days on quiet suburban streets. Gradually challenge yourself by driving during peak rush hours, at night, and in wet weather conditions. Gaining experience across varied environments builds unshakable confidence.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">5. Seek Regular Professional Feedback</h3>
      <p>It is very easy to pick up bad habits over time without realizing it. Booking a professional refresher lesson with an expert instructor helps correct minor errors before they become unsafe driving habits.</p>
    `
  },
  {
    id: 'post-2',
    title: 'Why Do You Need Driving Lessons?',
    author: 'waleed_khurram',
    role: 'Teacher',
    date: '18 DEC 2023',
    image: 'https://images.unsplash.com/photo-1516224364402-4b2169c73335?auto=format&fit=crop&q=80&w=600',
    content: `
      <p>Learning to drive from friends or family members might seem like an easy way to save money, but it often comes with hidden risks—namely, passing down bad driving habits and uncertified instruction. Investing in structured professional driving lessons is essential for long-term safety and success on the road.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Structured Curriculum and Progression</h3>
      <p>Professional instructors follow a tested, step-by-step curriculum. They ensure you master fundamental vehicle controls and basic road rules before moving on to complex traffic situations, multi-lane roundabouts, and high-speed motorways.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Dual-Control Safety Vehicles</h3>
      <p>Driving school vehicles are equipped with dual controls (extra brake and clutch pedals on the instructor's side). This provides absolute peace of mind, allowing you to learn safely while knowing your instructor can intervene instantly if an emergency arises.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Local Test Route Familiarity</h3>
      <p>Professional instructors know the exact testing routes and tricky intersections used by license examiners in your local area. They prepare you specifically for the conditions and maneuvers you will face on test day.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Building Genuine Road Confidence</h3>
      <p>Driving anxiety is completely normal. A professional instructor provides a calm, patient, and stress-free environment that transforms nervous beginners into confident, defensive drivers capable of passing their test on the first attempt.</p>
    `
  },
  {
    id: 'post-3',
    title: 'What Are The Benefits of Driving Instructor',
    author: 'waleed_khurram',
    role: 'Teacher',
    date: '18 DEC 2023',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600',
    content: `
      <p>When preparing for your driving test, having the right mentor makes all the difference. A certified driving instructor brings a unique set of professional tools, psychology, and technical expertise that informal teachers simply cannot match.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Unshakable Patience and Calmness</h3>
      <p>Learning to drive can be stressful. Professional instructors are trained to remain completely calm under pressure, turning mistakes into positive, stress-free learning opportunities rather than moments of frustration.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Personalized Teaching Paces</h3>
      <p>Every student learns differently. While one student might pick up parallel parking instantly, another might need extra time mastering clutch control. A skilled instructor customizes every lesson to fit your exact learning speed and weak points.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Tricks for Complex Maneuvers</h3>
      <p>Difficult maneuvers like parallel parking, reverse parking, and three-point turns become simple when taught using structured spatial reference points and proven instructor formulas.</p>
      
      <h3 class="text-xl font-bold mt-8 mb-3 text-brand-black">Higher First-Time Pass Rates</h3>
      <p>Ultimately, hiring a professional driving instructor drastically increases your chances of passing your driving test on the first try, saving you time, repeat test fees, and the stress of failure.</p>
    `
  }
];

export const FAQS = [
  {
    question: 'How long will it take me to learn how to drive?',
    answer: "At Wally's Driving School we understand that everyone learns at different speeds. Regardless of your stage in the learning process, with our accelerated learning programme you will need less lessons than with any of our competitors."
  },
  {
    question: 'When should I get driving lessons?',
    answer: 'It is recommended to start lessons as soon as you get your learner licence. Early professional instruction helps build safe driving habits from the very beginning.'
  },
  {
    question: 'Where will my lessons be held?',
    answer: 'Lessons are typically held in your local area or the area where you plan to take your driving test. We offer pick-up and drop-off services for your convenience.'
  },
  {
    question: 'When does Wally\'s Driving School offer lessons?',
    answer: 'We offer flexible lesson times, everyday from 8am to 8pm, to accommodate your busy schedule.'
  },
  {
    question: 'How do I pass my driving test?',
    answer: 'Passing requires confidence, knowledge of the road rules, and practice. Our specialized test packages include practice around common RMS test routes to ensure you are fully prepared.'
  }
];
