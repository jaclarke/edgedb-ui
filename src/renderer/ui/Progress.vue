<template>
  <div class="progress">
    <div v-if="value" class="progress-bar"
      :style="{width: `calc(${progressPercent}% + 8px)`}"></div>
    <div v-else class="indeterminate-bar"></div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class Progress extends Vue {
  @Prop()
  value!: number

  @Prop({
    default: 1
  })
  max!: number

  get progressPercent() {
    return (this.value / this.max)*100
  }
}
</script>

<style lang="stylus" scoped>
.progress
  height: 8px
  background: rgba(0,0,0,0.35)
  border-radius: 4px
  overflow: hidden

.progress-bar
  position: relative
  height: 8px
  background-color: var(--accent-colour)
  border-radius: 4px
  margin-left: -8px
  overflow: hidden
  transition: width 0.2s

  &:after
    content: ''
    position: absolute
    height: 100%
    right: 0px
    width: 100%
    min-width: 60px
    border-radius: 4px
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2))
    background-size: 60px 100%
    background-repeat: no-repeat
    background-position: right
    animation: progress-highlight 2s infinite

.indeterminate-bar
  position: relative
  height: 100%
  border-radius: 4px
  width: 100%
  animation: indeterminate 1.5s infinite

  &:after
    content: ''
    position: absolute
    background-color: var(--accent-colour)
    height: 100%
    border-radius: 4px
    width: 40%

@keyframes progress-highlight {
  from {
    transform: translateX(-100%)
  }
  to {
    transform: translate(60px)
  }
}

@keyframes indeterminate {
  from {
    transform: translateX(-40%)
  }
  to {
    transform: translateX(100%)
  }
}
</style>
