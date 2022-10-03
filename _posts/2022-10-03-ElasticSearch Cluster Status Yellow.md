---
layout: post
title: ElasticSearch报错：FORBIDDEN/12/index read-only / allow delete (api)无法写入
tags: ElasticSearch
---

## 背景

一个两年前的读书笔记项目，在本地开发环境启动后，搜索服务的后端日志 `ElasticSearch` 报错：FORBIDDEN/12/index read-only / allow delete (api)无法写入。

> type=cluster_block_exception, reason=index [book] blocked by: [FORBIDDEN/12/index read-only / allow delete (api)]

## 问题排查

* Head插件

这时，通过**Head插件**查看 `ElasticSearch` 状态为 `Yellow` ，天哪，集群状态黄了，就问你慌不慌。。

![2022-10-03-ClusterYellow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-03-ClusterYellow.jpg)

* ElasticSearch日志

通过查看 `ElasticSearch` 的日志，可以发现持续输出一些警告：

```log
[2022-09-29T20:18:10,288][WARN ][o.e.c.r.a.DiskThresholdMonitor] [master] high disk watermark [90%] exceeded on [b9XZhdztSIivHYpah48Fcg][master][D:\Installed\ElasticSearch7\elasticsearch-7.5.2\data\nodes\0] free: 23.1gb[6.6%], shards will be relocated away from this node
[2022-09-29T20:18:10,513][INFO ][o.e.c.r.a.DiskThresholdMonitor] [master] rerouting shards: [high disk watermark exceeded on one or more nodes]
```

原来是因为我的机器磁盘空间用量超过了90%，可怜的硬盘只剩下23.1gb[6.6%]。

![2022-10-03-DiskSpace.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-10-03-DiskSpace.jpg)

## 解决方案

当磁盘空间不足 `90%` 时， `Elasticsearch` 认为这种节点的服务能力不足了。然后， `Elasticsearch` 不会将数据片分配给使用了超过90％磁盘的节点。所以会出现上述错误。

```bash
curl -X PUT "localhost:9200/book/_settings?pretty" -H 'Content-Type: application/json' -d'
{
  "index.blocks.read_only_allow_delete": null
}'
```

## 小总结

竟然是由于硬盘空间不足导致的 `ElasticSearch` 高水位报错，这种问题一般不好排查，特此记录。附：以前写的关于ElasticSearch的内容，包含 `ElasticSearch8.0` 分布式搜索引擎集群及其高可用测试。

* [ElasticSearch入门（一）单节点初体验](https://blog.csdn.net/u013810234/article/details/104418727)
* [ElasticSearch入门（二）批量导入数据（Postman与Kibana）](https://blog.csdn.net/u013810234/article/details/104465210)
* [ElasticSearch入门（三）Logstash实现MySQL数据同步至ElasticSearch](https://blog.csdn.net/u013810234/article/details/105564688)
* [ElasticSearch入门（四）常用插件：Head插件与ik分词器](https://blog.csdn.net/u013810234/article/details/105586117)
* [ElasticSearch入门（五）SpringBoot2.3.0集成ElasticSearch7.5.2-HighLevelClient](https://blog.csdn.net/u013810234/article/details/107008689)
* [ElasticSearch入门（六）SpringBoot2.3.0集成ElasticSearch7.5.2-SpringData](https://blog.csdn.net/u013810234/article/details/107029008)
* [ElasticSearch入门（七）搭建ElasticSearch集群](https://blog.csdn.net/u013810234/article/details/107032707)
* [在华为鲲鹏openEuler20.03系统上安装ElasticSearch](https://blog.csdn.net/u013810234/article/details/116943431)
* [将最新版的ElasticSearch8与Kibana8在CentOS7上跑起来](https://heartsuit.blog.csdn.net/article/details/123028697)
* [全栈开发之ElasticSearch8.0分布式搜索引擎集群及其高可用测试](https://blog.csdn.net/u013810234/article/details/123033070?spm=1001.2014.3001.5501)

## Reference

* [https://blog.csdn.net/UbuntuTouch/article/details/119748732](https://blog.csdn.net/UbuntuTouch/article/details/119748732)
* [https://www.elastic.co/guide/en/elasticsearch/reference/master/disk-usage-exceeded.html](https://www.elastic.co/guide/en/elasticsearch/reference/master/disk-usage-exceeded.html)
* [https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-cluster.html#cluster-routing-watermark-high](https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-cluster.html#cluster-routing-watermark-high)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
