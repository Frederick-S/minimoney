<template>
  <v-dialog v-model="isOpen" max-width="400">
    <v-card>
      <v-card-title class="text-h6 pa-4">
        修改密码
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="newPassword"
            label="新密码"
            type="password"
            variant="outlined"
            :rules="newPasswordRules"
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

          <v-alert
            v-if="error"
            type="error"
            class="mb-4"
            closable
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <v-alert
            v-if="successMessage"
            type="success"
            class="mb-4"
            closable
            @click:close="successMessage = ''"
          >
            {{ successMessage }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="closeDialog"
        >
          取消
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          确认修改
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupabase } from '@/composables/useSupabase'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { updatePassword } = useSupabase()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const newPasswordRules = [
  (v: string) => !!v || '新密码是必填项',
  (v: string) => v.length >= 6 || '新密码至少6位',
]

const confirmPasswordRules = [
  (v: string) => !!v || '确认密码是必填项',
  (v: string) => v === newPassword.value || '两次输入的密码不一致',
]

const resetForm = () => {
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = ''
  successMessage.value = ''
  loading.value = false
}

const closeDialog = () => {
  resetForm()
  isOpen.value = false
}

const handleSubmit = async () => {
  if (!newPassword.value || !confirmPassword.value) {
    error.value = '请填写所有字段'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (newPassword.value.length < 6) {
    error.value = '新密码至少6位'
    return
  }

  loading.value = true
  error.value = ''
  successMessage.value = ''

  try {
    const { error: updateError } = await updatePassword(newPassword.value)

    if (updateError) {
      error.value = updateError.message
    } else {
      successMessage.value = '密码修改成功！'
      // Close dialog after 2 seconds
      setTimeout(() => {
        closeDialog()
      }, 2000)
    }
  } catch (err) {
    error.value = '修改密码失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>
