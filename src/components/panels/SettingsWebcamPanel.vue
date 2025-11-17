<template>
  <div class="grid grid-cols-2 gap-5">
    <div class="col-span-full flex flex-row items-center gap-1">
      <Switch v-model="webcam.enabled" hide-details />
      <Label>{{ $t('panel.settingsWebcam.enable') }}</Label>
    </div>

    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsWebcam.webcamURL') }}</Label>
      <Input v-model="webcam.url" />
    </div>

    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsWebcam.webcamUpdateInterval', ['ms']) }}</Label>
      <Input v-model.number="webcamUpdateInterval" type="number" step="1" min="250" />
    </div>
    <div class="col-span-full flex flex-col gap-1">
      <Label>{{ $t('panel.settingsWebcam.webcamLiveURL') }}</Label>

      <Input v-model="webcam.liveUrl" />
    </div>
    <div class="flex flex-row items-center gap-1">
      <Switch v-model="webcam.useFix" />
      <Label>{{ $t('panel.settingsWebcam.webcamFix') }}</Label>
    </div>
    <div class="flex flex-row items-center gap-1">
      <Switch v-model="webcam.embedded" />
      <Label>{{ $t('panel.settingsWebcam.webcamEmbedded') }}</Label>
    </div>
    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsWebcam.webcamRotation') }}</Label>

      <Select v-model:model-value="webcam.rotation">
        <SelectTrigger class="w-full">
          <SelectValue> {{ webcam.rotation }}° </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="rotation in rotationItems" :key="rotation" :value="rotation">
              {{ rotation }}°
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
    <div class="flex flex-col gap-1">
      <Label>{{ $t('panel.settingsWebcam.webcamFlip') }}</Label>
      <Select v-model:model-value="webcam.flip">
        <SelectTrigger class="w-full">
          <SelectValue>
            {{ flipItems[webcam.flip] }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <template v-for="[_key, _val] in Object.entries(flipItems)" :key="_key">
              <SelectItem :value="_key"> {{ _val }} </SelectItem>
            </template>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore, WebcamFlip } from '@/stores/settings'
import { storeToRefs } from 'pinia'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

let { t } = useI18n()
let rotationItems = ref([0, 90, 180, 270])

let flipItems = ref<{ [key in WebcamFlip]: string }>({
  none: t('panel.settingsWebcam.flipNone'),
  x: t('panel.settingsWebcam.flipX'),
  y: t('panel.settingsWebcam.flipY'),
  both: t('panel.settingsWebcam.flipBoth'),
})

let { webcam } = storeToRefs(useSettingsStore())

let webcamUpdateInterval = computed({
  get(): number {
    return webcam.value.updateInterval
  },
  set(value: number) {
    if (isFinite(value) && (value <= 0 || value >= 250)) {
      webcam.value.updateInterval = value
    }
  },
})
</script>
