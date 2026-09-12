// Utility functions for driving lesson packages, durations, continuous slots, and zero-double-booking calculations

export interface PackageSpec {
  lessonCount: number;
  durationMinutes: number; // per lesson/session
  isContinuousTestPackage: boolean;
  label: string;
}

export interface ScheduledLesson {
  lessonNumber: number;
  date: string;
  time: string;
}

/**
 * Identify exact package specifications:
 * - 10 Hours Pack -> 10 lessons (60 mins each)
 * - 5 Hours Pack -> 5 lessons (60 mins each)
 * - Driving Test Package + 1 Lesson -> 1 continuous 2.5-hour slot (150 mins)
 * - Driving Test Package + 2 Lessons -> 1 continuous 3.5-hour slot (210 mins)
 * - 2 Hours Lesson -> 1 lesson (120 mins)
 * - 60 Minutes Lesson -> 1 lesson (60 mins)
 */
export function getPackageSpecs(pkg: any): PackageSpec {
  const id = (pkg?.id || '').toLowerCase();
  const title = (pkg?.title || '').toLowerCase();
  const label = (pkg?.label || '').toLowerCase();

  // 10 Lesson Package
  if (
    id === '10-hours-pack' ||
    id === 'pkg-10hr' ||
    title.includes('10 hour') ||
    title.includes('10-hour') ||
    title.includes('10 lesson') ||
    label.includes('10 lesson') ||
    label.includes('30 log book hours')
  ) {
    return {
      lessonCount: 10,
      durationMinutes: 60,
      isContinuousTestPackage: false,
      label: '10 Lessons'
    };
  }

  // 5 Lesson Package
  if (
    id === '5-hours-pack' ||
    id === 'pkg-5hr' ||
    title.includes('5 hour') ||
    title.includes('5-hour') ||
    title.includes('5 lesson') ||
    label.includes('5 lesson') ||
    label.includes('15 log book hours')
  ) {
    return {
      lessonCount: 5,
      durationMinutes: 60,
      isContinuousTestPackage: false,
      label: '5 Lessons'
    };
  }

  // Driving Test Package + 2 Lessons -> 3.5-hour continuous slot (210 mins)
  if (
    id === 'test-2-lesson' ||
    id === 'srv-car-2hr' ||
    (title.includes('test') && (label.includes('2 lesson') || label.includes('2-hour') || title.includes('2 lesson'))) ||
    label.includes('car hire & 2 lesson')
  ) {
    return {
      lessonCount: 1,
      durationMinutes: 210, // 3.5 hours continuous
      isContinuousTestPackage: true,
      label: 'Driving Test Package + 2 Lessons (3.5 Hours Continuous Slot)'
    };
  }

  // Driving Test Package + 1 Lesson -> 2.5-hour continuous slot (150 mins)
  if (
    id === 'test-1-lesson' ||
    id === 'srv-car-1hr' ||
    (title.includes('test') && (label.includes('1 lesson') || label.includes('1-hour') || title.includes('1 lesson'))) ||
    label.includes('car hire & 1 lesson')
  ) {
    return {
      lessonCount: 1,
      durationMinutes: 150, // 2.5 hours continuous
      isContinuousTestPackage: true,
      label: 'Driving Test Package + 1 Lesson (2.5 Hours Continuous Slot)'
    };
  }

  // 2 Hours Lesson -> 120 mins
  if (
    id === '2-hour-lesson' ||
    id === '2-hours-lesson' ||
    id === 'srv-2hr' ||
    title.includes('2 hour') ||
    title.includes('2-hour')
  ) {
    return {
      lessonCount: 1,
      durationMinutes: 120,
      isContinuousTestPackage: false,
      label: '2 Hours Lesson'
    };
  }

  // Default: 60 Minutes Lesson
  return {
    lessonCount: 1,
    durationMinutes: 60,
    isContinuousTestPackage: false,
    label: '60 Minutes Lesson'
  };
}

/**
 * Format minutes of day (e.g. 600 = 10:00 AM) to standard 12-hour string (e.g. "10:00 AM")
 */
export function formatMinutesToTimeStr(minutes: number): string {
  let h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let displayH = h % 12;
  if (displayH === 0) displayH = 12;
  const mPadded = String(m).padStart(2, '0');
  return `${displayH}:${mPadded} ${ampm}`;
}

/**
 * Format start time and duration into canonical slot string
 * Examples:
 * start 600 (10:00 AM), duration 150 -> "10:00 AM – 12:30 PM"
 * start 600 (10:00 AM), duration 210 -> "10:00 AM – 1:30 PM"
 * start 600 (10:00 AM), duration 60  -> "10:00 AM – 11:00 AM"
 */
