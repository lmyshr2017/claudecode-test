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
