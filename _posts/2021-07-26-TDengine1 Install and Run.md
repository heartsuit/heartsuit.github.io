---
layout: post
title: 1-TDengine安装与初体验
tags: TDengine
---

### 背景

我们的项目涉及物联网相关业务，由于一开始的年少无知，传感器数据采用了 `MySQL` 进行存储，经过两年的数据累积，目前几个核心表单表数据已过亿，虽然通过索引优化、SQL优化以及读写分离等措施，勉强满足基本的查询，能在秒级给出数据；但是数据量还在持续增加，当面对用户多维度的统计需求，在实现上、效率上总是那么不尽如人意。。

仰天长叹，难道只能走分库分表或者迁移历史数据、区分冷热温数据这两条不归路了吗？

一次偶然的机会，了解到诸如 `InfluxDB` , `TDengine` 这类时序数据库，它们的差别这里不做对比，仅简单体验下 `TDengine` 。

![2021-07-26-Official.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-26-Official.jpg)

在使用一项新技术前，一定要清楚我们为什么需要这项技术，它到底能为我们解决哪些痛点。强烈建议先到官网看下白皮书与这四篇文章：

* 白皮书

[https://www.taosdata.com/downloads/TDengine_White_Paper_20.pdf](https://www.taosdata.com/downloads/TDengine_White_Paper_20.pdf)

* 海量物联网时序大数据
1. [https://www.taosdata.com/blog/2019/07/09/105.html](https://www.taosdata.com/blog/2019/07/09/105.html)
2. [https://www.taosdata.com/blog/2019/07/29/542.html](https://www.taosdata.com/blog/2019/07/29/542.html)
3. [https://www.taosdata.com/blog/2019/07/09/107.html](https://www.taosdata.com/blog/2019/07/09/107.html)
4. [https://www.taosdata.com/blog/2019/07/09/109.html](https://www.taosdata.com/blog/2019/07/09/109.html)

> `TDengine` 专为物联网、车联网等时序空间大数据设计，其核心功能是时序数据库。但为减少大数据平台的研发和运维的复杂度，更进一步降低计算资源， `TDengine` 还提供大数据处理所需要的消息队列、消息订阅、缓存、流式计算等功能。

实践出真知，写的这些算不上是教程，只是记录下对这款优秀的国产开源时序数据库的体验过程。

### 系统环境

* 服务器

其实没有服务器，也没有云主机，就是在本地安装的一个虚拟机。。

```
内存：4G
处理器：2*2
硬盘：100G
```

```bash
[root@hadoop1 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)

[root@hadoop1 local]# uname -a
Linux hadoop1 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux

[root@hadoop1 local]# taos -V
version: 2.1.2.0
```

* 开发环境

一台公司配的 `ThinkPad T580` ，才8G内存。。你说，这点内存能干啥？

```
设备名称	HEARTSUIT
处理器	Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz 1.80 GHz
机带 RAM	8.00 GB (7.83 GB 可用)
系统类型	64 位操作系统, 基于 x64 的处理器
笔和触控	没有可用于此显示器的笔或触控输入

版本	Windows 10 家庭中文版
版本号	20H2
安装日期	‎2021/‎7/‎9
操作系统内部版本	19042.1110
体验	Windows Feature Experience Pack 120.2212.3530.0
```

### 下载

[https://www.taosdata.com/cn/getting-started/](https://www.taosdata.com/cn/getting-started/)

下载完成后，上传至服务器，我习惯将这些包放到 `/usr/local` 目录。

### 安装

```bash
# 安装
[root@hadoop1 local]# rpm -ivh TDengine-server-2.1.2.0-Linux-x64.rpm
准备中...                          ################################# [100%]
正在升级/安装...
   1:tdengine-2.1.2.0-3               ################################# [100%]
Start to install TDengine...
Created symlink from /etc/systemd/system/multi-user.target.wants/taosd.service to /etc/systemd/system/taosd.service.

System hostname is: hadoop1

Enter FQDN:port (like h1.taosdata.com:6030) of an existing TDengine cluster node to join OR leave it blank to build one:

Enter your email address for priority support or enter empty to skip: 

To configure TDengine : edit /etc/taos/taos.cfg
To start TDengine     : sudo systemctl start taosd
To access TDengine    : taos -h hadoop1 to login into TDengine server

TDengine is installed successfully!

# 查看状态
[root@hadoop1 local]# systemctl status taosd
● taosd.service - TDengine server service
   Loaded: loaded (/etc/systemd/system/taosd.service; enabled; vendor preset: disabled)
   Active: inactive (dead)
```

### 运行

```bash
# 启动
[root@hadoop1 local]# systemctl start taosd

# 再次查看状态
[root@hadoop1 local]# systemctl status taosd
● taosd.service - TDengine server service
   Loaded: loaded (/etc/systemd/system/taosd.service; enabled; vendor preset: disabled)
   Active: active (running) since 二 2021-06-15 12:59:24 CST; 1s ago
  Process: 5354 ExecStartPre=/usr/local/taos/bin/startPre.sh (code=exited, status=0/SUCCESS)
 Main PID: 5360 (taosd)
   CGroup: /system.slice/taosd.service
           └─5360 /usr/bin/taosd

6月 15 12:59:24 hadoop1 systemd[1]: Starting TDengine server service...
6月 15 12:59:24 hadoop1 systemd[1]: Started TDengine server service.
6月 15 12:59:24 hadoop1 TDengine:[5360]: Starting TDengine service...
6月 15 12:59:24 hadoop1 TDengine:[5360]: Started TDengine service successfully.
```

Note： `TDengine` 使用 `FQDN` 来访问，所以要配置下 `hostname` ，命令： `vi /etc/hosts` ， 我这里的配置是：

      192.168.169.129 hadoop1

### 入门体验

`Linux` 版的 `TDengine` 在安装完后就自带了客户端，在本机命令行键入： `taos` ，进入交互式界面。

```bash
[root@hadoop1 local]# taos 

Welcome to the TDengine shell from Linux, Client Version:2.1.2.0
Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.

taos> show databases;
              name              |      created_time       |   ntables   |   vgroups   | replica | quorum |  days  |   keep0,keep1,keep(D)    |  cache(MB)  |   blocks    |   minrows   |   maxrows   | wallevel |    fsync    | comp | cachelast | precision | update |   status   |
====================================================================================================================================================================================================================================================================================
 log                            | 2021-06-15 13:09:38.773 |           4 |           1 |       1 |      1 |     10 | 30,30,30                 |           1 |           3 |         100 |        4096 |        1 |        3000 |    2 |         0 | us        |      0 | ready      |
Query OK, 1 row(s) in set (0.001817s)

taos> create database db;
Query OK, 0 of 0 row(s) in database (0.002028s)

taos> use db;
Database changed.

taos> create table t (ts timestamp, speed int);
Query OK, 0 of 0 row(s) in database (0.180100s)

taos> show tables;
           table_name           |      created_time       | columns |          stable_name           |          uid          |     tid     |    vgId     |
==========================================================================================================================================================
 t                              | 2021-07-20 16:28:09.184 |       2 |                                |     37436171923321672 |           1 |         133 |
Query OK, 1 row(s) in set (0.004538s)

taos> describe t;
             Field              |         Type         |   Length    |   Note   |
=================================================================================
 ts                             | TIMESTAMP            |           8 |          |
 speed                          | INT                  |           4 |          |
Query OK, 2 row(s) in set (0.000167s)

taos> insert into t values ('2019-07-15 00:00:00', 10);
Query OK, 1 of 1 row(s) in database (0.002749s)

taos> insert into t values (now, 100);
Query OK, 1 of 1 row(s) in database (0.000982s)

taos> select count(*) from t;
       count(*)        |
========================
                     2 |
Query OK, 1 row(s) in set (0.000957s)

taos> select * from t;
           ts            |    speed    |
========================================
 2019-07-15 00:00:00.000 |          10 |
 2021-07-20 16:28:21.813 |         100 |
Query OK, 2 row(s) in set (0.002184s)

taos> select * from db.t;
           ts            |    speed    |
========================================
 2019-07-15 00:00:00.000 |          10 |
 2021-07-20 16:28:21.813 |         100 |
Query OK, 2 row(s) in set (0.003076s)

taos> select * from t limit 1;
           ts            |    speed    |
========================================
 2019-07-15 00:00:00.000 |          10 |
Query OK, 1 row(s) in set (0.001250s)

taos> select * from t order by ts desc;
           ts            |    speed    |
========================================
 2021-07-20 16:28:21.813 |         100 |
 2019-07-15 00:00:00.000 |          10 |
Query OK, 2 row(s) in set (0.002486s)

taos> drop table t;
Query OK, 0 of 0 row(s) in database (0.115054s)

taos> show tables;
Query OK, 0 row(s) in set (0.002069s)

taos> drop database db;
Query OK, 0 of 0 row(s) in database (0.010900s)

taos> exit
[root@hadoop1 local]# 
```

Note：

1. 若通过其他主机的客户端访问`TDengine`，则需要指定主机名：`taos -h ip/hostname`
2. 我们注意到在通过`taos`连接时，并没有指定用户名与密码，这个简直了。。其实，`TDengine`在用户未指定认证信息时，默认为root, taosdata

参考官方文档，常用的几个命令行参数：

    -c, --config-dir: 指定配置文件目录，默认为/etc/taos
    -h, --host: 指定服务的FQDN，默认为本地服务
    -s, --commands: 在不进入终端的情况下运行TDengine命令
    -u, --user: 连接TDengine服务器的用户名，缺省为root
    -p, --password: 连接TDengine服务器的密码，缺省为taosdata
    -?, --help: 打印出所有命令行参数

经过此番体验，乍看起来， `TDengine` 与我们用过的关系型数据库 `MySQL` 没啥区别呀，且慢，这只是用类SQL语句操作了下 `TDengine` ，下面我们继续看下与传统SQL不太一样的地方，同时体验下 `TDengine` 的写入、查询效率。

### 进阶体验

`TDengine` 自带了一个 `taosdemo` 的程序，该命令将在数据库 `test` 下面自动创建一张超级表 `meters` ，该超级表下有1万张表，表名为"t0"到"t9999"，每张表有1万条记录，每条记录有 (ts, col0, col1, col2, col3) 五个字段，时间戳从 "2017-07-14 10:40:00 000" 到 "2017-07-14 10:40:09 999"，每张表带有标签t0和t1，t0被设置为0到9999，t1被设置为"beijing"或者"shanghai"，即最后共插入1亿条记录。

* 建表、写数据

```bash
# Linux命令行直接执行taosdmeo
[root@hadoop1 local]# taosdemo
```

输出内容如下（同时会将该内容写入文件： `/root/output.txt` ）：

```
host:                       127.0.0.1:6030
user:                       root
configDir:                  
resultFile:                 ./output.txt
thread num of insert data:  10
thread num of create table: 10
number of records per req:  30000
max sql length:             1048576
database count:          1
database[0]:
  database[0] name:       test
  drop:                  yes
  replica:               1
  precision:             ms
  super table count:     1
  super table[0]:
      stbName:           meters
      autoCreateTable:   no
      childTblExists:    no
      childTblCount:     10000
      childTblPrefix:    t
      dataSource:        rand
      iface:             taosc
      insertRows:        10000
      interlace rows:    0
      interlaceRows:     0
      disorderRange:     1000
      disorderRatio:     0
      maxSqlLen:         1048576
      timeStampStep:     1
      startTimestamp:    2017-07-14 10:40:00.000
      sampleFormat:      
      sampleFile:        
      tagsFile:          
      columnCount:       4
        column[0]:INT column[1]:INT column[2]:INT column[3]:INT 
      tagCount:            2
        tag[0]:INT tag[1]:BINARY(16) 

Spent 3.2100 seconds to create 10000 tables with 10 thread(s)

Spent 59.48 seconds to insert rows: 100000000, affected rows: 100000000 with 10 thread(s) into test.meters. 1681350.46 records/second

insert delay, avg:     47.24ms, max: 244ms, min: 7ms
```

可以看到创建了一个数据库 `test` ，一张超级表 `meters` ，10000张测点（表），每张表里写入10000条数据。

开启了10个线程，建库+建表+插入数据总耗时约60s，总记录100000000条，每秒写入数据记录1681350.46条。

从写入效果看，让人既震撼又兴奋~

* 验证

```bash
taos> use test;
Database changed.

taos> describe meters;
             Field              |         Type         |   Length    |   Note   |
=================================================================================
 ts                             | TIMESTAMP            |           8 |          |
 col0                           | INT                  |           4 |          |
 col1                           | INT                  |           4 |          |
 col2                           | INT                  |           4 |          |
 col3                           | INT                  |           4 |          |
 t0                             | INT                  |           4 | TAG      |
 t1                             | BINARY               |          16 | TAG      |
Query OK, 7 row(s) in set (0.000135s)

taos> show tables;
           table_name           |      created_time       | columns |          stable_name           |          uid          |     tid     |    vgId     |
==========================================================================================================================================================
 t5114                          | 2021-06-15 14:32:05.078 |       5 | meters                         |      1407376679002899 |         107 |           5 |
 t6915                          | 2021-06-15 14:32:07.348 |       5 | meters                         |      1125944788123835 |        2675 |           4 |
 t5999                          | 2021-06-15 14:32:06.711 |       5 | meters                         |      1407403557282797 |        1709 |           5 |
 t1474                          | 2021-06-15 14:32:06.830 |       5 | meters                         |      1688873836557746 |        1429 |           6 |
...
Query OK, 10000 row(s) in set (1.042923s)

taos> select count(tbname) from meters;
     count(tbname)     |
========================
                 10000 |
Query OK, 1 row(s) in set (0.006129s)

taos> select count(*) from meters;
       count(*)        |
========================
             100000000 |
Query OK, 1 row(s) in set (0.210428s)

taos> select count(*) from t0;
       count(*)        |
========================
                 10000 |
Query OK, 1 row(s) in set (0.002336s)

taos> select count(*) from test.t9999;
       count(*)        |
========================
                 10000 |
Query OK, 1 row(s) in set (0.002720s)

taos> select distinct t1 from meters;
        t1        |
===================
 beijing          |
 shanghai         |
Query OK, 2 row(s) in set (0.109290s)

taos> select count(t0) from meters;
       count(t0)       |
========================
                 10000 |
Query OK, 1 row(s) in set (0.009314s)

taos> select *, t0, t1 from t9999 limit 10;
           ts            |    col0     |    col1     |    col2     |    col3     |     t0      |        t1        |
===================================================================================================================
 2017-07-14 10:40:00.000 |        3413 |        2118 |       19236 |       34372 |        9999 | beijing          |
 2017-07-14 10:40:00.001 |       39459 |       58510 |        1896 |         137 |        9999 | beijing          |
 2017-07-14 10:40:00.002 |       46560 |       16696 |       57671 |       52867 |        9999 | beijing          |
 2017-07-14 10:40:00.003 |       24451 |       41162 |       19182 |       17327 |        9999 | beijing          |
 2017-07-14 10:40:00.004 |        2421 |       10378 |       18471 |       24160 |        9999 | beijing          |
 2017-07-14 10:40:00.005 |       11240 |       39221 |       16868 |       53291 |        9999 | beijing          |
 2017-07-14 10:40:00.006 |       49797 |       61202 |       47328 |       17810 |        9999 | beijing          |
 2017-07-14 10:40:00.007 |       41747 |       61545 |       10914 |       21212 |        9999 | beijing          |
 2017-07-14 10:40:00.008 |       53202 |       18229 |       57033 |        7533 |        9999 | beijing          |
 2017-07-14 10:40:00.009 |       55927 |       64343 |       46090 |       30498 |        9999 | beijing          |
Query OK, 10 row(s) in set (0.003072s)
```

* 查询

```bash
# 查询1亿条记录的平均值、最大值、最小值等，第一次查询比较耗时
taos> select max(col0), avg(col1), max(col2), min(col3) from test.meters;

  max(col0)  |         avg(col1)         |  max(col2)  |  min(col3)  |
======================================================================
       65534 |           32746.001712370 |       65534 |           0 |
Query OK, 1 row(s) in set (16.479990s)

# 查询1亿条记录的平均值、最大值、最小值等，第二次查询，非常快
taos> select max(col0), avg(col1), max(col2), min(col3) from test.meters;
  max(col0)  |         avg(col1)         |  max(col2)  |  min(col3)  |
======================================================================
       65534 |           32746.001712370 |       65534 |           0 |
Query OK, 1 row(s) in set (0.063418s)

# 查询t1="beijing"的记录总条数
taos> select count(*) from test.meters where t1="beijing";
       count(*)        |
========================
              50000000 |
Query OK, 1 row(s) in set (0.016695s)

# 查询t1="shanghai"的记录总条数
taos> select count(*) from test.meters where t1="shanghai";
       count(*)        |
========================
              50000000 |
Query OK, 1 row(s) in set (0.017321s)

# 查询t1="shanghai"、"beijing"的记录总条数
taos> select count(*) from test.meters where t1="beijing" or t1="shanghai";
       count(*)        |
========================
             100000000 |

# 查询t0=100的记录总条数
taos> select count(*) from test.meters where t0=100;
       count(*)        |
========================
                 10000 |
Query OK, 1 row(s) in set (0.002740s)

# 查询1亿条记录的前10条
taos> select * from test.meters limit 10;
           ts            |    col0     |    col1     |    col2     |    col3     |     t0      |        t1        |
===================================================================================================================
 2017-07-14 10:40:00.000 |       20738 |       17079 |       28835 |       20955 |           0 | shanghai         |
 2017-07-14 10:40:00.001 |        9521 |        9092 |       16912 |       18897 |           0 | shanghai         |
 2017-07-14 10:40:00.002 |       63838 |       42129 |       52379 |       50840 |           0 | shanghai         |
 2017-07-14 10:40:00.003 |       36661 |       52292 |        5025 |       15506 |           0 | shanghai         |
 2017-07-14 10:40:00.004 |         988 |       47682 |       56909 |       12187 |           0 | shanghai         |
 2017-07-14 10:40:00.005 |       44303 |       50954 |       56846 |       11266 |           0 | shanghai         |
 2017-07-14 10:40:00.006 |       32445 |       39137 |       16212 |       40621 |           0 | shanghai         |
 2017-07-14 10:40:00.007 |       54210 |       50140 |       54717 |       56829 |           0 | shanghai         |
 2017-07-14 10:40:00.008 |       53177 |       40921 |       15058 |       10413 |           0 | shanghai         |
 2017-07-14 10:40:00.009 |       39718 |       14091 |       47696 |       51869 |           0 | shanghai         |
Query OK, 10 row(s) in set (0.033425s)

# 利用缓存机制，查询t1='beijing'的最新一条数据值
taos> select last_row(col3) from meters where t1='beijing';
 last_row(col3) |
=================
          30630 |
Query OK, 1 row(s) in set (0.037200s)

# 聚合查询：查询col3平均值，按照t1分组
taos> select avg(col3) from meters group by t1;
         avg(col3)         |        t1        |
===============================================
           32744.678155980 | beijing          |
           32752.362831000 | shanghai         |
Query OK, 2 row(s) in set (0.049459s)

# 降采样：对表t1110按10s进行平均值、最大值和最小值聚合统计
taos> select avg(col1), max(col2), min(col3) from test.t1110 interval(10s);
           ts            |         avg(col1)         |  max(col2)  |  min(col3)  |
==================================================================================
 2017-07-14 10:40:00.000 |           32770.574900000 |       65527 |           3 |
Query OK, 1 row(s) in set (0.002239s)

# 查询t1="shanghai"且指定时间范围内记录总数
taos> select count(*) from test.meters where t1="shanghai" and ts > '2017-07-14 10:40:00 000' and ts < '2017-07-14 10:40:01 000';
       count(*)        |
========================
               4995000 |
Query OK, 1 row(s) in set (0.562990s)

# 降采样：查询t1="shanghai"且在指定时间范围内col1的平均值，1s一个点
taos> select avg(col1) from test.meters where t1="shanghai" and ts > '2017-07-14 10:40:00 000' and ts < '2017-07-14 10:40:05 000' interval(1s);
           ts            |         avg(col1)         |
======================================================
 2017-07-14 10:40:00.000 |           32755.165719520 |
 2017-07-14 10:40:01.000 |           32737.603441200 |
 2017-07-14 10:40:02.000 |           32739.861599200 |
 2017-07-14 10:40:03.000 |           32747.347343800 |
 2017-07-14 10:40:04.000 |           32747.446260600 |
Query OK, 5 row(s) in set (0.382299s)

# 降采样、插值：查询t1="shanghai"且在指定时间范围内col1的值，1s一个点；实际需求：假设要获取每分钟内该设备上报的最后一次压力值为这一分钟的压力，如果某一分钟内，设备没有上报，则取上一分钟的压力值
taos> select last(col1) from test.meters where t1="shanghai" and ts > '2017-07-14 10:40:00 000' and ts < '2017-07-14 10:40:05 000' interval(1s) fill(value, 0);
           ts            | last(col1)  |
========================================
 2017-07-14 10:40:00.000 |       24615 |
 2017-07-14 10:40:01.000 |       44670 |
 2017-07-14 10:40:02.000 |       38200 |
 2017-07-14 10:40:03.000 |       51491 |
 2017-07-14 10:40:04.000 |       58636 |
Query OK, 5 row(s) in set (0.507627s)
```

从这里的快速体验中，我们可以看到除了首次查询1亿条记录的平均值、最大值、最小值时耗时超过10s外，其他的查询（按标签过滤、联表查询、按时间范围、聚合查询等）均在毫秒级给出结果，查询效果很赞~

### Reference

* [https://www.taosdata.com/cn/getting-started/](https://www.taosdata.com/cn/getting-started/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
