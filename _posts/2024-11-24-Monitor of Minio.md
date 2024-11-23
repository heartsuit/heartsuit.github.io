---
layout: post
title: 云原生之运维监控实践-使用Prometheus与Grafana实现对MinIO服务的监测
tags: Prometheus, Grafana
---

## 背景

> 如果你要为应用程序构建规范或用户故事，那么务必先把应用程序每个组件的监控指标考虑进来，千万不要等到项目结束或部署之前再做这件事情。——《Prometheus监控实战》

去年写了一篇[在Docker环境下部署若依微服务ruoyi-cloud项目](https://heartsuit.blog.csdn.net/article/details/134613312)的文章，当时使用的是 `docker-compose` 在单台机器上部署若依微服务 `ruoyi-cloud` 项目；在这个基础上，作为演示项目，我们计划实现对所有基础组件和微服务的监控。之前记录了搭建 `Prometheus` 与 `Grafana` 监控系统的过程。今天这篇文章主要是记录下对分布式文件存储 `MinIO` 服务的监测。

## 虚机资源

共用到了2台虚机，1台作为应用服务节点，1台运维监控节点。

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| svc  | 192.168.44.168 | 服务节点 |
| ops  | 192.168.44.169 | 监控节点 |

基本选用当前最新版本，即将安装的 `Prometheus` 和 `Grafana` 及组件版本信息如下：
* Prometheus版本：v2.54.1
* Grafana版本：11.2.0
* MinIO版本：RELEASE.2024-11-07T00-52-20Z

## 系统环境

```bash
[root@ops ~]# uname -a
Linux ops 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ops ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## ops节点：docker-compose安装Prometheus与Grafana

参考[云原生之运维监控实践-OpenEuler22.03SP3上安装Prometheus与Grafana实现主机状态监测](https://blog.csdn.net/u013810234/article/details/142589059?spm=1001.2014.3001.5501)

## svc节点：MinIO服务

无需 `exporter` ， `MinIO` 本身支持 `Prometheus` 集成，因此只需要简单配置即可开始监控其运行状况、性能和相关指标。

### 生成抓取配置

> 安全起见，这里以带认证的方式抓取监测数据。如果以匿名方式开启，可以使用环境变量：MINIO_PROMETHEUS_AUTH_TYPE=public

下载 `mc` 客户端工具，通过 `mc admin prometheus generate <ALIAS>` 命令生成 `Prometheus` 抓取配置。

```bash
./mc admin prometheus generate my-minio
./mc admin prometheus generate my-minio bucket
./mc admin prometheus generate my-minio resource
./mc admin prometheus generate my-minio node
```

具体命令执行结果如下（实际对结果中的 `job_name` 以及 `localhost` 进行了修改，具体见后面的 `prometheus` 配置）：

```bash
[root@svc minio-bucket]# ./mc alias set my-minio http://localhost:9000 myMinio youGuess
Added `my-minio` successfully.
[root@svc minio-bucket]# ./mc admin prometheus generate my-minio
scrape_configs:
- job_name: minio-job
  bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIwNH0.TJCvrtlu_DeGW2lVr6JDPUinRZk8gTGAk7wKXhAilg2XApJHdMIY_1KITkbw1lpiv5G56Mi1mUjzOHrEwG40Sw
  metrics_path: /minio/v2/metrics/cluster
  scheme: http
  static_configs:
  - targets: ['localhost:9000']

[root@svc minio-bucket]# ./mc admin prometheus generate my-minio bucket
scrape_configs:
- job_name: minio-job-bucket
  bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIxNX0.PizTh7TFF93I2tEj4s_8C8mL08fjKPE661ADcg9N1HeYpUz6MpSwqwWuHKB41VDafdIkw81kdtNKisZGzoC39A
  metrics_path: /minio/v2/metrics/bucket
  scheme: http
  static_configs:
  - targets: ['localhost:9000']

[root@svc minio-bucket]# ./mc admin prometheus generate my-minio resource
scrape_configs:
- job_name: minio-job-resource
  bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIxOH0.0yY305xDG6fcPl0Bj18PFzS8U0LeSZl7QOz_rn4bU_7h6RLfMJ-u74W_rKZEMed115FDD5Ti5WM9MYtBx_d0tA
  metrics_path: /minio/v2/metrics/resource
  scheme: http
  static_configs:
  - targets: ['localhost:9000']

[root@svc minio-bucket]# ./mc admin prometheus generate my-minio node
scrape_configs:
- job_name: minio-job-node
  bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIyMn0.rmf4_xB0nS8PVUuAJnYp6S5Wyqo8y4YUzOTjXwjRhr6pXn0-y-Bi60IIo2vJQUUSOFrtbNuehEkt_FhEeplnjA
  metrics_path: /minio/v2/metrics/node
  scheme: http
  static_configs:
  - targets: ['localhost:9000']
```

### 修改Prometheus配置

在 `Prometheus` 配置中增加对svc主机上 `MinIO` 运行状态的抓取配置。
* [root@ops monitoring]# vi ./prometheus/conf/prometheus.yml

```yaml
scrape_configs:
  - job_name: ops-minio-job
    bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIwNH0.TJCvrtlu_DeGW2lVr6JDPUinRZk8gTGAk7wKXhAilg2XApJHdMIY_1KITkbw1lpiv5G56Mi1mUjzOHrEwG40Sw
    metrics_path: /minio/v2/metrics/cluster
    scheme: http
    static_configs:
    - targets: ['192.168.44.168:9000']

  - job_name: ops-minio-job-bucket
    bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIxNX0.PizTh7TFF93I2tEj4s_8C8mL08fjKPE661ADcg9N1HeYpUz6MpSwqwWuHKB41VDafdIkw81kdtNKisZGzoC39A
    metrics_path: /minio/v2/metrics/bucket
    scheme: http
    static_configs:
    - targets: ['192.168.44.168:9000']

  - job_name: ops-minio-job-resource
    bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIxOH0.0yY305xDG6fcPl0Bj18PFzS8U0LeSZl7QOz_rn4bU_7h6RLfMJ-u74W_rKZEMed115FDD5Ti5WM9MYtBx_d0tA
    metrics_path: /minio/v2/metrics/resource
    scheme: http
    static_configs:
    - targets: ['192.168.44.168:9000']

  - job_name: ops-minio-job-node
    bearer_token: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJwcm9tZXRoZXVzIiwic3ViIjoibWluaW9BZG1pbiIsImV4cCI6NDg4NTk0ODIyMn0.rmf4_xB0nS8PVUuAJnYp6S5Wyqo8y4YUzOTjXwjRhr6pXn0-y-Bi60IIo2vJQUUSOFrtbNuehEkt_FhEeplnjA
    metrics_path: /minio/v2/metrics/node
    scheme: http
    static_configs:
    - targets: ['192.168.44.168:9000']
```

重启 `Prometheus` 容器。

```bash
[root@ops monitoring]# docker restart ops-prometheus
```

### 验证MinIO抓取配置

* 验证metrics端点

1. http://192.168.44.168:9000/minio/v2/metrics/cluster
2. http://192.168.44.168:9000/minio/v2/metrics/bucket

由于我使用的是带认证方式的抓取配置，因此上述的指标端点不能在浏览器中直接打开访问；下面是在 `Postman` 中测试的结果。

![2024-11-24-6-Metrics.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-11-24-6-Metrics.jpg)

* Prometheus控制台验证minio相关的指标

![2024-11-24-3-MinIOIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-11-24-3-MinIOIndex.jpg)

### 配置Grafana对主机状态的可视化

浏览器访问http://192.168.44.169:3000。

* 配置数据源
1. 点击左侧菜单中的"Add new connection"。
2. 选择或搜索"Data Sources"。
3. 点击"Add data source"并选择"Prometheus"。
4. 在"HTTP"部分输入Prometheus地址，eg：http://192.168.44.169:9090
5. 点击"Save & Test"确认连接成功。

* 查看现成的仪表板

[https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)这个页面是 `Grafana` 的官方仪表板目录，用户可以在这里找到和共享各种现成的 `Grafana` 仪表板。这些仪表板覆盖了多种监控需求，包括系统性能、应用监控、网络流量等。用户可以根据自己的需求搜索和导入适合的仪表板，提高监控效率和可视化效果。这里我们搜索 `MinIO` ，结果中有个 `MinIO Dashboard` 监控Server， `MinIO Bucket Dashboard` 监控Bucket，点击进去可以查看详细的UI效果，复制仪表板的id，两个ID分别如下：

1. 13502 MinIO Dashboard
2. 19237 MinIO Bucket Dashboard

* 导入现成的仪表板

1. 在右侧菜单中点击"New"按钮，然后选择"Import"。
2. 在输入框中，可以直接输入现成仪表板的ID，或者上传JSON文件。常用的主机监控仪表板ID是13502（MinIO Dashboard），19237（MinIO Bucket Dashboard）。
3. 点击"Load"，随后选择已配置好的数据源。
4. 点击"Import"完成导入。

![2024-11-24-1-ImportServer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-11-24-1-ImportServer.jpg)

![2024-11-24-2-ImportBucket.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-11-24-2-ImportBucket.jpg)

### MinIO监控效果

![2024-11-24-4-DashboardServer.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-11-24-4-DashboardServer.jpg)

![2024-11-24-5-DashboardBucket.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-11-24-5-DashboardBucket.jpg)

## 遇到的问题

> Fatal glibc error: CPU does not support x86-64-v2

参考 `Issues` 解决：https://github.com/minio/minio/issues/18365

## 小总结

> If you can't measure it, you can't improve it! 

没有度量就没有改进，实际上，监控系统有以下两个**客户**：技术，业务。上述内容即是对技术组件的监控，方便技术方面的改进与优化。
本文记录了在 `Docker` 环境下通过 `Prometheus` 和 `Grafana` 实现对 `MinIO` 服务的监控。具体步骤包括在服务节点上使用 `mc` 生成抓取配置 ，配置 `Prometheus` 抓取 `MinIO` 的监控数据，并在 `Grafana` 中配置数据源和导入现成的监控仪表板，以实现对分布式对象存储服务的性能监控和可视化。

## Reference

* [https://github.com/minio/minio/tags](https://github.com/minio/minio/tags)
* [https://min.io/docs/minio/container/operations/monitoring/collect-minio-metrics-using-prometheus.html](https://min.io/docs/minio/container/operations/monitoring/collect-minio-metrics-using-prometheus.html)
* [https://min.io/docs/minio/linux/operations/monitoring/grafana.html#minio-server-grafana-metrics](https://min.io/docs/minio/linux/operations/monitoring/grafana.html#minio-server-grafana-metrics)
* [https://grafana.com/grafana/dashboards/](https://grafana.com/grafana/dashboards/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
