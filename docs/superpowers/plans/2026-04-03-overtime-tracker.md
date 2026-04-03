# 工时记录工具 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete personal overtime tracking PWA with Vue 3 + Vant 4 + Pinia + Supabase, deployed to Vercel.

**Architecture:** Vue 3 SPA that calls Supabase JS SDK directly (no backend layer). Pinia stores own all state and computed statistics. Supabase Row Level Security enforces per-user data isolation. Data-driven build order: utilities → stores → API → UI.

**Tech Stack:** Vue 3.4, Vite 5, Vant 4.9, Pinia 2, Vue Router 4, Supabase JS SDK 2, Vitest (unit tests for utilities/stores), Vercel (deployment)

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and scripts |
| `vite.config.js` | Vite + PWA plugin + path alias |
| `vercel.json` | SPA rewrite rule |
| `index.html` | HTML entry, viewport meta |
| `src/main.js` | App bootstrap, Vant registration |
| `src/App.vue` | Root: RouterView + TabBar (hidden on /login) |
| `src/styles/index.css` | Global CSS, Vant CSS variable overrides |
| `src/utils/supabase.js` | `createClient()` singleton |
| `src/utils/calcOT.js` | `calcOTHours()`, `isCrossDay()` |
| `src/utils/dateUtils.js` | Period range, calendar cells, formatters |
| `src/api/auth.js` | Supabase auth + profiles table calls |
| `src/api/records.js` | records table CRUD |
| `src/api/settings.js` | settings table read/upsert |
| `src/stores/auth.js` | user, profile, login/register/logout |
| `src/stores/settings.js` | stdHours, periodDays, currentPeriod computed |
| `src/stores/records.js` | Map of records, period stats computed |
| `src/router/index.js` | Routes, auth guard |
| `src/pages/LoginPage.vue` | Login + register tabs |
| `src/pages/SettingsPage.vue` | Account, period config, export |
| `src/pages/RecordsPage.vue` | Calendar page shell |
| `src/pages/DashboardPage.vue` | Hero + progress + chart + history |
| `src/components/CalendarView.vue` | 6×7 month grid with period markers |
| `src/components/RecordSheet.vue` | Bottom popup form (add/edit/delete) |
| `src/components/StatCard.vue` | Single stat display card |
| `src/components/BarChart.vue` | SVG bar chart for daily OT |
| `public/manifest.json` | PWA manifest |
| `tests/calcOT.test.js` | Unit tests for calcOT utilities |
| `tests/dateUtils.test.js` | Unit tests for dateUtils utilities |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vercel.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `index.html`

- [ ] **Step 1: Initialize project files**

Run in `D:/code-my/hn-web`:

```bash
npm create vite@latest . -- --template vue --force
```

When prompted to overwrite existing files, confirm. This generates the base Vue 3 + Vite scaffold.

- [ ] **Step 2: Replace `package.json` with exact dependencies**

```json
{
  "name": "overtime-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "vant": "^4.9.0",
    "@supabase/supabase-js": "^2.43.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.2.0",
    "vite-plugin-pwa": "^0.19.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 3: Write `vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Write `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 5: Write `.env.example`**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#18181B" />
    <link rel="manifest" href="/manifest.json" />
    <title>工时</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Update `.gitignore`**

```
node_modules
dist
.env.local
.env.*.local
*.local
```

- [ ] **Step 8: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite starts on `http://localhost:5173`, default Vue page loads in browser.

- [ ] **Step 10: Commit**

```bash
git add package.json vite.config.js vercel.json index.html .env.example .gitignore
git commit -m "feat: scaffold Vue 3 + Vite project with dependencies"
```

---

## Task 2: calcOT Utility + Tests

**Files:**
- Create: `src/utils/calcOT.js`
- Create: `tests/calcOT.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/calcOT.test.js`:

```javascript
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
    expect(calcOTHours('09:00', '18:10', 8)).toBe(0.5)  // 9h10m → 1.17h OT → rounds to 1
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: All tests FAIL with "Cannot find module '../src/utils/calcOT'"

- [ ] **Step 3: Create `src/utils/calcOT.js`**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/calcOT.js tests/calcOT.test.js
git commit -m "feat: add calcOTHours and isCrossDay utilities with tests"
```

---

## Task 3: dateUtils Utility + Tests

**Files:**
- Create: `src/utils/dateUtils.js`
- Create: `tests/dateUtils.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/dateUtils.test.js`:

```javascript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — "Cannot find module '../src/utils/dateUtils'"

- [ ] **Step 3: Create `src/utils/dateUtils.js`**

```javascript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: All tests PASS (both calcOT and dateUtils suites).

- [ ] **Step 5: Commit**

```bash
git add src/utils/dateUtils.js tests/dateUtils.test.js
git commit -m "feat: add dateUtils (period range, calendar cells, formatters) with tests"
```

---

## Task 4: Supabase Client + API Layer

**Files:**
- Create: `src/utils/supabase.js`
- Create: `src/api/auth.js`
- Create: `src/api/records.js`
- Create: `src/api/settings.js`
- Create: `.env.local` (manually, fill in real keys)

- [ ] **Step 1: Create `.env.local` with your Supabase credentials**

```bash
# Create .env.local (not committed to git)
# Fill in real values from your Supabase project → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 2: Create `src/utils/supabase.js`**

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 3: Create `src/api/auth.js`**

```javascript
import { supabase } from '@/utils/supabase'

/**
 * Sign in with email and password.
 * @returns {{ user: object, session: object }}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * Register a new account.
 * Creates auth user and writes nickname to public.profiles.
 * @returns {{ user: object }}
 */
export async function signUp(email, password, nickname) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, nickname })
    if (profileError) throw profileError
  }
  return data
}

/** Sign out current user. */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** Get current session user (null if not logged in). */
export async function getUser() {
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

/** Fetch profile (nickname) for current user. */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error  // ignore "not found"
  return data
}
```

- [ ] **Step 4: Create `src/api/records.js`**

```javascript
import { supabase } from '@/utils/supabase'

/**
 * Fetch all records between start and end date (inclusive).
 * @param {string} start - YYYY-MM-DD
 * @param {string} end   - YYYY-MM-DD
 * @returns {Array<RecordRow>}
 */
