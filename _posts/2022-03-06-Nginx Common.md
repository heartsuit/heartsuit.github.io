---
layout: post
title: 关于Nginx，在日常工作中你可能用到的操作就这些了
tags: 运维, Nginx
---

## 背景

最近，全球都在制裁 `Nginx` ， `ClickHouse` 的诞生地。

计算机技术是一门实践至上、理论与工程结合的学科，无论你是做后端开发、系统架构、大数据开发还是数据分析工作，鼓捣环境的能力还是要有的。我们一般的开发人员使用 `Nginx` 不过是配个反向代理，基本上就足够了。 `Nginx` 本身是一个非常强大的工具，作为一名没用过 `Nginx` 的小白或者初学者，由于没有系统地学习过 `Nginx` ，在面临 `Nginx` 有关需求的时候一般是这样：我有一个需求或问题，我只想知道如何快速实现/解决，即：**你就告诉我怎么做吧**。

![2022-03-06-NginxIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-06-NginxIndex.jpg)

我是一名非专业的运维人员，一般作为救火队员出现。。以下列出关于 `Nginx` 的常见需求，搞定这些问题后，应对日常的非专业单运维工作便不在话下。

01. Nginx静态资源服务器如何配置？
02. Nginx如何做反向代理？
03. Nginx反向代理后，如何获取客户端实际IP？
04. Nginx做负载均衡怎么配置？
05. Nginx负载均衡/负载倾斜后，客户端如何知道访问的是哪个主机/服务？
06. Nginx如何做二级域名转发？
07. Nginx如何配置HTTPS以及证书？
08. Nginx如何配置HTTP2？
09. Nginx如何开启GZIP压缩？
10. Nginx控制台的警告怎么处理？
11. Nginx报错：（上传文件）请求的实体过大怎么办？
12. Nginx如何隐藏版本号？

Note: 
01. 修改完配置后，可通过`nginx -t`测试配置是否存在语法错误或者typo；
02. 修改完配置后，记得通过`nginx -s reload`刷新使配置生效；

## Nginx静态资源托管

如今，越来越多的前端工程师也开始使用 `Nginx` 、 `Tengine` 、 `OpenResty` 这类工具了。一般是将一些静态资源，或者干脆就是完整的前端项目作为静态资源服务进行部署。

* Nginx静态资源服务器

```conf
    location / {
        root  /opt/reading-notes/frontend/dist;
        index  index.html index.htm;
    }
```

* Nginx配置代理跨域

```conf
    location /api  {
            include  uwsgi_params;
            rewrite  ^/api/(.*)$ /$1 break;
            proxy_pass   http://localhost:8000;
    }
```

* Vue打包部署后，刷新页面404

```
try_files $uri $uri/ /index.html;
```

