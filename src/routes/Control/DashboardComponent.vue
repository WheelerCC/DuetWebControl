<template>
  <div class="grid grid-cols-4 gap-2">
    <FFFDashboardPanel v-if="isFFForUnset" />
    <CNCDashboardPanel v-else />
  </div>
</template>

<script setup lang="ts">
import CNCDashboardPanel from '@/components/layout/control/dashboard/CNCDashboardPanel.vue'
import FFFDashboardPanel from '@/components/layout/control/dashboard/FFFDashboardPanel.vue'
import { useMachinesModelStore } from '@/stores/machineModel'
import { DashboardMode, useSettingsStore } from '@/stores/settings'
import { MachineMode } from '@duet3d/objectmodel'
import { computed } from 'vue'

// a computed ref
const isFFForUnset = computed(() => {
  if (useSettingsStore().dashboardMode === DashboardMode.default) {
    return (
      !useMachinesModelStore().state.machineMode ||
      useMachinesModelStore().state.machineMode === MachineMode.fff
    )
  }
  return useSettingsStore().dashboardMode === DashboardMode.fff
})
</script>
