const CHANGE_MONTH = 11;
const CHANGE_DAY = 12;
export function nextCycleUnlockDate(currentYear: number): string {
  return `12/11/${currentYear}`;
}
export function canAdvanceAcademicYear(currentYear: number, now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(now);
  const value = (type: string): number => Number(parts.find(p => p.type === type)?.value);
  const year = value('year');
  const month = value('month');
  const day = value('day');
  return year > currentYear ||
    (year === currentYear && (month > CHANGE_MONTH ||
      (month === CHANGE_MONTH && day >= CHANGE_DAY)));
}
