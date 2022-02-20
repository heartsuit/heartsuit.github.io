---
layout: post
title: 全栈开发之ElasticSearch8.0分布式搜索引擎集群及其高可用测试
tags: SpringBoot, ElasticSearch
---

## 背景

如今人们的行为在网络中的各类系统中留下了清晰的足迹，各行各业的数据都在源源不断地产生着：收集的日志数据越积越多，用户的订单数据越来越多，网络爬取得到的数据不断增长，在这些可能用到搜索引擎的场景中，将搜索服务升级为集群以保证高可用是不得不面临的一个操作。好在 `ElasticSearch` 本身具备极为强大的横向扩展能力，所以这项工作操作起来并不太难。

学习一项新技术，实践是最好的方式，这不， `ElasticSearch` 8.0来了；今天就来试试 `ElasticSearch` 的分布式集群搭建，并验证其高可用。

![2022-02-20-ElasticSearchCluster.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-20-ElasticSearchCluster.jpg)

## 系统环境

在三台虚拟主机上，搭建3个节点的 `ElasticSearch` 的搜索引擎集群，三台主机配置相同，主机信息如下：

```bash
[root@hadoop1 local]# uname -a
Linux hadoop1 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
[root@hadoop1 local]# cat /proc/version
Linux version 3.10.0-1127.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 31 23:36:51 UTC 2020
[root@hadoop1 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)
```

```bash
内存：4G
处理器：2*2
硬盘：100G
```

Note：三台主机的名称分别为 `hadoop1` ， `hadoop2` ， `hadoop3` 。

## 集群配置

`ElasticSearch` 8.0的集群配置相对刚方便一些，只需要将第一个实例上生成的 `enrollment token` 附带上，在后续的两个节点上执行启动命令即可。

其实在第一个 `ElasticSearch` 实例运行成功后，控制台输出了以下内容：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Elasticsearch security features have been automatically configured!
✅ Authentication is enabled and cluster connections are encrypted.

Password for the elastic user (reset with `bin/elasticsearch-reset-password -u elastic`):
  9SWTTFDuibtaS2*L0NRv

HTTP CA certificate SHA-256 fingerprint:
  75480a9fc93649e2ebd8dd0a9f0721247e8cff32fdbc78abf0b30d7ac9c8e8bd

Configure Kibana to use this cluster:
• Run Kibana and click the configuration link in the terminal when Kibana starts.
• Copy the following enrollment token and paste it into Kibana in your browser (valid for the next 30 minutes):
  eyJ2ZXIiOiI4LjAuMCIsImFkciI6WyIxOTIuMTY4LjQ0LjEyNzo5MjAwIl0sImZnciI6Ijc1NDgwYTlmYzkzNjQ5ZTJlYmQ4ZGQwYTlmMDcyMTI0N2U4Y2ZmMzJmZGJjNzhhYmYwYjMwZDdhYzljOGU4YmQiLCJrZXkiOiJWYjg0RW44QnVQdHBqaU9BTUgxZjpnNFpjeUFDWVJYQ2xLRVp2eXF3U3RBIn0=

Configure other nodes to join this cluster:
• On this node:
  ⁃ Create an enrollment token with `bin/elasticsearch-create-enrollment-token -s node`.
  ⁃ Uncomment the transport.host setting at the end of config/elasticsearch.yml.
  ⁃ Restart Elasticsearch.
• On other nodes:
  ⁃ Start Elasticsearch with `bin/elasticsearch --enrollment-token <token>`, using the enrollment token that you generated.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

其中，写明了构建集群的步骤：

* 在第一个实例上的操作：
1. 先在第一个实例上创建`enrollment token`；
2. 将配置文件`config/elasticsearch.yml`中的`transport.host`取消注释；
3. 重启当前实例；

* 在后续节点上执行启动命令，附带`enrollment token`: `bin/elasticsearch --enrollment-token <token>`

至此，集群配置完成。

![2022-02-20-ThreeNodes.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-20-ThreeNodes.jpg)

* 完整搭建过程

在三个节点上执行以下命令完成，下载、安装、启动。

