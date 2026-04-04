<template>
  <div class="stat-card">
    <span class="stat-label">{{ label }}</span>
    <div class="stat-value-row">
      <span class="stat-value">{{ value }}</span>
      <span v-if="unit" class="stat-unit">{{ unit }}</span>
    </div>
    <p v-if="sub" class="stat-sub">{{ sub }}</p>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit:  { type: String, default: '' },
  sub:   { type: String, default: '' },
})
</script>

<style scoped>
.stat-card {
  flex: 1;
  min-width: 0;
}
.stat-label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  display: block;
  margin-bottom: 4px;
}
.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.stat-value {
  font-size: 1.375rem;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}
.stat-unit {
  font-size: 0.75rem;
  color: #93C5FD;
  font-weight: 600;
}
.stat-sub {
  font-size: 0.6875rem;
  color: rgba(255,255,255,0.35);
  margin: 4px 0 0;
}
</style>
