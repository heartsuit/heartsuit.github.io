---
layout: post
title: EMQX开启MongoDB接入认证与订阅发布鉴权
tags: MQTT, EMQX
---

## 背景

关于物联网平台设计一个最佳实践是：**对接入平台的设备进行认证，并且对设备可以发布和订阅的主题进行权限控制**。
`MQTT Broker` 开启对接入设备的认证与订阅发布鉴权的意义在于增强系统的安全性。通过认证，可以确保只有经过授权的设备可以连接到Broker，从而防止未经授权的设备访问系统。而订阅发布鉴权则可以确保只有经过授权的设备可以发布和订阅特定的主题，从而控制数据的访问权限，保护敏感信息不被未授权的设备获取。这些安全措施有助于防止恶意攻击和数据泄露。

下面基于国产的 `MQTT Broker` ： `EMQX` 以及它提供的 `MongoDB` 数据库认证与 `ACL` 插件： `emqx_auth_mongo` 实现对设备接入认证、订阅发布鉴权的功能。

## 启动EMQX，建立匿名客户端连接

```bash
[root@iot1 ~]# cd /usr/local/
[root@iot1 local]# cd emqx
[root@iot1 emqx]# ./bin/emqx_ctl status
Node 'emqx@127.0.0.1' not responding to pings.

# 以默认配置启动EMQX
[root@iot1 emqx]# ./bin/emqx start
There seem to be missing dynamic libs from the OS.
Using libs from /usr/local/emqx/dynlibs instead.
EMQ X Broker 4.4.2 is started successfully!

# 验证状态
[root@iot1 emqx]# ./bin/emqx_ctl status
Node 'emqx@127.0.0.1' 4.4.2 is started

# 查看防火墙状态
[root@iot1 emqx]# firewall-cmd --state
running

# 后面要通过远程客户端连接，这里直接关闭防火墙
[root@iot1 emqx]# systemctl stop firewalld.service
[root@iot1 emqx]# systemctl disable firewalld.service
Removed symlink /etc/systemd/system/multi-user.target.wants/firewalld.service.
Removed symlink /etc/systemd/system/dbus-org.fedoraproject.FirewallD1.service.
```

在 `EMQX` 默认配置下，与认证有关的插件都没有启动。

![2023-12-24-1-DefaultConfig.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-1-DefaultConfig.jpg)

以默认配置启动 `EMQX` 后，通过远程客户端工具进行匿名连接（即未输入用户名与密码），成功。

![2023-12-24-2-AnonymousSuccess.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-2-AnonymousSuccess.jpg)

## 修改MongoDB认证插件配置开启接入认证

```bash
[root@iot1 emqx]# vi ./etc/plugins/emqx_auth_mongo.conf
## MongoDB server list.
##
## Value: String
##
## Examples: 127.0.0.1:27017,127.0.0.2:27017...
auth.mongo.server = 127.0.0.1:27017

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
auth.mongo.auth_source = device_access

## MongoDB database
##
## Value: String
auth.mongo.database = device_access

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
auth.mongo.auth_query.selector = access_name=%u
```

最后加载 `./bin/emqx_ctl plugins load emqx_auth_mongo` ，如果是修改，则进行reload： `./bin/emqx_ctl plugins reload emqx_auth_mongo` ；此时，通过 `EMQX` 自带的 `Web` 控制台 `Dashboard` ，可以看到 `MongoDB` 认证插件已启用。
需要注意的是，确保配置的 `MongoDB` 可以连接成功，否则 `emqx_auth_mongo` 插件无法加载。

通过 `MQTT` 客户端进行无密码接入，发现依然可以连接成功！这是因为我们虽然开启了 `MongoDB` 数据库的认证，但是 `EMQX` 默认还开启了匿名接入，我们需要到 `EMQX` 的全局配置文件中关闭匿名配置。

```bash
[root@iot1 emqx]# vi ./etc/emqx.conf
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

# 这个需要重启EMQX服务
[root@iot1 emqx]# ./bin/emqx restart
```

再次尝试通过远程客户端工具进行匿名连接，失败~

![2023-12-24-3-AnonymousFail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-3-AnonymousFail.jpg)

## 生成设备接入秘钥信息

基于 `Express` 框架创建 `Node.js` 后端项目，实现一个新增接口，返回设备信息三元组：产品名称，设备名称，设备秘钥。

### 数据模型 

