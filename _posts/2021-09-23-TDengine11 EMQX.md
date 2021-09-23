---
layout: post
title: 11-TDengine集成EMQX：通过规则引擎实现设备数据直接入库
tags: TDengine
---

### 背景

曾使用过 `IoTDB` 自带的 `MQTT Broker` 实现了设备数据入库，那么使用 `TDengine` 时，我们可以借助 `EMQX` （一款优秀的国产开源 `MQTT Broker` ）的规则引擎结合 `TDengine` 的 `RESTful API` 完成设备数据的路由与入库。

* 用到的工具

1. TDengine RESTful API
2. EMQX 规则引擎
3. TDengine GUI图形化管理工具
4. Node.js下的MQTT客户端
5. 虚拟机CentOS操作系统

* 版本信息

1. TDengine: 2.2.0.0
2. EMQX: 4.2.4
3. Node.js: 12.16.1
4. CentOS: 7

### TDengine创建数据库表

```sql
create database if not exists ok;

create stable if not exists ok.power(ts timestamp, voltage int, current float, temperature float) tags(sn int, city nchar(64), groupid int);

create table if not exists ok.device1 using ok.power tags(1, "太原", 1);
create table if not exists ok.device2 using ok.power tags(2, "西安", 2);

insert into ok.device1 values("2021-09-04 21:03:38.734", 1, 1.0, 1.0);
insert into ok.device2 values("2021-09-04 21:03:40.734", 2, 2.0, 2.0);
```

初始数据如下：

![2021-09-23-InitialData.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-InitialData.jpg)

### EMQX创建资源

所谓的资源就是将要连接的数据库、中间件等，这里便是 `TDengine` 的连接，通过其 `RESTful API` 建立连接，在规则引擎的动作响应中会用到这里的资源。

![2021-09-23-TDengineResource.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-TDengineResource.jpg)

![2021-09-23-ResourceView.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-ResourceView.jpg)

其中关于头信息中的 `Authorization` 通过以下方式获得。

```bash
# 获取token
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl hadoop1:6041/rest/login/root/taosdata
{"status":"succ","code":0,"desc":"/KfeAzX/f9na8qdtNZmtONryp201ma04bEl8LcvLUd7a8qdtNZmtONryp201ma04"}

# 测试：附加自定义token在头信息，正常响应
cxzx-t580@Heartsuit MINGW64 /d/IoT
$ curl -H 'Authorization: Taosd /KfeAzX/f9na8qdtNZmtONryp201ma04bEl8LcvLUd7a8qdtNZmtONryp201ma04' -d 'select * from ok.power' hadoop1:6041/rest/sql
{"status":"succ","head":["ts","voltage","current","temperature","sn","city","groupid"],"column_meta":[["ts",9,8],["voltage",4,4],["current",6,4],["temperature",6,4],["sn",4,4],["city",10,64],["groupid",4,4]],"data":[["2021-09-04 21:03:38.734",1,1.00000,1.00000,1,"太原",1],["2021-09-04 21:03:40.734",2,2.00000,2.00000,2,"西安",2]],"rows":2}
```

### EMQX创建规则

* 创建规则：这里直接从主题`device/sn`中获取`payload`，结果命名为`power`。

![2021-09-23-RuleContent.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-RuleContent.jpg)

* 测试规则：模拟一条数据，经过测试，定义的规则成功命中。

![2021-09-23-RuleTest.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-RuleTest.jpg)

### EMQX创建动作响应

当命中数据后，我们的目标是将其存入数据库，那么我们一开始定义的 `TDengine` 资源就派上用场了。

1. `Action`选择`Data to Web Server`表示我们要将数据发送至Web服务（即 `TDengine` 的 `RESTful API`）
2. `Resource`选择我们创建好的资源
3. 最后填写`Payload Template`，写入数据表的SQL语句，这里支持插值：`insert into ok.device${power.sn} values ('${power.ts}', ${power.voltage}, ${power.currente}, ${power.temperature})`。

![2021-09-23-Action.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-Action.jpg)

### Node.js模拟MQTT客户端

这里通过 `Node.js` 模拟一个设备，向主题 `device/sn` 随机发布数据，完成数据上报，当然也可以借助其他客户端来实现。

![2021-09-23-NodeClient.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-NodeClient.jpg)

### EMQX查看规则引擎Metrics

点击 `Rule` 菜单下的规则引擎 `ID` ，可查看已配置的规则详情，还可以看到多少消息被规则命中的度量信息（需刷新页面）。

![2021-09-23-Metrics.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-Metrics.jpg)

### TDengine客户端查看数据

数据库中确认写入两条新数据：

![2021-09-23-FinalData.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-FinalData.jpg)

### 规则引擎扩展

开源版的 `EMQX Broker` 除了全面支持 `MQTT5` 新特性、多协议支持外，更强大的地方在于其围绕 `MQTT` 周边提供了一系列的 `WebHook` 、 `HTTP API` 接口以及最为核心的规则引擎。上面我们只是通过主题选择了数据进行规则匹配，其实规则引擎还可以结合一系列的内部事件，编写规则时以$开头，包括客户端连接事件、断开事件、消息确认事件、消息发布事件、订阅事件、取消订阅事件等。

![2021-09-23-RuleAdvanced.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-RuleAdvanced.jpg)

`EMQX Broker` 一开始的定位就是物联网消息中间件，目前开源版本功能已经非常强大，而企业版本与Cloud版本更是提供了高阶功能，全托管、更稳定、更可靠，技术支持更及时。以下是我试用的Cloud版本。

![2021-09-23-Cloud.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-23-Cloud.jpg)

### 可能遇到的问题

* 端口开放问题
因为通过宿主机访问虚拟机，所以记得关闭防火墙或者开放对应的端口，这里涉及到的端口有：
1. `6041`：TDengine的RESTful API默认端口
2. `1883`：EMQX的MQTT默认端口
3. `18083`：EMQX的Dashboard默认端口

```bash
# 关闭防火墙
[root@hadoop1 ~]# systemctl stop firewalld.service

# 放行端口
[root@hadoop1 ~]# iptables -I INPUT -p TCP --dport 6041 -j ACCEPT
[root@hadoop1 ~]# iptables -I INPUT -p TCP --dport 1883 -j ACCEPT
[root@hadoop1 ~]# iptables -I INPUT -p TCP --dport 18083 -j ACCEPT
```

* 主题名称不匹配导致规则无法命中

作为约定俗成的实践，一般在编码时 `MQTT` 的主题不以 `/` 开头，即写作 `device/sn` ，而不是 `/device/sn` 。

刚开始我在 `MQTT` 客户端发送数据时主题名为 `/device/sn` ，而规则引擎中的主题为 `device/sn` ，导致无法匹配。

* SQL模板中的字符串

这里的ts以字符串形式发送，因此需要将插值用引号括起来：'${power.ts}'。否则 `TDengine` 日志报错：

```bash
[root@hadoop1 taos]# tailf ./log/taosdlog.0
09/23 08:42:11.707621 00001702 TSC ERROR 0x8e async result callback, code:Syntax error in SQL
09/23 08:42:11.707675 00001696 HTP ERROR context:0x7f5f880008c0, fd:30, user:root, query error, code:Syntax error in SQL, sqlObj:0x7f5f74000c10
09/23 08:42:11.725687 00001696 HTP ERROR context:0x7f5f880008c0, fd:30, code:400, error:Syntax error in SQL
```

* 规则引擎的Metrics计数与实际发送数据不符

这与客户端发送数据指定的 `QoS` 相关，如果 `QoS = 1` ，则MQTT协议的重发机制可能导致数据重复发送。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
