---
layout: post
title: 云原生之运维监控实践-使用taosKeeper与TDinsight实现对TDengine服务的监测告警
tags: TDengine, Grafana
---

## 背景

> 如果没有监控，那么最好的情况是没有问题发生，最糟糕的情况则是问题发生了但没有被发现。——《Prometheus监控实战》

在*10月10日*收到了 `TDengine` 官方微信公众号的一条推送，摘要如下：

> 今天(2024年10月10日)我们非常高兴地宣布，TDengine 3.3.3.0 版本正式发布。本次更新引入了多项重要功能和性能优化，旨在为用户提供更高效、更灵活的数据解决方案。在 3.3.3.0 版本中，我们着重优化了监控和告警功能，新增了多种常见的 MySQL 函数，并增强了对 MongoDB 数据源的支持。这些改进将为用户在物联网和大数据应用中提供更强大的功能，助力大家在数字化转型过程中实现更大的成功。

**时序数据库**作为软件项目的基础设施，对其运行状态进行实时监控的重要性不言而喻，今天就来体验下**重优化了监控和告警功能**。曾在 `TDengine 2.1.2.0` 发布后，体验了将 `TDengine` 日志数据表的内容在 `Grafana` 仪表盘上可视化展现的功能；后来官方不断扩展其监控能力，打造了 `TDinsight` 这一可视化工具，与 `Grafana` 的生态打成一片。这篇文章通过容器化安装 `TDengine` 时序数据库与 `TDinsight` 监控大盘，使用 `taosKeeper` 与 `TDinsight` 实现对 `TDengine` 服务的状态监测与钉钉告警消息推送。

## 虚机资源

共用到了2台虚机，1台作为应用服务节点，1台运维监控节点。

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| svc  | 192.168.44.168 | 服务节点 |
| ops  | 192.168.44.169 | 监控节点 |

基本选用当前最新版本，即将安装的 `Grafana` 及组件版本信息如下：
* Grafana版本：11.2.0
* TDengine版本：3.3.3.0（自带了taosAdapter与taosKeeper）

## 系统环境

```bash
[root@ops ~]# uname -a
Linux ops 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ops ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## svc节点：Docker安装TDengine3.3.3.0

使用 `Docker` 安装 `TDengine3.3.3.0` ，命名容器为 `tdengine` ，并挂载了数据与日志的卷目录。

```bash
[root@svc opt]# docker pull tdengine/tdengine:3.3.3.0

[root@svc opt]# docker run -d --name tdengine -v /opt/tdengine/data:/var/lib/taos \
>   -v /opt/tdengine/log:/var/log/taos \
>   -p 6030:6030 -p 6041:6041 -p 6043-6060:6043-6060 -p 6043-6060:6043-6060/udp tdengine/tdengine:3.3.3.0
0b9e36feac54d787114e5eed8b5dc7fa132dcd29d736b7489733194a27f28cab
```

* 客户端工具验证TDengine安装效果

![2024-10-16-1-TDengineGUI.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-1-TDengineGUI.jpg)

* 浏览器验证metrics端点

浏览器访问[http://192.168.44.168:6043/metrics](http://192.168.44.168:6043/metrics)，这些指标默认会被写入 `TDengine` 的 `log` 数据库，而 `Grafana` 则通过读取 `log` 数据库的数据表实现监控数据可视化。

Note: `taosKeeper` 是 `TDengine 3.0` 版本监控指标的导出工具，通过简单的几项配置即可获取 `TDengine` 的运行状态（可以将这些指标导入到 `Prometheus` ，本文直接使用 `TDengine` 存储）。

## ops节点：docker-compose安装Grafana

参考[云原生之运维监控实践-OpenEuler22.03SP3上安装Prometheus与Grafana实现主机状态监测](https://blog.csdn.net/u013810234/article/details/142589059?spm=1001.2014.3001.5501)

在 `Grafana` 所在主机安装 `TDinsight` ，之后才可以在 `Grafana` 的数据源中添加 `TDengine` 数据源。

```bash
# 编辑TDinsight下载脚本
[root@ops monitoring]# vi tdinsight-plugin.sh
get_latest_release() {
  curl --silent "https://api.github.com/repos/taosdata/grafanaplugin/releases/latest" |
    grep '"tag_name":' |
    sed -E 's/.*"v([^"]+)".*/\1/'
}
TDENGINE_PLUGIN_VERSION=$(get_latest_release)
grafana-cli \
  --pluginUrl https://github.com/taosdata/grafanaplugin/releases/download/v$TDENGINE_PLUGIN_VERSION/tdengine-datasource-$TDENGINE_PLUGIN_VERSION.zip \
  plugins install tdengine-datasource

# 复制下载脚本到Grafana容器中
[root@ops monitoring]# docker cp tdinsight-plugin.sh ops-grafana:/usr/share/grafana
                                             Successfully copied 2.05kB to ops-grafana:/usr/share/grafana

