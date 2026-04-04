<template>
  <RouterView />
  <van-tabbar
    v-if="showTabBar"
    v-model="active"
    active-color="#2563EB"
    inactive-color="#64748B"
    safe-area-inset-bottom
    class="floating-tabbar glass-card animate-fade-in"
  >
    <van-tabbar-item icon="chart-trending-o" to="/dashboard">总览</van-tabbar-item>
    <van-tabbar-item icon="calendar-o"       to="/records">记录</van-tabbar-item>
    <van-tabbar-item icon="setting-o"        to="/settings">设置</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route     = useRoute()
const authStore = useAuthStore()

const showTabBar = computed(() => route.path !== '/login' && !!authStore.user)

// Keep TabBar active index in sync with current route
const routeToTab = { '/dashboard': 0, '/records': 1, '/settings': 2 }
const active     = ref(0)
watch(() => route.path, (path) => {
  if (routeToTab[path] !== undefined) active.value = routeToTab[path]
}, { immediate: true })
</script>

<style scoped>
.floating-tabbar {
  position: fixed;
  bottom: 24px;
  left: 20px;
  width: calc(100% - 40px);
  max-width: 500px;
  margin: 0 auto;
  transform: none;
  border-radius: 36px;
  padding: 0;
  height: 68px;
  
  /* Force override Vant's default white background */
  background: rgba(255, 255, 255, 0.35) !important;
  backdrop-filter: blur(40px) saturate(200%) !important;
  -webkit-backdrop-filter: blur(40px) saturate(200%) !important;
  border: none !important;
  box-shadow: 
    inset 0 1px 1px rgba(255, 255, 255, 1),
    inset 0 2px 6px rgba(255, 255, 255, 0.5),
    0 8px 32px rgba(0, 0, 0, 0.08) !important;
}

:deep(.van-tabbar-item) {
  background: transparent;
  color: #94A3B8;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.van-tabbar-item__icon) {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

:deep(.van-tabbar-item--active) {
  background: transparent;
  color: #2563EB;
  font-weight: 800;
  position: relative;
}

:deep(.van-tabbar-item--active::before) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 52px;
  
  /* Liquid Bubble indicator */
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.05));
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 
    inset 0 2px 6px rgba(255, 255, 255, 0.8),
    0 4px 12px rgba(37, 99, 235, 0.15);
  border-radius: 26px; /* Echoes the container's 36px radius precisely */
  z-index: 0;
  animation: tabSelected 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.4);
}

@keyframes tabSelected {
  0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

:deep(.van-tabbar-item--active .van-tabbar-item__icon) {
  transform: scale(1.18) translateY(-2px);
  filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.4));
}
</style>
