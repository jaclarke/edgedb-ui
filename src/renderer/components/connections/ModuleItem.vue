<template>
  <tree-view-item :name="module.name" :hasChildren="true" icon="module"
    v-model="expanded" :isLoading="isLoading" :depth="2">
    <template v-slot:children>
      <template v-if="module.objects && !module.objects.length">
        <tree-view-item :depth="3">
          <template v-slot:name>
            <div class="empty-module">empty</div>
          </template>
        </tree-view-item>
      </template>
      <template v-else>
        <template v-for="group in groups" v-if="groupedObjects[group.typeName]">
          <tree-view-item class="group-header" :name="group.name" :icon="group.icon" :depth="3" />
          <tree-view-item v-for="obj in groupedObjects[group.typeName]"
            :name="obj.name" :depth="3" @click.native="openDataTab(obj)" />
        </template>
      </template>
    </template>
  </tree-view-item>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { groupBy } from 'lodash'

import { connectionsModule } from '@store/connections'
import { tabsModule } from '@store/tabs'

import TreeViewItem from './TreeViewItem.vue'

import 'assets/icons/module.svg'
import 'assets/icons/table.svg'

@Component({
  components: {
    TreeViewItem,
  }
})
export default class ModuleItem extends Vue {
  expanded = this.module.name === 'default' ? true : false

  @Prop()
  connection!: any

  @Prop()
  database!: any

  @Prop()
  module!: any

  groups = [
    {name: 'objects', typeName: 'schema::ObjectType', icon: 'table'}
  ]

  get isLoading() {
    return false
  }

  get groupedObjects() {
    return groupBy(this.module.objects, 'typeName')
  }

  openDataTab(object) {
    tabsModule.newDataTab({
      connectionId: this.connection.id,
      database: this.database.name,
      objectName: object.fullName,
    })
  }

  // @Watch('expanded')
  // expandedChanged(expanded) {
  //   if (expanded && !this.database.modules) {
  //     connectionsModule.fetchModules({connectionId: this.connection.id, database: this.database.name})
  //   }
  // }
}
</script>

<style lang="stylus" scoped>
.empty-module
  color: #777
  font-style: italic

.group-header
  text-transform: uppercase
  font-size: 12px
  opacity: 0.6
  pointer-events: none

  >>> .item-icon
    margin-left: -6px
    margin-right: 5px
</style>
