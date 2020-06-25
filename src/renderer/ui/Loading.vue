<template functional>
  <svg class="loading-spinner" viewBox="0 0 21 21">
    <path d="M 10.5 4.5 A 6 6 0 1 0 16.5 10.5" />
  </svg>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Loading extends Vue {}
</script>

<style lang="stylus" scoped>
.loading-spinner {
  width: 21px
  height: 21px
  fill: none
  stroke: #fff
  stroke-width: 1.5
  animation: spinner 1s linear infinite
}

@keyframes spinner {
  from {
    transform: rotate(0deg)
  }
  to {
    transform: rotate(360deg)
  }
}
</style>
