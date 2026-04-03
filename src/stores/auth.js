import { defineStore } from 'pinia'
import { ref } from 'vue'
import { signIn, signUp, signOut, getUser, fetchProfile } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)   // Supabase Auth User object
  const profile = ref(null)   // { nickname }
  const loading = ref(false)

  /** Called on app startup — restores session from localStorage. */
  async function init() {
    loading.value = true
    try {
      user.value = await getUser()
      if (user.value) {
        profile.value = await fetchProfile(user.value.id)
      }
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      const { user: u } = await signIn(email, password)
      user.value    = u
      profile.value = await fetchProfile(u.id)
    } finally {
      loading.value = false
    }
  }

  async function register(email, password, nickname) {
    loading.value = true
    try {
      await signUp(email, password, nickname)
      // Supabase may require email confirmation; don't auto-login here
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    await signOut()
    user.value    = null
    profile.value = null
  }

  return { user, profile, loading, init, login, register, logout }
})
