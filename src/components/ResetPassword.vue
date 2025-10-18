<template>
  <v-container fluid class="pa-0 fill-height">
    <v-row no-gutters class="fill-height">
      <v-col cols="12" class="fill-height d-flex flex-column justify-center">
        <div class="mx-auto" style="max-width: 400px; width: 100%;">
          <!-- Loading State -->
          <div v-if="checkingSession" class="text-center">
            <v-progress-circular indeterminate size="64" />
            <p class="mt-4">正在验证...</p>
          </div>

          <!-- Error State -->
          <v-card v-else-if="sessionError" class="pa-6" elevation="2">
            <v-card-title class="text-center pb-4">
              <h2 class="text-h4 font-weight-light">链接无效或已过期</h2>
            </v-card-title>
            <v-card-text class="text-center">
              <p class="mb-4">{{ sessionError }}</p>
              <v-btn color="primary" @click="router.push('/login')">
                返回登录
              </v-btn>
            </v-card-text>
          </v-card>

          <!-- Reset Password Form -->
          <v-card v-else class="pa-6" elevation="2">
            <v-card-title class="text-center pb-4">
              <h2 class="text-h4 font-weight-light">设置新密码</h2>
            </v-card-title>

            <v-form @submit.prevent="handleResetPassword">
              <v-text-field
                v-model="newPassword"
                label="新密码"
                type="password"
                variant="outlined"
                :rules="passwordRules"
                required
                class="mb-3"
              />

              <v-text-field
                v-model="confirmPassword"
                label="确认新密码"
                type="password"
                variant="outlined"
                :rules="confirmPasswordRules"
                required
                class="mb-4"
              />

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                class="mb-4"
              >
                重置密码
              </v-btn>

              <div class="text-center">
                <v-btn
                  variant="text"
                  color="primary"
                  @click="router.push('/login')"
                >
                  返回登录
                </v-btn>
              </div>
            </v-form>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { updatePassword, supabase } = useSupabase()
const { showError, showSuccess } = useToast()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const checkingSession = ref(true)
const sessionError = ref('')

// Check if user has valid session from reset link
onMounted(async () => {
  try {
    // The hash contains both the route and the auth tokens
    // Format: #/reset-password#access_token=...&refresh_token=...
    const fullHash = window.location.hash
    console.log('Full hash:', fullHash)
    
    // Extract the auth params after the second #
    const hashParts = fullHash.split('#')
    const authHash = hashParts.length > 2 ? hashParts[2] : hashParts[1]
    
    console.log('Auth hash:', authHash)
    
    const hashParams = new URLSearchParams(authHash)
    const hasAccessToken = hashParams.has('access_token')
    const tokenType = hashParams.get('type')
    
    console.log('Hash params:', {
      hasAccessToken,
      tokenType,
      accessToken: hashParams.get('access_token')?.substring(0, 20) + '...'
    })
    
    if (!hasAccessToken) {
      sessionError.value = '重置链接无效。请从邮件中点击完整的重置链接。'
      checkingSession.value = false
      return
    }
    
    // Manually set the session using the tokens from URL
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    
    if (accessToken && refreshToken) {
      console.log('Setting session manually with tokens from URL')
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (error) {
        console.error('Error setting session:', error)
        sessionError.value = '无法建立会话：' + error.message
      } else if (!data.session) {
        console.error('No session returned after setSession')
        sessionError.value = '无法建立会话。令牌可能已过期。'
      } else {
        console.log('Session established successfully:', data.session.user?.email)
      }
    } else {
      sessionError.value = '重置链接缺少必要的令牌。'
    }
  } catch (err) {
    console.error('Mount error:', err)
    sessionError.value = '验证会话时发生错误'
  } finally {
    checkingSession.value = false
  }
})

const passwordRules = [
  (v: string) => !!v || '密码是必填项',
  (v: string) => v.length >= 6 || '密码至少6位',
]

const confirmPasswordRules = [
  (v: string) => !!v || '请确认密码',
  (v: string) => v === newPassword.value || '两次输入的密码不一致',
]

const handleResetPassword = async () => {
  if (!newPassword.value || !confirmPassword.value) {
    showError('请填写所有字段')
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    showError('两次输入的密码不一致')
    return
  }

  loading.value = true

  try {
    // Verify we still have a session before attempting password update
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      showError('会话已过期，请重新请求密码重置')
      sessionError.value = '会话已过期'
      loading.value = false
      return
    }

    const { error } = await updatePassword(newPassword.value)

    if (error) {
      showError(error.message || '密码重置失败')
    } else {
      showSuccess('密码重置成功！正在跳转到登录页...')
      // Sign out to clear the recovery session
      await supabase.auth.signOut()
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  } catch (err) {
    console.error('Reset password error:', err)
    showError('密码重置过程中发生错误，请重试')
  } finally {
    loading.value = false
  }
}
</script>
