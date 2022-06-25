---
layout: post
title: 信创环境下Nginx正向代理实现内网发送邮件
tags: 国产化, 正向代理
---

## 背景

标题党了，其实不管是不是在信创环境，只要存在网络分区/隔离，我们都可能面临发送邮件的问题：

* 业务服务要发送邮件但是部署在无法连接互联网的环境A中；
* `Nginx`一方面作为静态资源服务，另一方面作为反向代理服务部署在互联网区B中；
* A和B之间通过某种手段后可以通信。

这就用到 `Nginx` 的正向代理功能。关于什么是**正向代理**，这里不多解释了。下面记录下如何通过 `Nginx` 的正向代理实现内网环境的 `QQ` 邮件发送功能。

1. 检查Nginx是否具备转发邮件模块；
2. 如果没有mail模块，则附带参数重新编译Nginx；
3. 如果有mail模块，则直接配置nginx.conf的stream块；
4. 业务服务SpringBoot配置。

![2022-06-25-NginxMail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-25-NginxMail.jpg)

`Nginx`本身是不具备发送邮件功能的，我们只是让其做了一个代理与转发的事情。

## 检查Nginx是否具备转发邮件模块

命令行输入 `nginx -V` 检查模块信息。

```bash
[root@sx-std-0001 ~]# nginx -V
nginx version: nginx/1.20.1
built by gcc 7.3.0 (GCC) 
configure arguments: 
```

如果使用的是[Nginx源码安装，配置开机自启](https://blog.csdn.net/u013810234/article/details/123308259?spm=1001.2014.3001.5501)这篇文章介绍的方式安装的 `Nginx` ，那么默认是没有 `mail` 以及其他模块的。

## 如果没有mail模块，则附带参数重新编译Nginx

> --with-mail --with-stream

```bash
cd /opt/nginx-1.20.1/
# 添加模块，重新配置
./configure --with-mail --with-stream
# 编译
make
# 养成好习惯，备份旧文件
cp /usr/local/nginx/sbin/nginx /usr/local/nginx/sbin/nginx.2022-6-15
# 使用新文件替换nginx
cp /opt/nginx-1.20.1/objs/nginx /usr/local/nginx/sbin

# 重启nginx服务
systemctl restart nginx

# 再次检查模块信息，新增了mail相关的模块
[root@sx-std-0001 ~]# nginx -V
nginx version: nginx/1.20.1
built by gcc 7.3.0 (GCC) 
configure arguments: --with-mail --with-stream
```

## 如果有mail模块，则直接配置nginx.conf的stream块

编辑 `Nginx` 配置： `vi /usr/local/nginx/conf/nginx.conf` ，显然，这里以 `QQ邮箱` 为例，其他邮箱的配置类似。

```conf
stream{
    server {
        listen       3250;
        proxy_pass smtp.qq.com:25;
    }
}
```

Note: 
1. 在`Nginx`的配置文件中，`stream`的位置是与`http`并列的。
2. 邮件服务的默认端口为`25`，不过这里 `listen` 的端口可以自己指定，相应地，在业务服务中配置需要通过`port`指定端口。

## 业务服务SpringBoot配置

这里业务服务为一个基于 `Spring Cloud` 的微服务，具体的邮件配置如下，关键是 `host` 与 `port` ，没有正向代理的时候 `host` 是 `smtp.qq.com`

```yaml
spring:
  # 邮箱配置
  mail:
    host: 正向代理服务器的IP
    port: 3250
    username: 发件人邮箱
    password: 你的授权码
    properties:
      mail:
        smpt:
          auth: true
          starttls:
            enable: true
            required: true 
```

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
