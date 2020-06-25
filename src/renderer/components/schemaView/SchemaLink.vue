<template>
  <g class="link" :class="{inherits: inheritsLink}">
    <defs>
      <g :id="link.link.id" style="pointer-events: none">
        <path class="line" :d="path" />
        <g v-if="link.midPoint" :transform="`rotate(${directionRotation}, ${link.midPoint.x}, ${link.midPoint.y})`">
          <circle class="circlefill" :cx="link.midPoint.x" :cy="link.midPoint.y" r="8" />
          <path :d="`M ${link.midPoint.x-4} ${link.midPoint.y+2} l 4 -4 l 4 4`" />
        </g>
        <g v-if="!inheritsLink" :transform="sourceSymbolTransform">
          <template v-if="sourceCardinality === 'MANY'">
            <path d="M12.5139 7C11.5268 7 10.5617 7.29219 9.74038 7.83975L3.25962 12.1603C2.43829 12.7078 1.47325 13 0.486122 13H0"/>
            <path d="M12.5139 7C11.5268 7 10.5617 6.70781 9.74038 6.16025L3.25962 1.83975C2.43829 1.29219 1.47325 1 0.486122 1H0"/>
          </template>
          <path v-else d="M7 1V13"/>
        </g>
        <g v-if="!inheritsLink" :transform="targetSymbolTransform">
          <template v-if="targetCardinality === 'MANY'">
            <path d="M12.5139 7C11.5268 7 10.5617 7.29219 9.74038 7.83975L3.25962 12.1603C2.43829 12.7078 1.47325 13 0.486122 13H0"/>
            <path d="M12.5139 7C11.5268 7 10.5617 6.70781 9.74038 6.16025L3.25962 1.83975C2.43829 1.29219 1.47325 1 0.486122 1H0"/>
          </template>
          <path v-else d="M7 1V13"/>
          <path v-if="targetRequiredness" d="M15 1V13"/>
          <circle v-else class="circlefill" r="5" cx="17" cy="7"/>
        </g>
      </g>
    </defs>
    <use v-if="!inheritsLink" class="highlight" :xlink:href="'#'+link.link.id"
      :class="{highlighted: highlighted}" />
    <use :xlink:href="'#'+link.link.id" />

    <path v-if="!inheritsLink" class="hover-target" :d="path" @mouseover.stop="$emit('mouseover')" />
  </g>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

function getArcSweep(prev, current, next) {
  if (prev.y === current.y) {
    return prev.x < current.x ?
      (next.y > current.y ? 1 : 0) :
      (next.y > current.y ? 0 : 1)
  } else {
    return prev.y < current.y ?
      (next.x > current.x ? 0 : 1) :
      (next.x > current.x ? 1 : 0)
  }
}

@Component
export default class SchemaLink extends Vue {
  cornerRadius = 8

  @Prop()
  link!: any

  @Prop()
  linkRoute!: any

  @Prop()
  highlighted!: boolean

  get path() {
    const route = this.link.link.type === 'inherits' ? [...this.linkRoute].reverse() : this.linkRoute
    if (route.length < 2) return ''

    let path = `M ${route[0].x} ${route[0].y}`
    for (let i = 1; i < route.length-1; i++) {
      let [prev, current, next] = route.slice(i-1, i+2)

      path += ` L ${
        current.x + Math.sign(prev.x-current.x)*this.cornerRadius
      } ${
        current.y + Math.sign(prev.y-current.y)*this.cornerRadius
      } A ${this.cornerRadius} ${this.cornerRadius} 0 0 ${
        getArcSweep(prev, current, next)
      } ${
        current.x + Math.sign(next.x-current.x)*this.cornerRadius
      } ${
        current.y + Math.sign(next.y-current.y)*this.cornerRadius
      }`
    }
    path += `L ${route[route.length-1].x} ${route[route.length-1].y}`
    return path
  }

  get sourceSymbolTransform() {
    const p = this.linkRoute[0],
          p1 = this.linkRoute[1]
    const rotateDeg = p1.x > p.x ? 0 : (
      p1.x < p.x ? 180 : (p1.y > p.y ? 90 : -90)
    )
    return `rotate(${rotateDeg} ${p.x} ${p.y}) translate(${p.x} ${p.y-7})`
  }

  get targetSymbolTransform() {
    const p = this.linkRoute[this.linkRoute.length-1],
          p1 = this.linkRoute[this.linkRoute.length-2]
    const rotateDeg = p1.x > p.x ? 0 : (
      p1.x < p.x ? 180 : (p1.y > p.y ? 90 : -90)
    )
    return `rotate(${rotateDeg} ${p.x} ${p.y}) translate(${p.x} ${p.y-7})`
  }

  get sourceCardinality() {
    return this.link.link.data.exclusive ? 'ONE' : 'MANY'
  }

  get targetCardinality() {
    return this.link.link.data.cardinality
  }

  get targetRequiredness() {
    return this.link.link.data.required
  }

  get directionRotation() {
    return ['N', 'E', 'S', 'W'].indexOf(this.link.midPointDirection)*90
  }

  get inheritsLink() {
    return this.link.link.type === 'inherits'
  }
}
</script>

<style lang="stylus" scoped>
.link
  fill: none
  stroke: #fff
  stroke-width: 1.25

.highlight
  stroke-width: 8
  cursor: pointer
  opacity: 0
  stroke-linecap: round

  &.highlighted
    opacity: 0.15

.inherits
  stroke: #aaa

  .line
    stroke-dasharray: 8 6

.circlefill
  fill: var(--backgroundColour)

.hover-target
  stroke-width: 20
  opacity: 0
</style>
