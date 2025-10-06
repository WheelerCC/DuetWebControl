<template>
  <v-dialog
    v-model="innerShown"
    max-width="360"
  >
    <v-card>
      <v-card-title class="headline">
        <v-icon class="mr-1">
          mdi-alert
        </v-icon> {{ $t("dialog.resetHeaterFault.title") }}
      </v-card-title>

      <v-card-text>
        {{ $t("dialog.resetHeaterFault.prompt", [heater]) }}
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn
          color="blue darken-1"
          text
          :disabled="!!counter"
          @click="resetFault"
        >
          {{ $t("dialog.resetHeaterFault.resetFault") + (counter ? ` (${counter})` : "") }}
        </v-btn>

        <v-btn
          color="blue darken-1"
          text
          @click="hide"
        >
          {{ $t("generic.cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { useMachinesStore } from "@/stores/machines";
import Vue from "vue";



/**
 * How long to wait before a user can reset a heater fault (in s)
 */
const countdownSeconds = 5;

export default Vue.extend({
	props: {
		shown: {
			type: Boolean,
			required: true
		},
		heater: {
			type: Number,
			required: true
		}
	},
	data() {
		return {
			counter: countdownSeconds,
			resetHeaters: new Array<number>(),
			timer: null as NodeJS.Timeout | null,
			innerShown: this.shown
		}
	},
	watch: {
		shown(to: boolean) {
			if (this.innerShown !== to) {
				this.innerShown = to;
			}
			if (to) {
				if (!this.timer && !this.resetHeaters.includes(this.heater)) {
					this.counter = countdownSeconds;
					this.countDown();
				}
			} else if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
		},
		innerShown(to: boolean) {
			if (this.shown !== to) {
				this.$emit("update:shown", to);
			}
		},
	},
	methods: {
		async resetFault() {
			try {
				await useMachinesStore().sendCode(`M562 P${this.heater}`);
				this.resetHeaters.push(this.heater);
			} finally {
				this.hide();
			}
		},
		hide() {
			this.innerShown = false;
		},
		countDown() {
			this.counter--;
			this.timer = (this.counter > 0) ? setTimeout(this.countDown.bind(this), 1000) : null;
		}
	}
});
</script>
