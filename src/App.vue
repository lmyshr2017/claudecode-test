<template>
  <RouterView />
  <van-tabbar
    v-if="showTabBar"
    v-model="active"
    active-color="#D97706"
    inactive-color="#78716C"
    safe-area-inset-bottom
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
