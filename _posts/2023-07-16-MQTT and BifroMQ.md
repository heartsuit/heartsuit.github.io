---
layout: post
title: 基于ETLCloud的MQTT数据发送组件实现与BifroMQ连接并发送数据到物联网设备
tags: BigData, Tools, IoT
---

## 背景

前面我们体验了 `ETLCloud` 的离线数据集成、实时数据同步、异构数据转换、报表与消息推送、自定义转换规则等功能，以零代码、可视化、拖拉拽的方式快速完成工作中可能遇到的数据集成问题。

今天来实践一下**MQTT数据发送/EMQ数据发送**组件。先借助 `ETLCloud` 的库表输入组件获取 `ClickHouse` 的数据，然后将数据流以 `MQTT` 协议直接发送到指定 `topic` 中，实现发送指令或数据到物联网设备(EMQ兼容)；在实际的物联网场景中，我们有时会向部分客户端设备批量发送消息或指令，实现远程配置与控制操作。

## MQTT Broker选型

主流的 `MQTT Broker` 有： `Mosquitto` , `EMQ` , `HiveMQ` , `VerneMQ` , `ActiveMQ` 以及提供物联网设备接入服务的云服务商，eg：阿里云、华为云等。不过今天这里我们选择**百度**这两天刚开源的 `BifroMQ` 作为 `MQTT Broker` 。

`BifroMQ` 是一个基于 `Java` 实现的高性能、分布式 `MQTT Broker` 消息中间件，无缝集成了原生的多租户支持。它旨在支持构建大规模的物联网设备连接和消息系统。 `BifroMQ` 源自百度物联网团队多年技术积累，目前，它作为百度智能云物联网核心套件 `IoT Core` 的基础技术，这是一个公有云的 `Serverless` 服务。下面是采用 `EMQ` 开发的 `MQTTx` 客户端工具，实现了与 `BifroMQ` 建立了连接、订阅及发布效果。

![2023-07-16-0-MQTTx.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-0-MQTTx.jpg)

## 数据集说明

`ClickHouse` 中的建表语句：

```sql
CREATE TABLE poetry.poetry (`id` Int32, `title` String, `yunlv_rule` String, `author_id` Int32, `content` String, `dynasty` String, `author` String) ENGINE = MergeTree() PRIMARY KEY id ORDER BY id SETTINGS index_granularity = 8192
```

库表输入组件中，用于读取 `ClickHouse` 数据的 `SQL` 。

```sql
-- 按照朝代分组，统计不同朝代的诗词数量
SELECT dynasty, count(*) AS count FROM poetry.poetry GROUP BY dynasty;
```

## 工具选型

* ClickHouse数据库
* Docker部署ETLCloudV2.2
* ETLCloud的库表输入组件、MQTT数据发送/EMQ数据发送组件

Note：
1. 这里选择的是社区版 `ETLCloud` ，采用 `Docker` 部署的方式轻量、快速启动： `docker pull ccr.ccs.tencentyun.com/restcloud/restcloud-etl:V2.2` 。
2. 简便起见，也用 `Docker` 部署的方式运行`BifroMQ`： `docker run -d --name biformq -p 1883:1883 bifromq/bifromq:latest`

![2023-07-16-1-Env.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-1-Env.jpg)

## 购买组件

因为“MQTT数据发送/EMQ数据发送”组件未包含在 `ETLCloud` 社区版中，所以先到官方的组件库中选择购买（MQTT数据发送/EMQ数据发送组件是免费的）。在官方的组件库中选择时序数据库(IOT设备)-MQTT数据发送/EMQ数据发送-点击购买，之后可以在我购买的组件页面查看（需要先登录）。

![2023-07-16-2-Buy.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-2-Buy.jpg)

## 安装组件

“MQTT数据发送/EMQ数据发送”组件购买成功后，可以在 `ETLCloud` 的管理后台的“数据处理组件”页面进行安装，选择远程安装，会出现购买的组件列表；这里新建了一个**物联网组件**分类，选择安装到这个组件分类下，安装完成后刷新页面。

![2023-07-16-3-Install.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-3-Install.jpg)

## 创建应用与流程

先创建应用，填写基本的应用配置信息。

![2023-07-16-4-CreateApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-4-CreateApp.jpg)

接着，创建数据流程，填写信息即可。

![2023-07-16-5-CreateFlow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-5-CreateFlow.jpg)

## 库表输入与MQTT发送数据实践

接下来通过可视化的配置与操作完成从 `ClickHouse` 这个 `OLAP` 数据库中读取统计数据，然后将结果通过 `MQTT` 协议发送到指定的主题中，订阅了主题的客户端设备将收到数据，从而实现远程管理。

### 数据源配置

1. 配置Source：ClickHouse

