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

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { display, displayZ } from '@/utils/display'
import { GCodeFileInfo } from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'

import { computed } from 'vue'

let { isFFForUnset } = storeToRefs(useSettingsStore())
let { job } = storeToRefs(useMachinesModelStore())

let jobFile = computed<GCodeFileInfo | null>(() => {
  return job.value.file as GCodeFileInfo | null
})
</script>
