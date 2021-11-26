---
layout: post
title: 前端项目脚本加载失败：net:: ERR_HTTP2_PROTOCOL_ERROR 200
tags: Nginx
---

### 背景

接用户反映：线上系统使用域名访问前端项目时，一片空白，控制台报错了。

* 火狐浏览器：

> 指向“https://www.abc.com/static/js/chunk-libs.176e403f.js”的 `<script>` 加载失败

![2021-11-26-ScriptErrorInFirefox.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-26-ScriptErrorInFirefox.jpg)

这其实没有提供任何有用的信息。。换个浏览器试试。

* Edge浏览器：

> net:: ERR_HTTP2_PROTOCOL_ERROR 200

这个错误就有点意思啦，提示是跟 `HTTP2` 有关的问题。

***网上查了下发现会有不同的原因导致这个错误信息，我这里的解决方案并不是普适的，但是确实解决了我的问题，真正重要的是要冷静分析，这个分析的过程才重要。***

Note：**部署架构是这样的：域名所在的服务器A通过内网IP代理了另一台服务器B（也具有公网IP），这个前端服务部署在服务器B上。**

### 分析原因

重启 `Nginx` 试试？

其实，这时候，应该先冷静下来；**重启是一个选项，但应该作为不得已的一个选择**，经过认真调查、分析后，还是不能确定问题的原因，那么可以进行重启操作。

需要确定几个问题：

1. `Nginx` 的配置有没有修改？
2. `Nginx` 的配置如果被更新过，有没有重新加载使其生效？
3. `Nginx` 的版本有没有被动过？（通过`nginx -V`查看nginx的版本信息，以及与http2相关的模块）；
4. 最近有没有新功能的部署？
5. `HTTPS` 证书是不是过期了？（HTTP2要求在SSL下工作）

经过确认，发现以上问题答案都是否定的。。显然，是线上服务的运行环境发生了变化。

既然是运行环境发生了变化，我们首先检查了主机的各项指标：CPU、内存、磁盘等。当 `df -h` 查看磁盘空间时，问题暴露了：磁盘爆了(╥╯^╰╥)

![2021-11-26-ReleaseSpace.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-26-ReleaseSpace.jpg)

那么问题来了，为啥磁盘会爆，既然是跟 `Nginx` 相关的问题，那么第一步应先查看 `Nginx` 的错误日志。

```bash
# 查看nginx的错误日志
vi /var/log/nginx/error.log
```

以下是 `Nginx` 错误日志给出的部分错误信息，关键信息：**(28: No space left on device)**，没空间啦~~

![2021-11-26-NginxLog.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-26-NginxLog.jpg)

> 2021/11/24 11:10:08 [crit] 23967#0: *82293762 pwritev() "/var/lib/nginx/tmp/proxy/2/32/0000543322" failed (28: No space left on device) while reading upstream, client: 110.179.80.101, server: www.abc.com, request: "GET /static/js/app.5033a65a.js HTTP/2.0", upstream: "http://192.168.0.36:80/static/js/app.5033a65a.js", host: "www.abc.com", referrer: "https://www.abc.com/"

### 问题解决

因为没有启用数据盘，这台主机上的服务用户量也不是很多，现在所有服务都在系统盘运行。那么清理一些服务日志，腾出空间即可。

### 问题总结

1. 论基础设施监控的重要性，`Prometheus`监控告警可以搞起来了。。
2. 经过以上排查，发现导致这个问题的原因似乎变得不那么重要了，反而是分析这个问题的过程才是关键。

这就像我们看到刘谦入驻 `B站` 开始解密当年的魔术，知道真相的我们一开始还是有点失望的：原来这么简单啊~~。

电影《致命魔术》中有这样一句话：“魔术的秘密没什么了不起，变魔术的技巧才重要。”

这也正是很多网友看完刘谦视频后最大的感受 —— 原理不是魔术的精髓，表演才是。

当了解到真正的魔术精神后，魔术的秘密便不再重要。共勉~

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
