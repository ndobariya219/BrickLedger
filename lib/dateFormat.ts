import { format } from 'date-fns';
import { Logger } from './logger';

export function formatDateDMY(date: Date | string): string {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.debug('Formatting date to DMY', { date }, 'dateFormat.ts', transactionId);
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const formatted = `${day}-${month}-${year}`;
  Logger.debug('Formatted date to DMY', { input: date, output: formatted }, 'dateFormat.ts', transactionId);
  return formatted;
}

export function parseDMYtoISO(dateStr: string): string {
  const transactionId = `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  Logger.debug('Parsing DMY to ISO', { dateStr }, 'dateFormat.ts', transactionId);
  // Expects dd-mm-yyyy, returns yyyy-mm-dd
  const [day, month, year] = dateStr.split('-');
  const iso = `${year}-${month}-${day}`;
  Logger.debug('Parsed DMY to ISO', { input: dateStr, output: iso }, 'dateFormat.ts', transactionId);
  return iso;
}
