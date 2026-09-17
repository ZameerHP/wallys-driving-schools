/**
 * Wallys Driving School Validation Utilities
 * Enforces Australian phone numbers and real working email addresses.
 */

// Known disposable, temporary or burner email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
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
  'zillamail.com',
  'slipry.net',
  'emailfake.com',
  'fakemail.net',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'einrot.com',
  'fambest.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'chacuo.net',
  '0815.ru',
  '10mail.org',
  '20minutemail.com',
  'binkmail.com',
  'bobmail.info',
  'chammy.info',
  'devnullmail.com',
  'disposableaddress.com',
  'emailproxsy.com',
  'filzmail.com',
  'incognitomail.org',
  'jetable.org',
  'kasmail.com',
  'mailforspam.com',
  'mailnull.com',
  'meltmail.com',
  'noclickemail.com',
  'notsharingmy.info',
  'onewaymail.com',
  'pookmail.com',
  'safe-mail.net',
  'shieldedmail.com',
  'soodonims.com',
  'spambox.us',
  'spamday.com',
  'spamex.com',
  'spamevader.com',
  'spaminator.de',
  'spaml.com',
  'temporaryinbox.com',
  'tempsky.com',
  'trbvm.com',
  'uggsrock.com',
  'wegwerfmail.de',
  'whyspam.me',
  'willselfdestruct.com'
]);

// Known dummy, test, and placeholder domains
const DUMMY_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'test.com',
  'testing.com',
  'tester.com',
  'testmail.com',
  'fake.com',
  'fakeemail.com',
  'fakemail.com',
  'fakedomain.com',
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
  'website.com',
  'myemail.com',
  'email.com',
  'foo.com',
  'bar.com',
  'foobar.com',
  'blah.com',
  'random.com',
  'fake.org',
  'test.org',
  'test.net',
  'invalid.com',
  '123.com',
  'aaa.com',
  'bbb.com',
  'ccc.com',
  'qwerty.com',
  'notreal.com',
  'noreal.com',
  'trash.com',
  'spam.com'
]);

// Common domain typos and their correct suggestions
const DOMAIN_TYPO_MAP: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaii.com': 'gmail.com',
  'gmil.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gmeil.com': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.com.au': 'gmail.com',
  'googlemail.con': 'googlemail.com',
  'googlemail.co': 'googlemail.com',
  'google.com': 'gmail.com',
  'g-mail.com': 'gmail.com',
  'g.mail.com': 'gmail.com',
  'gmail.net': 'gmail.com',
  'gmail.org': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmale.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.cm': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlock.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.cm': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yaho.co': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahu.com': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'iclud.com': 'icloud.com',
  'icld.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'icloude.com': 'icloud.com',
  'icould.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'bigpond.con': 'bigpond.com',
  'bigpond.co': 'bigpond.com',
  'bigpond.cm': 'bigpond.com',
  'proton.con': 'proton.me',
  'protonmail.con': 'proton.me'
};

// Common dummy usernames/localparts
const DUMMY_USERNAMES = new Set([
  'test',
  'testing',
  'tester',
  'test1',
  'test2',
  'test123',
  'test1234',
  'mytest',
  'fake',
  'fakeuser',
  'fakeperson',
  'fakeemail',
  'fakeaccount',
  'dummy',
  'dummyuser',
  'dummyperson',
  'sample',
  'sampleuser',
  'asdf',
  'asdfgh',
  'asdfghjkl',
  'qwerty',
  'qwertyuiop',
  'zxcvbnm',
  'none',
  'noemail',
  'nomail',
  'null',
  'nowhere',
  'abc',
  'abcd',
  'abcdef',
  'xyz',
  '123',
  '1234',
  '12345',
  '123456',
  '12345678',
  '000000',
  'user',
  'username',
  'email',
  'student',
  'studentdriver',
  'learner',
  'driver',
  'guest',
  'customer',
  'person',
  'someone',
  'somebody',
  'anyone',
  'anybody',
  'nobody',
  'blah',
  'whatever',
  'admin',
  'administrator',
  'demo',
  'demouser',
  'trial',
  'trash',
  'spam',
  'burner',
  'junk',
  'temp',
  'temporary',
  'tempmail',
  'random',
  'example',
  'placeholder',
  'notreal',
  'wallystest'
]);

