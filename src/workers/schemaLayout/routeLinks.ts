import { aStar } from './aStar'

import { LayoutNode, WebcolaLink } from './layout'

class GridPoint {
  constructor(
    public x: number,
    public y: number,
  ) {}

  get hash() {
    return `${this.x},${this.y}`
  }
}

class NodeGridPoint extends GridPoint {
  type = 'node'

  constructor(
    x: number,
    y: number,
    public node: LayoutNode,
    public edge?: 'top' | 'left' | 'right' | 'bottom'
  ) { super(x, y) }
}

enum LinkGridPointKind {
  VERTICAL,
  HORIZONTAL,
  CORNER,
  BLOCKING
}
class LinkGridPoint extends GridPoint {
  type = 'link'

  constructor(
    x: number,
    y: number,
    public node: LayoutLink,
    public kind: LinkGridPointKind
  ) { super(x, y) }
}

type AssignedGridPoint = NodeGridPoint | LinkGridPoint

interface LayoutLink {
  index: number,
  type: WebcolaLink['type'],
  source: LayoutNode,
  target: LayoutNode
}

interface Route {
  path: GridPoint[],
  link: LayoutLink,
  cost: number
}

type NodeEdges = Map<LayoutNode, ReturnType<typeof getNodeEdgePoints>>

function getNodeCorners(node: LayoutNode, gridSize: number) {
  const x0 = node.x / gridSize - 0.5,
        y0 = node.y / gridSize - 0.5,
        x1 = x0 + node.width / gridSize,
        y1 = y0 + node.height / gridSize
  return {
    x0, y0, x1, y1
  }
}

function getNodeEdgePoints(node: LayoutNode, gridSize: number) {
  const {x0, y0, x1, y1} = getNodeCorners(node, gridSize)
  return {
    topLeft: new NodeGridPoint(x0, y0, node),
    top: Array(x1-x0-1).fill(0).map((_, i) => new NodeGridPoint(x0+i+1, y0, node, 'top')),
    topRight: new NodeGridPoint(x1, y0, node),
    left: Array(y1-y0-1).fill(0).map((_, i) => new NodeGridPoint(x0, y0+i+1, node, 'left')),
    right: Array(y1-y0-1).fill(0).map((_, i) => new NodeGridPoint(x1, y0+i+1, node, 'right')),
    bottomLeft: new NodeGridPoint(x0, y1, node),
    bottom: Array(x1-x0-1).fill(0).map((_, i) => new NodeGridPoint(x0+i+1, y1, node, 'bottom')),
    bottomRight: new NodeGridPoint(x1, y1, node)
  }
}

function setupLayoutGrid(nodeEdges: NodeEdges) {
  const layoutGrid = new Map<string, AssignedGridPoint>()

  nodeEdges.forEach(edges => {
    [
      edges.topLeft, ...edges.top, edges.topRight,
      ...edges.left, ...edges.right,
      edges.bottomLeft, ...edges.bottom, edges.bottomRight
    ].forEach(gridNode => layoutGrid.set(gridNode.hash, gridNode))
  })

  return layoutGrid
}

export function routeLinks(nodes: LayoutNode[], links: WebcolaLink[], gridSize: number) {
  const nodeEdges = new Map<LayoutNode, ReturnType<typeof getNodeEdgePoints>>()

  nodes.forEach(node => {
    nodeEdges.set(node, getNodeEdgePoints(node, gridSize))
  })

  const preSortedLinks: LayoutLink[] = links.map((link, index) => {
      return {
        ...link,
        index,
        source: nodes[link.source.index],
        target: nodes[link.target.index]
      }
    })
    .sort((a, b) => {
      return ['inherits', 'relation'].indexOf(a.type) - ['inherits', 'relation'].indexOf(b.type)
    })
  
  const {routes: initialRoutes, layoutGrid: initialLayout} = runRouteLinks(preSortedLinks, nodeEdges)

  const jointPositions = repositionJoints(initialRoutes, nodeEdges, initialLayout)

  const sortedLinks = initialRoutes.sort((a, b) => {
    return b.cost - a.cost
  }).map(route => route.link)

  const { routes, layoutGrid } = runRouteLinks(sortedLinks, nodeEdges, jointPositions)

  return {
    routes: routes.filter(route => route.path.length).map(route => {
      return {
        ...route,
        ...processPath(route.link, route.path, gridSize, layoutGrid)
      }
    }),
    layoutGrid
  }
}

