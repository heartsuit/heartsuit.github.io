---
layout: post
title: 入门Nginx之-反向代理实现二级域名转发
tags: Nginx
---

### 简介

前两天遇到开设子域名的问题，也就是二级域名，所以便开始对这方面进行了解。一直以为 www 开头的域名就是顶级域名，那真是太天真~~以 QQ 为例，顶级域名是 qq.com，而`www.qq.com`其实是二级域名，而`mail.qq.com`也是二级域名，与`www.qq.com`是同级的。

- 需求：假设现在已有一个顶级域名`abc.com`，一般要求以 www 开头作为二级域名进行备案。服务器上运行着两个服务：

1. `SpringBoot`项目，一个主站服务，端口 443（此处是 HTTPS 默认端口）；
2. `Node.js`项目，一个简单的 OCR 小屁项目，端口 8888（随便指定的端口）；

- 目标：

1. `SpringBoot`项目，访问地址：www.abc.com；
2. `Node.js`项目，访问地址：ocr.abc.com；

### 第一步 域名云解析，添加 A 记录

阿里云、腾讯云、华为云等都可以进行云解析；这里以阿里云、腾讯云为例。

- 阿里云解析
  ![2019-04-30-NginxAliA.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-30-NginxAliA.png)

- 腾讯云解析
  ![2019-04-30-NginxTencentA.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-30-NginxTencentA.png)

### 第二步 在 Nginx 中完成反向代理配置

- 编辑 Nginx 配置文件，在 nginx.conf 文件中新增`server`节点如下（通过`vi /etc/nginx/nginx.conf`修改）

```conf
server {
    listen 80;
    server_name www.abc.com;
    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass https://127.0.0.1:443;
    }
}

server {
    listen 80;
    server_name ocr.abc.com;
    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $http_host;
        proxy_pass http://127.0.0.1:8888;
    }
}
```

### 第三步 验证二级域名

切记，验证之前先要使用`nginx -s reload`刷新 Nginx 配置。

- 访问`www.abc.com`，实现对`SpringBoot`主站项目的访问；
- 访问地址：`ocr.abc.com`，实现对`Node.js`其他项目的访问；

Notes：

1. 文中所使用的顶级域名`abc.com`纯属虚构；
2. 在云解析添加 A 记录后，可能需要等几分钟，添加的二级域名解析才会生效，一般为 10 分钟左右；

至此，基于 Nginx 的反向代理，实现了二级域名的转发，下一篇再去了解下`Nginx负载均衡`。

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
