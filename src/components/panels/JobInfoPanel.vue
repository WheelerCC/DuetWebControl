<template>
  <p>
    <strong>{{ $t('panel.jobInfo.height') }}</strong>
    {{ displayZ(jobFile?.height) }}
  </p>
  <p v-if="isFFForUnset">
    <strong>{{ $t('panel.jobInfo.layerHeight') }}</strong>
    {{ displayZ(jobFile?.layerHeight) }}
  </p>
  <p v-if="isFFForUnset">
    <strong>{{ $t('panel.jobInfo.filament') }}</strong>
    {{ displayZ(jobFile?.filament) }}
  </p>
  <p>
    <strong>{{ $t('panel.jobInfo.generatedBy') }}</strong>
    {{ display(jobFile?.generatedBy) }}
  </p>
</template>

<script lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { display, displayZ } from '@/utils/display'
import { GCodeFileInfo, MachineMode } from '@duet3d/objectmodel'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  computed: {
    jobFile(): GCodeFileInfo | null {
      return useMachinesModelStore().job.file as GCodeFileInfo | null
    },
    isFFForUnset(): boolean {
      return (
        !useMachinesModelStore().state.machineMode ||
        useMachinesModelStore().state.machineMode === MachineMode.fff
      )
    },
  },
  methods: {
    display,
    displayZ,
  },
})
</script>

<style scoped>
p {
  margin-bottom: 8px;
}
p:last-child {
  margin-bottom: 0;
}
</style>
