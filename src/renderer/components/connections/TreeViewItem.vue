<template>
  <div class="item">
    <div class="row" :style="{
      '--depth': depth
    }">
      <div v-if="hasChildren" class="expand-list-icon" :class="{expanded}"
        @click.stop="expanded = !expanded">
        <loading v-if="isLoading" />
        <icon v-else name="chevron-right" />
      </div>
      <slot name="icon">
        <icon class="item-icon" v-if="icon" :name="icon" />
      </slot>
      <slot name="name">
        <div class="name">{{ name }}</div>
      </slot>
      <div class="extra">
        <slot name="extra" />
      </div>
    </div>
    <slot name="children" v-if="hasChildren && expanded" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import Icon from '@ui/Icon.vue'
import Loading from '@ui/Loading.vue'

import 'assets/icons/chevron-right.svg'
import 'assets/icons/module.svg'
import 'assets/icons/table.svg'

@Component({
  name: 'tree-view-item',
  components: {
    Icon,
    Loading,
  },
})
export default class TreeViewItem extends Vue {
  @Prop()
  name!: string

  @Prop()
  icon?: string

  @Prop({default: false})
  hasChildren!: boolean

  @Prop({default: 0})
  depth!: number

  @Prop({default: false})
  isLoading!: boolean

  @Prop({default: false})
  value!: boolean

  get expanded() {
    return this.value
  }
  set expanded(val) {
    this.$emit('input', val)
  }
}
</script>

<style lang="stylus" scoped>
$backgroundColour = #252525
$hoverBackgroundColour = blend(rgba(255, 255, 255, 0.05), $backgroundColour)

.item
  display: flex
  flex-direction: column

.row
  height: 30px
  padding: 0 16px
  padding-left: calc((var(--depth) * 12px) + 31px) 
  display: flex
  align-items: center

  &:hover
    background-color: $hoverBackgroundColour

  > *
    flex-shrink: 0

.item-icon
  margin-right: 8px

.expand-list-icon
  stroke: #BDBDBD
  stroke-width: 1.25
  width: 21px
  height: @width
  margin-left: -25px
  margin-right: 2px
  cursor: pointer

  &.expanded > svg
    transform: rotate(90deg)

.type-icon
  stroke: #BDBDBD
  stroke-width: 1.5
  width: 19px
  height: @width

.extra
  margin-left: auto
  padding-left: 10px
  display: flex
  align-items: center
  opacity: 0

  .row:hover &
    opacity: 1
</style>
