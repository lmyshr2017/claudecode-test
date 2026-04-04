<template>
  <div class="page animate-fade-in">
    <!-- Sticky header -->
    <div class="records-header">
      <span class="header-title">记录</span>
      <button class="add-today-btn" @click="openToday" title="快速录入今日">
        <van-icon name="plus" size="20" />
      </button>
    </div>

    <div class="content">
      <div class="card calendar-card">
        <!-- Calendar -->
        <CalendarView
          :records="recordsPlain"
          :period-start="settingsStore.currentPeriod.start"
          :period-end="settingsStore.currentPeriod.end"
          @select="openSheet"
        />

        <!-- Legend -->
        <div class="legend">
          <span class="legend-item"><span class="legend-bg legend-bg-ot" />有加班</span>
          <span class="legend-item"><span class="legend-bg legend-bg-normal" />其他记录</span>
        </div>
      </div>
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
import { showToast }                from 'vant'
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
  try {
    await recordsStore.fetchByRange(start, end)
  } catch {
    showToast({ message: '加载记录失败，请重试', type: 'fail' })
  }
})
</script>

<style scoped>
.records-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--theme-glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--theme-glass-border);
}

.header-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--theme-text-main);
  letter-spacing: -0.5px;
}

.add-today-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3B82F6, #2563EB);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  animation: pulse 2s infinite;
  transition: transform 0.2s;
}

.add-today-btn:active { 
  transform: scale(0.9);
  animation: none;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
}

.content {
  padding-top: 16px;
}

.calendar-card {
  padding: 16px 12px 12px;
}

.legend {
  display: flex;
  gap: 20px;
  justify-content: center;
  padding: 16px 0 4px;
  border-top: 1px solid rgba(15, 23, 42, 0.04);
  margin-top: 8px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8125rem;
  color: var(--theme-text-sub);
  font-weight: 500;
}
.legend-bg {
  width: 14px;
  height: 14px;
  border-radius: 6px;
  box-shadow: inset 0 2px 4px rgba(255,255,255,0.6);
}
.legend-bg-ot { 
  background: rgba(37, 99, 235, 0.08); 
  border: 1px solid rgba(37, 99, 235, 0.2);
}
.legend-bg-normal { 
  background: transparent; 
  border: 1px dashed rgba(15, 23, 42, 0.2); 
}
</style>
