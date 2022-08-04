---
layout: post
title: 信创环境下使用80端口Nginx无法发送PUT和DELETE请求
tags: 国产化, Nginx
---

## 背景

那是7月份的某天下午，到某个安全性要求较高（据说要上各种安全设备：防火墙、`IPsecVPN`等等）的内网环境下部署了一个 `Nginx` +前后端分离的单体架构的小项目。使用的国产化环境如下：

```
JDK1.8
东方通中间件TongWeb7
神通数据库
```

`Nginx`代理了前端服务，使用默认的80端口，无法发送 `PUT` 和 `DELETE` 请求，但是 `GET` 、 `POST` 请求正常；即可以新增、查询，无法修改和删除。

## 问题分析

* 后端接口？

我第一反应是先测试下后端接口是不是有问题。就用 `PostMan` 测了一个修改接口，发现返回了 `405` ，这就比较好办了，我们遇到过这个问题。

> 这是由于 Tongweb 默认禁用了 `PUT` ， `DELETE` 请求，在 `Tongweb` 控制台放行即可。

![2022-06-12-PutDelete405.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-12-PutDelete405.jpg)

但是新的问题又来了，直接访问后端接口， `PUT` 和 `DELETE` 请求可以了，但是通过代理的前端服务发起的修改、删除请求依然不通。前端使用的是若依，具体的错误信息是网络错误：read econnreset。

* 前端代理？

现在，问题显然在前端代理 `Nginx` 这里了。那么就排查一下，可是当我在前端页面发起修改请求时， `Nginx` 的访问日志与错误日志 `access.log` ， `error.log` 中都没有任何信息。这是什么情况，莫名感觉是在某个地方修改和删除请求被拦截了，直接就没有到达 `Nginx` ，可是查看了虚拟主机的防火墙是关闭的，奇了怪了。

* 安全设备拦截？

既然分析后得出的结论是请求被拦截了，接着我立马联系了网络负责人，是不是启用的安全设备把我的请求拦截了，但是得到的回复是安全设备都还没开始用上呢。

* 端口问题？

我就想着换个端口试试吧，我们知道 `HTTP` 的默认端口为80，所以很多对安全性要求比较高的环境下，如果没有域名、备案，直接是不允许用80端口的。我就将Nginx的监听端口换成了8000， `nginx -s reload` 后，在浏览器中再次发起 `PUT` 修改请求，成功~

卧槽，竟然是端口原因，那为啥80端口就不能发出 `PUT` 和 `DELETE` 请求了？那天下午百思不得其解。回来后，当天晚上查到了以下相关内容，基本上换端口就解决了问题。

1. https://segmentfault.com/q/1010000040216254/
2. https://blog.csdn.net/weixin_53458434/article/details/118673550
3. https://blog.csdn.net/weixin_37737765/article/details/80805417

## 解决方案

不要直接使用默认的80端口，Done。

第二台上午，网络负责人给我发了张图，原来是网关处防火墙的默认策略，由80端口的发出的 `PUT` 和 `DELETE` 请求，被防火墙认为是攻击动作而拦截。

![2022-08-06-FirewallIntercept.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-08-06-FirewallIntercept.png)

## 小总结

至此，真相大白，错的不是你，而是这个世界。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
