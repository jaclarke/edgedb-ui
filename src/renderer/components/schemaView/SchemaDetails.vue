<template>
  <div v-if="obj" class="schema-details" :key="obj.name">
    <div class="object-name">
      <span class="object-name-attrs">
        <template v-if="obj.is_abstract">abstract</template>
        type
      </span>
      {{ formatName(obj.name) }}
    </div>
    <div class="extends" v-if="obj.baseNames.length">
      extends <template v-for="name, i in obj.baseNames">
        <span class="link-to" @click="module.selectObject(name)"
        >{{ formatName(name) }}</span><template v-if="i !== obj.baseNames.length-1">, </template>
      </template>
    </div>
    <div class="extends" v-if="obj.inheritedBy.length">
      inherited by <template v-for="name, i in obj.inheritedBy">
        <span class="link-to" @click="module.selectObject(name)"
        >{{ formatName(name) }}</span><template v-if="i !== obj.inheritedBy.length-1">, </template>
      </template>
    </div>

    <div class="annotations">
      <div v-for="annotation in obj.annotations">
        <span>{{ formatName(annotation.name, ['std']) }}</span>
        {{ annotation['@value'] }}
      </div>
    </div>

    <template v-if="obj.properties.length">
      <div class="section-header">Properties</div>
      <details-item v-for="prop in obj.properties"
        :item="prop" />
    </template>

    <template v-if="obj.links.length">
    <div class="section-header">Links</div>
      <details-item v-for="link in obj.links"
        :item="link" :isLink="true" />
    </template>
  </div>
  <div v-else class="schema-details-no-object">
    No object selected
  </div>

</template>

<script lang="ts">
import { Vue, Component, Prop, Inject } from 'vue-property-decorator'

import { formatName } from '@utils/misc'

import DetailsItem from './DetailsItem.vue'

@Component({
  components: {
    DetailsItem
  }
})
export default class SchemaDetails extends Vue {
  @Inject()
  readonly module!: any

  formatName = formatName

  get obj() {
    return this.module.selectedObject
  }
}
</script>

<style lang="stylus" scoped>
.schema-details
  color: #e0e0e0
  padding: 10px 16px

.object-name
  font-size: 17px
  font-weight: 500

.object-name-attrs
  color: #9e9e9e
  font-size: 15px

.section-header
  font-size: 17px
  font-variant-caps: all-small-caps
  color: #b7b7b7
  padding: 5px 0
  padding-top: 15px

.extends
  font-style: italic
  color: #b5b5b5
  font-size: 13px
  margin-top: 5px

>>> .link-to
  text-decoration: underline
  color: #2196f3
  cursor: pointer

>>> .annotations
  font-style: italic
  color: #9e9e9e

  span
    font-variant-caps: all-small-caps
    font-size: 15px

.schema-details-no-object
  display: flex
  height: 100%
  justify-content: center
  align-items: center
  color: #b5b5b5

</style>
