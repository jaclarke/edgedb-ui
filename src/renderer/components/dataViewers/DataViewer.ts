import Vue from 'vue'

import { BaseScalarName, ICodec, ScalarCodec } from '@utils/edgedb'

import StrViewer from './StrViewer.vue'
import BytesViewer from './BytesViewer.vue'
import EnumViewer from './EnumViewer.vue'
import JsonViewer from './JsonViewer.vue'

const viewers: {[key in BaseScalarName]?: any} = {
  str: StrViewer,
  bytes: BytesViewer,
  enum: EnumViewer,
  json: JsonViewer,
}

export default Vue.extend({
  functional: true,
  props: ['item', 'codec'],
  render(h, {props: {item, codec}}: {props: {item: any, codec: ICodec}}) {
    const renderer = codec.getKind() === 'scalar' ?
      viewers[(codec as unknown as ScalarCodec).getBaseScalarName()]
      : null

    if (!renderer) {
      return h(
        'div',
        {staticClass: 'data-viewer-no-viewer'},
        'No details for selected item'
      )
    }
    return h(
      renderer,
      {
        props: {item, codec}
      }
    )
  }
})