function runRouteLinks(links: LayoutLink[], nodeEdges: NodeEdges, jointPositions?: Map<LayoutLink, {source?: GridPoint, target?: GridPoint}>) {
  const layoutGrid = setupLayoutGrid(nodeEdges),
        routes: Route[] = []

  if (jointPositions) {
    for (const [link, joint] of jointPositions.entries()) {
      [
        {jointPoint: joint.source, node: link.source},
        {jointPoint: joint.target, node: link.target}
      ].forEach(({jointPoint, node}) => {
        if (jointPoint) {
          const edges = nodeEdges.get(node)

          let x = 0, y = 0
          if (jointPoint.x === edges?.topLeft.x) x = -1
          else if (jointPoint.x === edges?.bottomRight.x) x = 1
          if (jointPoint.y === edges?.topLeft.y) y = -1
          else if (jointPoint.y === edges?.bottomRight.y) y = 1

          const entryPoint = new LinkGridPoint(
            jointPoint.x + x,
            jointPoint.y + y,
            link,
            link.type === 'relation' ? LinkGridPointKind.BLOCKING : (
              x===0 ? LinkGridPointKind.VERTICAL : LinkGridPointKind.HORIZONTAL
            )
          )
          layoutGrid.set(entryPoint.hash, entryPoint)

          if (link.type === 'relation') {
            const extendingPoint = new LinkGridPoint(
              jointPoint.x + x*2,
              jointPoint.y + y*2,
              link,
              x===0 ? LinkGridPointKind.VERTICAL : LinkGridPointKind.HORIZONTAL
            )
            layoutGrid.set(extendingPoint.hash, extendingPoint)
          }
        }
      })
    }
  }

  links.forEach((link, i) => {
    const inheritLink = link.type === 'inherits',
          sourceEdges = nodeEdges.get(link.source),
          targetEdges = nodeEdges.get(link.target),
          jointPosition = jointPositions?.get(link)
    
    if (!sourceEdges || !targetEdges || (!jointPosition && link.source === link.target)) {
      routes.push({link, path: [], cost: 0})
      return
    }
    
    const startPoints = jointPosition?.source ? [jointPosition.source] : (inheritLink ? sourceEdges.top :
            [...sourceEdges.top, ...sourceEdges.left, ...sourceEdges.right, ...sourceEdges.bottom]),
          endPoints = jointPosition?.target ? [jointPosition.target] : (inheritLink ? [targetEdges.bottom[Math.floor(targetEdges.bottom.length/2)]] :
            [...targetEdges.top, ...targetEdges.left, ...targetEdges.right, ...targetEdges.bottom]),
          startHashes = startPoints.map(point => point.hash),
          endHashes = endPoints.map(point => point.hash)

    const search = aStar<GridPoint>({
      startNodes: startPoints,
      isEnd: node => endHashes.includes(node.hash),
      neighbors: (node, prevNode) => {
        const isBlockingNode = link.type === 'relation' && (
          startHashes.includes(node.hash) || (!!prevNode && startHashes.includes(prevNode.hash))
        )
        const points = [
          {x: 0, y: -1},
          {x: 0, y: +1},
          {x: -1, y: 0},
          {x: +1, y: 0}
        ].map(move => {
          const isCornerNode = !!prevNode && (
            (prevNode.x === node.x && move.x !== 0) ||
            (prevNode.y === node.y && move.y !== 0)
          )
          let steps = 1
          while (true) {
            const nextPoint = new GridPoint(
                node.x + move.x*steps,
                node.y + move.y*steps
              )
            if (prevNode?.hash === nextPoint.hash ||
                (nextPoint.x > sourceEdges.topLeft.x && nextPoint.x < sourceEdges.bottomRight.x &&
                nextPoint.y > sourceEdges.topLeft.y && nextPoint.y < sourceEdges.bottomRight.y)
              ) return;
            let gridNode = layoutGrid.get(nextPoint.hash)
                
            if (gridNode?.node === link) gridNode = undefined

            const isLinkNode = gridNode?.type === 'link',
                  canOverlay = (
                    isLinkNode && inheritLink && 
                    (gridNode as LinkGridPoint).node.type === 'inherits' &&
                    (gridNode as LinkGridPoint).node.target === link.target
                  )

            if (
              !isBlockingNode && !canOverlay && isLinkNode && (
              (move.x === 0 && (gridNode as LinkGridPoint).kind === LinkGridPointKind.HORIZONTAL) ||
              (move.y === 0 && (gridNode as LinkGridPoint).kind === LinkGridPointKind.VERTICAL))
            ) steps++
            else {
              if (!(isBlockingNode && isCornerNode) && (
                  !gridNode || canOverlay ||
                  ((inheritLink || (steps === 1 && !isCornerNode)) && endHashes.includes(gridNode.hash))
                )
              ) return {
                node: nextPoint, cost: steps + (steps>1?(steps-1)*2:0) + (isCornerNode?1:0)
              }
              return;
            }
          }
        }).filter(p => !!p)

        return points as {node: GridPoint, cost: number}[]
      },
      heuristic: node => {
        if (jointPosition?.target) {
          return Math.abs(node.x - jointPosition.target.x) + Math.abs(node.y - jointPosition.target.y) + 1
        }
        let xDelta = 0, yDelta = 0
        if (node.x < targetEdges.topLeft.x) xDelta = targetEdges.topLeft.x - node.x
        else if (node.x > targetEdges.bottomRight.x) xDelta = node.x - targetEdges.bottomRight.x
        if (node.y < targetEdges.topLeft.y) yDelta = targetEdges.topLeft.y - node.y
        else if (node.y > targetEdges.bottomRight.y) yDelta = node.y - targetEdges.bottomRight.y
        return xDelta + yDelta
      },
      hash: (node, prevNode) => {
        if (prevNode && !!jointPositions) return node.hash+'/'+prevNode.hash
        return node.hash
      },
    })

    for (let i = 1; i < search.path.length-1; i++) {
      const [prev, point, next] = search.path.slice(i-1, i+2)
      // if (layoutGrid.has(point.hash)) continue;
      
      let kind = (prev.x === point.x && point.x === next.x) ? LinkGridPointKind.VERTICAL : (
          (prev.y === point.y && point.y === next.y) ? LinkGridPointKind.HORIZONTAL :
            LinkGridPointKind.CORNER
        )
      if (
        link.type === 'relation' &&
        kind !== LinkGridPointKind.CORNER &&
        (i === 1 || i === search.path.length-2)
      ) {
        kind = LinkGridPointKind.BLOCKING
      }
      layoutGrid.set(point.hash, new LinkGridPoint(
        point.x, point.y,
        link, kind
      ))
    }

    routes.push({
      link,
      path: search.path,
      cost: search.cost
    })
  })

  return {routes, layoutGrid}
}

