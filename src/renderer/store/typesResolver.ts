import Vue from 'vue'
import { Module, VuexModule, Mutation, Action } from 'vuex-class-modules'

import store from './store'

import { ResolveTypesRequest, ResolveTypesResponse } from '@shared/interfaces'

const ipc = (window as any).ipc

@Module
class TypesResolverModule extends VuexModule {
  types: {
    [id: string]: {
      name: string
    }
  } = {}

  @Action
  resolveTids(request: ResolveTypesRequest) {
    ipc.callMain('typesResolver:resolve', request)
  }

  @Mutation
  addTypes(types: ResolveTypesResponse['types']) {
    types.forEach(({id, name}) => {
      if (!name) return;

      const [module, typeName] = name.split('::')
      Vue.set(this.types, id, {
        name: module === 'default' ? typeName : name,
      })
    })
  }
}

export const typesResolverModule = new TypesResolverModule({store, name: 'typesResolver'})

;(window as any).ipc.answerMain('typesResolver:resolved', ({types}: ResolveTypesResponse) => {
  typesResolverModule.addTypes(types)
})
