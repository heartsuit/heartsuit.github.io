---
layout: post
title: 3-TDengine竟然无法修改、删除数据？
tags: TDengine
---

### 背景

没错！ `TDengine` 在 `SQL` 层面并没有提供修改与删除操作的语句，即不存在 `UPDATE` , `DELETE` 语句。

* `TDengine`默认配置下数据不可更新！

* `TDengine`默认配置下数据存储10年！

我们前面在体验 `TDengine` 基本功能时，仅涉及到数据库的创建、删除、数据表的创建、删除以及数据表的各类查询功能，那么我们通常说的数据表 `CRUD` （Create, Retrieve, Update, Delete），这里仅涉及到了创建与查询，那么更新和删除呢？我们从两个方面看待这个问题。

1. `TDengine` 是针对物联网时序数据专门设计的，且以时间戳为主键；物联网数据具有一次写入、多次读取；单个数据点的价值很低，用户关注的是一段时间内的趋势的特点。修改或者删除单个数据点意义不大，或者就是居心不良。。

2. 另一方面，就要研究下 `TDengine` 的建库语句了。或者足够细心的话，我们从 `show databases; `语句的结果中也可以看出一些与修改（update）、删除（keep0, keep1, keep(D)）相关的配置项的。也就是说， `TDengine` 是支持修改与删除的，只是需要进行配置。

### 建库语句

    CREATE DATABASE [IF NOT EXISTS] db_name [KEEP keep] [DAYS days] [UPDATE 1];

Notes：

1. KEEP是该数据库的数据保留多长天数，缺省是3650天(10年)，数据库会自动删除超过时限的数据；
2. UPDATE 标志数据库支持更新相同时间戳数据；

### 不可修改？

建库时不指定 `update` 参数，则 `update` 默认为0，表示数据不可修改（相同时间戳的数据直接被丢弃）。

可通过 `update` 参数配置为可修改，但是在修改时，要求时间戳必须一样，其他字段才能修改成功（显然，时间戳无法修改~）。

```bash
taos> drop database if exists open_update;
Query OK, 0 of 0 row(s) in database (0.018665s)

taos> create database open_update update 1;
Query OK, 0 of 0 row(s) in database (0.003878s)

taos> create table if not exists open_update.weather(ts timestamp, temperature float, humidity float) tags(location nchar(64), groupId int);
Query OK, 0 of 0 row(s) in database (0.001556s)

taos> create table if not exists open_update.t1 using open_update.weather tags("taiyuan", 1);
Query OK, 0 of 0 row(s) in database (0.064076s)

taos> create table if not exists open_update.t2 using open_update.weather tags("xian", 1);
Query OK, 0 of 0 row(s) in database (0.003091s)

taos> insert into open_update.t2 (ts, temperature, humidity) values ("2021-07-26 13:55:09.237", 99.9, 999);
Query OK, 1 of 1 row(s) in database (0.004368s)

taos> select * from open_update.t2;
           ts            |     temperature      |       humidity       |
========================================================================
 2021-07-26 13:55:09.237 |             99.90000 |            999.00000 |
Query OK, 1 row(s) in set (0.004518s)

taos> insert into open_update.t2 (ts, temperature, humidity) values ("2021-07-26 13:55:09.237", 1.0, 111);
Query OK, 1 of 1 row(s) in database (0.001265s)

taos> select * from open_update.t2;
           ts            |     temperature      |       humidity       |
========================================================================
 2021-07-26 13:55:09.237 |              1.00000 |            111.00000 |
Query OK, 1 row(s) in set (0.004360s)
```

这时，可通过 `show databases; ` 查看对应 `open_update` 数据库的 `update` 配置为1，表示数据可按照时间戳覆写。

![2021-07-28-OpenUpdate.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-28-OpenUpdate.jpg)

* 附SQL：

```sql
drop database if exists open_update;
create database open_update update 1;

create table if not exists open_update.weather(ts timestamp, temperature float, humidity float) tags(location nchar(64), groupId int);

create table if not exists open_update.t1 using open_update.weather tags("taiyuan", 1);
create table if not exists open_update.t2 using open_update.weather tags("xian", 1);

insert into open_update.t2 (ts, temperature, humidity) values ("2021-07-26 13:55:09.237", 99.9, 999);
select * from open_update.t2;

insert into open_update.t2 (ts, temperature, humidity) values ("2021-07-26 13:55:09.237", 1.0, 111);
select * from open_update.t2;
```

