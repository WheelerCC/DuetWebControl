<template>
  <v-row>
    <v-col>
      <!-- <webcam-panel /> -->
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useDisplay } from 'vuetify/lib/composables/display'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  methods: {
    useDisplay,
  },
})
</script>
