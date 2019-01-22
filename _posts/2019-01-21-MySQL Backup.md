---
layout: post
title: MySQL Backup
tags: MySQL
---

实现对MySQL指定数据表的定时备份。

### 编写备份脚本

- backupdb.sh

``` bash
db_user="root"
db_password="root"
db_name="demo"
backup_dir="/backup"
time="$(date +"%Y%m%d%H%M%S")"
mysqldump -u$db_user -p$db_password $db_name | gzip > $backup_dir/$db_name"_"$time.sql.gz
```

直接运行`backupdb.sh`，会出现警告：
> mysqldump: [Warning] Using a password on the command line interface can be insecure.
为避免出现警告信息，可通过以下方式配置实现：

`vi /etc/mysql/my.cnf`

``` bash
[mysqldump]
user=your_db_user_name
password=your_db_password 
```

保存配置文件后, 再修改备份脚本，其中不需要涉及用户名密码等信息。

``` bash
db_name="demo"
backup_dir="/backup"
time="$(date +"%Y%m%d%H%M%S")"
mysqldump $db_name | gzip > $backup_dir/$db_name"_"$time.sql.gz
```

再次运行脚本，就没有警告信息了。

### 创建定时任务

- Linux下Cron表达式规则：

```
*    *    *    *    *    *
-    -    -    -    -    -
|    |    |    |    |    |
|    |    |    |    |    + year [optional]
|    |    |    |    +----- day of week (0 - 7) (Sunday=0 or 7)
|    |    |    +---------- month (1 - 12)
|    |    +--------------- day of month (1 - 31)
|    +-------------------- hour (0 - 23)
+------------------------- min (0 - 59)
```

- 添加计划

``` bash
# 建立计划并执行
crontab -e

# 通过vi或其他编辑器输入计划, eg: 每周日0点执行
0 0 * * 0 /backupdb.sh

# 查看已有任务
crontab -l
```

Note: 
- 如果`crontab -l` 的结果为："no crontab for root - using an empty one"，则说明任务建立失败；
- 可通过命令`select-editor`选择编辑器。

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***