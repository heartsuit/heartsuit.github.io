---
layout: post
title: 本地部署Confluence遇到的问题：MySQL数据库编码、隔离级别、验证码不显示
tags: 国产化, 正向代理
---

## 背景

本地部署 `Confluence` 时，要求：

1. 数据库编码为 `utf8-bin`。
2. 要求隔离级别为 `READ-COMMITTED`。

此外，使用 `Confluence` 时还遇到了页面上验证码不显示的问题。

![2022-06-26-Confluence0.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-26-Confluence0.jpg)

## 按要求进行数据库设置

官方下载 `MySQL5.7` ：[https://downloads.mysql.com/archives/community/](https://downloads.mysql.com/archives/community/)

* 先查看下当前的隔离级别：

查看系统隔离级别：select @@global.tx_isolation; 
查看会话隔离级别(5.0以上版本)：select @@tx_isolation; 
查看会话隔离级别(8.0以上版本)：select @@transaction_isolation; 

```sql
-- 可以看到当前数据库的默认隔离级别为可重复读
select @@global.tx_isolation;
REPEATABLE-READ
```

接下来，按照 `Confluence` 要求，设置 `MySQL` 数据库的全局事务隔离级别为 `READ-COMMITTED`

```sql
set global transaction isolation level read committed;
```

* 设置会话隔离级别

```sql
set session transaction isolation level repeatable read; 设置会话隔离级别为可重复读
set session transaction isolation level read uncommitted; 设置会话隔离级别为读未提交
set session transaction isolation level read committed; 设置会话隔离级别为读已提交
```

* 再次查看下修改后的级别

```sql
select @@global.tx_isolation;
READ-COMMITTED
```

## 解决初始化数据库报错

> You do not have the SUPER privilege and binary logging is enabled (you *might* want to use the less safe log_bin_trust_function_creators variable)

解决：设置 `log_bin_trust_function_creators=1` 。

```sql
set global log_bin_trust_function_creators=1;
show variables LIKE "%trust%"
```

以上设置方式是临时的，当数据库服务重启或者主机重启后配置就失效了。
可通过以下配置 `my.ini` 或者 `my.cnf` 使配置永久生效。

```ini
transaction-isolation=READ-COMMITTED
log_bin_trust_function_creators=1
```

## 处理验证码不显示的问题

当输错了几次之后就要输入验证码，可是 `Confluence` 的验证码出不来，不显示。

参考：https://www.cnblogs.com/wgy1/p/9796176.html

* 找 `Confluence` 的服务名称（对后面修改编码格式有用）：

控制面板 -》 管理工具 -》 服务 -- Altassian Confluence -> 属性 -> 常规 -> 服务名称

* 修改文件编码格式：
`cmd.exe ` 进入 `Confluence/bin` 文件夹下 输入命令：tomcat9w //ES//Confluence**********

```
C:\Program Files\Atlassian\Confluence\bin>tomcat9w.exe //ES//Atlassian Confluence Confluence110522105657
C:\Program Files\Atlassian\Confluence\bin>tomcat9w.exe //ES//Confluence110522105657
```

* 在弹出的输入框中 `Java` 下 `Java Options`: 下添加 `-Dfile.encoding = UTF-8`

* 重启`service`列表里的`Confluence`。
* 再次登录，验证码显示了。

![2022-06-26-Confluence1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-26-Confluence1.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
