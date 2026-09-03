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
    id: '5-hours-pack',
    price: 320,
    hours: 15,
    title: '15 log book hours',
    label: '5 Hours Pack',
    description: 'This course duration is 6/Hr single driving lessons. This package is best for someone who has done between 50 to 100 hours driving. This course assesses students driving skills and weaknesses.',
    category: 'Hour Packs'
  },
  {
    id: '10-hours-pack-1',
    price: 630,
    hours: 30,
    title: '30 log book hours',
    label: '10 Hours Pack',
    description: 'Duration for this course is 10 lessons. Best for new learners. New learners usually lose control over the vehicle and fail to respond in a sudden situation which is highly unsafe.',
    category: 'Hour Packs'
  },
  {
    id: '10-hours-pack-2',
    price: 620,
    hours: 30,
    title: '30 Log Book Hours',
    label: '10 Hours Pack',
    description: 'This course includes 10 lessons and is specially designed for new learners. Beginners often struggle with vehicle control and may find it difficult to respond safely in sudden or unexpected situations. Through guided training, this course helps improvement, and strengthen weaknesses. Throughout the lessons, students will continue to develop the techniques and confidence needed to become safe, capable drivers.',
    category: 'Hour Packs'
  },
  {
    id: '1-hour-lesson',
    price: 65,
    hours: 3,
    title: '60 Minutes Lesson',
    label: '3 Log Book Hours',
    description: '',
    category: 'Lessons'
  },
  {
    id: '2-hour-lesson',
    price: 130,
    hours: 6,
    title: '2 Hours Lesson',
    label: '6 Log Book Hours',
    description: '',
    category: 'Lessons'
  },
  {
    id: 'test-1-lesson',
    price: 200,
    hours: null,
    title: 'Driving Test Package',
    label: 'Car Hire & 1 Lesson',
    description: 'This package is ideal for students who need to use the school\'s car for their driving test. It includes pick-up and drop-off, along with a one-hour practice session before the test. Practice is conducted around the RMS test location, focusing on common routes...',
    category: 'Test Packages'
  },
  {
    id: 'test-2-lesson',
    price: 250,
    hours: null,
    title: 'Driving Test Package',
    label: 'Car Hire & 2 Lessons',
    description: 'This package is ideal for students who need to use the school\'s car for their driving test. It includes pick-up and drop-off, along with a two-hour practice session before the test. Practice is conducted around the RMS test location, focusing on common routes...',
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
    date: '18 Dec 2023',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'post-2',
    title: 'Why Do You Need Driving Lessons?',
    author: 'waleed_khurram',
    role: 'Teacher',
    date: '18 Dec 2023',
    image: 'https://images.unsplash.com/photo-1516224364402-4b2169c73335?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'post-3',
    title: 'What Are The Benefits Of Driving Instructor',
    author: 'waleed_khurram',
    role: 'Teacher',
    date: '18 Dec 2023',
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=600'
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
