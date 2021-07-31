---
layout: post
title: 6-TDengine集群体验：2台虚拟主机
tags: TDengine
---

### 背景

之前的 `TDengine` 都是在单机上使用，因为 `TDengine` 已在2020年开源了其集群方案，那这次就来体验下 `TDengine` 集群。

当前先使用两台虚拟机（第一台就是一直以来的单机版， `FQDN` 为hadoop1；第二台为新建的虚拟机， `FQDN` 为hadoop2），偶数台机器可能出现脑裂，所以 `TDengine` 还提供了个仲裁者 `arbitrator` ，这里先不配置，实际中通常使用奇数台机器来实现，下次使用3台（奇数台）容器体验集群；具体搭建步骤可参考官方文档，比较详细。主要步骤：

1. 停服务，不删除数据
2. 配置hostname，使两台虚拟机可以互相ping通；
3. 关闭防火墙；
4. 修改taos.cfg配置；
5. 启动第一个taosd服务节点；
6. 启动第二个taosd服务节点；
7. 在第一个节点的taos命令行中加入第二个节点；
8. 验证集群；

### 1. 停服务，不删除数据

```bash
[root@hadoop1 vnode]# systemctl stop taosd

# 如果第二台或者后续机器没有启动taosd，则不需要停止
[root@hadoop2 vnode]# systemctl stop taosd
```

Note：**官方建议删除数据，我这里并没有删除，在构建集群的过程中还观察到了 `vnode` 动态分配的过程，直呼内行。**

### 2. 配置hostname，使两台虚拟机可以互相ping通

```bash
# 虚拟机1
[root@hadoop1 ~]# vi /etc/hosts
192.168.169.130 hadoop1
192.168.169.132 hadoop2
[root@hadoop1 ~]# hostname -f
hadoop1

# 虚拟机2
[root@hadoop2 ~]# vi /etc/hosts
192.168.169.130 hadoop1
192.168.169.132 hadoop2
[root@hadoop2 ~]# hostname -f
hadoop2
```

### 3. 关闭防火墙

```bash
# 虚拟机1
[root@hadoop1 ~]# systemctl stop firewalld.service

# 虚拟机2
[root@hadoop2 ~]# systemctl stop firewalld.service
```

### 4. 修改taos.cfg配置

```bash
# 虚拟机1
[root@hadoop1 ~]# vi /etc/taos/taos.cfg
# first fully qualified domain name (FQDN) for TDengine system
firstEp                   hadoop1:6030

# local fully qualified domain name (FQDN)
fqdn                      hadoop1

# 虚拟机2
[root@hadoop2 ~]# vi /etc/taos/taos.cfg
# first fully qualified domain name (FQDN) for TDengine system
firstEp                   hadoop1:6030

# local fully qualified domain name (FQDN)
fqdn                      hadoop2
```

Notes: `firstEp` 都配置为第一个节点的地址，我开始的时候将第二个节点的 `firstEp` 配置为 `hadoop1:6030` ，那必须起不来。。

### 5. 启动第一个taosd服务节点

```bash
[root@hadoop1 ~]# systemctl start taosd
```

### 6. 启动第二个taosd服务节点

```bash
[root@hadoop2 ~]# systemctl start taosd
```

### 7. 在第一个节点的taos命令行中加入第二个节点

```bash
taos> create dnode 'hadoop2:6030';
```

Notes: 
1. 其实，如果第二个或者后续的 `taosd` 还没安装，那么在安装完毕时会询问是否要加入一个已存在的集群中，在那个步骤也可以完成加入集群操作；
2. 任何已经加入集群在线的数据节点，都可以作为后续待加入节点的 `firstEP`。

### 8. 验证集群

```bash
taos> show dnodes;
   id   |           end_point            | vnodes | cores  |   status   | role  |       create_time       |      offline reason      |
======================================================================================================================================
      1 | hadoop1:6030                   |      5 |      4 | ready      | any   | 2021-06-15 12:59:24.184 |                          |
      3 | hadoop2:6030                   |      5 |      4 | ready      | any   | 2021-07-26 14:16:08.726 |                          |
Query OK, 2 row(s) in set (0.001604s)
```

> Everything is OK~

### 集群同步过程

在看集群同步前，先了解下 `TDengine` 在服务端的目录结构。可以看到 `TDengine` 的data, log目录都是软链接。

![2021-7-31-Directory.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-7-31-Directory.png)

由于我的第一个节点在以前已经有一部分数据了，而且在搭建集群时并没有删除这些历史数据库表，那么在这个过程中出现了一些神奇的变化，下面简单介绍下：

* 搭建集群前的第一个节点

起初，节点1拥有所有的 `vnode` 。

```bash
[root@hadoop1 vnode]# du -sh *
43M     vnode125
43M     vnode126
4.3M    vnode127
28K     vnode163
20K     vnode164
308K    vnode2
306M    vnode4
306M    vnode5
204M    vnode6
204M    vnode7
```

* 集群同步中

从以下过程可以看到 `vnodes` 的同步（两个节点的 `vnodes` 变化过程：10:0——>9:2——>5:5）以及负载均衡过程。

![2021-7-31-ClusterDnodes.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-7-31-ClusterDnodes.jpg)

```bash
taos> show dnodes;
   id   |           end_point            | vnodes | cores  |   status   | role  |       create_time       |      offline reason      |
======================================================================================================================================
      1 | hadoop1:6030                   |     10 |      4 | ready      | any   | 2021-06-15 12:59:24.184 |                          |
Query OK, 1 row(s) in set (0.001095s)

taos> create dnode 'hadoop2:6030';
Query OK, 0 of 0 row(s) in database (0.001380s)

taos> show dnodes;
   id   |           end_point            | vnodes | cores  |   status   | role  |       create_time       |      offline reason      |
======================================================================================================================================
      1 | hadoop1:6030                   |     10 |      4 | ready      | any   | 2021-06-15 12:59:24.184 |                          |
      3 | hadoop2:6030                   |      0 |      0 | offline    | any   | 2021-07-26 14:16:08.726 | status not received      |
Query OK, 2 row(s) in set (0.000932s)

taos> show dnodes;
   id   |           end_point            | vnodes | cores  |   status   | role  |       create_time       |      offline reason      |
======================================================================================================================================
      1 | hadoop1:6030                   |      9 |      4 | ready      | any   | 2021-06-15 12:59:24.184 |                          |
      3 | hadoop2:6030                   |      2 |      4 | ready      | any   | 2021-07-26 14:16:08.726 |                          |
Query OK, 2 row(s) in set (0.002130s)

taos> show dnodes;
   id   |           end_point            | vnodes | cores  |   status   | role  |       create_time       |      offline reason      |
======================================================================================================================================
      1 | hadoop1:6030                   |      5 |      4 | ready      | any   | 2021-06-15 12:59:24.184 |                          |
      3 | hadoop2:6030                   |      5 |      4 | ready      | any   | 2021-07-26 14:16:08.726 |                          |
Query OK, 2 row(s) in set (0.001604s)
```