export async function fetchRecords(start, end) {
  const { data, error } = await supabase
    .from('records')
    .select('id, date, start_time, end_time, ot_hours, note')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Upsert (insert or update) a single record.
 * Same user + same date → update; otherwise → insert.
 * @param {{ date, start_time, end_time, ot_hours, note }} record
 * @returns {RecordRow}
 */
export async function upsertRecord(record) {
  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('records')
    .upsert({ ...record, user_id: userId }, { onConflict: 'user_id,date' })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Delete a record by date.
 * @param {string} date - YYYY-MM-DD
 */
export async function deleteRecord(date) {
  const { error } = await supabase
    .from('records')
    .delete()
    .eq('date', date)
  if (error) throw error
}
```

- [ ] **Step 5: Create `src/api/settings.js`**

```javascript
import { supabase } from '@/utils/supabase'

/**
 * Fetch settings for current user.
 * Returns null if no settings row exists yet.
 * @returns {{ std_hours, period_start_day, period_end_day } | null}
 */
export async function fetchSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('std_hours, period_start_day, period_end_day')
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

/**
 * Upsert settings for current user.
 * @param {{ std_hours?, period_start_day?, period_end_day? }} patch
 */
export async function upsertSettings(patch) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })
  if (error) throw error
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/supabase.js src/api/auth.js src/api/records.js src/api/settings.js .env.example
git commit -m "feat: add Supabase client and API layer (auth, records, settings)"
```

---

## Task 5: Auth Store

**Files:**
- Create: `src/stores/auth.js`

- [ ] **Step 1: Create `src/stores/auth.js`**

```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { signIn, signUp, signOut, getUser, fetchProfile } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)   // Supabase Auth User object
  const profile = ref(null)   // { nickname }
  const loading = ref(false)

  /** Called on app startup — restores session from localStorage. */
  async function init() {
    loading.value = true
    try {
      user.value = await getUser()
      if (user.value) {
        profile.value = await fetchProfile(user.value.id)
      }
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      const { user: u } = await signIn(email, password)
      user.value    = u
      profile.value = await fetchProfile(u.id)
    } finally {
      loading.value = false
    }
  }

  async function register(email, password, nickname) {
    loading.value = true
    try {
      await signUp(email, password, nickname)
      // Supabase may require email confirmation; don't auto-login here
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await signOut()
    user.value    = null
    profile.value = null
  }

  return { user, profile, loading, init, login, register, logout }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/auth.js
git commit -m "feat: add auth Pinia store (login, register, logout, session restore)"
```

---

## Task 6: Settings Store

**Files:**
- Create: `src/stores/settings.js`

- [ ] **Step 1: Create `src/stores/settings.js`**

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchSettings, upsertSettings } from '@/api/settings'
import { getCurrentPeriodRange, formatPeriodLabel } from '@/utils/dateUtils'

export const useSettingsStore = defineStore('settings', () => {
  const stdHours       = ref(8)
  const periodStartDay = ref(25)
  const periodEndDay   = ref(24)
  const lastSyncAt     = ref(null)
  const loading        = ref(false)

  /** Current period { start, end } based on today + config */
  const currentPeriod = computed(() =>
    getCurrentPeriodRange(periodStartDay.value, periodEndDay.value)
  )

  /** Human-readable period label, e.g. "3月25日 — 4月24日" */
  const currentPeriodLabel = computed(() =>
    formatPeriodLabel(currentPeriod.value.start, currentPeriod.value.end)
  )

  /** Load settings from Supabase. Falls back to defaults if no row exists. */
  async function load() {
    loading.value = true
    try {
      const data = await fetchSettings()
      if (data) {
        stdHours.value       = Number(data.std_hours)
        periodStartDay.value = data.period_start_day
        periodEndDay.value   = data.period_end_day
      } else {
        // No settings row yet — write defaults
        await upsertSettings({
          std_hours:        stdHours.value,
          period_start_day: periodStartDay.value,
          period_end_day:   periodEndDay.value,
        })
      }
      lastSyncAt.value = new Date()
    } finally {
      loading.value = false
    }
  }

  /** Save updated settings to Supabase. */
  async function save(patch) {
    // Optimistic local update
    if (patch.std_hours        !== undefined) stdHours.value       = Number(patch.std_hours)
    if (patch.period_start_day !== undefined) periodStartDay.value = patch.period_start_day
    if (patch.period_end_day   !== undefined) periodEndDay.value   = patch.period_end_day

    await upsertSettings({
      std_hours:        stdHours.value,
      period_start_day: periodStartDay.value,
      period_end_day:   periodEndDay.value,
      ...patch,
    })
    lastSyncAt.value = new Date()
  }

  return {
    stdHours, periodStartDay, periodEndDay, lastSyncAt, loading,
    currentPeriod, currentPeriodLabel,
    load, save,
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/settings.js
git commit -m "feat: add settings Pinia store with currentPeriod computed"
```

---

## Task 7: Records Store

**Files:**
- Create: `src/stores/records.js`

- [ ] **Step 1: Create `src/stores/records.js`**

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchRecords, upsertRecord, deleteRecord } from '@/api/records'
import { useSettingsStore } from '@/stores/settings'
import { calcPeriodProgress } from '@/utils/dateUtils'

