---
layout: post
title: mysqldump备份时导致所有数据表锁定，无法提供服务
tags: MySQL
---

### 背景

> 有接到用户反馈：系统页面卡住不动。。

这个问题发生在生产环境下数据库的每日备份过程中，一个`20+G`的数据库，在定时备份时（关于如何配置线上数据库定时备份，可参考文章：[Ubuntu下对MySQL指定数据库定时备份](https://blog.csdn.net/u013810234/article/details/86599055)）导致数据库卡死，持续时长5分钟左右，在此期间线上服务无响应。。

### 分析

备份一个库：`mysqldump -hhost -uroot -ppassword dbname > /opt/backup.sql`

直接使用上述语句备份数据库，存在的问题是：备份完成之前，会把所有的表锁住，导致无法写入。。

这在生产环境下是不可接受的，而且这才20+G，后续数据库Size会越来越大，备份的时间必然也越长。。

那么，有没有一种方法在完成备份的同时并不锁定表呢？？往下看。

### 解决

在使用`mysqldump`备份时，加一个参数：`--single-transaction`，这样，便可以在备份库的时候并不锁定数据表。

    mysqldump -hhost -uroot -ppassword --single-transaction dbname > /opt/backup.sql

原理说明：

    Some internals on how this actually works - before the utility starts fetching data from the server, it sends it a START TRANSACTION command. This command serves few goals in this case. The first one, is to have a consistent backup created, from a specific point in time, regardless of changes that occur after the backup started. The second goal is to prevent those locks from happening, as we are performing our actions as part of a database transaction.

Notes: `--single-transaction`仅对支持事务的表有效，比如`InnoDB`，对非事务型的表比如`MyISAM`则没有效果。

另外需要注意的是，当使用`--single-transaction`这个参数备份大型数据库时，可考虑和`--quick`参数结合使用。`--quick`可以让`mysqldump`在备份的过程中每次只取一行数据，而不是把所有行都缓存到内存里，这主要考虑了服务器内存限制，以防备份失败。

    mysqldump -hhost -uroot -ppassword --single-transaction --quick dbname > /opt/backup.sql

这样，在备份时并不会对数据表加锁，线上业务完全不受影响，经测试，备份耗时基本不变。

Reference: [How to backup MySQL database using Mysqldump without locking?](https://www.eversql.com/how-to-backup-mysql-database-using-mysqldump-without-locking/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***