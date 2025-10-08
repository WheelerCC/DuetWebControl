<template>
  <v-menu v-model="dropdownShown" left offset-y :close-on-content-click="false">
    <template #activator="{ on }">
      <a href="javascript:void(0)" v-on="on">
        <v-icon small>mdi-menu-down</v-icon>
        {{ $t('panel.tools.controlHeaters') }}
      </a>
    </template>

    <v-card>
      <v-layout justify-center column class="pt-2 pb-3 px-2">
        <v-btn
          block
          color="primary"
          class="mb-3 pa-2"
          :disabled="!canTurnEverythingOff"
          @click="turnEverythingOff"
        >
          <v-icon class="mr-1"> mdi-power-standby </v-icon>
          {{ $t('panel.tools.turnEverythingOff') }}
        </v-btn>

        <v-divider class="mb-2" />

        <control-input
          :label="$t('panel.tools.setActiveTemperatures')"
          type="all"
          :control-tools="controlTools"
          :control-beds="controlBeds"
          :control-chambers="controlChambers"
          active
        />
        <control-input
          :label="$t('panel.tools.setStandbyTemperatures')"
          type="all"
          :control-tools="controlTools"
          :control-beds="controlBeds"
          :control-chambers="controlChambers"
          standby
        />

        <v-switch
          v-show="hasTools"
          v-model="controlTools"
          hide-details
          class="mx-1 mt-0"
          :label="$t('panel.tools.setToolTemperatures')"
        />
        <v-switch
          v-show="hasBeds"
          v-model="controlBeds"
          hide-details
          class="mx-1"
          :label="$t('panel.tools.setBedTemperatures')"
        />
        <v-switch
          v-show="hasChambers"
          v-model="controlChambers"
          hide-details
          class="mx-1"
          :label="$t('panel.tools.setChamberTemperatures')"
        />
      </v-layout>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { HeaterState } from '@duet3d/objectmodel'
import { computed, ref } from 'vue'

import i18n from '@/i18n'

import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import { log, LogType } from '@/utils/logging'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useRootStore } from '@/stores'
import { useMachinesStore } from '@/stores/machines'

const dropdownShown = ref(false)

// Turn everything off
const canTurnEverythingOff = computed(() => {
  const heaters = useMachinesModelStore().heat.heaters,
    tools = useMachinesModelStore().tools
  const bedHeaters = useMachinesModelStore().heat.bedHeaters,
    chamberHeaters = useMachinesModelStore().heat.chamberHeaters
  return (
    (!useRootStore().uiFrozen &&
      tools.some(
        (tool) =>
          tool !== null &&
          tool.heaters.some(
            (toolHeater) =>
              toolHeater >= 0 &&
              toolHeater < heaters.length &&
              heaters[toolHeater] !== null &&
              heaters[toolHeater]!.state !== HeaterState.off,
          ),
      )) ||
    bedHeaters.some(
      (bedHeater) =>
        bedHeater >= 0 &&
        bedHeater < heaters.length &&
        heaters[bedHeater] !== null &&
        heaters[bedHeater]!.state !== HeaterState.off,
    ) ||
    chamberHeaters.some(
      (chamberHeater) =>
        chamberHeater >= 0 &&
        chamberHeater < heaters.length &&
        heaters[chamberHeater] !== null &&
        heaters[chamberHeater]!.state !== HeaterState.off,
    )
  )
})

const turningEverythingOff = ref(false)
async function turnEverythingOff() {
  let code = ''
  for (const tool of useMachinesModelStore().tools) {
    if (tool !== null && tool.heaters.length > 0) {
      code += `M568 P${tool.number} A0\n`
    }
  }
  useMachinesModelStore().heat.bedHeaters.forEach((bedHeater, index) => {
    if (bedHeater >= 0 && bedHeater < useMachinesModelStore().heat.heaters.length) {
      code += `M140 P${index} S-273.15\n`
    }
  })
  useMachinesModelStore().heat.chamberHeaters.forEach((chamberHeater, index) => {
    if (chamberHeater >= 0 && chamberHeater < useMachinesModelStore().heat.heaters.length) {
      code += `M141 P${index} S-273.15\n`
    }
  })

  turningEverythingOff.value = true
  try {
    await useMachinesStore().sendCode(code)
  } catch (e) {
    if (!(e instanceof DisconnectedError)) {
      log(LogType.error, i18n.t('error.turnOffEverythingFailed'), getErrorMessage(e))
    }
  }
  turningEverythingOff.value = false
}

// Temperature control for Tools / Beds / Chambers
const hasTools = computed(() => useMachinesModelStore().tools.some((tool) => tool !== null))
const controlTools = ref(true)

const hasBeds = computed(() =>
  useMachinesModelStore().heat.bedHeaters.some(
    (bedHeater) =>
      bedHeater >= 0 &&
      bedHeater < useMachinesModelStore().heat.heaters.length &&
      useMachinesModelStore().heat.heaters[bedHeater] !== null,
  ),
)
const controlBeds = ref(false)

const hasChambers = computed(() =>
  useMachinesModelStore().heat.chamberHeaters.some(
    (chamberHeater) =>
      chamberHeater >= 0 &&
      chamberHeater < useMachinesModelStore().heat.heaters.length &&
      useMachinesModelStore().heat.heaters[chamberHeater] !== null,
  ),
)
const controlChambers = ref(false)
</script>
