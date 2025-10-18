<template>
  <v-dialog 
    v-model="isOpen" 
    max-width="400"
    :fullscreen="$vuetify.display.mobile"
  >
    <v-card>
      <v-card-title class="text-h6 pa-4">
        修改密码
      </v-card-title>

      <v-card-text class="pa-4">
        <v-form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="currentPassword"
            label="当前密码"
            type="password"
            variant="outlined"
            :rules="currentPasswordRules"
            required
            class="mb-3"
          />

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
import { ref, watch, computed } from 'vue'
import { useSupabase } from '../composables/useSupabase'
import { useToast } from '../composables/useToast'
import { type PasswordChangeProps, type PasswordChangeEmits } from '../types'

const props = defineProps<PasswordChangeProps>()
const emit = defineEmits<PasswordChangeEmits>()

const { updatePassword, supabase, user } = useSupabase()
const { showError, showSuccess } = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const currentPasswordRules = [
  (v: string) => !!v || '当前密码是必填项',
]

const newPasswordRules = [
  (v: string) => !!v || '新密码是必填项',
  (v: string) => v.length >= 6 || '新密码至少6位',
]

const confirmPasswordRules = [
  (v: string) => !!v || '确认密码是必填项',
  (v: string) => v === newPassword.value || '两次输入的密码不一致',
]

const resetForm = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  loading.value = false
}

const closeDialog = () => {
  resetForm()
  isOpen.value = false
}

const handleSubmit = async () => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    showError('请填写所有字段')
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    showError('两次输入的密码不一致')
    return
  }

  if (newPassword.value.length < 6) {
    showError('新密码至少6位')
    return
  }

  loading.value = true

  try {
    // First verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.value?.email || '',
      password: currentPassword.value
    })

    if (signInError) {
      showError('当前密码不正确')
      loading.value = false
      return
    }

    // If current password is correct, update to new password
    const { error: updateError } = await updatePassword(newPassword.value)

    if (updateError) {
      showError(updateError.message || '修改密码失败')
    } else {
      showSuccess('密码修改成功！')
      // Close dialog after success
      setTimeout(() => {
        closeDialog()
      }, 1500)
    }
  } catch (err) {
    showError('修改密码失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>