* [入门Nginx之-静态资源服务器及跨域配置](https://heartsuit.blog.csdn.net/article/details/89674769)

## Nginx反向代理

这里直接插播一道面试题，问：**什么是反向代理，什么是正向代理**？

* [入门Nginx之-反向代理实现二级域名转发](https://heartsuit.blog.csdn.net/article/details/89707077)

## Nginx反向代理后，如何获取客户端实际IP

当我配置了反向代理后，系统日志拿到的客户端IP全是 `127.0.0.1` ，我要如何获取客户端实际IP呢？

```conf
# 转发源IP，编辑vi /etc/nginx/nginx.conf，在对应的location下增加配置
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## Nginx负载均衡

接触负载均衡，可能是你成为系统架构师（尤其是 `Java` 领域）的第一步。因为这个时候，便会衍生出当今计算机领域的一个核心关键词：“集群”。这跟人们的日常工作生活非常类似，一个人的力量是有限的，而一群人的智慧是无穷的。

* 默认策略：轮询

```conf
    upstream api-server {
        server 127.0.0.1:7000;
        server 127.0.0.1:8000;
    }
```

```conf
    location /api  {
            include  uwsgi_params;
            rewrite  ^/api/(.*)$ /$1 break;
            proxy_pass   http://api-server;
    }
```

* 修改策略：权重

```conf
    upstream api-server {
        server 127.0.0.1:7000 weight=2;
        server 127.0.0.1:8000;
    }
```

* [入门Nginx之-负载均衡(SpringBoot)](https://heartsuit.blog.csdn.net/article/details/91960724)

## Nginx负载均衡/负载倾斜后，客户端如何知道访问的是哪个主机/服务？

当我配置了负载均衡/负载倾斜后，我如何知道我访问的是哪个后端的主机/服务？

```conf
# 确定请求的响应来自于哪台主机，编辑vi /etc/nginx/nginx.conf，在对应的location下增加配置
add_header ServerIP $upstream_addr; 
```

有了以上配置，可以在请求响应的头信息中看到 `ServerIP` 的信息。

## Nginx二级域名转发

其实，所谓的二级域名转发，核心还是反向代理。

* [入门Nginx之-反向代理实现二级域名转发](https://heartsuit.blog.csdn.net/article/details/89707077)

## Nginx配置HTTPS加密传输

`HTTPS` （全称：Hyper Text Transfer Protocol over SecureSocket Layer），是以安全为目标的 `HTTP` 通道，在 `HTTP` 的基础上通过传输加密和身份认证保证了传输过程的安全性， `HTTPS` 的安全基础是 `SSL` 。实际中，我们一般是结合域名与 `SSL` 证书实现全站 `HTTPS` ，而且很多主流浏览器不推荐使用不安全的 `HTTP` 了。

* [入门Nginx之-代理HTTPS，HTTP强制转HTTPS](https://heartsuit.blog.csdn.net/article/details/93505668)

## Nginx配置HTTP2快速响应

`HTTP/2` 是 `HTTP` 协议自 1999 年 `HTTP 1.1` 发布后的首个更新，主要基于 `SPDY` 协议。HTTP2的一些新特性：二进制分帧，多路复用，服务器推送，头部压缩等致力于加快请求的响应。我们实际中使用 `HTTP2` 结合 `Undertow` Web容器，实现对大量小图片的快速加载响应。

来自于《图解HTTP》中的一句话：

> HTTP2的目标是改善用户在使用Web时的速度体验。

* [Nginx配置开启HTTP2支持](https://heartsuit.blog.csdn.net/article/details/114905554)

## Nginx启用GZIP压缩

开始没启用 `HTTP2` 时，我们还采用过 `GZIP` 压缩来实现对较大响应体（json, js, css, text，具体多大时开始压缩可以自己配置）的压缩，这对带宽不富裕的小网站来说，是一种较好的解决方案；不过，开启 `GZIP` 压缩后，需要注意的是 `CPU` 与带宽之间的协调，因为压缩过程是要耗费 `CPU` 资源的，这就像我们常讲的“架构是一种权衡”类似。

```conf
# 编辑vi /etc/nginx/nginx.conf，在http下增加配置
    gzip on;
    gzip_buffers 32 4K;
    gzip_comp_level 8;
    gzip_min_length 1k;
    gzip_types application/json application/javascript text/css text/xml text/plain;
    gzip_disable "MSIE [1-6]\.";
    gzip_vary on;
```

## Nginx控制台警告

警告虽然不影响实际服务的运行，可以忽略掉；但是对于患有强迫症的小伙伴来说，消除警告也是必要的（另外，我们有些前端同学对浏览器控制台的无效打印、警告是要求不允许出现的）。

> nginx: [warn] could not build optimal proxy_headers_hash, you should increase either proxy_headers_hash_max_size: 512 or proxy_headers_hash_bucket_size: 64; ignoring proxy_headers_hash_bucket_size

```conf
# 编辑vi /etc/nginx/nginx.conf，在http下增加配置：proxy_headers_hash_bucket_size 1024;
proxy_headers_hash_bucket_size 1024;
```

> nginx: [warn] could not build optimal types_hash, you should increase either types_hash_max_size: 2048 or types_hash_bucket_size: 64; ignoring types_hash_bucket_size

```conf
# 编辑vi /etc/nginx/nginx.conf，在http下增加配置：types_hash_bucket_size 1024;
types_hash_bucket_size 1024
```

## 请求响应报错

这主要在**上传文件**时出现， `SpringBoot` 项目限制了上传文件的大小，默认为1M，当用户上传了超过1M大小的文件时，可通过以下配置修改解决 `SpringBoot` 报错。

```yaml
spring:
  servlet:
    multipart:
      maxFileSize: 10MB
      maxRequestSize: 30MB
```

`SpringBoot` 关于文件上传大小限制报错解决后， `Nginx` 又报错了：**413 Request Entity Too Large**，因为 `Nginx` 默认的 `request body` 也为1M。

> 413 Request Entity Too Large

```conf
# 编辑vi /etc/nginx/nginx.conf，在http下或者对应的反向代理location下增加配置：client_max_body_size 10m;
client_max_body_size 10m;
```

## Nginx隐藏版本号

默认在请求的头信息中可以看到 `Nginx` 的版本信息。 `Nginx` 的有些版本有漏洞，而有些版本没有。这样直接暴露出版本号就容易成为攻击者可利用的信息。所以，从安全的角度来说，隐藏版本号会相对安全些。

![2022-03-06-NginxVersionOn.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-06-NginxVersionOn.jpg)

```conf
# 在http部分配置：server_tokens  off;
http {
    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 4096;
    server_tokens  off;
}
```

![2022-03-06-NginxVersionOff.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-06-NginxVersionOff.jpg)

## Reference

* [入门Nginx之-静态资源服务器及跨域配置](https://heartsuit.blog.csdn.net/article/details/89674769)
* [入门Nginx之-反向代理实现二级域名转发](https://heartsuit.blog.csdn.net/article/details/89707077)
* [入门Nginx之-负载均衡(SpringBoot)](https://heartsuit.blog.csdn.net/article/details/91960724)
* [入门Nginx之-代理Websocket](https://heartsuit.blog.csdn.net/article/details/93609624)
* [入门Nginx之-代理HTTPS， HTTP强制转HTTPS](https://heartsuit.blog.csdn.net/article/details/93505668)
* [Nginx配置开启HTTP2支持](https://heartsuit.blog.csdn.net/article/details/114905554)
* [openssl版本升级后，Nginx用的还是旧版的openssl](https://heartsuit.blog.csdn.net/article/details/114941825)
* [在华为鲲鹏openEuler20.03系统上安装Redis, Zookeeper, Nginx](https://heartsuit.blog.csdn.net/article/details/117047941)
* [全栈开发之前、后端服务部署：Nginx源码安装，反向代理，静态资源服务，生产环境跨域，负载均衡](https://blog.csdn.net/u013810234/article/details/122747442)
* [Nginx源码安装，配置开机自启](https://blog.csdn.net/u013810234/article/details/123308259)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
