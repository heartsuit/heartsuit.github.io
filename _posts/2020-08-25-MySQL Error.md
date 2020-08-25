---
layout: post
title: 问题排查：线上MySQL启动报错：Job for mysqld.service failed because the control process exited with error code.
tags: Server, MySQL
---

### 背景
操作系统：CentOS 7

突然，用户反映线上页面刷不出数据了，排查了`ElasticSearch`以及对应的后端服务之后，可能的原因只有数据库了。。

首先看了下数据库状态：

![2020-08-25-MySQLStart.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-25-MySQLStart.png)

数据库挂了！！正常情况下`service mysqld status`返回应该是：

![2020-08-25-MySQLRunning.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-25-MySQLRunning.png)

接着尝试重启MySQL，`service mysqld start`，数据库服务启动报错：

> Job for mysqld.service failed because the control process exited with error code. See "systemctl status mysqld.service" and "journalctl -xe" for details.

word天，数据库服务起不来了。。

### 解决思路

显然，报错提示查看MySQL的日志，进行问题排查，但是仔细一想，近期并未做过线上环境、DB、配置的更新，也就是说服务本身正常运行，是突然不能正常工作了。。可能的原因：

- 服务所处的环境发生了变化，eg：资源不足：CPU算力、内存、磁盘空间不足；
- 服务器遭受攻击了，这种可能性比较小。

另外，由于当前机器上除了数据库服务之外还有其他的业务服务，所以先排查CPU、内存以及磁盘空间。


1. 查看进程：`top -c`；
2. 查看磁盘：`df -h`；

### 问题排查

1. 查看进程：`top -c`；

一切正常：CPU、内存均处于正常状态；

2. 查看磁盘：`df -h`；

![2020-08-25-MySQLDisk.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-25-MySQLDisk.png)

问题暴露了：dev/vda1的磁盘空间100%了。。

### 问题解决

- 先要排查是哪些文件堆满了磁盘，极大的可能是由于日志文件持续累积导致的，查看软件目录的大小信息`du -sh *`；

- 经过逐步排查，发现是nginx的日志文件，尤其是`access.log`，达到了2.4G。。这个文件是nginx自带的访问记录日志，先直接清空该文件，释放空间，保证线上服务正常：`cp /dev/null access.log`

- 再次查看磁盘空间使用情况：`df -h`，发现恢复了部分可用空间

![2020-08-25-MySQLNewDisk.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-25-MySQLNewDisk.png)

- 启动MySQL服务，`service mysqld start`：

Done~

### 事故总结

- 几条常用的Linux命令，帮助解决了问题：

``` bash
service mysqld status
service mysqld start
top -c # 查看进程情况：CPU、内存、pid等
df -h # 查看磁盘空间信息，-h表示以KB, MB, GB, TB格式进行人性化显示
du -sh * | sort -hr # 查看文件夹、文件大小，-s表示汇总，-h表示以KB, MB, GB, TB格式进行人性化显示，-r 逆序
cp /dev/null access.log # 不删除，清空文件
```

- 事后查看了MySQL的日志，确认了是磁盘空间不足导致无法写入的问题；

![2020-08-25-MySQLLog.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-08-25-MySQLLog.png)

- 数据库服务使用单独的服务器进行独立部署，或者至少应将数据库的数据存储至数据盘而不是直接放到系统盘；

- 这次出事故幸亏是白天，能够及时解决，然而暴露出的问题是当前缺乏一套有效的监控系统，无法对服务器的负载情况（CPU、内存、磁盘、IO等）进行实时的监测，并及时预警。。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***