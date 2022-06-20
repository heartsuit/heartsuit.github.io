---
layout: post
title: 信创环境下缓存服务Redis集群部署
tags: 国产化, 微服务
---

## 背景

本次项目涉及20+台服务器的部署，技术包括 `Nacos` 注册中心集群、 `GateWay` 网关服务集群、 `达梦8` 关系型数据库服务集群、 `MinIO` 分布式文件存储服务集群、 `Redis` 缓存服务集群、 `WebSocket` 服务端消息推送集群、 `Quartz` 定时任务服务集群、 `Nginx+KeepAlived` 反向代理高可用集群、监控服务集群等。这里主要记录下分布式文件存储服务集群以及缓存服务集群的搭建过程。

* [x] `Nginx+KeepAlived` 反向代理高可用集群，这个跟之前华为云上的集群搭建类似，参考：[Nginx高可用极速实战：通过KeepAlived与华为云虚拟IP实现](https://blog.csdn.net/u013810234/article/details/124569480?spm=1001.2014.3001.5501)
* [x] `MinIO` 分布式文件存储服务集群
* [x] `Redis` 缓存服务集群

## 单实例Redis服务配置回顾

假设你有一个已经运行的单实例 `Redis` 服务，在信创环境下的安装与配置参考：[在华为鲲鹏openEuler20.03系统上安装Redis, Zookeeper, Nginx](https://blog.csdn.net/u013810234/article/details/117047941)，不过这次的安装我修改了安装目录与安装包相同的目录，这是唯一的区别： `make PREFIX=/opt/redis install` ，方便集群下的复制。简单回顾总结下单实例 `Redis` 服务我们所做的配置修改。

* 远程访问

```bash
# 注释第75行的bind，同时将94行的protected-mode由yes改为no
[root@ecs-kunpeng-0006 redis]# vi redis.conf
75 #bind 127.0.0.1 -::1
94 protected-mode no
```

* 后台启动

```bash
# 将257行的daemonize由no改为yes
[root@ecs-kunpeng-0006 redis]# vi redis.conf
257 daemonize yes
```

* 开启认证

```bash
# 将901行的requirepass开启，改为自己的密码
[root@ecs-kunpeng-0006 redis]# vi redis.conf
901 requirepass your-guess
```

* 报错解决

上面 `Redis Server` 启动后又停止了，并且报了一个警告： `Your kernel has a bug that could lead to data corruption during background save. Please upgrade to the latest stable kernel.` 并且，给了解决的建议，即在 `redis.conf` 中取消这最后一条注释： `ignore-warnings ARM64-COW-BUG` 。

```bash
# 编辑vi redis.conf ，取消最后一行相关注释
[root@ecs-kunpeng-0006 redis]# vi redis.conf 
ignore-warnings ARM64-COW-BUG
```

* 配置日志

以后台方式启动后，发现 `Redis` 的日志完全没了。。所以需要配置下日志路径。

```bash
[root@ecs-kunpeng-0006 redis]# vi redis.conf
# Specify the log file name. Also the empty string can be used to force
# Redis to log on the standard output. Note that if you use standard
# output for logging but daemonize, logs will be sent to /dev/null
logfile ""
改为：
logfile "/opt/redis/log/redis.log"

# 需要手动创建目录，redis.log文件在下次启动时则会自动创建
[root@ecs-kunpeng-0006 redis]# mkdir log

# 启动即可
[root@ecs-kunpeng-0006 redis]# bin/redis-server ./redis.conf
```

## Redis集群部署

引用官方文档中的说明， `Redis` 集群为我们带来了以下好处：
1. 相对均匀地将完整的缓存数据集分片存储至多个不同的数据节点上，实现真正的分布式缓存服务；
2. 即使集群中个别节点（不超过50%）因故停服、宕机，整个缓存集群依然可用，解决了单点故障问题；

`Redis Cluster` 实现了 `Redis` 的分布式缓存， `Sharding` ，分片，你懂的，真正的分布式缓存。官方推荐，集群部署至少要3台 `Master` 节点，并建议使用3主3从6个节点的模式。我们这个项目实际生产环境申请了3台信创云主机作为缓存服务区，那么我们就按照**每台主机上一主一从**的分配来部署。

| IP地址   | 说明| 
| ---------| -------------- | 
| 172.27.204.198:6379 |Master1 |
| 172.27.204.198:6380 |Replica1 |
| 172.27.204.143:6379 |Master2 |
| 172.27.204.143:6380 |Replica2 |
| 172.27.204.162:6379 |Master3 |
| 172.27.204.162:6380 |Replica3 |

### 集群实例准备工作

因为之前先用单实例运行了一段时间，接下来我们要做的就是基于这个单实例，扩展为分布式 `Redis` 集群。注意，我们单实例下已经改了以下配置。

```
75 #bind 127.0.0.1 -::1
94 protected-mode no
257 daemonize yes
901 requirepass your-guess
logfile "/opt/redis-6379/log/redis.log"
ignore-warnings ARM64-COW-BUG
```

我们将之前的单实例先复制一份出来（这个单实例还在运行，正在提供服务，后面启动集群前再将其停止），计划将其作为这台主机上的 `Master` 。

```bash
cp -r redis redis-6379
```

然后，我们修改下作为集群要配置的参数（每项配置标明了行号）。

```
99 port 6379
1253 appendonly yes
1386 cluster-enabled yes
1394 cluster-config-file nodes-6379.conf
1400 cluster-node-timeout 15000
```
Note：如果配置了认证，则需要增加`masterauth your-guess`配置，否则从节点报错：

> MASTER aborted replication with an error: NOAUTH Authentication required.

以上报错的结果就是，从节点不断尝试重连，疯狂输出日志，便导致另外一个错误：

> Opening the temp file needed for MASTER <-> REPLICA synchronization: No space left on device

这样 `Redis` 集群中的一个实例就配置好了（为了避免受到已运行的实例的干扰，我们将之前生成的 `dump.rdb` 以及日志文件删除；如果是崭新的实例，则不需要操作），那么我们再从配置好的这个 `redis-6379` 复制出一个 `redis-6380` ，计划将其作为这台主机上的 `Replica` 。

Note：To create a cluster, the first thing we need is to have a few **empty Redis instances** running in cluster mode.

```bash
cp -r redis-6379/ redis-6380
```

这样一台主机上的两个Redis实例就配置好了。这里需要注意的是，我们要记得修改下 `redis-6380` 下的 `redis.conf` 配置，主要是 `port` 、 `logfile` 以及 `cluster-config-file` 与当前的端口、目录名称相一致即可。

接下来的操作就比较简单了，我们直接将当前主机上配置好的的两个 `Redis` 实例： `redis-6379` 与 `redis-6380` 发送到另外两台主机即可，等待启动。

```bash
# 发送至第二台主机
[root@sx-std-789123-0007 opt]# scp -r /opt/redis-6379/ root@172.27.204.143:/opt
[root@sx-std-789123-0007 opt]# scp -r /opt/redis-6380/ root@172.27.204.143:/opt

# 发送至第三台主机
[root@sx-std-789123-0007 opt]# scp -r /opt/redis-6379/ root@172.27.204.162:/opt
[root@sx-std-789123-0007 opt]# scp -r /opt/redis-6380/ root@172.27.204.162:/opt
```

### 关闭防火墙

```bash
[root@sx-std-789123-0007 ~]# firewall-cmd --state
running
[root@sx-std-789123-0007 ~]# systemctl stop firewalld

[root@sx-std-789123-0008 ~]# firewall-cmd --state
running
[root@sx-std-789123-0008 ~]# systemctl stop firewalld

[root@sx-std-789123-0009 ~]# firewall-cmd --state
running
[root@sx-std-789123-0009 ~]# systemctl stop firewalld
```

### 启动六个Redis实例

启动之前， 记得停止一开始的单实例 `Redis` 。

```
172.27.204.198
172.27.204.143
172.27.204.162
```

在上述三个主机上，分别执行两个 `Redis` 实例（一主 `6379` 一从 `6380` ）的启动命令。

```bash
cd /opt/redis-6379
./bin/redis-server ./redis.conf

cd /opt/redis-6380
./bin/redis-server ./redis.conf
```

查看某个服务的日志， `tail -f ./log/redis.log` ，其中会提示： `No cluster configuration found, I'm 3bb0728e0825d7c6d135ca150ecf9d6dec880cfe`

![2022-06-19-RedisStart.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-19-RedisStart.jpg)

```
3395775:C 14 Jun 2022 16:16:19.634 # Redis version=6.2.6, bits=64, commit=00000000, modified=0, pid=3395775, just started
3395775:C 14 Jun 2022 16:16:19.634 # Configuration loaded
3395775:M 14 Jun 2022 16:16:19.634 * Increased maximum number of open files to 10032 (it was originally set to 1024).
3395775:M 14 Jun 2022 16:16:19.634 * monotonic clock: POSIX clock_gettime
3395775:M 14 Jun 2022 16:16:19.635 * No cluster configuration found, I'm 3bb0728e0825d7c6d135ca150ecf9d6dec880cfe
3395775:M 14 Jun 2022 16:16:19.638 * Running mode=cluster, port=6380.
3395775:M 14 Jun 2022 16:16:19.638 # Server initialized
3395775:M 14 Jun 2022 16:16:19.638 # WARNING overcommit_memory is set to 0! Background save may fail under low memory condition. To fix this issue add 'vm.overcommit_memory = 1' to /etc/sysctl.conf and then reboot or run the command 'sysctl vm.overcommit_memory=1' for this to take effect.
3395775:M 14 Jun 2022 16:16:19.639 # WARNING Your kernel has a bug that could lead to data corruption during background save. Please upgrade to the latest stable kernel.
3395775:M 14 Jun 2022 16:16:19.640 * Ready to accept connections
```

### 初始化集群

初始化集群，根据官方文档，在任一台主机上，我们执行以下命令，其中， `cluster-replicas` 的值确定一个 `Master` 后跟几个 `Replica`

```bash
./bin/redis-cli --cluster create 172.27.204.198:6379 172.27.204.198:6380 \
172.27.204.143:6379 172.27.204.143:6380 172.27.204.162:6379 172.27.204.162:6380 \
--cluster-replicas 1
```

> 报错了：[ERR] Node 172.27.204.198:6379 NOAUTH Authentication required.

解决方法：由于我们前面开启了认证，那么初始化命令带上认证参数 `-a` 即可。

```bash
./bin/redis-cli --cluster create 172.27.204.198:6379 172.27.204.198:6380 \
172.27.204.143:6379 172.27.204.143:6380 172.27.204.162:6379 172.27.204.162:6380 \
--cluster-replicas 1 -a 'your-guess'
```

初始化时，会提示是否使用当前的这些配置，键入yes，之后看到 `[OK] All 16384 slots covered.` ，表明集群初始化成功。

![2022-06-19-RedisClusterInitialize.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-19-RedisClusterInitialize.jpg)

```bash
[root@sx-std-789123-0007 redis-6379]# ./bin/redis-cli --cluster create 172.27.204.198:6379 172.27.204.198:6380 \
> 172.27.204.143:6379 172.27.204.143:6380 172.27.204.162:6379 172.27.204.162:6380 \
> --cluster-replicas 1 -a 'your-guess'
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
>>> Performing hash slots allocation on 6 nodes...
Master[0] -> Slots 0 - 5460
Master[1] -> Slots 5461 - 10922
Master[2] -> Slots 10923 - 16383
Adding replica 172.27.204.143:6380 to 172.27.204.198:6379
Adding replica 172.27.204.162:6380 to 172.27.204.143:6379
Adding replica 172.27.204.198:6380 to 172.27.204.162:6379
M: 769bd7ba460beaffaa48b3817179d8e3bf31d9f2 172.27.204.198:6379
   slots:[0-5460] (5461 slots) master
S: 3bb0728e0825d7c6d135ca150ecf9d6dec880cfe 172.27.204.198:6380
   replicates 1a5adef430f045865fe1bc0a6e0a034ec79cd8c1
M: b14ec382bca41c3ef4095872c8d7c5c4a0ab24ae 172.27.204.143:6379
   slots:[5461-10922] (5462 slots) master
S: 466e2f2f64f208c6347091f2ca8050e90cfa4308 172.27.204.143:6380
   replicates 769bd7ba460beaffaa48b3817179d8e3bf31d9f2
M: 1a5adef430f045865fe1bc0a6e0a034ec79cd8c1 172.27.204.162:6379
   slots:[10923-16383] (5461 slots) master
S: 3e967034ffd4b2efa9491b0c6cbf727167fd45b3 172.27.204.162:6380
   replicates b14ec382bca41c3ef4095872c8d7c5c4a0ab24ae
Can I set the above configuration? (type 'yes' to accept): yes
>>> Nodes configuration updated
>>> Assign a different config epoch to each node
>>> Sending CLUSTER MEET messages to join the cluster
Waiting for the cluster to join
.
>>> Performing Cluster Check (using node 172.27.204.198:6379)
M: 769bd7ba460beaffaa48b3817179d8e3bf31d9f2 172.27.204.198:6379
   slots:[0-5460] (5461 slots) master
   1 additional replica(s)
S: 3bb0728e0825d7c6d135ca150ecf9d6dec880cfe 172.27.204.198:6380
   slots: (0 slots) slave
   replicates 1a5adef430f045865fe1bc0a6e0a034ec79cd8c1
M: b14ec382bca41c3ef4095872c8d7c5c4a0ab24ae 172.27.204.143:6379
   slots:[5461-10922] (5462 slots) master
   1 additional replica(s)
M: 1a5adef430f045865fe1bc0a6e0a034ec79cd8c1 172.27.204.162:6379
   slots:[10923-16383] (5461 slots) master
   1 additional replica(s)
S: 466e2f2f64f208c6347091f2ca8050e90cfa4308 172.27.204.143:6380
   slots: (0 slots) slave
   replicates 769bd7ba460beaffaa48b3817179d8e3bf31d9f2
S: 3e967034ffd4b2efa9491b0c6cbf727167fd45b3 172.27.204.162:6380
   slots: (0 slots) slave
   replicates b14ec382bca41c3ef4095872c8d7c5c4a0ab24ae
[OK] All nodes agree about slots configuration.
>>> Check for open slots...
>>> Check slots coverage...
[OK] All 16384 slots covered.
```

`Redis Cluster` 未使用一致性哈希，而是在集群中内置了 `16384` 个哈希槽（hash slot），当需要在 `Redis` 集群中存储一个 `key-value` 时， `Redis` 先对 `key` 使用 `CRC16` 算法算出一个结果，然后将结果对 `16384` 求余，这样每个 `key` 都会对应一个编号在 `0-16383` 之间的哈希槽， `Redis` 会根据节点数量大致均等的将哈希槽映射到不同的节点 。

### SpringBoot客户端连接

由于我们之前使用的是单实例的 `Redis` ， `SpringBoot` 的配置中 `Redis` 也是单实例，导致以下错误：

> Error in execution; nested exception is io.lettuce.core. RedisCommandExecutionException: MOVED 8380 172.27.204.143:6379

解决方法是，改用集群配置即可，我这里只配置了 `Master` 节点。

```yaml
spring:
  redis:
    cluster:
      nodes: 172.27.204.198:6379,172.27.204.143:6379,172.27.204.162:6379
    # host: 172.27.204.198
    # port: 6379
```

Note: `Redis Cluster` 不保证强一致性。性能与一致性之间需要权衡。

## 集群坏了怎么办。

简单点，停止、重启。。

* 暴力停止所有实例

```
ps -ef | grep redis
kill -9 pid
```

* 删除持久化文件

```
cd /opt/redis-6379
rm -f append.aof dump.rdb node*.conf

cd /opt/redis-6380
rm -f append.aof dump.rdb node*.conf
```

* 删除日志

```
rm -f /opt/redis-6379/log/*
rm -f /opt/redis-6380/log/*
```

* 启动集群

```
cd /opt/redis-6379
./bin/redis-server redis.conf
cd /opt/redis-6380
./bin/redis-server redis.conf
```

* 在任一台主机上，我们执行以下命令，建立一个新集群

```
./bin/redis-cli --cluster create 172.27.204.198:6379 172.27.204.198:6380 \
172.27.204.143:6379 172.27.204.143:6380 172.27.204.162:6379 172.27.204.162:6380 \
--cluster-replicas 1 -a 'your-guess'
```

## Reference

* [https://redis.io/docs/manual/scaling/](https://redis.io/docs/manual/scaling/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
