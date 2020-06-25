<template>
  <svg class="icon" v-on="$listeners">
    <use :xlink:href="'#'+name" />
  </svg>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class Icon extends Vue {
  @Prop()
  name!: string
}
</script>

<style lang="stylus" scoped>
.icon
  fill: none
  width: 21px
  height: 21px
  stroke-width: 1.25
  flex-shrink: 0
</style>
