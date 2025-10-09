<template>
  <v-dialog v-model="shown" persistent no-click-animation width="360">
    <v-card>
      <v-form ref="form" @submit.prevent="submit">
        <v-card-title class="headline">
          {{ $t('dialog.connect.title') }}
        </v-card-title>

        <v-card-text>
          {{ $t('dialog.connect.prompt') }}

          <v-text-field
            v-show="!passwordRequired"
            v-model="hostname"
            :autofocus="!passwordRequired"
            :placeholder="$t('dialog.connect.hostPlaceholder')"
            :rules="hostnameRules"
            required
          />
          <v-text-field
            v-model="password"
            type="password"
            :placeholder="
              $t(
                passwordRequired
                  ? 'dialog.connect.passwordPlaceholder'
                  : 'dialog.connect.passwordPlaceholderOptional',
              )
            "
            :autofocus="passwordRequired"
            :rules="passwordRules"
            :required="passwordRequired"
          />
          <v-checkbox v-model="rememberPassword" :label="$t('dialog.connect.rememberPassword')" />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn v-show="!passwordRequired" color="blue darken-1" text @click="close">
            {{ $t('generic.cancel') }}
          </v-btn>
          <v-btn color="blue darken-1" text type="submit">
            {{ $t('dialog.connect.connect') }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { useRootStore } from '@/stores'
import { useSettingsStore } from '@/stores/settings'

import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      hostname: location.host,
      hostnameRules: [
        (value: string): string | boolean =>
          value ? true : this.$t('dialog.connect.hostRequired'),
      ],
      password: '',
      passwordRules: [
        (value: string): string | boolean =>
          !value && useRootStore().passwordRequired
            ? this.$t('dialog.connect.passwordRequired')
            : true,
      ],
      rememberPassword: false,
      shown: false,
    }
  },
  computed: {
    connectDialogShown(): boolean {
      return useRootStore().connectDialogShown
    },
    lastHostname(): string {
      return useSettingsStore().lastHostname
    },
    passwordRequired(): boolean {
      return useRootStore().passwordRequired
    },
  },
  watch: {
    connectDialogShown(to: boolean) {
      this.shown = to
      if (to) {
        this.loadPassword()
      }
    },
    lastHostname(to: string) {
      this.hostname = to
    },
  },
  mounted() {
    this.hostname = this.passwordRequired ? location.host : this.lastHostname
    this.shown = this.connectDialogShown
    this.loadPassword()
  },
  methods: {
    async submit() {
      if (this.shown && (this.$refs.form as HTMLFormElement).validate()) {
        this.close()

        try {
          await useRootStore().connect({
            hostname: this.hostname,
            password: this.password,
          })
          if (this.rememberPassword) {
            this.savePassword()
          } else {
            this.clearPassword()
          }
          this.password = ''
        } catch (e) {
          console.warn(e)
          useRootStore().showConnectDialog()
        }
      }
    },
    close() {
      useRootStore().hideConnectDialog()
    },
    savePassword() {
      localStorage.setItem('dwc-password', this.password)
    },
    loadPassword() {
      const savedPassword = localStorage.getItem('dwc-password')
      if (savedPassword) {
        this.password = savedPassword
        this.rememberPassword = true
      }
    },
    clearPassword() {
      localStorage.removeItem('dwc-password')
    },
  },
})
</script>
