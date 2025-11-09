<template>
  <div class="flex flex-row justify-between">
    <div class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobData.warmUpDuration') }}
      </strong>
      <span>
        {{ displayTime(warmUpDuration) }}
      </span>
    </div>

    <div class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobData.currentLayerTime') }}
      </strong>
      <span>
        {{ displayTime(layerTime) }}
      </span>
    </div>

    <div class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobData.lastLayerTime') }}
      </strong>
      <span>
        {{ displayTime(lastLayerTime) }}
      </span>
    </div>

    <div class="flex flex-col items-center">
      <strong>
        {{ $t('panel.jobData.jobDuration') }}
      </strong>
      <span>
        {{ displayTime(jobDuration) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { displayTime } from '@/utils/display'
import { isPrinting } from '@/utils/enums'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'

let { job, state } = storeToRefs(useMachinesModelStore())

let warmUpDuration = computed(() => {
  return isPrinting(state.value.status) ? job.value.warmUpDuration : job.value.lastWarmUpDuration
})
let layerTime = computed(() => {
  return job.value.layerTime
})
let lastLayerTime = computed(() => {
  if (job.value.layers.length === 0) {
    return null
  }
  return job.value.layers[job.value.layers.length - 1].duration
})
let jobDuration = computed(() => {
  return isPrinting(state.value.status) ? job.value.duration : job.value.lastDuration
})
</script>
