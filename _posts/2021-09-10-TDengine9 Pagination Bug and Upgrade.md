---
layout: post
title: 9-TDengine低版本分页offset出现bug，如何平滑升级版本、迁移数据
tags: TDengine
---

### 背景

为什么要对 `TDengine` 进行升级？

从一开始使用 `TDengine` 就选了当时最新的版本 `2.1.2.0` ，这个版本应该也不算旧了。不过今天在使用其分页功能查询表时，发现了一个问题， `TDengine` 毕竟是一款新的数据库，有问题也很正常。

```bash
[root@hadoop2 ~]# taos --version
version: 2.1.2.0
```

### 问题复现

前端页面点击不同页码后，表格的数据不变。。。

![2021-09-10-PaginationBug.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-10-PaginationBug.jpg)

使用 `SpringBoot` 集成了 `TDengine` , `MyBatisPlus` 后，在对一些表中分页查询时，不同的 `offset` 竟然返回相同的值。检查了前后端参数数据交互，没啥问题；以下是 `MyBatisPlus` 关于表查询的前3页生成的SQL语句，拿着这些语句在 `taos` 客户端执行，竟然返回相同的数据！！神奇了~

```sql
SELECT ts,voltage,currente,temperature,sn,city,groupid  FROM power  WHERE sn = '1105' AND ts BETWEEN '2021-09-07 09:15:11.138
' AND '2021-09-07 10:15:11.138' and groupid=2 LIMIT 10 offset 10;

SELECT ts,voltage,currente,temperature,sn,city,groupid  FROM power  WHERE sn = '1105' AND ts BETWEEN '2021-09-07 09:15:11.138
' AND '2021-09-07 10:15:11.138' and groupid=2 LIMIT 10 offset 20;

SELECT ts,voltage,currente,temperature,sn,city,groupid  FROM power  WHERE sn = '1105' AND ts BETWEEN '2021-09-07 09:15:11.138
' AND '2021-09-07 10:15:11.138' and groupid=2 LIMIT 10 offset 30;
```

也就是说 `offset` 在这里好像并没有起作用，经过反复检查代码与配置，并在官方的 `Issues` 中检索后，发现这可能是个bug，而且也有对应的PR，新版本可能已经解决了这个问题。那么就升级下版本试试？

主要有两大步骤：
1. 升级服务端；
2. 升级客户端；

### 版本升级：升级服务端

我这里从 `2.1.2.0` 升级为 `2.2.0.0` 版本。

为了防止数据丢失，虽然我放的都是测试数据（官方demo数据以及我自建的测试数据，数据量都是亿级别），不过还是对两台虚拟机做了快照，哈哈~

之前我的两台虚拟机上的 `TDengine` 已经建立了集群，不过在这次升级版本时，我并没有将第二台主机移出集群，一方面也是想看看 `TDengine` 在做这种版本升级时对已有的数据以及集群是怎么处理的，另一方面，毕竟做了快照，随时可以进行时光穿梭（论备份的重要性）。

* 下载rpm

```bash
[root@hadoop1 local]# wget https://www.taosdata.com/assets-download/TDengine-server-2.2.0.0-Linux-x64.rpm
```

* 第一台主机上的操作：

```bash
[root@hadoop1 ~]# taos --version
version: 2.1.2.0

# 停止旧版本taosd服务
[root@hadoop1 ~]#  systemctl stop taosd

# 查看已安装的版本信息
[root@hadoop1 ~]# rpm -qa | grep tdengine
tdengine-2.1.2.0-3.x86_64

# 卸载旧版本
[root@hadoop1 ~]# rpm -e tdengine
TDengine is removed successfully!
警告：文件 /usr/local/taos/cfg/taos.cfg: 移除失败: 没有那个文件或目录

# 安装新版本
[root@hadoop1 local]# rpm -ivh TDengine-server-2.2.0.0-Linux-x64.rpm

# 启动新版本
[root@hadoop1 local]# systemctl start taosd

# 确认新版本服务状态
[root@hadoop1 local]# systemctl status taosd
● taosd.service - TDengine server service
   Loaded: loaded (/etc/systemd/system/taosd.service; enabled; vendor preset: disabled)
   Active: active (running) since 五 2021-09-10 10:42:11 CST; 1s ago
  Process: 121891 ExecStartPre=/usr/local/taos/bin/startPre.sh (code=exited, status=0/SUCCESS)
 Main PID: 121899 (taosd)
   CGroup: /system.slice/taosd.service
           └─121899 /usr/bin/taosd

9月 10 10:42:11 hadoop1 systemd[1]: Starting TDengine server service...
9月 10 10:42:11 hadoop1 systemd[1]: Started TDengine server service.
9月 10 10:42:11 hadoop1 TDengine:[121899]: Starting TDengine service...
9月 10 10:42:12 hadoop1 TDengine:[121899]: Started TDengine service successfully.
```