function processPath(link: LayoutLink, path: GridPoint[], gridSize: number, layoutGrid: Map<string, AssignedGridPoint>) {
  const simplifiedPath = path.filter((point, i, path) => {
      if (i === 0 || i === path.length-1) return true
      const prev = path[i-1], next = path[i+1]
      return !(prev.x === point.x && point.x === next.x) &&
            !(prev.y === point.y && point.y === next.y)
    })
  
  const expandedPath = simplifiedPath.reduce((path, point, i) => {
    if (i===0) return path
    const prev = simplifiedPath[i-1],
          xSign = Math.sign(point.x - prev.x),
          ySign = Math.sign(point.y - prev.y)
    path.push(
      ...Array(Math.abs(prev.x - point.x) + Math.abs(prev.y - point.y)).fill(0)
      .map((_, i) => new GridPoint(prev.x + xSign*i, prev.y + ySign*i))
    )
    return path
  }, [] as GridPoint[])

  const pathMid = Math.floor(expandedPath.length/2)
  let midPoint = expandedPath[pathMid], offset = 0
  while(midPoint) {
    const gridPoint = layoutGrid.get(midPoint.hash) as LinkGridPoint
    if (gridPoint && gridPoint.node === link && (
      gridPoint.kind === LinkGridPointKind.HORIZONTAL ||
      gridPoint.kind === LinkGridPointKind.VERTICAL)
    ) {
      let isVertical = gridPoint.kind === LinkGridPointKind.VERTICAL,
        crossingDirection = isVertical ? LinkGridPointKind.HORIZONTAL : LinkGridPointKind.VERTICAL,
        sidePoints = [
          new GridPoint(midPoint.x + (isVertical?-1:0), midPoint.y + (isVertical?0:-1)),
          new GridPoint(midPoint.x + (isVertical?1:0), midPoint.y + (isVertical?0:1)),
        ]
      if (!sidePoints.some(point => {
        const gridPoint = layoutGrid.get(point.hash) as LinkGridPoint | undefined
        return gridPoint && gridPoint?.kind === crossingDirection
      })) break;
    }
    offset *= -1
    offset += offset>=0?1:0
    midPoint = expandedPath[pathMid+offset]
  }

  let midPointDirection: 'N' | 'E' | 'S' | 'W' | null = null
  if (midPoint) {
    let xDelta = 0, yDelta = 0
    if (pathMid+offset === 0) {
      let next = expandedPath[pathMid+offset+1]
      xDelta = next.x - midPoint.x
      yDelta = next.y - midPoint.y
    } else {
      let prev = expandedPath[pathMid+offset-1]
      xDelta = midPoint.x - prev.x
      yDelta = midPoint.y - prev.y
    }
    if (xDelta) {
      midPointDirection = xDelta > 0 ? 'E' : 'W'
    } else {
      midPointDirection = yDelta > 0 ? 'S' : 'N'
    }
  }

  return {
    path: simplifiedPath.map(p => ({x: (p.x+0.5)*gridSize, y: (p.y+0.5)*gridSize})),
    midPoint: midPoint ? {
      x: (midPoint.x+0.5)*gridSize,
      y: (midPoint.y+0.5)*gridSize
    } : null,
    midPointDirection
  }
}

