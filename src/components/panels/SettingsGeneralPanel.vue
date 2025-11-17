<template>
  <CardHeader>
    <CardTitle>
      {{ $t('panel.settingsGeneral.caption') }}

      <v-spacer />

      <a v-show="!uiFrozen" href="javascript:void(0)" @click="showResetConfirmation = true">
        <v-icon small class="mr-1">mdi-restore</v-icon>
        {{ $t('panel.settingsGeneral.factoryReset') }}
      </a>
    </CardTitle>
  </CardHeader>
  <CardContent class="grid grid-cols-1 sm:grid-cols-2">
    <div class="flex flex-row gap-2">
      <Switch v-model:model-value="settingsStorageLocal" :disabled="!localStorageSupported" />
      <Label> {{ $t('panel.settingsGeneral.settingsStorageLocal') }} </Label>
    </div>

    <div class="flex flex-row gap-2">
      <Input v-model.number="settingsSaveDelay" type="number" step="any" min="0" />
      <Label>{{ $t('panel.settingsGeneral.settingsSaveDelay', ['ms']) }}</Label>
    </div>

    <div class="flex flex-row gap-2">
      <Switch v-model:model-value="cacheStorageLocal" :disabled="!localStorageSupported" />
      <Label> {{ $t('panel.settingsGeneral.cacheStorageLocal') }} </Label>
    </div>

    <div class="flex flex-row gap-2">
      <Input v-model.number="cacheSaveDelay" type="number" step="any" min="0" />
      <Label>{{ $t('panel.settingsGeneral.cacheSaveDelay', ['ms']) }}</Label>
    </div>
  </CardContent>

  <ConfirmDialog
    v-model:shown="showResetConfirmation"
    :title="$t('dialog.factoryReset.title')"
    :prompt="$t('dialog.factoryReset.prompt')"
    @confirmed="reset"
  />
</template>

<script setup lang="ts">
import { useRootStore } from '@/stores'
import { useSettingsStore } from '@/stores/settings'
import { localStorageSupported } from '@/utils/localStorage'
import { storeToRefs } from 'pinia'

import { computed, ref } from 'vue'
import ConfirmDialog from '../dialogs/ConfirmDialog.vue'
import { CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

let showResetConfirmation = ref(false)

let { uiFrozen } = storeToRefs(useRootStore())
let {
  darkTheme,
  settingsStorageLocal,
  cacheStorageLocal,
  settingsSaveDelay: _settingsSaveDelay,
  cacheSaveDelay: _cacheSaveDelay,
} = storeToRefs(useSettingsStore())

let settingsSaveDelay = computed({
  get(): number {
    return _settingsSaveDelay.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      _settingsSaveDelay.value = value
    }
  },
})

let cacheSaveDelay = computed({
  get(): number {
    return _cacheSaveDelay.value
  },
  set(value: number) {
    if (isFinite(value) && value >= 0) {
      _cacheSaveDelay.value = value
    }
  },
})

function reset() {
  useSettingsStore().reset()
}
</script>
