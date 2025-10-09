<template>
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
            @change="toggleExtraVisibility(extraSensor.index)"
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
  <v-alert v-else :value="true" type="info">
    {{ $t('panel.tools.extra.noItems') }}
  </v-alert>
</template>

<script setup lang="ts">
import { getExtraColor } from '@/utils/colors'
import { displaySensorValue } from '@/utils/display'
import { AnalogSensor } from '@duet3d/objectmodel'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface ExtraSensor {
  sensor: AnalogSensor
  index: number
}

const extraSensors = computed<Array<ExtraSensor>>(() => {
  const heaters = useMachinesModelStore().heat.heaters
  return useMachinesModelStore()
    .sensors.analog.map((sensor, index) => ({
      sensor,
      index,
    }))
    .filter(
      ({ sensor, index }) =>
        sensor !== null && !heaters.some((heater) => heater !== null && heater.sensor === index),
    ) as Array<ExtraSensor>
})

const displayedExtraTemperatures = computed(
  () => useMachinesSettingsStore().displayedExtraTemperatures,
)

function toggleExtraVisibility(sensor: number) {
  store.commit('machine/settings/toggleExtraVisibility', sensor)
}

const uiFrozen = computed<boolean>(() => useRootStore().uiFrozen)

function formatExtraName(sensor: { sensor: AnalogSensor; index: number }) {
  if (sensor.sensor.name) {
    const matches = /(.*)\[(.*)\]$/.exec(sensor.sensor.name)
    if (matches) {
      return matches[1]
    }
    return sensor.sensor.name
  }
  return useI18n().t('panel.tools.extra.sensorIndex', [sensor.index])
}
</script>

<style scoped>
table {
  width: 100%;
  border-spacing: 0;
}

table td,
table th {
  text-align: center;
}
</style>
