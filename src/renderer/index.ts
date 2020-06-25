import Vue from 'vue'
import PortalVue from 'portal-vue'
import Vuelidate from 'vuelidate'

import App from './App.vue'
import store from './store/store'

Vue.config.productionTip = false

Vue.use(PortalVue)
Vue.use(Vuelidate)

new Vue({
  el: '#app',
  store,
  render: h => h(App),
})
