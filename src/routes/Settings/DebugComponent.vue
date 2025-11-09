<!-- heater-fault, driver-error, filament-error, driver-warning -->

<template>
  <Button
    @click="
      async () => await useMachinesStore().sendCode({ code: heater0FaultGcode, noWait: false })
    "
    >heater-fault heater0</Button
  >
  <Button
    @click="
      async () => await useMachinesStore().sendCode({ code: heater1FaultGcode, noWait: false })
    "
    >heater-fault heater1</Button
  >
  <Button>driver-error</Button>
  <Button>filament-error</Button>
  <Button>driver-warning</Button>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useMachinesStore } from '@/stores/machines'

let heater0FaultGcode = 'M957 E"heater_fault" D0 P1'
let heater1FaultGcode = 'M957 E"heater_fault" D1'
</script>
