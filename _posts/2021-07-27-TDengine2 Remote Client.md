---
layout: post
title: 2-TDengine客户端连接，RESTful，JDBC
tags: TDengine
---

### 背景

上一篇的体验中，都是使用服务器本地的客户端连接后进行操作的，那么如何远程连接 `TDengine` 呢，比如：远程客户端，JDBC等。

TDengine提供了丰富的应用程序开发接口，其中包括C/C++、Java、Python、Go、Node.js、C# 、RESTful等，便于用户快速开发应用。这里使用三种方式连接下远程的 `taosd` 服务：

1. RESTful Connector；
2. Windows远程客户端；
3. JDBC-JNI；

### RESTful Connector

`RESTful Connector` 是最简单的远程连接方式，跨平台、无需安装任何客户端，直接发起 `HTTP` 请求即可。

`TDengine` 通过 `HTTP POST` 请求 `BODY` 中包含的 `SQL` 语句来操作数据库，仅需要一个 `URL` ，以下是在 `Windows 10` 操作系统上使用 `curl` 发送 `HTTP` 请求来体验。

Note: `RESTful Connector` 默认使用6041（实际取值是 serverPort + 11，因此可以通过修改 serverPort 参数的设置来修改）端口通信，所以在服务器端需要开放6041的TCP端口。

       iptables -I INPUT -p TCP --dport 6041 -j ACCEPT

```bash
# RESTful Connector

# 不带认证信息，报错
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -d 'select * from db.t' hadoop1:6041/rest/sql
{"status":"error","code":4357,"desc":"no auth info input"}

# 附加用户名:密码，正常响应
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -u root:taosdata -d 'select * from db.t' hadoop1:6041/rest/sql
{"status":"succ","head":["ts","speed"],"column_meta":[["ts",9,8],["speed",4,4]],"data":[["2019-07-15 00:00:00.000",10],["2019-07-15 01:00:00.000",20]],"rows":2}

# 附加用户名:密码的Base64编码在头信息，正常响应
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Basic cm9vdDp0YW9zZGF0YQ==' -d 'select * from db.t' hadoop1:6041/rest/sql
{"status":"succ","head":["ts","speed"],"column_meta":[["ts",9,8],["speed",4,4]],"data":[["2019-07-15 00:00:00.000",10],["2019-07-15 01:00:00.000",20]],"rows":2}

# 获取token
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl hadoop1:6041/rest/login/root/taosdata
{"status":"succ","code":0,"desc":"/KfeAzX/f9na8qdtNZmtONryp201ma04bEl8LcvLUd7a8qdtNZmtONryp201ma04"}

# 附加自定义token在头信息，正常响应
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Taosd /KfeAzX/f9na8qdtNZmtONryp201ma04bEl8LcvLUd7a8qdtNZmtONryp201ma04' -d 'select * from db.t' hadoop1:6041/rest/sql
{"status":"succ","head":["ts","speed"],"column_meta":[["ts",9,8],["speed",4,4]],"data":[["2019-07-15 00:00:00.000",10],["2019-07-15 01:00:00.000",20]],"rows":2}

# 请求URL采用sqlt时，返回结果集的时间戳将采用Unix时间戳格式表示
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Basic cm9vdDp0YW9zZGF0YQ==' -d 'select * from db.t' hadoop1:6041/rest/sqlt
{"status":"succ","head":["ts","speed"],"column_meta":[["ts",9,8],["speed",4,4]],"data":[[1563120000000,10],[1563123600000,20]],"rows":2}

# 请求URL采用sqlutc时，返回结果集的时间戳将采用UTC时间字符串表示
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Basic cm9vdDp0YW9zZGF0YQ==' -d 'select * from db.t' hadoop1:6041/rest/sqlutc
{"status":"succ","head":["ts","speed"],"column_meta":[["ts",9,8],["speed",4,4]],"data":[["2019-07-15T00:00:00.000+0800",10],["2019-07-15T01:00:00.000+0800",20]],"rows":2}

# 创建数据库
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Basic cm9vdDp0YW9zZGF0YQ==' -d 'create database ok' hadoop1:6041/rest/sql
{"status":"succ","head":["affected_rows"],"column_meta":[["affected_rows",4,4]],"data":[[0]],"rows":1}

# 删除数据库
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Basic cm9vdDp0YW9zZGF0YQ==' -d 'drop database ok' hadoop1:6041/rest/sql
{"status":"succ","head":["affected_rows"],"column_meta":[["affected_rows",4,4]],"data":[[0]],"rows":1}
```

