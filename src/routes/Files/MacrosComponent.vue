<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 items-center">
      <DirectoryBreadcrumbs v-model:directory="directory" />

      <ButtonGroup class="ml-auto">
        <ButtonGroup>
          <Button variant="outline" :loading="loading" :disabled="uiFrozen" @click="refresh">
            <RefreshCwIcon />
            {{ $t('button.refresh.caption') }}
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button variant="outline" :disabled="uiFrozen" @click="showNewFile = true">
            <FilePlusIcon />
            {{ $t('button.newFile.caption') }}
          </Button>
          <Button variant="outline" :disabled="uiFrozen" @click="showNewDirectory = true">
            <FolderPlusIcon />
            {{ $t('button.newDirectory.caption') }}
          </Button>

          <UploadBtn :directory="directory" :target="UploadType.macros" />
        </ButtonGroup>
      </ButtonGroup>
    </div>

    <BaseFileList
      class="w-full"
      ref="_filelist"
      v-model:directory="directory"
      v-model:selection="selection"
      v-model:loading="loading"
      v-model:filelist="filelist"
      v-model:right-clicked-item="rightClickedItem"
      :columns="defaultColumns"
      sort-table="macros"
      :no-files-text="t('list.macro.noMacros')"
      @fileClicked="fileClicked"
    >
      <!-- <template #context-menu>
        <v-list-item v-show="isFile" @click="runFile(selection[0].name)">
          <v-icon class="mr-1"> mdi-play </v-icon>
          {{ $t('list.macro.run') }}
        </v-list-item>
      </template> -->
    </BaseFileList>

    <NewDirectoryDialog v-model:shown="showNewDirectory" :directory="directory" />
    <NewFileDialog v-model:shown="showNewFile" :directory="directory" />
    <ConfirmDialog
      v-model:shown="runMacroDialog.shown"
      :title="runMacroDialog.title"
      :prompt="runMacroDialog.prompt"
      @confirmed="runFile(runMacroDialog.filename)"
    />
  </div>
</template>

<script setup lang="ts">
import { combine, equals, escapeFilename, pathObj, startsWith } from '@/utils/path'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'

import UploadBtn, { UploadType } from '@/components/buttons/UploadBtn.vue'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog.vue'
import NewDirectoryDialog from '@/components/dialogs/NewDirectoryDialog.vue'
import NewFileDialog from '@/components/dialogs/NewFileDialog.vue'
import DirectoryBreadcrumbs from '@/components/misc/DirectoryBreadcrumbs.vue'
import BaseFileList from '@/components/table/BaseFileList.vue'
import { BaseFileListItem, defaultColumns, MacroListItem } from '@/components/table/columns'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { FilePlusIcon, FolderPlusIcon, RefreshCwIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

let selection = ref<{ name: string; isDir: boolean }[]>([])
let filelist = ref<MacroListItem[]>([])
let rightClickedItem = ref<{ name: string; isDir: boolean } | null>(null)
let directory = ref(pathObj.macros)
let loading = ref(false)
let runMacroDialog = ref({
  title: '',
  prompt: '',
  filename: '',
  shown: false,
})
let showNewDirectory = ref(false)
let showNewFile = ref(false)
let fab = ref(false)

let { uiFrozen } = storeToRefs(useRootStore())
let { directories } = storeToRefs(useMachinesModelStore())
// const filelistRef = useTemplateRef('_filelist')

let macrosDirectory = computed(() => {
  return directories.value.macros
})

let isFile = computed(() => {
  return selection.value.length === 1 && !selection.value[0].isDir
})

let { t } = useI18n()
function refresh() {
  // filelistRef.value?.refresh()
}

function fileClicked(item: BaseFileListItem) {
  runMacroDialog.value.title = t('dialog.runMacro.title', [item.name])
  runMacroDialog.value.prompt = t('dialog.runMacro.prompt', [item.name])
  runMacroDialog.value.filename = item.name
  runMacroDialog.value.shown = true
}

async function runFile(filename: string) {
  await useMachinesStore().sendCode(`M98 P"${escapeFilename(combine(directory.value, filename))}"`)
}

onMounted(() => {
  directory.value = macrosDirectory.value
})

watch(macrosDirectory, (newVal, oldVal) => {
  if (equals(directory.value, oldVal) || !startsWith(directory.value, newVal)) {
    directory.value = newVal
  }
})
</script>