* 集群同步后

最后，节点1、节点2平分所有的 `vnode` 。

```bash
# 虚拟机1
[root@hadoop1 vnode]# ll
总用量 0
drwxr-xr-x 4 root root 68 7月  19 13:54 vnode125
drwxr-xr-x 4 root root 68 7月  19 13:58 vnode126
drwxr-xr-x 4 root root 68 7月  21 18:05 vnode127
drwxr-xr-x 4 root root 68 7月  22 13:56 vnode163
drwxr-xr-x 4 root root 68 7月  22 13:56 vnode164

# 虚拟机2
[root@hadoop2 vnode]# ll
总用量 0
drwxr-xr-x. 4 root root 68 7月  26 14:25 vnode2
drwxr-xr-x. 4 root root 68 7月  26 14:25 vnode4
drwxr-xr-x. 4 root root 68 7月  26 14:26 vnode5
drwxr-xr-x. 4 root root 68 7月  26 14:26 vnode6
drwxr-xr-x. 4 root root 68 7月  26 14:26 vnode7
```

可以看到，数据被分发到不同的 `TDengine` 节点上进行分片存储，实现水平扩展与负载均衡。

### 查看管理节点

两个节点，一主一次。

```bash
taos> show mnodes;
   id   |           end_point            |     role     |       create_time       |
===================================================================================
      1 | hadoop1:6030                   | master       | 2021-06-15 12:59:24.184 |
      3 | hadoop2:6030                   | slave        | 2021-07-26 14:23:56.898 |
Query OK, 2 row(s) in set (0.003355s)
```

### 删除数据节点

```bash
taos> drop dnode "fqdn:port";
```

Note：

1. 一个数据节点一旦被drop之后，不能重新加入集群。需要将此节点重新部署（清空数据文件夹）。集群在完成drop dnode操作之前，会将该dnode的数据迁移走。
2. 请注意 drop dnode 和 停止taosd进程是两个不同的概念，不要混淆：因为删除dnode之前要执行迁移数据的操作，因此被删除的dnode必须保持在线状态。待删除操作结束之后，才能停止taosd进程。
3. 一个数据节点被drop之后，其他节点都会感知到这个dnodeID的删除操作，任何集群中的节点都不会再接收此dnodeID的请求。
4. dnodeID的是集群自动分配的，不得人工指定。它在生成时递增的，不会重复。

### 同步日志

我专门看了下当第二个节点加入时的同步日志，附在下面，大概就是集群内部通信，实现 `vnode` 的迁移与负载均衡过程。虽然有两个数据库的数据在亿级别，不过得益于 `TDengine` 出色的压缩效果，整个同步过程仅耗时几秒钟୧(๑•̀◡•́๑)૭

