<template>
  <Tabs default-value="default" class="w-full">
    <div class="flex flex-row gap-2">
      <TabsList class="grid w-full grid-cols-2">
        <TabsTrigger value="default">
          <WrenchIcon :size="18" />
          {{ $t('panel.tools.caption') }}
        </TabsTrigger>
        <TabsTrigger value="extra">
          <PlusIcon :size="18" />
          {{ $t('panel.tools.extra.caption') }}
        </TabsTrigger>
      </TabsList>
      <Popover>
        <PopoverTrigger as-child>
          <Button variant="outline"> {{ $t('panel.tools.controlHeaters') }} </Button>
        </PopoverTrigger>
        <PopoverContent class="w-60">
          <ControlAllDropdown />
        </PopoverContent>
      </Popover>
    </div>

    <TabsContent value="default">
      <Card class="rounded-md">
        <CardContent class="overflow-hidden">
          <div
            v-if="hasTools || hasBeds || hasChambers"
            class="w-full grid gap-2"
            style="grid-template-columns: repeat(5, auto)"
          >
            <div class="text-center">
              {{ $t('panel.tools.tool', ['']) }}
            </div>
            <div class="text-center">
              {{ $t('panel.tools.heater', ['']) }}
            </div>
            <div class="text-center">
              {{ $t('panel.tools.current', ['']) }}
            </div>
            <div class="text-center">
              {{ $t('panel.tools.active') }}
            </div>
            <div class="text-center">
              {{ $t('panel.tools.standby') }}
            </div>

            <!-- Tools -->
            <ToolRows @resetHeaterFault="resetHeaterFault" />

            <!-- Divider -->
            <div class="col-span-full" v-if="hasTools && hasBeds">
              <Separator />
            </div>

            <!-- Beds -->
            <HeaterRows type="bed" @resetHeaterFault="resetHeaterFault" />

            <!-- Divider -->
            <div class="col-span-full" v-if="(hasTools || hasBeds) && hasChambers">
              <Separator />
            </div>

            <!-- Chambers -->
            <HeaterRows type="chamber" @resetHeaterFault="resetHeaterFault" />
          </div>

          <Alert v-else variant="destructive">
            {{ $t('panel.tools.noTools') }}
          </Alert>

          <!-- Heater faults-->
          <ResetHeaterFaultDialog
            v-model:shown="resettingHeaterFault"
            :heater="faultyHeaterToReset"
          />
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="extra">
      <Card class="rounded-md">
        <CardContent class="space-y-2">
          <table v-if="extraSensors.length > 0" class="ml-2 mr-2">
            <colgroup>
              <col style="width: 50%" />
              <col style="width: 25%" />
              <col style="width: 25%" />
            </colgroup>
            <thead>
              <tr>
                <th class="hidden-sm-and-down" />
                <th>
                  {{ $t('panel.tools.extra.sensor') }}
                </th>
                <th>
                  {{ $t('panel.tools.extra.value') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="extraSensor in extraSensors" :key="`extra-${extraSensor.index}`">
                <td class="hidden-sm-and-down">
                  <v-switch
                    class="ml-3"
                    :input-value="displayedExtraTemperatures.indexOf(extraSensor.index) !== -1"
                    :label="$t('panel.tools.extra.showInChart')"
                    :disabled="uiFrozen"
                    @change="useMachinesSettingsStore().toggleExtraVisibility(extraSensor.index)"
                  />
                </td>
                <th class="py-2" :class="getExtraColor(extraSensor.index)">
                  {{ formatExtraName(extraSensor) }}
                </th>
                <td class="py-2">
                  {{ displaySensorValue(extraSensor.sensor) }}
                </td>
              </tr>
            </tbody>
          </table>
          <Alert v-else variant="destructive">
            {{ $t('panel.tools.extra.noItems') }}
          </Alert>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ControlAllDropdown from './ControlAllDropdown.vue'

import { Alert } from '@/components/ui/alert'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { getExtraColor } from '@/utils/colors'
import { displaySensorValue } from '@/utils/display'
import { AnalogSensor } from '@duet3d/objectmodel'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ResetHeaterFaultDialog from '@/components/dialogs/ResetHeaterFaultDialog.vue'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { PlusIcon, WrenchIcon } from 'lucide-vue-next'
import { ref } from 'vue'
import HeaterRows from './ControlList/HeaterRows.vue'
import ToolRows from './ControlList/ToolRows.vue'
// import HeaterRows from './HeaterRows.vue'
// import ToolRows from './ToolRows.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// General appearance
const hasTools = computed(() => useMachinesModelStore().tools.some((tool) => tool !== null))
const hasBeds = computed(() =>
  useMachinesModelStore().heat.bedHeaters.some(
    (bedHeater) =>
      bedHeater >= 0 &&
      bedHeater < useMachinesModelStore().heat.heaters.length &&
      useMachinesModelStore().heat.heaters[bedHeater] !== null,
  ),
)
const hasChambers = computed(() =>
  useMachinesModelStore().heat.chamberHeaters.some(
    (chamberHeater) =>
      chamberHeater >= 0 &&
      chamberHeater < useMachinesModelStore().heat.heaters.length &&
      useMachinesModelStore().heat.heaters[chamberHeater] !== null,
  ),
)

// Bed control
const bedHeaters = computed(() => useMachinesModelStore().heat.bedHeaters)
const singleBedControl = computed<boolean>(() => useMachinesSettingsStore().singleBedControl)

// Chamber control
const chamberHeaters = computed(() => useMachinesModelStore().heat.chamberHeaters)

// Heater fault management
const resettingHeaterFault = ref(false),
  faultyHeaterToReset = ref(-1)
function resetHeaterFault(heater: number) {
  faultyHeaterToReset.value = heater
  resettingHeaterFault.value = true
}

interface ExtraSensor {
  sensor: AnalogSensor
  index: number
}
let { t } = useI18n()
let { heat, sensors } = storeToRefs(useMachinesModelStore())
let { displayedExtraTemperatures } = storeToRefs(useMachinesSettingsStore())
let { uiFrozen } = storeToRefs(useRootStore())
const extraSensors = computed<Array<ExtraSensor>>(() => {
  const heaters = heat.value.heaters
  return sensors.value.analog
    .map((sensor, index) => ({
      sensor,
      index,
    }))
    .filter(
      ({ sensor, index }) =>
        sensor !== null && !heaters.some((heater) => heater !== null && heater.sensor === index),
    ) as Array<ExtraSensor>
})

function formatExtraName(sensor: { sensor: AnalogSensor; index: number }) {
  if (sensor.sensor.name) {
    const matches = /(.*)\[(.*)\]$/.exec(sensor.sensor.name)
    if (matches) {
      return matches[1]
    }
    return sensor.sensor.name
  }
  return t('panel.tools.extra.sensorIndex', [sensor.index])
}
</script>
