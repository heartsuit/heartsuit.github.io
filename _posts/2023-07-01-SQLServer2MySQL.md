---
layout: post
title: 使用ETLCloud的库表同步组件实现异构数据表批量迁移：从SQLServer到MySQL
tags: BigData, Tools, DataBase
---

## 背景

之前曾遇到一个将线上数据库从 `SQLServer` 转换迁移到 `MySQL` 的需求，数据表70多张，数据总量不大。从网上看很多推荐使用 `SQLyog` ，还有 `Oracle MySQL Server` 官方的 `Workbench` 来做迁移，但是步骤稍显繁琐；后来从一篇文章的某个角落中发现了 `DB2DB` 这个工具，出自于米软科技。

官方简介： `DB2DB` 用于多种主流数据库之间的数据转换，第一版本研发于2015年，经过多年多次产品迭代，通过400余家客户的验证，是一款成熟、应手的产品。从软件功能上看，当前版本 `1.30.107` 支持 `SQLServer` , `MySQL` , `SQLite` , `Access` , `SQLServer CE` , `PostgreSQL` 等6种数据库的互相迁移、转换，够用了。具体的迁移操作过程，参考：[异构数据库转换工具体验：将SQLServer数据转换迁移到MySQL](https://blog.csdn.net/u013810234/article/details/129771627)

不过需要注意的是， `DB2DB` 这个 `CS` 架构的工具，下载后默认是未授权的版本（试用版），*有个5万记录的限制*；这样的话，如果源数据库中数据量较大，则需要付费购买授权。

下面先介绍下本次迁移流程的主角：[ETLCloud](https://www.etlcloud.cn/restcloud/view/page/index.html)，重构企业数据融合架构，解决各种复杂、即时、高合规的数据集成需求，一站式覆盖：任务开发、任务编排调度、血缘关系分析、数据质量管理、数据服务开发、任务监控。今天就通过基于微服务架构实现的 `BS` 版数据集成工具：ETLCloud社区版来完成与上述相同的迁移工作。

## 迁移实践

接下来，进入我们的迁移实践：全程零代码、可视化、拖拉拽，鼠标点一点即可完成异构数据表批量迁移工作，最重要的是社区版免费！

Note：这里选择的是社区版，采用 `Docker` 部署的方式轻量、快速启动： `docker pull ccr.ccs.tencentyun.com/restcloud/restcloud-etl:V2.2` 。

### 数据源配置

`SQLServer` 和 `MySQL` 都是 `ETLCloud` 社区版内置支持的数据源，直接新建数据源即可。

1. 配置Source：SQLServer

新建数据源，选择 `SQLServer` ，填写IP: 端口以及用户密码信息。

![2023-07-01-2-SourceSQLServer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-2-SourceSQLServer.jpg)

测试连接成功~

1. 配置Sink：MySQL

新建数据源，选择 `MySQL` ，填写IP: 端口以及用户密码信息。

![2023-07-01-2-SourceMySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-2-SourceMySQL.jpg)

测试连接成功~

### 创建应用与流程

创建应用，填写基本的应用配置信息。接着，创建数据流程，填写信息即可。
创建好流程后，可以通过点击“流程设计”按钮，进入流程可视化的配置页面。

### 可视化配置流程

在配置流程前，简单介绍下这个配置页面的各个区：左侧是组件区，中间顶部是功能区，中间的大部分为流程绘制区，双击绘制区的组件，可以看到以抽屉风格弹出的组件详细配置项区。

1. 库表批量输入：SQLServer

在左侧的库表同步组件中，选择“库表批量输入”，拖至中央的流程绘制区，双击进入配置阶段。

第一步：选择我们配置好的 `SQLServer` 数据源，这里选择分页读取方式，用户为空即可。

![2023-07-01-3-Input1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-3-Input1.jpg)

第二步：可以载入 `SQLServer` 中已有的表和视图，这里共有74张表和4个视图。

![2023-07-01-3-Input2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-3-Input2.jpg)

根据需要，选择要迁移的数据表，这里选中所有表和视图，保存。

![2023-07-01-3-Input3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-3-Input3.jpg)

2. 库表批量输出：MySQL

在左侧的库表同步组件中，选择“库表批量输出”，拖至中央的流程绘制区，双击进入配置阶段。

第一步：选择我们配置好的MySQL数据源。

![2023-07-01-4-Output1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-4-Output1.jpg)

第二步：可配置输出选项：是否清空表数据、是否自动建表、数据的更新方式等。

![2023-07-01-4-Output2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-4-Output2.jpg)

3. 完善流程

最后通过 `流程线` 将**开始**、**库表批量输入**、**库表批量输出**、**结束**组件分别连接起来，批量库表数据迁移的可视化配置便告完成，Done~

![2023-07-01-6-Flow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-6-Flow.jpg)

### 运行流程

保存流程，运行流程；之后可查看对应的流程日志，并可视化监控迁移进度。

![2023-07-01-7-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-7-Result.jpg)

## 问题记录

当然，整个迁移过程并不是一把过，在配置数据源环节以及迁移环节也遇到了几个问题，将其记录如下。

* `SQLServer`数据源因客户端`JDK`版本问题导致连接报错

![2023-07-01-5-ErrorSQLServer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-5-ErrorSQLServer.jpg)

问题描述：链接失败(The driver could not establish a secure connection to SQL Server by using Secure Sockets Layer (SSL) encryption. Error: \"The server selected protocol version TLS10 is not accepted by client preferences [TLS12]\". ClientConnectionId:aacc4edf-dca7-4296-bd33-a4462fcf0033)
问题分析：客户端用的协议版本是 `TLS12` ，但是服务端协议版本是 `TLS10` ，即数据库版本过低，需要降低客户端版本才能适配
解决方法：删除 `jdk/jre/lib/security/java.security` 文件中 `jdk.tls.disabledAlgorithms` 禁用**TLS1.***算法配置，这样客户端就可以适配低版本协议，具体操作如下。

![2023-07-01-1-TLS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-1-TLS.jpg)

先进入容器，定位到 `java.security` 文件。

```bash
# 进入容器
[root@etl ~]# docker exec -it de63b29c71d0 /bin/bash

# 查看ETLCloud容器中自带的jdk版本信息
root@de63b29c71d0:/usr# java -version
java version "1.8.0_333"
Java(TM) SE Runtime Environment (build 1.8.0_333-b02)
Java HotSpot(TM) 64-Bit Server VM (build 25.333-b02, mixed mode)

# 定位到java.security文件
root@de63b29c71d0:/usr# which java
/usr/jdk/bin/java
root@de63b29c71d0:/usr# ls
bin  games  include  jdk  lib  local  sbin  share  src  start.sh  tomcat  velocity.log
root@de63b29c71d0:/usr# cd jdk/jre/lib/security/
root@de63b29c71d0:/usr/jdk/jre/lib/security# ls
blacklist  blacklisted.certs  cacerts  java.policy  java.security  javaws.policy  policy  public_suffix_list.dat  trusted.libraries
root@de63b29c71d0:/usr/jdk/jre/lib/security# vi java.security 
bash: vi: command not found
```

但是由于容器中没有提供 `vi` 命令，这里就先把容器中的 `/usr/jdk/jre/lib/security/java.security` 文件复制到宿主机，修改完成后再复制回容器中。

```bash
# 从容器中复制文件到宿主机
[root@etl opt]# docker cp de63b29c71d0://usr/jdk/jre/lib/security/java.security /opt/
                                               Successfully copied 58.9kB to /opt/

# 修改配置文件
[root@etl opt]# vi java.security
删除jdk.tls.disabledAlgorithms中的TLS1.*算法配置

# 从宿主机复制文件到容器中
[root@etl opt]# docker cp /opt/java.security de63b29c71d0://usr/jdk/jre/lib/security/
                                             Successfully copied 58.9kB to de63b29c71d0://usr/jdk/jre/lib/security/
```

* `MySQL`数据源因数据库表权限问题导致连接报错

问题描述： `Access denied for user 'root'@'%' to database qwert` 。

![2023-07-01-5-ErrorMySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-5-ErrorMySQL.jpg)

解决方法：开启目标数据库的远程访问，并配置建表等权限。

```sql
grant create,alter,drop,index,select,insert,update,delete on qwert.* to root@'%' identified by 'root';
flush PRIVILEGES;
```

* `ELTCloud`读取`SQLServer`表时，会将`DateTime`类型的字段识别为`TimeStamp`类型，导致在`MySQL`中写入日期数据时报错

问题描述： `Caused by: com.mysql.cj.jdbc.exceptions.MysqlDataTruncation: Data truncation: Incorrect datetime value: '1753-01-01 12:00:00' for column 'ErrorTime' at row 1` 。

![2023-07-01-5-ErrorType.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-5-ErrorType.jpg)

解决方法：修改迁移流程，在库表批量输入组件的配置中，先配置为仅同步表结构；执行流程完成表结构同步后，在 `MySQL` 端手动将 `TimeStamp` 类型改为 `DateTime` 类型即可。

![2023-07-01-5-ErrorDateTime.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-5-ErrorDateTime.jpg)

## 总结

以上就是基于 `ETLCloud` 库表同步组件实现异构数据表批量迁移，完成从 `SQLServer` 到 `MySQL` 库表数据迁移实践，简单、直接、有效；此外，也记录了几个迁移过程中与配置相关的问题及解决方法。与以前使用的 `CS` 类型的迁移工具相比， `ETLCloud` 界面更友好、更容易上手，而且社区版的功能已经足够强大。

## Reference

* [http://www.szmesoft.com/DB2DB](http://www.szmesoft.com/DB2DB)
* [ETLCloud官方文档](https://www.etlcloud.cn/restcloud/view/page/helpDocument.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
