/**
 * Calculate overtime hours based on start/end time and standard hours.
 * @param {string|null} startTime - "HH:mm", e.g. "09:00"
 * @param {string|null} endTime   - "HH:mm", e.g. "21:00"
 * @param {number}      stdHours  - standard working hours per day, default 8
 * @returns {number} overtime hours rounded to 0.5 precision
 */
export function calcOTHours(startTime, endTime, stdHours = 8) {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let totalMinutes = (eh * 60 + em) - (sh * 60 + sm)
  if (totalMinutes < 0) totalMinutes += 24 * 60   // cross-day
  const workedHours = totalMinutes / 60
  const ot = Math.max(0, workedHours - stdHours)
  return Math.round(ot * 2) / 2                   // 0.5h precision
}

/**
 * Check whether a shift crosses midnight (end < start).
 * @param {string|null} startTime - "HH:mm"
 * @param {string|null} endTime   - "HH:mm"
 * @returns {boolean}
 */
export function isCrossDay(startTime, endTime) {
  if (!startTime || !endTime) return false
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em) < (sh * 60 + sm)
}
