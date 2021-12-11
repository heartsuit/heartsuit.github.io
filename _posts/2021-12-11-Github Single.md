---
layout: post
title: 如何下载Github上的单个文件或者指定目录？
tags: Github
---

## 背景

大部分 `Github` 上的开源项目都很大，甚至一个项目下有包含了很多子项目，形成了多级目录的结构；有时，我们仅对其中的一个文件或者单个目录感兴趣，那么怎么不用把整个项目都下下来，只下载指定文件或目录呢？

## 一些下载指定目录的方法

![2021-12-11-GithubDirectory.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-11-GithubDirectory.jpg)

比如：我想下载项目[demo-springboot](https://github.com/heartsuit/demo-springboot/)中的 `springboot-custom-starter` 目录时，通常有以下方法。

1. 用`SVN`下载`Github`的指定目录
2. 浏览器插件：`GitZip`
3. 一些个人做的工具网站

### 用SVN下载Github的指定目录

将要下载的目录地址 `https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-custom-starter` 中的 `tree/master` 修改为 `trunk` ，然后在 `SVN` 中 `checkout` 即可： `https://github.com/heartsuit/demo-spring-boot/trunk/springboot-custom-starter` 。

这是以前用的方法，不过现在因为项目用的都是 `Git` ，电脑上都不装 `SVN` 了。。

### 浏览器插件：GitZip

我平时使用 `FireFox` 多一些，所以这个插件可以从 `FireFox` 的扩展中搜索安装，其他浏览器也有类似的插件，比如 `Chrome` 也有同款。

![2021-12-11-GitZip.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-11-GitZip.jpg)

### 一些个人做的工具网站

* https://minhaskamal.github.io/DownGit/#/home
* http://zhoudaxiaa.gitee.io/downgit/#/home
* https://www.itsvse.com/downgit
* https://shrill-pond-3e81.hunsh.workers.dev/

不过，这些网站有的不太稳定。。

## 附：其他常用的与 `Github` 相关的浏览器插件

Note：以下插件与本标题无关，只是平时常用的浏览器插件。

* 搜索：`octotree` 可以树形结构查看Github仓库中的文件，减少了多级目录的查看，提高效率
* 搜索：`enchanced github` 可查看单个文件的大小，下载单个文件
* 搜索：`gitzip for github` 可直接下载单个文件夹，下载单个文件夹（在指定文件夹后的空白区域双击即可下载），这个上面有介绍。

![2021-12-11-GithubTree.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-11-GithubTree.jpg)

![2021-12-11-EnhancedGithub.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-11-EnhancedGithub.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
