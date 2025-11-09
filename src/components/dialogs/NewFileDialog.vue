<template>
  <div>
    <input-dialog
      v-model:shown="showFilenameDialog"
      :title="$t('dialog.newFile.title')"
      :prompt="$t('dialog.newFile.prompt')"
      @cancelled="cancelled"
      @confirmed="showEditor"
    />
    <file-edit-dialog v-model:shown="showEditorDialog" :filename="filename" />
  </div>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'
import { combine } from '@/utils/path'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  props: {
    shown: {
      type: Boolean,
      required: true,
    },
    directory: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      showFilenameDialog: this.shown,

      filename: '',
      content: '',
      showEditorDialog: false,
    }
  },
  computed: {
    isConnected(): boolean {
      return useRootStore().isConnected
    },
  },
  watch: {
    isConnected(to: boolean) {
      if (!to) {
        this.showFilenameDialog = false
        this.showEditorDialog = false
        this.$emit('update:shown', false)
      }
    },
    showEditorDialog(to: boolean) {
      if (this.shown !== to) {
        this.$emit('update:shown', to)
      }
    },
    shown(to: boolean) {
      if (to) {
        this.showFilenameDialog = true
      } else {
        this.showFilenameDialog = false
        this.showEditorDialog = false
      }
    },
  },
  methods: {
    cancelled() {
      this.$emit('update:shown', false)
    },
    showEditor(filename: string) {
      this.filename = combine(this.directory, filename)
      this.content = ''
      this.showEditorDialog = true
    },
  },
})
</script>
