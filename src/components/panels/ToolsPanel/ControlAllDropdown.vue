<template>
  <!-- TODO Tab key navigation to next dropdown item not working -->
  <!-- TODO prevent closing on click -->

  <div class="flex flex-col gap-2">
    <Button @click="turnEverythingOff" :disabled="!canTurnEverythingOff">
      <PowerOffIcon :size="18" />
      {{ $t('panel.tools.turnEverythingOff') }}
    </Button>

    <div class="grid gap-2">
      <div class="flex flex-row gap-2 justify-between" v-if="hasTools">
        <Label for="controlTools">{{ $t('panel.tools.setToolTemperatures') }}</Label>
        <Switch id="controlTools" v-model:model-value="controlTools" />
      </div>

      <div class="flex flex-row gap-2 justify-between" v-if="hasBeds">
        <Label for="controlBeds">{{ $t('panel.tools.setBedTemperatures') }}</Label>
        <Switch id="controlBeds" v-model:model-value="controlBeds" />
      </div>

      <div class="flex flex-row gap-2 justify-between" v-if="hasChambers">
        <Label for="controlChambers">{{ $t('panel.tools.setChamberTemperatures') }}</Label>
        <Switch id="controlChambers" v-model:model-value="controlChambers" />
      </div>

      <div class="flex flex-row gap-2 justify-between">
        <Label for="setActiveTemperatures">{{ $t('panel.tools.setActiveTemperatures') }}</Label>
        <ControlInput
          id="setActiveTemperatures"
          type="all"
          :control-tools="controlTools"
          :control-beds="controlBeds"
          :control-chambers="controlChambers"
          active
        />
      </div>

      <div class="flex flex-row gap-2 justify-between">
        <Label for="setStandbyTemperatures">{{ $t('panel.tools.setStandbyTemperatures') }}</Label>
        <ControlInput
          id="setStandbyTemperatures"
          type="all"
          :control-tools="controlTools"
          :control-beds="controlBeds"
          :control-chambers="controlChambers"
          standby
          active
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HeaterState } from '@duet3d/objectmodel'
import { computed, ref } from 'vue'

import ControlInput from '@/components/inputs/ControlInput.vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import { log, LogType } from '@/utils/logging'
import { PowerOffIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

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
      log(LogType.error, useI18n().t('error.turnOffEverythingFailed'), getErrorMessage(e))
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
