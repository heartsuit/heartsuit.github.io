---
layout: post
title: 入门Nginx之-负载均衡(SpringBoot)
tags: Nginx
---

### 简介

采用一个SpringBoot后端服务，在不同的端口启动，以模拟多个服务，这里以两个为例说明；

- 操作系统：Windows 7

### 第一步 备好多项服务，启动

- 代码

```java
package com.nginx.loadbalance.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * LoadBalanceController
 */
@RestController
public class LoadBalanceController {

    @Value("${server.port}")
    private String port;

    @GetMapping("/api/v1/serve")
    public String serve() {
        return "This is Server: " + port;
    }

}
```

- 启动

先打包：`mvn clean package`；然后开启两个服务。

```bash
java -jar loadbalance-0.0.1-SNAPSHOT.jar --server.port=8000
java -jar loadbalance-0.0.1-SNAPSHOT.jar --server.port=9000
```

### 第二步 在 Nginx 中完成负载均衡配置

- 编辑 Nginx 配置文件，在 nginx.conf 文件中新增`upstream`，`server`节点如下（Linux 一般通过`vi /etc/nginx/nginx.conf`修改）

```nginx
    upstream api-server {  
        server 127.0.0.1:8000;
        server 127.0.0.1:9000;
    }
    server {
        listen       80;
        server_name  localhost;

        location /  {
            proxy_pass   http://api-server;
            proxy_redirect default;
        }
    }
```

### 第三步 验证负载均衡

切记，验证之前先要使用`nginx -s reload`刷新 Nginx 配置。


访问`http://localhost/api/v1/serve`，观察页面显示的信息，将在两个服务之间按照默认的分发方式进行分发：

- This is Server: 8000

- This is Server: 9000

Notes：可能遇到的问题

    配置负载均衡，浏览器请求时报错 “HTTP Status 400 – Bad Request”，以下是刚开始报错的配置信息

```nginx
    upstream api_server {  
        server 127.0.0.1:8000;
        server 127.0.0.1:9000;
    }
    server {
        listen       80;
        server_name  localhost;

        location /  {
            proxy_pass   http://api_server;
            proxy_redirect default;
        }
    }
```

可是，nginx -t 测试结果竟然显示成功，而在后端服务日志报错：

![2019-06-14-NginxSpringboot.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-06-14-NginxSpringboot.png)

- 原因分析：nginx中upstream后面的名称不能包含下划线，与Nginx配置文件中的属性名冲突（eg:server_name）。
- 解决方法：去掉下划线或者以-代替_

至此，基于Nginx与SpringBoot，实现了负载均衡。

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
