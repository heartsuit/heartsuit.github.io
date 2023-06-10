---
layout: post
title: CentOS6.10上离线安装ClickHouse19.9.5.36并修改默认数据存储目录
tags: 运维, DataBase
---

## 背景

在一台装有 `CentOS6.10` 操作系统的主机上安装 `ClickHouse` （其实本来计划是先安装 `Docker` ，然后在 `Docker` 中快速启动 `ClickHouse` 的，但是由于 `CentOS6` 对 `Docker` 支持不好，就直接在系统上装 `ClickHouse` 吧）；但是在操作系统上按照 `ClickHouse` 官方的命令： `curl https://clickhouse.com/ | sh` 安装后，启动报错：

> ./clickhouse: /lib64/libc.so.6: version `GLIBC_2.14' not found (required by ./clickhouse)

网上一查：出现"libc.so.6: version `GLIBC_2.14` not found"问题，是由于 `glibc` 版本过低，需要升级 `glibc` 。由于CentOS系统RPM源目前 `glibc` 最高版本是2.12，所以只能采用源码升级，一顿操作后，查看系统glibc支持的版本 `strings /lib64/libc.so.6 |grep GLIBC` ，有了GLIBC_2.14；折腾了半天，可是依然无法成功启动 `ClickHouse` 。

最后选择离线安装低版本 `ClickHouse19.9.5.36` ；此外，系统还挂载了一个600G的数据盘，就修改 `ClickHouse` 的默认数据存储目录，将数据和日志放到数据盘中；配置了远程访问与密码，通过命令行客户端建立连接，最后建库建表。

![2023-06-10-ClickHouse.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-06-10-ClickHouse.jpg)

## 系统环境

```bash
[root@iiot ~]# uname -a
Linux iiot 2.6.32-754.15.3.el6.x86_64 #1 SMP Tue Jun 18 16:25:32 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
[root@iiot ~]# cat /etc/redhat-release 
CentOS release 6.10 (Final)
[root@iiot ~]# cat /proc/version 
Linux version 2.6.32-754.15.3.el6.x86_64 (mockbuild@x86-01.bsys.centos.org) (gcc version 4.4.7 20120313 (Red Hat 4.4.7-23) (GCC) ) #1 SMP Tue Jun 18 16:25:32 UTC 2019
```

## 下载安装

* 下载

[https://packagecloud.io/app/altinity/clickhouse/search?q=&filter=all&dist=el%2F6](https://packagecloud.io/app/altinity/clickhouse/search?q=&filter=all&dist=el%2F6)

* 安装

```bash
rpm -ivh clickhouse-server-common-19.9.5.36-1.el6.x86_64.rpm
rpm -ivh clickhouse-server-19.9.5.36-1.el6.x86_64.rpm  --force --nodeps
rpm -ivh clickhouse-client-19.9.5.36-1.el6.x86_64.rpm  --force --nodeps
rpm -ivh clickhouse-common-static-19.9.5.36-1.el6.x86_64.rpm   --force --nodeps
```

* 启动

```bash
# 啊呜，启动报错
[root@iiot mpp]# service clickhouse-server start
Start clickhouse-server service: /usr/bin/clickhouse-extract-from-config: error while loading shared libraries: libicui18n.so.42: cannot open shared object file: No such file or directory
Cannot obtain value of path from config file: /etc/clickhouse-server/config.xml
```

下载 `libicu` 和 `libicu-devel` 并按照，解决上述报错： `error while loading shared libraries: libicui18n.so.42` 。

```bash
wget http://mirrors.aliyun.com/centos-vault/6.10/os/x86_64/Packages/libicu-4.2.1-14.el6.x86_64.rpm
wget http://mirrors.aliyun.com/centos-vault/6.10/os/x86_64/Packages/libicu-devel-4.2.1-14.el6.x86_64.rpm

rpm -ivh libicu-4.2.1-14.el6.x86_64.rpm
rpm -ivh libicu-devel-4.2.1-14.el6.x86_64.rpm
```

```bash
# 启动成功
[root@iiot mpp]# service clickhouse-server start
Start clickhouse-server service: Path to data directory in /etc/clickhouse-server/config.xml: /var/lib/clickhouse/
DONE

# 查看状态，竟然停止了。。
[root@iiot mpp]# service clickhouse-server status
clickhouse-server: process unexpectedly terminated

# 到日志目录看下啥原因
[root@iiot clickhouse-server]# cd /var/log/clickhouse-server/
[root@iiot clickhouse-server]# ll
总用量 8
-rw-r----- 1 clickhouse clickhouse    0 6月   7 11:22 clickhouse-server.err.log
-rw-r----- 1 clickhouse clickhouse 3190 6月   7 11:35 clickhouse-server.log
-rw-r----- 1 clickhouse clickhouse 1969 6月   7 11:34 stderr.log
-rw-r----- 1 clickhouse clickhouse    0 6月   7 11:22 stdout.log

# 原来是服务器时区问题
[root@iiot clickhouse-server]# tailf clickhouse-server.log
Poco::Exception. Code: 1000, e.code() = 0, e.displayText() = Exception: Could not determine local time zone: custom time zone file used. (version 19.9.5.36)

# 解决ClickHouse时区报错问题
[root@iiot ~]# cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

# 重启ClickHouse后，连接8123端口，成功~
[root@iiot ~]# curl localhost:8123
Ok.

