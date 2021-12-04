---
layout: post
title: Github项目下载慢，Release、Archive下载慢，图片、Issues看不了怎么办？
tags: Github
---

### 背景

之前总是遇到 `GitHub` 下载项目源码， `Release` ， `Archive` 慢的问题，甚至有时候 `Github` 直接转圈打不开。。怎么办？

还有就是 `Github` 页面打开了，可是上面的图片不显示，怎么办？

或者，我就是想看下一个开源项目的 `Issues` ，可是 `GitHub` 网站就是打不开，怎么办？

### 方法

闲言少叙，直接上方案，也都是之前用过的，目前我用最多的就是使用镜像站了，推荐~~

### 使用VPN

~~

### 先通过码云从 `GitHub` 拉取过来，再从码云上进行克隆下载；

我们直接从 `Github` 上下载比较慢，但是Gitee从 `Github` 拉代码还是很快的。

![2021-12-3-Gitee.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-3-Gitee.jpg)

### 镜像站

* [https://github.com.cnpmjs.org/](https://github.com.cnpmjs.org/)
* [https://hub.fastgit.org/](https://hub.fastgit.org/)

这些镜像站的同步效率很高，我试过在 `Github` 刚做了push后，在这些镜像站上就可以访问到刚push的内容（代码、图片、文件）。

这种可以用于下载项目源码、下载 `Release` ， `Archive` 文件、查看 `README.md` 中的图片以及看项目的 `Issues` 等。

![2021-12-3-Image.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-3-Image.jpg)

Note: 

* 不建议直接打开上面的地址，因为这类网站一般做了限流，可能会遇到以下错误页面：

![2021-12-3-ErrorSite.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-3-ErrorSite.jpg)

* 建议直接访问自己的`GitHub`页面，即在后面加上自己的用户名，比如我的：

[https://github.com.cnpmjs.org/heartsuit](https://github.com.cnpmjs.org/heartsuit)

[https://hub.fastgit.org/heartsuit/](https://hub.fastgit.org/heartsuit/)

![2021-12-3-MirrorSite.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-3-MirrorSite.jpg)

* 如果访问的是别人的开源项目，直接改域名就行：将`https://github.com/taosdata/TDengine/issues/1728`改为`https://hub.fastgit.org/taosdata/TDengine/issues/1728`

![2021-12-3-Domain.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-3-Domain.jpg)

### 一些个人做的加速网站

* [https://shrill-pond-3e81.hunsh.workers.dev/](https://shrill-pond-3e81.hunsh.workers.dev/)

这种一般用于下载单个 `Release` ， `Archive` 文件，比如，我要下载 `prometheus` 的一个发布版：[https://github.com/prometheus/prometheus/releases/download/v2.31.1/prometheus-2.31.1.darwin-amd64.tar.gz](https://github.com/prometheus/prometheus/releases/download/v2.31.1/prometheus-2.31.1.darwin-amd64.tar.gz)，直接下载会很慢，或者下载失败。可以放到这类网站的下载框加速。

![2021-12-3-3rdSite.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-12-3-3rdSite.jpg)

### 小总结

以上方式随便选，总有一款适合你。

下载项目源码，下载 `Release` ， `Archive` 文件、查看 `README.md` 中的图片快到飞起。

妈妈再也不用担心我无法打开 `GitHub` 上开源项目的 `Issues` 了。

如果有别的更好的方式，欢迎评论留言~

好东西就是用来分享的~~

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
