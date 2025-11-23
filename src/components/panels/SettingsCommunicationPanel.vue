<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
    <template v-if="isRestConnector">
      <div class="flex flex-col gap-1">
        <Label>{{ $t('panel.settingsCommunication.pingInterval', ['ms']) }}</Label>
        <Input v-model.number="internalPingInterval" type="number" step="1" min="0" />
      </div>
      <div class="flex flex-col gap-1">
        <Label>{{ $t('panel.settingsCommunication.updateDelay', ['ms']) }}</Label>
        <Input v-model.number="internalUpdateDelay" type="number" step="1" min="0" />
      </div>
    </template>
    <template v-else-if="isPollConnector">
      <div class="flex flex-col gap-1">
        <Label>{{ $t('panel.settingsCommunication.ajaxRetries') }}</Label>
        <Input v-model.number="internalAjaxRetries" type="number" step="1" min="0" />
      </div>
      <div class="flex flex-col gap-1">
        <Label>{{ $t('panel.settingsCommunication.retryDelay') }}</Label>
        <Input v-model.number="internalRetryDelay" type="number" step="1" min="0" />
      </div>
      <div class="flex flex-col gap-1">
        <Label>{{ $t('panel.settingsCommunication.updateInterval', ['ms']) }}</Label>
        <Input v-model.number="internalUpdateInterval" type="number" step="1" min="0" />
      </div>
      <div class="flex flex-col gap-1">
        <Label>{{ $t('panel.settingsCommunication.fileTransferRetryThreshold', ['KiB']) }}</Label>
        <Input v-model.number="internalFileTransferRetryThreshold" type="number" step="1" min="1" />
      </div>
      <div class="flex flex-row gap-1">
        <Switch v-model="crcUploads" />
        <Label>{{ $t('panel.settingsCommunication.crcUploads') }}</Label>
      </div>
      <div class="flex flex-row gap-1">
        <Switch v-model="ignoreFileTimestamps" />
        <Label>{{ $t('panel.settingsGeneral.ignoreFileTimestamps') }}</Label>
      </div>
    </template>
    <template v-else>
      {{ $t('panel.settingsCommunication.unavailable') }}
    </template>
  </div>
</template>

<script setup lang="ts">
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { storeToRefs } from 'pinia'

import { computed } from 'vue'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

let { isRestConnector, isPollConnector } = storeToRefs(useMachinesStore())
let machineSettingsStore = useMachinesSettingsStore()
let {
  ignoreFileTimestamps,
  pingInterval,
  updateDelay,
  ajaxRetries,
  retryDelay,
  updateInterval,
  crcUploads,
  fileTransferRetryThreshold,
} = storeToRefs(machineSettingsStore)

let internalPingInterval = computed({
  get(): number {
    return pingInterval.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      machineSettingsStore.setPingInterval(value)
    }
  },
})

let internalUpdateDelay = computed({
  get(): number {
    return updateDelay.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      machineSettingsStore.setUpdateDelay(value)
    }
  },
})

let internalAjaxRetries = computed({
  get(): number {
    return ajaxRetries.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      machineSettingsStore.setAjaxRetries(value)
    }
  },
})

let internalRetryDelay = computed({
  get(): number {
    return retryDelay.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      machineSettingsStore.setRetryDelay(value)
    }
  },
})

let internalUpdateInterval = computed({
  get(): number {
    return updateInterval.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      machineSettingsStore.setUpdateInterval(value)
    }
  },
})

let internalFileTransferRetryThreshold = computed({
  get(): number {
    return Math.round(fileTransferRetryThreshold.value / 1024)
  },
  set(value: number) {
    if (isFinite(value) && value > 0) {
      machineSettingsStore.setFileTransferRetryThreshold(Math.round(value * 1024))
    }
  },
})
</script>
