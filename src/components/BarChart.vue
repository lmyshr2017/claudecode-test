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
          stroke="rgba(15, 23, 42, 0.1)" stroke-width="1"
        />
        <!-- Bars -->
        <rect
          v-for="(bar, i) in chartData"
          :key="bar.date"
          :x="i * slotW + BAR_GAP"
          :y="SVG_H - BOTTOM_PAD - bar.h"
          :width="barW"
          :height="bar.h || 2"
          :fill="bar.ot_hours > 0 ? '#2563EB' : 'rgba(37, 99, 235, 0.1)'"
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
  const [sy, sm, sd] = props.start.split('-').map(Number)
  const cur    = new Date(sy, sm - 1, sd)
  const [ey, em, ed] = props.end.split('-').map(Number)
  const endD   = new Date(ey, em - 1, ed)
  while (cur <= endD) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth() + 1).padStart(2, '0')
    const d = String(cur.getDate()).padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
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
    const d = allDates.value[i].date
    const [, m, day] = d.split('-').map(Number)
    return `${m}/${day}`
  })
})
</script>

<style scoped>
.bar-chart { }

.chart-title {
  font-size: 0.875rem;
  color: var(--theme-text-sub);
  font-weight: 600;
  margin-bottom: 14px;
}

.chart-empty {
  text-align: center;
  color: var(--theme-text-sub);
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
  color: var(--theme-text-sub);
  margin-top: 4px;
}

.x-label { flex-shrink: 0; }
</style>