# 下载并安装TDinsight插件
[root@ops monitoring]# docker exec ops-grafana bash tdinsight-plugin.sh 
Deprecation warning: The standalone 'grafana-cli' program is deprecated and will be removed in the future. Please update all uses of 'grafana-cli' to 'grafana cli'
✔ Downloaded and extracted tdengine-datasource v3.6.0 zip successfully to /var/lib/grafana/plugins/tdengine-datasource

Please restart Grafana after installing or removing plugins. Refer to Grafana documentation for instructions if necessary.

# 重启Grafana容器
[root@ops monitoring]# docker restart ops-grafana
ops-grafana
```

## TDinsight监控实战

浏览器访问http://192.168.44.169:3000。

### 配置数据源

1. 点击左侧菜单中的"Add new connection"。
2. 选择或搜索"Data Sources"。
3. 点击"Add data source"并选择"TDengine Datasource"。
4. 在"HTTP"部分输入TDengine地址，eg：http://192.168.44.168:6041
5. 点击"Save & Test"确认连接成功。

![2024-10-16-2-Datasource1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-2-Datasource1.jpg)

![2024-10-16-2-Datasource2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-2-Datasource2.jpg)

### 导入仪表板

* 查看现成的仪表板

[https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)这个页面是 `Grafana` 的官方仪表板目录，用户可以在这里找到和共享各种现成的 `Grafana` 仪表板。这些仪表板覆盖了多种监控需求，包括系统性能、应用监控、网络流量等。用户可以根据自己的需求搜索和导入适合的仪表板，提高监控效率和可视化效果。这里我们搜索 `TDengine` ，结果中有个 `TDinsight for 3.x` ，点击进去可以查看详细的UI效果，复制仪表板的id，此处是18180。

* 导入现成的仪表板

1. 在右侧菜单中点击"New"按钮，然后选择"Import"。
2. 在输入框中，可以直接输入现成仪表板的ID，或者上传JSON文件。常用的主机监控仪表板ID是18180（TDinsight for 3.x）。
3. 点击"Load"，随后选择已配置好的数据源。
4. 点击"Import"完成导入。

![2024-10-16-3-AddTDinsight1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-3-AddTDinsight1.jpg)

![2024-10-16-3-AddTDinsight2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-3-AddTDinsight2.jpg)

### TDinsight监控效果

`TDinsight` 是使用监控数据库和 `Grafana` 对 `TDengine` 进行监控的解决方案；将集群状态、节点信息、插入及查询请求、资源使用情况等进行可视化展示，同时还支持 `vnode` 、 `dnode` 、 `mnode` 节点状态异常告警。

![2024-10-16-4-Dashboard1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-4-Dashboard1.png)

![2024-10-16-4-Dashboard2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-4-Dashboard2.jpg)

## TDinsight告警实战

> 一个好警报的关键是能够在正确的时间、以正确的理由和正确的速度发送，并在其中放入有用的信息。

告警原理说明：
1. Grafana告警定期查询数据源并评估告警规则中定义的条件；
2. 如果条件被违反，则会触发告警实例；
3. 触发的实例根据匹配的标签路由到通知策略；
4. 通知将发送到通知策略中指定的联系点。

![2024-10-16-5-AlertFlow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-5-AlertFlow.jpg)

### 配置告警规则

这里我们使用 `TDinsight` 默认提供的告警规则。要建立一个出色的通知系统，需要考虑以下基础信息，而基于 `Grafana` 的 `TDinsight` 监控方案做到了：
* 哪些问题需要通知；
* 谁需要被告知；
* 如何告知他们；
* 多久告知他们一次。

![2024-10-16-5-AlertFlow1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-5-AlertFlow1.jpg)

### 配置推送方式

支持的推送方式较多，这里选用**钉钉推送**，从钉钉中获取机器人的 `access_token` ，并命名推送方式为 `DingDingPush` ；其中的 `Message Type` 后来我改成了 `ActionCard` 。

![2024-10-16-5-AlertFlow2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-5-AlertFlow2.jpg)

![2024-10-16-5-AlertFlow3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-5-AlertFlow3.jpg)

### 配置通知策略

默认的通知策略是邮件方式，这里直接调整为我们的 `DingDingPush` 。

![2024-10-16-5-AlertFlow4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-5-AlertFlow4.jpg)

### 模拟压力告警

进入 `TDengine` 容器内部，执行 `taosBenchmark` ，为了模拟告警，这里在 `test` 数据库中创建10000张表，每张表写入2000000条数据，由于容器的磁盘空间有限，将会触发磁盘告警，进而导致 `DNodes` 、 `VNodes` 停止工作，然后触发告警。

```bash
[root@ops monitoring]# docker exec -it tdengine /bin/bash
root@9118ddbfa74b:~# taosBenchmark -I stmt -n 2000000 -t 10000
```

在 `TDinsight` 的仪表板上可以看到磁盘使用率已到达95%，根据报警规则设置，即将触发告警。

![2024-10-16-6-AlertDemo.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-6-AlertDemo.jpg)

![2024-10-16-6-AlertDemo2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-6-AlertDemo2.jpg)

### 告警触发推送与告警解除推送

当 `taosBenchmark` 写入数据逐渐将磁盘空间耗尽时，会触发告警，进而会通过我们配置的告警方式和策略进行推送，本文中我们将通过钉钉接收到推送消息：

![2024-10-16-6-AlertDemo3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-6-AlertDemo3.jpg)

当我通过 `taos` 命令行中执行 `drop database test;` 删除 `test` 数据库后， `TDengine` 服务恢复正常，过一段时间（一个告警监测周期）后，在钉钉上会收到各类告警解除的消息。

```bash
[root@localhost monitoring]# docker exec -it tdengine /bin/bash
root@9118ddbfa74b:~# taos
Welcome to the TDengine Command Line Interface, Client Version:3.3.3.0
Copyright (c) 2023 by TDengine, all rights reserved.
  *********************************  Tab Completion  *************************************
  *   The TDengine CLI supports tab completion for a variety of items,                   *
  *   including database names, table names, function names and keywords.                *
  *   The full list of shortcut keys is as follows:                                      *
  *    [ TAB ]        ......  complete the current word                                  *
  *                   ......  if used on a blank line, display all supported commands    *
  *    [ Ctrl + A ]   ......  move cursor to the st[A]rt of the line                     *
  *    [ Ctrl + E ]   ......  move cursor to the [E]nd of the line                       *
  *    [ Ctrl + W ]   ......  move cursor to the middle of the line                      *
  *    [ Ctrl + L ]   ......  clear the entire screen                                    *
  *    [ Ctrl + K ]   ......  clear the screen after the cursor                          *
  *    [ Ctrl + U ]   ......  clear the screen before the cursor                         *
  ****************************************************************************************
