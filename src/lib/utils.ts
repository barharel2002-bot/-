import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// פונקציה לאיחוד clsx + tailwind-merge — סטנדרט של shadcn
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// פורמט תאריך לפי locale
export function formatDate(date: Date | string, locale: string = 'he') {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
