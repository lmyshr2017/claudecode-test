import { describe, it, expect } from 'vitest'
import { calcOTHours, isCrossDay } from '../src/utils/calcOT'

describe('calcOTHours', () => {
  it('returns 0 when start or end time is null', () => {
    expect(calcOTHours(null, '18:00')).toBe(0)
    expect(calcOTHours('09:00', null)).toBe(0)
    expect(calcOTHours(null, null)).toBe(0)
    expect(calcOTHours('', '18:00')).toBe(0)
  })

  it('returns 0 when worked hours do not exceed standard hours', () => {
    expect(calcOTHours('09:00', '17:00', 8)).toBe(0)  // exactly 8h
    expect(calcOTHours('09:00', '16:00', 8)).toBe(0)  // 7h
  })

  it('calculates overtime with 0.5h precision', () => {
    expect(calcOTHours('09:00', '21:00', 8)).toBe(4)    // 12h worked → 4h OT
    expect(calcOTHours('09:00', '19:30', 8)).toBe(2.5)  // 10.5h worked → 2.5h OT
    expect(calcOTHours('09:00', '18:20', 8)).toBe(1.5)  // 9h20m → 1.33h OT → rounds to 1.5
    expect(calcOTHours('09:00', '17:30', 8)).toBe(0.5)  // 8.5h worked → 0.5h OT
  })

  it('handles cross-day shifts correctly', () => {
    expect(calcOTHours('22:00', '06:00', 8)).toBe(0)  // 8h exactly
    expect(calcOTHours('20:00', '06:00', 8)).toBe(2)  // 10h → 2h OT
  })

  it('uses custom stdHours', () => {
    expect(calcOTHours('09:00', '16:00', 6)).toBe(1)  // 7h worked, std=6 → 1h OT
  })
})

describe('isCrossDay', () => {
  it('returns false for normal shifts', () => {
    expect(isCrossDay('09:00', '18:00')).toBe(false)
    expect(isCrossDay('09:00', '09:01')).toBe(false)
  })

  it('returns true when end time is earlier than start time', () => {
    expect(isCrossDay('22:00', '06:00')).toBe(true)
    expect(isCrossDay('23:00', '00:00')).toBe(true)
  })

  it('returns false for null inputs', () => {
    expect(isCrossDay(null, '18:00')).toBe(false)
    expect(isCrossDay('09:00', null)).toBe(false)
  })
})