Server is TDengine Community Edition, ver:3.3.3.0 and will never expire.

taos> drop database test;
Drop OK, 0 row(s) affected (1.476353s)
```

![2024-10-16-6-AlertDemo4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-16-6-AlertDemo4.jpg)

Note: 在 `Prometheus` 与 `AlertManager` 的生态中， `alertstate` 字段表示报警的状态，有以下几种可能的取值：

1. Firing：表示报警处于触发状态。当报警规则的条件满足时，报警状态会变为Firing，表示触发了报警。通常情况下，报警会发送给相关的接收器或通知渠道，以便进行处理。
2. Resolved：表示报警已解决。当报警规则的条件不再满足时，报警状态会变为Resolved，表示报警已经解决。这意味着报警规则所监控的指标已经恢复到正常状态，不再需要进一步的处理。
3. Pending：表示报警处于等待状态。当报警规则的条件满足时，报警状态会从Firing变为Pending，表示报警处于等待状态。在报警状态从Firing到Resolved之间的过渡期间，报警可能会处于Pending状态，这通常是因为报警规则定义了一些延迟或滞后的条件。

## 小总结

> If you can't measure it, you can't improve it! 

*没有度量就没有改进*，这篇文章介绍了如何使用 `TDengine` 、 `taosKeeper` 和 `TDinsight` 来实现对 `TDengine` 服务的状态监测和告警功能。详细记录了在两台虚拟机上的安装过程，包括在服务节点上使用 `Docker` 安装**最新版**的 `TDengine 3.3.3.0` ，以及在监控节点上安装 `Grafana` 和 `TDinsight` 插件。此外还展示了如何配置 `Grafana` 数据源、导入 `TDinsight` 仪表板，以及设置告警规则和通知策略。最后，通过模拟压力测试，演示了如何触发磁盘空间不足的告警，并通过钉钉接收告警推送和解除通知。这个实践展示了 `TDengine` 生态系统在监控和告警方面的强大功能，为数据库管理员及运维工程师提供了有效的监控解决方案。

## Reference

* [https://github.com/taosdata/TDengine/releases/tag/ver-3.3.3.0](https://github.com/taosdata/TDengine/releases/tag/ver-3.3.3.0)
* [https://github.com/taosdata/TDengine/releases/tag/ver-3.3.3.0](https://github.com/taosdata/TDengine/releases/tag/ver-3.3.3.0)
* [https://grafana.com/grafana/dashboards/18180-tdinsight-for-3-x/](https://grafana.com/grafana/dashboards/18180-tdinsight-for-3-x/)
* [https://docs.taosdata.com/reference/components/taoskeeper/](https://docs.taosdata.com/reference/components/taoskeeper/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
