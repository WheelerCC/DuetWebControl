<template>
  <div class="grid grid-cols-3 content-center" :class="!machinePosition ? 'large-font' : ''">
    <div
      class="flex flex-col content-center"
      v-for="(axis, index) in visibleAxes"
      :key="axis.letter"
    >
      <span
        v-if="machinePosition"
        class="axis-span"
        :class="
          index >= 0 && index < sensors.endstops.length && sensors.endstops[index]?.triggered
            ? 'font-bold'
            : 'font-normal'
        "
      >
        {{ axis.letter }}
      </span>
      <div v-if="machinePosition">
        {{ displayAxisPosition(axis, machinePosition) }}
      </div>
      <div v-else>
        <div class="flex flex-row">
          <div class="flex flex-col">
            <span
              class="fill-height axis-span"
              align-content-center
              :style="{
                overflow: 'hidden',
                'font-size': '2vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }"
            >
              {{ axis.letter }}
            </span>
          </div>
          <div class="flex flex-col">
            <span
              :style="{
                overflow: 'hidden',
                'font-size': '0.8vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                fontFamily: 'monospace',
              }"
            >
              {{ displayAxisPosition(axis, true) }}
            </span>
            <span
              :style="{
                overflow: 'hidden',
                'font-size': '0.8vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                fontFamily: 'monospace',
              }"
            >
              {{ `-${displayWCSOffset(axis, currentWorkOffset)}` }}
            </span>
            <span
              :style="{
                overflow: 'hidden',
                'font-size': '0.8vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                fontFamily: 'monospace',
              }"
            >
              {{ displayToolOffset(currentTool, index) }}
            </span>
          </div>
          <div class="flex flex-col">
            <span
              class="fill-height"
              align-content-center
              :style="{
                overflow: 'hidden',
                'font-size': '3vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '20px',
                fontWeight: 'lighter',
                fontFamily: 'monospace',
              }"
            >
              {{ displayAxisPosition(axis, machinePosition) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { displayAxisPosition, displayToolOffset, displayWCSOffset } from '@/utils/display'
import { Axis, Tool } from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
const { darkTheme } = storeToRefs(useSettingsStore())
const { move, state, tools, sensors } = storeToRefs(useMachinesModelStore())
const props = defineProps({
  machinePosition: {
    type: Boolean,
    required: true,
  },
})

const visibleAxes = computed(() => {
  return move.value.axes.filter((axis) => axis.visible) as Axis[]
})

const currentTool = computed(() => {
  return tools[state.value.currentTool] as Tool | null
})

const currentWorkOffset = computed(() => {
  return move.value.workplaceNumber
})
</script>
