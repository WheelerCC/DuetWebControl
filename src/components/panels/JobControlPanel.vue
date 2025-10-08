<template>
  <v-card>
    <v-card-title class="pb-1">
      <v-icon small class="mr-1"> mdi-wrench </v-icon>
      {{ $t('panel.jobControl.caption') }}
    </v-card-title>

    <v-card-text class="pt-0">
      <code-btn
        color="warning"
        block
        :disabled="uiFrozen || !isPrinting || isPausing || isCancelling"
        :code="isPaused ? 'M24' : 'M25'"
        tabindex="0"
      >
        <v-icon class="mr-1">
          {{ isPaused ? 'mdi-play' : 'mdi-pause' }}
        </v-icon>
        {{ pauseResumeText }}
      </code-btn>

      <code-btn v-if="isPaused" block :disabled="isCancelling" class="mt-3" color="error" code="M0">
        <v-icon class="mr-1"> mdi-stop </v-icon>
        {{ cancelText }}
      </code-btn>

      <code-btn
        v-if="!isPrinting && processAnotherCode"
        block
        class="mt-3"
        color="success"
        :code="processAnotherCode"
      >
        <v-icon class="mr-1">
          {{ processAnotherIcon }}
        </v-icon>
        {{ processAnotherText }}
      </code-btn>

      <v-menu v-if="thumbnails.some((thumbnail) => thumbnail.data !== null)" open-on-click offset-y>
        <template #activator="{ attrs, on }">
          <v-btn color="info" block :disabled="uiFrozen" class="mt-3" v-bind="attrs" v-on="on">
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
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { MachineMode, MachineStatus, ThumbnailInfo } from '@duet3d/objectmodel'
import Vue from 'vue'

import { isPaused, isPrinting } from '@/utils/enums'
import { escapeFilename } from '@/utils/path'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useRootStore } from '@/stores'

export default Vue.extend({
  data() {
    return {
      isSimulating: false,
    }
  },
  computed: {
    uiFrozen(): boolean {
      return useRootStore().uiFrozen
    },
    isPausing(): boolean {
      return useMachinesModelStore().state.status === MachineStatus.pausing
    },
    isPaused(): boolean {
      return isPaused(useMachinesModelStore().state.status)
    },
    isCancelling(): boolean {
      return useMachinesModelStore().state.status === MachineStatus.cancelling
    },
    isPrinting(): boolean {
      return isPrinting(useMachinesModelStore().state.status)
    },
    pauseResumeText(): string {
      if (this.isSimulating) {
        return this.$t(
          this.isPaused ? 'panel.jobControl.resumeSimulation' : 'panel.jobControl.pauseSimulation',
        )
      }
      if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
        return this.$t(
          this.isPaused ? 'panel.jobControl.resumePrint' : 'panel.jobControl.pausePrint',
        )
      }
      return this.$t(this.isPaused ? 'panel.jobControl.resumeJob' : 'panel.jobControl.pauseJob')
    },
    cancelText(): string {
      if (this.isSimulating) {
        return this.$t('panel.jobControl.cancelSimulation')
      }
      if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
        return this.$t('panel.jobControl.cancelPrint')
      }
      return this.$t('panel.jobControl.cancelJob')
    },
    processAnotherCode() {
      if (useMachinesModelStore().job.lastFileName !== null) {
        if (
          useMachinesModelStore().job.lastFileSimulated &&
          (useMachinesModelStore().job.lastFileAborted ||
            useMachinesModelStore().job.lastFileCancelled)
        ) {
          return `M37 P"${escapeFilename(useMachinesModelStore().job.lastFileName!)}"`
        }
        return `M32 "${escapeFilename(useMachinesModelStore().job.lastFileName!)}"`
      }
      return ''
    },
    processAnotherIcon() {
      if (
        useMachinesModelStore().job.lastFileSimulated &&
        !(
          useMachinesModelStore().job.lastFileAborted ||
          useMachinesModelStore().job.lastFileCancelled
        )
      ) {
        return !useMachinesModelStore().state.machineMode ||
          useMachinesModelStore().state.machineMode === MachineMode.fff
          ? 'mdi-printer'
          : 'mdi-play'
      }
      return 'mdi-restart'
    },
    processAnotherText() {
      if (useMachinesModelStore().job.lastFileSimulated) {
        if (
          useMachinesModelStore().job.lastFileAborted ||
          useMachinesModelStore().job.lastFileCancelled
        ) {
          return this.$t('panel.jobControl.repeatSimulation')
        }
        return !useMachinesModelStore().state.machineMode ||
          useMachinesModelStore().state.machineMode === MachineMode.fff
          ? this.$t('panel.jobControl.printNow')
          : this.$t('panel.jobControl.startJob')
      }
      if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
        return this.$t('panel.jobControl.repeatPrint')
      }
      return this.$t('panel.jobControl.repeatJob')
    },
    thumbnails(): Array<ThumbnailInfo> {
      const thumbnails =
        useMachinesModelStore().job.file !== null
          ? useMachinesModelStore().job.file!.thumbnails.slice()
          : []
      thumbnails.sort((a, b) => b.width * b.height - a.width * a.height) // return biggest thumbnails first
      return thumbnails
    },
    validThumbnails(): Array<ThumbnailInfo> {
      return this.thumbnails.filter((thumbnail) => !!thumbnail.data)
    },
  },
  watch: {
    isPrinting(to: boolean) {
      if (to) {
        this.isSimulating = useMachinesModelStore().state.status === MachineStatus.simulating
      } else {
        this.isSimulating = false
      }
    },
  },
  mounted() {
    this.isSimulating = useMachinesModelStore().state.status === MachineStatus.simulating
  },
})
</script>