数据源选择之前文章迁移的 `ClickHouse` 诗词数据库。

2. 配置Sink：MQTT

选择 `MQTT` ，填写服务器主机以及用户密码信息。

![2023-07-16-6-MQTT.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-6-MQTT.jpg)

![2023-07-16-7-BifroMQ.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-7-BifroMQ.jpg)

### 可视化配置流程

创建好流程后，可以通过点击“流程设计”按钮，进入流程可视化的配置页面。

1. 库表输入：ClickHouse

在左侧的输入组件中，选择“库表输入”，拖至中央的流程绘制区，双击进入配置阶段。

第一步：选择我们配置好的 `ClickHouse` 数据源，可以载入 `ClickHouse` 中已有的表。

![2023-07-16-8-Source1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-8-Source1.jpg)

第二步：可以根据选择的表，生成 `SQL` 语句，这里使用我们自定义的查询统计语句。

![2023-07-16-9-Source2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-9-Source2.jpg)

第三步：可从表中读取到各个字段的定义，支持添加、删除字段，这里改为我们要输出的两个字段。

![2023-07-16-10-Source3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-10-Source3.jpg)

第四步：根据 `SQL` 语句自动进行了数据预览，这样的一个检查操作，保证了后续操作的正常执行。

![2023-07-16-11-Source4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-11-Source4.jpg)

2. 物联网组件：MQTT数据发送

在左侧的物联网组件中，选择“MQTT数据发送”，拖至中央的流程绘制区，双击进入配置阶段。

选择我们创建的 `MQTT` 数据源，自定义一个主题，填写要发送的数据，这里直接将上一个流程节点的输出数据发送出去： `{$!{data}}` 。

![2023-07-16-12-MQTT.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-12-MQTT.jpg)

最后通过 `流程线` 将**开始**、**库表输入**、**MQTT数据发送**、**结束**组件分别连接起来，数据以MQTT协议发送给指定主题的可视化配置便告完成，Done~

![2023-07-16-13-Flow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-13-Flow.jpg)

Note: 这里为了查看**MQTT数据发送**上一个流程节点的输出，配置了流程线的路由属性的输出方式为：在控制台日志中输出。

### 运行流程

保存流程，运行流程；之后可查看对应的流程日志与转换日志，并可视化监控迁移进度。从流程的结果来看，订阅了对应主题的客户端成功收到了消息。

![2023-07-16-14-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-16-14-Result.jpg)

## 问题记录

运行流程时，出现安装的组件报错问题：也就是说未找见我们自己安装的组件。之后联系了官方技术人员，给我发了一个 `ETLSendMqttData.class` 文件，放到了指定目录后 `cn.restcloud.etl.module.plugin.mq` 成功运行。

* 错误信息： `java.lang.Class-java.lang.Exception`: 节点: `SendMqttData` 不存在, 请在组件市场中下载或者自行定义它!

* 解决方法：复制组件到容器的指定目录：`/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/etl/module/plugin/mq`。

```bash
# 从宿主机复制文件到容器的指定目录
[root@etl ~]# docker cp /opt/mq de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/etl/module/plugin/
                                             Successfully copied 6.66kB to de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/etl/module/plugin/
# 重启ETLCloud服务
[root@etl ~]# docker restart de63b29c71d0
de63b29c71d0
```

## 总结

`BifroMQ` 的名称灵感来自于北欧神话中的 `Bifröst` ，一座彩虹之桥，联接着人类的世界 `Midgard` 和神祇居住的世界 `Asgard。`  `Bifröst` 作为两个世界间的坚实而灵活的通道， `BifroMQ` 同样旨在成为连接各种系统或应用的枢纽，通过消息传递实现它们之间的交流。这与 `MQTT` 中间件在分布式系统中扮演的角色，即处理和转发消息，极为相似。此外， `Bifröst` 的坚固性寓意着 `BifroMQ` 在稳定性和可靠性方面的卓越表现，而它的灵活性则象征着 `BifroMQ` 在可扩展性和适应性上的优势。总的来说，‘BifroMQ’是一个坚固、灵活的 `MQTT` 中间件，作为连接不同系统或应用的桥梁。”

而 `ETLCloud` 提供的**MQTT数据发送/EMQ数据发送**组件，可以作为上层业务应用与远程设备客户端之间的桥梁，向 `MQTT` 客户端设备批量发送消息或指令，实现远程配置与控制操作。

## Reference

* [ETLCloud官方文档](https://www.etlcloud.cn/restcloud/view/page/helpDocument.html)
* [ClickHouse官方文档](https://clickhouse.com/docs/en/intro)
* [BifroMQ官方文档](https://bifromq.io/zh-Hans/docs/Readme/)
* [BifroMQ源码](https://github.com/baidu/bifromq)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
