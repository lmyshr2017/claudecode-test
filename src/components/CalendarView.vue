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
          'cell-today':     cell.dateStr === todayStr && cell.inPeriod,
          'cell-active':    cell.inPeriod && cell.inCurrentMonth,
          'cell-ot':        records[cell.dateStr] && Number(records[cell.dateStr].ot_hours) > 0,
          'cell-recorded':  records[cell.dateStr] && Number(records[cell.dateStr].ot_hours) === 0
        }"
        @click="onCellClick(cell)"
      >
        <span class="cell-num">{{ cell.date.getDate() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getCalendarDates, formatDate } from '@/utils/dateUtils'

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const props = defineProps({
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
.calendar { padding: 0 4px 8px; }

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 20px;
}

.month-label {
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--theme-text-main);
  letter-spacing: -0.3px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(15, 23, 42, 0.05);
  background: rgba(15, 23, 42, 0.02);
  color: var(--theme-text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.nav-btn:active { 
  background: rgba(15, 23, 42, 0.06); 
  transform: scale(0.9);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 0.8125rem;
  color: #94A3B8;
  font-weight: 600;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.04);
  margin-bottom: 12px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 0 4px;
}

.cal-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  border-radius: 12px;
  position: relative;
  cursor: default;
  user-select: none;
  background: transparent;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid transparent;
}

.cal-cell::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  border-radius: inherit;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.6);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.cell-active { cursor: pointer; }
.cell-active:active { transform: scale(0.85); opacity: 0.8; }

.cell-num {
  position: relative;
  z-index: 1;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--theme-text-main);
  line-height: 1;
}

.cell-other   .cell-num  { color: #CBD5E1; }
.cell-disabled .cell-num { color: #CBD5E1; }

/* ── Overtime Background Styling ── */
.cell-ot {
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.2);
}
.cell-ot::before { opacity: 1; }
.cell-ot .cell-num {
  color: #2563EB;
  font-weight: 800;
}

.cell-recorded {
  border: 1px dashed rgba(15, 23, 42, 0.15);
  background: rgba(248, 250, 252, 0.5);
}

/* ── Today Badge Styling ── */
.cell-today {
  background: linear-gradient(135deg, #60A5FA, #2563EB) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
}
.cell-today::before { opacity: 1; }
.cell-today .cell-num {
  color: #FFF !important;
  font-weight: 800;
}
</style>
