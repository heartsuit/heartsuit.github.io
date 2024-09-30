---
layout: post
title: 云原生之运维监控实践-使用Prometheus与Grafana实现对MySQL和Redis服务的监测
tags: Prometheus, Grafana
---

## 背景

> 如果你要为应用程序构建规范或用户故事，那么务必先把应用程序每个组件的监控指标考虑进来，千万不要等到项目结束或部署之前再做这件事情。——《Prometheus监控实战》

去年写了一篇[在Docker环境下部署若依微服务ruoyi-cloud项目](https://heartsuit.blog.csdn.net/article/details/134613312)的文章，当时使用的是 `docker-compose` 在单台机器上部署若依微服务 `ruoyi-cloud` 项目；在这个基础上，作为演示项目，我们计划实现对所有基础组件和微服务的监控。上一篇文章记录了搭建 `Prometheus` 与 `Grafana` 监控系统的过程，并通过 `node-exporter` 实现对部署微服务的主机状态进行监控。今天这篇文章主要是记录下对 `MySQL` 和 `Redis` 服务的监测，用到的 `exporter` 是： `prom/mysqld-exporter` ， `oliver006/redis_exporter` 。

## 虚机资源

共用到了2台虚机，1台作为应用服务节点，1台运维监控节点。

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| svc  | 192.168.44.168 | 服务节点 |
| ops  | 192.168.44.169 | 监控节点 |

基本选用当前最新版本，即将安装的 `Prometheus` 和 `Grafana` 及组件版本信息如下：
* Prometheus版本：v2.54.1
* Grafana版本：11.2.0
* mysqld-exporter版本：v0.14.0
* redis_exporter版本：v1.63.0

## 系统环境

```bash
[root@ops ~]# uname -a
Linux ops 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ops ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## ops节点：docker-compose安装Prometheus与Grafana

参考[云原生之运维监控实践-OpenEuler22.03SP3上安装Prometheus与Grafana实现主机状态监测](https://blog.csdn.net/u013810234/article/details/142589059?spm=1001.2014.3001.5501)

## svc节点：docker-compose安装mysqld-exporter

有了 `Prometheus` 与 `Grafana` 的基础环境，我们来实现对数据库 `MySQL` 状态的监控：通过 `mysqld-exporter` 快速采集连接数，锁，内存，网络等指标，通过这些指标我们能及时发现 `MySQL` 瓶颈、死锁等问题，实现对 `MySQL` 数据库性能以及资源利用率的监控和度量。

![2024-10-01-1-MySQLVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-1-MySQLVersion.jpg)

### 安装mysqld-exporter

在需要监测的主机上，编辑 `docker-compose.yml ` 文件。

* [root@svc monitoring]# vi docker-compose.yml 

```yaml
version: '3'
services:
  mysqlexporter:
    container_name: ops-mysqld-exporter
    image: prom/mysqld-exporter:v0.14.0
    ports:
      - "9104:9104"
    restart: unless-stopped
    environment:
      - DATA_SOURCE_NAME=exporter:you-guess@(192.168.44.168:3306)/mine-cloud
```

通过命令： `docker-compose up -d` 完成镜像拉取、并启动 `ops-mysqld-exporter` 服务。

Note: 安全起见，对 `MySQL` 服务监控时不要使用管理用户建立连接，只要能够获取到监测指标即可，因此此处建议新增**专用的有限权限的用户**进行采集：

```sql
create user 'exporter'@'%' identified by 'you-guess';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'%'  WITH MAX_USER_CONNECTIONS 3;
flush privileges;
```

### 修改Prometheus配置

在 `Prometheus` 配置中增加对svc主机上 `MySQL` 运行状态的抓取配置。
* [root@ops monitoring]# vi ./prometheus/conf/prometheus.yml

```yaml
scrape_configs:
  - job_name: 'ops-mysql'
    scrape_interval: 15s
    static_configs:
      - targets:
        - 1192.168.44.168:9104      
```

重启 `Prometheus` 容器。

```bash
[root@ops monitoring]# docker restart ops-prometheus
```

### 验证mysqld-exporter安装结果

* 浏览器验证metrics端点

浏览器访问http://192.168.44.168:9104/metrics

* Prometheus控制台验证mysql相关的指标

![2024-10-01-1-MySQLIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-1-MySQLIndex.jpg)

### 配置Grafana对主机状态的可视化

浏览器访问http://192.168.44.169:3000。

* 配置数据源
1. 点击左侧菜单中的"Add new connection"。
2. 选择或搜索"Data Sources"。
3. 点击"Add data source"并选择"Prometheus"。
4. 在"HTTP"部分输入Prometheus地址，eg：http://192.168.44.169:9090
5. 点击"Save & Test"确认连接成功。

* 查看现成的仪表板

[https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)这个页面是 `Grafana` 的官方仪表板目录，用户可以在这里找到和共享各种现成的 `Grafana` 仪表板。这些仪表板覆盖了多种监控需求，包括系统性能、应用监控、网络流量等。用户可以根据自己的需求搜索和导入适合的仪表板，提高监控效率和可视化效果。这里我们搜索 `MySQL` ，结果中有个 `MySQL Overview` ，点击进去可以查看详细的UI效果，复制仪表板的id，此处是7362。

* 导入现成的仪表板

1. 在右侧菜单中点击"New"按钮，然后选择"Import"。
2. 在输入框中，可以直接输入现成仪表板的ID，或者上传JSON文件。常用的主机监控仪表板ID是7362（MySQL Overview）。
3. 点击"Load"，随后选择已配置好的数据源。
4. 点击"Import"完成导入。

![2024-10-01-2-MySQLCode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-2-MySQLCode.jpg)

### MySQL监控效果

![2024-10-01-3-MySQLGrafana.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-3-MySQLGrafana.jpg)

## svc节点：docker-compose安装redis_exporter

有了 `Prometheus` 与 `Grafana` 的基础环境，我们来实现对缓存服务 `Redis` 状态的监控：通过 `redis_exporter` 快速收集和暴露 `Redis` 服务器的各种性能指标，包括内存使用情况、连接数、命中率、慢查询等，通过这些指标我们能及时发现 `Redis` 瓶颈，可以更好地管理和优化 `Redis` 实例的性能，确保系统的稳定性和高效性。

![2024-10-01-4-RedisVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-4-RedisVersion.jpg)

### 安装redis_exporter

在需要监测的主机上，编辑 `docker-compose.yml ` 文件。

* [root@svc monitoring]# vi docker-compose.yml 

```yaml
version: '3'
services:
  redis_exproter:
    container_name: ops-redis-exporter
    image: oliver006/redis_exporter:v1.63.0
    environment:
      REDIS_ADDR: "192.168.44.168:6379"
      REDIS_PASSWORD: you-guess
    ports:
      - "9121:9121"
    restart: unless-stopped
```

通过命令： `docker-compose up -d` 完成镜像拉取、并启动 `ops-redis-exporter` 服务。

### 修改Prometheus配置

在 `Prometheus` 配置中增加对svc主机上 `Redis` 运行状态的抓取配置。
* [root@ops monitoring]# vi ./prometheus/conf/prometheus.yml

```yaml
scrape_configs:
  - job_name: 'ops-redis'
    scrape_interval: 15s
    static_configs:
      - targets:
        - 192.168.44.168:9121   
```

重启 `Prometheus` 容器。

```bash
[root@ops monitoring]# docker restart ops-prometheus
```

### 验证redis_exporter安装结果

* 浏览器验证metrics端点

浏览器访问http://192.168.44.168:9121/metrics

* Prometheus控制台验证redis相关的指标

![2024-10-01-4-RedisIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-4-RedisIndex.jpg)

### 配置Grafana对主机状态的可视化

浏览器访问http://192.168.44.169:3000。

* 配置数据源
1. 点击左侧菜单中的"Add new connection"。
2. 选择或搜索"Data Sources"。
3. 点击"Add data source"并选择"Prometheus"。
4. 在"HTTP"部分输入Prometheus地址，eg：http://192.168.44.169:9090
5. 点击"Save & Test"确认连接成功。

* 查看现成的仪表板

[https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)这个页面是 `Grafana` 的官方仪表板目录，用户可以在这里找到和共享各种现成的 `Grafana` 仪表板。这些仪表板覆盖了多种监控需求，包括系统性能、应用监控、网络流量等。用户可以根据自己的需求搜索和导入适合的仪表板，提高监控效率和可视化效果。这里我们搜索 `Redis Exporter` ，结果中有个 `Redis Dashboard for Prometheus Redis Exporter 1.x` ，点击进去可以查看详细的UI效果，复制仪表板的id，此处是763（也可以用1，仪表板的ID为17507）。

* 导入现成的仪表板

1. 在右侧菜单中点击"New"按钮，然后选择"Import"。
2. 在输入框中，可以直接输入现成仪表板的ID，或者上传JSON文件。常用的主机监控仪表板ID是763（Redis Dashboard for Prometheus Redis Exporter 1.x）。
3. 点击"Load"，随后选择已配置好的数据源。
4. 点击"Import"完成导入。

![2024-10-01-5-RedisCode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-5-RedisCode.jpg)

### Redis监控效果

![2024-10-01-6-RedisGrafana.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-10-01-6-RedisGrafana.jpg)

## 小总结

> If you can't measure it, you can't improve it! 

没有度量就没有改进，实际上，监控系统有以下两个**客户**：技术，业务。上述内容即是对技术组件的监控，方便技术方面的改进与优化。
本文记录了在 `Docker` 环境下通过 `Prometheus` 和 `Grafana` 实现对 `MySQL` 和 `Redis` 服务的监控。具体步骤包括在服务节点上使用 `docker-compose` 安装 `mysqld-exporter` 和 `redis_exporter` ，配置 `Prometheus` 抓取 `MySQL` 和 `Redis` 的监控数据，并在 `Grafana` 中配置数据源和导入现成的监控仪表板，以实现对数据库和缓存服务的性能监控和可视化。

## Reference

* [https://github.com/prometheus/mysqld_exporter/releases/tag/v0.14.0](https://github.com/prometheus/mysqld_exporter/releases/tag/v0.14.0)
* [https://github.com/oliver006/redis_exporter/releases/tag/v1.63.0](https://github.com/oliver006/redis_exporter/releases/tag/v1.63.0)
* [https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
