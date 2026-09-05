/**
 * Internationalized Date, Time, and Number Formatter
 * Formats numbers, dates, and times into the user's selected language locale
 */

const LOCALE_MAP = {
  en: 'en-US',
  hi: 'hi-IN',
  bn: 'bn-BD',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN'
};

export function formatDate(dateInput, langCode = 'en') {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const locale = LOCALE_MAP[langCode] || 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  } catch (e) {
    return String(dateInput);
  }
}

export function formatTime(timeInput, langCode = 'en') {
  if (!timeInput) return '';
  try {
    const locale = LOCALE_MAP[langCode] || 'en-US';
    if (typeof timeInput === 'string' && timeInput.includes(':')) {
      const parts = timeInput.split(':');
      const d = new Date();
      d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, parseInt(parts[2], 10) || 0);
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: parts.length > 2 ? '2-digit' : undefined
      }).format(d);
    }
    const d = new Date(timeInput);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(d);
    }
    return String(timeInput);
  } catch (e) {
    return String(timeInput);
  }
}

export function formatNumber(num, langCode = 'en') {
  if (num === null || num === undefined) return '';
  const parsed = Number(num);
  if (isNaN(parsed)) return String(num);
  const locale = LOCALE_MAP[langCode] || 'en-US';
  try {
    return new Intl.NumberFormat(locale).format(parsed);
  } catch (e) {
    return String(num);
  }
}
