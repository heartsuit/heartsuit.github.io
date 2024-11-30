---
layout: post
title: 云原生之运维监控实践-使用Prometheus与Grafana实现对ElasticSearch服务的监测
tags: Prometheus, Grafana
---

## 背景

> 如果你要为应用程序构建规范或用户故事，那么务必先把应用程序每个组件的监控指标考虑进来，千万不要等到项目结束或部署之前再做这件事情。——《Prometheus监控实战》

去年写了一篇[在Docker环境下部署若依微服务ruoyi-cloud项目](https://heartsuit.blog.csdn.net/article/details/134613312)的文章，当时使用的是 `docker-compose` 在单台机器上部署若依微服务 `ruoyi-cloud` 项目；在这个基础上，作为演示项目，我们计划实现对所有基础组件和微服务的监控。之前记录了搭建 `Prometheus` 与 `Grafana` 监控系统的过程。今天这篇文章主要是记录下对 `ElasticSearch` 服务的监测， `ElasticSearch` 自带了一个用于监控的内置端点： `_prometheus/metrics` 。

## 虚机资源

共用到了2台虚机，1台作为应用服务节点，1台运维监控节点。

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| svc  | 192.168.44.168 | 服务节点 |
| ops  | 192.168.44.169 | 监控节点 |

基本选用当前最新版本，即将安装的 `Prometheus` 和 `Grafana` 及组件版本信息如下：
* Prometheus版本：v2.54.1
* Grafana版本：11.2.0
* elasticsearch-exporter版本：v1.8.0

## 系统环境

```bash
[root@ops ~]# uname -a
Linux ops 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ops ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## ops节点：docker-compose安装Prometheus与Grafana

参考[云原生之运维监控实践-OpenEuler22.03SP3上安装Prometheus与Grafana实现主机状态监测](https://blog.csdn.net/u013810234/article/details/142589059?spm=1001.2014.3001.5501)

## svc节点：docker-compose安装elasticsearch-exporter

有了 `Prometheus` 与 `Grafana` 的基础环境，我们来实现对 `ElasticSearch` 状态的监控：通过 `elasticsearch-exporter` 快速采集 `ElasticSearch` 的指标数据，它是使用Go语言写的，端口号为：9114，供 `Prometheus` 进行采集和分析。

![2024-12-01-1-ESExporterVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-01-1-ESExporterVersion.jpg)

### 安装elasticsearch-exporter

在需要监测的主机上，编辑 `docker-compose.yml ` 文件，增加安装 `elasticsearch-exporter` 配置。

* [root@svc monitoring]# vi docker-compose.yml 

```yaml
version: '3'
services:
  ops-elasticsearch-exporter:
    container_name: ops-elasticsearch-exporter
    image: quay.io/prometheuscommunity/elasticsearch-exporter:v1.8.0
    restart: unless-stopped
    command:
      - '--es.uri=http://elastic:you-guess@192.168.44.168:9200'
      - '--es.all'
      - '--es.indices'
      - '--es.indices_settings'
      - '--es.indices_mappings'
      - '--es.shards'
      - '--es.timeout=20s'
    ports:
      - "9114:9114"
```

通过命令： `docker-compose up -d` 完成镜像拉取、并启动 `ops-elasticsearch-exporter` 服务。

### 修改Prometheus配置

在 `Prometheus` 配置中增加对svc主机上 `ElasticSearch` 运行状态的抓取配置。
* [root@ops monitoring]# vi ./prometheus/conf/prometheus.yml

```yaml
scrape_configs:
  - job_name: "ops-elasticsearch"
    scrape_interval: 60s
    scrape_timeout: 30s
    metrics_path: "/metrics"
    static_configs:
      - targets: ["192.168.44.168:9114"]

```

重启 `Prometheus` 容器。

```bash
[root@ops monitoring]# docker restart ops-prometheus
```

### 验证elasticsearch-exporter安装结果

* 浏览器验证metrics端点
浏览器访问http://192.168.44.168:9114/metrics

* Prometheus控制台验证elasticsearch相关的指标

![2024-12-01-2-ESIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-01-2-ESIndex.jpg)

### 配置Grafana对主机状态的可视化

浏览器访问http://192.168.44.169:3000。

* 配置数据源
1. 点击左侧菜单中的"Add new connection"。
2. 选择或搜索"Data Sources"。
3. 点击"Add data source"并选择"Prometheus"。
4. 在"HTTP"部分输入Prometheus地址，eg：http://192.168.44.169:9090
5. 点击"Save & Test"确认连接成功。

* 查看现成的仪表板

[https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)这个页面是 `Grafana` 的官方仪表板目录，用户可以在这里找到和共享各种现成的 `Grafana` 仪表板。这些仪表板覆盖了多种监控需求，包括系统性能、应用监控、网络流量等。用户可以根据自己的需求搜索和导入适合的仪表板，提高监控效率和可视化效果。这里我们搜索 `ElasticSearch` ，结果中有个 `ElasticSearch - Cluster` ，点击进去可以查看详细的UI效果，复制仪表板的id，此处是13071(2322也可以)。

* 导入现成的仪表板

1. 在右侧菜单中点击"New"按钮，然后选择"Import"。
2. 在输入框中，可以直接输入现成仪表板的ID，或者上传JSON文件。常用的主机监控仪表板ID是13071（ElasticSearch - Cluster）。
3. 点击"Load"，随后选择已配置好的数据源。
4. 点击"Import"完成导入。

![2024-12-01-3-ESImport.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-01-3-ESImport.jpg)

### ElasticSearch监控效果

![2024-12-01-4-ESDashboard.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-01-4-ESDashboard.jpg)

## 小总结

> If you can't measure it, you can't improve it! 

没有度量就没有改进，实际上，监控系统有以下两个**客户**：技术，业务。上述内容即是对技术组件的监控，方便技术方面的改进与优化。
本文记录了在 `Docker` 环境下通过 `Prometheus` 和 `Grafana` 实现对 `ElasticSearch` 服务的监控。具体步骤包括在服务节点上使用 `docker-compose` 安装 `elasticsearch-exporter` ，配置 `Prometheus` 抓取 `ElasticSearch` 的监控数据，并在 `Grafana` 中配置数据源和导入现成的监控仪表板，以实现对搜索引擎服务的性能监控和可视化。

## Reference

* [https://github.com/prometheus-community/elasticsearch_exporter/releases](https://github.com/prometheus-community/elasticsearch_exporter/releases)
* [https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