export const useRecordsStore = defineStore('records', () => {
  // Map<dateString "YYYY-MM-DD", RecordObject>
  const records = ref(new Map())
  const loading = ref(false)

  const settingsStore = useSettingsStore()

  // ─── Computed stats (all scoped to currentPeriod) ──────────────────

  const currentPeriodRecords = computed(() => {
    const { start, end } = settingsStore.currentPeriod
    const result = []
    for (const [dateStr, rec] of records.value) {
      if (dateStr >= start && dateStr <= end) result.push(rec)
    }
    return result.sort((a, b) => a.date.localeCompare(b.date))
  })

  const totalOTHours = computed(() =>
    currentPeriodRecords.value.reduce((sum, r) => sum + Number(r.ot_hours), 0)
  )

  const recordedDays = computed(() => currentPeriodRecords.value.length)

  const avgOTHours = computed(() => {
    if (recordedDays.value === 0) return '--'
    return (totalOTHours.value / recordedDays.value).toFixed(1)
  })

  const maxOTDay = computed(() => {
    if (currentPeriodRecords.value.length === 0) return null
    return currentPeriodRecords.value.reduce((max, r) =>
      Number(r.ot_hours) > Number(max.ot_hours) ? r : max
    )
  })

  const periodProgress = computed(() => {
    const { start, end } = settingsStore.currentPeriod
    return calcPeriodProgress(start, end)
  })

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Fetch records for a date range and merge into the Map.
   * @param {string} start - YYYY-MM-DD
   * @param {string} end   - YYYY-MM-DD
   */
  async function fetchByRange(start, end) {
    loading.value = true
    try {
      const data = await fetchRecords(start, end)
      data.forEach(rec => records.value.set(rec.date, rec))
    } finally {
      loading.value = false
    }
  }

  /**
   * Upsert a record (optimistic update + server sync).
   * @param {{ date, start_time, end_time, ot_hours, note }} record
   */
  async function upsert(record) {
    // Optimistic update
    const prev = records.value.get(record.date)
    records.value.set(record.date, { ...prev, ...record })
    try {
      const saved = await upsertRecord(record)
      records.value.set(saved.date, saved)
    } catch (err) {
      // Rollback on failure
      if (prev) records.value.set(record.date, prev)
      else records.value.delete(record.date)
      throw err
    }
  }

  /**
   * Delete a record by date (optimistic update + server sync).
   * @param {string} date - YYYY-MM-DD
   */
  async function remove(date) {
    const prev = records.value.get(date)
    records.value.delete(date)
    try {
      await deleteRecord(date)
    } catch (err) {
      if (prev) records.value.set(date, prev)
      throw err
    }
  }

  return {
    records, loading,
    currentPeriodRecords, totalOTHours, recordedDays, avgOTHours, maxOTDay, periodProgress,
    fetchByRange, upsert, remove,
  }
})
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/records.js
git commit -m "feat: add records Pinia store with period stats and optimistic updates"
```

---

## Task 8: App Shell (main.js, Router, App.vue, Global Styles)

**Files:**
- Create: `src/styles/index.css`
- Create: `src/router/index.js`
- Modify: `src/main.js`
- Modify: `src/App.vue`

- [ ] **Step 1: Create `src/styles/index.css`**

```css
/* Vant CSS variable overrides — must come before component styles */
:root {
  --van-primary-color: #D97706;
  --van-button-primary-background: #D97706;
  --van-button-primary-border-color: #D97706;
  --van-tabs-bottom-bar-color: #D97706;
  --van-tabbar-item-active-color: #D97706;
  --van-stepper-button-icon-color: #D97706;
  --van-switch-on-background: #D97706;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #F8F7F4;
  color: #1C1917;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue',
    'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Page wrapper — adds bottom padding for the TabBar */
.page {
  min-height: 100vh;
  padding-bottom: 60px;
  background: #F8F7F4;
}

/* Card component */
.card {
  background: #fff;
  border: 1px solid #F0EDE8;
  border-radius: 16px;
  padding: 20px;
  margin: 0 16px 12px;
}

.card-title {
  font-size: 0.875rem;
  color: #78716C;
  font-weight: 500;
  margin-bottom: 4px;
}

/* Scrollable page content */
.scroll-area {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

- [ ] **Step 2: Create `src/router/index.js`**

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/records',
    component: () => import('@/pages/RecordsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // Restore session if not yet initialized
  if (auth.user === null && !auth.loading) {
    await auth.init()
  }

  if (to.meta.requiresAuth && !auth.user) {
    return '/login'
  }

  if (to.meta.guest && auth.user) {
    return '/dashboard'
  }
})

export default router
```

- [ ] **Step 3: Rewrite `src/main.js`**

```javascript
import { createApp }  from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant components used across the app
import {
  Button, Form, Field, CellGroup, Cell,
  Tab, Tabs, NavBar, Tabbar, TabbarItem,
  Popup, ActionSheet, TimePicker, DatePicker,
  Stepper, Progress, Dialog, Toast,
  Icon, Loading, Empty, Skeleton,
} from 'vant'
import 'vant/lib/index.css'

// Global styles (must come AFTER vant CSS to allow overrides)
import '@/styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

;[
  Button, Form, Field, CellGroup, Cell,
  Tab, Tabs, NavBar, Tabbar, TabbarItem,
  Popup, ActionSheet, TimePicker, DatePicker,
  Stepper, Progress, Dialog, Toast,
  Icon, Loading, Empty, Skeleton,
].forEach(c => app.use(c))

app.mount('#app')
```

- [ ] **Step 4: Rewrite `src/App.vue`**

```vue
<template>
  <RouterView />
  <van-tabbar
    v-if="showTabBar"
    v-model="active"
    active-color="#D97706"
    inactive-color="#78716C"
    safe-area-inset-bottom
  >
    <van-tabbar-item icon="chart-trending-o" to="/dashboard">总览</van-tabbar-item>
    <van-tabbar-item icon="calendar-o"       to="/records">记录</van-tabbar-item>
    <van-tabbar-item icon="setting-o"        to="/settings">设置</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route     = useRoute()
const authStore = useAuthStore()

const showTabBar = computed(() => route.path !== '/login' && !!authStore.user)

// Keep TabBar active index in sync with current route
const routeToTab = { '/dashboard': 0, '/records': 1, '/settings': 2 }
const active     = ref(0)
watch(() => route.path, (path) => {
  if (routeToTab[path] !== undefined) active.value = routeToTab[path]
}, { immediate: true })
</script>
```

- [ ] **Step 5: Delete default Vite boilerplate files**

```bash
rm src/components/HelloWorld.vue src/assets/vue.svg src/style.css 2>/dev/null || true
```

- [ ] **Step 6: Verify dev server still starts without errors**

```bash
npm run dev
```

Expected: Server starts. Browser shows blank page (no pages implemented yet) with no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/styles/index.css src/router/index.js src/main.js src/App.vue
git commit -m "feat: add router with auth guard, App shell with TabBar, global styles"
```

---

## Task 9: Login Page

**Files:**
- Create: `src/pages/LoginPage.vue`

- [ ] **Step 1: Create `src/pages/LoginPage.vue`**

```vue
<template>
  <div class="login-page">
    <!-- Hero header -->
    <div class="login-header">
      <div class="login-logo">⏱</div>
      <h1 class="login-title">工时</h1>
      <p class="login-subtitle">记录每一分钟的付出</p>
    </div>

    <!-- Tab form -->
    <div class="login-body">
      <van-tabs v-model:active="activeTab" animated>
        <!-- Login Tab -->
        <van-tab title="登录">
          <van-form @submit="handleLogin" class="tab-form">
            <van-cell-group inset>
              <van-field
                v-model="loginForm.email"
                name="email"
                label="邮箱"
                placeholder="your@email.com"
                type="email"
                autocomplete="email"
                :rules="[{ required: true, message: '请填写邮箱' }]"
              />
              <van-field
                v-model="loginForm.password"
                name="password"
                label="密码"
                placeholder="请输入密码"
                type="password"
                autocomplete="current-password"
                :rules="[{ required: true, message: '请填写密码' }]"
              />
            </van-cell-group>
            <div class="form-action">
              <van-button
                round block type="primary"
                native-type="submit"
                :loading="loading"
              >
                登录
              </van-button>
            </div>
          </van-form>
        </van-tab>

        <!-- Register Tab -->
        <van-tab title="注册">
          <van-form @submit="handleRegister" class="tab-form">
            <van-cell-group inset>
              <van-field
                v-model="registerForm.nickname"
                name="nickname"
                label="昵称"
                placeholder="你叫什么？"
                :rules="[{ required: true, message: '请填写昵称' }]"
              />
              <van-field
                v-model="registerForm.email"
                name="email"
                label="邮箱"
                placeholder="your@email.com"
                type="email"
                :rules="[{ required: true, message: '请填写邮箱' }]"
              />
              <van-field
                v-model="registerForm.password"
                name="password"
                label="密码"
                placeholder="不少于 6 位"
                type="password"
                :rules="[
                  { required: true, message: '请填写密码' },
                  { validator: v => v.length >= 6, message: '密码不少于 6 位' },
                ]"
              />
            </van-cell-group>
            <div class="form-action">
              <van-button
                round block type="primary"
                native-type="submit"
                :loading="loading"
              >
                注册
              </van-button>
            </div>
          </van-form>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter }     from 'vue-router'
import { showToast }     from 'vant'
import { useAuthStore }  from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useRecordsStore }  from '@/stores/records'

const router        = useRouter()
const authStore     = useAuthStore()
const settingsStore = useSettingsStore()
const recordsStore  = useRecordsStore()

const activeTab = ref(0)
const loading   = ref(false)

const loginForm    = reactive({ email: '', password: '' })
const registerForm = reactive({ nickname: '', email: '', password: '' })

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(loginForm.email, loginForm.password)
    // Load settings and current-period records after login
    await settingsStore.load()
    await recordsStore.fetchByRange(
      settingsStore.currentPeriod.start,
      settingsStore.currentPeriod.end
    )
    router.push('/dashboard')
  } catch (err) {
    showToast({ message: err.message || '登录失败，请检查邮箱和密码', type: 'fail' })
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  loading.value = true
  try {
    await authStore.register(
      registerForm.email,
      registerForm.password,
      registerForm.nickname
    )
    showToast({ message: '注册成功！请登录', type: 'success' })
    activeTab.value = 0
    loginForm.email    = registerForm.email
    loginForm.password = ''
  } catch (err) {
    showToast({ message: err.message || '注册失败', type: 'fail' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #F8F7F4;
  display: flex;
  flex-direction: column;
}

.login-header {
  background: #18181B;
  padding: 72px 24px 52px;
  text-align: center;
}

.login-logo {
  font-size: 3rem;
  margin-bottom: 16px;
  display: block;
}

.login-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.login-subtitle {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.4);
  margin: 0;
}

.login-body {
  flex: 1;
  padding-top: 8px;
}

.tab-form {
  padding-top: 16px;
}

.form-action {
  padding: 24px 16px 16px;
}

:deep(.van-tabs__line) {
  background: #D97706 !important;
}
:deep(.van-tab--active .van-tab__text) {
  color: #D97706;
  font-weight: 700;
}
</style>
```

- [ ] **Step 2: Verify login page renders correctly**

```bash
npm run dev
```

Navigate to `http://localhost:5173/login`. Expected: dark hero header, "工时" title, login/register tabs.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.vue
git commit -m "feat: add login/register page with Vant tabs and form validation"
```

---

## Task 10: Settings Page

**Files:**
- Create: `src/pages/SettingsPage.vue`

- [ ] **Step 1: Create `src/pages/SettingsPage.vue`**

```vue
<template>
  <div class="page">
    <van-nav-bar title="设置" />

    <!-- Account -->
    <div class="section-label">账号</div>
    <div class="card">
      <div class="account-row">
        <div class="account-avatar">{{ avatarLetter }}</div>
        <div class="account-info">
          <div class="account-name">{{ authStore.profile?.nickname || '未设置昵称' }}</div>
          <div class="account-email">{{ authStore.user?.email }}</div>
        </div>
      </div>
    </div>

    <!-- Work config -->
    <div class="section-label">工时配置</div>
    <div class="card">
      <!-- Standard hours -->
      <div class="config-row">
        <span class="config-label">标准工时</span>
        <div class="config-right">
          <van-stepper
            v-model="form.stdHours"
            step="0.5"
            min="1"
            max="16"
            decimal-length="1"
            @change="onStdHoursChange"
          />
          <span class="config-unit">小时</span>
        </div>
      </div>

      <div class="divider" />

      <!-- Period start/end day -->
      <div class="config-row">
        <span class="config-label">统计周期</span>
        <div class="period-inputs">
          <div class="period-field">
            <span class="period-field-label">起始日</span>
            <input
              v-model.number="form.periodStartDay"
              type="number"
              min="1"
              max="28"
              class="day-input"
              @change="onPeriodChange"
            />
            <span class="period-field-unit">日</span>
          </div>
          <span class="period-sep">至</span>
          <div class="period-field">
            <span class="period-field-label">结束日</span>
            <input
              v-model.number="form.periodEndDay"
              type="number"
              min="1"
              max="28"
              class="day-input"
              @change="onPeriodChange"
            />
            <span class="period-field-unit">日</span>
          </div>
        </div>
      </div>

      <!-- Live preview -->
      <div class="period-preview">
        <van-icon name="info-o" size="13" color="#78716C" />
        <span>当前周期：{{ previewLabel }}</span>
      </div>
    </div>

    <!-- Data -->
    <div class="section-label">数据</div>
    <div class="card">
      <div class="data-row" @click="exportCSV">
        <span class="data-label">导出数据</span>
        <div class="data-right">
          <span class="data-hint">CSV 文件</span>
          <van-icon name="arrow" color="#D4D0C8" />
        </div>
      </div>
      <div class="divider" />
      <div class="data-row">
        <span class="data-label">最后同步</span>
        <span class="data-hint">{{ syncLabel }}</span>
      </div>
    </div>

    <!-- Logout -->
    <div class="logout-wrap">
      <van-button round block plain type="danger" @click="handleLogout">
        退出登录
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter }           from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { useAuthStore }                from '@/stores/auth'
import { useSettingsStore }            from '@/stores/settings'
import { useRecordsStore }     from '@/stores/records'
import { formatPeriodLabel, getCurrentPeriodRange, formatDate } from '@/utils/dateUtils'

