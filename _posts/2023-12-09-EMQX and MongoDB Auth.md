---
layout: post
title: EMQX的emqx_auth_mongo报错：OP_QUERY is no longer supported
tags: EMQX, MongoDB
---

## 背景

我的目标是想使用 `EMQX` 官方提供的 `emqx_auth_mongo` 的设备接入认证/鉴权插件实现对设备的接入限制；一开始服务器上有个 `6.0.8` 的 `MongoDB` ，在启动时遇到了一些错误。处理了错误并成功启动 `MongoDB` 后，开启 `EMQX` 的 `emqx_auth_mongo` 插件，并配置 `EMQX` 拒绝匿名接入，这时候便报出了题中错误：`OP_QUERY is no longer supported`。

![2023-12-09-EMQXError.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-09-EMQXError.jpg)

先说结论：升级 `EMQX` ，或者降低 `MongoDB` 版本，这里选择降低 `MongoDB` 版本。

## 环境信息

* EMQX版本：4.3.10
* MongoDB版本：6.0.8

## 启动MongoDB遇到的问题

以下记录了刚开始无法启动 `MongoDB` 时的不同报错信息，以及对应的解决方法。

### 问题1：/root/db/mongo/WiredTiger.turtle: handle-open: open: Permission denied

权限问题。

> chown -R mongod:mongod /root/db/mongo

### 问题2：Failed to read metadata from /root/db/mongo/storage.bson

权限问题。

> chown -R mongod:mongod /root/db/mongo

### 问题3：Killing all outstanding egress activity.

删除锁定文件。

```
cd /root/db/mongo
rm -f mongod.lock
```

### 问题4：Failed to unlink socket file

删除连接文件。

```
cd /tmp/
rm mongodb-27017.sock
```

最后 `msg` 终于成了：Waiting for connections，启动成功。

## EMQX使用emqx_auth_mongo认证时报错

前面启动了 `MongoDB` ，那么接下来就进行插件的配置： `vi ./etc/plugins/emqx_auth_mongo.conf` 。

* 接入认证

```conf
## MongoDB server list.
##
## Value: String
##
## Examples: 127.0.0.1:27017,127.0.0.2:27017...
auth.mongo.server = 127.0.0.1:27777

## MongoDB login user.
##
## Value: String
auth.mongo.username = you

## MongoDB password.
##
## Value: String
auth.mongo.password = guess

## MongoDB AuthSource
##
## Value: String
## Default: mqtt
auth.mongo.auth_source = devicehub

## MongoDB database
##
## Value: String
auth.mongo.database = devicehub

## -------------------------------------------------
## Auth Query
## -------------------------------------------------
## Password hash.
##
## Value: plain | md5 | sha | sha256 | bcrypt
auth.mongo.auth_query.password_hash = plain

## Authentication query.
auth.mongo.auth_query.collection = device

## Password mainly fields
##
## Value:  password | password,salt
auth.mongo.auth_query.password_field = secret

## Authentication Selector.
##
## Variables:
##  - %u: username
##  - %c: clientid
##  - %C: common name of client TLS cert
##  - %d: subject of client TLS cert
##
## auth.mongo.auth_query.selector = {Field}={Placeholder}
auth.mongo.auth_query.selector = username=%u
```

* 发布订阅鉴权

```conf

## ACL Selector.
##
## Multiple selectors could be combined with '$or'
##   when query acl from mongo.
##
## e.g.
##
## With following 2 selectors configured:
##
## auth.mongo.acl_query.selector.1 = username=%u
## auth.mongo.acl_query.selector.2 = username=$all
##
## And if a client connected using username 'ilyas',
##   then the following mongo command will be used to
##   retrieve acl entries:
##
## db.mqtt_acl.find({$or: [{username: "ilyas"},  {username: "$all"}]});
##
## Variables:
##  - %u: username
##  - %c: clientid
##
## Examples:
##
## auth.mongo.acl_query.selector.1 = username=%u,clientid=%c
## auth.mongo.acl_query.selector.2 = username=$all
## auth.mongo.acl_query.selector.3 = clientid=$all
auth.mongo.acl_query.collection = device_acl
auth.mongo.acl_query.selector = username=%u
```

最后加载 `./bin/emqx_ctl plugins load emqx_auth_mongo` ，如果是修改，则进行 `reload` ： `./bin/emqx_ctl plugins reload emqx_auth_mongo`

* 关闭EMQX的匿名接入与发布

这时，如果直接通过设备进行接入，使用随意的 `username` 与 `password` ，依然可以成功连接至 `EMQX` 的 `MOTT Broker` ，这是因为 `EMQX` 默认全局下是允许匿名连接的，因此为了实现 `MongoDB` 插件的认证与鉴权，还需要修改以下 `EMQX` 的全局配置： `vi ./etc/emqx.conf` 。

