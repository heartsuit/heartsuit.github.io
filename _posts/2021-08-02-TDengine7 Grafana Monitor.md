---
layout: post
title: 7-TDengine集成Grafana实现日志数据可视化
tags: TDengine
---

### 背景

目前我们已经使用 `TDengine` 存储了大量的数据，这些数据一般要求以各种方式呈现给用户或者统计后传给上层业务。作为一款时序数据库，非常适合存储结构化的日志数据，类似于 `InfluxDB` ， `TDengine` 可以方便地与 `Grafana` 进行集成，整个过程无需任何代码开发， `TDengine` 中数据表的内容可以在仪表盘上进行可视化展现。这次我们先以 `TDengine` 自行记录的日志以及官方提供的 `tdengine-grafana.json` 数据屏来演示。

Note: `TDengine 2.1.2.0` 服务运行在 `CentOS7` 虚拟机上， `Grafana 6.2.5` 安装在 `Windows` 操作系统（Win10）上。

### 先看下效果

![2021-08-02-GrafnaDashboard.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-GrafnaDashboard.jpg)

### TDengine的Grafana插件

* 添加插件
将 `TDengine` 的 `Grafana` 插件 `/usr/local/taos/connector/grafanaplugin` 目录拷贝到 `D:\Applications\grafana-6.2.5\data\plugins\tdengine` 目录

![2021-08-02-Plugin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-Plugin.jpg)

* 启动Grafana

双击 `D:\Applications\grafana-6.2.5\bin\grafana-server.exe` 。

### 配置使用TDengine数据源

![2021-08-02-TDengine.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-TDengine.jpg)

![2021-08-02-Authentication.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-Authentication.jpg)

### 导入Dashboard

 导入插件目录下的 `tdengine-grafana.json` ： `D:\Applications\grafana-6.2.5\data\plugins\tdengine\dashboard\tdengine-grafana.json`

![2021-08-02-LoadJSON.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-LoadJSON.jpg)

![2021-08-02-Log.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-Log.jpg)

![2021-08-02-GrafanaDashboardInsert.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-GrafanaDashboardInsert.jpg)

### TDengine的日志在Grafana中展示时用到的SQL

```sql
-- req_select
select sum(req_select) from log.dn where ts >= now-1h and ts < now interval(1m)

-- req_insert
select sum(req_insert) from log.dn where ts >= now-1h and ts < now interval(1m)

-- mem_taosd
select  max(mem_taosd)  from log.dn where ts >= now -10m and ts < now

-- mem_system
select  max(mem_system)  from log.dn where ts >= now -10h and ts < now

-- band_speed
select avg(band_speed)  from log.dn where ts >= now-1h and ts < now interval(1m)

-- cpu_system11
select  avg(cpu_system) from log.dn where ts >= now-1h and ts < now  interval(1s)

-- cpu_taosd
select  avg(cpu_taosd) from log.dn where ts >= now-1h and ts < now  interval(1s)

-- avg_disk_used
select avg(disk_used)  disk_used from log.dn where ts >= '2021-07-29T01:01:46.744Z' and ts < '2021-07-29T02:01:46.744Z' interval(1s) group by fqdn
```

### 遇到的问题

在上一步的 `导入Dashboard` 中，浏览器报错：

![2021-08-02-ImportJSONError.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-08-02-ImportJSONError.jpg)

解决方法：通过源码仓库的Issues查到了类似的问题，使用更新后的 `tdengine-grafana.json` 导入即可。

[https://github.com/taosdata/TDengine/pull/6661](https://github.com/taosdata/TDengine/pull/6661)

[https://github.com/taosdata/grafanaplugin/blob/dbc5f04ebd29522d2acd0636f6fc350060d15a6b/dashboard/tdengine-grafana.json](https://github.com/taosdata/grafanaplugin/blob/dbc5f04ebd29522d2acd0636f6fc350060d15a6b/dashboard/tdengine-grafana.json)

### Reference

* [https://www.taosdata.com/cn/documentation/connections#grafana](https://www.taosdata.com/cn/documentation/connections#grafana)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
