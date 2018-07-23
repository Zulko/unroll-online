import Vue from 'vue'
import Router from 'vue-router'
import unroll from '@/components/Unroll'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'unroll',
      component: unroll
    }
  ]
})
