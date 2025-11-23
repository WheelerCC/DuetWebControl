<template>
  <div class="grid grid-cols-1 md:grid-cols-2">
    <div class="flex flex-row gap-2 items-center">
      <Switch v-model="notifications.errorsPersistent" />
      <Label> {{ $t('panel.settingsNotifications.notificationErrorsPersistent') }} </Label>
    </div>
    <div class="flex flex-row gap-2 items-center">
      <Input v-model.number="notificationTimeout" type="number" step="any" min="0" />
      <Label>{{ $t('panel.settingsNotifications.notificationTimeout', ['ms']) }} </Label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

let { notifications } = storeToRefs(useSettingsStore())

let notificationTimeout = computed({
  get(): number {
    return notifications.value.timeout
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      notifications.value.timeout = value
    }
  },
})
</script>
