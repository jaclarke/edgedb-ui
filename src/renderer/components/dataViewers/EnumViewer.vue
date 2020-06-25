<template>
  <div class="enum-viewer">
    <div v-if="enumValues" class="enum-val" v-for="enumVal in enumValues"
      :class="{
        'selected-enum': enumVal === item
      }">
      {{ enumVal }}
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { typesResolverModule } from '@store/typesResolver'

@Component
export default class EnumViewer extends Vue {
  @Prop()
  item!: string

  @Prop()
  codec!: ICodec

  get enumValues() {
    return this.codec.members
  }
}
</script>

<style lang="stylus" scoped>
.enum-viewer
  padding: 6px 10px
  color: #808080

.enum-val
  padding: 2px

.selected-enum
  color: #e0e0e0
</style>