```bash
[root@hadoop1 ~]# cd /usr/local/
[root@hadoop1 local]# wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.0.0-linux-x86_64.tar.gz
[root@hadoop1 local]# tar -xvf elasticsearch-8.0.0-linux-x86_64.tar.gz
[root@hadoop1 local]# mv elasticsearch-8.0.0 elasticsearch
[root@hadoop1 local]# cd elasticsearch

# 添加用户es-admin
[root@hadoop1 elasticsearch]# useradd es-admin
# 赋予对elasticsearch目录的权限
[root@hadoop1 elasticsearch]# chown -R es-admin:es-admin /usr/local/elasticsearch
# 切换至es-admin
[root@hadoop1 elasticsearch]# su es-admin
# 切换至root
[es-admin@hadoop1 elasticsearch]$ exit
exit

# 编辑vi /etc/security/limits.conf，在最后添加以下内容，注意要退出root用户重新登录后才会生效
[root@hadoop1 elasticsearch]# vi /etc/security/limits.conf
*               soft    nofile          65536
*               hard    nofile          65536

# 编辑vi /etc/sysctl.conf，在最后添加：
[es-admin@hadoop1 elasticsearch]$ vi /etc/sysctl.conf
vm.max_map_count = 262144

# 记得使用sysctl -p刷新配置文件
[root@hadoop1 elasticsearch]# sysctl -p

# 切换到es-admin用户
[root@hadoop1 elasticsearch]# su es-admin

# 尝试启动ElasticSearch
[es-admin@hadoop1 elasticsearch]$ ./bin/elasticsearch
```

* 后续节点加入过程

```bash
# 在第一个实例上执行获取token
[root@hadoop1 elasticsearch]# ./bin/elasticsearch-create-enrollment-token -s node
warning: ignoring JAVA_HOME=/usr/local/jdk; using bundled JDK
eyJ2ZXIiOiI4LjAuMCIsImFkciI6WyIxOTIuMTY4LjQ0LjEyNzo5MjAwIl0sImZnciI6Ijc1NDgwYTlmYzkzNjQ5ZTJlYmQ4ZGQwYTlmMDcyMTI0N2U4Y2ZmMzJmZGJjNzhhYmYwYjMwZDdhYzljOGU4YmQiLCJrZXkiOiJYS2JXRlg4QlQyWXhuck1FTlRpdTpyeW9qSF92T1MzNnNOQ05ZQUh5d0pRIn0=
```

```bash
# 传输到第2台服务器hadoop2
[root@hadoop1 local]# scp elasticsearch-8.0.0-linux-x86_64.tar.gz root@hadoop2:/usr/local/
Warning: Permanently added the ECDSA host key for IP address '192.168.44.130' to the list of known hosts.
elasticsearch-8.0.0-linux-x86_64.tar.gz       100%  491MB  68.1MB/s   00:07 

# 传输到第3台服务器hadoop3
[root@hadoop1 local]# scp elasticsearch-8.0.0-linux-x86_64.tar.gz root@hadoop3:/usr/local/
```

```bash
# 在后续实例上，第一次启动时，附带token
[root@hadoop2 elasticsearch]# su es-admin
[es-admin@hadoop2 elasticsearch]$ ./bin/elasticsearch --enrollment-token eyJ2ZXIiOiI4LjAuMCIsImFkciI6WyIxOTIuMTY4LjQ0LjEyNzo5MjAwIl0sImZnciI6Ijc1NDgwYTlmYzkzNjQ5ZTJlYmQ4ZGQwYTlmMDcyMTI0N2U4Y2ZmMzJmZGJjNzhhYmYwYjMwZDdhYzljOGU4YmQiLCJrZXkiOiJYS2JXRlg4QlQyWXhuck1FTlRpdTpyeW9qSF92T1MzNnNOQ05ZQUh5d0pRIn0=
```

## 高可用测试

通过以下两个接口确定集群的状态（Note：以下是三个节点构成的集群的状态信息），在测试之前可以导入部分数据更直观地测试读、写可用性。

![2022-02-20-AllNodes.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-20-AllNodes.jpg)

* 查看节点信息：https://hadoop1:9200/_cat/nodes

```
192.168.44.130 32 92  5 0.10 0.33 0.32 cdfhilmrstw - hadoop2
192.168.44.127 40 94 11 0.35 0.49 0.53 cdfhilmrstw * hadoop1
192.168.44.132 47 97  4 0.21 0.20 0.23 cdfhilmrstw - hadoop3
```

结果中：*代表 `master` 节点；-代表 `slave` 节点。

* 查看集群健康状态：https://hadoop1:9200/_cat/health 或 https://hadoop1:9200/_cluster/health

```
<!-- https://hadoop1:9200/_cat/health -->
1645340882 07:08:02 elasticsearch green 3 3 26 13 0 0 0 0 - 100.0%
```

