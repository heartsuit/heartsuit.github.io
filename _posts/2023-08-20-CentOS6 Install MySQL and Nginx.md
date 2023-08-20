---
layout: post
title: CentOS6上安装MySQL8与Nginx开机自启
tags: Docker
---

## 背景

临时在一台华为云的 `CentOS6` 上安装部署一个业务系统，这里记录下 `MySQL 8` 与 `Nginx` 的安装过程中遇到的问题。

## CentOS6上安装MySQL8

```bash
# 下载
wget http://repo.mysql.com/yum/mysql-8.0-community/el/6/x86_64/mysql-community-common-8.0.19-1.el6.x86_64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/6/x86_64/mysql-community-libs-8.0.19-1.el6.x86_64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/6/x86_64/mysql-community-client-8.0.19-1.el6.x86_64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/6/x86_64/mysql-community-server-8.0.19-1.el6.x86_64.rpm

# 安装
yum localinstall mysql-community-common-8.0.19-1.el6.x86_64.rpm
yum localinstall mysql-community-libs-8.0.19-1.el6.x86_64.rpm
yum localinstall mysql-community-client-8.0.19-1.el6.x86_64.rpm
yum localinstall mysql-community-server-8.0.19-1.el6.x86_64.rpm

# 或者用以下安装命令
rpm -ivh mysql-community-common-8.0.19-1.el6.x86_64.rpm
rpm -ivh mysql-community-libs-8.0.19-1.el6.x86_64.rpm
rpm -ivh mysql-community-client-8.0.19-1.el6.x86_64.rpm
rpm -ivh mysql-community-server-8.0.19-1.el6.x86_64.rpm
```

* 遇到的问题：安装MySQL8 Server报错

> file /etc/my.cnf from install of mysql-community-server-8.0.19-1.el6.x86_64 conflicts with file from package mysql-libs-5.1.73-8.el6_8.x86_64

解决方法：删除系统自带的 `MySQL` 库： `yum -y remove mysql-libs-5.1.73-8.el6_8.x86_64`

## CentOS6源码安装Nginx并配置开机自启

### 解压编译安装

```bash
tar -xvf nginx-1.22.0.tar.gz 

cd nginx-1.22.0
./configure
make
make install

vi /etc/profile
export NGINX_HOME=/usr/local/nginx
export PATH=$PATH:$NGINX_HOME/sbin

source /etc/profile
nginx -V
```

### 配置开机自启动

```bash
vi /etc/init.d/nginx

#!/bin/sh
#
# nginx - this script starts and stops the nginx daemin
#
# chkconfig: - 85 15
# description: Nginx is an HTTP(S) server, HTTP(S) reverse
# proxy and IMAP/POP3 proxy server
# processname: nginx
# config: /usr/local/nginx/conf/nginx.conf
# pidfile: /usr/local/nginx/logs/nginx.pid
# Source function library.
. /etc/rc.d/init.d/functions
# Source networking configuration.
. /etc/sysconfig/network
# Check that networking is up.
[ "$NETWORKING" = "no" ] && exit 0
nginx="/usr/local/nginx/sbin/nginx"
prog=$(basename $nginx)
NGINX_CONF_FILE="/usr/local/nginx/conf/nginx.conf"
lockfile=/var/lock/subsys/nginx
start() {
[ -x $nginx ] || exit 5
[ -f $NGINX_CONF_FILE ] || exit 6
echo -n $"Starting $prog: "
daemon $nginx -c $NGINX_CONF_FILE
retval=$?
echo
[ $retval -eq 0 ] && touch $lockfile
return $retval
}
stop() {
echo -n $"Stopping $prog: "
killproc $prog -QUIT
retval=$?
echo
[ $retval -eq 0 ] && rm -f $lockfile
return $retval
}
restart() {
configtest || return $?
stop
start
}
reload() {
configtest || return $?
echo -n $"Reloading $prog: "
killproc $nginx -HUP
RETVAL=$?
echo
}
force_reload() {
restart
}
configtest() {
$nginx -t -c $NGINX_CONF_FILE
}
rh_status() {
status $prog
}
rh_status_q() {
rh_status >/dev/null 2>&1
}
case "$1" in
start)
rh_status_q && exit 0
$1
;;
stop)
rh_status_q || exit 0
$1
;;
restart|configtest)
$1
;;
reload)
rh_status_q || exit 7
$1
;;
force-reload)
force_reload
;;
status)
rh_status
;;
condrestart|try-restart)
rh_status_q || exit 0
;;
*)
echo $"Usage: $0 {start|stop|status|restart|condrestart|try-restart|reload|force-reload|configtest}"
exit 2
esac
```

