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
