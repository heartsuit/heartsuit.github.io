---
layout: post
title: 在一个页面的多个位置同时显示不同的Toastr提示信息
tags: Vue.js
---

## 背景

我想在同一个页面弹窗多个 `toastr` ，分别在不同的位置。

但是遇到了问题：无法弹出多个不同位置的 `toastr` 。即后续的 `toastr` （即使单独配置了positionClass），依然使用的是第一个位置配置。

## 问题分析

原本的 `toastr` ，当设置不同的位置时，后一次的弹窗位置与前一次的弹窗的消失时间有关，这在 `Codepen` 上有个演示。

* `Codepen`上的效果展示

![2021-12-18-ToastrEffect.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-18-ToastrEffect.gif)

[https://codepen.io/grantiverson/pen/GGMKzV](https://codepen.io/grantiverson/pen/GGMKzV)

## 解决方案

* Issue

在 `toastr` 源码中看到了有相关的 `Issue：Fix using multiple positions at the same time #635` ，有小伙伴遇到了同样的问题。

而且这还通过 `GitHub` 上的一个PR解决了，修改后的 `toastr` 源码：

![2021-12-18-ToastrIssue.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-18-ToastrIssue.jpg)

* PullRequest

[https://github.com/merlinoa/shinyFeedback/blob/23a4434aa12cc5e29f21abb090426f151cd320a1/inst/assets/toastr/js/toastr.min.js](https://github.com/merlinoa/shinyFeedback/blob/23a4434aa12cc5e29f21abb090426f151cd320a1/inst/assets/toastr/js/toastr.min.js)

![2021-12-18-ToastrPR.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-18-ToastrPR.jpg)

* 效果展示

通过以上 `toastr` 的源码替换，我在这个小工具项目中实现了预期的想法。共涉及三个不同位置的弹窗：每次有消息时，左侧显示正常提示，右侧显示异常提示，当点击前两者时，中间弹出“复制成功”。

```JavaScript
    let that = this;
    // error toastr with copy, right
    toastr.options.positionClass = 'toast-top-right';
    toastr.options.timeOut = 0;
    toastr.options.extendedTimeOut = 0;
    toastr.options.closeButton = true;
    toastr.options.tapToDismiss = false;
    toastr.error("异常：出错了：<br />错误信息", null, {
        "onclick": function(event) {
            that.copy(event.target.innerHTML);
        }
    });

    // info toastr with copy, left
    toastr.options.positionClass = 'toast-top-left';
    toastr.options.timeOut = 0;
    toastr.options.extendedTimeOut = 0;
    toastr.options.closeButton = true;
    toastr.options.tapToDismiss = false;
    toastr.info("信息：按计划进行：<br />基本信息", null, {
        "onclick": function(event) {
            that.copy(event.target.innerHTML);
        }
    });

    // copy successfully message, center
    toastr.options.positionClass = 'toast-top-center';
    toastr.options.timeOut = 2000;
    toastr.options.closeButton = false;
    toastr.success('复制成功');
```

![2021-12-18-MultiToastr.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-18-MultiToastr.gif)

## Reference

* [Toastr文档](https://www.npmjs.com/package/toastr)
* [vue-clipboard2文档](https://www.npmjs.com/package/vue-clipboard2)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
