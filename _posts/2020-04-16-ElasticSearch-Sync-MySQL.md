---
layout: post
title: ElasticSearch入门（三）Logstash实现MySQL数据同步至ElasticSearch
tags: ElasticSearch
---

### 背景

前一篇中实现了向`ElasticSearch`中批量插入数据，今天我们体验下生产环境中常用的`Logstash`实现MySQL数据库到`ElasticSearch`的同步。

### 数据同步中间件

关于MySQL数据同步至ES，Github上的中间件有：
- alibaba/cannal
- siddontang/go-mysql-elasticsearch
- Logstash（ES官方）

> Logstash 是动态数据收集管道，拥有可扩展的插件生态系统。Logstash 是开源的服务器端数据处理管道，能够同时从多个来源采集数据，转换数据，然后将数据发送到您最喜欢的“存储库”中。

### 配置准备

- jar包依赖：mysql-connector-java

1. 下载jar包（或直接在本地的Maven仓库.m2下找）：mysql-connector-java-8.0.19.jar；
2. 将jar包放到logstash-7.5.2目录下，稍后在配置中指向该路径；

- 配置MySQL与ES同步

在`logstash-7.5.2/config`下新建`mysql.conf`文件：

```conf
input{
    jdbc{
        jdbc_driver_library => "../mysql-connector-java-8.0.19.jar"
        jdbc_driver_class => "com.mysql.cj.jdbc.Driver"
        jdbc_connection_string => "jdbc:mysql://127.0.0.1:3306/zfjt-oa?serverTimezone=Asia/Shanghai"
        jdbc_user => "root"
        jdbc_password => "root"
        schedule => "* * * * *"
        clean_run => true
        statement => "select * FROM demo_employee WHERE create_time > :sql_last_value AND create_time < NOW() ORDER BY create_time desc"
    }
}

output {
    elasticsearch{
        hosts => ["127.0.0.1:9200"]
        index => "hero"
        document_id => "%{id}"
    }
}
```

以上配置了连接本地数据库`zfjt-oa`，将表`demo_employee`同步至ES中的`hero`索引。

### 开启同步

- 当然，首先启动ES，同步前先看下ES中有哪些索引

![2020-04-16-ES-Before.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-16-ES-Before.png)

可以看到仅有一个之前的movie索引。

- 启动`Logstash`：在logstash的bin目录下执行：`logstash -f ../config/mysql.conf`

![2020-04-16-ES-Start-Logstash.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-16-ES-Start-Logstash.png)

### 检查同步结果

- 已创建新的索引`hero`

![2020-04-16-ES-After.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-16-ES-After.png)

- 查看索引`hero`中的数据

这里方便查看，使用了`elasticsearch-head`插件

![2020-04-16-ES-Hero.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-16-ES-Hero.png)

- 在`MySQL`中改动（CRUD，这里以新增为例）一条数据

![2020-04-16-ES-MySQL.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-16-ES-MySQL.png)

- 检查ES中是否同步成功

![2020-04-16-ES-Hero-2.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-16-ES-Hero-2.png)

Done~

下一篇主要介绍两个常用插件：`elasticsearch-head`，`elasticsearch-analysis-ik`

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***

