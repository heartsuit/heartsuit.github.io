---
layout: post
title: 云原生之运维监控实践-OpenEuler22.03SP3上安装Prometheus与Grafana实现主机状态监测
tags: Prometheus, Grafana
---

## 背景

> 如果没有监控，那么最好的情况是没有问题发生，最糟糕的情况则是问题发生了但没有被发现。——《Prometheus监控实战》

去年写了一篇[在Docker环境下部署若依微服务ruoyi-cloud项目](https://heartsuit.blog.csdn.net/article/details/134613312)的文章，当时使用的是 `docker-compose` 在单台机器上部署若依微服务 `ruoyi-cloud` 项目；在这个基础上，作为演示项目，我们计划实现对所有基础组件和微服务的监控。今天这篇文章主要是记录下搭建 `Prometheus` 与 `Grafana` 监控系统的过程，并通过 `node-exporter` 实现对部署微服务的主机状态进行监控。

首先了解下 `Prometheus` 与 `Grafana` 的功能，简述如下。

* Prometheus: 古希腊掌管监控的神，负责数据采集处理及存储（确切地说，数据采集大部分来源于各类exporter，比如我们马上看到的node-exporter，用于从主机上采集数据）；此外借助周边工具可实现告警功能（由Alertmanager提供）。Prometheus主要是一个基于拉取的系统，但它也支持接收推送到网关的事件。

* Grafana: 古希腊掌管数据可视化的神，负责对时序数据的前端展示。数据可视化既是一门非常强大的分析和解释技术，也是一种令人惊叹的学习工具。指标及其可视化通常很难解释。人们在查看可视化图像时，往往会幻想出并不存在的事物间的联系：从随机数据中找到有意义的模式。这通常会导致从相关性到因果关系的突然飞跃，而数据的颗粒度或分辨率、表示数据的方式以及数据的规模可能会进一步加剧这种飞跃。

Note：如果是生产环境部署，建议使用 `Kubernetes` 环境管理所有容器。

## 虚机资源

共用到了2台虚机，1台作为应用服务节点，1台运维监控节点。

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| svc  | 192.168.44.168 | 服务节点 |
| ops  | 192.168.44.169 | 监控节点 |

基本选用当前最新版本，即将安装的 `Prometheus` 和 `Grafana` 版本信息如下：
* Prometheus版本：v2.54.1
* Grafana版本：11.2.0

## 系统环境

```bash
[root@ops ~]# uname -a
Linux ops 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ops ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## ops节点：docker-compose安装Prometheus与Grafana

在这里的 `docker-compose` 服务中选择当前最新版本，并采用最小化配置：明确了容器名称，指定镜像的版本信息，配置端口映射、配置与数据挂载目录等。

![2024-09-29-PrometheusVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-PrometheusVersion.jpg)

![2024-09-29-GrafanaVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-GrafanaVersion.jpg)

* [root@ops monitoring]# vi docker-compose.yml 

```yaml
version : '3.8'
services:
  prometheus:
    container_name: ops-prometheus
    image: prom/prometheus:v2.54.1
    ports:
      - '9090:9090'
    command: '--config.file=/etc/prometheus/config.yml'
    volumes:
      - './prometheus/conf/prometheus.yml:/etc/prometheus/config.yml'
      - './prometheus:/prometheus'

  grafana:
    container_name: ops-grafana
    image: grafana/grafana:11.2.0
    ports:
      - '3000:3000'
    volumes:
      - './grafana/data:/var/lib/grafana'
```

通过命令： `docker-compose up -d` 完成镜像拉取、并启动 `Prometheus` 与 `Grafana` 服务。

Note: 如果遇到报错信息，可以先给目录及文件赋权限。

```bash
chmod 777 -R /opt/monitoring/prometheus
chmod 777 -R /opt/monitoring/grafana/data
```

## 验证安装结果

先通过 `docker ps` 查看容器状态。

```bash
[root@ops ~]# docker ps
CONTAINER ID   IMAGE                     COMMAND                   CREATED       STATUS       PORTS                                       NAMES
0daa011e5706   grafana/grafana:11.2.0    "/run.sh"                 6 hours ago   Up 6 hours   0.0.0.0:3000->3000/tcp, :::3000->3000/tcp   ops-grafana
a90c10c14ef0   prom/prometheus:v2.54.1   "/bin/prometheus --c…"   6 hours ago   Up 3 hours   0.0.0.0:9090->9090/tcp, :::9090->9090/tcp   ops-prometheus
```

然后通过浏览器查看 `Prometheus` 与 `Grafana` 服务的页面。
* http://192.168.44.169:9090
* http://192.168.44.169:3000

![2024-09-29-PrometheusInstall.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-PrometheusInstall.jpg)

![2024-09-29-GrafanaInstall.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-GrafanaInstall.jpg)

Note： `Grafana` 的默认用户名为：admin；密码：admin。登录成功后建议先修改密码。

## svc节点：docker-compose安装node_exporter

有了 `Prometheus` 与 `Grafana` 的基础环境，我们来实现对部署微服务的主机状态进行监控：node_exporter是用于收集主机（服务器）性能指标的标准工具，它能够提供关于CPU、内存、磁盘、网络等各类系统资源的详细信息。

在需要监测的主机上，编辑 `docker-compose.yml ` 文件。

![2024-09-29-NodeExporterVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-NodeExporterVersion.jpg)

* [root@svc monitoring]# vi docker-compose.yml 

```yaml
version: '3'
services:
  node_exporter:
    container_name: ops-node-exporter
    image: prom/node-exporter:v1.8.2
    ports:
      - "9101:9100"
    restart: unless-stopped
```

通过命令： `docker-compose up -d` 完成镜像拉取、并启动 `node-exporter` 服务。

## 修改Prometheus配置

在 `Prometheus` 配置中增加对svc主机的抓取配置。
* [root@ops monitoring]# vi ./prometheus/conf/prometheus.yml

```yaml
scrape_configs:
  - job_name: 'ops-node'
    scrape_interval: 10s
    static_configs:
      - targets: ['192.168.44.168:9100']
```

重启 `Prometheus` 容器。

```bash
[root@ops monitoring]# docker restart ops-prometheus
```

## 验证node-exporter安装结果

* 浏览器验证metrics端点

浏览器访问http://192.168.44.168:9100/metrics

* Prometheus控制台验证node相关的指标

![2024-09-29-NodeExporterIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-NodeExporterIndex.jpg)

## 配置Grafana对主机状态的可视化

浏览器访问http://192.168.44.169:3000。

* 配置数据源
1. 点击左侧菜单中的"Add new connection"。
2. 选择或搜索"Data Sources"。
3. 点击"Add data source"并选择"Prometheus"。
4. 在"HTTP"部分输入Prometheus地址，eg：http://192.168.44.169:9090
5. 点击"Save & Test"确认连接成功。

![2024-09-29-DataSource1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-DataSource1.jpg)

![2024-09-29-DataSource2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-DataSource2.jpg)

* 查看现成的仪表板

[https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)这个页面是 `Grafana` 的官方仪表板目录，用户可以在这里找到和共享各种现成的 `Grafana` 仪表板。这些仪表板覆盖了多种监控需求，包括系统性能、应用监控、网络流量等。用户可以根据自己的需求搜索和导入适合的仪表板，提高监控效率和可视化效果。这里我们搜索 `Node Exporter` ，结果中有个 `Node Exporter Full` ，点击进去可以查看详细的UI效果，复制仪表板的id，此处是1860。

* 导入现成的仪表板

1. 在右侧菜单中点击"New"按钮，然后选择"Import"。
2. 在输入框中，可以直接输入现成仪表板的ID，或者上传JSON文件。常用的主机监控仪表板ID是1860（Node Exporter Full Dashboard）。
3. 点击"Load"，随后选择已配置好的数据源。
4. 点击"Import"完成导入。

![2024-09-29-GrafanaImport.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-GrafanaImport.jpg)

![2024-09-29-NodeExporter1860.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-NodeExporter1860.jpg)

## 监控效果

![2024-09-29-NodeExporterGrafana.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-09-29-NodeExporterGrafana.jpg)

## 小总结

本文记录了在 `Docker` 环境下使用 `docker-compose` 部署 `Prometheus` 和 `Grafana` 监控系统的过程，并通过 `node-exporter` 实现对主机状态的监控。文章介绍了 `Prometheus` 和 `Grafana` 的主要功能，提供了具体的安装步骤、配置文件示例、以及验证和可视化的操作指南。通过这些步骤可以在两台虚拟机上成功部署和运行 `Prometheus` 和 `Grafana` ，并实现对微服务主机的监控和数据可视化。

没有监控，你将无法了解你的系统环境、进行诊断故障、制定容量计划，也无法向组织提供系统的性能、成本和状态等信息。我们应该频繁地监控应用程序，以获得以下好处：
* 识别故障或异常；
* 满足响应时间预期——你绝对希望在用户报告故障之前找到问题；
* 提供更细颗粒度的数据，以识别性能的问题和趋势。

从技术角度来看，监控（Monitoring）是衡量和管理技术系统的工具和流程。后续我们将对基础环境组件进行监控，包括： `MySQL` ， `Redis` ， `Nacos` ， `Nginx` ， `MinIO` ， `InfluxDB` 等等，同时，我们也要对业务服务进行监控，eg： `Spring Boot` 技术栈的 `Actuator` 与 `JVM` 。对于许多基础组件， `Prometheus` 提供了专门的 `Exporter` 来收集指标数据。

* MySQL Exporter：可以通过MySQL Exporter收集数据库的性能指标，包括查询时间、连接数、慢查询等；
* Redis Exporter：使用Redis Exporter来监控Redis的性能指标，如内存使用、命中率、连接数等；
* Nginx Exporter：通过Nginx的状态模块和相应的Exporter获取请求数、响应时间等数据；
* MinIO Exporter：使用MinIO的Prometheus端点来监控存储桶的使用情况和请求统计；
* InfluxDB Exporter：InfluxDB也有相应的Exporter，可以监控其性能指标。

## Reference

* [https://github.com/prometheus/prometheus/releases/tag/v2.54.1](https://github.com/prometheus/prometheus/releases/tag/v2.54.1)
* [https://github.com/grafana/grafana/releases/tag/v11.2.0](https://github.com/grafana/grafana/releases/tag/v11.2.0)
* [https://github.com/prometheus/node_exporter/releases/tag/v1.8.2](https://github.com/prometheus/node_exporter/releases/tag/v1.8.2)
* [https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
