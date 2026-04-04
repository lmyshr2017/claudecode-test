<template>
  <div class="login-page animate-fade-in">
    <!-- Hero header -->
    <div class="login-header">
      <div class="login-logo">⏱</div>
      <h1 class="login-title">工时</h1>
      <p class="login-subtitle">记录每一分钟的付出</p>
    </div>

    <!-- Tab form -->
    <div class="login-body glass-card">
      <van-tabs v-model:active="activeTab" animated class="transparent-tabs">
        <!-- Login Tab -->
        <van-tab title="登录">
          <van-form @submit="handleLogin" class="tab-form">
            <van-cell-group inset>
              <van-field
                v-model="loginForm.email"
                name="email"
                label="邮箱"
                placeholder="your@email.com"
                type="email"
                autocomplete="email"
                :rules="[{ required: true, message: '请填写邮箱' }]"
              />
              <van-field
                v-model="loginForm.password"
                name="password"
                label="密码"
                placeholder="请输入密码"
                type="password"
                autocomplete="current-password"
                :rules="[{ required: true, message: '请填写密码' }]"
              />
            </van-cell-group>
            <div class="form-action">
              <van-button
                round block type="primary"
                native-type="submit"
                :loading="loading"
              >
                登录
              </van-button>
            </div>
          </van-form>
        </van-tab>

        <!-- Register Tab -->
        <van-tab title="注册">
          <van-form @submit="handleRegister" class="tab-form">
            <van-cell-group inset>
              <van-field
                v-model="registerForm.nickname"
                name="nickname"
                label="昵称"
                placeholder="你叫什么？"
                :rules="[{ required: true, message: '请填写昵称' }]"
              />
              <van-field
                v-model="registerForm.email"
                name="email"
                label="邮箱"
                placeholder="your@email.com"
                type="email"
                :rules="[{ required: true, message: '请填写邮箱' }]"
              />
              <van-field
                v-model="registerForm.password"
                name="password"
                label="密码"
                placeholder="不少于 6 位"
                type="password"
                :rules="[
                  { required: true, message: '请填写密码' },
                  { validator: v => v.length >= 6, message: '密码不少于 6 位' },
                ]"
              />
            </van-cell-group>
            <div class="form-action">
              <van-button
                round block type="primary"
                native-type="submit"
                :loading="loading"
              >
                注册
              </van-button>
            </div>
          </van-form>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter }     from 'vue-router'
import { showToast }     from 'vant'
import { useAuthStore }  from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useRecordsStore }  from '@/stores/records'

const router        = useRouter()
const authStore     = useAuthStore()
const settingsStore = useSettingsStore()
const recordsStore  = useRecordsStore()

const activeTab = ref(0)
const loading   = ref(false)

const loginForm    = reactive({ email: '', password: '' })
const registerForm = reactive({ nickname: '', email: '', password: '' })

async function handleLogin() {
  loading.value = true
  try {
    await authStore.login(loginForm.email, loginForm.password)
    // Load settings and current-period records after login
    await settingsStore.load()
    await recordsStore.fetchByRange(
      settingsStore.currentPeriod.start,
      settingsStore.currentPeriod.end
    )
    router.push('/dashboard')
  } catch (err) {
    showToast({ message: err.message || '登录失败，请检查邮箱和密码', type: 'fail' })
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  loading.value = true
  try {
    await authStore.register(
      registerForm.email,
      registerForm.password,
      registerForm.nickname
    )
    showToast({ message: '注册成功！请登录', type: 'success' })
    activeTab.value = 0
    loginForm.email    = registerForm.email
    loginForm.password = ''
  } catch (err) {
    showToast({ message: err.message || '注册失败', type: 'fail' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--theme-bg);
  display: flex;
  flex-direction: column;
}

.login-header {
  background: radial-gradient(circle at 10% 20%, #3B82F6, #1E3A8A 80%);
  padding: 80px 24px 80px;
  text-align: center;
  border-bottom-left-radius: 40px;
  border-bottom-right-radius: 40px;
  box-shadow: 0 10px 40px rgba(37, 99, 235, 0.4);
  margin-bottom: -40px;
  position: relative;
  z-index: 1;
  overflow: hidden;
}

.login-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
  opacity: 0.9;
  mix-blend-mode: overlay;
  pointer-events: none;
}

.login-logo {
  font-size: 3.5rem;
  margin-bottom: 16px;
  display: inline-block;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.2));
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}

.login-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.login-subtitle {
  font-size: 0.9375rem;
  color: rgba(255,255,255,0.8);
  margin: 0;
}

.login-body {
  flex: 1;
  margin: 0 20px 40px;
  position: relative;
  z-index: 2;
  padding: 24px 0 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 1), 0 12px 36px rgba(37, 99, 235, 0.08);
  border-radius: 32px;
}

.tab-form {
  padding-top: 16px;
}

.form-action {
  padding: 32px 24px 24px;
}

:deep(.van-tabs__nav) {
  background: transparent;
}

:deep(.van-tabs__line) {
  background: #2563EB !important;
}
:deep(.van-tab--active .van-tab__text) {
  color: #2563EB;
  font-weight: 700;
}

:deep(.van-cell-group--inset) {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02), inset 0 2px 4px rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  padding: 4px 0;
  margin: 0 24px;
}

:deep(.van-cell) {
  background: transparent;
  padding: 16px 20px;
}

:deep(.van-field__label) {
  color: #1E293B;
  font-weight: 600;
}
:deep(.van-field__control) {
  font-weight: 500;
  color: #0F172A;
}
</style>
