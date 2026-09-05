export interface BookingItem {
  id: string;
  ref: string;
  studentName: string;
  phone: string;
  email: string;
  suburb: string;
  packageTitle: string;
  packagePrice: number;
  date: string;
  time: string;
  status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: string;
}

export const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: 'b-1',
    ref: 'WD-8492',
    studentName: 'Sarah Jenkins',
    phone: '0412 345 678',
    email: 'sarah.j@gmail.com',
    suburb: 'Rooty Hill',
    packageTitle: '1 Hour Driving Lesson (Single)',
    packagePrice: 70,
    date: '2026-10-24',
    time: '09:00 AM - 10:00 AM',
    status: 'Confirmed',
    notes: 'Focus on 3-point turns and parallel parking around Rooty Hill station.',
    createdAt: '2026-10-20'
  },
  {
    id: 'b-2',
    ref: 'WD-8493',
    studentName: 'Michael Chen',
    phone: '0423 456 789',
    email: 'm.chen@outlook.com',
    suburb: 'Blacktown',
    packageTitle: 'Driving Test Package (Warm-up + Car Hire)',
    packagePrice: 200,
    date: '2026-10-24',
    time: '11:30 AM - 01:30 PM',
    status: 'Pending',
    notes: 'RMS Driving test at Blacktown Service NSW. Needs 45 min warm-up first.',
    createdAt: '2026-10-21'
  },
  {
    id: 'b-3',
    ref: 'WD-8494',
    studentName: 'Emma Wilson',
    phone: '0434 567 890',
    email: 'emma.w@gmail.com',
    suburb: 'Mount Druitt',
    packageTitle: '2 Hours Driving Lesson',
    packagePrice: 130,
    date: '2026-10-25',
    time: '10:00 AM - 12:00 PM',
    status: 'Confirmed',
    notes: 'Roundabouts and M4 freeway entry practice.',
    createdAt: '2026-10-22'
  },
  {
    id: 'b-4',
    ref: 'WD-8495',
    studentName: 'David Kumar',
    phone: '0456 789 012',
    email: 'david.k@yahoo.com',
    suburb: 'Plumpton',
    packageTitle: '5 Hours Value Package',
    packagePrice: 325,
    date: '2026-10-26',
    time: '02:00 PM - 03:00 PM',
    status: 'Confirmed',
    notes: 'Lesson 2 of 5. Reverse parking and hill starts.',
    createdAt: '2026-10-22'
  },
  {
    id: 'b-5',
    ref: 'WD-8496',
    studentName: 'Jessica Taylor',
    phone: '0467 890 123',
    email: 'jess.taylor@gmail.com',
    suburb: 'Doonside',
    packageTitle: '10 Hours Complete Package',
    packagePrice: 650,
    date: '2026-10-27',
    time: '08:30 AM - 09:30 AM',
    status: 'Pending',
    notes: 'First time learner driver, nervous behind the wheel.',
    createdAt: '2026-10-23'
  }
];

const STORAGE_KEY = 'wallys_drivingschool_bookings_v1';
const AUTH_KEY = 'wallys_owner_auth_session_v1';

export const OWNER_CREDENTIALS = {
  username: 'Wally@wallysdrivingschool.com.au',
  password: 'Wellard44#'
};

export function checkOwnerAuth(user: string, pass: string): boolean {
  const cleanUser = user.trim().toLowerCase();
  const cleanPass = pass.trim();
  
  const expectedUser = OWNER_CREDENTIALS.username.toLowerCase();
  const expectedPass = OWNER_CREDENTIALS.password;

  return (
    (cleanUser === expectedUser || cleanUser === 'wally' || cleanUser === 'wally@wallysdrivingschool.com.au') &&
    cleanPass === expectedPass
  );
}

export function isOwnerLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'true' || sessionStorage.getItem(AUTH_KEY) === 'true';
}

export function setOwnerLoggedIn(remember = true): void {
  if (typeof window === 'undefined') return;
  if (remember) {
    localStorage.setItem(AUTH_KEY, 'true');
  } else {
    sessionStorage.setItem(AUTH_KEY, 'true');
  }
}

export function logoutOwner(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
}

export function getStoredBookings(): BookingItem[] {
  if (typeof window === 'undefined') return INITIAL_BOOKINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BOOKINGS;
  } catch (err) {
    console.error('Failed to parse bookings from localStorage', err);
    return INITIAL_BOOKINGS;
  }
}

export function saveBookings(bookings: BookingItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function addBooking(booking: Omit<BookingItem, 'id' | 'ref' | 'createdAt'>): BookingItem {
  const current = getStoredBookings();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const newBooking: BookingItem = {
    ...booking,
    id: `b-${Date.now()}`,
    ref: `WD-${randomNum}`,
    createdAt: new Date().toISOString().split('T')[0]
  };
  const updated = [newBooking, ...current];
  saveBookings(updated);
  return newBooking;
}

export function updateBookingStatus(id: string, status: BookingItem['status']): BookingItem[] {
  const current = getStoredBookings();
  const updated = current.map(item => item.id === id ? { ...item, status } : item);
  saveBookings(updated);
  return updated;
}

export function updateBookingDetails(id: string, updates: Partial<BookingItem>): BookingItem[] {
  const current = getStoredBookings();
  const updated = current.map(item => item.id === id ? { ...item, ...updates } : item);
  saveBookings(updated);
  return updated;
}

export function deleteBooking(id: string): BookingItem[] {
  const current = getStoredBookings();
  const updated = current.filter(item => item.id !== id);
  saveBookings(updated);
  return updated;
}
