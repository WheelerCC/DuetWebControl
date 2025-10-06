<template>
  <v-row :dense="$vuetify.breakpoint.mobile">
    <v-col
      cols="12"
      class="pt-1"
    >
      <code-input solo />
    </v-col>
    <v-col cols="12">
      <event-list />
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { useRootStore } from "@/stores";
import Vue from "vue";



export default Vue.extend({
  activated() {
		useRootStore().hideCodeReplyNotifications;
	},
  deactivated() {
    useRootStore().showCodeReplyNotifications;
	}
});
</script>
