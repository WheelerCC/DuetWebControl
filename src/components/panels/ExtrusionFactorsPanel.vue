<template>
  <CardHeader>
    <CardTitle class="flex flex-row gap-2 items-center">
      <AudioWaveform :size="18" />
      {{ $t('panel.extrusionFactors.caption') }}

      <Menubar class="ml-auto" v-show="!uiFrozen && extruders.length > 0">
        <MenubarMenu>
          <MenubarTrigger> {{ $t('panel.extrusionFactors.changeVisibility') }}</MenubarTrigger>
          <MenubarContent>
            <div v-for="(_, index) in extruders" :key="index">
              <MenubarCheckboxItem
                :model-value="displayedExtruders.includes(index)"
                @select="useMachinesSettingsStore().toggleExtruderVisibility(index)"
              >
                {{ $t('panel.extrusionFactors.extruder', [index]) }}
              </MenubarCheckboxItem>
            </div>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </CardTitle>
  </CardHeader>

  <CardContent v-if="hasVisibleExtruders">
    <div v-for="(extruder, index) in extruders" :key="index">
      <div v-if="displayedExtruders.includes(index)" class="flex flex-col">
        <div class="d-inline-flex">
          {{ $t('panel.extrusionFactors.extruder', [index]) }}
          <v-spacer />
          <a
            v-show="extruder.factor !== 1"
            href="javascript:void(0)"
            :disabled="uiFrozen"
            class="subtitle-2"
            @click.prevent="setExtrusionFactor(index, 100)"
          >
            <v-icon small class="mr-1">mdi-backup-restore</v-icon>
            {{ $t('generic.reset') }}
          </a>
        </div>

        <Slider
          v-model="extrusionFactors[index]!"
          :max="getMax(extruder)"
          :min="0"
          :step="1"
          :disabled="uiFrozen"
          @value-commit="(payload) => setExtrusionFactor(index, payload[0])"
        />
      </div>
    </div>

    <div v-if="!hasVisibleExtruders">
      {{ $t('panel.extrusionFactors.noExtruders') }}
    </div>
  </CardContent>
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { Extruder } from '@duet3d/objectmodel'
import { AudioWaveform } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarMenu,
  MenubarTrigger,
} from '../ui/menubar'
import { Slider } from '../ui/slider'

let { uiFrozen } = storeToRefs(useRootStore())
let { displayedExtruders } = storeToRefs(useMachinesSettingsStore())
let { move } = storeToRefs(useMachinesModelStore())
function getMax(extruder: Extruder) {
  return Math.max(150, extruder.factor * 100 + 50)
}

let extruders = computed(() => {
  return move.value.extruders
})

let extrusionFactors = ref(
  extruders.value.map((extruder) => (extruder ? [extruder.factor * 100] : undefined)),
)

watch(extruders.value, (newVal, oldVal) => {
  extrusionFactors.value = newVal.map((extruder) =>
    extruder ? [extruder.factor * 100] : undefined,
  )
})

async function setExtrusionFactor(extruderIndex: number, value: number) {
  await useMachinesStore().sendCode(`M221 D${extruderIndex} S${value}`)
}

let hasVisibleExtruders = computed(() => {
  return extruders.value.some((_, index) => displayedExtruders.value.includes(index))
})
</script>