加入开机自启。

```bash
chmod +x /etc/init.d/nginx
chkconfig --add nginx
chkconfig --list nginx
chkconfig --level 345 nginx on
chkconfig --list nginx
```

### Nginx管理命令

```bash
service nginx status   #状态
service nginx start   #开启
service nginx stop    #停止
service nginx restart #重启
service nginx reload  #重新加载
```

## yum源问题修复

一开始因为 `yum` 源无法使用，不能通过 `yum install` 命令直接安装 `Nginx` ，就通过上述源码的方式安装 `Nginx` ，但是过程中遇到了 `Nginx` 需要的 `pcre` 等依赖，就顺带解决下 `yum` 源问题。

* yum install时报错

> Error: Cannot find a valid baseurl for repo: base

解决方法：

```bash
# 备份
mv /etc/yum.repos.d/CentOS-Base.repo /etc/yum.repos.d/CentOS-Base.repo.backup

# 根据系统版本下载对应的源
CentOS 5
    wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-5.repo
CentOS 6
    wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-6.repo
CentOS 7
    wget -O /etc/yum.repos.d/CentOS-Base.repo http://mirrors.aliyun.com/repo/Centos-7.repo
```

* yum install时报错

> http://mirrors.cloud.aliyuncs.com/centos/6/os/x86_64/repodata/repomd.xml: [Errno 14] PYCURL ERROR 6 - "Couldn't resolve host 'mirrors.cloud.aliyuncs.com'" 尝试其他镜像。

解决方法：进入到 `/etc/yum.repos.d/` 目录下，找到 `CentOS-Base.repo` 和 `epel.repo`

1. 将CentOS-Base.repo文件中的以下地址

http://mirrors.aliyun.com/centos/
http://mirrors.aliyuncs.com/centos/
http://mirrors.cloud.aliyuncs.com/centos/

全部替换为：http://mirrors.aliyun.com/centos-vault/centos/
 
2. epel.repo文件中的
enabled=1修改为enabled=0

## 后端服务报错

> Caused by: java.sql. SQLNonTransientConnectionException: Public Key Retrieval is not allowed

解决方法：后端服务中的数据库连接添加参数： `&allowPublicKeyRetrieval=true`

![2023-08-20-MySQL8JDBC.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-20-MySQL8JDBC.jpg)

## 小总结

`MySQL` 是一个流行的关系型数据库管理系统， `MySQL 8` 版本引入了许多新功能和性能改进，包括更好的安全性、 `JSON` 支持、窗口函数等。安装 `MySQL 8` 可以让您在 `CentOS 6` 上使用最新的数据库功能。

`Nginx` 是一个高性能的 `Web` 服务器和反向代理服务器，它可以处理大量并发连接并提供快速的响应。 `Nginx` 还可以用作负载均衡器和静态文件服务器。安装 `Nginx` 可以提高网站的性能和可靠性。

请注意， `CentOS 6` 已经过时，建议升级到更新的操作系统版本以获得更好的性能和安全性。

## Reference

* [在华为鲲鹏openEuler20.03系统上安装MySQL8](https://heartsuit.blog.csdn.net/article/details/117629538)
* [https://blog.csdn.net/a1513049385/article/details/90052956/](https://blog.csdn.net/a1513049385/article/details/90052956/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
