---
layout: post
title: Vue3使用了Vite和UnoCSS导致前端项目启动报错：Error：EMFILE：too many open files
tags: Vue, Vite
---

## 背景

一个 `Vue3` 的项目，用的是 `Vite` 打包，通过 `npm run dev` 运行时，遇到了以下错误（尤其是引入了 `Element-Plus` 后）：

> Error: EMFILE: too many open files，后面是具体的文件路径。。甚至到了 `node_modules` 深层目录，地狱~~

看到这个错误，立马就联想到了在 `Linux` 上遇到的类似问题，一般是通过 `ulimit -n 新的文件句柄数` 来修改默认配置，不过我是在 `Windows` 上开发，刚好用的是 `Bash Shell` ，就尝试查看和修改了下（同时，在网上搜索这个错误，得到的结果都是这种方法）；然而，并没有解决问题。

![2023-12-16-ulimit.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-16-ulimit.jpg)

在说明解决方法前，小了解下题中涉及的三个角色，后面进行问题排查时会用到。
* Vue3
`Vue3` 是一种流行的 `JavaScript` 框架，用于构建用户界面。它具有以下优点：
* 性能优化：Vue3引入了一些性能优化，如虚拟DOM重构和响应式系统的改进，使得应用程序更加高效。
* TypeScript支持：Vue3对TypeScript的支持更加完善，使得代码更加可靠和易于维护。
* Composition API：Vue3引入了Composition API，使得代码组织更加灵活和可复用。
* 更好的Tree-shaking：Vue3通过模块化的设计和静态分析，实现了更好的Tree-shaking，减小了应用程序的体积。
* 更好的错误处理：Vue3提供了更好的错误处理机制，使得开发者能够更容易地调试和定位问题。
  
* Vite
`Vite` 是一个基于ESM（ES Module）的构建工具，专为现代浏览器和开发者设计。它的优点包括快速的冷启动、即时的热模块替换、按需编译等，使得开发体验更加流畅和高效。 `Vite` 还支持 `TypeScript` 、 `JSX` 、 `CSS` 等，并且可以轻松地集成 `Vue` 、 `React` 等框架。

* Unocss
`UnoCSS` 是一种即时的原子 `CSS` 引擎，旨在具有灵活性和可扩展性。其核心设计是不持有特定观点，所有的 `CSS` 实用工具都是通过预设提供的。

优点包括：
* 自动化：无需手动标记未使用的样式，unocss 可以自动分析项目并删除未使用的样式。
* 减小文件大小：通过删除未使用的样式，可以减小 CSS 文件的大小，从而加快加载速度。
* 提高性能：减小文件大小可以提高页面加载速度和性能。
* 灵活性：可以与各种前端框架和工具集成，适用于各种项目。

## 原因排查

那么，可能无法通过修改操作系统的文件句柄数来解决，可究竟是什么原因导致的呢？

* Vue3.x，这个我们前端用的比较多，一般问题都能处理，显然这次的问题就比较特殊，暂时忽略；
* Vite，构建工具，类似以前用的Webpack，需要重点排查一下；
* UnoCSS，对团队成员来说，是一项相对较新的技术，在体验新技术的先进性的同时，也需要踩一些坑，这个UnoCSS同样需要排查；

根据经验，大部分问题都是配置的问题，刚好，在项目的根目录下有两个配置文件：

* vite.config.js
* uno.config.js

光是看这两个配置文件，或者在网上漫无目的地搜索，对于新手来说确实也发现不了问题；这时另一个思路涌现了，这些技术栈一般都是开源软件，那么可以到其官方的代码仓库 `Issues` 中搜索下，看有没有小伙伴遇到类似的错误，而且官方也是第一手的资料；这一看可了不得：[https://github.com/vitejs/vite/issues?q=+too+many+open+files](https://github.com/vitejs/vite/issues?q=+too+many+open+files)，在 `Vite` 的 `GitHub` 仓库 `Issues` 中直接找到了同款问题。。

## 原因分析

`UnoCSS` 的配置文件 `uno.config.js` 中，将文件系统属性被映射到项目根目录 `/` 而不是源码目录 `./src/` ，这导致 `UnoCSS` 将会扫描整个 `node_modules` ，这显然太大了。因此，将文件系统路径 `**/` 更改为 `./src/` 就解决了问题。

## 解决方法

![2023-12-16-unocss.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-16-unocss.jpg)

```json
  content: {
      filesystem: ["**/*.{html,js,ts,jsx,tsx,vue,svelte,astro}"],
  },
```

改成了

```json
  content: {
    filesystem: ["./src/*.{html,js,ts,jsx,tsx,vue,svelte,astro}"],
  },
```

## 小总结

问题不重要，解决问题的思路才重要，这里仅提供解决问题的一个思路。查看官方GitHub仓库的 `Issues` 有以下好处：
* 从官方可以获取到第一手的资料；
* 可以了解其他用户遇到的问题和bug，以及它们的解决方案；
* 可以提出自己遇到的问题或建议，与开发者和其他用户进行交流和讨论；
* 可以跟踪项目的进展和开发者对问题的处理情况；
* 可以为开源项目做出贡献，比如提交bug报告、提出改进建议或者参与讨论。

## Reference

* [https://github.com/vitejs/vite/issues/13912](https://github.com/vitejs/vite/issues/13912)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
