<template>
  <v-form submit.prevent="apply">
    <v-combobox
      ref="input"
      type="number"
      min="-273"
      max="1999"
      step="any"
      :label="label"
      :menu-props="{ maxHeight: '50%' }"
      :value="inputValue"
      :search-input="inputValue"
      :loading="applying"
      :disabled="disabled || uiFrozen || !isValid"
      :items="items"
      hide-selected
      @update:search-input="change"
      @blur="blur"
      @keydown.enter.prevent="apply"
    />
  </v-form>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";


import { LogType } from "@/utils/logging";
import { useMachinesModelStore } from "@/stores/machineModel";
import { useMachinesSettingsStore } from "@/stores/machineSettings";
import { useRootStore } from "@/stores";
import { useSettingsStore } from "@/stores/settings";
import { useMachinesStore } from "@/stores/machines";

export default Vue.extend({
	props: {
		disabled: Boolean,
		label: {
			type: String,
			default: null
		},

		type: {
			required: true,
			type: String as PropType<"all" | "tool" | "spindle" | "bed" | "chamber">,
		},

		controlTools: Boolean,
		controlBeds: Boolean,
		controlChambers: Boolean,

		index: {
			required: true,
			type: Number
		},
		toolHeaterIndex: {
			type: Number,
			default: null
		},

		active: Boolean,
		standby: Boolean
	},
	data() {
		return {
			applying: false,
			blurTimer: null as NodeJS.Timeout | null,
			inputElement: null as HTMLInputElement | null,
			actualValue: 0,
			inputValue: "0"
		}
	},
	computed: {
		uiFrozen(): boolean { return useRootStore().uiFrozen; },
		items(): Array<number> {
			if (useSettingsStore().disableAutoComplete) {
				return [];
			}

			if (this.type === "spindle") {
				return useMachinesSettingsStore().spindleRPM;
			}
			const key = this.active ? "active" : "standby";
			if (this.type === "all") {
				if (this.controlBeds) {
					return useMachinesSettingsStore().temperatures.bed[key];
				}
				if (this.controlChambers) {
					return useMachinesSettingsStore().temperatures.chamber;
				}
				return useMachinesSettingsStore().temperatures.tool[key];
			}
			if (this.type === "tool") {
				return useMachinesSettingsStore().temperatures.tool[key];
			}
			if (this.type === "bed") {
				return useMachinesSettingsStore().temperatures.bed[key];
			}
			if (this.type === "chamber") {
				return useMachinesSettingsStore().temperatures.chamber;
			}

			console.warn("[control-input] Failed to retrieve temperature presets");
			return [];
		},
		isValid(): boolean {
			if (this.type === "all" || this.type === "spindle") {
				return true;
			}
			if (this.type === "tool") {
				if ((this.index >= 0) && (this.index < useMachinesModelStore().tools.length) && (useMachinesModelStore().tools[this.index] !== null)) {
					const heater = useMachinesModelStore().tools[this.index]!.heaters[this.toolHeaterIndex];
					return (heater >= 0) && (heater < useMachinesModelStore().heat.heaters.length) && (useMachinesModelStore().heat.heaters[heater] !== null);
				}
			} else if (this.type === "bed") {
				return (this.index >= 0) && (this.index < useMachinesModelStore().heat.bedHeaters.length);
			} else if (this.type === "chamber") {
				return (this.index >= 0) && (this.index < useMachinesModelStore().heat.chamberHeaters.length);
			}
			return false;
		},
		currentValue(): number {
			const activeOrStandby = this.active ? "active" : "standby";
			switch (this.type) {
				case "all":
					// not applicable
					break;

				case "tool":
					if (this.index >= 0 && this.index < useMachinesModelStore().tools.length && useMachinesModelStore().tools[this.index] !== null) {
						const values = useMachinesModelStore().tools[this.index]![activeOrStandby];
						if (this.toolHeaterIndex >= 0 && this.toolHeaterIndex < values.length) {
							return values[this.toolHeaterIndex];
						}
					}
					break;

				case "spindle":
					if (this.index >= 0 && this.index < useMachinesModelStore().tools.length && useMachinesModelStore().tools[this.index] !== null) {
						return useMachinesModelStore().tools[this.index]!.spindleRpm;
					}
					break;

				case "bed":
					if (this.index >= 0 && this.index < useMachinesModelStore().heat.bedHeaters.length) {
						const heaterIndex = useMachinesModelStore().heat.bedHeaters[this.index];
						if (heaterIndex >= 0 && heaterIndex < useMachinesModelStore().heat.heaters.length && useMachinesModelStore().heat.heaters[heaterIndex] !== null) {
							return useMachinesModelStore().heat.heaters[heaterIndex]![activeOrStandby];
						}
					}
					break;

				case "chamber":
					if (this.index >= 0 && this.index < useMachinesModelStore().heat.chamberHeaters.length) {
						const heaterIndex = useMachinesModelStore().heat.chamberHeaters[this.index];
						if (heaterIndex >= 0 && heaterIndex < useMachinesModelStore().heat.heaters.length && useMachinesModelStore().heat.heaters[heaterIndex] !== null) {
							return useMachinesModelStore().heat.heaters[heaterIndex]![activeOrStandby];
						}
					}
					break;

				default:
					const _exhaustiveCheck: never = this.type;
					break;
			}
			return 0;
		}
	},
	watch: {
		currentValue(to: number) {
			if (isFinite(to) && this.actualValue !== to) {
				this.actualValue = to;
				if (document.activeElement !== this.inputElement) {
					this.inputValue = to.toString();
				}
			}
		}
	},
	mounted() {
		this.inputElement = this.$el.querySelector("input");
		this.actualValue = this.currentValue;
		this.inputValue = this.currentValue.toString();
	},
	methods: {
		async apply() {
			this.$nextTick(() => (this.$refs.input as any).isMenuActive = false);			// FIXME There must be a better solution than this

			const value = parseFloat(this.inputValue);
			if (!isFinite(value)) {
				this.$makeNotification(LogType.warning, this.$t("error.enterValidNumber"));
				return;
			}

			if (!this.applying) {
				this.applying = true;
				try {
					const inputValue = parseFloat(this.inputValue);
					switch (this.type) {
						case "all":
							let code = "";
							if (this.controlTools) {
								for (const tool of useMachinesModelStore().tools) {
									if (tool && tool.heaters.length > 0) {
										const temps = tool.heaters.map(() => this.inputValue, this).join(':');
										code += `M568 P${tool.number} ${this.active ? 'S' : 'R'}${temps}\n`;
									}
								}
							}
							if (this.controlBeds) {
								for (let i = 0; i < useMachinesModelStore().heat.bedHeaters.length; i++) {
									const bedHeater = useMachinesModelStore().heat.bedHeaters[i];
									if (bedHeater >= 0 && bedHeater <= useMachinesModelStore().heat.heaters.length) {
										code += `M140 P${i} ${this.active ? 'S' : 'R'}${this.inputValue}\n`;
									}
								}
							}
							if (this.controlChambers) {
								for (let i = 0; i < useMachinesModelStore().heat.chamberHeaters.length; i++) {
									const chamberHeater = useMachinesModelStore().heat.chamberHeaters[i];
									if (chamberHeater >= 0 && chamberHeater <= useMachinesModelStore().heat.heaters.length) {
										code += `M141 P${i} ${this.active ? 'S' : 'R'}${this.inputValue}\n`;
									}
								}
							}
							if (code !== "") {
								await useMachinesStore().sendCode(code);
							}
							this.actualValue = inputValue;
							break;

						case "tool":
							if (inputValue >= -273.15 && inputValue <= 1999) {
								const currentTemps = useMachinesModelStore().tools[this.index]![this.active ? "active" : "standby"];
								const newTemps = currentTemps.map((temp, i) => (i === this.toolHeaterIndex) ? this.inputValue : temp, this).join(':');
								await useMachinesStore().sendCode(`M568 P${this.index} ${this.active ? 'S' : 'R'}${newTemps}`);
							}
							break;

						case "spindle":
							await useMachinesStore().sendCode(`M568 P${this.index} F${this.inputValue}`);
							break;

						case "bed":
							if (inputValue >= -273.15 && inputValue <= 1999) {
								await useMachinesStore().sendCode(`M140 P${this.index} ${this.active ? 'S' : 'R'}${this.inputValue}`);
							}
							break;

						case "chamber":
							if (inputValue >= -273.15 && inputValue <= 1999) {
								useMachinesStore().sendCode(`M141 P${this.index} ${this.active ? 'S' : 'R'}${this.inputValue}`);
							}
							break;

						default:
							const _exhaustiveCheck: never = this.type;
							console.warn('[control-input] Invalid target for control-input');
							break;
					}
				} catch (e) {
					// should be handled before we get here
					console.warn(e);
				}
				this.applying = false;
			}
		},
		blur() {
			if (useRootStore().bottomMargin > 0) {
				if (!this.blurTimer) {
					// Do not update the input value before a potentially installed on-screen keyboard is hidden.
					// This work-around is necessary because the input field loses focus every time a button is pressed
					this.blurTimer = setTimeout(this.checkAfterBlur.bind(this), 500);
				}
			} else {
				this.inputValue = this.actualValue.toString();
			}
		},
		checkAfterBlur() {
			this.blurTimer = null;
			this.blur();
		},
		async change(value: string | number) {
			// Note that value is of type String when a user enters a value and then leaves it without confirming...
			if (typeof value === "number") {
				this.inputValue = value.toString();
				await this.apply();
			} else {
				this.inputValue = value;
			}
		}
	}
});
</script>
