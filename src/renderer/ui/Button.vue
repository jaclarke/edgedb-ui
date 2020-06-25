<template>
  <button v-on="$listeners">
    <icon v-if="icon && !loading" :name="icon" class="button-icon" />
    <loading v-if="loading" class="button-icon" />
    <slot />
  </button>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import Icon from './Icon.vue'
import Loading from './Loading.vue'

@Component({
  components: {
    Icon,
    Loading,
  }
})
export default class Button extends Vue {
  @Prop()
  icon?: string

  @Prop()
  loading?: boolean
}
</script>

<style lang="stylus" scoped>
.button-icon
  margin: -3px 3px -5px -5px
</style>
