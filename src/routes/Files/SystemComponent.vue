<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 items-center">
      <DirectoryBreadcrumbs :directory="directory" />

      <ButtonGroup class="ml-auto">
        <ButtonGroup>
          <Button variant="outline" :loading="loading" :disabled="uiFrozen" @click="refresh">
            <RefreshCw /> {{ $t('button.refresh.caption') }}
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            v-show="!isFirmwareDirectory"
            :disabled="uiFrozen"
            @click="showNewFile = true"
          >
            <FilePlus /> {{ $t('button.newFile.caption') }}
          </Button>
          <Button variant="outline" :disabled="uiFrozen" @click="showNewDirectory = true">
            <FolderPlus />{{ $t('button.newDirectory.caption') }}
          </Button>

          <UploadBtn ref="mainUpload" :directory="directory" :target="uploadTarget" />
        </ButtonGroup>
      </ButtonGroup>
    </div>

    <BaseFileList
      class="w-full"
      ref="_filelist"
      v-model:selection="selection"
      v-model:directory="directory"
      v-model:loading="loading"
      v-model:filelist="filelist"
      v-model:right-clicked-item="rightClickedItem"
      :columns="defaultColumns"
      sort-table="sys"
      :no-files-text="noFilesText"
      @fileClicked="fileClicked"
      @fileEdited="fileEdited"
      :value="[]"
    />
    <!-- 
    <BaseFileList
      ref="filelist"
      v-model="selection"
      v-model:directory="directory"
      v-model:loading="loading"
      sort-table="sys"
      :no-files-text="noFilesText"
      @fileClicked="fileClicked"
      @fileEdited="fileEdited"
    >
      <template #context-menu>
        <v-list-item v-show="isFirmwareFile" @click="installFile">
          <v-icon class="mr-1"> mdi-update </v-icon> {{ $t('list.firmware.installFile') }}
        </v-list-item>
      </template>

      <template v-if="isSystemRootDirectory" #[`file.config.json`]>
        <v-icon class="mr-1"> mdi-wrench </v-icon> config.json
        <v-chip class="pointer-cursor ml-2" @click.stop="editConfigTemplate">
          <v-icon xs class="mr-1"> mdi-open-in-new </v-icon> {{ $t('list.system.configToolNote') }}
        </v-chip>
      </template>
    </BaseFileList> -->
    <!-- 
    <v-speed-dial
      v-model="fab"
      bottom
      right
      fixed
      direction="top"
      transition="scale-transition"
      class="hidden-md-and-up"
    >
      <template #activator>
        <Button v-model="fab" dark color="primary" fab>
          <v-icon v-if="fab"> mdi-close </v-icon>
          <v-icon v-else> mdi-dots-vertical </v-icon>
        </Button>
      </template>

      <Button v-show="!isFirmwareDirectory" fab :disabled="uiFrozen" @click="showNewFile = true">
        <v-icon class="mr-1"> mdi-file-plus </v-icon>
      </Button>

      <Button fab :disabled="uiFrozen" @click="showNewDirectory = true">
        <v-icon>mdi-folder-plus</v-icon>
      </Button>

      <Button fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
        <v-icon>mdi-refresh</v-icon>
      </Button>

      <Button fab color="primary" @click="clickUpload">
        <v-icon>mdi-cloud-upload</v-icon>
      </Button>
    </v-speed-dial> -->

    <NewDirectoryDialog v-model:shown="showNewDirectory" :directory="directory" />
    <NewFileDialog v-model:shown="showNewFile" :directory="directory" />
    <ConfigUpdatedDialog v-model:shown="showResetPrompt" />
  </div>
</template>

<script setup lang="ts">
const filelistRef = useTemplateRef('_filelist')
const mainUploadRef = useTemplateRef('mainUpload')

import UploadBtn, { UploadType } from '@/components/buttons/UploadBtn.vue'
import ConfigUpdatedDialog from '@/components/dialogs/ConfigUpdatedDialog.vue'
import NewDirectoryDialog from '@/components/dialogs/NewDirectoryDialog.vue'
import NewFileDialog from '@/components/dialogs/NewFileDialog.vue'
import { defaultColumns, JobListItem } from '@/components/table/columns'
import { Button } from '@/components/ui/button'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { isPrinting } from '@/utils/enums'
import { combine, equals, getVolume, pathObj, startsWith } from '@/utils/path'
import { FilePlus, FolderPlus, RefreshCw } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'

import DirectoryBreadcrumbs from '@/components/misc/DirectoryBreadcrumbs.vue'
import BaseFileList from '@/components/table/BaseFileList.vue'
import { BaseFileListItem } from '@/components/table/columns'
import { ButtonGroup } from '@/components/ui/button-group'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

let directory = ref<string>(pathObj.system)
let loading = ref(false)
let selection = ref<{ name: string; isDir: boolean }[]>([])
let showNewDirectory = ref(false)
let showNewFile = ref(false)
let showResetPrompt = ref(false)
let fab = ref(false)
let rightClickedItem = ref<{ name: string; isDir: boolean } | null>(null)
let filelist = ref<JobListItem[]>([])

