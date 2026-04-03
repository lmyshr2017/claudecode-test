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
