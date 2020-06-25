import Vue from 'vue'

import { typesResolverModule } from '@store/typesResolver'
import { ICodec, ScalarCodec } from '@utils/edgedb'

function getTypeName(item: any, codec: ICodec, limit: number): string {
  switch (codec.getKind()) {
    case 'object':
      return typesResolverModule.types[item.__tid__?.toRawString()]?.name || 'Object'
    case 'array':
      return `Array(${item.length})`
    case 'set':
      const limited = limit && item.length === (limit+1)
      return `Set(${limited ? limit+'+' : item.length})`
    case 'tuple':
      return `Tuple(${item.length})`
    case 'namedtuple':
      return `NamedTuple(${item.length})`
    case 'scalar':
      const baseScalarName = (codec as unknown as ScalarCodec).getBaseScalarName()
      switch (baseScalarName) {
        case 'bytes':
          return `bytes(${item.length})`
        default:
          const customName = typesResolverModule.types[codec.tid]?.name
          return baseScalarName + (customName?`<${customName}>`:'')
      }
  }
}

interface Props {
  item: any,
  codec: ICodec,
  implicitlimit: number
}

export default Vue.extend({
  functional: true,
  props: ['item', 'codec', 'implicitlimit'],
  render(h, {props: {item, codec, implicitlimit}}: {props: Props}) {
    const typeName = getTypeName(item, codec, implicitlimit)
    return h('span', {
      staticClass: 'item-type'+(
        codec.getKind() === 'object' && typeName !== 'Object' ? ' item-type-object' : ''
      )
    }, typeName)
  }
})
