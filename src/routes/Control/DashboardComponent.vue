<template>
  <div class="mb-3">
    <fff-dashboard-panel v-if="isFFForUnset" />
    <cnc-dashboard-panel v-else />
  </div>
</template>

<script lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { DashboardMode, useSettingsStore } from '@/stores/settings'
import { MachineMode } from '@duet3d/objectmodel'

import { defineComponent } from 'vue'

export default defineComponent({
  computed: {
    isFFForUnset() {
      let settingsStore = useSettingsStore()
      if (settingsStore.dashboardMode === DashboardMode.default) {
        return (
          !settingsStore.dashboardMode ||
          useMachinesModelStore().state.machineMode === MachineMode.fff
        )
      }
      return settingsStore.dashboardMode === DashboardMode.fff
    },
  },
})
</script>
