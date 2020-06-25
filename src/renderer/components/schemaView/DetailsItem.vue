<template>
  <div class="item">
    <div class="header">
      <icon name="chevron-right" v-if="expandable" :class="{expanded}"
        @click="expanded = !expanded" />
      <span v-if="item.required || item.cardinality === 'MANY'" class="attrs">
        {{ item.required ? 'required' : '' }}
        {{ item.cardinality === 'MANY' ? 'multi' : '' }}
        &nbsp;
      </span>
      {{ item.name }}
      <span class="type" :class="{
        'link-to': isLink
      }" @click="linkTo(isLink ? item.targetName : '')">{{ itemType }}</span>
    </div>
    <div v-if="expanded" class="details">
      <div v-if="item.inherited_from" class="inherited-from">
        inherited from <span class="link-to"
          @click="linkTo(item.inherited_from)">{{ formatName(item.inherited_from) }}</span>
      </div>

      <div class="annotations">
        <div v-for="annotation in item.annotations">
          <span>{{ formatName(annotation.name, ['std']) }}</span>
          {{ annotation['@value'] }}
        </div>
      </div>
      
      <div class="details-list">
        <template v-if="item.default">
          <div class="label">Default</div>
          <div class="code">{{ item.default }}</div>
        </template>
        <template v-if="item.expr">
          <div class="label">Computed</div>
          <div class="code">{{ item.expr }}</div>
        </template>
        <template v-if="item.constraints.length">
          <div class="label">Constraints</div>
          <div class="code" v-for="constraint in item.constraints"
            >{{ constraint.name }}<template v-if="constraint.params.length"
              >(<span v-for="param, i in constraint.params">{{
                param['@value']
              }}{{ i < constraint.params.length-1 ? ', ' : '' }}</span>)</template></div>
        </template>
        <template v-if="isLink && item.properties.length">
          <div class="label">Properties</div>
          <details-item v-for="prop in item.properties"
            :item="prop" />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Inject } from 'vue-property-decorator'

import { formatName } from '@utils/misc'

import Icon from '@ui/Icon.vue'

import 'assets/icons/chevron-right.svg'

@Component({
  name: 'details-item',
  components: {
    Icon
  }
})
export default class DetailsItem extends Vue {
  @Inject()
  readonly module!: any

  @Prop()
  item!: any

  @Prop({
    default: false
  })
  isLink!: boolean

  expanded = false

  formatName = formatName

  get itemType() {
    return formatName(this.item.targetName, ['default', 'std'])
  }

  get expandable() {
    const {item} = this
    return !!(item.inherited_from
      || item.annotations.length
      || item.default
      || item.expr
      || item.constraints.length
      || item.properties?.length
    )
  }

  linkTo(typeName: string) {
    if (typeName) this.module.selectObject(typeName)
  }
}
</script>

<style lang="stylus" scoped>
.item
  margin: 3px 0
  padding-left: 12px

.header
  padding: 2px 0
  display: flex

  .icon
    margin-left: -21px
    cursor: pointer

    &.expanded
      transform: rotate(90deg)

.type
  margin-left: auto
  color: #a7a7a7

.attrs
  color: #9e9e9e

.details
  line-height: 1.5em
  padding-bottom: 12px

.inherited-from
  font-style: italic
  color: #b5b5b5
  font-size: 13px

.label
  font-size: 15px
  font-variant-caps: all-small-caps
  color: #b7b7b7
  margin-top: 4px
  margin-bottom: 2px

.code
  font-family: monospace
  white-space: pre-wrap
  background: rgba(0,0,0,0.25)
  padding: 4px 8px
  border-radius: 3px
  font-size: 13px
  margin: 2px 0
</style>
