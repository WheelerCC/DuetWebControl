<template>
  <Dialog v-model:open="shown">
    <DialogContent class="max-w-sm">
      <form ref="form" @submit.prevent="submit" class="flex flex-col gap-7">
        <DialogHeader>
          <DialogTitle>{{ t('dialog.connect.title') }}</DialogTitle>
          <DialogDescription>
            {{ t('dialog.connect.prompt') }}
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-5">
          <Input
            v-if="!passwordRequired"
            v-model="hostname"
            :autofocus="!passwordRequired"
            :placeholder="t('dialog.connect.hostPlaceholder')"
            autocomplete="username"
            required
          />
          <Input
            v-model="password"
            type="password"
            :placeholder="
              t(
                passwordRequired
                  ? 'dialog.connect.passwordPlaceholder'
                  : 'dialog.connect.passwordPlaceholderOptional',
              )
            "
            :autofocus="passwordRequired"
            autocomplete="current-password"
            :required="passwordRequired"
          />
          <div class="flex items-center space-x-2">
            <Checkbox v-model="rememberPassword" id="terms" />
            <label
              for="terms"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {{ t('dialog.connect.rememberPassword') }}
            </label>
          </div>
        </div>

        <DialogFooter
          ><div class="flex flex-row justify-end gap-4">
            <DialogClose as-child>
              <Button type="submit">
                {{ t('dialog.connect.connect') }}
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useRootStore } from '@/stores'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const hostname = ref(location.host)
const password = ref('')
const rememberPassword = ref(false)
const shown = ref(false)
const form = ref<HTMLFormElement | null>(null)

const { passwordRequired, connectDialogShown } = storeToRefs(useRootStore())
const { lastHostname } = storeToRefs(useSettingsStore())

watch(connectDialogShown, (newVal, oldVal) => {
  console.log('connectDialogShown Changed')
  shown.value = newVal
  if (newVal) loadPassword()
})

watch(lastHostname, (to) => {
  hostname.value = to
})

watch(shown, (newVal, oldVal) => {
  if (!newVal) {
    close()
  }
})

onMounted(() => {
  hostname.value = passwordRequired.value ? location.host : lastHostname.value
  shown.value = connectDialogShown.value
  loadPassword()
})

async function submit() {
  // Add your own validation logic if needed
  if (!hostname.value) return
  if (passwordRequired.value && !password.value) return

  close()
  try {
    await useRootStore().connect({
      hostname: hostname.value,
      password: password.value,
    })
    if (rememberPassword.value) {
      localStorage.setItem('dwc-password', password.value)
    } else {
      localStorage.removeItem('dwc-password')
    }
    password.value = ''
  } catch (e) {
    console.warn(e)
    useRootStore().showConnectDialog()
  }
}

function close() {
  useRootStore().hideConnectDialog()
}

function loadPassword() {
  const savedPassword = localStorage.getItem('dwc-password')
  if (savedPassword) {
    password.value = savedPassword
    rememberPassword.value = true
  }
}
</script>
