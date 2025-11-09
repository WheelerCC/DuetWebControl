<template>
  <Badge :class="statusClass">
    {{ statusText }}
  </Badge>
</template>

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { MachineMode, MachineStatus } from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '../ui/badge'

let { t } = useI18n()
let { darkTheme } = storeToRefs(useSettingsStore())
let { state } = storeToRefs(useMachinesModelStore())

let statusText = computed(() => {
  let type: string = useMachinesModelStore().state.status
  console.log(useMachinesModelStore().state)
  if (!type) {
    type = 'unknown'
  } else if (
    type === MachineStatus.processing &&
    useMachinesModelStore().state.machineMode === MachineMode.fff
  ) {
    type = 'printing'
  }
  console.log(type)
  return t(`generic.status.${type}`)
})

// todo not quite the same style as old
let statusClass = computed(() => {
  const _darkTheme = darkTheme.value,
    status = state.value.status
  switch (status) {
    case MachineStatus.disconnected:
      return _darkTheme ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
    case MachineStatus.starting:
      return _darkTheme ? 'bg-blue-300' : 'bg-blue-300'
    case MachineStatus.updating:
      return _darkTheme ? 'bg-blue-700' : 'bg-blue-700'
    case MachineStatus.off:
      return _darkTheme ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
    case MachineStatus.halted:
      return 'bg-red-500 text-white'
    case MachineStatus.pausing:
      return _darkTheme ? 'bg-yellow-500' : 'bg-orange-500'
    case MachineStatus.paused:
      return _darkTheme ? 'bg-orange-500' : 'bg-yellow-500'
    case MachineStatus.resuming:
      return _darkTheme ? 'bg-yellow-500' : 'bg-orange-500'
    case MachineStatus.cancelling:
      return 'bg-red-500 text-white'
    case MachineStatus.processing:
      return 'bg-green-600 text-white'
    case MachineStatus.simulating:
      return _darkTheme ? 'bg-blue-300' : 'bg-blue-300'
    case MachineStatus.busy:
      return _darkTheme ? 'amber text-white' : 'amber text-white'
    case MachineStatus.changingTool:
      return _darkTheme ? 'bg-gray-500' : 'bg-blue-700'
    case MachineStatus.idle:
      return _darkTheme ? 'bg-green-600' : 'bg-green-600'
    default:
      const _exhaustiveCheck: never = status
      return 'bg-red-500 text-white'
  }
})
</script>
