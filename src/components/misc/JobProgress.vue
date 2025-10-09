<template>
  <v-row dense>
    <v-col cols="12" class="d-flex">
      <span>{{ printStatus }}</span>
      <v-spacer />
      <span>{{ printDetails }}</span>
    </v-col>

    <v-col cols="12">
      <v-progress-linear :value="jobProgress * 100" class="my-1" />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { isPrinting } from '@/utils/enums'
import { extractFileName } from '@/utils/path'
import { MachineMode, MachineStatus } from '@duet3d/objectmodel'

import { display } from '@/utils/display'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      isSimulating: false,
    }
  },
  computed: {
    jobProgress(): number {
      return useMachinesModelStore().jobProgress(null)
    }, // TODO getters???
    status(): MachineStatus {
      return useMachinesModelStore().state.status
    },
    printStatus(): string {
      if (isPrinting(useMachinesModelStore().state.status)) {
        if (this.printFile) {
          const progress = display(this.jobProgress * 100, 1, '%')
          if (this.isSimulating) {
            return this.$t('jobProgress.simulating', [this.printFile, progress])
          }
          if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
            return this.$t('jobProgress.printing', [this.printFile, progress])
          }
          return this.$t('jobProgress.processing', [this.printFile, progress])
        }
        return this.$t('generic.loading')
      } else if (this.lastPrintFile) {
        if (useMachinesModelStore().job.lastFileSimulated) {
          return this.$t('jobProgress.simulated', [this.lastPrintFile])
        }
        if (useMachinesModelStore().state.machineMode === MachineMode.fff) {
          return this.$t('jobProgress.printed', [this.lastPrintFile])
        }
        return this.$t('jobProgress.processed', [this.lastPrintFile])
      }
      return this.$t('jobProgress.noJob')
    },
    printDetails(): string {
      if (!isPrinting(useMachinesModelStore().state.status)) {
        return ''
      }

      let details = ''
      if (
        useMachinesModelStore().job.layer !== null &&
        useMachinesModelStore().job.file?.numLayers
      ) {
        details = this.$t('jobProgress.layer', [
          useMachinesModelStore().job.layer,
          useMachinesModelStore().job.file!.numLayers,
        ])
      }
      if (useMachinesModelStore().move.extruders.length > 0) {
        if (details !== '') {
          details += ', '
        }
        const totalRawExtruded =
          useMachinesModelStore().job.rawExtrusion !== null
            ? useMachinesModelStore().job.rawExtrusion
            : useMachinesModelStore()
                .move.extruders.map((extruder) => extruder.rawPosition)
                .reduce((a, b) => a + b)
        details += this.$t('jobProgress.filament', [display(totalRawExtruded, 1, 'mm')])
        if (
          useMachinesModelStore().job.file !== null &&
          useMachinesModelStore().job.file!.filament.length > 0
        ) {
          const needed = useMachinesModelStore().job.file!.filament.reduce((a, b) => a + b)
          details +=
            ' (' +
            this.$t('jobProgress.filamentRemaining', [
              display(Math.max(needed - totalRawExtruded!, 0), 1, 'mm'),
            ]) +
            ')'
        }
      }
      return details
    },
    printFile() {
      return useMachinesModelStore().job.file?.fileName
        ? extractFileName(useMachinesModelStore().job.file!.fileName)
        : null
    },
    lastPrintFile() {
      return useMachinesModelStore().job.lastFileName !== null
        ? extractFileName(useMachinesModelStore().job.lastFileName!)
        : null
    },
  },
  watch: {
    status(to: MachineStatus) {
      if (to === MachineStatus.simulating) {
        this.isSimulating = true
      } else if (!isPrinting(to)) {
        this.isSimulating = false
      }
    },
  },
  mounted() {
    this.isSimulating = useMachinesModelStore().state.status === MachineStatus.simulating
  },
})
</script>