```log
                new log file                      
==================================================
07/26 14:25:17.226219 00023008 DND start to initialize TDengine
07/26 14:25:17.226262 00023008 DND step:dnode-tfile is initialized
07/26 14:25:17.226272 00023008 DND step:dnode-rpc is initialized
07/26 14:25:17.226277 00023008 UTL localEp is: hadoop2:6030
07/26 14:25:17.228221 00023008 UTL WARN timezone not configured, set to system default: (CST, +0800)
07/26 14:25:17.228303 00023008 UTL WARN locale not configured, set to system default:en_US.UTF-8
07/26 14:25:17.228315 00023008 UTL WARN charset not configured, set to system default:UTF-8
07/26 14:25:17.228353 00023008 UTL    check global cfg completed
07/26 14:25:17.228357 00023008 UTL ==================================
07/26 14:25:17.228361 00023008 UTL    taos config & system info:
07/26 14:25:17.228364 00023008 UTL ==================================
07/26 14:25:17.228367 00023008 UTL  firstEp:                hadoop1:6030 
07/26 14:25:17.228370 00023008 UTL  secondEp:               hadoop2:6030 
07/26 14:25:17.228373 00023008 UTL  fqdn:                   hadoop2 
07/26 14:25:17.228376 00023008 UTL  serverPort:             6030 
07/26 14:25:17.228380 00023008 UTL  configDir:              /etc/taos 
07/26 14:25:17.228383 00023008 UTL  logDir:                 /var/log/taos 
07/26 14:25:17.228386 00023008 UTL  scriptDir:              /etc/taos 
07/26 14:25:17.228389 00023008 UTL  arbitrator:              
07/26 14:25:17.228392 00023008 UTL  numOfThreadsPerCore:    1.000000 
07/26 14:25:17.228403 00023008 UTL  numOfCommitThreads:     4 
07/26 14:25:17.228407 00023008 UTL  ratioOfQueryCores:      1.000000 
07/26 14:25:17.228410 00023008 UTL  numOfMnodes:            3 
07/26 14:25:17.228413 00023008 UTL  vnodeBak:               1 
07/26 14:25:17.228416 00023008 UTL  telemetryReporting:     1 
07/26 14:25:17.228419 00023008 UTL  balance:                1 
07/26 14:25:17.228422 00023008 UTL  balanceInterval:        300 
07/26 14:25:17.228425 00023008 UTL  role:                   0 
07/26 14:25:17.228428 00023008 UTL  maxTmrCtrl:             512 
07/26 14:25:17.228431 00023008 UTL  monitorInterval:        30(s)
07/26 14:25:17.228434 00023008 UTL  offlineThreshold:       864000(s)
07/26 14:25:17.228437 00023008 UTL  rpcTimer:               300(ms)
07/26 14:25:17.228440 00023008 UTL  rpcForceTcp:            0 
07/26 14:25:17.228443 00023008 UTL  rpcMaxTime:             600(s)
07/26 14:25:17.228446 00023008 UTL  statusInterval:         1(s)
07/26 14:25:17.228449 00023008 UTL  shellActivityTimer:     3(s)
07/26 14:25:17.228452 00023008 UTL  minSlidingTime:         10(ms)
07/26 14:25:17.228455 00023008 UTL  minIntervalTime:        10(ms)
07/26 14:25:17.228458 00023008 UTL  maxStreamCompDelay:     20000(ms)
07/26 14:25:17.228461 00023008 UTL  maxFirstStreamCompDelay:10000(ms)
07/26 14:25:17.228464 00023008 UTL  retryStreamCompDelay:   10000(ms)
07/26 14:25:17.228467 00023008 UTL  streamCompDelayRatio:   0.100000 
07/26 14:25:17.228470 00023008 UTL  maxVgroupsPerDb:        0 
07/26 14:25:17.228473 00023008 UTL  maxTablesPerVnode:      1000000 
07/26 14:25:17.228476 00023008 UTL  minTablesPerVnode:      1000 
07/26 14:25:17.228479 00023008 UTL  tableIncStepPerVnode:   1000 
07/26 14:25:17.228482 00023008 UTL  cache:                  16(Mb)
07/26 14:25:17.228485 00023008 UTL  blocks:                 6 
07/26 14:25:17.228488 00023008 UTL  days:                   10 
07/26 14:25:17.228491 00023008 UTL  keep:                   3650 
07/26 14:25:17.228494 00023008 UTL  minRows:                100 
07/26 14:25:17.228497 00023008 UTL  maxRows:                4096 
07/26 14:25:17.228500 00023008 UTL  comp:                   2 
07/26 14:25:17.228503 00023008 UTL  walLevel:               1 
07/26 14:25:17.228506 00023008 UTL  fsync:                  3000 
07/26 14:25:17.228509 00023008 UTL  replica:                1 
07/26 14:25:17.228512 00023008 UTL  partitions:             4 
07/26 14:25:17.228515 00023008 UTL  quorum:                 1 
07/26 14:25:17.228518 00023008 UTL  update:                 0 
07/26 14:25:17.228521 00023008 UTL  compressMsgSize:        -1 
07/26 14:25:17.228524 00023008 UTL  maxSQLLength:           1048576(byte)
07/26 14:25:17.228533 00023008 UTL  maxNumOfOrderedRes:     100000 
07/26 14:25:17.228536 00023008 UTL  queryBufferSize:        -1(byte)
07/26 14:25:17.228539 00023008 UTL  retrieveBlockingModel:  0 
07/26 14:25:17.228542 00023008 UTL  keepColumnName:         0 
07/26 14:25:17.228545 00023008 UTL  timezone:                (CST, +0800) 
07/26 14:25:17.228548 00023008 UTL  locale:                 en_US.UTF-8 
07/26 14:25:17.228551 00023008 UTL  charset:                UTF-8 
07/26 14:25:17.228554 00023008 UTL  maxShellConns:          50000 
07/26 14:25:17.228557 00023008 UTL  maxConnections:         5000 
07/26 14:25:17.228560 00023008 UTL  minimalLogDirGB:        1.000000(GB)
07/26 14:25:17.228564 00023008 UTL  minimalTmpDirGB:        1.000000(GB)
07/26 14:25:17.228567 00023008 UTL  minimalDataDirGB:       2.000000(GB)
07/26 14:25:17.228570 00023008 UTL  mnodeEqualVnodeNum:     4 
07/26 14:25:17.228573 00023008 UTL  flowctrl:               1 
07/26 14:25:17.228576 00023008 UTL  slaveQuery:             1 
07/26 14:25:17.228579 00023008 UTL  adjustMaster:           1 
07/26 14:25:17.228582 00023008 UTL  http:                   1 
07/26 14:25:17.228585 00023008 UTL  mqtt:                   0 
07/26 14:25:17.228587 00023008 UTL  monitor:                1 
07/26 14:25:17.228590 00023008 UTL  stream:                 1 
07/26 14:25:17.228593 00023008 UTL  httpEnableRecordSql:    0 
07/26 14:25:17.228596 00023008 UTL  telegrafUseFieldNum:    0 
07/26 14:25:17.228599 00023008 UTL  httpMaxThreads:         2 
07/26 14:25:17.228602 00023008 UTL  restfulRowLimit:        10240 
07/26 14:25:17.228605 00023008 UTL  numOfLogLines:          10000000 
07/26 14:25:17.228608 00023008 UTL  logKeepDays:            0 
07/26 14:25:17.228611 00023008 UTL  asyncLog:               1 
07/26 14:25:17.228614 00023008 UTL  debugFlag:              0 
07/26 14:25:17.228617 00023008 UTL  mDebugFlag:             131 
07/26 14:25:17.228620 00023008 UTL  dDebugFlag:             135 
07/26 14:25:17.228623 00023008 UTL  sDebugFlag:             135 
07/26 14:25:17.228626 00023008 UTL  wDebugFlag:             135 
07/26 14:25:17.228628 00023008 UTL  sdbDebugFlag:           131 
07/26 14:25:17.228631 00023008 UTL  rpcDebugFlag:           131 
07/26 14:25:17.228634 00023008 UTL  tmrDebugFlag:           131 
07/26 14:25:17.228637 00023008 UTL  cDebugFlag:             131 
07/26 14:25:17.228640 00023008 UTL  jniDebugFlag:           131 
07/26 14:25:17.228643 00023008 UTL  odbcDebugFlag:          131 
07/26 14:25:17.228646 00023008 UTL  uDebugFlag:             131 
07/26 14:25:17.228649 00023008 UTL  httpDebugFlag:          131 
07/26 14:25:17.228652 00023008 UTL  mqttDebugFlag:          131 
07/26 14:25:17.228654 00023008 UTL  monDebugFlag:           131 
07/26 14:25:17.228657 00023008 UTL  qDebugFlag:             131 
07/26 14:25:17.228660 00023008 UTL  vDebugFlag:             135 
07/26 14:25:17.228663 00023008 UTL  tsdbDebugFlag:          131 
07/26 14:25:17.228666 00023008 UTL  cqDebugFlag:            131 
07/26 14:25:17.228669 00023008 UTL  enableRecordSql:        0 
07/26 14:25:17.228672 00023008 UTL  enableCoreFile:         0 
07/26 14:25:17.228675 00023008 UTL  gitinfo:                2019939bcc5567212d6e07af557c2c4ea540c091 
07/26 14:25:17.228678 00023008 UTL  gitinfoOfInternal:      NULL 
07/26 14:25:17.228681 00023008 UTL  buildinfo:              Built at 2021-06-07 14:27 
07/26 14:25:17.228684 00023008 UTL  version:                2.1.2.0 
07/26 14:25:17.228687 00023008 UTL  maxBinaryDisplayWidth:  30 
07/26 14:25:17.228690 00023008 UTL  tempDir:                /tmp/ 
07/26 14:25:17.228693 00023008 UTL  os pageSize:            4096(KB)
07/26 14:25:17.228696 00023008 UTL  os openMax:             1048576
07/26 14:25:17.228699 00023008 UTL  os streamMax:           16
07/26 14:25:17.228702 00023008 UTL  os numOfCores:          4
07/26 14:25:17.228705 00023008 UTL  os totalDisk:           0.000000(GB)
07/26 14:25:17.228708 00023008 UTL  os usedDisk:            0.000000(GB)
07/26 14:25:17.228711 00023008 UTL  os availDisk:           0.000000(GB)
07/26 14:25:17.228716 00023008 UTL  os totalMemory:         3770(MB)
07/26 14:25:17.228722 00023008 UTL  os sysname:             Linux
07/26 14:25:17.228725 00023008 UTL  os nodename:            hadoop2
07/26 14:25:17.228727 00023008 UTL  os release:             3.10.0-1127.el7.x86_64
07/26 14:25:17.228730 00023008 UTL  os version:             #1 SMP Tue Mar 31 23:36:51 UTC 2020
07/26 14:25:17.228733 00023008 UTL  os machine:             x86_64
07/26 14:25:17.228737 00023008 UTL  dataDir: /var/lib/taos
07/26 14:25:17.228740 00023008 UTL ==================================
07/26 14:25:17.228743 00023008 DND step:dnode-globalcfg is initialized
07/26 14:25:17.229123 00023008 TFS disk /var/lib/taos is mounted to tier level 0 id 0
07/26 14:25:17.229446 00023008 DND dnode storage is initialized at /var/lib/taos/dnode
07/26 14:25:17.229455 00023008 DND step:dnode-storage is initialized
07/26 14:25:17.229465 00023008 DND failed to read /var/lib/taos/dnode/dnodeCfg.json, file not exist
07/26 14:25:17.229467 00023008 DND dnode cfg is initialized
07/26 14:25:17.229470 00023008 DND step:dnode-cfg is initialized
07/26 14:25:17.229489 00023008 DND failed to read /var/lib/taos/dnode/dnodeEps.json, file not exist
07/26 14:25:17.229490 00023008 DND dnode eps is initialized
07/26 14:25:17.229494 00023008 DND step:dnode-eps is initialized
07/26 14:25:17.229502 00023008 DND failed to read /var/lib/taos/dnode/mnodeEpSet.json, file not exist
07/26 14:25:17.229503 00023008 DND dnode minfos is initialized
07/26 14:25:17.229506 00023008 DND step:dnode-minfos is initialized
07/26 14:25:17.229565 00023008 WAL wal thread is launched, thread:0x7f1701abd700
07/26 14:25:17.229573 00023008 WAL wal module is initialized, rsetId:3
07/26 14:25:17.229579 00023008 DND step:dnode-wal is initialized
07/26 14:25:17.229777 00023008 SYN 0x557872b4c9a0 TCP pool is created
07/26 14:25:17.229788 00023008 SYN sync module initialized successfully
07/26 14:25:17.229789 00023008 DND step:dnode-sync is initialized
07/26 14:25:17.229871 00023008 DND dnode check is initialized
07/26 14:25:17.229878 00023008 DND step:dnode-check is initialized
07/26 14:25:17.229887 00023008 UTL worker:vquery is initialized, min:4 max:4
07/26 14:25:17.229894 00023008 UTL worker:vfetch is initialized, min:4 max:4
07/26 14:25:17.229897 00023008 DND step:dnode-vread is initialized
07/26 14:25:17.229900 00023008 DND dnode vwrite is initialized, max worker 4
07/26 14:25:17.229903 00023008 DND step:dnode-vwrite is initialized
07/26 14:25:17.229911 00023008 VND vbackup:0 is created
07/26 14:25:17.229913 00023008 VND vbackup is initialized, num:1 qset:0x557872b520e0
07/26 14:25:17.229943 00023008 VND vbackup:0 is launched, total:1
07/26 14:25:17.229945 00023008 VND vbackup queue:0x557872b52170 is allocated
07/26 14:25:17.229947 00023008 DND step:vnode-backup is initialized
07/26 14:25:17.229953 00023008 VND vmworker:0 is created
07/26 14:25:17.229954 00023008 VND vmworker is initialized, num:1 qset:0x557872b52420
07/26 14:25:17.229983 00023008 VND vmworker:0 is launched, total:1
07/26 14:25:17.229985 00023008 VND vmworker queue:0x557872b524b0 is allocated
07/26 14:25:17.229986 00023008 DND step:vnode-worker is initialized
07/26 14:25:17.229992 00023008 DND step:vnode-write is initialized
07/26 14:25:17.229997 00023008 DND step:vnode-read is initialized
07/26 14:25:17.230002 00023008 DND step:vnode-hash is initialized
07/26 14:25:17.230167 00023008 DND step:tsdb-queue is initialized
07/26 14:25:17.230182 00023008 UTL worker:vmgmt is initialized, min:1 max:1
07/26 14:25:17.230229 00023008 DND dnode vmgmt is initialized
07/26 14:25:17.230244 00023008 DND step:dnode-vmgmt is initialized
07/26 14:25:17.230252 00023008 DND dnode mread worker:0 is created
07/26 14:25:17.230253 00023008 DND dnode mread worker:1 is created
07/26 14:25:17.230254 00023008 DND dnode mread is initialized, workers:2 qset:0x557872b53b20
07/26 14:25:17.230255 00023008 DND step:dnode-mread is initialized
07/26 14:25:17.230260 00023008 DND dnode mwrite worker:0 is created
07/26 14:25:17.230261 00023008 DND dnode mwrite is initialized, workers:1 qset:0x557872b53bc0
07/26 14:25:17.230265 00023008 DND step:dnode-mwrite is initialized
07/26 14:25:17.230268 00023008 DND dnode mpeer worker:0 is created
07/26 14:25:17.230269 00023008 DND dnode mpeer is initialized, workers:1 qset:0x557872b53c50
07/26 14:25:17.230270 00023008 DND step:dnode-mpeer is initialized
07/26 14:25:17.232649 00023008 DND dnode inter-dnodes rpc client is initialized
07/26 14:25:17.232669 00023008 DND step:dnode-client is initialized
07/26 14:25:17.233305 00023008 DND dnode inter-dnodes RPC server is initialized
07/26 14:25:17.233317 00023008 DND step:dnode-server is initialized
07/26 14:25:17.233344 00023008 DND start 4 threads to open 0 vnodes
07/26 14:25:17.233349 00023008 DND there are total vnodes:0, opened:0
07/26 14:25:17.233353 00023008 DND step:dnode-vnodes is initialized
07/26 14:25:17.233489 00023008 MND starting to initialize mnode ...
07/26 14:25:17.233528 00023008 DND dnode mwrite worker:0 is launched, total:1
07/26 14:25:17.233531 00023008 DND dnode mwrite queue:0x557872b84f00 is allocated
07/26 14:25:17.233559 00023008 DND dnode mread worker:0 is launched, total:2
07/26 14:25:17.233591 00023008 DND dnode mread worker:1 is launched, total:2
07/26 14:25:17.233597 00023008 DND dnode mread queue:0x557872b85260 is allocated
07/26 14:25:17.233645 00023008 DND dnode mpeer worker:0 is launched, total:1
07/26 14:25:17.233649 00023008 DND dnode mpeer queue:0x557872b85760 is allocated
07/26 14:25:17.233655 00023008 DND step:sdbref is initialized
07/26 14:25:17.233748 00023008 DND step:profile is initialized
07/26 14:25:17.233766 00023008 DND step:cluster is initialized
07/26 14:25:17.233771 00023008 DND step:accts is initialized
07/26 14:25:17.233779 00023008 DND step:users is initialized
07/26 14:25:17.233784 00023008 DND step:dnodes is initialized
07/26 14:25:17.233792 00023008 DND step:dbs is initialized
07/26 14:25:17.233800 00023008 DND step:vgroups is initialized
07/26 14:25:17.234042 00023008 DND step:tables is initialized
07/26 14:25:17.234053 00023008 DND step:mnodes is initialized
07/26 14:25:17.234106 00023008 MND vgId:1, sdb write is opened
07/26 14:25:17.234123 00023008 WAL vgId:1, object is initialized
07/26 14:25:17.234126 00023008 WAL vgId:1, wal:0x557872ba1e10 is opened, level:2 fsyncPeriod:0
07/26 14:25:17.234127 00023008 SDB vgId:1, open sdb wal for restore
07/26 14:25:17.234159 00023008 WAL vgId:1, file:/var/lib/taos/mnode/wal/wal0, will be restored
07/26 14:25:17.234176 00023008 WAL vgId:1, file:/var/lib/taos/mnode/wal/wal0, open for restore
07/26 14:25:17.234205 00023008 MND dnode:1, fqdn:hadoop2 ep:hadoop2:6030 port:6030 is created
07/26 14:25:17.234219 00023008 MND mnode:1, fqdn:hadoop2 ep:hadoop2:6030 port:6030 is created
07/26 14:25:17.234348 00023008 WAL vgId:1, file:/var/lib/taos/mnode/wal/wal0, it is closed after restore
07/26 14:25:17.234352 00023008 WAL vgId:1, file:/var/lib/taos/mnode/wal/wal0, restore success, wver:7
07/26 14:25:17.234368 00023008 WAL vgId:1, file:/var/lib/taos/mnode/wal/wal0, it is created and open while restore
07/26 14:25:17.234370 00023008 SDB vgId:1, sdb wal load success
07/26 14:25:17.234373 00023008 SDB vgId:1, sdb start to check for integrity
07/26 14:25:17.234378 00023008 SDB vgId:1, sdb:cluster is checked, rows:1
07/26 14:25:17.234382 00023008 SDB vgId:1, sdb:dnodes is checked, rows:1
07/26 14:25:17.234385 00023008 MND vgId:1, update mnodes epSet, numOfMnodes:1
07/26 14:25:17.234390 00023008 MND vgId:1, mnodes epSet is set, num:1 inUse:0
07/26 14:25:17.234396 00023008 MND vgId:1, mnode:1, fqdn:hadoop2 shell:6030 peer:6035
07/26 14:25:17.234403 00023008 SDB vgId:1, sdb:mnodes is checked, rows:1
07/26 14:25:17.234406 00023008 SDB vgId:1, sdb:accounts is checked, rows:1
07/26 14:25:17.234410 00023008 SDB vgId:1, sdb:users is checked, rows:3
07/26 14:25:17.234412 00023008 SDB vgId:1, sdb:dbs is checked, rows:0
07/26 14:25:17.234415 00023008 SDB vgId:1, sdb:vgroups is checked, rows:0
07/26 14:25:17.234419 00023008 SDB vgId:1, sdb:stables is checked, rows:0
07/26 14:25:17.234421 00023008 SDB vgId:1, sdb:ctables is checked, rows:0
07/26 14:25:17.234428 00023008 SDB vgId:1, sdb is restored, mver:7 rows:7 tables:9
07/26 14:25:17.234431 00023008 DND step:sdb is initialized
07/26 14:25:17.234503 00023008 MND dnode:1 set access:0 to 0
07/26 14:25:17.234517 00023008 DND step:balance is initialized
07/26 14:25:17.234521 00023008 DND step:grant is initialized
07/26 14:25:17.234646 00023008 DND step:show is initialized
07/26 14:25:17.234659 00023008 MND mnode is initialized successfully
07/26 14:25:17.234786 00023008 DND dnode modules is initialized
07/26 14:25:17.234796 00023008 HTP start http server ...
07/26 14:25:17.234865 00023008 HTP http result queue is opened
07/26 14:25:17.235694 00023008 MON monitor module start
07/26 14:25:17.235730 00023008 DND step:dnode-modules is initialized
07/26 14:25:17.236197 00023042 HTP http server init success at 6041
07/26 14:25:17.236571 00023008 DND dnode shell rpc server is initialized
07/26 14:25:17.236582 00023008 DND step:dnode-shell is initialized
07/26 14:25:17.236588 00023008 DND dnode status timer is initialized
07/26 14:25:17.236591 00023008 DND step:dnode-statustmr is initialized
07/26 14:25:17.236628 00023008 DND dnode telemetry is initialized
07/26 14:25:17.236635 00023008 DND step:dnode-telemetry is initialized
07/26 14:25:17.236638 00023008 DND TDengine is initialized successfully
07/26 14:25:17.803235 00023021 DND dnode:3, in create mnode msg is not equal with saved dnodeId:0
07/26 14:25:17.820577 00023022 DND print minfos, mnodeNum:1 inUse:0
07/26 14:25:17.820626 00023022 DND mnode index:1, hadoop1:6030
07/26 14:25:17.821480 00023022 DND successed to write /var/lib/taos/dnode/mnodeEpSet.json
07/26 14:25:17.821508 00023022 DND dnodeId is set to 3, clusterId is set to d0fcfd0b-16e3-431b-b3cc-c0bba31afafc
07/26 14:25:17.822066 00023022 DND successed to write /var/lib/taos/dnode/dnodeCfg.json
07/26 14:25:17.822091 00023022 DND print dnodeEp, dnodeNum:2
07/26 14:25:17.822095 00023022 DND dnode:1, dnodeFqdn:hadoop1 dnodePort:6030
07/26 14:25:17.822098 00023022 DND dnode:3, dnodeFqdn:hadoop2 dnodePort:6030
07/26 14:25:17.822652 00023022 DND successed to write /var/lib/taos/dnode/dnodeEps.json
07/26 14:25:18.371348 00023021 DND dnode:3, create mnode msg is received from mnodes, numOfMnodes:2
07/26 14:25:18.371392 00023021 DND mnode index:0, mnode:1:hadoop1:6030
07/26 14:25:18.371395 00023021 DND mnode index:1, mnode:3:hadoop2:6030
07/26 14:25:18.371398 00023021 DND start mnode module, module status:6, new status:7
07/26 14:25:18.371436 00023021 DND module status:7 is set, start mnode module
07/26 14:25:18.371445 00023021 MND mnode module already started...
07/26 14:25:18.371455 00023021 MND vgId:1, update mnodes epSet, numOfMinfos:2
07/26 14:25:18.371463 00023021 MND vgId:1, mnodes epSet is set, num:2 inUse:0
07/26 14:25:18.371470 00023021 MND vgId:1, mnode:1, fqdn:hadoop1 shell:6030 peer:6035
07/26 14:25:18.371477 00023021 MND vgId:1, mnode:3, fqdn:hadoop2 shell:6030 peer:6035
07/26 14:25:18.371486 00023021 SDB vgId:1, work as mnode, replica:2
07/26 14:25:18.371493 00023021 SDB vgId:1, mnode:1, hadoop1:6040
07/26 14:25:18.371499 00023021 SDB vgId:1, mnode:3, hadoop2:6040
07/26 14:25:18.371926 00023021 SYN vgId:1, nodeId:1, 0x7f16e0000e40 it is configured, ep:hadoop1:6040 rid:2
07/26 14:25:18.371996 00023021 SYN vgId:1, nodeId:3, 0x7f16e0001010 it is configured, ep:hadoop2:6040 rid:3
07/26 14:25:18.372002 00023021 SYN vgId:1, 2 replicas are configured, quorum:2 role:unsynced
07/26 14:25:18.372107 00023021 SDB vgId:1, mnode role changed from master to unsynced
07/26 14:25:18.372136 00023021 SDB vgId:1, update mnodes role, replica:2
07/26 14:25:18.372148 00023021 SDB vgId:1, mnode:1, role:offline
07/26 14:25:18.372158 00023021 MND vgId:1, update mnodes epSet, numOfMnodes:1
07/26 14:25:18.372167 00023021 MND vgId:1, mnodes epSet not set, num:2 inUse:0
07/26 14:25:18.372173 00023021 MND vgId:1, index:0, ep:hadoop1:6030
07/26 14:25:18.372179 00023021 MND vgId:1, index:1, ep:hadoop2:6030
07/26 14:25:18.373227 00023021 VND vgId:2, not exist
07/26 14:25:18.373246 00023021 DND vgId:2, vnode not exist, can't alter it
07/26 14:25:18.719261 00023021 VND vgId:2, not exist
07/26 14:25:18.719272 00023021 DND vgId:2, create vnode msg is received
07/26 14:25:18.719274 00023021 VND vgId:2, not exist
07/26 14:25:18.719331 00023022 DND print minfos, mnodeNum:2 inUse:0
07/26 14:25:18.719353 00023022 DND mnode index:1, hadoop1:6030
07/26 14:25:18.719357 00023022 DND mnode index:3, hadoop2:6030
07/26 14:25:18.719823 00023022 DND successed to write /var/lib/taos/dnode/mnodeEpSet.json
07/26 14:25:18.719846 00023021 VND vgId:2, successed to write /var/lib/taos/vnode/vnode2/config.json
07/26 14:25:18.719952 00023021 VND vgId:2, vnode dir is created, walLevel:1 fsyncPeriod:3000
07/26 14:25:18.720066 00023021 VND vgId:2, load vnode cfg successfully, replcia:2
07/26 14:25:18.720077 00023021 VND vgId:2, dnode:3, hadoop2:6040
07/26 14:25:18.720094 00023021 VND vgId:2, dnode:1, hadoop1:6040
07/26 14:25:18.720151 00023021 DND dnode vwrite worker:0 is launched
07/26 14:25:18.720155 00023021 DND pVnode:0x7f16e0021250, dnode vwrite queue:0x7f16e0021ca0 is allocated
07/26 14:25:18.720177 00023079 DND dnode vwrite worker:0 is running
07/26 14:25:18.720806 00023021 TDB vgId:2 try to restore meta
07/26 14:25:18.720841 00023021 TDB vgId:2 no meta file is restored
07/26 14:25:18.721568 00023021 WAL vgId:2, object is initialized
07/26 14:25:18.721573 00023021 WAL vgId:2, wal:0x7f16e035d1c0 is opened, level:1 fsyncPeriod:3000
07/26 14:25:18.721586 00023021 WAL vgId:2, file:, it is closed before remove all wals
07/26 14:25:18.721635 00023021 WAL vgId:2, file:/var/lib/taos/vnode/vnode2/wal/wal1, it is created and open while renew
07/26 14:25:18.721726 00023021 VND vgId:2, vnode is opened in /var/lib/taos/vnode/vnode2 - /var/lib/taos/vnode/vnode2, pVnode:0x7f16e0021250
07/26 14:25:18.721817 00023021 SYN vgId:2, nodeId:3, 0x7f16e0375c30 it is configured, ep:hadoop2:6040 rid:4
07/26 14:25:18.721845 00023021 SYN vgId:2, nodeId:1, 0x7f16e0375e00 it is configured, ep:hadoop1:6040 rid:5
07/26 14:25:18.721847 00023021 SYN vgId:2, 2 replicas are configured, quorum:1 role:unsynced
07/26 14:25:18.721906 00023021 VND vgId:2, sync role changed from offline to unsynced
07/26 14:25:18.721916 00023021 DND force send status msg to mnode
07/26 14:25:18.721921 00023021 QRY vgId:2, set querymgmt reopen
07/26 14:25:19.286923 00023014 SYN peer TCP connection from ip:192.168.169.130
07/26 14:25:19.287021 00023014 SYN vgId:2, sync connection is incoming, tranId:9412
07/26 14:25:19.287033 00023014 SYN vgId:2, nodeId:1, TCP connection is up, pfd:8 sfd:-1, old pfd:-1
07/26 14:25:19.287038 00023014 SYN vgId:2, nodeId:1, pfd:-1 sfd:-1 will be closed
07/26 14:25:19.287321 00023014 SYN 0x7f16b80008e0 TCP epoll thread is created
07/26 14:25:19.287365 00023014 SYN 0x7f16b80008e0 fd:8 is added to epoll thread, num:1
07/26 14:25:19.287371 00023014 SYN vgId:2, nodeId:1, ready to exchange data
07/26 14:25:19.287551 00023014 SYN vgId:2, nodeId:1, status is sent, self:unsynced:init:0, peer:offline:init:0, ack:1 tranId:23484 type:exchange-data pfd:8
07/26 14:25:19.288445 00023101 SYN vgId:2, nodeId:1, status is received, self:unsynced:init:0, peer:master:18502, ack:0 tranId:23484 type:exchange-data-rsp pfd:8
07/26 14:25:19.288469 00023101 SYN vgId:2, nodeId:1, peer role:offline change to master
07/26 14:25:19.288474 00023101 SYN vgId:2, peer:vgId:2, nodeId:1 is master, index:1
07/26 14:25:19.288476 00023101 SYN vgId:2, nodeId:1, it is the master, replica:2 sver:18502
07/26 14:25:19.288479 00023101 SYN vgId:2, nodeId:1, is master, sync required, self sver:0
07/26 14:25:19.288483 00023101 SYN vgId:2, nodeId:1, try to sync
07/26 14:25:19.288627 00023101 SYN vgId:2, nodeId:1, sync-req is sent to peer, tranId:15506, sstatus:init
07/26 14:25:19.288635 00023101 SYN vgId:2, roles changed, broadcast status, replica:2
07/26 14:25:19.288646 00023101 SYN vgId:2, nodeId:1, status is sent, self:unsynced:init:0, peer:master:init:18502, ack:1 tranId:15437 type:broadcast pfd:8
07/26 14:25:19.290101 00023101 SYN vgId:2, nodeId:1, status is received, self:unsynced:init:0, peer:master:18502, ack:0 tranId:15437 type:broadcast-rsp pfd:8
07/26 14:25:19.290136 00023101 SYN vgId:2, nodeId:1, peer role:master change to master
07/26 14:25:19.290139 00023101 SYN vgId:2, peer:vgId:2, nodeId:1 is master, index:1
07/26 14:25:19.290143 00023101 SYN vgId:2, nodeId:1, it is the master, replica:2 sver:18502
07/26 14:25:19.290145 00023101 SYN vgId:2, nodeId:1, is master, sync required, self sver:0
07/26 14:25:19.290151 00023101 SYN vgId:2, nodeId:1, try to sync
07/26 14:25:19.290253 00023101 SYN vgId:2, nodeId:1, sync-req is sent to peer, tranId:6619, sstatus:init
07/26 14:25:19.290864 00023014 SYN peer TCP connection from ip:192.168.169.130
07/26 14:25:19.290881 00023014 SYN vgId:2, sync connection is incoming, tranId:45341
07/26 14:25:19.290885 00023014 SYN vgId:2, nodeId:1, sync-data msg from master is received, tranId:45341, set sstatus:start
07/26 14:25:19.290969 00023014 SYN vgId:2, nodeId:1, sync restore thread:0x7f16bf7f6700 create successfully, rid:5
07/26 14:25:19.291054 00023102 SYN vgId:2, nodeId:1, start to restore data, sstatus:start
07/26 14:25:19.291067 00023102 VND vgId:2, sync role changed from unsynced to syncing
07/26 14:25:19.291095 00023102 DND force send status msg to mnode
07/26 14:25:19.291129 00023102 SYN vgId:2, recv buffer:0x7f16b40008c0 is created
07/26 14:25:19.291132 00023102 SYN vgId:2, nodeId:1, start to restore, sstatus:init
07/26 14:25:19.291205 00023102 SYN vgId:2, nodeId:1, send sync rsp to peer, tranId:51924
07/26 14:25:19.291210 00023102 SYN vgId:2, nodeId:1, start to restore file, set sstatus:file
07/26 14:25:19.291213 00023102 VND vgId:2, datafile will be synced
07/26 14:25:19.291223 00023102 VND vgId:2, set to reset status
07/26 14:25:19.291229 00023102 QRY vgId:2, set querymgmt closed, wait for all queries cancelled
07/26 14:25:19.493172 00023014 SYN peer TCP connection from ip:192.168.169.130
07/26 14:25:19.493212 00023014 SYN vgId:1, sync connection is incoming, tranId:33734
07/26 14:25:19.493219 00023014 SYN vgId:1, nodeId:1, TCP connection is up, pfd:35 sfd:-1, old pfd:-1
07/26 14:25:19.493223 00023014 SYN vgId:1, nodeId:1, pfd:-1 sfd:-1 will be closed
07/26 14:25:19.493375 00023014 SYN 0x7f16b8000dd0 TCP epoll thread is created
07/26 14:25:19.493400 00023014 SYN 0x7f16b8000dd0 fd:35 is added to epoll thread, num:1
07/26 14:25:19.493405 00023014 SYN vgId:1, nodeId:1, ready to exchange data
07/26 14:25:19.493589 00023014 SYN vgId:1, nodeId:1, status is sent, self:unsynced:init:7, peer:offline:init:0, ack:1 tranId:14082 type:exchange-data pfd:35
07/26 14:25:19.494726 00023103 SYN vgId:1, nodeId:1, status is received, self:unsynced:init:7, peer:master:81556, ack:0 tranId:14082 type:exchange-data-rsp pfd:35
07/26 14:25:19.494749 00023103 SYN vgId:1, nodeId:1, peer role:offline change to master
07/26 14:25:19.494754 00023103 SYN vgId:1, peer:vgId:1, nodeId:1 is master, index:0
07/26 14:25:19.494757 00023103 SYN vgId:1, nodeId:1, it is the master, replica:2 sver:81556
07/26 14:25:19.494761 00023103 SYN vgId:1, nodeId:1, is master, sync required, self sver:7
07/26 14:25:19.494765 00023103 SYN vgId:1, nodeId:1, try to sync
07/26 14:25:19.494893 00023103 SYN vgId:1, nodeId:1, sync-req is sent to peer, tranId:45740, sstatus:init
07/26 14:25:19.494903 00023103 SYN vgId:1, roles changed, broadcast status, replica:2
07/26 14:25:19.494918 00023103 SYN vgId:1, nodeId:1, status is sent, self:unsynced:init:7, peer:master:init:81556, ack:1 tranId:61374 type:broadcast pfd:35
07/26 14:25:19.496057 00023103 SYN vgId:1, nodeId:1, status is received, self:unsynced:init:7, peer:master:81556, ack:0 tranId:61374 type:broadcast-rsp pfd:35
07/26 14:25:19.496075 00023103 SYN vgId:1, nodeId:1, peer role:master change to master
07/26 14:25:19.496080 00023103 SYN vgId:1, peer:vgId:1, nodeId:1 is master, index:0
07/26 14:25:19.496084 00023103 SYN vgId:1, nodeId:1, it is the master, replica:2 sver:81556
07/26 14:25:19.496088 00023103 SYN vgId:1, nodeId:1, is master, sync required, self sver:7
07/26 14:25:19.496094 00023103 SYN vgId:1, nodeId:1, try to sync
07/26 14:25:19.496219 00023103 SYN vgId:1, nodeId:1, sync-req is sent to peer, tranId:9478, sstatus:init
07/26 14:25:19.496848 00023014 SYN peer TCP connection from ip:192.168.169.130
07/26 14:25:19.496872 00023014 SYN vgId:1, sync connection is incoming, tranId:21097
07/26 14:25:19.496879 00023014 SYN vgId:1, nodeId:1, sync-data msg from master is received, tranId:21097, set sstatus:start
07/26 14:25:19.497034 00023014 SYN vgId:1, nodeId:1, sync restore thread:0x7f16be7f4700 create successfully, rid:2
07/26 14:25:19.497142 00023104 SYN vgId:1, nodeId:1, start to restore data, sstatus:start
07/26 14:25:19.497171 00023104 SDB vgId:1, mnode role changed from unsynced to syncing
07/26 14:25:19.497224 00023104 SDB vgId:1, update mnodes role, replica:2
07/26 14:25:19.497283 00023104 SDB vgId:1, mnode:1, role:master
07/26 14:25:19.497313 00023104 MND vgId:1, update mnodes epSet, numOfMnodes:1
07/26 14:25:19.497327 00023104 MND vgId:1, mnodes epSet not set, num:2 inUse:0
07/26 14:25:19.497336 00023104 MND vgId:1, index:0, ep:hadoop1:6030
07/26 14:25:19.497344 00023104 MND vgId:1, index:1, ep:hadoop2:6030
07/26 14:25:19.497372 00023104 SYN vgId:1, recv buffer:0x7f16a4000910 is created
07/26 14:25:19.497377 00023104 SYN vgId:1, nodeId:1, start to restore, sstatus:init
07/26 14:25:19.497526 00023104 SYN vgId:1, nodeId:1, send sync rsp to peer, tranId:43688
07/26 14:25:19.497537 00023104 SYN vgId:1, nodeId:1, start to restore file, set sstatus:file
07/26 14:25:19.498599 00023104 SYN vgId:1, nodeId:1, all files are restored, fver:0
...
```

### 一开始犯的错

`firstEp` 都配置为第一个节点的地址，我开始的时候将第二个节点的 `firstEp` 配置为 `hadoop1:6030` ，那必须起不来。。

![2021-7-31-ClusterError.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-7-31-ClusterError.jpg)

### Reference

* [https://www.taosdata.com/cn/documentation/cluster](https://www.taosdata.com/cn/documentation/cluster)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