interface NodeJoint {
  type: 'source' | 'target'
  link: LayoutLink
  point?: GridPoint
}
interface NodeJointEdges {
  top: NodeJoint[]
  left: NodeJoint[]
  right: NodeJoint[]
  bottom: NodeJoint[]
}

function repositionJoints(routes: Route[], nodeEdges: NodeEdges, layoutGrid: Map<string, AssignedGridPoint>) {
  const nodeJoints = new Map<LayoutNode, NodeJointEdges>()
  
  for (let node of nodeEdges.keys()) {
    nodeJoints.set(node, {
      top: [],
      left: [],
      right: [],
      bottom: []
    })
  }

  routes
  .filter(route => route.link.source !== route.link.target)
  .forEach(route => {
    [
      { type: 'source', nodeJointEdges: nodeJoints.get(route.link.source), point: route.path[0]},
      { type: 'target', nodeJointEdges: nodeJoints.get(route.link.target), point: route.path[route.path.length-1]}
    ].forEach(({type, nodeJointEdges, point}) => {
      const gridNode = layoutGrid.get(point.hash) as NodeGridPoint | undefined
      if (gridNode && gridNode.edge) {
        nodeJointEdges?.[gridNode.edge]
          .push({
            type: type as 'source' | 'target',
            link: route.link,
            point
          })
      }
    })
  })

  routes
  .filter(route => route.link.source === route.link.target)
  .forEach(route => {
    const nodeJointEdges = nodeJoints.get(route.link.source)
    if (!nodeJointEdges) return;

    let bestEdge: keyof NodeJointEdges | undefined, bestEdgeFreePoints = 1
    for (let [edge, joints] of Object.entries(nodeJointEdges) as [keyof NodeJointEdges, NodeJoint[]][]) {
      const filledPoints = joints.reduce((sum, joint) => {
        if (joint.type === 'target' && joint.link.type === 'inherits') {
          return sum + (
            joints.find(j => j.link.target === joint.link.target) === joint ? 1 : 0
          )
        }
        return sum + 1
      }, 0)

      const freePoints = (nodeEdges.get(route.link.source)?.[edge].length || 0) - filledPoints
      if (freePoints > bestEdgeFreePoints) {
        bestEdge = edge
        bestEdgeFreePoints = freePoints
      }
    }

    if (bestEdge) {
      nodeJointEdges[bestEdge].push({
        type: 'source',
        link: route.link
      }, {
        type: 'target',
        link: route.link
      })
    }
  })

  const jointPositions = new Map<LayoutLink, {source?: GridPoint, target?: GridPoint}>()

  for (let [node, jointEdges] of nodeJoints.entries()) {
    const edges = nodeEdges.get(node)
    for (let [edge, joints] of Object.entries(jointEdges) as [keyof NodeJointEdges, NodeJoint[]][]) {
      joints.sort((a, b) => {
        if (!a.point) return 1
        if (!b.point) return -1
        return a.point.x === b.point.x ?
          (a.point.y - b.point.y) : (a.point.x - b.point.x)
      })
      const pointIndexes: number[] = []
      let i = -1, prevPoint = ''
      for (let joint of joints) {
        if (!joint.point || joint.point.hash !== prevPoint) i++
        pointIndexes.push(i)
        prevPoint = joint.point?.hash || ''
      }

      const filledPoints = i+1,
            edgeLength = edges?.[edge].length as number
      const gap = Math.floor( (edgeLength-filledPoints)/(filledPoints+1) )
      joints.forEach((joint, i) => {
        const pointIndex = pointIndexes[i],
              edgeIndex = pointIndex < (filledPoints/2) ? 
                ( gap*(pointIndex+1) + pointIndex ) :
                ( (edgeLength-1) - (gap*(filledPoints-pointIndex) + (filledPoints-pointIndex-1)) )

        let position = jointPositions.get(joint.link)
        if (!position) {
          position = {}
          jointPositions.set(joint.link, position)
        }
        position[joint.type] = edges?.[edge][edgeIndex]
      })
    }
  }

  return jointPositions
}
