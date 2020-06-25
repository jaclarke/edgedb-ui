<template>
  <select v-on="$listeners" v-model="model"
    :class="{
      'disabled-selection': !value
    }">
    <slot />
  </select>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

@Component
export default class Select extends Vue {
  @Prop()
  value!: any

  get model() {
    return this.value
  }
  set model(val: any) {
    this.$emit('input', val)
  }
}
</script>

<style lang="stylus" scoped>
select
  background-color: #292929
  color: #e0e0e0
  font-family: Segoe UI, sans-serif
  font-size: 13px
  border: 1px solid transparent
  border-radius: 4px
  padding: 5px 12px
  padding-right: 25px
  outline: 0
  -webkit-appearance: none
  background-image: url("data:image/svg+xml,%3Csvg width='21' height='21' viewBox='0 0 21 21' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 8l4.5 4.5L15 8' stroke='%23BDBDBD' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A")
  background-repeat: no-repeat
  background-position: right 2px center
  background-size: 22px
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.1)

  &:disabled
    opacity: 0.7

  &:focus
    border-color: var(--accent-colour)

  &:hover
    background-color: #2b2b2b

  &:active
    background-color: #272727

  & option
    color: #e0e0e0

    &:disabled
      color: #969696

.disabled-selection
  color: #969696
</style>
