---
layout: post
title: 入门Nginx之-静态资源服务器及跨域配置
tags: Nginx
---

### 简介

- 这里静态资源就以之前的一个项目[文章地址](https://blog.csdn.net/u013810234/article/details/89392732)为例，[源码 Github](https://github.com/heartsuit/devcloud-vue)，项目本身很简单，只是分别对第三方的服务端、自己的服务端发起请求。

- 不论是调用第三方服务端接口，还是自己的后端服务，如果跨域未在服务器端处理，那么 Vue 部署时需要在生产环境下处理跨域。下面以 Windows 为例，采用 Nginx 两个步骤，来实现针对 Vue 项目的静态资源服务器及跨域配置。

Notes: 补充一下，何为跨域？借用安全大神吴翰清名作《白帽子讲 Web 安全》中的一张图：

![2019-04-29-CrossOrigin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-29-CrossOrigin.jpg)

即，但凡`协议、主机、端口`中的任一个不同，该请求便为跨域操作。

### 效果

![2019-04-18-Appearance.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-Appearance.gif)

### 第一步 通过 Nginx 搭建静态资源服务器

- `vue-cli`搭建的项目通过`npm run build`进行构建，完成生产环境下的打包，生成`dist`静态资源目录，eg: `E:/dist`。

- 编辑 Nginx 配置文件，在 nginx.conf 文件中新增`server`节点如下（主要是`root`的路径指向打包后的目录）

```nginx
server {
    listen       80;
    server_name  localhost;

    #charset koi8-r;
    #access_log  logs/host.access.log  main;

    location / {
        root   E:/dist;
        index  index.html index.htm;
    }
}
```

Notes:

1. Linux 下 Nginx 配置文件的默认路径：`/etc/nginx/nginx.conf`，通过`vi /etc/nginx/nginx.conf`修改。
2. 实际项目中`server_name`一般采用域名，这里在本机测试，设置为 localhost。

至此，静态资源服务器已搭建完毕，`nginx -s reload`刷新 Nginx 配置；在浏览器访问对应的地址+端口，不出意外，应该可以正常访问到 Vue 的前端页面。然而，问题是，这些接口由于需要跨域都不能正常调用(╥╯^╰╥)。

![2019-04-29-NginxStatic.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-29-NginxStatic.png)

### 第二步 在 Nginx 中完成跨域配置

```nginx
server {
    listen       80;
    server_name  localhost;

    #charset koi8-r;
    #access_log  logs/host.access.log  main;

    location / {
        root   E:/dist;
        index  index.html index.htm;
    }

    # Solve the CORS problem
    location /3rd  {                              # custom prefix: third party API
        rewrite  ^/3rd/(.*)$ /$1 break;           # rewrite the URL and redirect
        include  uwsgi_params;
        proxy_pass   http://www.tuling123.com/openapi/api;   # Third party API URL
    }

    location /api  {                              # custom prefix
        include  uwsgi_params;
        proxy_pass   http://your-server-ip:port;   # Server side API URL
    }
}
```

Notes: Vue 开发环境跨域

![2019-04-19-DevCors.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DevCors.png)

至此，便实现了基于 Nginx 的静态资源服务器及跨域配置，后续将从实例出发，逐步介绍`Nginx反向代理`，`Nginx负载均衡`。

### Source Code: [Github](https://github.com/heartsuit/devcloud-vue)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
