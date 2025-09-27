<template>
  <div>
    <div class="center-label">
      {{ label }}
    </div>
    <div
      ref="gaugeContainer"
      class="gaugeContainer"
      :title="getTitle()"
    />
  </div>
</template>

<script>
'use strict';

import Gauge from './gauge';

export default {
	props: {
		label: String,
		max: Number,
		curval: Number,
		settemp: Number,
		state: String,
	},
	data: function () {
		return {
			gauge: Object,
		};
	},
	watch: {
		max : function(to){
			this.gauge.max = to;
			this.updateGauge();
		},
		curval: function () {
			this.updateGauge();
		},
		state : function(){
			this.updateGauge();
		},
		settemp : function(to){
			this.gauge.setTemperature = to;
			this.updateGauge();
		}
	},
	mounted() {
		this.gauge = new Gauge(this.$refs.gaugeContainer);
		this.gauge.max = this.max;
		this.gauge.setTemperature = this.settemp;
		this.updateGauge();
		setTimeout(() => {this.updateGauge()}, 200);
	},
	beforeDestroy(){
	},
	methods: {
		getTitle() {
			return '';
		},
		updateGauge(){
			this.gauge.update(this.curval);
			this.gauge.updateState(this.state);
		}
	},
};
</script>

<style scoped>
.center-label {
	text-align: center;
}
</style>
