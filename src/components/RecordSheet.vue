<template>
  <van-popup
    v-model:show="visible"
    position="bottom"
    round
    safe-area-inset-bottom
    teleport="body"
    class="glass-popup"
    :style="{ maxHeight: '90vh' }"
  >
    <div class="sheet">
      <!-- Handle -->
      <div class="sheet-handle" />

      <!-- Header -->
      <div class="sheet-head">
        <span class="sheet-title">{{ dateLabel }}</span>
        <button v-if="existing" class="del-btn" @click="handleDelete">删除</button>
      </div>

      <!-- Body -->
      <div class="sheet-body">
        <div class="glass-group">
          <!-- Start time -->
          <div class="field-row" @click="openPicker('start')">
            <span class="field-label">上班时间</span>
            <span class="field-val" :class="{ empty: !form.start_time }">
              {{ form.start_time || '未填写' }}
            </span>
          </div>

          <!-- End time -->
          <div class="field-row" @click="openPicker('end')">
            <span class="field-label">下班时间</span>
            <span class="field-val" :class="{ empty: !form.end_time }">
              {{ form.end_time || '未填写' }}
            </span>
          </div>

          <!-- OT hours -->
          <div class="field-row border-none">
            <span class="field-label">加班时长</span>
            <div class="stepper-wrap">
              <van-stepper
                v-model="form.ot_hours"
                :step="0.5"
                :min="0"
                :max="24"
                :decimal-length="1"
                button-size="28"
              />
              <span class="unit">h</span>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div class="note-wrap glass-group">
          <van-field
            v-model="form.note"
            placeholder="加班原因、项目名等（选填）"
            type="textarea"
            :maxlength="100"
            show-word-limit
            :border="false"
            rows="2"
            autosize
            class="glass-field"
          />
        </div>
      </div>

      <!-- Save button -->
      <div class="sheet-foot">
        <van-button
          round block type="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存记录
        </van-button>
      </div>
    </div>

    <!-- Time Picker nested popup -->
    <van-popup
      v-model:show="pickerVisible"
      position="bottom"
      safe-area-inset-bottom
      teleport="body"
    >
      <van-time-picker
        v-model="pickerValue"
        :title="pickerTarget === 'start' ? '选择上班时间' : '选择下班时间'"
        :columns-type="['hour', 'minute']"
        @confirm="onPickerConfirm"
        @cancel="pickerVisible = false"
      />
    </van-popup>
  </van-popup>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { calcOTHours, isCrossDay }      from '@/utils/calcOT'
import { formatDateLabel }              from '@/utils/dateUtils'
import { useRecordsStore }              from '@/stores/records'
import { useSettingsStore }             from '@/stores/settings'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  date:       { type: String,  default: '' },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const recordsStore  = useRecordsStore()
const settingsStore = useSettingsStore()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const saving = ref(false)
const form   = reactive({ start_time: '', end_time: '', ot_hours: 0, note: '' })

const existing  = computed(() => recordsStore.records.get(props.date) ?? null)
const dateLabel = computed(() => props.date ? formatDateLabel(props.date) : '')

watch(
  [() => props.date, () => props.modelValue],
  ([date, show]) => {
    if (!show || !date) return
    const rec = recordsStore.records.get(date)
    form.start_time = rec?.start_time ?? ''
    form.end_time   = rec?.end_time   ?? ''
    form.ot_hours   = rec ? Number(rec.ot_hours) : 0
    form.note       = rec?.note ?? ''
  },
  { immediate: true }
)

const autoCalcLock = ref(false)
watch(
  [() => form.start_time, () => form.end_time],
  async ([start, end]) => {
    if (!start || !end || autoCalcLock.value) return

    if (isCrossDay(start, end)) {
      try {
        await showConfirmDialog({
          title: '跨天班次',
          message: `下班时间（${end}）早于上班时间（${start}），是否按跨天处理？`,
          confirmButtonText: '跨天处理',
          cancelButtonText: '重新填写',
        })
        form.ot_hours = calcOTHours(start, end, settingsStore.stdHours)
      } catch {
        autoCalcLock.value = true
        form.end_time      = ''
        await nextTick()
        autoCalcLock.value = false
      }
    } else {
      form.ot_hours = calcOTHours(start, end, settingsStore.stdHours)
    }
  }
)

const pickerVisible = ref(false)
const pickerTarget  = ref('start')
const pickerValue   = ref(['09', '00'])

function openPicker(target) {
  pickerTarget.value = target
  const cur = target === 'start' ? form.start_time : form.end_time
  pickerValue.value  = cur ? cur.split(':') : (target === 'start' ? ['09', '00'] : ['18', '00'])
  pickerVisible.value = true
}

function onPickerConfirm({ selectedValues }) {
  if (!selectedValues?.length) return
  const val = selectedValues.map(String).join(':')
  if (pickerTarget.value === 'start') form.start_time = val
  else                                form.end_time   = val
  pickerVisible.value = false
}

async function handleSave() {
  saving.value = true
  try {
    await recordsStore.upsert({
      date:       props.date,
      start_time: form.start_time || null,
      end_time:   form.end_time   || null,
      ot_hours:   form.ot_hours,
      note:       form.note       || null,
    })
    showToast({ message: '已保存', type: 'success', duration: 1200 })
    visible.value = false
    emit('saved')
  } catch (err) {
    showToast({ message: err.message || '保存失败', type: 'fail' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  try {
    await showConfirmDialog({
      title: '删除记录',
      message: `确定删除 ${dateLabel.value} 的记录？`,
      confirmButtonText: '删除',
      confirmButtonColor: '#DC2626',
      cancelButtonText: '取消',
    })
    await recordsStore.remove(props.date)
    showToast({ message: '已删除', type: 'success', duration: 1200 })
    visible.value = false
    emit('saved')
  } catch {
    // User cancelled
  }
}
</script>

<style scoped>
:deep(.glass-popup) {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(34px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(34px) saturate(200%) !important;
  border-top-left-radius: 36px !important;
  border-top-right-radius: 36px !important;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 1) !important;
}

.sheet { padding-bottom: 8px; }

.sheet-handle {
  width: 44px;
  height: 5px;
  background: rgba(15, 23, 42, 0.1);
  border-radius: 3px;
  margin: 12px auto;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.8);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px 16px;
}

.sheet-title {
  font-size: 1.125rem;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.3px;
}

.del-btn {
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: #DC2626;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 12px;
  transition: all 0.2s;
}
.del-btn:active { background: rgba(220, 38, 38, 0.2); transform: scale(0.95); }

.sheet-body { padding: 0 20px; }

.glass-group {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02), inset 0 2px 4px rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  padding: 0 20px;
  margin-bottom: 16px;
  overflow: hidden;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 0;
  border-bottom: 1px solid rgba(15, 23, 42, 0.04);
  cursor: pointer;
  transition: opacity 0.2s;
}
.field-row:active { opacity: 0.6; }
.field-row.border-none { border-bottom: none; }

.field-label {
  font-size: 0.9375rem;
  color: #1E293B;
  font-weight: 600;
}

.field-val       { font-size: 0.9375rem; color: #0F172A; font-weight: 500; }
.field-val.empty { color: #94A3B8; font-weight: 400; }

.stepper-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.unit { font-size: 0.875rem; color: #64748B; font-weight: 500; }

.note-wrap {
  padding: 12px 0;
}
:deep(.glass-field) {
  background: transparent !important;
  padding: 0 !important;
}
:deep(.van-field__control) {
  font-size: 0.9375rem !important;
  color: #0F172A !important;
}

.sheet-foot { padding: 8px 20px 24px; }
</style>