[root@iiot ~]# service clickhouse-server status
clickhouse-server service is running

# 停止ClickHouse服务
[root@iiot ~]# service clickhouse-server stop
Stop clickhouse-server service: 
DONE
```

## 修改默认的数据和日志目录

`ClickHouse` 默认数据目录： `/var/lib/clickhouse/` 。
`ClickHouse` 默认日志目录： `/var/log/clickhouse-server/` 。

挂载了一个*600G*的数据盘(在 `/mnt` 下)，将 `ClickHouse` 的数据和日志放到数据盘中。

```bash
[root@iiot ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
/dev/vda1        40G  3.8G   34G  11% /
tmpfs           3.9G     0  3.9G   0% /dev/shm
/dev/vdb1       591G   16G  546G   3% /mnt
```

```bash
# 修改clickhouse的默认数据目录和日志目录
[root@iiot ~]# cd /mnt/mpp
[root@iiot mpp]# mkdir -p clickhouse/data
[root@iiot mpp]# mkdir -p clickhouse/log
[root@iiot mpp]# mv /var/lib/clickhouse/ /mnt/mpp/clickhouse/data/
[root@iiot mpp]# cd /var/lib/
[root@iiot lib]# ln -s /mnt/mpp/clickhouse/data/clickhouse/ .
[root@iiot lib]# 
[root@iiot lib]# mv /var/log/clickhouse-server/ /mnt/mpp/clickhouse/log/
[root@iiot lib]# cd /var/log/
[root@iiot log]# ln -s /mnt/mpp/clickhouse/log/clickhouse-server/ .
[root@iiot log]# 
[root@iiot log]# chown -Rc clickhouse:clickhouse /mnt/mpp/clickhouse/data/clickhouse/
[root@iiot log]# chown -Rc clickhouse:clickhouse /mnt/mpp/clickhouse/log/clickhouse-server/
```

重启 `ClickHouse` 服务，启动成功。

## 开启远程访问并配置密码

* 开启远程访问

```bash
# 放开注释，当然记得开放安全组，默认端口8123
[root@iiot clickhouse-server]# vi /etc/clickhouse-server/config.xml
70     <listen_host>::</listen_host
```

* 配置密码

安全意识一定要上来，既然开启了远程访问，安全配套要跟上（实际生产不建议开放数据库端口）。

```bash
# 这里使用明文密码，还可以通过sha256对密码进行加密配置
[root@iiot clickhouse-server]# vi /etc/clickhouse-server/users.xml
<!-- If user name was not specified, 'default' user is used. -->
47             <password>CK666%</password>

# 重启服务
[root@iiot clickhouse-server]# service clickhouse-server restart
Stop clickhouse-server service: DONE
Start clickhouse-server service: Path to data directory in /etc/clickhouse-server/config.xml: /var/lib/clickhouse/
DONE
```

## 建库建表

`ClickHouse` 支持类 `SQL` 语句的操作，所以如果熟悉关系型数据库，可以很快上手（不过，与 `MySQL` 不同， `ClickHouse` 中的更新和删除语句不太一样，这在后续通过SpringBoot和MyBatisPlus集成 `ClickHouse` 后会遇到，并在下一篇文章中解决）。

```sql
-- 通过命令行客户端工具无密码连接（没配置密码可以这样连）
[root@iiot ~]# clickhouse-client

-- 通过命令行客户端工具带密码连接（-m参数含义：允许执行多行sql）
[root@iiot ~]# clickhouse-client --password -m

-- 建库
CREATE DATABASE IF NOT EXISTS helloworld;

-- 建表
CREATE TABLE helloworld.my_first_table
(
    user_id UInt32,
    message String,
    timestamp DateTime,
    metric Float32
)
ENGINE = MergeTree()
PRIMARY KEY (user_id, timestamp);
Code: 36. DB::Exception: Received from localhost:9000, ::1. DB::Exception: You must provide an ORDER BY expression in the table definition. If you don't want this table to be sorted, use ORDER BY tuple(). 
```

与高版本不同，在 `ClickHouse19` 中建表语句还要求有 `ORDER BY` 。。

```sql
CREATE TABLE helloworld.my_first_table
(
    user_id UInt32,
    message String,
    timestamp DateTime,
    metric Float32
)
ENGINE = MergeTree()
ORDER BY (user_id)
PRIMARY KEY (user_id, timestamp);
Code: 36. DB::Exception: Received from localhost:9000, ::1. DB::Exception: Primary key must be a prefix of the sorting key, but its length: 2 is greater than the sorting key length: 1. 

CREATE TABLE helloworld.my_first_table
(
    user_id UInt32,
    message String,
    timestamp DateTime,
    metric Float32
)
ENGINE = MergeTree()
ORDER BY (user_id, timestamp)
PRIMARY KEY (user_id, timestamp);
```

终于OK了。 `ClickHouse` 服务成功启动后，后续就可以把我们关系型数据库中的大量数据迁移至 `ClickHouse` ，体验下这款以**快**著称的联机分析( `OLAP` )的列式数据库管理系统。

Note: 高版本的 `ClickHouse` 有个 `PlayGround` 端点： `http://IP:8123/play` ，可以直接通过 `Web` 的方式与 `OLAP` 数据库进行交互查询；本次用的 `ClickHouse19.9.5.36` 并没有。

## Reference

* [https://www.codenong.com/cs109197835/](https://www.codenong.com/cs109197835/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
