<template>
  <div class="mb-3">
    <fff-container-panel v-if="isFFForUnset" />
    <cnc-container-panel v-else />
  </div>
</template>

<script lang="ts">
import { MachineMode } from '@duet3d/objectmodel'

import { useMachinesModelStore } from '@/stores/machineModel'
import { DashboardMode, useSettingsStore } from '@/stores/settings'

import { defineComponent } from 'vue'

export default defineComponent({
  computed: {
    isFFForUnset() {
      if (useSettingsStore().dashboardMode === DashboardMode.default) {
        return (
          !useMachinesModelStore().state.machineMode ||
          useMachinesModelStore().state.machineMode === MachineMode.fff
        )
      }
      return useSettingsStore().dashboardMode === DashboardMode.fff
    },
  },
})
</script>
