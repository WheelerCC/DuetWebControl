<template>
  <v-card>
    <v-card-title>
      <v-icon>mdi-45hammer-screwdriver</v-icon>
      {{ $t('panel.spindle.title') }}
    </v-card-title>
    <v-card-text>
      <v-simple-table>
        <thead>
          <th>
            {{ $t('panel.spindle.spindle') }}
          </th>
          <th>
            {{ $t('panel.spindle.active') }}
          </th>
          <th v-show="hasReverseableSpindle">
            {{ $t('panel.spindle.direction') }}
          </th>
          <th>
            {{ $t('panel.spindle.currentRPM') }}
          </th>
          <th>
            {{ $t('panel.spindle.setRPM') }}
          </th>
        </thead>
        <tbody>
          <template v-for="(spindle, index) in spindles">
            <tr
              v-if="spindle !== null && isConfigured(spindle)"
              :key="index"
              :class="{ 'spindle-active': (spindle.current ?? 0) > 0 && (spindle.active ?? 0) > 0 }"
            >
              <td>
                {{ getName(index) }}
              </td>
              <td>
                <v-btn v-if="isActive(spindle)" block @click="spindleOff(index)">
                  {{ $t('panel.spindle.on') }}
                </v-btn>
                <v-btn v-else block @click="spindleOn(index)">
                  {{ $t('panel.spindle.off') }}
                </v-btn>
              </td>
              <td v-show="hasReverseableSpindle">
                <v-btn-toggle
                  v-show="hasReverseableSpindle && spindle.canReverse"
                  v-model="spindleDirections[index]"
                  mandatory
                >
                  <v-btn>
                    {{ $t('panel.spindle.forward') }}
                  </v-btn>
                  <v-btn>
                    {{ $t('panel.spindle.reverse') }}
                  </v-btn>
                </v-btn-toggle>
              </td>
              <td>
                {{ spindle.current }}
              </td>
              <td>
                <v-combobox
                  :items="getValidRpm(spindle)"
                  :value="spindle.active"
                  @input="setActiveRPM(index, $event)"
                />
              </td>
            </tr>
          </template>
        </tbody>
      </v-simple-table>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { Spindle, SpindleState } from '@duet3d/objectmodel'
import Vue from 'vue'

export default Vue.extend({
  data: function () {
    return {
      spindleDirections: {} as Record<number, number>,
    }
  },
  computed: {
    spindles(): Array<Spindle | null> {
      return useMachinesModelStore().spindles
    },
    hasReverseableSpindle(): boolean {
      return this.spindles.some((spindle) => spindle?.canReverse)
    },
  },
  watch: {
    spindles: {
      deep: true,
      handler() {
        this.updateSpindleDirections()
      },
    },
  },
  mounted() {
    this.updateSpindleDirections()
  },
  methods: {
    getName(spindleIndex: number) {
      return `${this.$t('panel.spindle.spindle')} ${spindleIndex}`
    },
    isConfigured(spindle: Spindle) {
      return spindle.state !== SpindleState.unconfigured
    },
    isActive(spindle: Spindle) {
      return spindle.state == SpindleState.forward || spindle.state == SpindleState.reverse
    },
    async setActiveRPM(spindleIndex: number, value: number) {
      await useMachinesStore().sendCode(
        `${this.spindleDirections[spindleIndex] ? 'M4' : 'M3'} P${spindleIndex} S${value}`,
      )
    },
    async spindleOn(spindleIndex: number) {
      await useMachinesStore().sendCode(
        `${this.spindleDirections[spindleIndex] ? 'M4' : 'M3'} P${spindleIndex} S${this.spindles[spindleIndex]!.active}`,
      )
    },
    async spindleOff(spindleIndex: number) {
      await useMachinesStore().sendCode(`M5 P${spindleIndex}`)
    },
    getValidRpm(spindle: Spindle) {
      if (spindle.min === null || spindle.max === null) {
        return []
      }

      const rpmValues = useMachinesSettingsStore().spindleRPM.filter(
        (rpm) => rpm >= spindle.min! && rpm <= spindle.max!,
      )
      if (!rpmValues.includes(0)) {
        rpmValues.push(0)
      }
      rpmValues.sort((a, b) => a - b)
      return rpmValues
    },
    updateSpindleDirections() {
      for (let i = 0; i < this.spindles.length; i++) {
        const spindle = this.spindles[i]
        switch (spindle?.state) {
          case SpindleState.forward:
            Vue.set(this.spindleDirections, i, 0)
            break
          case SpindleState.reverse:
            Vue.set(this.spindleDirections, i, 1)
            break
        }
      }
    },
  },
})
</script>

<style scoped lang="scss">
tbody {
  tr:hover {
    background-color: transparent !important;
  }
}

td {
  text-align: center;
  vertical-align: middle;
}

.spindle-active {
  background-color: #00bb00;
}

.spindle-on {
  animation: spindle-on-pulse 5s infinite;
}

.show {
  visibility: visible;
}

.hide {
  visibility: hidden;
}

@keyframes spindle-on-pulse {
  0% {
    background-color: #00aa00;
  }

  50% {
    background-color: #00ff00;
  }

  100% {
    background-color: #00aa00;
  }
}
</style>
