---
layout: post
title: 常用的MQTT客户端与Broker
tags: MQTT
---

## 背景

作为物联网终端数据上云协议事实上的标准，当涉及到 `MQTT` （Message Queuing Telemetry Transport）协议时，目前有许多不同的 `Broker` 和客户端工具可供选择。本文简要罗列下常见的 `Broker` 和客户端工具，以及可供测试的开放 `Broker` 地址。

## MQTT Broker

1. Mosquitto
[Mosquitto](https://mosquitto.org/)，一个流行的开源 `MQTT Broker` ，它轻巧且易于部署。

![2023-12-23-Mosquitto.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-Mosquitto.jpg)

2. HiveMQ
[HiveMQ](https://www.hivemq.com/)，一个专业的 `MQTT Broker` ，提供了高度可扩展性和可靠性。

![2023-12-23-HiveMQ.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-HiveMQ.jpg)

3. RabbitMQ
[RabbitMQ](https://www.rabbitmq.com/)，虽然它是一个通用的消息队列，但也提供了 `MQTT` 插件，可以作为 `MQTT Broker` 使用。

![2023-12-23-RabbitMQ.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-RabbitMQ.jpg)

4. EMQ X
[EMQX](https://www.emqx.io/) 是一款开源的大规模分布式 `MQTT` 消息服务器，功能丰富，专为物联网和实时通信应用而设计。 `EMQX 5.0` 单集群支持 `MQTT` 并发连接数高达 `1` 亿条，单服务器的传输与处理吞吐量可达每秒百万级 `MQTT` 消息，同时保证毫秒级的低时延。

![2023-12-23-EMQX.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-EMQX.jpg)

5. BifroMQ
[BifroMQ](https://bifromq.io/zh-Hans/)是一个高性能的分布式 `MQTT Broker` 消息中间件实现，无缝集成了原生的多租户支持。它旨在支持构建大规模的物联网设备连接和消息系统。它来源与百度物联网团队多年技术积累，并作为百度智能云物联网核心套件 `IoT Core` 的基础技术，这是一个公有云 `Serverless` 的 `MQTT` 服务。

![2023-12-23-BifroMQ.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-BifroMQ.gif)

6. FluxMQ
[FluxMQ](https://www.fluxmq.com/) `FluxMQ` 是一款高性能，云原生的物联网接入网关，专为物联网、工业互联网、 `IT` 运维监控等场景设计并优化，具有极强的弹性伸缩能力，高并发，低延迟。能大幅度的减小物联网系统搭建过程中的复杂度，降低研发和运维成本，是一个物联网平台的基础且重要的组件。

![2023-12-23-FluxMQ.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-FluxMQ.jpg)

## MQTT客户端工具

1. MQTTBox：`MQTTBox` 是 `Sathya Vikram` 个人开发的 `MQTT` 客户端工具，最初仅在 `Chrome` 上作为拓展安装使用， 后经重写开源成为桌面端跨平台软件。界面简单直接，支持多个客户端同时在线，但客户端之间的切换、互发消息等交互还是有一些不便。
   [下载地址](https://mqttbox.en.softonic.com/)

![2023-12-23-MQTTBox.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-MQTTBox.jpg)

2. MQTT.fx: 一个功能强大的跨平台`MQTT`客户端工具，提供了直观的用户界面和丰富的功能。
   [下载地址](https://softblade.de/download/)

![2023-12-23-MQTTFX.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-MQTTFX.jpg)

3. MQTT Explorer: `MQTT Explorer` 是一个全面的 `MQTT` 客户端，它的一大亮点是提供了 `MQTT` 主题的结构化展示及动态预览。`MQTT Explorer` 还支持对接收到的 `payload` 消息进行差异对比及可视化图表展示。
    [下载地址](https://github.com/thomasnordquist/MQTT-Explorer)

![2023-12-23-MQTTExplorer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-MQTTExplorer.jpg)

4. MQTTX：MQTTX 是一个强大的跨平台 `MQTT 5.0` 桌面和 `CLI` 客户端，使学习、探索和开发 `MQTT` 变得快速而简单。
    [下载地址](https://www.emqx.com/zh/try?product=MQTTX)

![2023-12-23-MQTTX.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-23-MQTTX.jpg)

5. HiveMQ MQTT Client: 由`HiveMQ`提供的专业`MQTT`客户端库，支持`Java`和`Android`平台。
    [下载地址](https://github.com/hivemq/hivemq-mqtt-client/)

6. Paho: `Eclipse Foundation`提供的一组`MQTT`客户端库，支持多种编程语言，包括`Python`、`Java`和`C/C++`。
    [下载地址](https://eclipse.dev/paho/index.php)

7. MQTT.js: 一个流行的`JavaScript MQTT`客户端库，适用于浏览器和`Node.js`环境。
    [下载地址](https://www.npmjs.com/package/mqtt)

此外，也有一些其他的 `CLI` 的 `MQTT` 客户端，eg: `Mosquitto CLI` ，下面以 `MQTT.js` 为例进行命令行操作演示。

```bash
# MQTT.js bundles a command to interact with a broker. In order to have it available on your path, you should install MQTT.js globally:
 `npm install mqtt -g`

# Then, on one terminal:
 `mqtt sub -t 'hello' -h 'test.mosquitto.org' -v`

# On another:
 `mqtt pub -t 'hello' -h 'test.mosquitto.org' -m 'from MQTT.js'`
```

关于更多的 `MQTT` 客户端库，可参考：[https://github.com/mqtt/mqtt.org/wiki/libraries](https://github.com/mqtt/mqtt.org/wiki/libraries)，其中列举了不同编程语言的可用的 `MQTT` 客户端连接库，总有一款适合你。

## 公开的MQTT Broker测试地址

1. mqtt://test.mosquitto.org
2. mqtt://broker.emqx.io
3. mqtt://broker.hivemq.com

以上地址，可以直接通过 `MQTT` 客户端工具进行连接与订阅/发布测试。

## 小总结

以上是一些常见的 `MQTT Broker` 和客户端工具，介绍了常见的 `MQTT Broker` 包括 `Mosquitto` 、 `HiveMQ` 、 `RabbitMQ` 、 `EMQ X` 、 `BifroMQ` 和 `FluxMQ` ，以及 `MQTT` 客户端工具包括 `MQTTBox` 、 `MQTT.fx` 、 `MQTT Explorer` 、 `MQTTX` 、 `HiveMQ MQTT Client` 、 `Paho` 和 `MQTT.js` 。此外，还提供了公开的 `MQTT Broker` 测试地址；选择合适的工具取决于你的具体需求和项目要求。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
