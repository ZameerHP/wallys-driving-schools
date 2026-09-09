import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const reminderCron = `
// Automated 24-Hour Reminders
// Runs every hour to check for bookings happening exactly tomorrow
setInterval(async () => {
  try {
    const bookings = await getBookings({ includeUnpaid: false });
    const now = Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    
    for (const booking of bookings) {
      if (booking.status === 'Confirmed' && !booking.notes?.includes('[Reminder Sent]')) {
        const timestamp = getBookingTimestamp(booking.date, booking.time);
        const timeUntilBooking = timestamp - now;
        
        // If booking is between 24 and 25 hours away, send reminder
        if (timeUntilBooking > 0 && timeUntilBooking <= TWENTY_FOUR_HOURS_MS && timeUntilBooking > (TWENTY_FOUR_HOURS_MS - 60 * 60 * 1000)) {
          console.log(\`[Automated Reminder] Sending 24h reminder to \${booking.studentName} (\${booking.email}) for booking \${booking.bookingRef} on \${booking.date} at \${booking.time}\`);
          
          // Update booking to mark reminder as sent
          const updatedNotes = (booking.notes || '') + ' [Reminder Sent]';
          await updateBooking(booking.id as number, { notes: updatedNotes });
        }
      }
    }
  } catch (err) {
    console.error("[Automated Reminder] Error checking reminders:", err);
  }
}, 60 * 60 * 1000); // Run every hour
`;

content = content.replace("app.listen(PORT", reminderCron + "\napp.listen(PORT");

fs.writeFileSync('server.ts', content);
