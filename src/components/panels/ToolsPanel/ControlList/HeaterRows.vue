<template>
  <template v-if="singleControl && firstHeater !== null">
    <!-- Single Heater Control-->

    <!-- Heater item name -->
    HELLO HELLO
    <v-menu bottom offset-y :disabled="disabled">
      <template #activator="{ props }">
        <a v-bind="props" href="javascript:void(0)" :classes="{ disabled: disabled }">
          {{ singleHeaterCaption }}
          <ChevronDown :size="18" />
        </a>
      </template>
      <v-list>
        <div @click="selectHeater(-1, null, -1)">
          <component :is="props.type === 'bed' ? HeaterIcon : AirVentIcon" />

          {{ props.type === 'bed' ? $t('panel.tools.allBeds') : $t('panel.tools.allChambers') }}
        </div>

        <template v-for="{ heater, heaterIndex, index } in heaterItems">
          <div
            v-if="heater !== null"
            :key="index"
            @click="selectHeater(index, heater, heaterIndex)"
          >
            <component :is="props.type === 'bed' ? HeaterIcon : AirVentIcon" />

            {{
              props.type === 'bed'
                ? $t('panel.tools.bed', [index])
                : $t('panel.tools.chamber', [index])
            }}
          </div>
        </template>
      </v-list>
    </v-menu>

    <!-- Heater name -->
    <th v-if="selectedHeater !== null">
      <a
        href="javascript:void(0)"
        :class="getHeaterClasses(selectedHeaterIndex)"
        @click="heaterClick(selectedIndex, selectedHeater)"
      >
        {{ getHeaterName(selectedHeater, selectedHeaterIndex) }}
      </a>
      <br />
      <span class="font-weight-regular caption">
        {{ $t(`generic.heaterStates.${selectedHeater.state}`) }}
      </span>
    </th>
    <th v-else>
      <a href="javascript:void(0)" @click="allHeatersClick">
        {{ $t(`generic.heaterStates.${firstHeater.state}`) }}
      </a>
    </th>

    <!-- Heater value -->
    <td>
      {{ getHeaterValue(firstHeater) }}
    </td>

    <!-- Heater active -->
    <td class="pl-2 pr-1">
      <ControlInput
        type="all"
        :control-beds="type === 'bed' && useMachinesSettingsStore().singleBedControl"
        :control-chambers="type == 'chamber' && useMachinesSettingsStore().singleChamberControl"
        active
      />
    </td>

    <!-- Heater standby -->
    <td class="pl-1 pr-2">
      <ControlInput
        type="all"
        :control-beds="type === 'bed' && useMachinesSettingsStore().singleBedControl"
        :control-chambers="type == 'chamber' && useMachinesSettingsStore().singleChamberControl"
        standby
      />
    </td>
  </template>
  <template v-else-if="heaterItems.some((item) => item.heater !== null)">
    <template v-for="{ index, heater, heaterIndex } in heaterItems" :key="`tool-${heaterIndex}`">
      <!-- Individual Heater Control-->
      <template v-if="heater !== null">
        <!-- Heater -->
        <!-- Heater item name -->
        <a
          :key="`heater-${index}-${heaterIndex}`"
          href="javascript:void(0)"
          class="flex flex-row gap-1 items-center justify-center"
          :class="{ disabled: disabled }"
          @click="heaterClick(index, heater)"
        >
          <component :is="props.type === 'bed' ? HeaterIcon : AirVentIcon" :size="14" />

          {{
            props.type === 'bed'
              ? $t('panel.tools.bed', [heaterItems.length === 1 ? '' : index])
              : $t('panel.tools.chamber', [heaterItems.length === 1 ? '' : index])
          }}
        </a>

        <!-- Heater name -->
        <div class="text-center flex flex-col justify-center">
          <a
            class="text-nowrap font-semibold"
            :style="{ color: getHeaterClasses(heaterIndex) }"
            href="javascript:void(0)"
            @click="heaterClick(index, heater)"
          >
            {{ getHeaterName(heater, heaterIndex) }}
          </a>

          <span class="text-xs">
            {{ $t(`generic.heaterStates.${heater.state}`) }}
          </span>
        </div>

        <!-- Heater value -->
        <div class="text-center flex flex-col justify-center">
          {{ getHeaterValue(heater) }}
        </div>

        <!-- Heater active -->
        <ControlInput :type="props.type" :index="index" active />

        <!-- Heater standby -->
        <ControlInput :type="props.type" :index="index" standby />
      </template>
    </template>
  </template>
