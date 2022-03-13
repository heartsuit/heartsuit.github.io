---
layout: post
title: OpenTSDB2.4.1在CentOS7上的安装
tags: OpenTSDB, 运维
---

## 背景

`OpenTSDB` 是一种采用 `Java` 实现，底层基于 `HBase` 列式存储与查询的分布式、可伸缩、开源的时间序列数据库。

* 官网：[http://opentsdb.net/](http://opentsdb.net/)

* 官方文档：[http://opentsdb.net/docs/build/html/user_guide/quickstart.html](http://opentsdb.net/docs/build/html/user_guide/quickstart.html)

* `GitHub`上的`Release`下载地址：[https://github.com/OpenTSDB/opentsdb/releases/tag/v2.4.1](https://github.com/OpenTSDB/opentsdb/releases/tag/v2.4.1)

![2022-03-13-OpenTSDBHome.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-OpenTSDBHome.jpg)

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

## 安装前提

因为 `OpenTSDB` 底层基于 `HBase` 列式存储实现，所以需要依赖 `HBase` 。我这里使用已有的大数据环境，这里涉及到的组件有：

* Hadoop3.3.0
* HBase2.3.0
* ZooKeeper

### 先配置启动Hadoop

```bash
[root@hadoop6 ~]# cd /usr/local/hadoop

# 启动Hadoop
[root@hadoop6 hadoop]# ./sbin/start-all.sh

# jps可以看到除了Hadoop的5个服务进程：NameNode、SecondaryNameNode、ResourceManager、NodeManager、DataNode
[root@hadoop6 hadoop]# jps
5696 NameNode
6193 SecondaryNameNode
7208 Jps
6541 ResourceManager
6717 NodeManager
5934 DataNode
```

访问： `http://hadoop6:50070/` ，进入 `Hadoop` 后台管理页面。

![2022-03-13-Hadoop.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-Hadoop.jpg)

### 再配置启动HBase

```bash
[root@hadoop6 ~]# cd /usr/local/hbase
[root@hadoop6 hbase]# vi ./conf/hbase-site.xml

# 启动HBase
[root@hadoop6 hbase]# ./bin/start-hbase.sh

# jps可以看到除了Hadoop的5个服务外多了3个H开头的进程：HRegionServer、HMaster以及HQuorumPeer
[root@hadoop6 hbase]# jps
5696 NameNode
68673 HRegionServer
6193 SecondaryNameNode
68277 HQuorumPeer
68429 HMaster
6541 ResourceManager
6717 NodeManager
68988 Jps
5934 DataNode
```

访问： `http://hadoop6:16010/` ，进入 `HBase` 后台管理页面。

![2022-03-13-HBase.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-HBase.jpg)

### 最后验证ZooKeeper

```bash
# 报错
[root@hadoop6 hbase]# telnet localhost 2181
-bash: telnet: 未找到命令

# 查看是否安装了telnet-server服务
[root@hadoop6 hbase]# rpm -qa telnet-server

# 若没有安装，则先安装telnet-server服务
[root@hadoop6 hbase]# yum install telnet-server

# 再安装telnet
[root@hadoop6 hbase]# yum install telnet

# 再次测试连接ZooKeeper，成功
[root@hadoop6 hbase]# telnet localhost 2181
Trying ::1%1...
Connected to localhost.
Escape character is '^]'.
Connection closed by foreign host.
```

至此，依赖环境搭建完毕~

Note：记得关闭防火墙或者放行对应端口即可。

```bash
# 关闭防火墙
[root@hadoop6 ~]# systemctl stop firewalld.service
```

## 下载安装启动OpenTSDB

```bash
[root@hadoop6 local]# wget https://github.com/OpenTSDB/opentsdb/releases/download/v2.4.1/opentsdb-2.4.1-1-20210902183110-root.noarch.rpm
[root@hadoop6 local]# yum localinstall opentsdb-2.4.1-1-20210902183110-root.noarch.rpm
```

Note：安装完成后的目录说明如下：

```
- /etc/opentsdb - Configuration files，配置文件，你懂的，这是一个关键的地方，eg：ZK配置
- /tmp/opentsdb - Temporary cache files，临时文件
- /usr/share/opentsdb - Application files，应用文件
- /usr/share/opentsdb/bin - The “tsdb” startup script that launches a TSD or command line tools，可执行脚本
- /usr/share/opentsdb/lib - Java JAR library files，依赖库
- /usr/share/opentsdb/plugins - Location for plugin files and dependencies，插件
- /usr/share/opentsdb/static - Static files for the GUI，Web页面静态资源
- /usr/share/opentsdb/tools - Scripts and other tools，工具
- /var/log/opentsdb - Logs，日志
```

### 在HBase中建表

```bash
# 执行建表命令
[root@hadoop6 local]# env COMPRESSION=NONE HBASE_HOME=/usr/local/hbase /usr/share/opentsdb/tools/create_table.sh

[root@hadoop6 local]# hbase shell
SLF4J: Class path contains multiple SLF4J bindings.
SLF4J: Found binding in [jar:file:/usr/local/hadoop/share/hadoop/common/lib/slf4j-log4j12-1.7.25.jar!/org/slf4j/impl/StaticLoggerBinder.class]
SLF4J: Found binding in [jar:file:/usr/local/hbase/lib/client-facing-thirdparty/slf4j-log4j12-1.7.30.jar!/org/slf4j/impl/StaticLoggerBinder.class]
SLF4J: See http://www.slf4j.org/codes.html#multiple_bindings for an explanation.
SLF4J: Actual binding is of type [org.slf4j.impl.Log4jLoggerFactory]
HBase Shell
Use "help" to get list of supported commands.
Use "exit" to quit this interactive shell.
For Reference, please visit: http://hbase.apache.org/2.0/book.html#shell
Version 2.3.0, re0e1382705c59d3fb3ad8f5bff720a9dc7120fb8, Mon Jul  6 22:27:43 UTC 2020
Took 0.0017 seconds

# list命令验证是否建表成功                  
hbase(main):001:0> list
TABLE
tsdb 
tsdb-meta                            
tsdb-tree                            
tsdb-uid
4 row(s)
Took 0.5124 seconds                  
=> ["tsdb", "tsdb-meta", "tsdb-tree", "tsdb-uid"]
hbase(main):002:0> 
```

当然，也可以在 `HBase` 后台管理页面看到刚建的4张表。

![2022-03-13-HBaseTable.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-HBaseTable.jpg)

### 启动OpenTSDB服务

万事俱备，让我们启动 `OpenTSDB` 服务吧。

```bash
# 显然，opentsdb未安装到系统服务，可参考https://github.com/OpenTSDB/opentsdb/blob/master/build-aux/rpm/systemd/opentsdb.service进行配置
[root@hadoop6 ~]# systemctl start opentsdb
Failed to start opentsdb.service: Unit not found.

# 直接到安装的目录启动opentsdb服务
[root@hadoop6 ~]# /usr/share/opentsdb/etc/init.d/opentsdb start
Starting opentsdb:                                         [  确定  ]

# opentsdb毕竟是Java服务，jps可以看到多了：Main、TSDMain两个进程
[root@hadoop6 opentsdb]# jps
37584 Main
27761 HRegionServer
27525 HMaster
25174 DataNode
85207 TSDMain
25479 SecondaryNameNode
26153 NodeManager
27369 HQuorumPeer
24942 NameNode
25902 ResourceManager
11246 Jps
```

### 验证OpenTSDB服务状态

```bash
[root@hadoop6 opentsdb]# /usr/share/opentsdb/etc/init.d/opentsdb status
opentsdb 已死，但 pid 文件存在
[root@hadoop6 opentsdb]# tailf /var/log/opentsdb/opentsdb-hadoop6-opentsdb.err 
/usr/bin/tsdb: 第 117 行:exec: java: 未找到
[root@hadoop6 opentsdb]# java -version
java version "1.8.0_261"
Java(TM) SE Runtime Environment (build 1.8.0_261-b12)
Java HotSpot(TM) 64-Bit Server VM (build 25.261-b12, mixed mode)
[root@hadoop6 opentsdb]# echo $JAVA_HOME
/usr/local/jdk
[root@hadoop6 opentsdb]# ln -s /usr/local/jdk/bin/java /usr/bin/java
[root@hadoop6 opentsdb]# /usr/share/opentsdb/etc/init.d/opentsdb start
Starting opentsdb:                                         [  确定  ]
[root@hadoop6 opentsdb]# /usr/share/opentsdb/etc/init.d/opentsdb status
opentsdb (pid  85207) 正在运行...
```

打完收工~~

访问： `http://hadoop6:4242/` ，默认进入到图表页面。

![2022-03-13-OpenTSDB1jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-OpenTSDB1jpg)

另外，还可以查看关键指标统计、运行日志与版本信息。

![2022-03-13-OpenTSDB2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-13-OpenTSDB2.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
