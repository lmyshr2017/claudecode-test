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