```conf
##--------------------------------------------------------------------
## Authentication/Access Control
##--------------------------------------------------------------------
## Allow anonymous authentication by default if no auth plugins loaded.
## Notice: Disable the option in production deployment!
##
## Value: true | false
allow_anonymous = false

## Allow or deny if no ACL rules matched.
##
## Value: allow | deny
acl_nomatch = deny
```

完成了以上操作，设备的接入流程才能进入到 `MongoDB` 中去查询认证信息，但是不幸的是， `EMQX` 报错了，查看 `EMQX` 日志： `tail -f ./log/emqx.log.1`

> 核心报错信息：OP_QUERY is no longer supported

经过查询，原因是 `EMQX` 连接 `MongoDB` 的客户端驱动版本太低。这里选择降低 `MongoDB` 的版本，接下来安装 `MongoDB` 的 `4.4.26` 版。

## 卸载MongoDB

安装低版本之前，先卸载掉已安装的高版本 `MongoDB` 。

> yum erase mongodb-org mongodb-org-server mongodb-org-shell mongodb-org-mongos mongodb-org-tools mongodb-org-database-tools-extra

## 安装低版本MongoDB

* 下载安装

```bash
# 编辑MongoDB安装源
vi /etc/yum.repos.d/mongodb-org-4.4.repo
[mongodb-org-4.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/4.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc

# 安装MongoDB
yum -y install mongodb-org
```

* 远程访问开启认证
开启远程访问，安全起见，更换了默认端口，强烈要求远程访问时开启认证，并设置高复杂度密码。关于MongoDB基本用法以及用户认证与授权，参考：[Ubuntu下安装使用MongoDB](https://heartsuit.blog.csdn.net/article/details/83415756)

vi /etc/mongod.conf

```yaml
net:
  port: 27777
  bindIp: 0.0.0.0  # Enter 0.0.0.0,:: to bind to all IPv4 and IPv6 addresses or, alternatively, use the net.bindIpAll setting.
security:  
  authorization: enabled
```

## MongoDB客户端

* 自带的mongo命令行客户端
连接方式： `mongo --host=your-server-ip --port=your-port`

* Mongo-express

Web版的MongoDB管理工具，通过npm即可安装， 但是我安装时一直报错，然后就放弃了。

> npm ERR! Unsupported URL Type "patch:": patch:mongodb-query-parser

* Navicat for MongoDB

仅有14天的试用期，不过可以临时下载应个急。

* NoSQLBooster

一直以来用的都是这款客户端工具。不过使用NoSQLBooster for MongoDB导出数据时，报错：

> You are using the free edition of NoSQLBooster for MongoDB and the "Export" feature is disabled. Advanced features are paid-for only. Please consider purchasing a license to support future development. Thank you.

NoSQLBooster for MongoDB本身是提供了30天的试用期的，看如何想办法延长试用期。

1. 先关闭NoSQLBooster for MongoDB应用。

2. 鼠标右键，打开文件位置，会进入默认的安装路径：C:\Users\Administrator\AppData\Local\Programs\nosqlbooster4mongo
看到 `resources` 、 `locales` 目录，瞬间意识到这是使用使用 `Electron` 即 `Node.js` 编写的跨平台客户端。
进入 `resources` 目录，有一个 `app.asar` ，这是一个类似压缩文件的文件包，里面存放了源代码，我们进行解压。

3. 安装全局依赖asar：

> npm install asar -g

4. 解包：

> asar extract app.asar app

生成了app目录

5. 在C:\Users\Administrator\AppData\Local\Programs\nosqlbooster4mongo\resources\app\shared目录下，找到lmCore
修改： `lmCore.js` ，查找并修改：MAX_TRIAL_DAYS=1000 , TRIAL_DAYS=1000

6. 重新打包

> asar pack app app.asar

7. 打开NoSQLBooster for MongoDB.exe。

![2023-12-09-NoSQLBooster.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-09-NoSQLBooster.jpg)

## 小总结

以上记录了使用 `EMQX` 的 `emqx_auth_mongo` 插件实现对设备的接入限制时，遇到"OP_QUERY is no longer supported"的错误。为解决这个问题，可以选择升级 `EMQX` 或者降低 `MongoDB` 版本。本文选择了降低 `MongoDB` 版本，安装了 `4.4.26` 版。此外，文章还提到了一些关于 `MongoDB` 客户端工具的使用问题。

## Reference

* [Ubuntu下安装使用MongoDB](https://heartsuit.blog.csdn.net/article/details/83415756)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