const router        = useRouter()
const authStore     = useAuthStore()
const settingsStore = useSettingsStore()
const recordsStore  = useRecordsStore()

const form = reactive({
  stdHours:       settingsStore.stdHours,
  periodStartDay: settingsStore.periodStartDay,
  periodEndDay:   settingsStore.periodEndDay,
})

const avatarLetter = computed(() => {
  const name = authStore.profile?.nickname || authStore.user?.email || '?'
  return name.charAt(0).toUpperCase()
})

const previewLabel = computed(() => {
  const sd = Math.max(1, Math.min(28, Number(form.periodStartDay) || 1))
  const ed = Math.max(1, Math.min(28, Number(form.periodEndDay)   || 1))
  const { start, end } = getCurrentPeriodRange(sd, ed)
  return formatPeriodLabel(start, end)
})

const syncLabel = computed(() => {
  if (!settingsStore.lastSyncAt) return '从未'
  const d = settingsStore.lastSyncAt
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
})

async function onStdHoursChange() {
  try {
    await settingsStore.save({ std_hours: form.stdHours })
    showToast({ message: '已保存', type: 'success', duration: 1000 })
  } catch {
    showToast({ message: '保存失败', type: 'fail' })
  }
}

async function onPeriodChange() {
  const sd = Number(form.periodStartDay)
  const ed = Number(form.periodEndDay)
  if (sd < 1 || sd > 28 || ed < 1 || ed > 28) {
    showToast({ message: '起止日需在 1-28 之间', type: 'fail' })
    return
  }
  try {
    await settingsStore.save({ period_start_day: sd, period_end_day: ed })
    // Re-fetch records for new period
    await recordsStore.fetchByRange(
      settingsStore.currentPeriod.start,
      settingsStore.currentPeriod.end
    )
    showToast({ message: '周期已更新', type: 'success', duration: 1000 })
  } catch {
    showToast({ message: '保存失败', type: 'fail' })
  }
}

function exportCSV() {
  const allRecords = [...recordsStore.records.values()]
    .sort((a, b) => a.date.localeCompare(b.date))

  if (allRecords.length === 0) {
    showToast({ message: '暂无数据可导出', type: 'fail' })
    return
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const header = '日期,星期,上班时间,下班时间,工作时长(h),加班时长(h),备注'
  const rows = allRecords.map(r => {
    const d = new Date(r.date)
    const weekDay = `周${weekDays[d.getDay()]}`
    const start = r.start_time || ''
    const end   = r.end_time   || ''
    let worked = ''
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      let mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins < 0) mins += 1440
      worked = (mins / 60).toFixed(1)
    }
    const note = (r.note || '').replace(/,/g, '，')
    return [r.date, weekDay, start, end, worked, r.ot_hours, note].join(',')
  })

  const csv  = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `工时记录_${formatDate(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleLogout() {
  try {
    await showConfirmDialog({
      title: '退出登录',
      message: '确定要退出吗？',
      confirmButtonText: '退出',
      confirmButtonColor: '#DC2626',
      cancelButtonText: '取消',
    })
    await authStore.logout()
    router.push('/login')
  } catch {
    // User cancelled
  }
}

onMounted(async () => {
  // Sync local form state with store (in case store loaded after component created)
  form.stdHours       = settingsStore.stdHours
  form.periodStartDay = settingsStore.periodStartDay
  form.periodEndDay   = settingsStore.periodEndDay
})
</script>

<style scoped>
.section-label {
  font-size: 0.75rem;
  color: #78716C;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 20px 20px 8px;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #18181B;
  color: white;
  font-size: 1.125rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.account-name  { font-size: 1rem; font-weight: 700; color: #1C1917; }
.account-email { font-size: 0.8125rem; color: #78716C; margin-top: 2px; }

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
}

.config-label { font-size: 0.9375rem; color: #1C1917; font-weight: 500; }
.config-right { display: flex; align-items: center; gap: 8px; }
.config-unit  { font-size: 0.875rem; color: #78716C; }

.divider {
  height: 1px;
  background: #F0EDE8;
  margin: 4px 0;
}

.period-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.period-field {
  display: flex;
  align-items: center;
  gap: 4px;
}

.period-field-label { font-size: 0.8125rem; color: #78716C; }

.day-input {
  width: 44px;
  text-align: center;
  border: 1px solid #F0EDE8;
  border-radius: 8px;
  padding: 6px 4px;
  font-size: 1rem;
  color: #1C1917;
  background: #F8F7F4;
  outline: none;
  -moz-appearance: textfield;
}
.day-input::-webkit-inner-spin-button,
.day-input::-webkit-outer-spin-button { -webkit-appearance: none; }

.period-sep { font-size: 0.875rem; color: #78716C; }

.period-preview {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 0.8125rem;
  color: #78716C;
}

.data-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  cursor: pointer;
}
.data-label { font-size: 0.9375rem; color: #1C1917; font-weight: 500; }
.data-right { display: flex; align-items: center; gap: 6px; }
.data-hint  { font-size: 0.8125rem; color: #78716C; }

.logout-wrap { padding: 8px 16px 32px; }
</style>
```

