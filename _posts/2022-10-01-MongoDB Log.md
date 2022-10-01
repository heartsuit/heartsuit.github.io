---
layout: post
title: MongoDB的日志目录被删除了，导致无法启动：(code=exited, status=1/FAILURE)
tags: MongoDB, DataBase
---

## 背景

2017年部署的一个基于 `Vue` , `Node.js` , `MongoDB` 构建的 `Web` 项目，今天访问时突然打不开了，查看日志发现 `MongoDB` 数据库竟然无法连接了。数据库的错误信息如下：

> ExecStart=/usr/bin/mongod --config /etc/mongod.conf (code=exited, status=1/FAILURE)

![2022-10-01-MongoDB.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-01-MongoDB.jpg)

## 问题复现

在尝试启动/重启 `MongoDB` 数据库服务时，会发现服务启动失败……WTF，这5年来服务一直正常，好好地怎么就起不来了？

```bash
root@iZuf69c5h89bkzv0aqfm8lF:~# service mongod restart
root@iZuf69c5h89bkzv0aqfm8lF:~# service mongod status
● mongod.service - High-performance, schema-free document-oriented database
   Loaded: loaded (/lib/systemd/system/mongod.service; disabled; vendor preset: enabled)
   Active: failed (Result: exit-code) since Thu 2022-09-29 19:46:45 CST; 3s ago
     Docs: https://docs.mongodb.org/manual
  Process: 29156 ExecStart=/usr/bin/mongod --config /etc/mongod.conf (code=exited, status=1/FAILURE)
 Main PID: 29156 (code=exited, status=1/FAILURE)
```

## 问题排查

出现问题，第一时间应保护现场，查看日志。可从配置文件中获取到以下目录存储信息：

* 数据目录：/var/lib/mongodb

* 日志目录：/var/log/mongodb

可是当我通过`tail /var/log/mongodb/mongod.log`查看日志时，竟然提示没有这个文件？？？！！！

那么问题来了，肯定是有人删除了`MongoDB`的日志目录。。

## 解决方案

解决起来比较简单，直接手动创建`MongoDB`的日志目录：

进入日志目录：`cd /var/log`
创建日志目录：`mkdir mongodb`
创建日志文件：`touch mongod.log`

最后，记得将新创建的日志目录赋给mongodb用户即可；接着重启服务，成功~

```bash
# mongodb用户授权
root@iZuf69c5h89bkzv0aqfm8lF:/var/log# chown -R mongodb:mongodb /var/log/mongodb

# 重启服务
root@iZuf69c5h89bkzv0aqfm8lF:/var/log# service mongod restart

# 查看服务状态
root@iZuf69c5h89bkzv0aqfm8lF:/var/log# service mongod status
● mongod.service - High-performance, schema-free document-oriented database
   Loaded: loaded (/lib/systemd/system/mongod.service; disabled; vendor preset: enabled)
   Active: active (running) since Thu 2022-09-29 19:47:37 CST; 1s ago
     Docs: https://docs.mongodb.org/manual
 Main PID: 29758 (mongod)
   CGroup: /system.slice/mongod.service
           └─29758 /usr/bin/mongod --config /etc/mongod.conf
```

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
