---
layout: post
title: 一个不规范操作导致MySQL主从同步中断（GTID模式）
tags: Database
---

### Background

在主库上删除了一个数据库用户后，从库不同步了。。

`mysql> SHOW SLAVE STATUS\G`查看从库状态，可以看到SQL线程已停止，同时报错：

	Last_SQL_Errno: 1396
	Last_SQL_Error: Error 'Operation DROP USER failed for 'prod'@'%'' on query. Default database: ''. Query: 'drop user prod@'%''

![2020-10-23-SyncError.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-23-SyncError.png)

莫名其妙，进行主从同步的数据库根本没有包含数据库用户相关的数据库、表，主库删除用户怎么会导致从库同步报错呢？？

### Solution

现在，主从数据不一致了，考虑从库的查询会影响到线上业务，来不及分析，先跳过这个错误再说。

1. 跳过一类错误

这种方式，简单粗暴，可以解决问题。

```bash
# 修改MySQL从库的配置文件
vi /etc/my.cnf 

# 配置跳过当前的错误类型
slave_skip_errors=1396

# 重启从库服务
service mysqld restart
```

2. 跳过一条或N条报错信息

- 若使用的传统的指定`MASTER_LOG_POS`的同步方式，可在从库执行以下命令，跳过一条错误即可

```sql
STOP SLAVE;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER=1;
START SLAVE;
SHOW SLAVE STATUS\G
```

若使用的是GTID的同步方式，则上述命令会报错：

	mysql> STOP SLAVE;
	Query OK, 0 rows affected (0.00 sec)

	mysql> SET GLOBAL SQL_SLAVE_SKIP_COUNTER=1;
	ERROR 1858 (HY000): sql_slave_skip_counter can not be set when the server is running with @@GLOBAL.GTID_MODE = ON. Instead, for each transaction that you want to skip, generate an empty transaction with the same GTID as the transaction

这时候，即在GTID同步方式时，如果从库同步错误，如何跳过这个错误呢？

先查看`SHOW GLOBAL VARIABLES LIKE '%GTID%';`

![2020-10-23-GTID.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-23-GTID.png)

可以看到其中`gtid_executed`的值与`SHOW SLAVE STATUS\G`执行结果中的值一致，记录下来这个值。

Note: 这里的`gtid_executed`的值有两个，是由于其他操作导致，此处忽略，我们以后一个为准。

在从库执行以下命令：

```sql
# 重置master, slave
RESET MASTER;
STOP SLAVE;
RESET SLAVE;

# 重新设置GTID
SET GLOBAL GTID_PURGED='c55f7abd-a6db-11e9-a3cf-fa163eb30d32:1-55176763'; # 这里的值为前面记录的`gtid_executed`的值加1。

# 重新配置执行的master
CHANGE MASTER TO MASTER_HOST='YOURIP',MASTER_PORT=3306,MASTER_USER='YOURNAME',MASTER_PASSWORD='YOURPASSWORD',MASTER_AUTO_POSITION = 1;

# 启动从库同步
START SLAVE;

# 查看同步状态
SHOW SLAVE STATUS\G
```

![2020-10-23-SyncSuccess.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-10-23-SyncSuccess.png)

### Analysis

仔细回想一下删除用户前后的操作流程：
- 一开始，一直在`sync-db`的`employee`表（即使用了`USE employee`）中做一些查询操作；
- 然后，执行了`DROP USER prod@'%'`；
- 接着，就出事了，从库报错，不同步了。。

其实，我们在搭建主从时，配置了`binlog-do_db=sync-db`，那么，为什么对主库`mysql`数据库的操作会在同步的从库`sync-db`中执行呢？
原来，问题就出在我们在执行`DROP USER`时，未使用 `USE mysql;`语句（执行`DROP USER`不需要进入`mysql`系统数据库，也可以执行成功）；
然而，MySQL的机械地认为`DROP USER`操作我们是在`USE employee`之后执行的，所以认为是针对`employee`数据库的操作，便执行了同步，而从库中根本不存在`prod@%`这样的用户，所以便报错，导致主从同步中断。

### Summary

在数据库中操作时，一定要注意当前所在的数据库是哪个，作为一个良好的实践：在SQL语句前加`USE dbname`。

**操作不规范，亲人两行泪……**

### Reference

[https://www.percona.com/blog/2009/05/14/why-mysqls-binlog-do-db-option-is-dangerous/](https://www.percona.com/blog/2009/05/14/why-mysqls-binlog-do-db-option-is-dangerous/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***