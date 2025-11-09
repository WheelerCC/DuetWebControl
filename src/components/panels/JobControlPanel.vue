<template>
  <CodeBtn
    color="warning"
    block
    :disabled="uiFrozen || !isPrinting || isPausing || isCancelling"
    :code="isPaused ? 'M24' : 'M25'"
    tabindex="0"
  >
    <component :is="isPaused ? Play : Pause" />

    {{ pauseResumeText }}
  </CodeBtn>

  <CodeBtn v-if="isPaused" block :disabled="isCancelling" class="mt-3" color="error" code="M0">
    <v-icon class="mr-1"> mdi-stop </v-icon>
    {{ cancelText }}
  </CodeBtn>

  <CodeBtn
    v-if="!isPrinting && processAnotherCode"
    block
    class="mt-3"
    color="success"
    :code="processAnotherCode"
  >
    <component :is="processAnotherIcon" />
    {{ processAnotherText }}
  </CodeBtn>

  <!-- todo not migrated menu yet -->
  <v-menu v-if="thumbnails.some((thumbnail) => thumbnail.data !== null)" open-on-click offset-y>
    <template #activator="{ props }">
      <v-btn v-bind="props" color="info" block :disabled="uiFrozen" class="mt-3">
        <v-icon class="mr-1"> mdi-image </v-icon>
        {{ $t('panel.jobControl.showPreview') }}
      </v-btn>
    </template>

    <v-card>
      <v-carousel
        height="auto"
        hide-delimiters
        :show-arrows="validThumbnails.length > 1"
        show-arrows-on-hover
      >
        <v-carousel-item
          v-for="thumbnail in validThumbnails"
          :key="`${thumbnail.format}-${thumbnail.width}x${thumbnail.height}`"
        >
          <div class="d-flex fill-height align-center">
            <thumbnail-img :thumbnail="thumbnail" class="mx-auto" />
          </div>
        </v-carousel-item>
      </v-carousel>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { MachineMode, MachineStatus } from '@duet3d/objectmodel'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { isPaused as _isPaused, isPrinting as _isPrinting } from '@/utils/enums'
import { escapeFilename } from '@/utils/path'

import { Pause, Play, Printer, Repeat } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import CodeBtn from '../buttons/CodeBtn.vue'

let { uiFrozen } = storeToRefs(useRootStore())
let { state, job } = storeToRefs(useMachinesModelStore())
let isSimulating = ref(false)
let { t } = useI18n()

onMounted(() => {
  isSimulating.value = state.value.status === MachineStatus.simulating
})

let isPausing = computed(() => {
  return state.value.status === MachineStatus.pausing
})

let isPaused = computed(() => {
  return _isPaused(state.value.status)
})

let isCancelling = computed(() => {
  return state.value.status === MachineStatus.cancelling
})

let isPrinting = computed(() => {
  return _isPrinting(state.value.status)
})

watch(isPrinting, (newVal, oldVal) => {
  if (newVal) {
    isSimulating.value = state.value.status === MachineStatus.simulating
  } else {
    isSimulating.value = false
  }
})

let pauseResumeText = computed(() => {
  if (isSimulating.value) {
    return t(
      isPaused.value ? 'panel.jobControl.resumeSimulation' : 'panel.jobControl.pauseSimulation',
    )
  }
  if (state.value.machineMode === MachineMode.fff) {
    return t(isPaused.value ? 'panel.jobControl.resumePrint' : 'panel.jobControl.pausePrint')
  }
  return t(isPaused.value ? 'panel.jobControl.resumeJob' : 'panel.jobControl.pauseJob')
})

let cancelText = computed(() => {
  if (isSimulating.value) {
    return t('panel.jobControl.cancelSimulation')
  }
  if (state.value.machineMode === MachineMode.fff) {
    return t('panel.jobControl.cancelPrint')
  }
  return t('panel.jobControl.cancelJob')
})
let processAnotherCode = computed(() => {
  if (job.value.lastFileName !== null) {
    if (job.value.lastFileSimulated && (job.value.lastFileAborted || job.value.lastFileCancelled)) {
      return `M37 P"${escapeFilename(job.value.lastFileName!)}"`
    }
    return `M32 "${escapeFilename(job.value.lastFileName!)}"`
  }
  return ''
})

let processAnotherIcon = computed(() => {
  if (job.value.lastFileSimulated && !(job.value.lastFileAborted || job.value.lastFileCancelled)) {
    return !state.value.machineMode || state.value.machineMode === MachineMode.fff ? Printer : Play
  }
  return Repeat
})

let processAnotherText = computed(() => {
  if (job.value.lastFileSimulated) {
    if (job.value.lastFileAborted || job.value.lastFileCancelled) {
      return t('panel.jobControl.repeatSimulation')
    }
    return !state.value.machineMode || state.value.machineMode === MachineMode.fff
      ? t('panel.jobControl.printNow')
      : t('panel.jobControl.startJob')
  }
  if (state.value.machineMode === MachineMode.fff) {
    return t('panel.jobControl.repeatPrint')
  }
  return t('panel.jobControl.repeatJob')
})

let thumbnails = computed(() => {
  const thumbnails = job.value.file !== null ? job.value.file!.thumbnails.slice() : []
  thumbnails.sort((a, b) => b.width * b.height - a.width * a.height) // return biggest thumbnails first
  return thumbnails
})

let validThumbnails = computed(() => {
  return thumbnails.value.filter((thumbnail) => !!thumbnail.data)
})
</script>
