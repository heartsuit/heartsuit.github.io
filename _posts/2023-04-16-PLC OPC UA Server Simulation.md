---
layout: post
title: 通过Milo实现的OPC UA客户端连接并订阅Prosys OPC UA Simulation Server模拟服务器
tags: IoT
---

## 背景

前面我们搭建了一个本地的 `PLC` 仿真环境，并通过 `KEPServerEX6` 读取 `PLC` 上的数据，最后还使用 `UAExpert` 作为 `OPC` 客户端完成从 `KEPServerEX6` 这个OPC服务器的数据读取与订阅功能：[SpringBoot集成Milo库实现OPC UA客户端：连接、遍历节点、读取、写入、订阅与批量订阅](https://blog.csdn.net/u013810234/article/details/130175531)。

注意，如果实际工作中，仅仅需要测试下 `OPC UA` 客户端的功能，那么就Duck不必搭建本地的 `PLC` 仿真环境，而是借助一些 `OPC UA` 服务端的模拟工具。在这篇文章中，我们将使用 `Prosys OPC UA Simulation Server` 作为 `OPC UA` 的服务端，并通过我们前面自己实现的 `OPC UA` 客户端来连接这个模拟的 `OPC UA` 的服务器，即：

> 通过 `Milo` 实现的 `OPC UA` 客户端连接 `Prosys OPC UA Simulation Server` 模拟的 `OPC UA` 服务器。

## 下载安装：Prosys OPC UA Simulation Server

[https://downloads.prosysopc.com/opc-ua-simulation-server-downloads.php](https://downloads.prosysopc.com/opc-ua-simulation-server-downloads.php)

## 模拟OPC UA服务器

双击启动 `Prosys OPC UA Simulation Server` 后，首页显示了服务器的地址信息。

![2023-04-16-Home.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-Home.jpg)

如果需要修改这个默认的连接地址，可通过 `Endpoints` 菜单进行设置（我这里用的是默认的地址）。

![2023-04-16-Endpoints.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-Endpoints.jpg)

在 `Objects` 菜单下，可以看到 `Prosys OPC UA Simulation Server` 默认自带了计数器、随机数、梯形图、锯齿波、正弦波、三角波等节点，可通过 `OPC UA` 客户端进行读取测试。

![2023-04-16-Objects.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-Objects.jpg)

## 基于Milo实现的OPC UA客户端测试

作为示例，以下通过**连接服务器（匿名连接）**、**读取指定节点的值**以及**订阅指定节点**来完成与 `Prosys OPC UA Simulation Server` 模拟 `OPC UA` 服务器的操作。

在实际编码测试之前，可以先通过 `UAExpert` 作为 `OPC` 客户端完成从模拟服务器的数据读取与订阅功能，顺便再次明确下 `NodeId` 的信息。

![2023-04-16-UAExpert.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-UAExpert.jpg)

```java
public class OpcUaStart {
    public void start() throws Exception {
        OpcUaClientService opcUaClientService = new OpcUaClientService();

        // 与OPC UA服务端建立连接，并返回客户端实例
        OpcUaClient client = opcUaClientService.connectOpcUaServer("你的机器名称", "53530", "/OPCUA/SimulationServer");

        // 两种方式定义节点
        NodeId nodeId = new NodeId(3, 1002); // 注意第2个参数类型为数字
//        NodeId nodeId = NodeId.parse("ns=3;i=1002"); // 通过parse静态方法定义

        // 读取指定节点的值
        opcUaClientService.readNodeValue(client, nodeId);

        // 订阅指定节点
        opcUaClientService.subscribe(client, nodeId);
    }
}
```

测试结果如下：

![2023-04-16-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-Result.jpg)

## 可能遇到的问题

### `Prosys OPC UA Simulation Server` 界面上没有 `Endpoints` 菜单？

解决方法： `Prosys OPC UA Simulation Server` 界面上如果没有 `Endpoints` 菜单，可通过左上角的 `Options` 菜单 `Switch to Expert Mode` 切换一下。

![2023-04-16-Options.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-Options.jpg)

### 基于Milo实现的OPC UA客户端如何读取、订阅 `Prosys OPC UA Simulation Server` 中的节点数据？

> StatusCode{name=Bad_NodeIdUnknown, value=0x80340000, quality=bad}

![2023-04-16-Cursor.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-16-Cursor.jpg)

原因分析： 根据状态提示，再结合我们读取节点数据的实现： `readNodeValue` 方法关键的参数分别为： `int namespaceIndex` , `String identifier` 。之前连接 `KEPServer` 和 `Milo Server` 时 `identifier` 的类型都是 `String` ，可以正常读取，但是连接 `Prosys OPC UA Simulation Server` 后，无法读取，我尝试直接改为 `int` 类型后，读取成功。

解决方法： 

方法1：将 `readNodeValue` 方法的 `String identifier` 参数改为 `int identifier` ，即在传参时使用整数类型，可以通过增加一个重载的方法实现。

```java
public void readNodeValue(OpcUaClient client, int namespaceIndex, int identifier)
```

方法2： 修改 `readNodeValue` 方法直接接收 `NodeId` 类型，这时可以通过各种方式定义 `NodeId` ， `NodeId` 提供了各种重载和解析方法。

```java
public void readNodeValue(OpcUaClient client, NodeId nodeId)

// 方式1：构造方法定义NodeId，注意第2个参数类型为数字
NodeId nodeId = new NodeId(3, 1002); 

// 方式2：静态解析定义NodeId
NodeId nodeId = NodeId.parse("ns=3;i=1002");
```

Note：**方式2：静态解析定义NodeId**，这种方法是我通过基于 `GPT-4` 大模型的 `Cursor` 问答得知的：[Cursor编程初体验，搭载GPT-4大模型，你的AI助手，自然语言编程来了](https://blog.csdn.net/u013810234/article/details/129685006)。

![2023-04-15-MiloResult.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-04-15-MiloResult.jpg)

## Reference

[Prosys_OPC_UA_Simulation_Server_UserManual用户手册](https://downloads.prosysopc.com/opcua/apps/JavaServer/dist/5.4.0-115/Prosys_OPC_UA_Simulation_Server_UserManual.pdf)

## Source Code

[https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-opcua](https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-opcua)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
