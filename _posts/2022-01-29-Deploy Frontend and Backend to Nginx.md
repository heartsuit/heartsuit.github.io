---
layout: post
title: 全栈开发之前、后端服务部署：Nginx源码安装，反向代理，静态资源服务，生产环境跨域，负载均衡
tags: Nginx
---

### 背景

有了前端、后端甚至有时候还有移动端（APP、小程序）、跨平台的客户端之后，经过技术与产品的日常撕逼，然后开发、测试人员哼哧哼哧的一顿操作后，项目需要打包、部署到一个人们可以访问到的服务器上，毕竟，我们的产出是要给人们（也可能是机器。。）提供服务的。常用的反向代理（问：什么是反向代理，什么是正向代理？）服务组件有： `Nginx` 、 `Tengine` 、 `OpenResty` ，其实，这些的核心基础都是 `Nginx` ，所以这里以 `Nginx` 为例来部署代理我们的前后端服务。eg：一个极简的部署一般像这样：

![2022-01-29-Deploy.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-29-Deploy.png)

* 前端打包：`npm run build`

* 后端打包: `mvn clean package -Dmaven.test.skip=true`

* Nginx反向代理，静态资源托管，生产环境跨域，负载均衡。

Note: 关于拉取代码、构建、发布、部署这一系列过程，分为自动模式与手动模式；可以通过一些CI/CD工具或服务完成自动化的流水线一键发布。本篇文章中就先采用手动模式，如果不了解手动模式的繁琐，就无法体会自动模式的效率。

### 源码安装Nginx

```bash
# 下载
[root@hadoop1 local]# wget http://nginx.org/download/nginx-1.20.1.tar.gz

# 解压
[root@hadoop1 local]# tar -xvf nginx-1.20.1.tar.gz
[root@hadoop1 local]# cd nginx-1.20.1
[root@hadoop1 nginx-1.20.1]# ./configure
[root@hadoop1 nginx-1.20.1]# make
[root@hadoop1 nginx-1.20.1]# make install

# 配置环境变量
[root@hadoop1 nginx-1.20.1]# nginx -V
-bash: nginx: 未找到命令
[root@hadoop1 nginx-1.20.1]# vi /etc/profile
export NGINX_HOME=/usr/local/nginx
export PATH=$PATH:$NGINX_HOME/sbin

[root@hadoop1 nginx-1.20.1]# source /etc/profile

[root@hadoop1 nginx-1.20.1]# nginx -V
nginx version: nginx/1.20.1
built by gcc 4.8.5 20150623 (Red Hat 4.8.5-44) (GCC) 
configure arguments:

# 启动
[root@hadoop1 nginx-1.20.1]# nginx -c /usr/local/nginx/conf/nginx.conf

# 配置开机自启Nginx服务
# 这里是用源码编译安装的，所以需要手动创建nginx.service服务文件。
[root@hadoop1 nginx-1.20.1]# vi /lib/systemd/system/nginx.service
[Unit]
Description=nginx service
After=network.target 
   
[Service] 
Type=forking 
ExecStart=/usr/local/nginx/sbin/nginx
ExecReload=/usr/local/nginx/sbin/nginx -s reload
ExecStop=/usr/local/nginx/sbin/nginx -s quit
PrivateTmp=true 
   
[Install] 
WantedBy=multi-user.target

[root@hadoop1 nginx-1.20.1]# systemctl list-unit-files | grep nginx
nginx.service                                 disabled
[root@hadoop1 nginx-1.20.1]# systemctl enable nginx
Created symlink from /etc/systemd/system/multi-user.target.wants/nginx.service to /usr/lib/systemd/system/nginx.service.
[root@hadoop1 nginx-1.20.1]# systemctl list-unit-files | grep nginx
nginx.service                                 enabled 

# 常用命令
systemctl start nginx.service　         启动nginx服务
systemctl stop nginx.service　          停止服务
systemctl restart nginx.service　       重新启动服务
systemctl status nginx.service          查看服务状态
systemctl enable nginx.service          设置开机自启动
systemctl disable nginx.service         取消开机自启动

# 查看开机启动项
systemctl list-unit-files
systemctl list-unit-files | grep enabled
systemctl list-unit-files | grep nginx
```

### Nginx静态资源服务器

```conf
    location / {
        root  /opt/reading-notes/frontend/dist;
        index  index.html index.htm;
    }
```

### Nginx配置代理跨域

```conf
    location /api  {
            include  uwsgi_params;
            rewrite  ^/api/(.*)$ /$1 break;
            proxy_pass   http://localhost:8000;
    }
```

### 开发环境使用Java11，生产环境使用Java8，报错：

解决方法，打包时使用 `jdk1.8`