export function formatSlotRange(startMinutes: number, durationMinutes: number): string {
  const startStr = formatMinutesToTimeStr(startMinutes);
  const endStr = formatMinutesToTimeStr(startMinutes + durationMinutes);
  return `${startStr} – ${endStr}`;
}

/**
 * Parse standard time interval from time string
 */
export function parseTimeInterval(timeStr: string, defaultDurationMinutes = 60): { start: number; end: number } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().replace(/\s+/g, ' ');

  // Range match: "10:00 AM – 12:30 PM", "10:00 AM - 1:30 PM", etc.
  const rangeMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (rangeMatch) {
    const parsePart = (hStr: string, mStr: string | undefined, ampmStr: string | undefined) => {
      let h = parseInt(hStr, 10);
      const m = mStr ? parseInt(mStr, 10) : 0;
      const ampm = (ampmStr || '').toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    let startAmpm = rangeMatch[3];
    let endAmpm = rangeMatch[6];
    const startH = parseInt(rangeMatch[1], 10);
    const endH = parseInt(rangeMatch[4], 10);

    if (!startAmpm && !endAmpm) {
      startAmpm = (startH >= 7 && startH <= 12) ? 'AM' : 'PM';
      endAmpm = (endH >= 7 && endH <= 12) ? 'AM' : 'PM';
    } else if (!startAmpm && endAmpm) {
      if (endAmpm.toUpperCase() === 'PM' && startH <= endH && startH >= 12) {
        startAmpm = 'PM';
      } else if (endAmpm.toUpperCase() === 'PM' && startH > endH && startH <= 12) {
        startAmpm = 'AM';
      } else {
        startAmpm = endAmpm;
      }
    } else if (startAmpm && !endAmpm) {
      if (startAmpm.toUpperCase() === 'AM' && endH < startH) {
        endAmpm = 'PM';
      } else {
        endAmpm = startAmpm;
      }
    }

    const start = parsePart(rangeMatch[1], rangeMatch[2], startAmpm);
    const end = parsePart(rangeMatch[4], rangeMatch[5], endAmpm);
    return { start, end: end > start ? end : start + defaultDurationMinutes };
  }

  // Single timestamp match: "10:00 AM"
  const singleMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (singleMatch) {
    let h = parseInt(singleMatch[1], 10);
    const m = singleMatch[2] ? parseInt(singleMatch[2], 10) : 0;
    let ampm = (singleMatch[3] || '').toUpperCase();
    if (!ampm) {
      ampm = (h >= 7 && h <= 12) ? 'AM' : 'PM';
    }
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const start = h * 60 + m;
    return { start, end: start + defaultDurationMinutes };
  }

  return null;
}

/**
 * Buffer-aware time conflict check
 * Overlaps if slot1 intersects [slot2.start - buffer, slot2.end + buffer]
 */
export function isTimeSlotConflicting(
  slot1: { start: number; end: number },
  slot2: { start: number; end: number },
  bufferMinutes = 30
): boolean {
  return slot1.start < slot2.end + bufferMinutes && slot1.end > slot2.start - bufferMinutes;
}

/**
 * Standard candidate start times within Wallys 8:00 AM - 6:00 PM operating window
 */
export const STANDARD_START_TIMES = [
  { label: '8:00 AM', startMinutes: 480 },
  { label: '8:30 AM', startMinutes: 510 },
  { label: '9:00 AM', startMinutes: 540 },
  { label: '9:30 AM', startMinutes: 570 },
  { label: '10:00 AM', startMinutes: 600 },
  { label: '10:30 AM', startMinutes: 630 },
  { label: '11:00 AM', startMinutes: 660 },
  { label: '1:00 PM', startMinutes: 780 },
  { label: '2:00 PM', startMinutes: 840 },
  { label: '2:30 PM', startMinutes: 870 },
  { label: '3:00 PM', startMinutes: 900 },
  { label: '3:30 PM', startMinutes: 930 },
  { label: '4:00 PM', startMinutes: 960 },
  { label: '4:30 PM', startMinutes: 990 },
  { label: '5:00 PM', startMinutes: 1020 },
];

/**
 * Generate all valid time slots for a given duration (e.g. 60m, 120m, 150m, 210m)
 * Ensures slots finish strictly by 6:00 PM (1080 minutes)
 */
