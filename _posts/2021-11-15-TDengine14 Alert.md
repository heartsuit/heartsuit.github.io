---
layout: post
title: 14-TDengine安装报警模块实现报警监测Webhook回调与邮件推送
tags: TDengine
---

## 背景

在之前的关于 `TDengine` 的系列文章中，我们只介绍到了 `Server` 端与 `Client` 端，除此之外，官方还有一个报警模块，用以根据用户定义的规则实现近实时的报警监测。本文是结合 `TDengine` 官方文档的具体实践，先是结合 `Prometheus` 的 `AlertManager` 实现报警推送；然后将 `TDengine` 产生的报警信息推送到我们自己编写的 `SpringBoot` 的 `Web` 服务回调，并完成 `WebSocket` 推送、告警邮件推送。

## 场景

在一系列的监测电压、电流、温度的时序数据中，当近3分钟之内的平均温度超过50℃时，进行告警。

Note：虽然使用平均值，但这并不是一个好的实践，这里仅以平均值作为一个示例。

> 一个古老的笑话：一位统计学家跳进平均深度只有25厘米的湖中，然后差点被淹死……

![2021-11-15-Average.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-15-Average.jpg)

## 表设计

Note: 建库建表语句如下（以下是经过简化后的，仅写入两条数据，说明问题即可）：

```sql
create database if not exists iot;

create stable if not exists iot.power(ts timestamp, voltage int, currente float, temperature float) tags(sn int, city nchar(64), groupid int);

create table if not exists iot.device0 using iot.power tags(0, "太原", 0);
create table if not exists iot.device1 using iot.power tags(1, "西安", 1);

insert into iot.device0 values("2021-11-10 21:03:38.734", 1, 1.0, 1.0);
insert into iot.device1 values("2021-11-10 21:03:40.734", 2, 2.0, 2.0);
```

## TDengine的报警模块

### 下载安装

```bash
# 下载
[root@s1 ~]# cd /usr/local/
[root@hadoop1 local]# wget https://www.taosdata.com/assets-download/TDengine-alert-2.2.0.2-Linux-x64.tar.gz

# 解压安装
[root@hadoop1 local]# tar -xvf TDengine-alert-2.2.0.2-Linux-x64.tar.gz
```

### 配置文件

```bash
[root@hadoop1 local]# cd TDengine-alert

# 养成好习惯，备份配置文件
[root@hadoop1 TDengine-alert]# cp alert.cfg alert.cfg.bk

# 查看配置文件的默认内容
[root@hadoop1 TDengine-alert]# cat alert.cfg
{
    "port": 8100,
    "database": "file:alert.db",
    "tdengine": "root:taosdata@/tcp(127.0.0.1:0)/",
    "log": {
        "level": "debug",
        "path": ""
    },
    "receivers": {
        "alertManager": "http://127.0.0.1:9093/api/v1/alerts",
        "console": true
    }
}
# 配置选项的含义如下：
#     port：报警模块支持使用 restful API 对规则进行管理，这个参数用于配置 http 服务的侦听端口。
#     database：报警模块将规则保存到了一个 sqlite 数据库中，这个参数用于指定数据库文件的路径（不需要提前创建这个文件，如果它不存在，程序会自动创建它）。
#     tdengine：TDEngine 的连接信息，一般来说，数据库信息应该在报警规则中指定，所以这里 不 应包含这一部分信息。
#     log > level：日志的记录级别，可选 production 或 debug。
#     log > path：日志文件的路径。
#     receivers > alertManager：报警模块会将报警推送到 AlertManager，在这里指定 AlertManager 的接收地址。

# 可以启动啦，这里是前台启动，方便查看控制台的日志；生产环境可以用：nohup ./alert cfg alert.cfg &
[root@hadoop1 TDengine-alert]# ./alert -cfg alert.cfg
```

### 报警规则