let { uiFrozen } = storeToRefs(useRootStore())
let { directories, boards, state } = storeToRefs(useMachinesModelStore())

async function refresh() {
  await filelistRef.value?.refresh()
}
function clickUpload() {
  mainUploadRef.value?.chooseFile()
}
function fileClicked(item: BaseFileListItem) {
  if (item.name.toLowerCase().endsWith('.bin') || item.name.toLowerCase().endsWith('.uf2')) {
    filelistRef.value?.download(item)
  } else {
    filelistRef.value?.edit(item)
  }
}
function fileEdited(filename: string) {
  const fullName = combine(directory.value, filename)
  const _configFile = combine(systemDirectory.value, pathObj.configFile)
  if (
    !isPrinting(state.value.status) &&
    (fullName === pathObj.configFile || fullName === _configFile || fullName === pathObj.boardFile)
  ) {
    // Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been edited
    showResetPrompt.value = true
  }
}
async function installFile() {
  let module = -1
  let boardIndex = -1
  if (
    boards.value.some((board) => board.wifiFirmwareFileName === selection.value[0].name) ||
    /DuetWiFiSocketServer(.*)\.bin/i.test(selection.value[0].name) ||
    /DuetWiFiServer(.*)\.bin/i.test(selection.value[0].name)
  ) {
    module = 1
  } else if (
    /PanelDue(.*)\.bin/i.test(selection.value[0].name) ||
    /DuetScreen(.*)\.bin/i.test(selection.value[0].name)
  ) {
    module = 4
  } else {
    boards.value.forEach((board, index) => {
      if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
        const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i')
        const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i')
        if (binRegEx.test(selection.value[0].name) || uf2RegEx.test(selection.value[0].name)) {
          module = 0
          boardIndex = board.canAddress || 0
        }
      }
    })
  }

  try {
    await useMachinesStore().sendCode(
      `M997${boardIndex >= 0 ? ' B' + boardIndex : ''} S${module} P"${combine(directory.value, selection.value[0].name)}"`,
    )
  } catch {
    // expected
  }
}
async function editConfigTemplate() {
  const file = await useMachinesStore().download({
    filename: combine(systemDirectory.value, 'config.json'),
    type: 'text',
  })
  const jsonTemplate: string = file[0].content

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = 'https://configtool.reprapfirmware.org/load.php'
  form.target = '_blank'
  {
    const jsonTemplateInput = document.createElement('textarea')
    jsonTemplateInput.name = 'json'
    jsonTemplateInput.value = jsonTemplate
    form.appendChild(jsonTemplateInput)
  }
  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

let { t } = useI18n()

let systemDirectory = computed(() => {
  return directories.value.system
})

let isFirmwareDirectory = computed(() => {
  return !isSystemDirectory.value && startsWith(directory.value, directories.value.firmware)
})

let isSystemDirectory = computed(() => {
  return (
    startsWith(directory.value, systemDirectory.value) ||
    startsWith(directory.value, pathObj.system)
  )
})

let isSystemRootDirectory = computed(() => {
  return equals(directory.value, systemDirectory.value)
})

let isFirmwareFile = computed(() => {
  if (isFirmwareDirectory.value && selection.value.length === 1 && !selection.value[0].isDir) {
    if (
      boards.value.some((board) => board.wifiFirmwareFileName === selection.value[0].name) ||
      /DuetWiFiSocketServer(.*)\.bin/i.test(selection.value[0].name) ||
      /DuetWiFiServer(.*)\.bin/i.test(selection.value[0].name)
    ) {
      return true
    }
    if (
      /PanelDue(.*)\.bin/i.test(selection.value[0].name) ||
      /DuetScreen(.*)\.bin/i.test(selection.value[0].name)
    ) {
      return true
    }
    return boards.value.some((board, index) => {
      if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
        const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i')
        const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i')
        if (binRegEx.test(selection.value[0].name) || uf2RegEx.test(selection.value[0].name)) {
          return true
        }
      }
      return false
    }, this)
  }
  return false
})

let noFilesText = computed(() => {
  if (startsWith(directory.value, directories.value.menu)) {
    return t('list.system.noFiles')
  }
  if (
    startsWith(directory.value, systemDirectory.value) ||
    startsWith(directory.value, pathObj.system)
  ) {
    return t('list.system.noFiles')
  }
  return t('list.firmware.noFiles')
})

let uploadTarget = computed(() => {
  if (isFirmwareDirectory.value) {
    return UploadType.firmware
  }
  if (isSystemDirectory.value) {
    return UploadType.system
  }
  return UploadType.menu
})

watch(systemDirectory, (newVal, oldVal) => {
  if (equals(directory.value, oldVal) || getVolume(oldVal) !== getVolume(newVal)) {
    directory.value = newVal
  }
})

onMounted(() => {
  directory.value = systemDirectory.value
})
</script>
