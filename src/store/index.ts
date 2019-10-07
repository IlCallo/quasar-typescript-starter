import { VueConstructor } from 'vue';
import Vuex from 'vuex';

// import example from './module-example'

/*
 * If not building with SSR mode, you can
 * directly export the Store instantiation
 */

export default function({ Vue }: { ssrContext: any; Vue: VueConstructor }) {
  Vue.use(Vuex);

  const Store = new Vuex.Store({
    modules: {
      // example
    },

    // enable strict mode (adds overhead!)
    // for dev mode only
    strict: !!process.env.DEV
  });

  return Store;
}
