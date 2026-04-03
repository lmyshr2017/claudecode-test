import { describe, it, expect } from 'vitest'
import {
  formatDate,
  getCurrentPeriodRange,
  getPeriodRange,
  calcPeriodProgress,
  getCalendarDates,
  formatPeriodLabel,
  formatDateLabel,
} from '../src/utils/dateUtils'

describe('formatDate', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 3, 3))).toBe('2026-04-03')  // month is 0-indexed
    expect(formatDate(new Date(2026, 0, 1))).toBe('2026-01-01')
  })
})

describe('getPeriodRange', () => {
  it('returns correct start/end for mid-year period', () => {
    const result = getPeriodRange(2026, 4, 25, 24)
    expect(result.start).toBe('2026-03-25')
    expect(result.end).toBe('2026-04-24')
  })

  it('handles January correctly (prev month is December)', () => {
    const result = getPeriodRange(2026, 1, 25, 24)
    expect(result.start).toBe('2025-12-25')
    expect(result.end).toBe('2026-01-24')
  })
})

describe('getCurrentPeriodRange', () => {
  it('returns period where today >= startDay', () => {
    // today = 2026-04-03, startDay=1 → today is after startDay
    // period: 2026-04-01 → 2026-05-28 (endDay=28)
    const result = getCurrentPeriodRange(1, 28, new Date(2026, 3, 3))
    expect(result.start).toBe('2026-04-01')
    expect(result.end).toBe('2026-05-28')
  })

  it('returns period where today < startDay', () => {
    // today = 2026-04-03, startDay=10 → today is before startDay
    // period: 2026-03-10 → 2026-04-24 (endDay=24)
    const result = getCurrentPeriodRange(10, 24, new Date(2026, 3, 3))
    expect(result.start).toBe('2026-03-10')
    expect(result.end).toBe('2026-04-24')
  })

  it('handles January boundary when today < startDay', () => {
    // today = 2026-01-05, startDay=10 → prev period started in December
    const result = getCurrentPeriodRange(10, 24, new Date(2026, 0, 5))
    expect(result.start).toBe('2025-12-10')
    expect(result.end).toBe('2026-01-24')
  })
})

describe('calcPeriodProgress', () => {
  it('returns 0 when today is before period', () => {
    expect(calcPeriodProgress('2030-01-01', '2030-01-31')).toBe(0)
  })

  it('returns 100 when today is after period', () => {
    expect(calcPeriodProgress('2020-01-01', '2020-01-31')).toBe(100)
  })
})

describe('getCalendarDates', () => {
  it('returns exactly 42 cells', () => {
    const cells = getCalendarDates(2026, 4, '2026-03-25', '2026-04-24')
    expect(cells.length).toBe(42)
  })

  it('marks cells within period as inPeriod=true', () => {
    const cells = getCalendarDates(2026, 4, '2026-03-25', '2026-04-24')
    const apr3 = cells.find(c => c.dateStr === '2026-04-03')
    expect(apr3).toBeDefined()
    expect(apr3.inPeriod).toBe(true)
  })

  it('marks cells outside period as inPeriod=false', () => {
    const cells = getCalendarDates(2026, 4, '2026-03-25', '2026-04-24')
    const apr25 = cells.find(c => c.dateStr === '2026-04-25')
    expect(apr25).toBeDefined()
    expect(apr25.inPeriod).toBe(false)
  })
})

describe('formatPeriodLabel', () => {
  it('formats period as human-readable label', () => {
    expect(formatPeriodLabel('2026-03-25', '2026-04-24')).toBe('3月25日 — 4月24日')
  })
})

describe('formatDateLabel', () => {
  it('formats date as month/day + weekday', () => {
    // 2026-04-03 is a Friday (周五)
    expect(formatDateLabel('2026-04-03')).toBe('4月3日 周五')
  })
})
