---
layout: post
title: 入门Nginx之-代理HTTPS， HTTP强制转HTTPS
tags: Nginx
---

### 简介

之前介绍过[Nginx反向代理实现二级域名转发](https://blog.csdn.net/u013810234/article/details/89707077)， 不过当时直接用Nginx代理的HTTP。 这次通过Nginx启用SSL， 代理HTTPS， 并实现HTTP强制转HTTPS。 

### 第一步 Nginx代理HTTPS

修改配置： 添加443端口监听， 开启SSL， 配置证书地址， 反向代理HTTPS。 

```nginx
server { 
    listen  443 ssl;
    server_name  www.abc.com;
    ssl         on;
    ssl_certificate     /usr/cert/yourperm.pem;
    ssl_certificate_key /usr/cert/yourkey.key;

    location / {
        proxy_pass https://127.0.0.1:9443;
        proxy_set_header Host $host;
    }
}
```

Note: 证书： 阿里云上的免费证书

### 第二步 HTTP强制转 HTTPS

修改配置： 在80端口监听HTTP请求， 并重写请求， 以实现跳转。 `rewrite ^(.*) https://$server_name$1 permanent;` 

最终配置内容为： 

```nginx
server {
    listen 80;
    server_name www.abc.com;
    rewrite ^(.*) https://$server_name$1 permanent;
} 

server { 
    listen  443 ssl;
    server_name  www.abc.com;
    ssl         on;
    ssl_certificate     /usr/cert/yourperm.pem;
    ssl_certificate_key /usr/cert/yourkey.key;

    location / {
        proxy_pass https://127.0.0.1:9443;
        proxy_set_header Host $host;
    }
}
```

Done~

Note: 修改配置后， 记得先刷新配置： `nginx -s reload` 

至此， 便实现了Nginx反向代理HTTPS， 并自动从HTTP——>HTTPS

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
