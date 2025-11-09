import { defineStore } from "pinia";
import { defaultMachine } from "./misc";
import { useRootStore } from ".";
import { TempSampleData } from "@/components/charts/types";

export const useMachinesSamplesStore = defineStore('machinesSamples', {
	state: (): Record<string, TempSampleData> => ({
		[defaultMachine]: {
			times: [],
			temps: [],
		}
	}),
	getters: {
		times: (state) => state[useRootStore().selectedMachine].times,
		temps: (state) => state[useRootStore().selectedMachine].temps,
	},
	actions: {

	},
})
