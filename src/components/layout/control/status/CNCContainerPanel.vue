<template>
  <div class="w-full grid grid-cols-1 md:grid-cols-5 gap-2">
    <Card>
      <CardHeader>
        <CardTitle> {{ $t('panel.status.caption') }} </CardTitle>
      </CardHeader>
      <CardContent>
        <StatusLabel />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          {{ t('panel.status.machinePosition') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CNCAxesPosition :machine-position="true" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <CardTitle>
          {{ $t('panel.status.requestedSpeed') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {{ displayMoveSpeed(currentMove.requestedSpeed) }}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          {{ $t('panel.status.topSpeed') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {{ displayMoveSpeed(currentMove.topSpeed) }}
      </CardContent>
    </Card>

    <Card v-if="sensorsPresent">
      <CardHeader>
        <CardTitle>
          {{ $t('panel.status.sensors') }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-row">
          <div v-if="mainboard && mainboard.vIn !== null" class="flex flex-col align-center">
            <strong>
              {{ t('panel.status.vIn') }}
            </strong>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger> {{ display(mainboard.vIn.current, 1, 'V') }}</TooltipTrigger>
                <TooltipContent>
                  <p>
                    {{
                      t('panel.status.minMax', [
                        display(mainboard.vIn.min, 1, 'V'),
                        display(mainboard.vIn.max, 1, 'V'),
                      ])
                    }}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div v-if="mainboard && mainboard.v12 !== null" class="flex flex-col align-center">
            <strong>
              {{ t('panel.status.v12') }}
            </strong>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger> {{ display(mainboard.v12.current, 1, 'V') }}</TooltipTrigger>
                <TooltipContent>
                  <p>
                    {{
                      t('panel.status.minMax', [
                        display(mainboard.v12.min, 1, 'V'),
                        display(mainboard.v12.max, 1, 'V'),
                      ])
                    }}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div v-if="mainboard && mainboard.mcuTemp != null" class="flex flex-col align-center">
            <strong class="text-no-wrap">
              {{ $t('panel.status.mcuTemp') }}
            </strong>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger> {{ display(mainboard.mcuTemp.current, 1, '°C') }}</TooltipTrigger>
                <TooltipContent>
                  <p>
                    {{
                      t('panel.status.minMax', [
                        display(mainboard.mcuTemp.min, 1, '°C'),
                        display(mainboard.mcuTemp.max, 1, '°C'),
                      ])
                    }}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div v-if="fanRPM.length" class="flex flex-col align-center">
            <strong>
              {{ t('panel.status.fanRPM') }}
            </strong>

            <div class="d-flex flex-row">
              <template v-for="(item, index) in fanRPM" :key="index">
                <template v-if="index !== 0"> , </template>
                <span :title="item.name" class="mx-0">{{ item.rpm }}</span>
              </template>
            </div>
          </div>

          <div v-if="probesPresent" class="flex flex-col align-center">
            <strong>
              {{ t('panel.status.probe', probes.length) }}
            </strong>
            <div class="d-flex-inline">
              <template v-for="(probe, index) in probes">
                <span
                  v-if="probe !== null"
                  :key="index"
                  :class="probeSpanClasses(probe, index)"
                  class="pa-1 probe-span"
                >
                  {{ formatProbeValue(probe.value) }}
                </span>
              </template>
            </div>
          </div>

          <div
            v-for="(sensor, index) in analogSensors"
            :key="index"
            class="d-flex flex-column align-center"
          >
            <strong>
              {{ sensor.name }}
            </strong>
            <div class="d-flex-inline">
              <span class="pa-1 probe-span">
                {{ sensor.lastReading }}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card class="col-span-full">
      <CardHeader>
        <CardTitle>
          {{ `${t('panel.status.toolPosition')} / T${state.currentTool}` }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CNCAxesPosition :machine-position="false" />
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { AnalogSensor, AnalogSensorType, Probe, ProbeType } from '@duet3d/objectmodel'

import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { isPrinting } from '@/utils/enums'

import StatusLabel from '@/components/misc/StatusLabel.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { display, displayMoveSpeed } from '@/utils/display'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CNCAxesPosition from './CNCAxesPosition.vue'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const { t } = useI18n()
const { move, boards, sensors, state } = storeToRefs(useMachinesModelStore())
const { darkTheme } = storeToRefs(useSettingsStore())

const currentMove = computed(() => {
  return move.value.currentMove
})

const mainboard = computed(() => {
  return boards.value.find((board) => !board.canAddress)
})

const fanRPM = computed(() => {
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

const probesPresent = computed(() => {
  return sensors.value.probes.some((probe) => probe && probe.type !== ProbeType.none)
})

const probes = computed(() => {
  return sensors.value.probes
})

const sensorsPresent = computed(() => {
  return (
    (mainboard.value &&
      (mainboard.value.vIn !== null ||
        mainboard.value.v12 !== null ||
        mainboard.value.mcuTemp !== null)) ||
    fanRPM.value.length > 0 ||
    probesPresent
  )
})

const analogSensors = computed(() => {
  return sensors.value.analog.filter(
    (sensor) => sensor !== null && sensor.name && sensor.type !== AnalogSensorType.unknown,
  ) as Array<AnalogSensor>
})

function formatProbeValue(values: Array<number>) {
  if (values.length === 1) {
    return values[0]
  }
  return `${values[0]} (${values.slice(1).join(', ')})`
}
function probeSpanClasses(probe: Probe, index: number) {
  let result: Array<string> = []
  if (index && sensors.value.probes.length > 1) {
    result.push('ml-2')
  }
  if (!isPrinting(state.value.status) && probe.value.length > 0) {
    if (probe.value[0] >= probe.threshold) {
      result.push('red')
      result.push(darkTheme ? 'darken-3' : 'lighten-4')
    } else if (probe.value[0] > probe.threshold * 0.9) {
      result.push('orange')
      result.push(darkTheme ? 'darken-2' : 'lighten-4')
    }
  }
  return result
}
</script>