export function generateSlotsForDuration(durationMinutes: number): {
  slot: string;
  startMinutes: number;
  endMinutes: number;
  durationLabel: string;
}[] {
  const MAX_END_MINUTES = 1080; // 6:00 PM

  let durationLabel = `${durationMinutes}m`;
  if (durationMinutes === 60) durationLabel = '1 hr';
  else if (durationMinutes === 120) durationLabel = '2 hrs';
  else if (durationMinutes === 150) durationLabel = '2.5 hrs continuous';
  else if (durationMinutes === 210) durationLabel = '3.5 hrs continuous';

  return STANDARD_START_TIMES
    .filter(t => t.startMinutes + durationMinutes <= MAX_END_MINUTES)
    .map(t => {
      const slot = formatSlotRange(t.startMinutes, durationMinutes);
      return {
        slot,
        startMinutes: t.startMinutes,
        endMinutes: t.startMinutes + durationMinutes,
        durationLabel
      };
    });
}

/**
 * Normalize date strings (YYYY-MM-DD)
 */
export function normalizeDateStr(rawDate: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return trimmed.toLowerCase();
}

export interface SlotAvailabilityResult {
  available: boolean;
  reason?: 'booked' | 'self_conflict' | 'time_off';
  conflictReason?: string;
  conflictingLesson?: number;
}

/**
 * Check if a proposed slot is available:
 * 1. Checks against database booked slots and instructor time-off blocks (+30m buffer for bookings, 0 buffer for time off)
 * 2. Checks against other lessons in the student's multi-lesson batch (+30m buffer)
 */
export function checkSlotAvailability(
  date: string,
  timeSlot: string,
  bookedSlots: { date: string; time: string; status?: string; isFullDay?: boolean; reason?: string }[],
  otherLessons?: { date: string; time: string; lessonNumber?: number }[],
  currentLessonNumber?: number
): SlotAvailabilityResult {
  const normTargetDate = normalizeDateStr(date);
  if (!normTargetDate) return { available: true };

  const targetInterval = parseTimeInterval(timeSlot);

  // 1. Check against DB booked slots & time off blocks
  for (const b of bookedSlots) {
    if (b.status === 'Cancelled') continue;
    if (normalizeDateStr(b.date) === normTargetDate) {
      // 1a. Check for Full Day Off block
      const cleanTime = (b.time || '').trim().toLowerCase();
      if (
        b.isFullDay ||
        cleanTime === 'full day off' ||
        cleanTime === 'all day' ||
        cleanTime.includes('day off')
      ) {
        return {
          available: false,
          reason: 'time_off',
          conflictReason: b.reason || 'Instructor Wally has scheduled a Full Day Off on this date.'
        };
      }

      // 1b. Check for time window conflict
      if (!targetInterval) continue;

      const existingInterval = parseTimeInterval(b.time);
      if (existingInterval) {
        const buffer = b.status === 'Blocked' ? 0 : 30;
        if (isTimeSlotConflicting(targetInterval, existingInterval, buffer)) {
          return {
            available: false,
            reason: b.status === 'Blocked' ? 'time_off' : 'booked',
            conflictReason: b.status === 'Blocked'
              ? (b.reason || 'Blocked by instructor availability / time off')
              : 'Already booked with instructor Wally'
          };
        }
      } else if (cleanTime === timeSlot.trim().toLowerCase()) {
        return {
          available: false,
          reason: b.status === 'Blocked' ? 'time_off' : 'booked',
          conflictReason: b.status === 'Blocked'
            ? (b.reason || 'Blocked by instructor availability / time off')
            : 'Already booked with instructor Wally'
        };
      }
    }
  }

  // 2. Check against other lessons in the same batch
  if (otherLessons && otherLessons.length > 0) {
    for (const other of otherLessons) {
      if (currentLessonNumber && other.lessonNumber === currentLessonNumber) {
        continue; // Skip self
      }
      if (!other.date || !other.time) continue;
      if (normalizeDateStr(other.date) === normTargetDate) {
        const otherInterval = parseTimeInterval(other.time);
        if (otherInterval) {
          if (isTimeSlotConflicting(targetInterval, otherInterval, 30)) {
            const label = other.lessonNumber ? `Lesson ${other.lessonNumber}` : 'Another lesson';
            return {
              available: false,
              reason: 'self_conflict',
              conflictingLesson: other.lessonNumber,
              conflictReason: `Selected in ${label} of your package`
            };
          }
        }
      }
    }
  }

  return { available: true };
}

/**
 * Formats duration in minutes to user-friendly string (e.g. 60 -> "1 hr", 150 -> "2.5 hrs", 120 -> "2 hrs")
 */
export function formatDurationDisplay(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) {
      return `${hours} hr${hours > 1 ? 's' : ''}`;
    }
    return `${hours}.${rem === 30 ? '5' : rem} hrs`;
  }
  return `${minutes} mins`;
}

