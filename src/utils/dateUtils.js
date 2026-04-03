/**
 * Format a Date object to "YYYY-MM-DD" string.
 */
export function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Get the period range for the given end-month.
 * Period = [startDay of prevMonth, endDay of given month].
 * @param {number} year     - year of the period's end month
 * @param {number} month    - 1-12, end month of the period
 * @param {number} startDay - 1-28
 * @param {number} endDay   - 1-28
 * @returns {{ start: string, end: string }} YYYY-MM-DD
 */
export function getPeriodRange(year, month, startDay, endDay) {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  const start = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
  const end   = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`
  return { start, end }
}

/**
 * Get the current period range based on today's date and period config.
 * @param {number} startDay  - 1-28
 * @param {number} endDay    - 1-28
 * @param {Date}   today     - injectable for testing, defaults to new Date()
 * @returns {{ start: string, end: string }}
 */
export function getCurrentPeriodRange(startDay, endDay, today = new Date()) {
  const todayDay   = today.getDate()
  const todayMonth = today.getMonth() + 1
  const todayYear  = today.getFullYear()

  if (todayDay >= startDay) {
    // Period started this month, ends next month
    const endMonth = todayMonth === 12 ? 1  : todayMonth + 1
    const endYear  = todayMonth === 12 ? todayYear + 1 : todayYear
    return {
      start: `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      end:   `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    }
  } else {
    // Period started last month, ends this month
    const startMonth = todayMonth === 1 ? 12 : todayMonth - 1
    const startYear  = todayMonth === 1 ? todayYear - 1 : todayYear
    return {
      start: `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      end:   `${todayYear}-${String(todayMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    }
  }
}

/**
 * Calculate progress percentage of today within a period (0-100).
 * @param {string} start - YYYY-MM-DD
 * @param {string} end   - YYYY-MM-DD
 */
export function calcPeriodProgress(start, end) {
  const s   = new Date(start).getTime()
  const e   = new Date(end).getTime() + 86400000  // include end day fully
  const now = Date.now()
  if (now <= s) return 0
  if (now >= e) return 100
  return Math.round(((now - s) / (e - s)) * 100)
}

/**
 * Generate 42 calendar cells (6 rows × 7 cols, Monday-first) for a given month.
 * @param {number} year
 * @param {number} month       - 1-12
 * @param {string} periodStart - YYYY-MM-DD
 * @param {string} periodEnd   - YYYY-MM-DD
 * @returns {Array<{ date: Date, dateStr: string, inCurrentMonth: boolean, inPeriod: boolean }>}
 */
export function getCalendarDates(year, month, periodStart, periodEnd) {
  const firstDay    = new Date(year, month - 1, 1)
  const startOffset = firstDay.getDay()               // 0=Sun
  const mondayOff   = (startOffset + 6) % 7           // convert to Monday-first

  const pStart = new Date(periodStart)
  const pEnd   = new Date(periodEnd)
  pEnd.setHours(23, 59, 59, 999)                      // include end day fully

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month - 1, 1 - mondayOff + i)
    return {
      date:           d,
      dateStr:        formatDate(d),
      inCurrentMonth: d.getMonth() === month - 1,
      inPeriod:       d >= pStart && d <= pEnd,
    }
  })
}

/**
 * Format period as "M月D日 — M月D日".
 * @param {string} start - YYYY-MM-DD
 * @param {string} end   - YYYY-MM-DD
 */
export function formatPeriodLabel(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  return `${s.getMonth() + 1}月${s.getDate()}日 — ${e.getMonth() + 1}月${e.getDate()}日`
}

/**
 * Format a date string as "M月D日 周X".
 */
export function formatDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}

/**
 * Format a date string as "M月D日".
 */
export function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
