---
layout: post
title: GitHub Pages构建失败：Page build failed
tags: GitHub
---

## 背景

从2015年开始，一直在 `GitHub` 上通过 `GitHub Pages` 发布文章，然后再同步到其他博客平台上。不过，最近发现 `GitHub Pages` 上发布文章后，[https://heartsuit.github.io/](https://heartsuit.github.io/)网页上的内容却不更新了，刚开始以为是有延迟。后来过了两天，最新发布的几篇文章还是没有渲染出来。

一开始玩博客平台，我都是在本地搭建基于 `Ruby` 实现的 `Jekyll` 环境，每次写完文章后会自动在本地构建，有错误时会实时提示。后来换了电脑，也就没在本地折腾这个博客环境了，写完文章后直接提交、推送至远程仓库了。

那么，很显然，现在的情况应该是 `GitHub Pages` 构建失败了，只是我们不确定哪里出了问题。

## 解决方法

其实，没有了本地构建环境，我们可以从 `GitHub` 远程查看下构建失败的原因，然后再对症下药。

在我的 `GitHub Pages` 仓库主页的右下角，可以看到有一个 `Environments` 的选项卡，并且显示了当前项目的构建状态。

![2022-04-05-1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-05-1.jpg)

点击 `github-pages` 跳转到历史构建列表。点击 `Deployed` 可以查看详细的构建与部署日志信息。

![2022-04-05-2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-05-2.jpg)

在构建日志中，我们可以看到构建失败的说明。

![2022-04-05-3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-05-3.jpg)

根据构建失败的报错信息，我们可以大概定位到对应的文章内容位置。由于 `Jekyll` 采用 `Liquid` 语法涉及 `{` 与 `%` ，我的文章中的代码段中使用了这两个符号（连起来），导致与 `Liquid` 语法冲突，最终构建失败。所以改起来也比较简单，我这里直接将 `{` 改为了 `[`

![2022-04-05-4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-05-4.jpg)

将修改后的文章 `push` 到 `GitHub` 远程仓库后，会自动触发构建部署过程，这一次部署成功~~

![2022-04-05-5.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-05-5.jpg)

通过博客内容，检查构建部署成功的效果。

![2022-04-05-6.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-04-05-6.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