### 不可删除？

建库时不指定 `keep` 参数，则 `keep` 默认为3650，表示数据存储10年，即 `TDengine` 具有数据自动清理机制。

Note：
1. keep与days关联使用，两者之间有限制（keep不可小于days），KEEP 参数是指修改数据文件保存的天数，缺省值为 3650，取值范围 [days, 365000]，必须大于或等于 days 参数值，days默认值为10；
2. 可通过配置文件(vi /etc/taos/taos.cfg)及建库选项的keep, days参数进行配置。

```bash
taos> create database auto_delete keep 1 days 1;
Query OK, 0 of 0 row(s) in database (0.001604s)

# 显示的内容后面以...结尾时，表示该内容已被截断
taos> show create database auto_delete;
            Database            |        Create Database         |
==================================================================
 auto_delete                    | CREATE DATABASE auto_delete... |
Query OK, 1 row(s) in set (0.002352s)

# 显示的内容后面以...结尾时，表示该内容已被截断
taos> show create table auto_delete.weather;
             Table              |          Create Table          |
==================================================================
 weather                        | create table weather (ts TI... |
Query OK, 1 row(s) in set (0.001046s)

# 通过此命令修改显示字符宽度以显示完整的内容。注意：这个设置命令是临时的，当重启taosd服务后，该配置失效。
taos> SET MAX_BINARY_DISPLAY_WIDTH 125;

taos> show create database auto_delete;
             Database             |                        Create Database                         |
====================================================================================================
 auto_delete                      | CREATE DATABASE auto_delete REPLICA 1 QUORUM 1 DAYS 1 BLOCKS 6 |
Query OK, 1 row(s) in set (0.001756s)

taos> show create table auto_delete.weather;
        	Table              |                                                Create Table                                                |
=============================================================================================================================================
 weather                       | create table weather (ts TIMESTAMP,temperature FLOAT,humidity FLOAT) TAGS (location NCHAR(64),groupid INT) |
Query OK, 1 row(s) in set (0.000232s)
```

![2021-07-28-AutoDelete.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-28-AutoDelete.png)

* 附SQL：

```sql
create database auto_delete keep 1 days 1;

create table if not exists auto_delete.weather(ts timestamp, temperature float, humidity float) tags(location nchar(64), groupId int);

create table if not exists auto_delete.t1 using auto_delete.weather tags("taiyuan", 1);
create table if not exists auto_delete.t2 using auto_delete.weather tags("yuncheng", 1);
create table if not exists auto_delete.t3 using auto_delete.weather tags("xian", 2);
create table if not exists auto_delete.t4 using auto_delete.weather tags("xianyang", 2);

insert into auto_delete.t1 (ts, temperature, humidity) values (now, 23.0, 50.1);
insert into auto_delete.t2 (ts, temperature, humidity) values (now, 23.0, 50.1);
insert into auto_delete.t3 (ts, temperature, humidity) values (now, 23.0, 50.1);
insert into auto_delete.t4 (ts, temperature, humidity) values (now, 23.0, 50.1);
```

Notes：
1. 我遇到了数据到了时间却未被清除的问题，不过晚上关闭了虚拟机，第二天数据确实被清除了。具体原理参考官网：[https://blog.csdn.net/taos_data/article/details/117999718?spm=1001.2014.3001.5501](https://blog.csdn.net/taos_data/article/details/117999718?spm=1001.2014.3001.5501)

2. 测试配置可更新时，刚开始的库名为：`can_update`，建好库后，执行`show create database can_update`报错，后来换了数据库名为`open_update`才正常执行，难道`can_update`是关键词，在官方文档里并没有找见，这可能是个bug...

![2021-07-28-CanUpdate.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-28-CanUpdate.jpg)

```sql
drop database if exists can_update;
create database can_update update 1;
show create database can_update;
```

### Reference

* [https://www.taosdata.com/cn/documentation/taos-sql#management](https://www.taosdata.com/cn/documentation/taos-sql#management)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
