---
layout: post
title: /usr/bin/tsdb：第 117 行：exec：java：未找到
tags: OpenTSDB, DataBase
---

## 背景

安装完成后，第一次启动 `OpenTSDB` ，访问 `OpenTSDB` 的 `Web` 控制台： `http://hadoop6:4242/` ，发现页面打不开。查看 `OpenTSDB` 状态。

```bash
[root@hadoop6 opentsdb]# /usr/share/opentsdb/etc/init.d/opentsdb status
opentsdb 已死，但 pid 文件存在
[root@hadoop6 opentsdb]# tailf /var/log/opentsdb/opentsdb-hadoop6-opentsdb.err 
/usr/bin/tsdb: 第 117 行:exec: java: 未找到
```

## 系统环境

在 `CentOS7` 上进行安装，虚拟主机信息如下：

```bash
[root@hadoop6 local]# uname -a
Linux hadoop6 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
[root@hadoop6 local]# cat /proc/version
Linux version 3.10.0-1127.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 31 23:36:51 UTC 2020
[root@hadoop6 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)
```

## 分析问题

`OpenTSDB` 默认从 `/usr/bin/java` 路径找 `JDK` ，而我们的环境变量 `$JAVA_HOME/bin/java` 路径是自己配置的，导致找不到 `Java` 。

## 解决方法

简单点，建立指向我们配置的 `Java` 路径的软连接，再重新启动 `OpenTSDB` 即可。

```bash
[root@hadoop6 opentsdb]# java -version
java version "1.8.0_261"
Java(TM) SE Runtime Environment (build 1.8.0_261-b12)
Java HotSpot(TM) 64-Bit Server VM (build 25.261-b12, mixed mode)

# 查看环境变量JAVA_HOME
[root@hadoop6 opentsdb]# echo $JAVA_HOME
/usr/local/jdk

# 建立软链接
[root@hadoop6 opentsdb]# ln -s /usr/local/jdk/bin/java /usr/bin/java

# 再次启动服务
[root@hadoop6 opentsdb]# /usr/share/opentsdb/etc/init.d/opentsdb start
Starting opentsdb:                                         [  确定  ]

# 查看状态
[root@hadoop6 opentsdb]# /usr/share/opentsdb/etc/init.d/opentsdb status
opentsdb (pid  85207) 正在运行...
```

访问： `http://hadoop6:4242/` ，默认进入到图表页面。

![2022-03-13-OpenTSDB1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-OpenTSDB1.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
