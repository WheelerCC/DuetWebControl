<template>
  <v-card>
    <v-card-title>
      <v-icon small class="mr-1"> mdi-power </v-icon> {{ $t('panel.atx.caption') }}
    </v-card-title>

    <v-card-text class="pt-0">
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
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'

import { defineComponent } from 'vue'

export default defineComponent({
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
