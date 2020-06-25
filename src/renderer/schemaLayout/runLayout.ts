import nanoid from 'nanoid'
import { SchemaObject } from '@store/tabs/schema'

const worker = new Worker('schemaLayoutWorker.js')

type SchemaGraphItem = SchemaObject & {
  size: {
    width: number
    height: number
  }
}

interface Point {
  x: number
  y: number
}

interface LayoutNode {
  cx: number
  cy: number
  width: number
  height: number
}

export interface GraphLayout {
  width: number
  height: number
  nodes: LayoutNode[]
  routes: {
    path: Point[]
    midPoint: Point
    midPointDirection: 'N' | 'E' | 'S' | 'W'
    link: {
      index: number,
      type: 'inherits' | 'relation',
      source: LayoutNode,
      target: LayoutNode
    }
  }[]
}

const waitingLayouts = new Map<string, {
  resolve: (any) => any
  reject: () => any
}>()

export async function layoutSchema(
  schema: SchemaGraphItem[],
  gridSize: number
): Promise<GraphLayout> {
  const layoutId = nanoid()
  return new Promise((resolve, reject) => {
    waitingLayouts.set(layoutId, {
      resolve, reject
    })

    worker.postMessage({
      layoutId,
      schema,
      gridSize,
    })
  })
}

worker.onmessage = function({data}) {
  const waitingLayout = waitingLayouts.get(data.layoutId)

  if (waitingLayout) {
    waitingLayout.resolve(data.layout)
  }
}
