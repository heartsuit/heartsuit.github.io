---
layout: post
title: 数据量激增，导致MySQL主从同步延迟
tags: Database
---

### Background

数据量突然增大时（瞬间大批量数据写入主库时），主从同步延迟不断增大。。

数据量增大前后，RabbitMQ中的消息量对比，由起初的30~50/s到稳定后的600~700/s：

![2020-10-25-before.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-25-before.png)

![2020-10-25-after.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-25-after.png)

### Analysis

数据集群中的机器配置：一主三从，配置（CPU、内存、磁盘、网络）完全一致
CPU、内存、磁盘、网络均正常（除了CPU、网络稍微飘起来一点）
基本可以确定，就是单纯的从库同步慢

![2020-10-25-ServerStatus.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-25-ServerStatus.jpg)

### Solution

解决方案：启用从库多线程同步，**以下命令均在从库执行**。

- 查看数据库版本
mysql> SELECT VERSION();
+-----------+
| VERSION() |
+-----------+
| 5.7.28    |
+-----------+
1 row in set (0.00 sec)

- 查看当前是否已使用了多线程

mysql> SHOW VARIABLES LIKE '%slave_parallel%';
+------------------------+----------+
| Variable_name          | Value    |
+------------------------+----------+
| slave_parallel_type    | DATABASE |
| slave_parallel_workers | 0        |
+------------------------+----------+
2 rows in set (0.00 sec)

`slave_parallel_workers`为0，表明当前是单线程同步，那么可以改为多线程提升同步效率。

- 修改为多线程同步：4
mysql> STOP SLAVE SQL_THREAD;SET GLOBAL slave_parallel_type='LOGICAL_CLOCK';SET GLOBAL slave_parallel_workers=4;START SLAVE SQL_THREAD;
Query OK, 0 rows affected (0.01 sec)

- 查看当前是否已使用了多线程

mysql> SHOW VARIABLES LIKE '%slave_parallel%';
+------------------------+---------------+
| Variable_name          | Value         |
+------------------------+---------------+
| slave_parallel_type    | LOGICAL_CLOCK |
| slave_parallel_workers | 4             |
+------------------------+---------------+
2 rows in set (0.01 sec)

- 查看是否有多个同步线程

mysql> SHOW PROCESSLIST;

![2020-10-25-Processlist.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-25-Processlist.png)

### Reference

[https://www.jianshu.com/p/ed19bb0e748a](https://www.jianshu.com/p/ed19bb0e748a)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***