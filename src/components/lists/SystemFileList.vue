<template>
  <div class="component">
    <v-toolbar>
      <directory-breadcrumbs v-model="directory" />

      <v-spacer />

      <v-btn
        v-show="!isFirmwareDirectory"
        class="hidden-sm-and-down mr-3"
        :disabled="uiFrozen"
        :elevation="1"
        @click="showNewFile = true"
      >
        <v-icon class="mr-1"> mdi-file-plus </v-icon> {{ $t('button.newFile.caption') }}
      </v-btn>
      <v-btn
        class="hidden-sm-and-down mr-3"
        :disabled="uiFrozen"
        :elevation="1"
        @click="showNewDirectory = true"
      >
        <v-icon class="mr-1"> mdi-folder-plus </v-icon> {{ $t('button.newDirectory.caption') }}
      </v-btn>
      <v-btn
        class="hidden-sm-and-down mr-3"
        color="info"
        :loading="loading"
        :disabled="uiFrozen"
        :elevation="1"
        @click="refresh"
      >
        <v-icon class="mr-1"> mdi-refresh </v-icon> {{ $t('button.refresh.caption') }}
      </v-btn>
      <upload-btn
        ref="mainUpload"
        class="hidden-sm-and-down"
        :elevation="1"
        :directory="directory"
        :target="uploadTarget"
        color="primary"
      />
    </v-toolbar>

    <base-file-list
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
    </base-file-list>

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
        <v-btn v-model="fab" dark color="primary" fab>
          <v-icon v-if="fab"> mdi-close </v-icon>
          <v-icon v-else> mdi-dots-vertical </v-icon>
        </v-btn>
      </template>

      <v-btn v-show="!isFirmwareDirectory" fab :disabled="uiFrozen" @click="showNewFile = true">
        <v-icon class="mr-1"> mdi-file-plus </v-icon>
      </v-btn>

      <v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
        <v-icon>mdi-folder-plus</v-icon>
      </v-btn>

      <v-btn fab color="info" :loading="loading" :disabled="uiFrozen" @click="refresh">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>

      <v-btn fab color="primary" @click="clickUpload">
        <v-icon>mdi-cloud-upload</v-icon>
      </v-btn>
    </v-speed-dial>

    <new-directory-dialog v-model:shown="showNewDirectory" :directory="directory" />
    <new-file-dialog v-model:shown="showNewFile" :directory="directory" />
    <config-updated-dialog v-model:shown="showResetPrompt" />
  </div>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { isPrinting } from '@/utils/enums'
import Path from '@/utils/path'
import { UploadType } from '../buttons/UploadBtn.vue'
import { BaseFileListItem } from './BaseFileList.vue'