// Well-known trusted mail providers
const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'outlook.com.au',
  'hotmail.com',
  'hotmail.com.au',
  'live.com',
  'live.com.au',
  'msn.com',
  'windowslive.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'yahoo.com',
  'yahoo.com.au',
  'ymail.com',
  'rocketmail.com',
  'bigpond.com',
  'bigpond.net.au',
  'optusnet.com.au',
  'tpg.com.au',
  'iinet.net.au',
  'dodo.com.au',
  'westnet.com.au',
  'internode.on.net',
  'ozemail.com.au',
  'exemail.com.au',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'aol.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
  'fastmail.com.au',
  'hey.com'
]);

export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  isGoogle?: boolean;
  error?: string;
  suggestion?: string;
  isKnownProvider?: boolean;
}

/**
 * Validates that an email address is a genuine, active Google registered email (@gmail.com or @googlemail.com),
 * non-disposable, non-dummy, and strictly adhering to Google's account registration standards.
 */
export function validateWorkingEmail(rawEmail: string, options: { requireGoogle?: boolean } = { requireGoogle: true }): EmailValidationResult {
  const email = (rawEmail || '').trim().toLowerCase();

  if (!email) {
    return { 
      isValid: false, 
      email: '', 
      error: 'Google email address is required to receive your booking confirmation, Google Calendar invite & tax receipt.' 
    };
  }

  // Basic RFC 5322 structure
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, email, error: 'Please enter a valid Google email address (e.g. yourname@gmail.com).' };
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

  // Check domain typo suggestions (e.g. user@gamil.com -> user@gmail.com)
  if (DOMAIN_TYPO_MAP[domain]) {
    const suggestedDomain = DOMAIN_TYPO_MAP[domain];
    const suggestedEmail = `${username}@${suggestedDomain}`;
    return {
      isValid: false,
      email,
      suggestion: suggestedEmail,
      error: `Typo detected: Did you mean "${suggestedEmail}"?`
    };
  }

  // Check top-level domain (TLD)
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { isValid: false, email, error: 'Please enter a complete Google email (e.g. @gmail.com).' };
  }

  const tld = domainParts[domainParts.length - 1];

  // Disallow common typo TLDs
  const typoTlds = new Set(['con', 'comm', 'coom', 'c', 'cm', 'coo', 'col', 'vom', 'xom', 'cpm', 'ney', 'ogr', 'og', 'ed']);
  if (typoTlds.has(tld)) {
    return { isValid: false, email, error: `Invalid domain ending ".${tld}". Did you mean ".com"?` };
  }

  // Check disposable domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, email, error: 'Disposable or temporary burner emails are not permitted. Please use your real Google account.' };
  }

  // Check dummy domains
  if (DUMMY_DOMAINS.has(domain)) {
    return { isValid: false, email, error: 'Test or dummy email domains are not allowed. Please enter your real Google account (@gmail.com).' };
  }

  // Require Google Registered Email by default
  const isGoogleDomain = domain === 'gmail.com' || domain === 'googlemail.com';
  if (options.requireGoogle !== false && !isGoogleDomain) {
    return {
      isValid: false,
      email,
      isGoogle: false,
      error: 'Only Google-registered emails (@gmail.com) are accepted to ensure real delivery of booking confirmations and Google Calendar invites.'
    };
  }

  // Google Account username checks
  const cleanUsername = username.replace(/\./g, '');
  
  if (cleanUsername.length < 6) {
    return { 
      isValid: false, 
      email, 
      isGoogle: isGoogleDomain,
      error: 'Google requires Gmail usernames to be at least 6 characters (letters and numbers).' 
    };
  }
  if (cleanUsername.length > 30) {
    return { 
      isValid: false, 
      email, 
      isGoogle: isGoogleDomain,
      error: 'Google requires Gmail usernames to be 30 characters or fewer.' 
    };
  }

  // Google only allows letters, numbers, and periods in email usernames
  if (!/^[a-z0-9.]+$/.test(username)) {
    return {
      isValid: false,
      email,
      isGoogle: isGoogleDomain,
      error: 'Google email usernames can only contain letters (a-z), numbers (0-9), and periods (.).'
    };
  }

  // Google does not allow consecutive, leading, or trailing periods in usernames
  if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
    return {
      isValid: false,
      email,
      isGoogle: isGoogleDomain,
      error: 'Google does not allow consecutive, leading, or trailing periods in Gmail usernames.'
    };
  }

  // Google requires Gmail usernames to contain letters (cannot be all numbers)
  if (!/[a-z]/.test(cleanUsername)) {
    return {
      isValid: false,
      email,
      isGoogle: isGoogleDomain,
      error: 'Google requires Gmail usernames to contain letters (cannot be purely numeric).'
    };
  }

  // Check exact dummy usernames
  if (DUMMY_USERNAMES.has(cleanUsername) || DUMMY_USERNAMES.has(username)) {
    return { 
      isValid: false, 
      email, 
      isGoogle: isGoogleDomain,
      error: `"${username}@gmail.com" is a placeholder/test username. Please enter your real personal Google account.` 
    };
  }

  // Check pattern-based dummy usernames (e.g., test123, fake99, asdf88, user123)
  if (/^(test|fake|dummy|asdf|sample|noemail|nomail|burner|trash|junk|temp|temporary|demo|trial|placeholder|example|random|user|guest|customer|nobody|someone|somebody|anyone|anybody|client|learner|student|driver|admin|testing|tester)[0-9_.-]*/i.test(cleanUsername)) {
    return { 
      isValid: false, 
      email, 
      isGoogle: isGoogleDomain,
      error: 'Please enter your genuine personal Google email, not a test or placeholder address.' 
    };
  }

  // Check sequential numbers pattern
  if (/(01234|12345|23456|34567|45678|56789|98765|87654|76543|65432|54321)/.test(cleanUsername)) {
    return {
      isValid: false,
      email,
      isGoogle: isGoogleDomain,
      error: 'Sequential numbers detected. Please enter your real Google account.'
    };
  }

  // Check keyboard smash rows
  if (/(qwerty|qwertz|azerty|asdfgh|zxcvbn|poiuyt|lkjhgf|mnbvcx)/.test(cleanUsername)) {
    return {
      isValid: false,
      email,
      isGoogle: isGoogleDomain,
      error: 'Keyboard smash pattern detected. Please enter your real Google account.'
    };
  }

  // Check single character repeated 4+ times (e.g. aaaaa@, 11111@) or repetitive patterns
  if (/(.)\1{3,}/.test(cleanUsername) || /(..+)\1{2,}/.test(cleanUsername) || cleanUsername === 'asdfasdf' || cleanUsername === 'qweqwe' || cleanUsername === '121212' || cleanUsername === '123123' || cleanUsername === 'ababab' || cleanUsername === 'abcabc') {
    return { 
      isValid: false, 
      email, 
      isGoogle: isGoogleDomain,
      error: 'Repetitive pattern detected. Please enter your real, active Google email address.' 
    };
  }

  return { 
    isValid: true, 
    email,
    isGoogle: isGoogleDomain,
    isKnownProvider: true 
  };
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

