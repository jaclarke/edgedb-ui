import { Module, VuexModule, Action, Mutation } from 'vuex-class-modules'

@Module
export class ResizablePanelModule extends VuexModule {
  layout: 'vertical' | 'horizontal' = 'vertical'

  isCollapsed = true

  size: number = 50

  @Mutation
  setCollapsed(collapsed?: boolean) {
    this.isCollapsed = collapsed ?? !this.isCollapsed
  }

  @Mutation
  updateSize(size: number) {
    this.size = size > 90 ? 90 : (size < 10 ? 10 : size)
  }

  @Mutation
  changeLayout(layout?: 'vertical' | 'horizontal') {
    if (!layout) {
      this.layout = this.layout === 'vertical' ? 'horizontal' : 'vertical'
    } else {
      this.layout = layout
    }
  }
}
