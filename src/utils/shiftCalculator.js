const SHIFTS = {
  MORNING: { name: 'Morning', startTime: '06:00' },
  EVENING: { name: 'Evening', startTime: '14:00' },
  NIGHT: { name: 'Night', startTime: '22:00' },
  FREE: { name: 'Free', startTime: '-' }
};

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Start week on Sunday (no adjustment needed as Sunday is day 0)
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + 1) / 7);
  return weekNumber;
}

function getShiftRotation(date) {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  
  // Only process for 2025 and beyond
  if (year < 2025) return null;

  // Calculate weeks since the start of rotation
  const weeksFrom2025 = ((year - 2025) * 52) + weekNumber - 1;
  const rotationCycle = weeksFrom2025 % 3;

  // Check if it's weekend (Saturday)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 6) {
    return {
      A: { name: 'Free', startTime: '-' },
      B: { name: 'Free', startTime: '-' },
      C: { name: 'Free', startTime: '-' }
    };
  }

  // For Sunday, only night shift works
  if (dayOfWeek === 0) {
    const sundayPattern = {
      0: { A: SHIFTS.NIGHT, B: SHIFTS.FREE, C: SHIFTS.FREE },
      1: { A: SHIFTS.FREE, B: SHIFTS.FREE, C: SHIFTS.NIGHT },
      2: { A: SHIFTS.FREE, B: SHIFTS.NIGHT, C: SHIFTS.FREE }
    };
    return sundayPattern[rotationCycle];
  }

  // Define shift patterns based on rotation cycle for weekdays
  const shiftPatterns = {
    0: { A: SHIFTS.MORNING, B: SHIFTS.NIGHT, C: SHIFTS.EVENING },
    1: { A: SHIFTS.NIGHT, B: SHIFTS.EVENING, C: SHIFTS.MORNING },
    2: { A: SHIFTS.EVENING, B: SHIFTS.MORNING, C: SHIFTS.NIGHT }
  };

  return shiftPatterns[rotationCycle];
}

function getCurrentShift(team) {
  const now = new Date();
  const currentRotation = getShiftRotation(now);
  
  if (!currentRotation || !team) return null;
  
  return currentRotation[team];
}

export { SHIFTS, getShiftRotation, getCurrentShift }; 