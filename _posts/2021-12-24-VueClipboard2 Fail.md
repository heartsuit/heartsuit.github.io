---
layout: post
title: 用了BootStrap的modal弹窗，vue-clipboard2虽然复制成功，可是无法粘贴
tags: Vue.js
---

## 背景

一开始用的 `BootStrap` 的 `modal` 弹窗里显示信息。

后来有了点击复制的需求，就又使用了 `Toastr` ，当 `BootStrap` 弹窗与 `Toastr` 弹窗这两个同时出来时， `vue-clipboard2` 的复制功能失效。。

### 解决方案

这在 `vue-clipboard2` 的文档中有说明的[https://www.npmjs.com/package/vue-clipboard2](https://www.npmjs.com/package/vue-clipboard2)。

* 可能是浏览器的限制

![2021-12-24-Limitation.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-24-Limitation.jpg)

然而，我这里并不是这个原因。。

* 使用`this.$copyText(val, container)`设置container为获得焦点的弹出框。

![2021-12-24-OfficialDocument.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-24-OfficialDocument.jpg)

```javascript
let container = this.$refs.container;
this.$copyText("Text to copy", container);
```

* 放弃使用modal

没错，简单粗暴，直接放弃使用 `BootStrap` 的 `modal` 弹窗，这时 `vue-clipboard2` 就可以复制粘贴啦。

![2021-12-18-MultiToastr.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-18-MultiToastr.gif)

## Reference

* [Toastr文档](https://www.npmjs.com/package/toastr)
* [vue-clipboard2文档](https://www.npmjs.com/package/vue-clipboard2)
* [在一个页面的多个位置同时显示不同的Toastr提示信息](https://heartsuit.blog.csdn.net/article/details/122010171)
* [Bootstrap如何弹出modal窗，并动态传值？](https://heartsuit.blog.csdn.net/article/details/76988402)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
