<template>
  <v-btn-toggle :value="atxPower" mandatory="force" @change="toggleAtxPower">
    <v-btn
      text
      :value="true"
      :disabled="uiFrozen"
      :loading="sendingCode"
      @click="toggleAtxPower(true)"
    >
      {{ $t('panel.atx.on') }}
    </v-btn>
    <v-btn
      text
      :value="false"
      :disabled="uiFrozen"
      :loading="sendingCode"
      @click="toggleAtxPower(false)"
    >
      {{ $t('panel.atx.off') }}
    </v-btn>
  </v-btn-toggle>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'

import { defineComponent } from 'vue'

export default defineComponent({
  compatConfig: {
    MODE: 2,
  },
  data() {
    return {
      sendingCode: false,
    }
  },
  computed: {
    uiFrozen(): boolean {
      return useRootStore().uiFrozen
    },
    atxPower(): boolean | null {
      return useMachinesModelStore().state.atxPower
    },
  },
  methods: {
    async toggleAtxPower(value: boolean) {
      if (!this.sendingCode) {
        this.sendingCode = true
        try {
          await useMachinesStore().sendCode(value ? 'M80' : 'M81')
        } catch (e) {
          // handled before we get here
        }
        this.sendingCode = false
      }
    },
  },
})
</script>

<style scoped>
.v-btn-toggle {
  display: flex;
}

.v-btn-toggle > button {
  display: flex;
  flex: 1 1 auto;
}
</style>
