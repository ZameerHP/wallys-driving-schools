import {
  getAvailability,
  getMonthAvailability,
  validateLessonSlot,
  addDateOverride,
  deleteDateOverride,
  getInstructorSettings,
  saveInstructorSettings
} from './src/server/instructorAvailabilityService';

async function runTests() {
  console.log('--- STARTING 12 ACCEPTANCE TESTS FOR BOOKING AVAILABILITY ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // Test 1: Weekly Operating hours dynamic check (Wednesday open)
  const wedAvail = await getAvailability({ date: '2026-10-14' }); // Wednesday
  assert(wedAvail.isOpen, 'Test 1: Configured operating day is open with available slots');

  // Test 2: Operating hours changes dynamically reflect in availability
  assert(wedAvail.availableSlots.length > 0, 'Test 2: Slots exist on normal Wednesday');

  // Test 3: Specific Full Day Off override blocks the entire day
  const testDate = '2026-10-21'; // Wednesday
  const override = addDateOverride({
    instructorId: 'wally',
    date: testDate,
    type: 'unavailable',
    isFullDay: true,
    reason: 'Instructor Training Day'
  });

  const blockedDayAvail = await getAvailability({ date: testDate });
  assert(!blockedDayAvail.isOpen, 'Test 3A: Full Day Off date is closed', `isOpen was ${blockedDayAvail.isOpen}`);
  assert(blockedDayAvail.isDayOff, 'Test 3B: isDayOff is true');
  assert(blockedDayAvail.availableSlots.length === 0, 'Test 3C: No bookable slots on full day off');

  // Test 4: Month availability reflects the Day Off
  const monthAvail = await getMonthAvailability({ year: 2026, month: 10 });
  const dayInMonth = monthAvail[testDate];
  assert(dayInMonth && !dayInMonth.isOpen && dayInMonth.isDayOff, 'Test 4: Month availability correctly marks the date as unavailable/day off');

  // Test 5: Month navigation consistency - checking another month and coming back maintains correct state
  const novAvail = await getMonthAvailability({ year: 2026, month: 11 });
  assert(novAvail['2026-11-04'] !== undefined, 'Test 5A: November availability calculated correctly');
  const monthAvailAgain = await getMonthAvailability({ year: 2026, month: 10 });
  assert(!monthAvailAgain[testDate].isOpen, 'Test 5B: October day off is consistently blocked when navigating between months');

  // Clean up override
  deleteDateOverride(override.id);
  const restoredAvail = await getAvailability({ date: testDate });
  assert(restoredAvail.isOpen, 'Test 5C: Removing day off restores bookability');

  // Test 6: Partial day off blocks overlapping slots + buffer, but leaves other slots open
  const partialOverride = addDateOverride({
    instructorId: 'wally',
    date: testDate,
    type: 'unavailable',
    isFullDay: false,
    periods: [{ start: '10:00 AM', end: '12:00 PM', startMinutes: 600, endMinutes: 720 }],
    reason: 'Dental appointment'
  });

  const partialAvail = await getAvailability({ date: testDate });
  assert(partialAvail.isOpen, 'Test 6A: Partial day off leaves day open');
  const slot10AM = partialAvail.availableSlots.find(s => s.startMinutes === 600 || s.slot.startsWith('10:00 AM'));
  const slot2PM = partialAvail.availableSlots.find(s => s.startMinutes === 840 || s.slot.startsWith('2:00 PM') || s.slot.startsWith('02:00 PM'));
  assert(!!slot10AM && !slot10AM.available, 'Test 6B: 10:00 AM slot is blocked during partial day off');
  assert(!!slot2PM && slot2PM.available, 'Test 6C: 2:00 PM slot remains available during partial day off');
  deleteDateOverride(partialOverride.id);

  // Test 7: Booking validation for available slot succeeds
  const validSlotCheck = await validateLessonSlot({ date: '2026-10-14', slot: '09:00 AM - 10:00 AM', durationMinutes: 60 });
  assert(validSlotCheck.available, 'Test 7: validateLessonSlot succeeds for an open morning slot');

  // Test 8: Booking an occupied slot or unavailable slot
  const testCloseOverride = addDateOverride({
    instructorId: 'wally',
    date: '2026-10-28',
    type: 'unavailable',
    isFullDay: true,
    reason: 'School closed for holiday'
  });
  const attemptBookClosed = await validateLessonSlot({ date: '2026-10-28', slot: '10:00 AM - 11:00 AM', durationMinutes: 60 });
  assert(!attemptBookClosed.available, 'Test 8: validateLessonSlot rejects bookings on closed dates with reason', attemptBookClosed.reason);
  deleteDateOverride(testCloseOverride.id);

  // Test 9: Buffer time calculation exists in settings
  const settings = getInstructorSettings('wally');
  assert(typeof settings.bufferMinutes === 'number' && settings.bufferMinutes >= 0, 'Test 9: Buffer minutes configured properly');

  // Test 10: Afternoon slot outside buffer on same day remains available
  const afternoonCheck = await validateLessonSlot({ date: '2026-10-14', slot: '02:00 PM - 03:00 PM', durationMinutes: 60 });
  assert(afternoonCheck.available, 'Test 10: Afternoon slot outside buffer remains bookable');

  // Test 11: Operating hours closure respected (e.g. disabling Sunday dynamically)
  const prevSettings = getInstructorSettings('wally');
  saveInstructorSettings({
    operatingHours: {
      ...prevSettings.operatingHours,
      sunday: { ...prevSettings.operatingHours.sunday, enabled: false }
    }
  });
  const sundayAvail = await getAvailability({ date: '2026-10-18' }); // Sunday
  assert(!sundayAvail.isOpen, 'Test 11A: Sunday when disabled is closed');
  // Restore Sunday
  saveInstructorSettings({
    operatingHours: prevSettings.operatingHours
  });
  const restoredSunday = await getAvailability({ date: '2026-10-18' });
  assert(restoredSunday.isOpen, 'Test 11B: Restoring Sunday immediately makes it available');

  // Test 12: Timezone normalization (Australia/Sydney date format YYYY-MM-DD)
  const sydneyDateTest = await getAvailability({ date: '2026-10-14' });
  assert(sydneyDateTest.date === '2026-10-14', 'Test 12: Normalized YYYY-MM-DD date preserved across calculations');

  console.log(`\nTEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
