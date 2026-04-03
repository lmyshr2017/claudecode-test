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
            <template v-else>
              <div
                v-for="rec in period.records"
                :key="rec.date"
                class="detail-row"
              >
                <span class="detail-date">{{ formatShortDate(rec.date) }}</span>
                <span class="detail-ot">{{ rec.ot_hours }}h</span>
              </div>
            </template>
          </div>

          <div class="history-sep" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast }      from 'vant'
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
const historyPeriods = ref([])

function buildHistoryPeriods() {
  const { periodStartDay: sd, periodEndDay: ed } = settingsStore
  const today    = new Date()
  const todayStr = formatDate(today)
  const result   = []

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

async function togglePeriod(period) {
  period.expanded = !period.expanded
  if (period.expanded && period.records.length === 0) {
    period.loading = true
    try {
      period.records = await fetchRecords(period.start, period.end)
    } catch {
      showToast({ message: '加载失败', type: 'fail' })
    } finally {
      period.loading = false
    }
  }
}

onMounted(async () => {
  try {
    const { start, end } = settingsStore.currentPeriod
    await recordsStore.fetchByRange(start, end)

    // Load previous 3 months so history OT totals show immediately
    const [sy, sm, sd] = start.split('-').map(Number)
    const wideStart = new Date(sy, sm - 1, sd)
    wideStart.setMonth(wideStart.getMonth() - 3)
    await recordsStore.fetchByRange(formatDate(wideStart), end)

    buildHistoryPeriods()
  } catch {
    showToast({ message: '加载数据失败，请检查网络', type: 'fail' })
  }
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
