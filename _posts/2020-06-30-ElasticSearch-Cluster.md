---
layout: post
title: ElasticSearch入门（七）搭建ElasticSearch集群
tags: ElasticSearch
---

### 背景

前面我们使用单节点时，在`Kibana`看到`ElasticSearch`的状态是`yellow`，引用第一篇文章的说明：

![2020-06-30-ES-No-Cluster.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-06-30-ES-No-Cluster.png)

> 注意这里标出当前的`status`为`yellow`，ElasticSearch集群健康状态最佳时为`green`。现在是因为我们仅启动了一个节点，鉴于`ElasticSearch`本身极为强大的横向扩展能力，实际生产环境中都是以集群的方式提供服务，方便各节点间数据的同步以实现弹性可扩展，ES要求单节点的集群状态达不到`green`，最佳只是yellow。当然，如果状态为`red`，那就要引起注意了，集群数据有问题了。。

了解了`ElasticSearch`的基本操作，接下来试试`ElasticSearch`的集群搭建：

- ES集群扩容极其便捷；
- 可以避免单点故障；
- 实现负载均衡，应对高并发场景；

### 配置

采用3个节点，单机模拟集群环境，不同的节点端口不同，伪集群。将之前的单节点再复制两份，组成3个服务，各自的`elasticsearch.yml`配置如下：

- 节点0配置（主节点）

```yml
# cors
http.cors.enabled: true
http.cors.allow-origin: "*"

# cluster
cluster.name: heartsuit
node.name: master
node.master: true
network.host: 127.0.0.1
```

- 节点1配置

```yml
# cors
http.cors.enabled: true
http.cors.allow-origin: "*"

# cluster
cluster.name: heartsuit
node.name: slave01
network.host: 127.0.0.1
http.port: 9210
discovery.zen.ping.unicast.hosts: ["127.0.0.1","127.0.0.1:9210","127.0.0.1:9220"]
```

- 节点2配置

```yml
# cors
http.cors.enabled: true
http.cors.allow-origin: "*"

# cluster
cluster.name: heartsuit
node.name: slave02
network.host: 127.0.0.1
http.port: 9220
discovery.zen.ping.unicast.hosts: ["127.0.0.1","127.0.0.1:9210","127.0.0.1:9220"]
```

Notes: 
1. 关于报错：由于之前的单节点在运行后，已经有了data，若直接启动上述3个节点，报错：`with the same id but is a different node instance`，解决方法是，将复制出的两个节点下的data目录删除，重新启动即可，master节点的data将会自动同步过来。

2. 关于配置：集群环境下，配置需要注意：
- 所有的节点的`cluster.name`均相同，表示属于一个集群；
- 所有的节点的`node.name`不可相同，用以标识不同的节点；
- 由于使用单机模拟，端口不同（`http.port`），实际生产环境可部署至不同的机器，采用相同的端口；
- 其中`discovery.zen.ping.unicast.hosts`用于指定集群的seed nodes ip集合，可指定端口，默认`transport.profiles.default.port`或者`transport.port`，仔细观察两个slave节点，可以看到有如下输出，即：ES会自动调整`transport.port`：
    - slave01: `published_address {127.0.0.1:9301},bound_addresses {127.0.0.1:9301}`；
    - slave01: `published_address {127.0.0.1:9302},bound_addresses {127.0.0.1:9302}`；

### 测试

- 使用API查看集群信息

1. 查看集群节点状况：`http://localhost:9210/_cat/nodes` 其中带*的表示主节点

```
127.0.0.1 28 75 20    dilm - slave01
127.0.0.1 35 75 20    dilm * master
127.0.0.1 22 75 20    dilm - slave02
```

2. 查看集群健康状况: `http://localhost:9200/_cluster/health`

```json
{
  "cluster_name": "heartsuit",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 3,
  "number_of_data_nodes": 3,
  "active_primary_shards": 4,
  "active_shards": 8,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 100
}
```
重点关注`status`：

`red`: 数据不完整
`yellow`: 数据完整，但是没有完整的副本
`green`: 一切正常，有完整的主版本和副本

- 使用`Head`插件查看ES集群信息

![2020-06-30-ES-Cluster-Head.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-06-30-ES-Cluster-Head.png)

Note: `Head`插件的使用可参考[https://blog.csdn.net/u013810234/article/details/105586117](https://blog.csdn.net/u013810234/article/details/105586117)


- 使用`Kibana`查看ES集群信息

![2020-06-30-ES-Cluster-Kibana.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-06-30-ES-Cluster-Kibana.png)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***