</template>

<script setup lang="ts">
import { Heater, HeaterState, MachineStatus } from '@duet3d/objectmodel'
import { computed, PropType, ref } from 'vue'

import ControlInput from '@/components/inputs/ControlInput.vue'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { getHeaterColor } from '@/utils/colors'
import { displaySensorValue } from '@/utils/display'
import { AirVentIcon, ChevronDown, HeaterIcon } from 'lucide-vue-next'
import { WritableDeep } from 'type-fest'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  type: {
    type: String as PropType<'bed' | 'chamber'>,
    default: null,
  },
})

const emit = defineEmits<{
  (e: 'resetHeaterFault', heater: number): void
}>()

const disabled = computed(() => {
  return (
    useRootStore().uiFrozen ||
    [MachineStatus.pausing, MachineStatus.processing, MachineStatus.resuming].includes(
      useMachinesModelStore().state.status,
    )
  )
})

// Settings
const singleControl = computed(() => {
  return props.type === 'bed'
    ? useMachinesSettingsStore().singleBedControl
    : useMachinesSettingsStore().singleChamberControl
})

// Heater abstraction
const heaterItems = computed(() => {
  const heaterIndices =
    props.type === 'bed'
      ? useMachinesModelStore().heat.bedHeaters
      : useMachinesModelStore().heat.chamberHeaters
  const heaterList: {
    index: number
    heater: Heater | WritableDeep<Heater>
    heaterIndex: number
  }[] = []
  for (let index = 0; index < heaterIndices.length; index++) {
    const heaterIndex = heaterIndices[index]
    if (heaterIndex >= 0 && heaterIndex < useMachinesModelStore().heat.heaters.length) {
      const heater = useMachinesModelStore().heat.heaters[heaterIndex]
      if (heater !== null) {
        heaterList.push({
          index,
          heater,
          heaterIndex,
        })
      }
    }
  }
  return heaterList
})
const firstHeater = computed(() =>
  heaterItems.value.length > 0 ? heaterItems.value[0].heater : null,
)

// Single heater control
const selectedIndex = ref(-1),
  selectedHeater = ref<Heater | WritableDeep<Heater> | null>(null),
  selectedHeaterIndex = ref(-1)

function selectHeater(
  index: number,
  heater: Heater | WritableDeep<Heater> | null,
  heaterIndex: number,
) {
  selectedIndex.value = index
  selectedHeater.value = heater
  selectedHeaterIndex.value = heaterIndex
}

const singleHeaterCaption = computed(() => {
  if (selectedHeater.value === null) {
    return props.type === 'bed'
      ? useI18n().t('panel.tools.beds')
      : useI18n().t('panel.tools.chambers')
  }
  return props.type === 'bed'
    ? useI18n().t('panel.tools.bed', [''])
    : useI18n().t('panel.tools.chamber', [''])
})

