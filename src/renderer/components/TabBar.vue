<template>
  <div class="tabbar">
    <div class="tabs">
      <div class="tab" v-for="tab, i in tabsModule.tabs" :class="{'tab-focused': tabsModule.currentTabId === tab.id}"
        @mousedown="tabsModule.focusTab(tab.id)" :style="{
          'z-index': tabsModule.tabs.length + (tabsModule.currentTabId === tab.id ? 1 : -i)
        }">
        <icon v-if="tabIcons[tab.type]" class="tab-icon"
          :name="tabIcons[tab.type]" />
        {{ tab.module.title }}
        <icon class="close" name="close" @click="tabsModule.removeTab(tab.id)" @mousedown.stop />
      </div>
    </div>
    <div class="new-tab" @click="tabsModule.newQueryTab">
      <icon name="add" />
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

import { tabsModule } from '@store/tabs'
import Icon from '@ui/Icon.vue'

import 'assets/icons/add.svg'
import 'assets/icons/close.svg'

import 'assets/icons/schema.svg'
import 'assets/icons/query.svg'
import 'assets/icons/table.svg'
import 'assets/icons/settings-alt.svg'

@Component({
  components: { Icon }
})
export default class TabBar extends Vue {
  tabsModule = tabsModule

  tabIcons = {
    'query': 'query',
    'schema': 'schema',
    'data': 'table',
    'connSettings': 'settings-alt',
  }
}
</script>

<style lang="stylus" scoped>
$tabHeight = 32

.tabbar
  background: #181818
  padding-top: 10px
  // padding-left: 3px
  -webkit-app-region: drag
  display: flex
  min-width: 0

.tabs
  -webkit-app-region: no-drag
  display: flex
  height: ($tabHeight)px
  color: #e0e0e0
  font-size: 13px
  overflow-x: auto

  &::-webkit-scrollbar
    width: 0px
    height: 0px

tabBackground($bgColour)
  $upperRadius = 7
  $lowerRadius = 5
  $slantAngle = 4deg
  $upperOffset = ($upperRadius / tan(($slantAngle / 2) + 45deg))
  $lowerOffset = ($lowerRadius / tan(($slantAngle / 2) + 45deg))
  $slantLength = ($tabHeight / cos($slantAngle))
  $baseLength = $tabHeight * tan($slantAngle)
  $tabEdgeWidth = $lowerOffset + $baseLength + $upperOffset
  $bgColourNo = substr('' + $bgColour, 1)
  $leftBackgroundImage = join('',
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cpath " \
    "d='M 0 " $tabHeight " l " (ceil($tabEdgeWidth) - $tabEdgeWidth) " 0 a " $lowerRadius " " $lowerRadius " 0 0 0 " \ 
    ($lowerOffset + ($lowerOffset / $slantLength * $baseLength)) " -" ($lowerOffset / $slantLength * $tabHeight) " l " \
    ($baseLength * (($slantLength - $lowerOffset - $upperOffset) / $slantLength)) " -" ($tabHeight * (($slantLength - $lowerOffset - $upperOffset) / $slantLength)) " " \
    "A " $upperRadius " " $upperRadius " 0 0 1 " ceil($tabEdgeWidth) " 0 l 0 " $tabHeight " z' " \
    "fill='%23" $bgColourNo "' /%3E%3C/svg%3E"
  )
  $rightBackgroundImage = join('',
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cpath " \
    "d='M 0 0 a " $upperRadius " " $upperRadius " 0 0 1 " \ 
    ($upperOffset + ($upperOffset / $slantLength * $baseLength)) " " ($upperOffset / $slantLength * $tabHeight) " l " \
    ($baseLength * (($slantLength - $lowerOffset - $upperOffset) / $slantLength)) " " ($tabHeight * (($slantLength - $lowerOffset - $upperOffset) / $slantLength)) " " \
    "A " $lowerRadius " " $lowerRadius " 0 0 0 " $tabEdgeWidth " " $tabHeight " L " ceil($tabEdgeWidth) " " $tabHeight " L 0 " $tabHeight " z' " \
    "fill='%23" $bgColourNo "' /%3E%3C/svg%3E"
  )
  background-image: url($leftBackgroundImage), linear-gradient($bgColour, $bgColour), url($rightBackgroundImage)
  background-repeat: no-repeat
  background-position: left, (ceil($tabEdgeWidth))px, right
  background-size: (ceil($tabEdgeWidth))px ($tabHeight)px, 'calc(100% - %s)' % (ceil($tabEdgeWidth)*2)px ($tabHeight)px


.tab
  padding: 0 18px
  min-width: 5em
  height: ($tabHeight)px
  flex-shrink: 0
  display: flex
  align-items: center
  cursor: pointer
  tabBackground(#262626)

  &:first-child
    margin-left: -2px

  &:not(:last-child)
    margin-right: -14px
    filter: drop-shadow(1px 0px 0px #181818)

  &:last-child
    margin-right: -4px
  
  &-focused
    tabBackground(#333)
    filter: none !important

.tab-icon
  margin-left: -4px
  margin-right: 4px

.close
  margin-left: auto
  margin-right: -7px
  opacity: 0

  .tab:hover &
    opacity: 1

.new-tab
  -webkit-app-region: no-drag
  padding-top: 4px
  padding-left: 4px
</style>
