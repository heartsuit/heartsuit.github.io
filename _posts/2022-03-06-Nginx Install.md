---
layout: post
title: Nginx源码安装，配置开机自启
tags: 运维, Nginx
---

## 背景

最近，全球都在制裁 `Nginx` ， `ClickHouse` 的诞生地。以前都是通过 `yum` 直接安装的 `Nginx` ，今天试试源码安装。

![2022-03-06-NginxIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-06-NginxIndex.jpg)

## 系统环境

在 `CentOS7` 上进行安装，虚拟主机信息如下：

```bash
[root@hadoop1 local]# uname -a
Linux hadoop1 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
[root@hadoop1 local]# cat /proc/version
Linux version 3.10.0-1127.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 31 23:36:51 UTC 2020
[root@hadoop1 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)
```

## 下载解压

```bash
# 下载
[root@hadoop1 local]# wget http://nginx.org/download/nginx-1.20.1.tar.gz

# 解压
[root@hadoop1 local]# tar -xvf nginx-1.20.1.tar.gz
```

## 编译安装

```conf
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

# 刷新配置
[root@hadoop1 nginx-1.20.1]# source /etc/profile

[root@hadoop1 nginx-1.20.1]# nginx -V
nginx version: nginx/1.20.1
built by gcc 4.8.5 20150623 (Red Hat 4.8.5-44) (GCC) 
configure arguments:
```

Note: 
1. 如果在编译时报错缺少组件，可以先安装基础依赖：`yum -y install gcc openssl openssl-devel pcre-devel zlib zlib-devel`。
2. 如果要配置HTTPS，需要在编译时安装 `SSL` 模块，configure时附带参数：`./configure --with-http_stub_status_module --with-http_ssl_module --with-openssl=/usr/bin/openssl`。

## 启动验证

```conf
# 启动
[root@hadoop1 nginx-1.20.1]# nginx -c /usr/local/nginx/conf/nginx.conf
```

通过80端口访问，看 `Nginx` 是否启动成功。

![2022-03-06-NginxHome.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-06-NginxHome.jpg)

## 配置开机自启

```conf
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
```

## 验证开机自启

```conf
[root@hadoop1 nginx-1.20.1]# systemctl list-unit-files | grep nginx
nginx.service                                 disabled
[root@hadoop1 nginx-1.20.1]# systemctl enable nginx
Created symlink from /etc/systemd/system/multi-user.target.wants/nginx.service to /usr/lib/systemd/system/nginx.service.
[root@hadoop1 nginx-1.20.1]# systemctl list-unit-files | grep nginx
nginx.service                                 enabled 
```

## 常用命令

```conf
# Nginx启停
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

Note: 
01. 修改完配置后，可通过`nginx -t`测试配置是否存在语法错误或者typo；
02. 修改完配置后，记得通过`nginx -s reload`刷新使配置生效；

## Reference

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
* [全栈开发之前、后端服务部署：Nginx源码安装，反向代理，静态资源服务，生产环境跨域，负载均衡](https://blog.csdn.net/u013810234/article/details/122747442)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
