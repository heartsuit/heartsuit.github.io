---
layout: post
title: 入门Nginx之-代理Websocket
tags: Nginx
---

### HTTPS与WSS同端口的情况

HTTPS与WSS同端口： 两者在后端服务的同一端口， eg: 4000； 

```nginx
server {
    listen  443 ssl;
    server_name  api.abc.com;
    ssl         on;
    ssl_certificate     /usr/cert/yourpem.pem;
    ssl_certificate_key /usr/cert/yourkey.key;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

Note: 证书： 阿里云上的免费证书

### HTTPS与WSS在不同端口的情况

HTTPS与WSS在不同端口， 用SpringBoot+Netty实现的Websocket， SpringBoot服务与Netty服务， 两者各占一个端口， 此时需要在接口路由上标明WS的前缀， 以示区分。 eg： HTTPS服务在6000端口， WSS启动在5000端口； 

```nginx
server {
    listen  443 ssl;
    server_name  api.abc.com;
    ssl         on;
    ssl_certificate     /usr/cert/yourpem.pem;
    ssl_certificate_key /usr/cert/yourkey.key;

    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
    
    location / {
        proxy_pass https://127.0.0.1:6000;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host $http_host;
    }
}
```

其实， 从上述配置过程中， 可以看出， 对于客户端过来的请求， Nginx做了一次协议转换与升级， 这在客户端发出请求时， 可以进行验证： 

![2019-06-25-NginxWebSocket.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-25-NginxWebSocket.png)

Note: 修改配置后， 记得先刷新配置： `nginx -s reload` 

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
