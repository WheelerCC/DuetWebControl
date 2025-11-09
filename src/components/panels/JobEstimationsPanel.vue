<template>
  <div class="flex flex-row justify-around">
    <div v-if="timesLeft.filament !== null" class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobEstimations.filament') }}
      </strong>
      <span>
        {{ displayTime(timesLeft.filament) }}
      </span>
    </div>

    <div class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobEstimations.file') }}
      </strong>
      <span>
        {{ displayTime(timesLeft.file) }}
      </span>
    </div>

    <div v-if="slicerTimeLeft !== null" class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobEstimations.slicer') }}
      </strong>
      <span>
        {{ displayTime(slicerTimeLeft) }}
      </span>
    </div>

    <div v-if="timesLeft.toPause !== null" class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobEstimations.toPause') }}
      </strong>
      <span>
        {{ displayTime(timesLeft.toPause) }}
      </span>
    </div>

    <div v-if="simulationTime !== null" class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobEstimations.simulation') }}
      </strong>
      <span>
        {{ displayTime(simulationTime) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MachineStatus } from '@duet3d/objectmodel'

import { useMachinesModelStore } from '@/stores/machineModel'
import { isPrinting as _isPrinting } from '@/utils/enums'

import { displayTime } from '@/utils/display'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'

let { state, job } = storeToRefs(useMachinesModelStore())

let isSimulating = ref(false)
onMounted(() => {
  isSimulating.value = state.value.status === MachineStatus.simulating
})
let isPrinting = computed(() => {
  return _isPrinting(useMachinesModelStore().state.status)
})
let timesLeft = computed(() => {
  return job.value.timesLeft
})
let slicerTimeLeft = computed(() => {
  if (job.value.timesLeft.slicer !== null) {
    return job.value.timesLeft.slicer
  }
  if (job.value.file !== null && job.value.duration !== null && job.value.file?.printTime != null) {
    return isPrinting.value
      ? Math.max(0, (job.value.file!.printTime as number) - job.value.duration!)
      : (job.value.file!.printTime as number)
  }
  return null
})
let simulationTime = computed(() => {
  if (
    !isSimulating.value &&
    job.value.file !== null &&
    job.value.file!.simulatedTime !== null &&
    job.value.duration != null
  ) {
    return isPrinting.value
      ? Math.max(0, (job.value.file!.simulatedTime as number) - job.value.duration!)
      : (job.value.file!.simulatedTime as number)
  }
  return null
})

watch(isPrinting, (newVal, oldVal) => {
  if (newVal) {
    isSimulating.value = state.value.status === MachineStatus.simulating
  } else {
    isSimulating.value = false
  }
})
</script>
