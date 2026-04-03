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
