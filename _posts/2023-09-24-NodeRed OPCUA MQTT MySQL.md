---
layout: post
title: NodeRed拖拉拽实现OPCUA数据订阅，发布至MQTT并落库MySQL
tags: IoT
---

## 背景

几年前曾根据 `Node-Red` 官网示例进行了简单的体验，当时觉得这东西就是个玩具，拿过来玩一玩可以，不实用；但是如今发现有不少产品对其进行了集成，并做出了复杂的商业应用，这确实是极大的震撼。

> 使用看似简单的工具，实现真正复杂的应用。

## 环境准备

要本地运行 `Node-Red` ，有 `Node.js` 环境就够了。

不过 `Node-Red` 新版的 `V3.x` 版本需要 `Node.js` 在 `V14` 以上，所以用惯了 `NodeV10` 或者 `V12` 的，可能需要更新下环境，这里建议[使用nvm管理不同版本的Node.js](https://heartsuit.blog.csdn.net/article/details/116665356)。

```bash
# 列出当前已安装的Node.js，同 nvm ls
nvm list
# 列出可下载的Node.js版本号
nvm list available
# 下载安装指定版本的Node.js
nvm install 16.18.0
# 切换到指定版本的Node.js
nvm use 16.18.0
# 列出当前已安装的Node.js，同 nvm ls
nvm list
# 卸载指定版本的Node.js
nvm uninstall 16.18.0
```

但是要实现 `OPCUA` 数据订阅，发布至MQTT并落库MySQL，则还需要 `OPCUA` 的模拟服务器 `Prosys OPC UA Simulation Server` ，作为 `MQTT Broker` 的 `EMQX` 与MQTT客户端测试工具 `MQTTX` ，以及持久化存储 `MySQL` 或者时序数据库 `TDengine` 等工具。

如果是使用 `Win7` ，默认只能用到的 `Node` 最高版本为 `V13` ，需要进行以下调整。

在 `Win7` 系统环境变量中新建环境变量： `NODE_SKIP_PLATFORM_CHECK` ，值设为1。

## 安装运行

```bash
# 全局安装
npm i -g node-red

# 运行
node-red
```

![2023-09-24-1-Install.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-1-Install.jpg)

## 示例流程

官方提供了两个示例流程，可以快速上手，建议阅读英文文档，因为中文网的示例程序中链接过期。

![2023-09-24-2-Demo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-2-Demo.jpg)

## 拖拉拽操作

### OPCUA数据订阅

在默认的节点中不包含 `OPCUA` 节点，需要到节点管理（点击右上角菜单下）的市场上搜索安装，各路大神开放了各类节点；从我当前的目标出发，简单通过关键词检索了一下，基本覆盖了工业互联网设备接入的各种协议以及各类数据库的操作。

* 启动OPCUA服务端模拟器

![2023-09-24-3-OPCUAServer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-3-OPCUAServer.jpg)

* 安装OPCUA节点

![2023-09-24-4-InstallOPCUA.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-4-InstallOPCUA.jpg)

* 配置OPCUA Item节点

![2023-09-24-5-OPCItem.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-5-OPCItem.jpg)

* 配置OPCUA Client连接

![2023-09-24-6-OPCClient.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-6-OPCClient.jpg)

* 调试效果

![2023-09-24-7-OPCDemo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-7-OPCDemo.jpg)

### 发布至MQTT主题

因为 `IBM` 这款开源系统是针对物联网行业而研发的，那么作为物联网设备上云事实上的标准通信协议， `Node-Red` 已默认集成了 `MQTT` 组件。

* 启动EMQX

![2023-09-24-8-EMQX.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-8-EMQX.jpg)

* 封装payload
采用 `JavaScript` 的函数能力实现。

```javascript
msg.payload = {
    'device': msg.topic,
    'plc': msg.payload,
    'create_time': new Date().toLocaleString()
};
return msg;
```

![2023-09-24-9-MQTTPayload.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-9-MQTTPayload.jpg)

* 配置MQTT out节点与发布主题

![2023-09-24-10-MQTTout.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-10-MQTTout.jpg)

* 调试效果

![2023-09-24-11-MQTTDemo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-11-MQTTDemo.jpg)

### 订阅MQTT主题并落库MySQL

在默认的节点中不包含 `MySQL` 节点，需要到节点管理的市场上搜索安装。

* 安装MySQL节点

![2023-09-24-12-MySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-12-MySQL.jpg)

* 建表语句

```sql
CREATE TABLE `plc_test` (
	`id` INT(10) NOT NULL AUTO_INCREMENT,
	`plc` FLOAT NULL DEFAULT NULL,
	`create_time` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb4_0900_ai_ci'
ENGINE=InnoDB;
```

* 配置MQTT in节点与订阅主题

![2023-09-24-13-MQTTin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-13-MQTTin.jpg)

* 编写SQL插入
采用 `JavaScript` 的函数能力实现 `SQL` 语句构造。

![2023-09-24-14-MySQLInsert.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-14-MySQLInsert.jpg)

```javascript
let insertOne = "INSERT INTO plc_test(plc, create_time) VALUES ('%f','%s')";
msg.topic = util.format(insertOne, msg.payload.plc, msg.payload.create_time)
return msg;
```

* 配置数据库连接

![2023-09-24-15-MySQLConfig.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-15-MySQLConfig.jpg)

* 调试效果

数据成功写入数据库中。

![2023-09-24-16-MySQLDemo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-09-24-16-MySQLDemo.jpg)

## 小总结

通过使用可视化连线的方式，可以轻松实现数据清洗、告警分发和逻辑联动等任务，降低了系统的使用门槛。`Node-Red`提供了灵活的集成能力，可以连接各种设备、传感器和应用程序，帮助用户快速构建高效的系统。此外，`Node-Red`还具有可扩展性，可以轻松地添加新的节点和功能，以适应不断变化的需求。

综上，先是介绍了运行 `Node-Red` 所需的环境准备，包括安装 `Node.js` 和一些其他工具。接下来，文章介绍了 `Node-Red` 的安装和运行方法。在拖拉拽操作部分，介绍了如何使用 `Node-Red` 进行 `OPCUA` 数据订阅、发布至 `MQTT` 主题和将数据存储到 `MySQL` 数据库中。 `Node-Red` 是一个强大而灵活的工具，可以帮助你实现复杂的应用。

## Reference

* [使用nvm管理不同版本的Node.js](https://heartsuit.blog.csdn.net/article/details/116665356)
* [Node-Red官方文档](https://nodered.org/docs/getting-started/local)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
