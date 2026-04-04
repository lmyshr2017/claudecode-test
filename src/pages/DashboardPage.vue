<template>
  <div class="dashboard animate-fade-in">

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
          :sub="recordsStore.maxOTDay ? formatShortDate(recordsStore.maxOTDay.date) : '--/--'"
        />
      </div>
    </div>

    <!-- ── Cards ── -->
    <div class="content">

      <!-- Progress card -->
      <div class="card">
        <div class="progress-head">
          <span class="card-title"><van-icon name="flag-o" /> 周期进度</span>
          <span class="progress-pct">{{ recordsStore.periodProgress }}%</span>
        </div>
        <div class="progress-track-wrap">
          <van-progress
            :percentage="recordsStore.periodProgress"
            stroke-width="8"
            :show-pivot="false"
            color="linear-gradient(to right, #60A5FA, #2563EB)"
            track-color="rgba(15, 23, 42, 0.05)"
          />
        </div>
        <div class="progress-dates">
          <span>{{ formatShortDate(settingsStore.currentPeriod.start) }}</span>
          <span>{{ formatShortDate(settingsStore.currentPeriod.end) }}</span>
        </div>
      </div>

      <!-- Bar chart card -->
      <div class="card">
        <div class="card-title" style="margin-bottom:12px"><van-icon name="bar-chart-o" /> 日常出勤趋势</div>
        <BarChart
          :records="recordsStore.currentPeriodRecords"
          :start="settingsStore.currentPeriod.start"
          :end="settingsStore.currentPeriod.end"
        />
      </div>

      <!-- History periods -->
      <div class="card history-card">
        <div class="card-title" style="margin-bottom:16px"><van-icon name="clock-o" /> 历史周期</div>

        <van-empty v-if="historyPeriods.length === 0" description="暂无历史数据" image-size="80" />

        <div
          v-for="period in historyPeriods"
          :key="period.key"
          class="history-item-pill"
        >
          <div class="history-row" @click="togglePeriod(period)">
            <span class="history-label">{{ period.label }}</span>
            <div class="history-right">
              <span class="history-ot">{{ period.totalOT }}<span style="font-size:0.75rem; color:var(--theme-text-sub); margin-left:2px; font-weight:500;">h</span></span>
              <div class="history-icon-box">
                <van-icon
                  :name="period.expanded ? 'arrow-up' : 'arrow-down'"
                  size="14"
                  color="#3B82F6"
                />
              </div>
            </div>
          </div>

          <div v-if="period.expanded" class="history-detail-pill">
            <div v-if="period.loading" class="detail-loading">
              <van-loading size="18" color="#3B82F6" />
            </div>
            <div v-else-if="period.records.length === 0" class="detail-empty">
              该周期未录入任何数据
            </div>
            <template v-else>
              <div
                v-for="rec in period.records"
                :key="rec.date"
                class="detail-row-pill"
              >
                <span class="detail-date">{{ formatShortDate(rec.date) }}</span>
                <span class="detail-ot">{{ rec.ot_hours }}h</span>
              </div>
            </template>
          </div>
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
    
    // Build period skeleton immediately to prevent height jump/flash
    buildHistoryPeriods()

    await recordsStore.fetchByRange(start, end)

    // Load previous 3 months so history OT totals show immediately
    const [sy, sm, sd] = start.split('-').map(Number)
    const wideStart = new Date(sy, sm - 1, sd)
    wideStart.setMonth(wideStart.getMonth() - 3)
    await recordsStore.fetchByRange(formatDate(wideStart), end)

    // Re-build with actual data
    buildHistoryPeriods()
  } catch {
    showToast({ message: '加载数据失败，请检查网络', type: 'fail' })
  }
})
</script>

<style scoped>
.dashboard { padding-bottom: 110px; }

/* Hero */
.hero {
  position: relative;
  background: radial-gradient(circle at 0% 0%, #60A5FA 0%, transparent 60%),
              radial-gradient(circle at 100% 100%, #1E40AF 0%, transparent 70%),
              linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
  padding: 52px 24px 36px;
  border-bottom-left-radius: 36px;
  border-bottom-right-radius: 36px;
  box-shadow: 0 16px 40px -10px rgba(37, 99, 235, 0.4), inset 0 -1px 0 rgba(255, 255, 255, 0.2);
  margin-bottom: 24px;
  overflow: hidden;
}

.hero::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  opacity: 0.04;
  pointer-events: none;
}

.hero-top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.period-label {
  font-size: 0.8125rem;
  color: rgba(255,255,255,0.85);
  font-weight: 600;
  background: rgba(255,255,255,0.12);
  padding: 6px 14px;
  border-radius: 16px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.hero-main {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
  animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

.ot-big {
  font-size: 4.5rem;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  letter-spacing: -2px;
  text-shadow: 0 8px 24px rgba(37, 99, 235, 0.6);
}

.ot-unit {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
}

.hero-sub {
  position: relative;
  z-index: 1;
  font-size: 0.875rem;
  color: rgba(255,255,255,0.7);
  font-weight: 500;
  margin: 0 0 28px;
}

.hero-stats {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  gap: 0;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 18px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.hero-divider {
  width: 1px;
  background: rgba(255,255,255,0.2);
  margin: 0 16px;
  flex-shrink: 0;
}

/* Content */
.content { padding-top: 4px; }

/* Progress */
.progress-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.progress-track-wrap {
  filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.3));
  margin-bottom: 2px;
}

.progress-pct {
  font-size: 1.125rem;
  font-weight: 800;
  background: linear-gradient(135deg, #60A5FA, #2563EB);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.progress-dates {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--theme-text-sub);
  margin-top: 10px;
  font-weight: 500;
}

/* History */
.history-card { padding: 20px 16px 8px; }

.history-item-pill {
  background: rgba(15, 23, 42, 0.02);
  border: 1px solid rgba(15, 23, 42, 0.04);
  border-radius: 16px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.history-item-pill:active { background: rgba(15, 23, 42, 0.04); transform: scale(0.98); }

.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: pointer;
}

.history-label { font-size: 0.9375rem; color: var(--theme-text-main); font-weight: 700; }
.history-right { display: flex; align-items: center; gap: 12px; }
.history-ot    { font-size: 1.125rem; color: #2563EB; font-weight: 800; display: flex; align-items: baseline; }

.history-icon-box {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-detail-pill {
  padding: 0 12px 12px;
}
.detail-loading {
  padding: 12px 0;
  display: flex;
  justify-content: center;
}
.detail-empty {
  font-size: 0.8125rem;
  color: var(--theme-text-sub);
  padding: 8px 0 12px;
  text-align: center;
}
.detail-row-pill {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  font-size: 0.875rem;
  background: #FFF;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
  border: 1px solid rgba(15, 23, 42, 0.02);
  border-radius: 12px;
  margin-bottom: 6px;
}
.detail-row-pill:last-child { margin-bottom: 0; }
.detail-date { color: var(--theme-text-sub); font-weight: 500; }
.detail-ot   { color: var(--theme-text-main); font-weight: 700; }
</style>
