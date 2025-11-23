<template>
  <div class="grid grid-cols-1 md:grid-cols-2">
    <div class="flex flex-row gap-1 items-center">
      <Switch v-model="behaviour.jobStart" />
      <Label>{{ $t('panel.settingsBehaviour.behaviourJobStart') }}</Label>
    </div>
    <div class="flex flex-row gap-1 items-center">
      <Switch v-model="behaviour.promptDuringFilamentChange" />
      <Label>{{ $t('panel.settingsBehaviour.promptDuringFilamentChange') }}</Label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

import { storeToRefs } from 'pinia'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

let { behaviour } = storeToRefs(useSettingsStore())
</script>
