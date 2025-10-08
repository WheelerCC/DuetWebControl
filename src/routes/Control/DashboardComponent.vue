<template>
  <div class="mb-3">
    <fff-dashboard-panel v-if="isFFForUnset" />
    <cnc-dashboard-panel v-else />
  </div>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { DashboardMode, useSettingsStore } from '@/stores/settings'
import { MachineMode } from '@duet3d/objectmodel'
import Vue from 'vue'

export default Vue.extend({
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