上一步中虽然启动了报警模块，但是我们还没有配置报警规则，这个报警规则部分是需要我们自定义的。我这里新建了个 `rules` 目录，然后在其中编写 `JSON` 格式的报警规则，其实就是编写我们熟悉的 `SQL` 语句，在对应指标满足某种条件时触发的一个规则。

```json
// /usr/local/TDengine-alert/rules/sensor_rule.json
{
  "name": "temperatureTooHigh",
  "sql": "select avg(temperature) as avgTemperature from iot.power where ts > now - 3m group by sn",
  "expr": "avgTemperature > 50",
  "for": "0",
  "period": "20s",
  "labels": {
    "ruleName": "temperatureTooHigh"
  },
  "annotations": {
    "summary": "avg temperature of rule {{$labels.ruleName}} of device {{$values.sn}} is too high, its average temperature is {{$values.avgTemperature}} ℃"
  }
}
```

其中字段含义如下：

    name：用于为规则指定一个唯一的名字。
    sql：从 TDEngine 中查询数据时使用的 sql 语句，查询结果中的列将被后续计算使用，所以，如果使用了聚合函数，请为这一列指定一个别名。您可能已经注意到，本例中，这条语句和本文开头的那条完全相同。
    expr：一个计算结果为布尔型的表达式，支持算数运算、逻辑运算，并且内置了部分函数，也可以引用查询结果中的列。 当表达式计算结果为 true 时，进入报警状态。
    period：规则的检查周期，默认1分钟，而在我们的例子中，是每10秒检查一次有没有车辆超速。
    for: 一个时间长度，当布尔表达式的计算结果为 true 的持续时间超过这个选项时，才会触发报警。默认为0，表示只要计算结果为 true，就触发报警。
    labels：人为指定的标签列表，标签可以在生成报警信息时引用。特别的，如果 sql 中包含 group by 子句，则所有用于分组的字段会被自动加入这个标签列表中，在本例中，车辆的 id 会被自动加入标签列表。
    annotations：用于定义报警信息，使用 go template 语法，其中，可以通过 $labels.<label name> 引用标签，也可以通过 $values.<column name> 引用查询结果中的列。

> 将上述的规则翻译成人话：一旦监测到近3分钟之内的平均温度超过50℃时，就进行告警，每隔20s检查一次；触发规则后，使用summary中的内容组合前面定义的变量为一条完整的报警信息。

```bash
# 添加或修改规则
[root@hadoop1 rules]# curl -d '@sensor_rule.json' http://localhost:8100/api/update-rule

# 查看已有规则
[root@hadoop1 rules]# curl http://localhost:8100/api/list-rule
[{"name":"temperatureTooHigh","state":0,"sql":"select avg(temperature) as avgTemperature from iot.power where ts \u003e now - 3m group by sn","for":"0s","period":"20s","expr":"avgTemperature \u003e 50","labels":{"ruleName":"temperatureTooHigh"},"annotations":{"summary":"avg temperature of rule {{$labels.ruleName}} of device {{$values.sn}} is too high, its average temperature is {{$values.avgTemperature}} ℃"}}]
```

以上， `TDengine` 的报警模块便成功运行了，一旦有符合规则的数据，则会触发报警，报警会推送到设置的 `receivers.alertManager` URL上。现在我们还需要这个 `Web` 服务

## Prometheus的搭档：AlertManager模块

`Prometheus` 服务器没有内置警报工具，而是将警报从 `Prometheus` 服务器推送至 `AlertManager` 独立服务上。那么为什么 `TDengine` 的报警模块还要将警情信息推送到 `AlertManager` 模块，根据 `TDengine` 官方的说法：

> 考虑到Prometheus的AlertManager在报警管理方面很成熟，拥有庞大的用户群，报警模块目前将生成的报警信息都直接推送给了AlertManager，后续的管理工作，由用户在 AlertManager上完成。

