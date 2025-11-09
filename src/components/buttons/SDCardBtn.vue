<template>
  <Select v-model="value">
    <SelectTrigger class="w-[180px]">
      <SelectValue :loading="mounting">
        <CardSimIcon />
        {{ getVolumeName(value) }}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem v-for="(volume, index) in volumes" :key="index" :value="index">
          {{ getVolumeName(index) }}
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { log } from '@/utils/logging'
import { CardSimIcon } from 'lucide-vue-next'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { getErrorMessage } from '@/utils/errors'
import { LogType } from '@/utils/logging'

import { storeToRefs } from 'pinia'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

let value = defineModel<number>('value', { required: true })

watch(value, (newVal, oldVal) => {
  selectVolume(newVal)
})

let mounting = ref(false)

let { isConnected } = storeToRefs(useRootStore())
let { volumes } = storeToRefs(useMachinesModelStore())
let { t } = useI18n()
let emit = defineEmits(['input'])
function getVolumeName(index: number) {
  if (index >= 0 && index < volumes.value.length && volumes.value[index].name) {
    return volumes.value[index].name
  }
  return t('generic.sdCard', [index])
}
async function selectVolume(index: number) {
  if (!isConnected.value) {
    return
  }

  // Check if the volume is already mounted
  const volume = volumes.value[index]
  if (volume.mounted) {
    emit('input', index)
    return
  }

  // Try to mount it
  let success = true,
    response
  mounting.value = true
  try {
    response = await useMachinesStore().sendCode({
      code: `M21 P${index}`,
      log: false,
    })
    success = response.indexOf('Error') === -1
  } catch (e) {
    response = getErrorMessage(e)
    success = false
  }
  mounting.value = false

  // Deal with the result
  if (success) {
    log(LogType.success, t('notification.mount.successTitle'), response)
    emit('input', index)
  } else {
    log(LogType.error, t('notification.mount.errorTitle'), response)
  }
}
</script>
