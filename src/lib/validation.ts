/**
 * Wally's Driving School Validation Utilities
 * Enforces Australian phone numbers and real working email addresses.
 */

// Known disposable, temporary or burner email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'pokemail.net',
  'spam4.me',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'dispostable.com',
  'burnermail.io',
  'getairmail.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'maildrop.cc',
  'crazymailing.com',
  'nada.ltd',
  'mohmal.com',
  'inboxkitten.com',
  'mytemp.email',
  'tempail.com',
  'emailondeck.com',
  'generator.email',
  'mailnesia.com',
  'tempmail.net',
  'disposablemail.com',
  'mytempemail.com',
  'dropmail.me',
  'fakemailgenerator.com',
  'getnada.com',
  'inboxbear.com',
  'harakirimail.com',
  'mailcatch.com',
  'zillamail.com'
]);

// Known dummy / placeholder domains
const DUMMY_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'testing.com',
  'tester.com',
  'fake.com',
  'fakeemail.com',
  'fakemail.com',
  'asdf.com',
  'none.com',
  'sample.com',
  'dummy.com',
  'user.com',
  'abc.com',
  'xyz.com',
  'noemail.com',
  'nomail.com',
  'null.com',
  'nowhere.com',
  'domain.com',
  'website.com'
]);

// Common dummy usernames/localparts
const DUMMY_USERNAMES = new Set([
  'test',
  'testing',
  'tester',
  'asdf',
  'fake',
  'dummy',
  'none',
  'noemail',
  'nomail',
  'sample',
  'abc',
  'xyz',
  'qwerty',
  '123456',
  'user',
  'email'
]);

/**
 * Validates that an email address is real, active-format, non-disposable and non-dummy.
 */
export function validateWorkingEmail(rawEmail: string): { isValid: boolean; email: string; error?: string } {
  const email = (rawEmail || '').trim().toLowerCase();

  if (!email) {
    return { isValid: false, email: '', error: 'Email address is required.' };
  }

  // Basic RFC 5322 structure
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, email, error: 'Please enter a valid email address (e.g. name@gmail.com).' };
  }

  // Prevent consecutive dots or trailing/leading dots
  if (email.includes('..') || email.startsWith('.') || email.includes('.@') || email.includes('@.')) {
    return { isValid: false, email, error: 'Email contains invalid dot placements.' };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return { isValid: false, email, error: 'Invalid email format.' };
  }

  const [username, domain] = parts;

  // Local part sanity
  if (username.length < 2) {
    return { isValid: false, email, error: 'Email username must be at least 2 characters.' };
  }

  if (DUMMY_USERNAMES.has(username)) {
    return { isValid: false, email, error: 'Please enter your genuine working email, not a test placeholder.' };
  }

  // Check top-level domain (TLD)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, email, error: 'Please enter a full email with domain (e.g. @gmail.com or @outlook.com).' };
  }

  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { isValid: false, email, error: 'Invalid domain extension in email address.' };
  }

  // Check disposable domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, email, error: 'Temporary or disposable burner emails are not permitted. Please use your real working email.' };
  }

  // Check dummy domains
  if (DUMMY_DOMAINS.has(domain)) {
    return { isValid: false, email, error: 'Placeholder or test email domains are not allowed. Please enter your real email.' };
  }

  return { isValid: true, email };
}

/**
 * Validates that a phone number is an authentic Australian mobile or landline number.
 * Supported Australian formats:
 * - Mobile: 04XX XXX XXX (10 digits starting with 04)
 * - Landline: 02, 03, 07, 08 followed by 8 digits (10 digits)
 * - International AU: +61 4XX XXX XXX or +61 [2378] XXXX XXXX
 * - AU input without leading zero: 4XX XXX XXX or [2378] XXXX XXXX (9 digits)
 */
export function validateAustralianPhone(rawPhone: string): { isValid: boolean; formatted: string; rawDigits: string; error?: string } {
  const input = (rawPhone || '').trim();

  if (!input) {
    return { isValid: false, formatted: '', rawDigits: '', error: 'Australian phone number is required.' };
  }

  // Remove common punctuation and whitespace
  let cleaned = input.replace(/[\s\-().]/g, '');

  // Handle +61 prefix
  if (cleaned.startsWith('+61')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('61') && cleaned.length === 11) {
    cleaned = cleaned.slice(2);
  }

  // If starts with 0 (e.g. 0412345678), remove leading 0 to inspect 9-digit AU body
  let nationalNumber = cleaned;
  if (nationalNumber.startsWith('0')) {
    nationalNumber = nationalNumber.slice(1);
  }

  // Only digits allowed
  if (!/^\d+$/.test(nationalNumber)) {
    return { isValid: false, formatted: input, rawDigits: cleaned, error: 'Phone number must contain only numbers.' };
  }

  // Australian phone numbers have 9 digits after country code or leading zero:
  // Mobile starts with 4 (04xx xxx xxx)
  // NSW/ACT landline starts with 2 (02 xxxx xxxx)
  // VIC/TAS landline starts with 3 (03 xxxx xxxx)
  // QLD landline starts with 7 (07 xxxx xxxx)
  // WA/SA/NT landline starts with 8 (08 xxxx xxxx)
  if (nationalNumber.length !== 9 || !/^[2-478]/.test(nationalNumber)) {
    return { 
      isValid: false, 
      formatted: input, 
      rawDigits: cleaned, 
      error: 'Only Australian phone numbers are allowed (e.g. 0412 345 678).' 
    };
  }

  // Check for dummy repeating numbers (e.g. 0400000000, 0411111111, 0499999999)
  if (/^(\d)\1{8}$/.test(nationalNumber) || nationalNumber === '400000000' || nationalNumber === '412345678') {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: 'Please enter your genuine Australian phone number.'
    };
  }

  // Format into standard Australian presentation
  let formatted = '';
  if (nationalNumber.startsWith('4')) {
    // Mobile: 04XX XXX XXX
    formatted = `0${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 6)} ${nationalNumber.slice(6)}`;
  } else {
    // Landline: 0X XXXX XXXX
    formatted = `0${nationalNumber.slice(0, 1)} ${nationalNumber.slice(1, 5)} ${nationalNumber.slice(5)}`;
  }

  return { isValid: true, formatted, rawDigits: `0${nationalNumber}` };
}
