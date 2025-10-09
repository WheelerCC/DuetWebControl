<template>
  <v-card>
    <v-card-title class="pb-1">
      <v-icon small class="mr-1"> mdi-clock </v-icon>
      {{ $t('panel.jobEstimations.caption') }}
    </v-card-title>

    <v-card-text class="text-center pb-2">
      <v-row dense>
        <v-col v-if="timesLeft.filament !== null" class="d-flex flex-column">
          <strong>
            {{ $t('panel.jobEstimations.filament') }}
          </strong>
          <span>
            {{ $displayTime(timesLeft.filament) }}
          </span>
        </v-col>

        <v-col class="d-flex flex-column">
          <strong>
            {{ $t('panel.jobEstimations.file') }}
          </strong>
          <span>
            {{ $displayTime(timesLeft.file) }}
          </span>
        </v-col>

        <v-col v-if="slicerTimeLeft !== null" class="d-flex flex-column">
          <strong>
            {{ $t('panel.jobEstimations.slicer') }}
          </strong>
          <span>
            {{ $displayTime(slicerTimeLeft) }}
          </span>
        </v-col>

        <v-col v-if="timesLeft.toPause !== null" class="d-flex flex-column">
          <strong>
            {{ $t('panel.jobEstimations.toPause') }}
          </strong>
          <span>
            {{ $displayTime(timesLeft.toPause) }}
          </span>
        </v-col>

        <v-col v-if="simulationTime !== null" class="d-flex flex-column">
          <strong>
            {{ $t('panel.jobEstimations.simulation') }}
          </strong>
          <span>
            {{ $displayTime(simulationTime) }}
          </span>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { MachineStatus, TimesLeft } from '@duet3d/objectmodel'

import { useMachinesModelStore } from '@/stores/machineModel'
import { isPrinting } from '@/utils/enums'

import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      isSimulating: false,
    }
  },
  computed: {
    isPrinting(): boolean {
      return isPrinting(useMachinesModelStore().state.status)
    },
    timesLeft(): TimesLeft {
      return useMachinesModelStore().job.timesLeft
    },
    slicerTimeLeft(): number | null {
      if (useMachinesModelStore().job.timesLeft.slicer !== null) {
        return useMachinesModelStore().job.timesLeft.slicer
      }
      if (
        useMachinesModelStore().job.file !== null &&
        useMachinesModelStore().job.duration !== null &&
        useMachinesModelStore().job.file?.printTime != null
      ) {
        return this.isPrinting
          ? Math.max(
              0,
              (useMachinesModelStore().job.file!.printTime as number) -
                useMachinesModelStore().job.duration!,
            )
          : (useMachinesModelStore().job.file!.printTime as number)
      }
      return null
    },
    simulationTime(): number | null {
      if (
        !this.isSimulating &&
        useMachinesModelStore().job.file !== null &&
        useMachinesModelStore().job.file!.simulatedTime !== null &&
        useMachinesModelStore().job.duration != null
      ) {
        return this.isPrinting
          ? Math.max(
              0,
              (useMachinesModelStore().job.file!.simulatedTime as number) -
                useMachinesModelStore().job.duration!,
            )
          : (useMachinesModelStore().job.file!.simulatedTime as number)
      }
      return null
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
