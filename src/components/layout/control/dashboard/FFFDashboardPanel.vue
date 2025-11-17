<template>
  <Card class="col-span-full">
    <FFFMovementPanel />
  </Card>

  <template v-if="isFFForUnset">
    <Card class="col-span-3">
      <CardHeader>
        <CardTitle class="flex flex-row items-center gap-2">
          <Gauge :size="18" /> {{ $t('panel.extrude.caption') }}
        </CardTitle>
      </CardHeader>
      <CardContent class="w-full">
        <ExtrudePanel />
      </CardContent>
    </Card>

    <Card class="col-span-3" v-if="showATXPanel">
      <CardHeader>
        <CardTitle> <Power :size="18" /> {{ $t('panel.atx.caption') }} </CardTitle>
      </CardHeader>
      <CardContent>
        <ATXPanel />
      </CardContent>
    </Card>
  </template>

  <MacroList />

  <Card class="col-span-3">
    <CardHeader>
      <CardTitle class="flex flex-row items-center gap-2">
        <Fan :size="18" />
        {{ $t('panel.fan.caption') }}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <FanPanel />
    </CardContent>
  </Card>

  <Card class="col-span-3" v-if="!isFFForUnset && showATXPanel">
    <CardHeader>
      <CardTitle> <Power :size="18" /> {{ $t('panel.atx.caption') }} </CardTitle>
    </CardHeader>
    <CardContent>
      <ATXPanel />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import MacroList from '@/components/lists/MacroList.vue'
import ATXPanel from '@/components/panels/ATXPanel.vue'
import ExtrudePanel from '@/components/panels/ExtrudePanel.vue'
import FanPanel from '@/components/panels/FanPanel.vue'
import FFFMovementPanel from '@/components/panels/FFFMovementPanel.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useSettingsStore } from '@/stores/settings'
import { Fan, Gauge, Power } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

let { showATXPanel } = storeToRefs(useMachinesModelStore())
let { isFFForUnset } = storeToRefs(useSettingsStore())
</script>
