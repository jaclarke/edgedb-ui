<template>
  <button class="input-file-picker" @click="openDialog">
    <icon name="folder" />
    <span :class="{
      placeholder: !value
    }">{{ value || 'Choose File...' }}</span>
  </button>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import Icon from '@ui/Icon.vue'

import 'assets/icons/folder.svg'

@Component({
  components: {
    Icon
  }
})
export default class FilePicker extends Vue {
  @Prop()
  value!: string

  @Prop({
    default: 'open'
  })
  type!: 'open' | 'save'

  @Prop()
  options?: any

  openDialog() {
    if (this.type === 'save') {
      window.dialog.showSaveDialog(this.options)
        .then(({filePath, canceled}) => {
          if (!canceled) this.$emit('input', filePath || '')
        })
    } else {
      window.dialog.showOpenDialog(this.options)
        .then(({filePaths, canceled}) => {
          if (!canceled) this.$emit('input', filePaths[0] || '')
        })
    }
  }
}
</script>

<style lang="stylus" scoped>
.input-file-picker
  svg
    margin-left: -4px
    margin-right: 4px

  span
    overflow: hidden
    text-overflow: ellipsis
    direction: rtl

  .placeholder
    color: #a0a0a0
    direction: initial

</style>