既然 `TDengine` 生成的报警信息会推送到一个 `URL` 地址，这就是一个 `Webhook` 或者回调地址，当然也可以写成我们定义的地址，后续我们也会实现这个服务，将警情信息推送到我们的后端 `SpringBoot` 服务。

```bash
# 下载
[root@hadoop1 ~]# cd /usr/local/
[root@hadoop1 local]# wget https://github.com/prometheus/alertmanager/releases/download/v0.23.0/alertmanager-0.23.0.linux-amd64.tar.gz

# 解压
[root@hadoop1 local]# tar -xvf alertmanager-0.23.0.linux-amd64.tar.gz
[root@hadoop1 local]# mv alertmanager-0.23.0.linux-amd64 alertmanager
[root@hadoop1 local]# cd alertmanager

# 养成好习惯，备份配置文件，即使这里使用默认配置
[root@hadoop1 alertmanager]# cp alertmanager.yml alertmanager.yml.bk

# 启动
[root@hadoop1 alertmanager]# ./alertmanager --config.file=alertmanager.yml
```

## 模拟报警数据

```bash
# 在TDengine中模拟数据写入：近3分钟的五条数据，显然，每条数据的温度指标都高于我们设定的阈值：50℃
taos> insert into device0 values(now - 2m, 220, 5, 50) (now - 90s, 220, 5, 60) (now - 1m, 220, 5, 70) (now - 30s, 220, 5, 80) (now, 220, 5, 90);
```

## AlertManager收到的报警信息

上述模拟数据一旦写入，在20s内便会触发告警规则，同时在 `AlertManager` 的控制台： `http://hadoop1:9093` 可以看到报警信息， `AlertManager` 本身的功能很强大，不但可以配置各类推送目标：短信、邮件、钉钉扩展等，还可以保证推送消息不会重复推送，避免信息轰炸。

![2021-11-15-AlertManager.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-15-AlertManager.jpg)

## 自定义服务

关于自定义服务接口作为 `receivers` 的回调，在 `TDengine` 官方仓库中看到了这样一个 `Issue` ……既然是一个回调接口，自己实现一个就是了 O(∩_∩)O~

![2021-11-15-AlertIssue.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-15-AlertIssue.png)

下面，我们将抛弃 `Prometheus` 的黄金搭档 `AlertManager` 。让 `TDengine` 生成的报警信息不经过 `AlertManager` 而直接推送到我们定义的 `SpringBoot` 项目的 `Web` 地址上。

整个接口服务的实现操作起来也比较简单，就不多解释了，不过，这时可能遇到两个问题：

1. 接收参数需要用列表，而不是对象；
2. 自定义对象时的时间戳格式化；

![2021-11-15-Webhook.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-15-Webhook.jpg)

Note：以下是接收参数类型不匹配时的报错信息：

> JSON parse error: Cannot deserialize instance of `java.util.HashMap<java.lang.String,java.lang.Object>` out of START_ARRAY token; nested exception is com.fasterxml.jackson.databind.exc. MismatchedInputException: Cannot deserialize instance of `java.util.HashMap<java.lang.String,java.lang.Object>` out of START_ARRAY token

![2021-11-15-TypeMismatch.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-15-TypeMismatch.jpg)

然后，将 `TDengine-alert` 的配置文件 `alert.cfg` 中的 `receivers.alertManager` 改为我们服务的地址即可：

![2021-11-15-CustomReceiver.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-15-CustomReceiver.jpg)

最后，在我们的服务拿到警情信息后，还可以做进一步的处理，比如我这里就进行了 `WebSocket` 服务端推送以及邮件推送。

## Reference

* [https://www.taosdata.com/blog/2020/04/14/1438.html](https://www.taosdata.com/blog/2020/04/14/1438.html)
* [https://github.com/taosdata/tdengine/blob/master/alert/README_cn.md](https://github.com/taosdata/tdengine/blob/master/alert/README_cn.md)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
