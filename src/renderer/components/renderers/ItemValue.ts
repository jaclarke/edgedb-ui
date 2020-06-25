import { CreateElement } from 'vue'
import { Vue, Component, Prop } from 'vue-property-decorator'
import ItemType from './ItemType'
import { ICodec, ScalarCodec, BaseScalarName } from '@utils/edgedb'

function zeroPad(n: number, padding = 2) {
  return n.toString().padStart(padding, '0')
}

function getPreview(h: CreateElement, value: any, typeName: BaseScalarName, short: boolean) {
  switch (typeName) {
    case 'bytes': {
      const vnodes = [...value.slice(0, 20)].map(n => h('span', n.toString(16).padStart(2, '0')))
      if (value.length > 20) {
        vnodes.push( h('span', {staticClass: 'whitespace-char'}, '…') )
      }
      return vnodes
    }
    case 'str': {
      const maxLen = short ? 20 : 100
      const vnodes = value.slice(0, maxLen).split(/\r|\n|\r\n/)
        .flatMap(str => {
          return [str, h('span', {staticClass: 'whitespace-char'}, '↵')]
        }).slice(0, -1)
      if (value.length > maxLen) {
        vnodes.push( h('span', {staticClass: 'whitespace-char'}, '…') )
      }
      return vnodes
    }
    case 'json': {
      const maxLen = short ? 20 : 100
      const vnodes = [value.slice(0, maxLen)]
      if (value.length > maxLen) {
        vnodes.push( h('span', {staticClass: 'whitespace-char'}, '…') )
      }
      return vnodes
    }
    case 'datetime': {
      const [isoDate, isoTime] = value.toISOString().split('T')
      return `${isoDate} ${isoTime.slice(0, -1)} UTC`
    }
    case 'localdatetime': {
      const [isoDate, isoTime] = value.toISOString().split('T')
      return `${isoDate} ${isoTime}`
    }
    case 'float32':
      return value.toPrecision(8)
    default:
      return value.toString()
  }
}


@Component
export default class ItemValue extends Vue {
  @Prop()
  item: any

  @Prop()
  codec: ICodec

  @Prop({
    default: false,
  })
  short: boolean

  @Prop()
  implicitlimit: number


  render(h: CreateElement) {
    if (this.item === null) {
      return h('span', {staticClass: 'value-type-null'})
    }

    const codecKind = this.codec.getKind(),
          baseScalarName = (this.codec as unknown as ScalarCodec).getBaseScalarName?.()

    if (codecKind !== 'scalar' || (this.short && baseScalarName === 'bytes')) {
      return h(ItemType, {
        props: this.$props
      })
    }

    return h('span', {
      attrs: this.$attrs,
      staticClass: 'value-type-'+baseScalarName,
    }, getPreview(h, this.item, baseScalarName, this.short))
  }
}
