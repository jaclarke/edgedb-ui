<template>
  <tree-view-item :name="database.name" :hasChildren="true"
    v-model="expanded" :isLoading="isLoading" :depth="1">
    <template v-slot:icon>
      <div class="connection-icon">
        <icon name="database" />
        <div v-if="isConnected" class="connection-status"></div>
      </div>
    </template>
    <template v-slot:extra>
      <icon v-if="isConnected" name="disconnect"
        @click="closeConnection" />
      <icon name="schema" @click="openSchemaTab" />
    </template>
    <template v-slot:children>
      <module-item v-for="mod in database.modules" v-if="!mod.builtin"
        :connection="connection" :database="database" :module="mod" />
    </template>
  </tree-view-item>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'

import { connectionsModule } from '@store/connections'
import { tabsModule } from '@store/tabs'

import TreeViewItem from './TreeViewItem.vue'
import ModuleItem from './ModuleItem.vue'
import Icon from '@ui/Icon.vue'

import 'assets/icons/database.svg'
import 'assets/icons/disconnect.svg'
import 'assets/icons/schema.svg'

@Component({
  components: {
    TreeViewItem,
    Icon,
    ModuleItem,
  }
})
export default class DatabaseItem extends Vue {
  expanded = false

  @Prop()
  connection!: any

  @Prop()
  database!: any

  get isLoading() {
    return this.connection.connecting.includes(this.database.name) || 
      (this.expanded && !this.database.modules)
  }

  get isConnected() {
    return this.connection.connected.includes(this.database.name)
  }

  openSchemaTab() {
    tabsModule.newSchemaTab({
      connectionId: this.connection.id,
      database: this.database.name
    })
  }

  closeConnection() {
    connectionsModule.closeConnection({
      connectionId: this.connection.id,
      database: this.database.name,
    })
  }

  @Watch('isConnected')
  connectionStatusChanged(connected) {
    if (connected && !this.database.modules) {
      this.expanded = true
    }
  }

  @Watch('expanded')
  expandedChanged(expanded) {
    if (expanded && !this.database.modules) {
      connectionsModule.fetchModules({connectionId: this.connection.id, database: this.database.name})
    }
  }
}
</script>

<style lang="stylus" scoped>
$backgroundColour = #252525
$hoverBackgroundColour = blend(rgba(255, 255, 255, 0.05), $backgroundColour)

.connection-icon
  position: relative
  display: flex
  margin-right: 8px

.connection-status
  position: absolute
  bottom: 0px
  right: -1px
  width: 8px
  height: @width
  border-radius: @width
  background-color: #8BC34A
  border: 2px solid $backgroundColour

  >>> .row:hover &
    border-color: $hoverBackgroundColour

>>> .icon
  cursor: pointer
</style>