/**
 * Validates phone numbers internationally, applying strict Australian formatting
 * when dialCode is '+61', and E.164-compliant checks for all other countries.
 */
export function validateInternationalPhone(
  rawPhone: string,
  dialCode: string = '+61'
): { isValid: boolean; formatted: string; rawDigits: string; error?: string } {
  const input = (rawPhone || '').trim();

  if (!input) {
    return { isValid: false, formatted: '', rawDigits: '', error: 'Phone number is required.' };
  }

  // If Australian dial code (+61), use Australia's specific validation
  if (dialCode === '+61' || dialCode === '61') {
    return validateAustralianPhone(input);
  }

  // International phone validation
  // Strip formatting: spaces, dashes, brackets, dots
  let cleaned = input.replace(/[\s\-().]/g, '');

  // Strip dial code if user pasted or included it in the input field
  const normalizedDial = dialCode.replace('+', '');
  if (cleaned.startsWith(dialCode)) {
    cleaned = cleaned.slice(dialCode.length);
  } else if (cleaned.startsWith(normalizedDial)) {
    cleaned = cleaned.slice(normalizedDial.length);
  }

  // Strip leading 0 often present in local formats (e.g. UK 07xxx, NZ 021xxx)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Must only contain digits
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: 'Phone number must contain only numbers.'
    };
  }

  // ITU-T E.164 recommends national subscriber numbers between 6 and 14 digits
  if (cleaned.length < 6 || cleaned.length > 14) {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: 'Please enter a valid phone number (6 to 14 digits).'
    };
  }

  // Check for dummy repeating sequence (e.g. 11111111, 99999999)
  if (/^(\d)\1{5,}$/.test(cleaned) || cleaned === '12345678' || cleaned === '123456789') {
    return {
      isValid: false,
      formatted: input,
      rawDigits: cleaned,
      error: 'Please enter a genuine phone number.'
    };
  }

  const formatted = `${dialCode} ${cleaned}`;
  return {
    isValid: true,
    formatted,
    rawDigits: cleaned
  };
}