- [ ] **Step 2: Verify settings page in browser**

```bash
npm run dev
```

Log in, navigate to Settings tab. Expected: account card, stepper for std hours, period inputs with live preview, export button, logout button.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SettingsPage.vue
git commit -m "feat: add settings page (period config, std hours, CSV export, logout)"
```

---

## Task 11: CalendarView Component

**Files:**
- Create: `src/components/CalendarView.vue`

- [ ] **Step 1: Create `src/components/CalendarView.vue`**

```vue
<template>
  <div class="calendar">
    <!-- Month navigation -->
    <div class="cal-header">
      <button class="nav-btn" @click="prevMonth">
        <van-icon name="arrow-left" size="16" />
      </button>
      <span class="month-label">{{ year }}年{{ month }}月</span>
      <button class="nav-btn" @click="nextMonth">
        <van-icon name="arrow" size="16" />
      </button>
    </div>

    <!-- Weekday headers -->
    <div class="weekdays">
      <span v-for="d in WEEKDAYS" :key="d">{{ d }}</span>
    </div>

    <!-- Calendar grid -->
    <div class="cal-grid">
      <div
        v-for="cell in cells"
        :key="cell.dateStr"
        class="cal-cell"
        :class="{
          'cell-other':    !cell.inCurrentMonth,
          'cell-disabled': !cell.inPeriod,
          'cell-today':     cell.dateStr === todayStr,
          'cell-active':    cell.inPeriod && cell.inCurrentMonth,
        }"
        @click="onCellClick(cell)"
      >
        <span class="cell-num">{{ cell.date.getDate() }}</span>
        <span
          v-if="records[cell.dateStr]"
          class="cell-dot"
          :class="Number(records[cell.dateStr].ot_hours) > 0 ? 'dot-ot' : 'dot-normal'"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCalendarDates, formatDate } from '@/utils/dateUtils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const props = defineProps({
  /**
   * Record map: key = "YYYY-MM-DD", value = { ot_hours, ... }
   * Use a plain object (not Map) for template reactivity.
   */
  records:     { type: Object,  default: () => ({}) },
  periodStart: { type: String,  required: true },
  periodEnd:   { type: String,  required: true },
})

const emit = defineEmits(['select'])

const today    = new Date()
const todayStr = formatDate(today)

const year  = ref(today.getFullYear())
const month = ref(today.getMonth() + 1)

const cells = computed(() =>
  getCalendarDates(year.value, month.value, props.periodStart, props.periodEnd)
)

function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- }
  else                    { month.value-- }
}

function nextMonth() {
  if (month.value === 12) { month.value = 1; year.value++ }
  else                     { month.value++ }
}

function onCellClick(cell) {
  if (!cell.inPeriod || !cell.inCurrentMonth) return
  emit('select', cell.dateStr)
}
</script>

<style scoped>
.calendar { padding: 0 16px 8px; }

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0 12px;
}

.month-label {
  font-size: 1rem;
  font-weight: 700;
  color: #1C1917;
}

.nav-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  color: #78716C;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s;
}
.nav-btn:active { background: #F0EDE8; }

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.75rem;
  color: #78716C;
  padding-bottom: 8px;
  border-bottom: 1px solid #F0EDE8;
  margin-bottom: 4px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 10px;
  position: relative;
  cursor: default;
  user-select: none;
}

