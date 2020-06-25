<template>
  <div style="display: contents">
    <slot />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Provide } from 'vue-property-decorator'

@Component
export default class ModuleProvider extends Vue {
  @Prop()
  mod!: any

  @Provide()
  module = this.mod
}
</script>
