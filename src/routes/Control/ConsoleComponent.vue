<template>
  <v-row :dense="$vuetify.display.mobile">
    <v-col cols="12" class="pt-1">
      <code-input solo />
    </v-col>
    <v-col cols="12">
      <event-list />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'

import { defineComponent } from 'vue'

export default defineComponent({
  activated() {
    useRootStore().hideCodeReplyNotifications
  },
  deactivated() {
    useRootStore().showCodeReplyNotifications
  },
})
</script>