```json
// https://hadoop1:9200/_cluster/health
{
    "cluster_name": "elasticsearch",
    "status": "green",
    "timed_out": false,
    "number_of_nodes": 3,
    "number_of_data_nodes": 3,
    "active_primary_shards": 13,
    "active_shards": 26,
    "relocating_shards": 0,
    "initializing_shards": 0,
    "unassigned_shards": 0,
    "delayed_unassigned_shards": 0,
    "number_of_pending_tasks": 0,
    "number_of_in_flight_fetch": 0,
    "task_max_waiting_in_queue_millis": 0,
    "active_shards_percent_as_number": 100.0
}
```

结果中：关注颜色状态
`green` : 有完整的主版本和副本，一切正常；
`yellow` : 数据完整，但是没有完整的副本，相当于警告；
`red` : 数据不完整，部分主分片不可用，相当于故障；

### 停掉一个从节点

这里我们停掉第3个节点，即 `hadoop3` 上的 `ElasticSearch` 服务，查看集群状态，此时变为2个节点的集群，状态为 `yellow` 。
* https://hadoop1:9200/_cat/nodes

```
192.168.44.127 38 81 4 0.11 0.32 0.43 cdfhilmrstw * hadoop1
192.168.44.130  7 92 3 0.11 0.28 0.29 cdfhilmrstw - hadoop2
```

* https://hadoop1:9200/_cat/health

```
1645341764 07:22:44 elasticsearch yellow 2 2 18 13 0 0 8 0 - 69.2%
```

### 再停掉一个从节点

这里我们继续停掉第2个节点，即 `hadoop2` 上的 `ElasticSearch` 服务，查看集群状态，此时变为单节点的集群，状态为未连接，即不可用。

* https://hadoop1:9200/_cat/nodes

```json
{
    "error": {
        "root_cause": [
            {
                "type": "master_not_discovered_exception",
                "reason": null
            }
        ],
        "type": "master_not_discovered_exception",
        "reason": null
    },
    "status": 503
}
```

* https://hadoop1:9200/_cat/health

```json
{
    "error": {
        "root_cause": [
            {
                "type": "master_not_discovered_exception",
                "reason": null
            }
        ],
        "type": "master_not_discovered_exception",
        "reason": null
    },
    "status": 503
}
```

### 仅停掉主节点

我们启动停止的 `hadoop2` 与 `hadoop3` 上的 `ElasticSearch` 服务（直接使用 `./bin/elasticsearch` 启动服务即可，仅在第一次启动加入集群时需要附带 `enrollment token` ），先看下状态信息。

* https://hadoop1:9200/_cat/nodes

```
192.168.44.130 31 95 8 0.41 0.55 0.39 cdfhilmrstw * hadoop2
192.168.44.132  6 96 6 1.44 0.57 0.32 cdfhilmrstw - hadoop3
192.168.44.127 44 80 4 0.16 0.18 0.27 cdfhilmrstw - hadoop1
```

* https://hadoop1:9200/_cat/health

```
1645342672 07:37:52 elasticsearch green 3 3 26 13 0 0 0 0 - 100.0%
```

我们发现 `master` 节点发生了变化：由开始的hadoop1变为hadoop2。

那么这时，我们停掉master节点hadoop2进行测试，查看集群状态，此时变为2个节点的集群，状态为 `yellow` ；另外需要注意的是，群龙不可无首，国不可一日无君，那么**一个集群必须要有一个master**。

* https://hadoop1:9200/_cat/nodes

```
192.168.44.127 24 86 17 0.37 0.88 0.82 cdfhilmrstw * hadoop1
192.168.44.132 37 96 15 0.48 0.65 0.48 cdfhilmrstw - hadoop3
```

* https://hadoop1:9200/_cat/health

```
1645344470 08:07:50 elasticsearch yellow 2 2 18 13 0 0 8 0 - 69.2%
```

我们可以看到 `hadoop1` 又成了 `master` ，即当我们停掉原来的 `master` 后，会自动选举出新的 `master` 。

## 小总结

`ElasticSearch` 8.0的集群搭建更便捷，只需要将第一个实例上生成的 `enrollment token` 附带上，在后续的两个节点上执行启动命令即可。

1. ES集群扩容极其便捷；
2. 数据分片，可以避免单点故障；
3. 实现负载均衡，应对高并发场景。

## Reference

* [https://www.elastic.co/guide/en/elasticsearch/reference/8.0/reset-password.html](https://www.elastic.co/guide/en/elasticsearch/reference/8.0/reset-password.html)
* [https://www.elastic.co/guide/en/elasticsearch/reference/current/create-enrollment-token.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/create-enrollment-token.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
