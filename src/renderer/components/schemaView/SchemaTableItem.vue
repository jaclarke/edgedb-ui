<template>
  <div class="item" :class="{
    inherited: isInherited,
    highlighted: isHighlighted,
    'is-link': type === 'link'
  }"
    @mouseenter="onMouseEnter" @mouseleave="onMouseLeave" @mouseover="stopPropagation">
    <div class="icon">
      <icon v-if="item.type === 'link'"
        :name="item.cardinality === 'ONE' ? 'link' : 'multilink'" />
    </div>
    <div class="icon"><icon v-if="item.required" name="required" /></div>

    <div class="linkprop" v-if="type === 'linkprop'"></div>
    <div class="name">{{ type === 'linkprop' ? '@' : '' }}{{ item.name }}</div>
    <div class="type">{{ itemType }}</div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject, Watch } from 'vue-property-decorator'

import Icon from '@ui/Icon.vue'

import 'assets/icons/required.svg'
import 'assets/icons/link.svg'
import 'assets/icons/multilink.svg'

@Component({
  components: {
    Icon
  }
})
export default class SchemaTableItem extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  parentTable!: any

  @Prop()
  item!: any

  @Prop()
  type!: any

  hovered = false

  get itemType() {
    return this.item.targetName.split('::')[1]
  }

  get isInherited() {
    return !this.item['@is_local']
  }

  get linkId() {
    return this.type === 'link' ? 
      `${this.parentTable.name}.${this.item.name}` : ''
  }

  get isHighlighted() {
    return this.module.hoveredLink === this.linkId
  }

  onMouseEnter(e) {
    this.hovered = true
    if (this.linkId) {
      this.module.setHoveredLink(this.linkId)
    }
  }

  onMouseLeave() {
    this.hovered = false
  }

  stopPropagation(e) {
    if (this.linkId) e.stopPropagation()
  }

  @Watch('isHighlighted')
  scrollIntoView(highlighted) {
    if (!highlighted || this.hovered) return

    const scrollEl = this.$parent.$refs.items,
          scrollHeight = scrollEl.offsetHeight,
          itemTop = this.$el.offsetTop,
          itemHeight = this.$el.offsetHeight

    scrollEl.scrollTo({
      top: itemTop - (scrollHeight - itemHeight)/2,
      behavior: 'smooth'
    })
  }
}
</script>

<style lang="stylus" scoped>
.item
  height: var(--tableItemHeight)
  display: flex
  align-items: center
  padding: 0 4px
  font-size: 13px
  color: #E0E0E0
  flex-shrink: 0
  background-color: #424242

  &.highlighted
    background-color: #757575

  &.is-link
    z-index: 1

.name, .type
  flex-shrink: 1 
  overflow: hidden
  white-space: nowrap
  text-overflow: ellipsis

.name
  margin-left: 2px

.type
  color: #A7A7A7
  margin-left: auto
  margin-right: 4px

.inherited
  background-color: rgba(0, 0, 0, 0.1)

.icon
  height: 21px
  width: 15px
  flex-shrink: 0

  svg
    width: 21px
    margin-left: -3px

.linkprop
  width: 5px
  border: 1px solid rgba(255,255,255,0.4)
  height: 100%
  box-sizing: border-box
  border-width: 0 0 1px 1px
  transform: translateY(-12px)
  margin: 0 2px 0 4px
  flex-shrink: 0
</style>