```xml
<plugin>
     <groupId>org.apache.maven.plugins</groupId>
     <artifactId>maven-compiler-plugin</artifactId>
     <configuration>
         <source>1.8</source>
         <target>1.8</target>
         <encoding>UTF-8</encoding>
     </configuration>
 </plugin>
```

### 远程访问数据库

```bash
# 查看对当前用户的授权情况
show grants for 'root';

# 授权
GRANT DELETE, INSERT, SELECT, UPDATE ON `reading_notes`.* to root@'%' identified by 'root';
flush PRIVILEGES;

# 吊销
REVOKE DELETE, INSERT, SELECT, UPDATE ON `reading_notes`.* from root@'%';
flush PRIVILEGES;
```

### Nginx负载均衡

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

### 确定请求的响应来自于哪台主机

```
add_header ServerIP $upstream_addr; 
```

有了以上配置，可以在请求响应的头信息中看到 `ServerIP` 的信息。

### Vue打包部署后，刷新页面404

```
try_files $uri $uri/ /index.html;
```

### 动态添加Nginx插件

HTTPS，HTTP2

### 前提

当然我们首先需要一台具有公网IP的服务器，甚至一个备案过的域名，关于服务器和域名的购买、备案，以及域名解析、SSL证书购买/申请等过程还是比较容易的，这里就跳过了。

### 小总结

通过以上步骤，我们有了前后端服务、部署到了服务器上，一个基本的Web2.0的网站就已经正常地跑起来了，可以为我们的客户提供服务啦。

下一步就是服务监控、弹性扩展、访问加速等一系列优化性的操作了，一些小屁网站可以没有这些运维相关的操作，但是对于稍微有点规模的系统，监控措施、扩展机制、持续优化是必备的。

反向代理、负载均衡，可能是成为系统架构师的第一步。因为这个时候，便会衍生出当今计算机领域的一个核心关键词：“集群”。这跟人们的日常工作生活非常类似，一个人的力量是有限的，而一群人的智慧是无穷的。每当我们的服务在一台主机上（或单个服务实例）的压力过大时，这时，另一个关键词涌现了：“扩展”或者“弹性伸缩”，提到“扩展”，我们一般还会分为“垂直扩展”、“水平扩展”，后续我将逐步介绍关于关系型数据库服务、文档型数据库服务、时序数据库服务、缓存服务、消息队列服务、定时任务服务、对象存储服务、搜索引擎服务、大数据各服务组件的弹性伸缩以及水平扩展能力。

最后，以《Hadoop权威指南-第4版》中的一句话作为本篇的结束：

> 在古时候，人们用牛来拉重物。当一头牛拉不动一根圆木时，人们从来没有考虑过要想方设法培育出一种更强壮的牛。同理，我们也不该想方设法打造出什么超级计算机，而应该千方百计综合利用更多计算机来解决问题。

### Reference

关于 `Nginx` ，我之前总结过各种掉进的坑以及如何跳出的解决方法。如果恰巧你也遇到了类似问题，那么很高兴能够为你节省点时间。

历史文章链接：

* [入门Nginx之-静态资源服务器及跨域配置](https://heartsuit.blog.csdn.net/article/details/89674769)
* [入门Nginx之-反向代理实现二级域名转发](https://heartsuit.blog.csdn.net/article/details/89707077)
* [入门Nginx之-负载均衡(SpringBoot)](https://heartsuit.blog.csdn.net/article/details/91960724)
* [入门Nginx之-代理Websocket](https://heartsuit.blog.csdn.net/article/details/93609624)
* [入门Nginx之-代理HTTPS， HTTP强制转HTTPS](https://heartsuit.blog.csdn.net/article/details/93505668)
* [Nginx配置开启HTTP2支持](https://heartsuit.blog.csdn.net/article/details/114905554)
* [openssl版本升级后，Nginx用的还是旧版的openssl](https://heartsuit.blog.csdn.net/article/details/114941825)
* [在华为鲲鹏openEuler20.03系统上安装Redis, Zookeeper, Nginx](https://heartsuit.blog.csdn.net/article/details/117047941)

关于CI（持续集成）的流程，我们曾经在华为软开云上有具体的实践，代码托管、前后端服务构建-发布-流水线，如果感兴趣，可参考：

* [上手华为软开云DevOps前后端分离实践之-前端Vue](https://heartsuit.blog.csdn.net/article/details/89392732)
* [ 上手华为软开云DevOps前后端分离实践之-静态资源服务器(Node.js)](https://heartsuit.blog.csdn.net/article/details/89420934)
* [上手华为软开云DevOps前后端分离实践之-后端SpringBoot](https://heartsuit.blog.csdn.net/article/details/89376466)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
