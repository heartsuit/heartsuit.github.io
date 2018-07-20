---
layout: post
title: Spring Boot配置内置Tomcat的maxPostSize值
tags: Java
---
### Background

前端页面表单输入数据较多，包含多个文本、多张图片，在数据未压缩的情况下，最终上传失败。

### Problem 1

后端报错：

> java.lang.IllegalStateException: The multi-part request contained parameter data (excluding uploaded files) that exceeded the limit for maxPostSize set on the associated connector

即：请求数据量过大，超出了最大阈值。

- Solution：

修改`Spring Boot`内置Tomcat的`maxPostsize`值，在`application.yml`配置文件中添加以下内容：

``` yml
server:  
  tomcat:
    max-http-post-size: -1
```

**Note: 以下配置并不能解决Tomcat请求数据量的限制问题**

``` yml
spring:
  servlet:
    multipart:
      max-file-size: 30Mb
      max-request-size: 100Mb
```

### Problem 2

解决了应用服务器请求数据量过大问题后，在下一步写入DB时又遇到了类似问题，超出了数据库中最大允许数据包默认配置值。

> Cause: com.mysql.jdbc.PacketTooBigException: Packet for query is too large (16800061 > 16777216). You can change this value on the server by setting the max_allowed_packet' variable.

- Solution：

修改DB的`max_allowed_packet`值：

``` sql
USE demo;
set global max_allowed_packet = 3*1024*1024*10; # 改为30M
show VARIABLES like '%max_allowed_packet%'; # 重启DB连接生效
``` 

Note：`MySQL`中`max_allowed_packet` 的 默认配置：`16777216 = 16 * 1024 * 1024`，即16M


---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***