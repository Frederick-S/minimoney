<template>
  <v-container fluid class="pa-0 fill-height">
    <v-row no-gutters class="fill-height">
      <v-col cols="12" class="fill-height d-flex flex-column justify-center">
        <div class="mx-auto" style="max-width: 400px; width: 100%;">
          <v-card class="pa-6" elevation="2">
            <v-card-title class="text-center pb-4">
              <h2 class="text-h4 font-weight-light">
                {{ isForgotPassword ? '重置密码' : (isLogin ? '登录' : '注册') }}
              </h2>
            </v-card-title>

            <!-- Forgot Password Form -->
            <v-form v-if="isForgotPassword" @submit.prevent="handleForgotPassword">
              <v-text-field
                v-model="email"
                label="邮箱"
                type="email"
                variant="outlined"
                :rules="emailRules"
                required
                class="mb-3"
              />

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="loading"
                class="mb-4"
              >
                发送重置邮件
              </v-btn>

              <div class="text-center">
                <v-btn
                  variant="text"
                  color="primary"
                  @click="backToLogin"
                >
                  返回登录
                </v-btn>
              </div>
            </v-form>

            <!-- Login/Signup Form -->
            <v-form v-else @submit.prevent="handleSubmit">
              <v-text-field
                v-model="email"
                label="邮箱"
                type="email"
                variant="outlined"
                :rules="emailRules"
                required
                class="mb-3"
              />

              <v-text-field
                v-model="password"
                label="密码"
                type="password"
                variant="outlined"
                :rules="passwordRules"
                required
                class="mb-3"
              />

              <v-text-field
                v-if="!isLogin"
                v-model="confirmPassword"
                label="确认密码"
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
                {{ isLogin ? '登录' : '注册' }}
              </v-btn>

              <div class="text-center">
                <v-btn
                  variant="text"
                  color="primary"
                  @click="toggleMode"
                >
                  {{ isLogin ? '没有账户？注册' : '已有账户？登录' }}
                </v-btn>
              </div>

              <!-- Forgot Password Link (below toggle button) -->
              <div v-if="isLogin" class="text-center mt-2">
                <v-btn
                  variant="text"
                  color="primary"
                  @click="showForgotPassword"
                >
                  忘记密码？
                </v-btn>
              </div>
            </v-form>

            <v-alert
              v-if="successMessage"
              type="info"
              class="mt-4"
              closable
              @click:close="successMessage = ''"
            >
              {{ successMessage }}
            </v-alert>
          </v-card>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { signIn, signUp, supabase, resetPasswordForEmail } = useSupabase()
const { showError, showSuccess } = useToast()

const isLogin = ref(true)
const isForgotPassword = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const successMessage = ref('')

const emailRules = [
  (v: string) => !!v || '邮箱是必填项',
  (v: string) => /.+@.+\..+/.test(v) || '邮箱格式不正确',
]

const passwordRules = [
  (v: string) => !!v || '密码是必填项',
  (v: string) => v.length >= 6 || '密码至少6位',
]

const confirmPasswordRules = [
  (v: string) => !!v || '请确认密码',
  (v: string) => v === password.value || '两次输入的密码不一致',
]

const toggleMode = () => {
  isLogin.value = !isLogin.value
  isForgotPassword.value = false
  successMessage.value = ''
  confirmPassword.value = ''
}

const showForgotPassword = () => {
  isForgotPassword.value = true
  isLogin.value = true
  successMessage.value = ''
}

const backToLogin = () => {
  isForgotPassword.value = false
  successMessage.value = ''
}

const handleForgotPassword = async () => {
  if (!email.value) {
    showError('请输入邮箱地址')
    return
  }

  loading.value = true
  successMessage.value = ''

  try {
    const { error } = await resetPasswordForEmail(email.value)

    if (error) {
      showError(error.message || '发送重置邮件失败')
    } else {
      successMessage.value = '密码重置邮件已发送！请检查您的邮箱。'
      showSuccess('密码重置邮件已发送')
    }
  } catch (err) {
    showError('发送重置邮件时发生错误，请重试')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!email.value || !password.value) return
  if (!isLogin.value && !confirmPassword.value) return
  if (!isLogin.value && password.value !== confirmPassword.value) return

  loading.value = true
  successMessage.value = ''

  try {
    const { error: authError } = isLogin.value
      ? await signIn(email.value, password.value)
      : await signUp(email.value, password.value)

    if (authError) {
      showError(authError.message || '登录失败，请检查邮箱和密码')
    } else if (isLogin.value) {
      // Successful login - redirect to home
      router.push('/')
    } else {
      // Successful signup - show message
      successMessage.value = '注册成功！请检查邮箱确认注册。'
    }
  } catch (err) {
    showError('登录或注册过程中发生错误，请重试')
  } finally {
    loading.value = false
  }
}

// Handle email confirmation from URL
onMounted(async () => {
  // Check if this is an email confirmation redirect
  const fullPath = route.fullPath
  // Ignore password recovery flows (handled by App.vue)
  if (fullPath.includes('type=recovery')) {
    return
  }

  if (fullPath.includes('access_token=') || fullPath.includes('refresh_token=')) {
    loading.value = true
    try {
      // Let Supabase handle the session from URL
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        showError('邮箱确认失败：' + error.message)
      } else if (data.session) {
        showSuccess('邮箱确认成功！欢迎使用！')
        // Redirect to home after successful confirmation
        setTimeout(() => {
          router.push('/')
        }, 2000)
      } else {
        // Try to get session from URL hash
        const { error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          showError('确认邮箱时发生错误，请重试')
        }
      }
    } catch (err) {
      showError('处理邮箱确认时发生错误')
    } finally {
      loading.value = false
    }
  }
})
</script>