import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      directory: Path.system,
      loading: false,
      selection: new Array<BaseFileListItem>(),
      showNewDirectory: false,
      showNewFile: false,
      showResetPrompt: false,
      fab: false,
    }
  },
  computed: {
    uiFrozen(): boolean {
      return useRootStore().uiFrozen
    },
    systemDirectory(): string {
      return useMachinesModelStore().directories.system
    },
    isFirmwareDirectory(): boolean {
      return (
        !this.isSystemDirectory &&
        Path.startsWith(this.directory, useMachinesModelStore().directories.firmware)
      )
    },
    isSystemDirectory(): boolean {
      return (
        Path.startsWith(this.directory, this.systemDirectory) ||
        Path.startsWith(this.directory, Path.system)
      )
    },
    isSystemRootDirectory(): boolean {
      return Path.equals(this.directory, this.systemDirectory)
    },
    isFirmwareFile(): boolean {
      if (
        this.isFirmwareDirectory &&
        this.selection.length === 1 &&
        !this.selection[0].isDirectory
      ) {
        if (
          useMachinesModelStore().boards.some(
            (board) => board.wifiFirmwareFileName === this.selection[0].name,
          ) ||
          /DuetWiFiSocketServer(.*)\.bin/i.test(this.selection[0].name) ||
          /DuetWiFiServer(.*)\.bin/i.test(this.selection[0].name)
        ) {
          return true
        }
        if (
          /PanelDue(.*)\.bin/i.test(this.selection[0].name) ||
          /DuetScreen(.*)\.bin/i.test(this.selection[0].name)
        ) {
          return true
        }
        return useMachinesModelStore().boards.some((board, index) => {
          if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
            const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i')
            const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i')
            if (binRegEx.test(this.selection[0].name) || uf2RegEx.test(this.selection[0].name)) {
              return true
            }
          }
          return false
        }, this)
      }
      return false
    },
    noFilesText(): string {
      if (Path.startsWith(this.directory, useMachinesModelStore().directories.menu)) {
        return 'list.system.noFiles'
      }
      if (
        Path.startsWith(this.directory, this.systemDirectory) ||
        Path.startsWith(this.directory, Path.system)
      ) {
        return 'list.system.noFiles'
      }
      return 'list.firmware.noFiles'
    },
    uploadTarget(): UploadType {
      if (this.isFirmwareDirectory) {
        return UploadType.firmware
      }
      if (this.isSystemDirectory) {
        return UploadType.system
      }
      return UploadType.menu
    },
  },
  watch: {
    systemDirectory(to: string, from: string) {
      if (Path.equals(this.directory, from) || Path.getVolume(from) !== Path.getVolume(to)) {
        this.directory = to
      }
    },
  },
  mounted() {
    this.directory = this.systemDirectory
  },
  methods: {
    async refresh() {
      await (this.$refs.filelist as any).refresh()
    },
    clickUpload() {
      ;(this.$refs.mainUpload as any).chooseFile()
    },
    fileClicked(item: BaseFileListItem) {
      if (item.name.toLowerCase().endsWith('.bin') || item.name.toLowerCase().endsWith('.uf2')) {
        ;(this.$refs.filelist as any).download(item)
      } else {
        ;(this.$refs.filelist as any).edit(item)
      }
    },
    fileEdited(filename: string) {
      const fullName = Path.combine(this.directory, filename)
      const configFile = Path.combine(this.systemDirectory, Path.configFile)
      if (
        !isPrinting(useMachinesModelStore().state.status) &&
        (fullName === Path.configFile || fullName === configFile || fullName === Path.boardFile)
      ) {
        // Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been edited
        this.showResetPrompt = true
      }
    },
    async installFile() {
      let module = -1,
        boardIndex = -1
      if (
        useMachinesModelStore().boards.some(
          (board) => board.wifiFirmwareFileName === this.selection[0].name,
        ) ||
        /DuetWiFiSocketServer(.*)\.bin/i.test(this.selection[0].name) ||
        /DuetWiFiServer(.*)\.bin/i.test(this.selection[0].name)
      ) {
        module = 1
      } else if (
        /PanelDue(.*)\.bin/i.test(this.selection[0].name) ||
        /DuetScreen(.*)\.bin/i.test(this.selection[0].name)
      ) {
        module = 4
      } else {
        useMachinesModelStore().boards.forEach((board, index) => {
          if (board && board.firmwareFileName && (board.canAddress || index === 0)) {
            const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i')
            const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i')
            if (binRegEx.test(this.selection[0].name) || uf2RegEx.test(this.selection[0].name)) {
              module = 0
              boardIndex = board.canAddress || 0
            }
          }
        }, this)
      }

      try {
        await useMachinesStore().sendCode(
          `M997${boardIndex >= 0 ? ' B' + boardIndex : ''} S${module} P"${Path.combine(this.directory, this.selection[0].name)}"`,
        )
      } catch {
        // expected
      }
    },
    async editConfigTemplate() {
      const file = await useMachinesStore().download({
        filename: Path.combine(this.systemDirectory, 'config.json'),
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
    },
  },
})
</script>

<style scoped>
.pointer-cursor {
  cursor: pointer;
}
</style>
