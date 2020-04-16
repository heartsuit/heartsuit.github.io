---
layout: post
title: ElasticSearch入门（一）单节点初体验
tags: ElasticSearch
---

### 背景

- What：`ElasticSearch` 是一个分布式、RESTful风格的搜索和数据分析引擎。以下简称`ES`。

- Features: 具有近实时的全文检索能力、极其方便的横向扩展能力，怎么理解呢？可以简单理解为快、有弹性。

- Why: 我们知道要在传统的RDBMS中做搜索，尤其是全文搜索时，我们的选择基本就是`LIKE`，这在数据量大时，性能急剧下降；ES作为MySQL等关系型数据库的LIKE功能出现（当然这只是简单的类比），基于Apache的`Lucene`实现，提供RESTful风格的操作（增删改查）。随着ES生态的不断繁荣，结合`ELK`（ElasticSearch, Logstash, Kibana）技术栈，ES的口号除了全文检索，又多了数据分析。是全文检索、数据分析、统计展现的一把利器。


### 下载

到ElasticSearch官网，下载对应操作系统的版本：https://www.elastic.co/cn/start

我这里是Windows版的，目前为 `7.5.2`，完成后解压。

### 启动

打开命令行，执行：

``` bash
cd elasticsearch-7.5.2\bin
.\elasticsearch.bat
```

`ES`默认在9200端口启动，浏览器访问：http://localhost:9200

![2020-02-20-ElasticSearch-Startup.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-ElasticSearch-Startup.jpg)

此时，还可通过`_cat/health` API 查看`ES`节点的健康状态：`curl http://localhost:9200/_cat/health?v`

![2020-02-20-ElasticSearch-Health.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-ElasticSearch-Health.jpg)

可以看到节点基本信息及状态：1个节点，11个分片等

> 注意这里标出当前的`status`为`yellow`，ElasticSearch集群健康状态最佳时为`green`。现在是因为我们仅启动了一个节点，鉴于`ElasticSearch`本身极为强大的横向扩展能力，实际生产环境中都是以集群的方式提供服务，方便各节点间数据的同步以实现弹性可扩展，ES要求单节点的集群状态达不到`green`，最佳只是yellow。当然，如果状态为`red`，那就要引起注意了，集群数据有问题了。。

### 测试

单节点的ES集群跑起来了，那么接下来就可以把玩一番了，增删改查搞起来。刚开始建议用`Postman`，或者在命令行直接发出`curl`请求，方便上手，后期可以使用ELK技术栈中的`Kibana`提供的开发工具执行`DSL`。

以下以`curl`为例进行测试：

- 增

``` bash
curl -X PUT "localhost:9200/movie/_doc/1?pretty" -H 'Content-Type: application/json' -d'{"name": "Fantasy Island"}'
```

![2020-02-20-ES-INSERT.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-ES-INSERT.png)

- 查

``` bash
curl -X GET "localhost:9200/movie/_doc/1?pretty"
```

![2020-02-20-ES-SELECT.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-ES-SELECT.jpg)

- 改

``` bash
curl -X PUT "localhost:9200/movie/_doc/1?pretty" -H 'Content-Type: application/json' -d'{"name": "JOKER"}'
curl -X GET "localhost:9200/movie/_doc/1?pretty"
```

![2020-02-20-ES-Update.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-ES-Update.jpg)

- 删

``` bash
curl -X DELETE "localhost:9200/movie/_doc/1?pretty"
curl -X GET "localhost:9200/movie/_doc/1?pretty"
```

![2020-02-20-ES-DELETE.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-20-ES-DELETE.jpg)

这里仅是简单的增删改查，后续针对查询分别介绍：简单查询、条件查询、聚合查询、复合查询等。

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**