* 第二台主机上的操作：

```bash
[root@hadoop2 ~]# taos --version
version: 2.1.2.0

# 停止旧版本taosd服务
[root@hadoop2 ~]# systemctl stop taosd

# 查看已安装的版本信息
[root@hadoop2 ~]# rpm -qa | grep tdengine
tdengine-2.1.2.0-3.x86_64

# 卸载旧版本
[root@hadoop2 ~]# rpm -e tdengine
TDengine is removed successfully!
警告：文件 /usr/local/taos/cfg/taos.cfg: 移除失败: 没有那个文件或目录

# 安装新版本
[root@hadoop2 local]# rpm -ivh TDengine-server-2.2.0.0-Linux-x64.rpm

# 启动新版本
[root@hadoop2 local]# systemctl start taosd
[root@hadoop2 local]# taos --version
version: 2.2.0.0

# 确认新版本服务状态
[root@hadoop2 local]#  systemctl status taosd
● taosd.service - TDengine server service
   Loaded: loaded (/etc/systemd/system/taosd.service; enabled; vendor preset: disabled)
   Active: active (running) since 五 2021-09-10 10:45:29 CST; 14min ago
  Process: 117249 ExecStartPre=/usr/local/taos/bin/startPre.sh (code=exited, status=0/SUCCESS)
 Main PID: 117256 (taosd)
   CGroup: /system.slice/taosd.service
           └─117256 /usr/bin/taosd

9月 10 10:45:29 hadoop2 systemd[1]: Starting TDengine server service...
9月 10 10:45:29 hadoop2 systemd[1]: Started TDengine server service.
9月 10 10:45:29 hadoop2 TDengine:[117256]: Starting TDengine service...
9月 10 10:45:30 hadoop2 TDengine:[117256]: Started TDengine service successfully.
```

这样两台主机上的 `taosd` 服务启动后，自动恢复了旧版本的集群， `GUI` 客户端可连接（使用的是 `JDBC-RESTful` 方式），而且数据都在，一切正常。这是不禁会有一个疑问：

```
Q: 哇哦，服务启动后，数据竟然无需进行迁移，而且自动恢复集群啦~，这是什么神仙操作。
A: 其实，稍微观察下就知道，我们在执行卸载命令后，旧版本的配置以及数据甚至日志并没有删除，这也是`TDengine`比较人性化的地方，毕竟不能随意就将用户的数据删除。rpm方式安装后的默认目录如下：

配置文件：`/etc/taos/taos.cfg`
数据目录：`/var/lib/taos`
日志目录：`/var/log/taos`
```

### 版本升级：升级客户端

升级了 `TDengine` 的后台服务后，可能还需要升级客户端。

1. 如果使用的是 `JDBC-RESTful` 接口方式，无要依赖本地函数库，就没啥问题，无需做其他改动，直接可以用，到此就升级结束啦；
2. 如果使用的是 `JDBC-JNI` 方式，则开发环境的客户端需要升级，同时项目中的`taos-jdbcdriver`版本也需要升级；即只有这种情况下才需要进行以下操作。

* Windows10上的taos客户端版本升级

当然，直接下载与服务端相同版本的客户端即可，不要自己找麻烦哦。

我这里从 `2.1.2.0` 升级为 `2.2.0.0` 版本。

下载指定版本客户端并安装： `https://www.taosdata.com/assets-download/TDengine-client-2.2.0.0-Windows-x64.exe`

* pom文件中的`taos-jdbcdriver`依赖版本升级

![2021-09-10-DriverCompatible.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-10-DriverCompatible.jpg)

```xml
<dependency>
    <groupId>com.taosdata.jdbc</groupId>
    <artifactId>taos-jdbcdriver</artifactId>
    <version>2.0.30</version>
</dependency>
```

修改为：

```xml
<dependency>
    <groupId>com.taosdata.jdbc</groupId>
    <artifactId>taos-jdbcdriver</artifactId>
    <version>2.0.31</version>
</dependency>
```

### Reference

* [https://www.taosdata.com/blog/2019/08/09/566.html](https://www.taosdata.com/blog/2019/08/09/566.html)
* [https://www.taosdata.com/cn/documentation/connector/java](https://www.taosdata.com/cn/documentation/connector/java)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
