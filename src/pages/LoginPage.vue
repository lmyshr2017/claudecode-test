<template>
  <div class="login-page">
    <!-- Hero header -->
    <div class="login-header">
      <div class="login-logo">⏱</div>
      <h1 class="login-title">工时</h1>
      <p class="login-subtitle">记录每一分钟的付出</p>
    </div>

    <!-- Tab form -->
    <div class="login-body">
      <van-tabs v-model:active="activeTab" animated>
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
  background: #F8F7F4;
  display: flex;
  flex-direction: column;
}

.login-header {
  background: #18181B;
  padding: 72px 24px 52px;
  text-align: center;
}

.login-logo {
  font-size: 3rem;
  margin-bottom: 16px;
  display: block;
}

.login-title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.login-subtitle {
  font-size: 0.875rem;
  color: rgba(255,255,255,0.4);
  margin: 0;
}

.login-body {
  flex: 1;
  padding-top: 8px;
}

.tab-form {
  padding-top: 16px;
}

.form-action {
  padding: 24px 16px 16px;
}

:deep(.van-tabs__line) {
  background: #D97706 !important;
}
:deep(.van-tab--active .van-tab__text) {
  color: #D97706;
  font-weight: 700;
}
</style>