async function allHeatersClick() {
  if (disabled.value) {
    return
  }

  // Get valid indices
  const heaters =
    props.type === 'bed'
      ? useMachinesModelStore().heat.bedHeaters
      : useMachinesModelStore().heat.chamberHeaters
  const indices: Array<number> = []
  for (let index = 0; index < heaters.length; index++) {
    const heaterIndex = heaters[index]
    if (heaterIndex >= 0 && heaterIndex < useMachinesModelStore().heat.heaters.length) {
      const bedHeater = useMachinesModelStore().heat.heaters[heaterIndex]
      if (bedHeater !== null) {
        indices.push(index)

        // Since there is no dedicate facility for resetting heater faults, check all bed heaters here
        if (bedHeater.state === HeaterState.fault) {
          emit('resetHeaterFault', heaterIndex)
          return
        }
      }
    }
  }

  // Control heaters depending on the state of the first heater
  if (firstHeater.value !== null) {
    if (props.type === 'bed') {
      switch (firstHeater.value.state) {
        case HeaterState.off: // Off -> Active
          await useMachinesStore().sendCode(
            indices.map((index) => `M140 P${index} S${firstHeater.value!.active}`).join('\n'),
          )
          break

        case HeaterState.standby: // Standby -> Off
          await useMachinesStore().sendCode(
            indices.map((index) => `M140 P${index} S-273.15`).join('\n'),
          )
          break

        case HeaterState.active: // Active -> Standby
          await useMachinesStore().sendCode(indices.map((index) => `M144 P${index}\n`).join('\n'))
          break

        // Faults are handled before we get here
      }
    } else {
      switch (firstHeater.value.state) {
        case HeaterState.off: // Off -> Active
          await useMachinesStore().sendCode(
            indices.map((index) => `M141 P${index} S${firstHeater.value!.active}`).join('\n'),
          )
          break

        // Standby mode for chambers is not officially supported yet (there is no code for standby control)

        default: // Active -> Off
          await useMachinesStore().sendCode(
            indices.map((index) => `M141 P${index} S-273.15`).join('\n'),
          )
          break

        // Faults are handled before we get here
      }
    }
  }
}

// Individual heater control
function getHeaterClasses(heater: number) {
  return getHeaterColor(heater, getComputedStyle(document.body))
}

function getHeaterName(heater: Heater | WritableDeep<Heater> | null, heaterIndex: number) {
  if (
    heater !== null &&
    heater.sensor >= 0 &&
    heater.sensor < useMachinesModelStore().sensors.analog.length
  ) {
    const sensor = useMachinesModelStore().sensors.analog[heater.sensor]
    if (sensor !== null && sensor.name) {
      const matches = /(.*)\[(.*)\]$/.exec(sensor.name)
      if (matches) {
        return matches[1]
      }
      return sensor.name
    }
  }
  return useI18n().t('panel.tools.heater', [heaterIndex])
}

function getHeaterValue(heater: Heater | WritableDeep<Heater> | null) {
  if (
    heater !== null &&
    heater.sensor >= 0 &&
    heater.sensor < useMachinesModelStore().sensors.analog.length
  ) {
    const sensor = useMachinesModelStore().sensors.analog[heater.sensor]
    if (sensor !== null) {
      return displaySensorValue(sensor)
    }
  }
  return useI18n().t('generic.noValue')
}

async function heaterClick(index: number, heater: Heater | WritableDeep<Heater> | null) {
  if (disabled.value || !heater) {
    return
  }

  if (props.type === 'bed') {
    switch (heater.state) {
      case HeaterState.off: // Off -> Active
        await useMachinesStore().sendCode(`M140 P${index} S${heater.active}`)
        break

      case HeaterState.standby: // Standby -> Off
        await useMachinesStore().sendCode(`M140 P${index} S-273.15`)
        break

      case HeaterState.active: // Active -> Standby
        await useMachinesStore().sendCode(`M144 P${index}`)
        break

      case HeaterState.fault: // Fault -> Ask for reset
        emit('resetHeaterFault', useMachinesModelStore().heat.heaters.indexOf(heater))
        break
    }
  } else {
    switch (heater.state) {
      case HeaterState.off: // Off -> Active
        await useMachinesStore().sendCode(`M141 P${index} S${heater.active}`)
        break

      // Standby mode for chambers is not officially supported yet (there is no code for standby control)

      case HeaterState.fault: // Fault -> Ask for reset
        emit('resetHeaterFault', useMachinesModelStore().heat.heaters.indexOf(heater))
        break

      default: // Active -> Off
        await useMachinesStore().sendCode(`M141 P${index} S-273.15`)
        break
    }
  }
}
</script>

<style scoped>
.disabled {
  color: inherit;
  cursor: default;
}

.disabled-heater {
  cursor: default;
}

.disabled:hover,
.disabled-heater {
  text-decoration: none;
}
</style>
