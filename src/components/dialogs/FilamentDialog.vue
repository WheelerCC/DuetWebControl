<template>
  <Dialog v-model:open="innerShown">
    <DialogTrigger as-child>
      <Button variant="outline"> Edit Profile </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>
          {{
            $t(
              tool
                ? tool.filamentExtruder
                  ? 'dialog.filament.titleChange'
                  : 'dialog.filament.titleLoad'
                : 'generic.noValue',
            )
          }}
        </DialogTitle>
      </DialogHeader>

      {{ $t(filaments.length > 0 ? 'dialog.filament.prompt' : 'dialog.filament.noFilaments') }}

      <!-- <v-progress-linear v-if="loading" indeterminate />
      <v-list v-if="!loading">
        <v-list-item v-for="filament in filaments" :key="filament" @click="filamentClick(filament)">
          <v-icon class="mr-1"> mdi-radiobox-marked </v-icon> {{ filament }}
        </v-list-item>
      </v-list> -->

      <DialogFooter>
        <Button @click="hide">
          {{ $t('generic.cancel') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { log } from '@/utils/logging'
import { FileListItem } from '@duet3d/connectors'
import { Tool } from '@duet3d/objectmodel'

import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useSettingsStore } from '@/stores/settings'
import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import { LogType } from '@/utils/logging'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { computed, defineEmits, defineProps, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

let {
  runMacros = true,
  shown,
  tool,
} = defineProps<{
  runMacros?: boolean
  shown: boolean
  tool?: Tool
}>()

let emit = defineEmits(['update:shown'])
let filaments = ref<string[]>([])
let innerShown = ref<boolean>(shown)
let loading = ref<boolean>(false)
let { t } = useI18n()
let currentTool = computed(() => {
  return useMachinesModelStore().currentTool()!
})

watch(
  () => shown,
  (newVal, oldVal) => {
    if (innerShown.value !== newVal) {
      innerShown.value = newVal
    }
    if (newVal) {
      // Load filaments when this dialog is shown
      loadFilaments()
    }
  },
)

watch(innerShown, (newVal, oldVal) => {
  if (shown !== newVal) {
    emit('update:shown', newVal)
  }
})

async function loadFilaments() {
  if (loading.value) {
    return
  }

  loading.value = true
  try {
    const response: Array<FileListItem> = await useMachinesStore().getFileList(
      useMachinesModelStore().directories.filaments,
    )
    const _filaments = response.filter((item) => item.isDirectory).map((item) => item.name)
    _filaments.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    filaments.value = _filaments
  } catch (e) {
    if (!(e instanceof DisconnectedError)) {
      console.warn(e)
      log(LogType.error, t('error.filamentsLoadFailed'), getErrorMessage(e))
    }
    hide()
  }
  loading.value = false
}
async function filamentClick(filament: string) {
  hide()

  let code = ''
  if (currentTool.value !== tool) {
    // Select tool first
    code = `T${tool!.number}\n`
  }

  if (
    tool!.filamentExtruder >= 0 &&
    tool!.filamentExtruder < useMachinesModelStore().move.extruders.length &&
    useMachinesModelStore().move.extruders[tool!.filamentExtruder].filament
  ) {
    // Unload current filament if it is still loaded
    code += runMacros ? 'M702\n' : 'M702 P0\n'

    // Show message box between unload/load if required
    if (runMacros && useSettingsStore().behaviour.promptDuringFilamentChange) {
      code += `M400 M291 P"${t('dialog.filament.changePrompt.message')}" R"${t('dialog.filament.changePrompt.title')}" S2\n`
    }
  }

  // Run load sequence and configure current tool for it
  code += runMacros ? `M701 S"${filament}"\nM703` : `M701 P0 S"${filament}"\nM703`
  await useMachinesStore().sendCode(code)
}
function hide() {
  innerShown.value = false
}
</script>