* device.model

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// mongoose表名会自动增加s，通过指定collection名称进行覆盖
const deviceSchema = new Schema({
    //ProductName
    product_name: {
        type: String,
        required: true
    },
    //DeviceName
    device_name: {
        type: String,
        required: true,
    },
    //接入EMQX时使用的username
    access_name: {
        type: String,
        required: true
    },
    //secret
    secret: {
        type: String,
        required: true,
    },
    // 可接入状态
    status: String,
    // 上次状态更新时间
    last_status_update: Number,
}, {
    collection: "device"
});

//定义 device.toJSONObject
deviceSchema.methods.toJSONObject = function() {
    return {
        product_name: this.product_name,
        device_name: this.device_name,
        secret: this.secret
    }
}

deviceSchema.methods.getACLRule = function() {
    const publish = [
        `report_data/${this.product_name}/${this.device_name}/+/+`,
        `update_status/${this.product_name}/${this.device_name}/+`,
    ];
    const subscribe = [];
    const pubsub = [];
    return {
        publish: publish,
        subscribe: subscribe,
        pubsub: pubsub
    }
}

const Device = mongoose.model("Device", deviceSchema);
module.exports = Device;
```

* device_acl.js

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const deviceACLSchema = new Schema({
    //接入EMQX时使用的username
    access_name: {
        type: String,
        required: true
    },
    publish: Array,
    subscribe: Array,
    pubsub: Array
}, {
    collection: "device_acl"
});

const DeviceACL = mongoose.model("DeviceACL", deviceACLSchema);
module.exports = DeviceACL;
```

### 路由接口

* devices.js

```javascript
const express = require('express');
const Device = require("../models/device");
const shortid = require("shortid");
const router = express.Router();
let DeviceACL = require('../models/device_acl');

router.post("/", function(req, res) {
    console.log(`body: ${req.body.product_name}`);
    let productName = req.body.product_name;
    let deviceName = shortid.generate();
    let secret = shortid.generate();
    let accessName = `${productName}/${deviceName}`;

    let device = new Device({
        product_name: productName,
        device_name: deviceName,
        secret: secret,
        access_name: accessName,
        status: "active"
    });

    device.save(function(err) {
        if (err) {
            res.status(500).send(err);
        } else {
            let aclRule = device.getACLRule();
            let deviceACL = new DeviceACL({
                access_name: device.access_name,
                publish: aclRule.publish,
                subscribe: aclRule.subscribe,
                pubsub: aclRule.pubsub
            });
            deviceACL.save(function() {
                res.json({
                    product_name: productName,
                    device_name: deviceName,
                    secret: secret
                })
            });
        }
    })
});
```

![2023-12-24-4-GenerateAuth.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-4-GenerateAuth.jpg)

执行生成设备三元组信息后，数据成功写入 `MongoDB` ，当然，这里包括设备的认证信息，以及发布订阅权限信息。

![2023-12-24-5-Device.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-5-Device.jpg)

![2023-12-24-6-DeviceACL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-6-DeviceACL.jpg)

使用生成的设备接入信息，作为用户名与密码，连接 `MQTT Broker` ，成功。

![2023-12-24-7-AuhSuccess.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-7-AuhSuccess.jpg)

## 修改MongoDB认证插件配置开启发布订阅鉴权

```bash
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
auth.mongo.acl_query.selector = access_name=%u
```

设备的 `ACL` 存储到了 `MongoDB` 的 `device_acl` 表中，进行匹配时查询 `access_name` 与客户端发来的 `username` 进行匹配。

发布数据到任意一个主题，失败，没有权限。

![2023-12-24-8-PubFail.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-8-PubFail.jpg)

根据 `ACL` 表里写入的主题信息进行发布，成功。

![2023-12-24-9-PubSuccess.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-9-PubSuccess.jpg)

## 其他API

除了生成设备接入信息三元组的接口外，还实现了获取设备三元组信息，以及设备的启用、禁用、删除接口，方便物联网平台对设备进行管理。

![2023-12-24-10-API.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-24-10-API.jpg)

## 小总结

以上记录了基于 `EMQX` 与它提供的 `MongoDB` 数据库认证与 `ACL` 插件： `emqx_auth_mongo` 实现对设备接入认证、订阅发布鉴权的功能， `MQTT Broker` 开启对接入设备的认证、订阅发布鉴权：

1. 安全性：认证可以确保只有经过授权的设备可以连接到Broker，防止未经授权的设备访问和篡改数据。
2. 控制权限：通过认证可以对不同的设备设置不同的权限，例如读取、发布或订阅特定主题的权限，从而实现更精细的访问控制。
3. 跟踪和监控：认证可以帮助跟踪和监控连接到Broker的设备，记录设备的活动和行为，有助于排查问题和进行安全审计。

因此，开启对接入设备的认证可以提高系统的安全性和可控性。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