![2021-07-27-ConsoleRecord.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-27-ConsoleRecord.jpg)

### Widnows客户端

下载与服务器端版本一致的客户端：https://www.taosdata.com/assets-download/TDengine-client-2.1.2.0-Windows-x64.exe

Note：
1. 客户端竟然直接安装到C盘下：C:\TDengine，不过考虑到默认的配置文件位置，可以理解。

2. `TDengine` 默认使用6030端口通信，所以在服务器端需要开放6030的TCP端口。

```bash
# 在taos所在目录执行连接命令，报错了。。
C:\TDengine>taos -h 192.168.169.129
Welcome to the TDengine shell from Linux, Client Version:2.1.2.0
Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.

taos connect failed, reason: Unable to establish connection.
```

这时，如果通过 `JDBC-JNI` 方式远程连接 `TDengine` 时： `spring.datasource.driver-class-name=com.taosdata.jdbc.TSDBDriver` ，报错：

       java.sql.SQLException: JNI ERROR (2354): JNI connection is NULL

解决方法：除了开启6030的 `TCP` 端口外，还需要开放6030的 `UDP` 端口： `iptables -I INPUT -p UDP --dport 6030 -j ACCEPT`

```bash
# 再次连接，成功
C:\TDengine>taos -h 192.168.169.129
Welcome to the TDengine shell from Linux, Client Version:2.1.2.0
Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.

taos>
```

![2021-07-27-ClientUDP.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-27-ClientUDP.jpg)

### JDBC-JNI

使用官方的 `Demo` ：[https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC](https://github.com/taosdata/TDengine/tree/develop/tests/examples/JDBC)；

这些示例在安装的客户端目录也有： `/usr/local/taos/examples/JDBC` 或者 `C:\TDengine\examples\JDBC`

这里主要涉及到 `JDBCDemo` 项目下的 `JDBCDemo.java` 文件，其中的逻辑比较简单，就是一个主方法，实现建库、建表、插入数据、查询方法。

![2021-07-27-JDBCArgs.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-27-JDBCArgs.jpg)

不过遇到了一些问题：
1. 既然我用的是`2.1.2.0`的版本，可是下载的客户端自带示例的`taos-jdbc`依赖版本却五花八门。。
2. `JDBCDemo.java` 报错，但是实际上已经跑通了。。
3. `JDBCDemo.java` 中每条语句都正常执行，可是返回的却是Error。。

![2021-07-27-JDBCError.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-27-JDBCError.jpg)

着实令人哭笑不得、摸不着头脑呀。

Note：

* 因为 `JDBC-JNI` 使用的是 `com.taosdata.jdbc. TSDBDriver` ，连接 `6030` 端口，所以也需要开放TCP、UDP。

```bash
iptables -I INPUT -p TCP --dport 6030 -j ACCEPT
iptables -I INPUT -p UDP --dport 6030 -j ACCEPT
```

* pom中关于`taos-jdbc`的依赖版本应与服务端、客户端保持兼容，默认是`2.0.18`，我改成了`2.0.30`

```xml
<dependency>
       <groupId>com.taosdata.jdbc</groupId>
       <artifactId>taos-jdbcdriver</artifactId>
       <version>2.0.30</version>
</dependency>
```

关于版本兼容性说明，见官方这个表：

![2021-07-27-VersionCompatiable.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-07-27-VersionCompatiable.jpg)

### Reference

* [https://www.taosdata.com/cn/documentation/connector#restful](https://www.taosdata.com/cn/documentation/connector#restful)
* [https://www.taosdata.com/cn/documentation/connector/java](https://www.taosdata.com/cn/documentation/connector/java)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
