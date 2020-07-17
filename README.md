# quasar-typescript-starter

> THIS REPOSITORY WAS A PROOF OF CONCEPT AND MOST OF ITS FEATURES HAS BEEN INTEGRATED DIRECTLY INTO QUASAR, IT IS OUT OF DATE AND DOES NOT REFLECT THE CURRENT QUASAR-TYPESCRIPT INTEGRATION STATUS, EVEN IF YOU CAN USE IT AS A GOOD RESOURCE ON TYPESCRIPT QUIRKS. 

Most of the stuff is copied from TypeScript app-extension to which I previously contributed.
Especially webpack configuration extension has been taken from there and I cannot guarantee it's the best way to manage it, not having done it myself, but it works.

Current setup is meant to work with normal, PWA and Electron modes and has not been tried with Cordova.
All meaningful open issues I found on `app-extension-typescript` are solved by this starter.

## ESLint

ESLint has been setup with Prettier enabled.
Everything should work with ESLint 6 too (I'm using it in a project of my company without problems), but default installed version is < 6 so I left it untouched.
See [here](https://github.com/quasarframework/app-extension-typescript/blob/dev/extension/src/templates/noprettier/_eslintrc.js) for Prettier-free version.

Problems with `@typescript-eslint` and Vue files linting [have been solved](https://github.com/quasarframework/app-extension-typescript/issues/23#issuecomment-544956269).
DFC (Double File Component) fashion, instead of SFC, is still needed to have component intellisense into unit tests.

Into `.eslintrc.js`:

- `'vue/component-name-in-template-casing': ['error', 'kebab-case']` enforces kebab-case, but it should probably be defined based on user preferences, given the recent Quasar addition which allows to choose components casing into templates;
- `@typescript-eslint/explicit-function-return-type` rule is turned off because I personally think that rule is too restrictive and verbose, but it has its benefits and should probably be left enabled and check what the community prefer (maybe leaving it, but commented and with an explanation).

## TypeScript config

Into `tsconfig.json`:

- `"noEmit": true` is needed to address [this problem](https://github.com/quasarframework/app-extension-typescript/issues/36). It will work also by adding `"outDir": "./dist"` and excluding `dist` folder. Explanations can be found via links inside the issue.
- `"experimentalDecorators": true` is needed only if using `vue-class-component` component syntax.
- `"resolveJsonModule": true` is needed only if importing JSON files into TS code.
- `"esModuleInterop": true` is needed to better manage non-TS libraries.
- `"skipLibCheck": true` is required when using `electron-builder`, which exports its typings without the dev dependencies ones, breaking typechecking for consuming apps. An issue should probably be opened on their repo.
- `"types": [ "quasar" ]` is needed because "the actual import of the Quasar components is done in generated code that for some reason the VS Code is not picking up on consistently (it may be b/c that code is generated as JS not TS)" (cit Kerry on Discord, [reference](https://github.com/quasarframework/app-extension-typescript/pull/39)).
- `"exclude": [ ... , "/dist"]` is needed or some files which has been copied over for any reason during a build process (eg. a `.d.ts` file inside `src-ssr` folder) would apply their types even when original files has been updated.

## Quasar config

Into `quasar.config.json`:

- `fork-ts-checker-webpack-plugin` is used by default without asking to the end-user (in the app-extension a prompt was shown). As I have understood this solution is the fastest because it runs the type checker in a parallel process, but require the user to properly setup its `tsconfig.json` to include all files to check, while the original `ts-loader` relies on webpack's module resolutions to know which files should be checked and must wait for webpack to finish its job. [Reference](https://github.com/TypeStrong/fork-ts-checker-webpack-plugin). There seems to be [a regression](https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/issues/339) with new versions of the plugin, whose typings relies on `webpack` and `tapable` ones. I manually added `@types/webpack` and `@types/tapable` as `devDependencies` to workaround it.

## VSCode config

`.vscode` folder and its files should be added only when using VSCode I guess? Probably the user should be prompted about this, I have no real solution to avoid littering the repo with random config without user interaction ([here](https://github.com/quasarframework/app-extension-typescript/blob/dev/extension/src/install.js) is how it works in current app-extension);

`"vetur.format.defaultFormatter.html": "prettier"` should be added only when using Prettier.

## Existing Quasar types

I checked current Quasar types and put types which must be updated into `quasar-shims` > `utils` folder.
I found many discrepancies between the types and actual implementation, in some cases also some bugs.
It's not always auspicable to have 100% adherence with implementation, so I left a comment for each proposed update and I'll you decide which are to do and which not.
Where I left a `TODO`, it's a question to you.
Where I left a `FIXME`, it's a signal that I may have spotted a bug in the **implementation** while checking types.

## JSON-generated Quasar types

There are cases where generics and other complex types are needed to model some API behaviour.
The best way I found so far to cover this scenario has been suggested by Kerry and is to use `tsType`, as explained [in this conversation](https://discordapp.com/channels/616161554433572894/616164014103461899/646050996434501648).

## New Quasar types

All definitions inside `quasar-shims` are types which need to be added into core typings.
Some of those files are helpful but a pain in the ass to maintain, because manually derived from plain JS objects (see `icon-set.ts` and `lang.ts`).
It would be easier if JS files could be converted to be `.ts` files, in which case we could rely on TS inference and declaration merging to some extent to get automatic typings.

It's also possible to automatically derive `QuasarXxxAnimations` types when codebase will be migrated to TS, by setting the array "as const" and using an [helper type](https://github.com/microsoft/TypeScript/issues/28046#issuecomment-480516434).

This principle works the same with components of course: Quasar components use render functions instead of SFC, so switching to native TS support using `.ts` files is relatively easy and removes the tooling process to manually sync typings.

It should be noted that, as of today, [it has been stated](https://twitter.com/Naisstep/status/1185232738602893316) by the core team that in Vue3 template-based components will be _faster_ than render-function-based components most of the times.

Some types used in Quasar must be imported from third party libraries.
This isn't a problem when typings are provided directly from the same code library, because as `dependencies` they will be available when the library is installed.
The case is different when types are in separated `@types/...` packages, which are usually saved as `devDependencies` and as such left out from `yarn install` of library consumers.
In those cases, type-checking errors arise (unless `skipLibCheck` is enabled) and the end user have no access to the used types.

[This issue](https://github.com/microsoft/types-publisher/issues/81) explains well the two sides of the problem, while the only solution seems to be adding `@types/...` as `dependencies` too.
Hovever, this can sometimes lead to errors anyway, like in the `fork-ts-checker-webpack-plugin` issue linked in the previous sections.
Another way is to write them up both as `devDependencies` and `peerDependencies`, leaving the end user to decide which types to add. I haven't tryed this road yet.

Note that not **all** `@types/...` must be placed into `dependencies`, only the ones which could be used by the developers.
But until Quasar codebase migrates to TS, the only installed `@types/...` will probably be the ones providing types for developers.

## Component scaffolding

All script files generated by the CLI (except config ones like ESLint and Babel) should be generated as `.ts` instead of `.js`.
This includes boot files, i18n files, vuex files, new components/pages/layouts, etc.

New components should be generated based on user chosen default component style. Component with different styles can work together without problems AFAIK, but some requires particular libraries to be installed. Prompting the user to chose which one he wants could be an idea, adding all of them altogether another one.
The component style could also be defined via an option on `quasar new component` command, like `--style=<composition|class|object>`

Component styles:

- [Composition API](https://github.com/vuejs/composition-api) ([rfc](https://vue-composition-api-rfc.netlify.com/#basic-example)): currently available as a plugin to Vue2, it will be the official way to have TS support. It's currently in `0.x` stage. I've been using it for some time and helping pin-point some edge cases where it still fails, but overall is pretty stable. When Vue3 will be released, it will become the new standard, it will be enbedded into the core and the library won't be needed anymore.
- [Classes decorators](https://github.com/vuejs/vue-class-component) and [Property decorators](https://github.com/kaorun343/vue-property-decorator): current most used TS solution so far, it heavily relies on Decorators which aren't still a well defined standard. Decorators proposal is having some hard times, going back and forth between T39 stages. It will still be supported in Vue3, but from what I read it won't have the core team focus.
- Object syntax: good old plain object notation. Can be used with TS, but it requires a lot of typings overhead, quirks to get it right and it still fails to model some concepts, not recommended when using TS.

I put example components for all styles into `src/quasar-shim/component-styles`, from which is possible to abstract a template for automatic scaffolding.
I can produce more complex examples if needed.

## Boot files

Boot file should return code wrapped into a callback function given as parameter of `boot(...)` function (actual name isn't important, can be changed) to get parameter typings, much like when defining a component for TS you are required to wrap it into a `Vue.extend(...)` or [`createComponent(...)`](https://github.com/vuejs/composition-api/blob/bb1e0309ae943bf92ac92fab670d63b9e288e8f3/src/component/component.ts#L73-L95).
`boot(...)` won't actually do anything and just return the provided callback. It should be added to Quasar helpers to allow `import { boot } from 'quasar`, while right now I'm forced to do `import { boot } from 'src/quasar-shims/boot'`.
Note that it's return signature is `void | Promise<void>` to support async boot files: in those cases `async` should be used like `export default boot(async () => {...})`.

`BootFileParams` into core typings should be updated accordingly to the definition into `src/quasar-shims/boot`.

Placing `Vue.use(...)` and static declarations outside boot function seems pretty unconstintent to me, so I moved everything inside the function.
Also, unless there are performance issues, I'd always install plugins using `Vue` instance provided as parameter: this makes the boot function "pure" by any means and you can easily switch it during unit tests, for example.

## Store typings

I never used `Vuex`, so I'm not sure how I should type it with TS.
In Angular I used to declare a global scope `RootStore` empty interface, then all modules would redeclare it adding theirs slices of the state. Thanks to TS interface merging, I then had a global fully typed `RootStore` interface when I needed it.

Another way could be to separate every slice and manually compose the global state importing every single slice, even if to me it's a bit verbose.

A middle way is to exploit TS definition of module (every TS file with at least an `export` is a TS module) and use interface merging augmenting a predefined module, instead of the global scope.

I added examples for the all three ways into `quasar-shims/vuex` folder.

Anyway [here](https://github.com/vuejs/vuex/issues/564) are some suggestions and guidelines on how to mange Vuex with TS from someone which actually used it.

Regardless of the chosen way, the resulting `RootStore` should be used to type `BootFileParams.store` property.
The global and mixed versions allow us to define `store: RootStore` and avoid having to always specify `TStore` generic parameter.

## Feature flagged types

In Quasar there is these opt-in features (SSR, Store, etc) which happens to inject some parameters into boot files (mostly).
To avoid showing those parameters to whom have not opt-in to those features, I setup a feature-flag system which add certain types when a given key is found in the `quasar` scoped interface `QuasarFeatureFlags`.
To enable a feature flag, a `*-flag.d.ts` file must be present into that feature folder (or anywhere is more likable, the further possible from user reach would be better) with content

```ts
// This import enable module augmentation instead of module overwrite
import 'quasar';

declare module 'quasar' {
  interface QuasarFeatureFlags {
    ssr: true; // The object key is the feature flag name
  }
}
```

Then you can use `IsFeatureEnabled` to create a conditional type

```ts
type HasSsr<T> = IsFeatureEnabled<'ssr', T>;
type HasSsrBootParams = HasSsr<{ ssrContext?: QSsrContext | null }>;
```

If the flag is enabled, the type will match the second type parameter, otherwise it will be an empty object.
This allow you to use it in unions without effects when the feature is disabled.

```ts
type RouterBootParams = {
  Vue: VueConstructor;
} & HasSsrBootParams &
  HasStoreBootParams;
```

**FEATURE FLAG FILES ARE NOT USER GENERATED: THEY SHOULD BE ADDED TO `/app/templates/<feature folder>` AND SCAFFOLDED BY THE CLI**

Because unions ('HasSsr<...> | HasStore<...>') "empty type" is `never` and not `{}` (as it is with intersections) and we don't know (yet) how to automatically determine the "empty type" to return, for now we allow to specify it.
See https://discordapp.com/channels/616161554433572894/616164014103461899/646307210221191180
See https://discordapp.com/channels/616161554433572894/616164014103461899/646407552099287041

## Capacitor/Cordova

While Electron dependencies are added on root-level `package.json`, Capacitor (and Cordova, as I have understood) require to install their plugins into their inner `package.json`.
This takes those plugins out of `src` folder scope, making theirs types not visible when working on the application code.
Triple-slash directive seems to not work in this scenario, only deep-import does the trick (see `Capacitor` import into `feature-flags.d.ts`) but it will probably create some problems when the type definition is included into Quasar core.

## Configuration file

`quasar.conf` file is a big beast, talking about typings.
I had to split many parts in their standalone files, yet you can get lost in them pretty easily.
With its intricated maze of options, it requires many dependencies on `@type/**` libreries to get nearly-full type safety.

There are **a lot** of business rules I don't think I'll be able to model with TS alone if underlying code doesn't change, and yet I don't know exactly how code will need to change to get easier and maintenable typings (for now).

Type inference is done as always with an noop function (`configure`) which takes the configuration callback and returns it but with typings applied.
I don't know if it's possible to get typings into `quasar.conf.js` as is, early trial I did weren't successful.
If it is possible, it should be via usage of the compiled `configure` function (after it has been added to core), for which _I think_ VSCode will be able to retain typings.

If it's not possible, we need to make configuration file a `.ts` file.
I haven't dig down that road yet (especially when in watch mode), but _I think_ that using `tsc` compiler in watch mode or relying on a `ts-node` could be some options.

Most of the typings I made are added by augmenting `quasar` module, but I put extras into `@quasar/extras` module for coherence: it's still possible to keep everything together.

Because of how TS typings system works, types applied by `configure` function are open types, which means that they accept more properties than the ones defined on their interfaces without firing an error.
You can check this loose type check into `quasar.conf.ts` file.

Getting stricter type check require an easy workaround, you can see it in action into `strict-quasar.conf.ts`.
In this version, additional properties will fire an error, this means that you cannot add "configuration examples" which are not valid.
Eg:

- adding `cordova`, `electron` and `capacitor` properties without having the relative feature flag enabled will throw an error;
- adding both `packager` and `builder` properties into `electron` property will throw an error.

Its also debatable if adding configuration examples still makes sense, when you have full intellisense support for the configuration file (of course some guidance comment will be useful anyway).
It's also possible to get a cleaner conf file mobing links to the documentation in comments to properties TSDocs.

There are a lot of `TODO` around to keep track of where is possible to improve code quality or the overall autocomplete experience, but configuration typings can be considered complete.

## Unanswered questions

- files into `src-ssr`, which are marked with this disclaimer `This file runs in a Node context (it's NOT transpiled by Babel), so use only the ES6 features that are supported by your Node version.`. Should I try to setup them with TS and their transpilation? I don't know if it's worth it, are they supposed to be heavily manipulated by the user?
- random note: Webpack config can be managed and [run with TS](https://webpack.js.org/configuration/configuration-languages/#typescript).
- I saw you detected listener options support as suggested by Mozilla, I'd add a link to "https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support" just in case someone gets around it, because it's pretty obscure without comments explaining it.

## TODO

- Make Quasar webpack alias work nice with TS and VSCode Intellisense. Possibly without duplication (Webpack read from `tsconfig` or vice-versa)
- Enable Capacitor/Cordova plugin typings also into `src` folder without adding the dependency two times
- TS tips boxes into documentation
- Add events types to generation

## Notable pending issues

- `workboxOptions` has not been typed because full typings are going to be added with v5 release, it's better to wait for them to complete it.
- some literal arrays (eg. `extras`, `animations` and `framework.components/directives/plugins` configuration properties) would benefit from a "duplication" error, but such feature appears to be currently unfeasible in TS. The best I could find is [this workaround](https://stackoverflow.com/a/57021889), but it won't be applicable in our case.
- pretty much because of the same limitations with interactions of array/tuples and literal types, it's not possible to enforce the mutual exclusiviness of some literal types into the same array (eg. allow to specify only one 'roboto' font or only one 'mdi' icon set).
