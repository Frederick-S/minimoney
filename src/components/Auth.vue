<template>
  <v-container fluid class="pa-0 fill-height">
    <v-row no-gutters class="fill-height">
      <v-col cols="12" class="fill-height d-flex flex-column justify-center">
        <div class="mx-auto" style="max-width: 400px; width: 100%;">
          <v-card class="pa-6" elevation="2">
            <v-card-title class="text-center pb-4">
              <h2 class="text-h4 font-weight-light">{{ isLogin ? '登录' : '注册' }}</h2>
            </v-card-title>

            <v-form @submit.prevent="handleSubmit">
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'

const router = useRouter()
const { signIn, signUp } = useSupabase()

const isLogin = ref(true)
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
  successMessage.value = ''
  confirmPassword.value = ''
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
      // Error is now handled by toast in useSupabase
    } else if (isLogin.value) {
      // Successful login - redirect to home
      router.push('/')
    } else {
      // Successful signup - show message
      successMessage.value = '注册成功！请检查邮箱确认注册。'
    }
  } catch (err) {
    // Error is now handled by toast in useSupabase
  } finally {
    loading.value = false
  }
}
</script>