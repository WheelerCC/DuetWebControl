<template>
  <CardHeader>
    <CardTitle class="flex flex-row gap-2 items-center">
      <InfoIcon :size="18" />
      {{ $t('panel.status.caption') }}

      <StatusLabel v-if="state.status" class="mx-auto" />

      <span v-if="state.machineMode">
        {{ $t('panel.status.mode', [state.machineMode.toUpperCase()]) }}
      </span>
    </CardTitle>
  </CardHeader>
  <CardContent
    v-if="sensorsPresent || visibleAxes.length + move.extruders.length > 0"
    class="w-full"
  >
    <div class="w-full flex flex-col gap-4">
      <div class="w-full flex flex-row gap-5 items-center" v-if="visibleAxes.length > 0">
        <a
          href="javascript:void(0)"
          @click="displayToolPosition = !displayToolPosition"
          class="mr-auto"
        >
          {{
            $t(displayToolPosition ? 'panel.status.toolPosition' : 'panel.status.machinePosition')
          }}
        </a>

        <div v-for="(axis, index) in visibleAxes" :key="index" class="flex flex-col items-center">
          <span :class="axisSpanClasses(index)">
            {{ axis.letter }}
          </span>
          <span>
            {{ displayAxisPosition(axis, !displayToolPosition) }}
          </span>
        </div>
      </div>

      <Separator v-if="visibleAxes.length > 0" />

      <!-- Extruders -->
      <div v-if="move.extruders.length > 0" class="flex flex-row items-center gap-5">
        <a
          href="javascript:void(0)"
          @click="displayVirtualEPos = !displayVirtualEPos"
          class="mr-auto"
        >
          {{ $t(displayVirtualEPos ? 'panel.status.virtualEPos' : 'panel.status.extruders') }}
        </a>

        <div v-if="displayVirtualEPos">
          {{ display(virtualEPos, 1) }}
        </div>

        <div
          v-else
          v-for="(extruder, index) in move.extruders"
          :key="index"
          class="flex flex-col items-center"
        >
          <strong>
            {{ $t('panel.status.extruderDrive', [index]) }}
            <component
              v-if="isFilamentSensorPresent(index)"
              :is="isFilamentPresent(index) ? CheckIcon : XIcon"
            />
          </strong>
          <span>
            {{ display(extruder.position, 1) }}
          </span>
        </div>
      </div>

      <Separator v-if="visibleAxes.length + move.extruders.length > 0" />

      <!-- Speeds -->
      <div
        v-if="isFinite(move.currentMove.requestedSpeed) || isFinite(move.currentMove.topSpeed)"
        class="flex flex-row items-center gap-5"
      >
        <div class="mr-auto">{{ $t('panel.status.speeds') }}</div>

        <div v-if="isFinite(move.currentMove.requestedSpeed)" class="flex flex-col items-center">
          <strong>
            {{ $t('panel.status.requestedSpeed') }}
          </strong>
          <span class="text-no-wrap">
            {{ displayMoveSpeed(move.currentMove.requestedSpeed) }}
          </span>
        </div>

        <div v-if="isFinite(move.currentMove.topSpeed)" class="flex flex-col items-center">
          <strong>
            {{ $t('panel.status.topSpeed') }}
          </strong>
          <span class="text-no-wrap">
            {{ displayMoveSpeed(move.currentMove.topSpeed) }}
          </span>
        </div>

        <div
          v-if="isFinite(move.currentMove.extrusionRate) && isFFForUnset"
          class="flex flex-col items-center"
        >
          <strong>
            <a href="javascript:void(0)" @click="displayVolumetricFlow = !displayVolumetricFlow">
              {{
                displayVolumetricFlow
                  ? $t('panel.status.volumetricFlow')
                  : $t('panel.status.extrusionRate')
              }}
            </a>
          </strong>
          <span class="text-no-wrap">
            {{
              displayVolumetricFlow
                ? display(volumetricFlow, 1, 'mm³/s')
                : displayMoveSpeed(move.currentMove.extrusionRate)
            }}
          </span>
        </div>
      </div>

      <Separator
        v-if="
          move.axes.length + move.extruders.length > 0 ||
          isFinite(move.currentMove.requestedSpeed) ||
          isFinite(move.currentMove.topSpeed)
        "
      />

      <!-- Sensors -->
      <div v-if="sensorsPresent" class="flex flex-row items-center gap-5">
        <div class="mr-auto">
          {{ $t('panel.status.sensors') }}
        </div>

        <template v-if="mainboard !== null">
          <div v-if="mainboard.vIn !== null" class="flex flex-col items-center">
            <strong>
              {{ $t('panel.status.vIn') }}
            </strong>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="text-no-wrap">
                    {{ display(mainboard.vIn.current, 1, 'V') }}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {{
                    $t('panel.status.minMax', [
                      display(mainboard.vIn.min, 1, 'V'),
                      display(mainboard.vIn.max, 1, 'V'),
                    ])
                  }}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div v-if="mainboard.v12 !== null" class="flex flex-col items-center">
            <strong>
              {{ $t('panel.status.v12') }}
            </strong>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="text-no-wrap">
                    {{ display(mainboard.v12.current, 1, 'V') }}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {{
                    $t('panel.status.minMax', [
                      display(mainboard.v12.min, 1, 'V'),
                      display(mainboard.v12.max, 1, 'V'),
                    ])
                  }}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div v-if="mainboard.mcuTemp !== null" class="flex flex-col items-center">
            <strong class="text-no-wrap">
              {{ $t('panel.status.mcuTemp') }}
            </strong>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger as-child>
                  <span class="text-no-wrap">
                    {{ display(mainboard.mcuTemp.current, 1, '°C') }}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {{
                    $t('panel.status.minMax', [
                      display(mainboard.mcuTemp.min, 1, '°C'),
                      display(mainboard.mcuTemp.max, 1, '°C'),
                    ])
                  }}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </template>

        <div v-if="fanRPM.length > 0" class="flex flex-col items-center">
          <strong>
            {{ $t('panel.status.fanRPM') }}
          </strong>

          <div class="flex flex-row">
            <template v-for="(item, index) in fanRPM" :key="index">
              <template v-if="index !== 0"> , </template>
              <span :title="item.name" class="mx-0">
                {{ item.rpm }}
              </span>
            </template>
          </div>
        </div>

        <div v-if="validProbes.length > 0" class="flex flex-col items-center">
          <strong>
            {{ $t('panel.status.probe', validProbes.length) }}
          </strong>
          <div class="d-flex">
            <span
              v-for="(probe, index) in validProbes"
              :key="index"
              class="pa-1 probe-span"
              :class="probeSpanClasses(probe, index === 0)"
            >
              {{ formatProbeValues(probe.value) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <!-- Axis Positions -->
  </CardContent>

  <CardContent v-else>
    <v-alert :value="true" type="info">
      {{ $t('panel.status.noStatus') }}
    </v-alert>
  </CardContent>
</template>

<script setup lang="ts">
import { Probe, ProbeType } from '@duet3d/objectmodel'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { isPrinting } from '@/utils/enums'

import { display, displayAxisPosition, displayMoveSpeed } from '@/utils/display'
import { CheckIcon, InfoIcon, XIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import StatusLabel from '../misc/StatusLabel.vue'
import { CardContent, CardHeader, CardTitle } from '../ui/card'
import { Separator } from '../ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

let displayToolPosition = ref(true)
let displayVirtualEPos = ref(false)
let displayVolumetricFlow = ref(true)

let { isConnected } = storeToRefs(useRootStore())
let { darkTheme, dashboardMode, isFFForUnset } = storeToRefs(useSettingsStore())
let { move, state, tools, boards, sensors } = storeToRefs(useMachinesModelStore())
let { t } = useI18n()

let virtualEPos = computed(() => {
  return move.value.virtualEPos
})
let volumetricFlow = computed(() => {
  if (state.value.currentTool >= 0 && state.value.currentTool < tools.value.length) {
    const selectedTool = tools.value[state.value.currentTool]
    if (selectedTool !== null) {
      // Get the average extruder diameter x mix ratio
      let numExtruders = 0,
        filamentArea = 0
      for (let i = 0; i < selectedTool.extruders.length; i++) {
        const extruderIndex = selectedTool.extruders[i]
        if (extruderIndex >= 0 && extruderIndex < move.value.extruders.length) {
          const extruder = move.value.extruders[extruderIndex]
          if (extruder !== null) {
            filamentArea +=
              selectedTool.mix[i] * (Math.PI * Math.pow(extruder.filamentDiameter / 2, 2))
            numExtruders++
          }
        }
      }

      // Compute volumetric flow
      if (numExtruders > 0) {
        filamentArea /= numExtruders
        return filamentArea * move.value.currentMove.extrusionRate
      }
    }
  }
  return NaN
})

let fanRPM = computed(() => {
  return useMachinesModelStore()
    .fans.filter((fan) => fan !== null && fan.rpm >= 0)
    .map(
      (fan, index) => ({
        name: fan!.name || t('panel.fan.fan', [index]),
        rpm: fan!.rpm,
      }),
      this,
    )
})
let validProbes = computed(() => {
  return useMachinesModelStore().sensors.probes.filter(
    (probe) => probe !== null && probe.type !== ProbeType.none,
  ) as Array<Probe>
})
let mainboard = computed(() => {
  return boards.value.find((board) => !board.canAddress) ?? null
})
let visibleAxes = computed(() => {
  return move.value.axes.filter((axis) => axis.visible)
})
let sensorsPresent = computed(() => {
  return (
    (mainboard.value !== null &&
      (mainboard.value.vIn !== null ||
        mainboard.value.v12 !== null ||
        mainboard.value.mcuTemp !== null)) ||
    fanRPM.value.length > 0 ||
    validProbes.value.length > 0
  )
})

function axisSpanClasses(axisIndex: number) {
  if (
    axisIndex >= 0 &&
    axisIndex < useMachinesModelStore().sensors.endstops.length &&
    useMachinesModelStore().sensors.endstops[axisIndex]?.triggered
  ) {
    return darkTheme.value ? 'light-green darken-3' : 'light-green lighten-4'
  }
  return null
}
function isFilamentSensorPresent(extruderIndex: number) {
  return (
    extruderIndex >= 0 &&
    extruderIndex < sensors.value.filamentMonitors.length &&
    sensors.value.filamentMonitors[extruderIndex] !== null &&
    sensors.value.filamentMonitors[extruderIndex]!.enabled &&
    typeof (sensors.value.filamentMonitors[extruderIndex] as any).filamentPresent === 'boolean'
  )
}
function isFilamentPresent(extruderIndex: number) {
  return (sensors.value.filamentMonitors[extruderIndex] as any).filamentPresent
}
function formatProbeValues(values: Array<number>) {
  if (values.length === 1) {
    return values[0]
  }
  return `${values[0]} (${values.slice(1).join(', ')})`
}
function isValidProbe(probe: Probe | null) {
  return probe !== null && probe.type !== ProbeType.none
}
function probeSpanClasses(probe: Probe, isFirstItem: boolean) {
  let result: string[] = [] // todo correctly type
  if (!isFirstItem) {
    result.push('ml-2')
  }
  if (!isPrinting(state.value.status) && probe.value.length > 0) {
    if (probe.value[0] >= probe.threshold) {
      result.push('red')
      result.push(darkTheme.value ? 'darken-3' : 'lighten-4')
    } else if (probe.value[0] > probe.threshold * 0.9) {
      result.push('orange')
      result.push(darkTheme.value ? 'darken-2' : 'lighten-4')
    }
  }
  return result
}
</script>
