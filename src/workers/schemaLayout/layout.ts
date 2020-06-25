import {
  Layout as webcolaLayout,
  Link as webcolaLink,
  Node as webcolaNode,
  EventType as webcolaEventType
} from 'webcola'
import { routeLinks } from './routeLinks'
import { SchemaObject } from '@store/tabs/schema'


onmessage = function({data}) {
  const { layoutId, schema, gridSize } = data

  layoutSchema(schema, gridSize).then(layout => {
    // @ts-ignore
    postMessage({
      layoutId,
      layout
    })
  })
}

type SchemaGraphItem = SchemaObject & {
  size: {
    width: number
    height: number
  }
}

interface WebcolaNode {
  index: number
  width: number
  height: number
}
export interface WebcolaLink {
  type: 'inherits' | 'relation'
  id: string
  source: WebcolaNode
  target: WebcolaNode
  data?: SchemaObject['links'][0]
}
interface WebcolaConstraint {
  axis: 'y' | 'x'
  left: number
  right: number
  gap: number
}

function snapToGrid(gridSize: number, value: number) {
  return Math.floor(value/gridSize)*gridSize
}

export class LayoutNode {
  constructor(
    public cx: number,
    public cy: number,
    public width: number,
    public height: number,
  ) {}

  get x() {
    return this.cx - this.width/2
  }

  get y() {
    return this.cy - this.height/2
  }
}

async function layoutSchema(
  schema: SchemaGraphItem[],
  gridSize: number
) {
  const margin = gridSize * 2.5

  const nodes: WebcolaNode[] = schema.map((item, i) => ({
    index: i,
    width: item.size.width + margin*2,
    height: item.size.height + margin*2,
  }))

  const nodesMap = nodes.reduce((map, node) => {
    map[schema[node.index].name] = node
    return map
  }, {} as {[key: string]: WebcolaNode | undefined})

  const links: WebcolaLink[] = []
  const constraints: WebcolaConstraint[] = []

  nodes.forEach((node, nodeIndex) => {
    const schemaItem = schema[nodeIndex]
    schemaItem.baseNames.forEach(baseName => {
      const baseNode = nodesMap[baseName]
      if (baseNode) {
        links.push({
          type: 'inherits',
          id: `${schemaItem.name}--${baseName}`,
          source: node,
          target: baseNode
        })
        constraints.push({
          axis: 'y',
          left: nodes.indexOf(baseNode),
          right: nodeIndex,
          gap: 100
        })
      }
    })
  
    if (schemaItem.is_abstract) return;

    schemaItem.links.forEach(link => {
      const linkNode = nodesMap[link.targetName]
      if (linkNode) {
        links.push({
          type: 'relation',
          id: `${schemaItem.name}.${link.name}`,
          source: node,
          target: linkNode,
          data: link,
        })
      }
    })
  })

  console.time('webcola layout')
  const layout = await runLayout(nodes, links, constraints)
  console.timeEnd('webcola layout')

  const positionedNodes = layout.nodes()
    .map((node, i) => {
      const layoutNode = new LayoutNode(
        Math.round(node.x),
        Math.round(node.y),
        schema[i].size.width,
        schema[i].size.height
      )
      layoutNode.cx = snapToGrid(gridSize, layoutNode.x) + layoutNode.width/2
      layoutNode.cy = snapToGrid(gridSize, layoutNode.y) + layoutNode.height/2

      return layoutNode
    })

  const xMin = Math.min(...positionedNodes.map(node => node.x - margin)), //- gridSize/2,
        yMin = Math.min(...positionedNodes.map(node => node.y - margin)), //- gridSize/2,
        width = Math.max(...positionedNodes.map(node => node.x + node.width + margin)) - xMin,
        height = Math.max(...positionedNodes.map(node => node.y + node.height + margin)) - yMin

  positionedNodes.forEach(node => {
    node.cx -= xMin
    node.cy -= yMin
  })

  const routedLinks = routeLinks(positionedNodes, links, gridSize)

  return {
    width,
    height,
    nodes: positionedNodes,
    routes: routedLinks.routes,
    grid: routedLinks.layoutGrid,
  }
}

function runLayout(nodes: WebcolaNode[], links: WebcolaLink[], constraints: WebcolaConstraint[]) {
  return new Promise((resolve: (value: webcolaLayout) => void, reject) => {
    const layout = new webcolaLayout()

    layout
      .handleDisconnected(false)
      .linkDistance(nodes[0].width*0.7)
      .avoidOverlaps(true)
      .nodes(nodes)
      .links(links as unknown as webcolaLink<webcolaNode>[])
      .constraints(constraints)
      // .on(webcolaEventType.start, () => console.log('start')) 
      // .on(webcolaEventType.tick, () => console.log('tick')) 
      .on(webcolaEventType.end, () => {
        // console.log('end')
        resolve(layout)
      })

      layout.start(20, 20, 20, 0)
  })
}
