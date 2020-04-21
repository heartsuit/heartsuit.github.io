---
layout: post
title: MySQL主从同步配置
tags: MySQL
---

### 配置主库

打开编辑MySQL配置文件：`vi /etc/my.cnf`，一般`server-id`用服务器ip的最后一部分，eg: 192.168.0.89，取89作为`server-id`。

```conf
server-id=89
log-bin=db89-bin
binlog-do_db=rep_db
```

1. 新建用户，专门用以同步

```sql
grant replication slave on *.* to rep@'从库IP' identified by '123456';
FLUSH PRIVILEGES;
USE mysql;
SELECT user, host FROM user;
```

2. 锁定库（不能写，只能读），如果主库里已经有数据（大概率实际场景都是这样😎），先备份

```sql
flush tables with read lock;
```

- 备份，非必需

    mysqldump -hhost -uroot -ppassword dbname > /opt/rep_db.sql

3. 锁定库后，查看主库状态

**重点关注：File, Position，即快照，这在配置从库时需要使用**

```sql
SHOW MASTER STATUS;
```

4. 备份完成，且记下File, Position后，解锁

```sql
UNLOCK TABLES;
```

5. 导入备份的数据到从库，以实现与主库一致

    source rep_db.sql

### 配置从库

1. 指定id

```conf
server-id=110
```

2. 配置从库对应的主库信息

```sql
CHANGE MASTER TO
MASTER_HOST='IP',
MASTER_USER='rep',
MASTER_PASSWORD='123456',
MASTER_LOG_FILE='db89-bin.000002', #File
MASTER_LOG_POS=6456972; #Position
```

3. 在从库端，查看从库状态

主要看：两个Yes，表明主从库同步成功

```sql
SHOW SLAVE STATUS \G
```

    Slave_IO_Running: Yes
    Slave_SQL_Running: Yes

通过 `START SLAVE;`与`STOP SLAVE;` 可分别启动与关闭从库的同步操作。

### 其他

- 在主库端，查看主库下有哪些从库

```sql
SHOW SLAVE HOSTS;
```

- 数据同步会产生日志，当数据库比较大时，主库端的日志会逐渐累积，很容易导致磁盘爆炸，设置自动清理`binlog`日志，这里配置同步日志保存5天。

```sql
show binary logs;
show variables like '%log%';
set global expire_logs_days = 5;
```

- 当不想同步某些表时，可配置忽略指定表

```conf
replicate-wild-ignore-table=dbname.tablename
```

- 当同步出错时，可配置跳过错误

比如主键冲突错误，可以在从库配置文件中配置跳过`1062`号错误：

> Last_Error: Could not execute Write_rows event on table a.b; Duplicate entry 'aa56233933e548b98bc63449861a0d26' for key 'PRIMARY', Error_code: 1062; handler error HA_ERR_FOUND_DUPP_KEY; the event's master log db89-bin.000007, end_log_pos 822402286

```conf
slave_skip_errors = 1062 # 若忽略多个错误，中间用逗号隔开，忽略所有用all
```

还可以配置跳过错误的个数：`set GLOBAL SQL_SLAVE_SKIP_COUNTER=n;`  # n为正整数，有几个错误，就跳过几个

- 建议建立专门的只读用户

为防止从库被意外修改，建议单独为从库专门的只读用户。

```sql
grant select on dbname.* to reader@'%' IDENTIFIED BY 'password';
flush privileges;
```
---

Reference：《高性能MySQL》第10章

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***