.cell-active {
  cursor: pointer;
}
.cell-active:active { background: #F5F1EB; }

.cell-num {
  font-size: 0.875rem;
  font-weight: 500;
  color: #1C1917;
  line-height: 1;
}

.cell-other   .cell-num  { color: #D4D0C8; }
.cell-disabled .cell-num { color: #D4D0C8; }

.cell-today .cell-num {
  width: 28px;
  height: 28px;
  background: #18181B;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  margin-top: 3px;
}
.dot-ot     { background: #16A34A; }
.dot-normal { background: #D4D0C8; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CalendarView.vue
git commit -m "feat: add CalendarView component with period markers and dot indicators"
```

---

## Task 12: RecordSheet Component

**Files:**
- Create: `src/components/RecordSheet.vue`

- [ ] **Step 1: Create `src/components/RecordSheet.vue`**

```vue
<template>
  <van-popup
    v-model:show="visible"
    position="bottom"
    round
    safe-area-inset-bottom
    :style="{ maxHeight: '90vh' }"
  >
    <div class="sheet">
      <!-- Handle -->
      <div class="sheet-handle" />

      <!-- Header -->
      <div class="sheet-head">
        <span class="sheet-title">{{ dateLabel }}</span>
        <button v-if="existing" class="del-btn" @click="handleDelete">删除</button>
      </div>

      <!-- Body -->
      <div class="sheet-body">
        <!-- Start time -->
        <div class="field-row" @click="openPicker('start')">
          <span class="field-label">上班时间</span>
          <span class="field-val" :class="{ empty: !form.start_time }">
            {{ form.start_time || '未填写' }}
          </span>
        </div>

        <!-- End time -->
        <div class="field-row" @click="openPicker('end')">
          <span class="field-label">下班时间</span>
          <span class="field-val" :class="{ empty: !form.end_time }">
            {{ form.end_time || '未填写' }}
          </span>
        </div>

        <!-- OT hours (auto-calculated, manually overridable) -->
        <div class="field-row">
          <span class="field-label">加班时长</span>
          <div class="stepper-wrap">
            <van-stepper
              v-model="form.ot_hours"
              :step="0.5"
              :min="0"
              :max="24"
              :decimal-length="1"
            />
            <span class="unit">h</span>
          </div>
        </div>

        <!-- Note -->
        <div class="note-wrap">
          <van-field
            v-model="form.note"
            label="备注"
            placeholder="加班原因、项目名等（选填）"
            type="textarea"
            :maxlength="100"
            show-word-limit
            :border="false"
            rows="2"
            autosize
          />
        </div>
      </div>

      <!-- Save button -->
      <div class="sheet-foot">
        <van-button
          round block type="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存记录
        </van-button>
      </div>
    </div>

    <!-- Time Picker nested popup -->
    <van-popup
      v-model:show="pickerVisible"
      position="bottom"
      safe-area-inset-bottom
    >
      <van-time-picker
        v-model="pickerValue"
        :title="pickerTarget === 'start' ? '选择上班时间' : '选择下班时间'"
        :columns-type="['hour', 'minute']"
        @confirm="onPickerConfirm"
        @cancel="pickerVisible = false"
      />
    </van-popup>
  </van-popup>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { calcOTHours, isCrossDay }      from '@/utils/calcOT'
import { formatDateLabel }              from '@/utils/dateUtils'
import { useRecordsStore }              from '@/stores/records'
import { useSettingsStore }             from '@/stores/settings'

// ─── Props / Emits ─────────────────────────────────────────────────────────
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  date:       { type: String,  default: '' },    // "YYYY-MM-DD"
})
const emit = defineEmits(['update:modelValue', 'saved'])

// ─── Stores ────────────────────────────────────────────────────────────────
const recordsStore  = useRecordsStore()
const settingsStore = useSettingsStore()

// ─── Visible (v-model binding) ─────────────────────────────────────────────
const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ─── Local form state ──────────────────────────────────────────────────────
const saving = ref(false)
const form   = reactive({ start_time: '', end_time: '', ot_hours: 0, note: '' })

const existing  = computed(() => recordsStore.records.get(props.date) ?? null)
const dateLabel = computed(() => props.date ? formatDateLabel(props.date) : '')

// Populate form when date or visibility changes
watch(
  [() => props.date, () => props.modelValue],
  ([date, show]) => {
    if (!show || !date) return
    const rec = recordsStore.records.get(date)
    form.start_time = rec?.start_time ?? ''
    form.end_time   = rec?.end_time   ?? ''
    form.ot_hours   = rec ? Number(rec.ot_hours) : 0
    form.note       = rec?.note ?? ''
  }
)

// Auto-calculate OT when both times are filled in
// Use a flag to avoid re-triggering after manual override
const autoCalcLock = ref(false)
watch(
  [() => form.start_time, () => form.end_time],
  async ([start, end]) => {
    if (!start || !end || autoCalcLock.value) return

    if (isCrossDay(start, end)) {
      try {
        await showConfirmDialog({
          title: '跨天班次',
          message: `下班时间（${end}）早于上班时间（${start}），是否按跨天处理？`,
          confirmButtonText: '跨天处理',
          cancelButtonText: '重新填写',
        })
        form.ot_hours = calcOTHours(start, end, settingsStore.stdHours)
      } catch {
        // User chose "重新填写" — clear end time
        autoCalcLock.value = true
        form.end_time      = ''
        await nextTick()
        autoCalcLock.value = false
      }
    } else {
      form.ot_hours = calcOTHours(start, end, settingsStore.stdHours)
    }
  }
)

// ─── Time picker ───────────────────────────────────────────────────────────
const pickerVisible = ref(false)
const pickerTarget  = ref('start')        // 'start' | 'end'
const pickerValue   = ref(['09', '00'])

function openPicker(target) {
  pickerTarget.value = target
  const cur = target === 'start' ? form.start_time : form.end_time
  pickerValue.value  = cur ? cur.split(':') : (target === 'start' ? ['09', '00'] : ['18', '00'])
  pickerVisible.value = true
}

function onPickerConfirm({ selectedValues }) {
  const val = selectedValues.map(String).join(':')
  if (pickerTarget.value === 'start') form.start_time = val
  else                                form.end_time   = val
  pickerVisible.value = false
}

// ─── Actions ───────────────────────────────────────────────────────────────
async function handleSave() {
  saving.value = true
  try {
    await recordsStore.upsert({
      date:       props.date,
      start_time: form.start_time || null,
      end_time:   form.end_time   || null,
      ot_hours:   form.ot_hours,
      note:       form.note       || null,
    })
    showToast({ message: '已保存', type: 'success', duration: 1200 })
    visible.value = false
    emit('saved')
  } catch (err) {
    showToast({ message: err.message || '保存失败', type: 'fail' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  try {
    await showConfirmDialog({
      title: '删除记录',
      message: `确定删除 ${dateLabel.value} 的记录？`,
      confirmButtonText: '删除',
      confirmButtonColor: '#DC2626',
      cancelButtonText: '取消',
    })
    await recordsStore.remove(props.date)
    showToast({ message: '已删除', type: 'success', duration: 1200 })
    visible.value = false
    emit('saved')
  } catch {
    // User cancelled — do nothing
  }
}
</script>

<style scoped>
.sheet { padding-bottom: 8px; }

.sheet-handle {
  width: 36px;
  height: 4px;
  background: #E8E5DF;
  border-radius: 2px;
  margin: 12px auto;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 12px;
}

.sheet-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1C1917;
}

.del-btn {
  background: none;
  border: none;
  color: #DC2626;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 4px 8px;
}

.sheet-body { padding: 0 20px; }

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #F0EDE8;
  cursor: pointer;
}

.field-label {
  font-size: 0.9375rem;
  color: #1C1917;
  font-weight: 500;
}

.field-val       { font-size: 0.9375rem; color: #1C1917; }
.field-val.empty { color: #D4D0C8; }

.stepper-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.unit { font-size: 0.875rem; color: #78716C; }

.note-wrap { margin-top: 8px; }

.sheet-foot { padding: 20px 20px 12px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RecordSheet.vue
git commit -m "feat: add RecordSheet bottom popup with time picker, auto OT calc, cross-day confirm"
```

---

## Task 13: Records Page

**Files:**
- Create: `src/pages/RecordsPage.vue`

- [ ] **Step 1: Create `src/pages/RecordsPage.vue`**

```vue
<template>
  <div class="page">
    <!-- Sticky header -->
    <div class="records-header">
      <span class="header-title">记录</span>
      <button class="add-today-btn" @click="openToday" title="快速录入今日">
        <van-icon name="plus" size="20" />
      </button>
    </div>

    <!-- Calendar -->
    <CalendarView
      :records="recordsPlain"
      :period-start="settingsStore.currentPeriod.start"
      :period-end="settingsStore.currentPeriod.end"
      @select="openSheet"
    />

    <!-- Legend -->
    <div class="legend">
      <span class="legend-item"><span class="dot dot-ot" />有加班</span>
      <span class="legend-item"><span class="dot dot-normal" />已记录</span>
    </div>

    <!-- Record sheet -->
    <RecordSheet
      v-model="sheetVisible"
      :date="selectedDate"
      @saved="onSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted }  from 'vue'
import CalendarView  from '@/components/CalendarView.vue'
import RecordSheet   from '@/components/RecordSheet.vue'
import { useRecordsStore }  from '@/stores/records'
import { useSettingsStore } from '@/stores/settings'
import { formatDate }       from '@/utils/dateUtils'

const recordsStore  = useRecordsStore()
const settingsStore = useSettingsStore()

const sheetVisible = ref(false)
const selectedDate = ref('')

// Convert Map to plain object for CalendarView prop (template reactivity)
const recordsPlain = computed(() => {
  const obj = {}
  for (const [k, v] of recordsStore.records) obj[k] = v
  return obj
})

function openSheet(date) {
  selectedDate.value = date
  sheetVisible.value = true
}

function openToday() {
  openSheet(formatDate(new Date()))
}

function onSaved() {
  // Records store already updated (optimistic). No extra action needed.
}

onMounted(async () => {
  // Ensure current-period records are loaded
  const { start, end } = settingsStore.currentPeriod
  await recordsStore.fetchByRange(start, end)
})
</script>

<style scoped>
.records-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #F8F7F4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 8px;
  border-bottom: 1px solid #F0EDE8;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 800;
  color: #1C1917;
}

.add-today-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #18181B;
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.add-today-btn:active { opacity: 0.8; }

.legend {
  display: flex;
  gap: 16px;
  padding: 8px 20px 16px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: #78716C;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.dot-ot     { background: #16A34A; }
.dot-normal { background: #D4D0C8; }
</style>
```

- [ ] **Step 2: Verify records page in browser**

Navigate to `/records`. Expected: month calendar with today highlighted, `+` button in top-right, tapping a date opens the bottom sheet form.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RecordsPage.vue
git commit -m "feat: add records page with CalendarView and RecordSheet integration"
```

---

## Task 14: StatCard + BarChart Components

**Files:**
- Create: `src/components/StatCard.vue`
- Create: `src/components/BarChart.vue`

- [ ] **Step 1: Create `src/components/StatCard.vue`**

```vue
<template>
  <div class="stat-card">
    <span class="stat-label">{{ label }}</span>
    <div class="stat-value-row">
      <span class="stat-value">{{ value }}</span>
      <span v-if="unit" class="stat-unit">{{ unit }}</span>
    </div>
    <p v-if="sub" class="stat-sub">{{ sub }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit:  { type: String, default: '' },
  sub:   { type: String, default: '' },
})
</script>

<style scoped>
.stat-card {
  flex: 1;
  min-width: 0;
}
.stat-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  display: block;
  margin-bottom: 4px;
}
.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.stat-value {
  font-size: 1.375rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.stat-unit {
  font-size: 0.75rem;
  color: #D97706;
  font-weight: 600;
}
.stat-sub {
  font-size: 0.6875rem;
  color: rgba(255,255,255,0.35);
  margin: 4px 0 0;
}
</style>
```

- [ ] **Step 2: Create `src/components/BarChart.vue`**

```vue
<template>
  <div class="bar-chart">
    <div class="chart-title">本期每日加班</div>

    <div v-if="chartData.length === 0" class="chart-empty">暂无数据</div>

    <div v-else class="chart-wrap">
      <!-- SVG bars -->
      <svg
        :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
        class="chart-svg"
        preserveAspectRatio="none"
      >
        <!-- Zero baseline -->
        <line
          :x1="0" :y1="SVG_H - BOTTOM_PAD"
          :x2="SVG_W" :y2="SVG_H - BOTTOM_PAD"
          stroke="#F0EDE8" stroke-width="1"
        />
        <!-- Bars -->
        <rect
          v-for="(bar, i) in chartData"
          :key="bar.date"
          :x="i * slotW + BAR_GAP"
          :y="SVG_H - BOTTOM_PAD - bar.h"
          :width="barW"
          :height="bar.h || 2"
          :fill="bar.ot_hours > 0 ? '#D97706' : '#E8E5DF'"
          rx="2"
        />
      </svg>

      <!-- X-axis date labels (sampled ~5 evenly) -->
      <div class="x-labels">
        <span
          v-for="label in xLabels"
          :key="label"
          class="x-label"
        >{{ label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const SVG_W      = 320
const SVG_H      = 110
const BOTTOM_PAD = 18
const BAR_GAP    = 1

const props = defineProps({
  records:   { type: Array,  default: () => [] },   // [{ date, ot_hours }]
  start:     { type: String, required: true },
  end:       { type: String, required: true },
})

/** Expand all dates in [start, end] range, filling gaps with null. */
const allDates = computed(() => {
  if (!props.start || !props.end) return []
  const result = []
  const cur    = new Date(props.start)
  const endD   = new Date(props.end)
  while (cur <= endD) {
    const dateStr = cur.toISOString().slice(0, 10)
    const rec     = props.records.find(r => r.date === dateStr)
    result.push({ date: dateStr, ot_hours: rec ? Number(rec.ot_hours) : null })
    cur.setDate(cur.getDate() + 1)
  }
  return result
})

const slotW = computed(() =>
  allDates.value.length > 0 ? SVG_W / allDates.value.length : 0
)
const barW = computed(() => Math.max(1, slotW.value - BAR_GAP * 2))

const maxOT = computed(() =>
  Math.max(...allDates.value.map(d => d.ot_hours ?? 0), 1)
)

const chartHeight = SVG_H - BOTTOM_PAD - 6

const chartData = computed(() =>
  allDates.value.map(item => ({
    ...item,
    h: item.ot_hours
      ? Math.max(3, (item.ot_hours / maxOT.value) * chartHeight)
      : 0,
  }))
)

/** Pick ~5 evenly-spaced date labels for X axis. */
const xLabels = computed(() => {
  const n = allDates.value.length
  if (n === 0) return []
  const step    = Math.max(1, Math.floor(n / 4))
  const indices = new Set([0])
  for (let i = step; i < n - 1; i += step) indices.add(i)
  indices.add(n - 1)
  return [...indices].map(i => {
    const d = new Date(allDates.value[i].date)
    return `${d.getMonth() + 1}/${d.getDate()}`
  })
})
</script>

<style scoped>
.bar-chart { }

.chart-title {
  font-size: 0.875rem;
  color: #78716C;
  font-weight: 500;
  margin-bottom: 14px;
}

.chart-empty {
  text-align: center;
  color: #D4D0C8;
  font-size: 0.875rem;
  padding: 28px 0;
}

.chart-wrap { position: relative; }

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}

.x-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.6875rem;
  color: #78716C;
  margin-top: 4px;
}

.x-label { flex-shrink: 0; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StatCard.vue src/components/BarChart.vue
git commit -m "feat: add StatCard and SVG BarChart components"
```

---

## Task 15: Dashboard Page

**Files:**
- Create: `src/pages/DashboardPage.vue`

- [ ] **Step 1: Create `src/pages/DashboardPage.vue`**

```vue
<template>
  <div class="dashboard">

    <!-- ── Hero ── -->
    <div class="hero">
      <div class="hero-top">
        <span class="period-label">{{ settingsStore.currentPeriodLabel }}</span>
        <van-icon name="setting-o" color="rgba(255,255,255,0.4)" size="20" @click="$router.push('/settings')" />
      </div>

      <div class="hero-main">
        <span class="ot-big">{{ recordsStore.totalOTHours }}</span>
        <span class="ot-unit">h</span>
      </div>
      <p class="hero-sub">当期加班总时长</p>

      <div class="hero-stats">
        <StatCard
          label="已记录"
          :value="recordsStore.recordedDays"
          unit="天"
        />
        <div class="hero-divider" />
        <StatCard
          label="日均加班"
          :value="recordsStore.avgOTHours"
          unit="h"
        />
        <div class="hero-divider" />
        <StatCard
          label="最长单日"
          :value="recordsStore.maxOTDay ? recordsStore.maxOTDay.ot_hours : '--'"
          unit="h"
          :sub="recordsStore.maxOTDay ? formatShortDate(recordsStore.maxOTDay.date) : ''"
        />
      </div>
    </div>

    <!-- ── Cards ── -->
    <div class="content">

      <!-- Progress card -->
      <div class="card">
        <div class="progress-head">
          <span class="card-title">周期进度</span>
          <span class="progress-pct">{{ recordsStore.periodProgress }}%</span>
        </div>
        <van-progress
          :percentage="recordsStore.periodProgress"
          stroke-width="5"
          :show-pivot="false"
          color="#D97706"
          track-color="#F0EDE8"
        />
        <div class="progress-dates">
          <span>{{ formatShortDate(settingsStore.currentPeriod.start) }}</span>
          <span>{{ formatShortDate(settingsStore.currentPeriod.end) }}</span>
        </div>
      </div>

      <!-- Bar chart card -->
      <div class="card">
        <BarChart
          :records="recordsStore.currentPeriodRecords"
          :start="settingsStore.currentPeriod.start"
          :end="settingsStore.currentPeriod.end"
        />
      </div>

      <!-- History periods -->
      <div class="card">
        <div class="card-title" style="margin-bottom:12px">历史周期</div>

        <van-empty v-if="historyPeriods.length === 0" description="暂无历史数据" image-size="80" />

        <div
          v-for="period in historyPeriods"
          :key="period.key"
          class="history-item"
        >
          <div class="history-row" @click="togglePeriod(period)">
            <span class="history-label">{{ period.label }}</span>
            <div class="history-right">
              <span class="history-ot">{{ period.totalOT }}h</span>
              <van-icon
                :name="period.expanded ? 'arrow-up' : 'arrow-down'"
                size="13"
                color="#78716C"
              />
            </div>
          </div>

          <div v-if="period.expanded" class="history-detail">
            <div v-if="period.loading" class="detail-loading">
              <van-loading size="18" />
            </div>
            <div v-else-if="period.records.length === 0" class="detail-empty">
              该周期暂无记录
            </div>
            <div
              v-else
              v-for="rec in period.records"
              :key="rec.date"
              class="detail-row"
            >
              <span class="detail-date">{{ formatShortDate(rec.date) }}</span>
              <span class="detail-ot">{{ rec.ot_hours }}h</span>
            </div>
          </div>

          <div class="history-sep" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import StatCard from '@/components/StatCard.vue'
import BarChart from '@/components/BarChart.vue'
import { useRecordsStore }  from '@/stores/records'
import { useSettingsStore } from '@/stores/settings'
import { fetchRecords }     from '@/api/records'
import {
  getPeriodRange,
  formatDate,
  formatPeriodLabel,
  formatShortDate,
} from '@/utils/dateUtils'

const recordsStore  = useRecordsStore()
const settingsStore = useSettingsStore()

// ── History periods — reactive array (not computed) so mutations persist ───
// Each item: { key, label, start, end, totalOT, expanded, loading, records[] }
const historyPeriods = ref([])

function buildHistoryPeriods() {
  const { periodStartDay: sd, periodEndDay: ed } = settingsStore
  const today   = new Date()
  const todayStr = formatDate(today)
  const result  = []

  for (let offset = 1; offset <= 6; offset++) {
    let m = today.getMonth() + 1 - offset
    let y = today.getFullYear()
    while (m <= 0) { m += 12; y-- }

    const { start, end } = getPeriodRange(y, m, sd, ed)
    if (start > todayStr) continue   // skip future periods

    // Sum OT from already-loaded records
    let totalOT = 0
    for (const [dateStr, rec] of recordsStore.records) {
      if (dateStr >= start && dateStr <= end) totalOT += Number(rec.ot_hours)
    }

    result.push({
      key:      start,
      label:    formatPeriodLabel(start, end),
      start,
      end,
      totalOT:  totalOT.toFixed(1),
      expanded: false,
      loading:  false,
      records:  [],
    })
  }
  historyPeriods.value = result
}

// ── Toggle history period expand/collapse ──────────────────────────────────
async function togglePeriod(period) {
  period.expanded = !period.expanded
  if (period.expanded && period.records.length === 0) {
    period.loading = true
    try {
      period.records = await fetchRecords(period.start, period.end)
    } finally {
      period.loading = false
    }
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
onMounted(async () => {
  const { start, end } = settingsStore.currentPeriod
  await recordsStore.fetchByRange(start, end)

  // Load previous 3 months so history OT totals show immediately (no expand needed)
  const wideStart = new Date(start)
  wideStart.setMonth(wideStart.getMonth() - 3)
  await recordsStore.fetchByRange(formatDate(wideStart), end)

  buildHistoryPeriods()
})
</script>

<style scoped>
.dashboard { background: #F8F7F4; padding-bottom: 60px; }

/* Hero */
.hero {
  background: #18181B;
  padding: 52px 24px 28px;
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.period-label {
  font-size: 0.8125rem;
  color: rgba(255,255,255,0.45);
  font-weight: 500;
}

.hero-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.ot-big {
  font-size: 3.5rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  letter-spacing: -2px;
}

.ot-unit {
  font-size: 1.5rem;
  font-weight: 700;
  color: #D97706;
}

.hero-sub {
  font-size: 0.8125rem;
  color: rgba(255,255,255,0.35);
  margin: 0 0 24px;
}

.hero-stats {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.hero-divider {
  width: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0 16px;
  flex-shrink: 0;
}

/* Content */
.content { padding-top: 16px; }

/* Progress */
.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.progress-pct {
  font-size: 0.875rem;
  font-weight: 700;
  color: #D97706;
}
.progress-dates {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #78716C;
  margin-top: 6px;
}

/* History */
.history-item { }

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
}

.history-label { font-size: 0.9375rem; color: #1C1917; font-weight: 500; }
.history-right { display: flex; align-items: center; gap: 8px; }
.history-ot    { font-size: 0.875rem; color: #D97706; font-weight: 600; }

.history-sep { height: 1px; background: #F0EDE8; }
.history-item:last-child .history-sep { display: none; }

.history-detail { padding-bottom: 8px; }
.detail-loading {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}
.detail-empty {
  font-size: 0.8125rem;
  color: #D4D0C8;
  padding: 8px 0 12px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 0.875rem;
}
.detail-date { color: #78716C; }
.detail-ot   { color: #1C1917; font-weight: 500; }
</style>
```

- [ ] **Step 2: Verify dashboard in browser**

Navigate to `/dashboard`. Expected: dark hero with large OT number, 3 mini-stats, progress card, bar chart, history list.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DashboardPage.vue
git commit -m "feat: add dashboard page (hero, progress, bar chart, history periods)"
```

---

## Task 16: PWA Manifest + Final Polish

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "工时记录",
  "short_name": "工时",
  "description": "个人加班时长记录工具",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#F8F7F4",
  "theme_color": "#18181B",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Generate placeholder PWA icons**

Run this one-liner to create minimal valid PNG placeholders (requires no tools, uses a 1×1 transparent PNG base64):

```bash
mkdir -p public/icons
# Create a simple SVG icon and copy as placeholder
cat > /tmp/icon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#18181B"/>
  <text x="96" y="130" font-size="96" text-anchor="middle" fill="#D97706">⏱</text>
</svg>
EOF
```

If a graphics tool is unavailable, add a note in `public/icons/README.txt`:
```
Place icon-192.png and icon-512.png here.
Use any design tool to create 192×192 and 512×512 PNG icons.
Background: #18181B, symbol: ⏱ in #D97706.
```

- [ ] **Step 3: Final build verification**

```bash
npm run build
```

Expected: `dist/` folder created, no errors. Check `dist/index.html` exists.

- [ ] **Step 4: Run all tests one final time**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Final commit**

```bash
git add public/manifest.json public/icons/
git commit -m "feat: add PWA manifest and icons"
```

- [ ] **Step 6: Tag initial release**

```bash
git tag -a v0.1.0 -m "Initial release: overtime tracker MVP"
```

---

## Supabase Setup Checklist (Manual Steps)

Before going live, execute the following SQL in your Supabase project's **SQL Editor**:

```sql
-- 1. Profiles table
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nickname    text,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "user_own_profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Records table
create table public.records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  start_time  time,
  end_time    time,
  ot_hours    numeric(4,1) not null default 0,
  note        text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, date)
);

alter table public.records enable row level security;
create policy "user_own_records"
  on public.records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_records_user_date on public.records(user_id, date desc);

-- 3. Settings table
create table public.settings (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  std_hours        numeric(3,1) not null default 8,
  period_start_day smallint not null default 25,
  period_end_day   smallint not null default 24,
  updated_at       timestamptz default now()
);

alter table public.settings enable row level security;
create policy "user_own_settings"
  on public.settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Also in Supabase Dashboard → **Authentication → Providers**: ensure **Email** provider is enabled.
