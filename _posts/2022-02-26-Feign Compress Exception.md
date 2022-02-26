---
layout: post
title: 调用Feign接口报错：HttpMessageNotReadableException：JSON parse error：Illegal character ((CTRL-CHAR, code 31))：only regular white space is allowed between tokens
tags: SpringBoot, SpringCloud
---

### 背景

在一个定时任务中，每隔一个小时会调用远程接口进行数据同步。本着“先实现，再优化”的原则，刚开始实现方式是在循环里每次调用远程接口，传入单条记录，因为每次都需要完成建立连接、数据传输、断开连接的操作，这样的话比较耗费网络与连接资源；后来测试没问题后，就改成了在循环完成后传入一个 `List` 进行批量操作，然后问题出现了。

> 10:12:28.881 [http-nio-8200-exec-3] ERROR c.y.c.s.h. GlobalExceptionHandler - [handleRuntimeException, 82] - 请求地址'/doit', 发生未知异常.org.springframework.http.converter. HttpMessageNotReadableException: JSON parse error: Illegal character ((CTRL-CHAR, code 31)): only regular white space (\r, \n, \t) is allowed between tokens; nested exception is com.fasterxml.jackson.core. JsonParseException: Illegal character ((CTRL-CHAR, code 31)): only regular white space (\r, \n, \t) is allowed between tokens

### 环境信息

用到的 `OpenFeign` 的版本信息：

![2022-02-26-FeignVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-26-FeignVersion.jpg)

### 问题分析

为什么每次传一条数据可以，但是传输列表的时候就出错了呢？

结合以前配置 `Nginx` 时的 `gzip` 压缩的经验，感觉这跟 `Feign` 的压缩配置有关系。可参考官方文档：[https://docs.spring.io/spring-cloud-openfeign/docs/3.0.3/reference/html/#feign-requestresponse-compression](https://docs.spring.io/spring-cloud-openfeign/docs/3.0.3/reference/html/#feign-requestresponse-compression)

此时， `Feign` 的配置如下：

```yaml
# feign 配置
feign:
  sentinel:
    enabled: true
  okhttp:
    enabled: true
  httpclient:
    enabled: false
  client:
    config:
      default:
        connectTimeout: 10000
        readTimeout: 10000
  compression:
    request:
      enabled: true
    response:
      enabled: true
```

从配置中，我们可以了解到当前配置开启了请求与响应的压缩功能。我们知道，什么时候进行压缩其实跟请求体的大小有关，如果本身请求的数据体较小，完全可以不进行压缩直接传输即可，这样可以节省压缩用的 `CPU` 资源；那么我们可以大胆地猜测：压缩是有一个阈值的，超过某个阈值才会进行压缩。这可以解释前面的疑问：**为什么每次传一条数据可以，但是传输列表的时候就出错了呢？**

### 解决方法

明确了问题的原因，解决起来就比较容易了。我们可以简单粗暴地将压缩关闭即可。。

![2022-02-26-FeignConfig.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-26-FeignConfig.jpg)

Note：由于改成了批量传输的方式，导致业务处理耗时较长，在请求发起端可能出现"Timed out.."这类错误。这里的配置将 `HTTP` 连接的超时时间由10s修改成了60s；等数据同步完成，再改回来。

### Reference

* [https://docs.spring.io/spring-cloud-openfeign/docs/3.0.3/reference/html/#feign-requestresponse-compression](https://docs.spring.io/spring-cloud-openfeign/docs/3.0.3/reference/html/#feign-requestresponse-compression)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
