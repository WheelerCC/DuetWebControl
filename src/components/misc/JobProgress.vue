<template>
  <div class="flex flex-col gap-2 w-full">
    {{ printStatus }}

    {{ printDetails }}

    <Progress v-model="jobProgressPercent" class="w-full" />
  </div>
</template>

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { isPrinting } from '@/utils/enums'
import { extractFileName } from '@/utils/path'
import { MachineMode, MachineStatus } from '@duet3d/objectmodel'

import { display } from '@/utils/display'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Progress } from '../ui/progress'

let isSimulating = ref(false)
let { t } = useI18n()

let { jobProgress, state, job } = storeToRefs(useMachinesModelStore())

let jobProgressPercent = computed(() => jobProgress.value * 100)

let printStatus = computed(() => {
  if (isPrinting(state.value.status)) {
    if (printFile.value) {
      const progress = display(jobProgress.value * 100, 1, '%')
      if (isSimulating.value) {
        return t('jobProgress.simulating', [printFile.value, progress])
      }
      if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
        return t('jobProgress.printing', [printFile.value, progress])
      }
      return t('jobProgress.processing', [printFile.value, progress])
    }
    return t('generic.loading')
  } else if (lastPrintFile.value) {
    if (job.value.lastFileSimulated) {
      return t('jobProgress.simulated', [lastPrintFile.value])
    }
    if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
      return t('jobProgress.printed', [lastPrintFile.value])
    }
    return t('jobProgress.processed', [lastPrintFile.value])
  }
  return t('jobProgress.noJob')
})

let printDetails = computed(() => {
  if (!isPrinting(state.value.status)) {
    return ''
  }

  let details = ''
  if (job.value.layer !== null && job.value.file?.numLayers) {
    details = t('jobProgress.layer', [job.value.layer, job.value.file!.numLayers])
  }
  if (useMachinesModelStore().move.extruders.length > 0) {
    if (details !== '') {
      details += ', '
    }
    const totalRawExtruded =
      job.value.rawExtrusion !== null
        ? job.value.rawExtrusion
        : useMachinesModelStore()
            .move.extruders.map((extruder) => extruder.rawPosition)
            .reduce((a, b) => a + b)
    details += t('jobProgress.filament', [display(totalRawExtruded, 1, 'mm')])
    if (job.value.file !== null && job.value.file!.filament.length > 0) {
      const needed = job.value.file!.filament.reduce((a, b) => a + b)
      details +=
        ' (' +
        t('jobProgress.filamentRemaining', [
          display(Math.max(needed - totalRawExtruded!, 0), 1, 'mm'),
        ]) +
        ')'
    }
  }
  return details
})

const printFile = computed(() => {
  return job.value.file?.fileName ? extractFileName(job.value.file!.fileName) : null
})
const lastPrintFile = computed(() => {
  return job.value.lastFileName !== null ? extractFileName(job.value.lastFileName!) : null
})

watch(state, (newVal, oldVal) => {
  if (newVal.status === MachineStatus.simulating) {
    isSimulating.value = true
  } else if (!isPrinting(newVal.status)) {
    isSimulating.value = false
  }
})

onMounted(() => {
  isSimulating.value = useMachinesModelStore().state.status === MachineStatus.simulating
})
</script>
