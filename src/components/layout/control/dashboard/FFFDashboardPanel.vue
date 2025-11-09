<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { MachineMode } from '@duet3d/objectmodel'

import { computed } from 'vue'

const uiFrozen = computed(() => {
  return useRootStore().uiFrozen
})

const currentTool = computed(() => {
  return useMachinesModelStore().currentTool()
})

const isFFForUnset = computed(() => {
  return (
    !useMachinesModelStore().state.machineMode ||
    useMachinesModelStore().state.machineMode === MachineMode.fff
  )
})

const showATXPanel = computed(() => {
  return useMachinesModelStore().state.atxPower !== null
})

const showFansPanel = computed(() => {
  return (
    (currentTool.value !== null && currentTool.value.fans.length > 0) ||
    useMachinesModelStore().fans.some(
      (fan) => fan !== null && fan.thermostatic.sensors.length === 0,
    )
  )
})
</script>

<template>
  <div class="grid grid-cols-2">
    <div>
      <v-row v-if="isFFForUnset">
        <v-col
          sm="12"
          :md="showATXPanel ? 9 : 12"
          :lg="showATXPanel ? 9 : 12"
          :xl="showATXPanel ? 10 : 12"
        >
          <extrude-panel />
        </v-col>

        <v-col v-if="showATXPanel" md="3" lg="3" xl="2" align-self="center">
          <atx-panel />
        </v-col>
      </v-row>

      <v-row>
        <v-col
          sm="12"
          :md="!isFFForUnset && showATXPanel ? 9 : 12"
          :lg="!isFFForUnset && showATXPanel ? 9 : 12"
          :xl="!isFFForUnset && showATXPanel ? 10 : 12"
        >
          <fan-panel />
        </v-col>

        <v-col v-if="!isFFForUnset && showATXPanel" md="3" lg="3" xl="2" align-self="center">
          <atx-panel />
        </v-col>
      </v-row>
    </div>
    <div>
      <macro-list />
    </div>
    <movement-panel class="mb-2" />
  </div>
</template>
