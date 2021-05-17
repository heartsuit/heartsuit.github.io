---
layout: post
title: 在华为鲲鹏openEuler20.03系统上安装ElasticSearch
tags: Server, ElasticSearch
---

### 背景

这里实验用的华为云鲲鹏服务器配置如下：

    Huawei Kunpeng 920 2.6GHz
    4vCPUs | 8GB
    openEuler 20.03 64bit with ARM

连接机器后，先查看系统相关信息，注意这里是 `aarch64` 的，后续软件包也需要是 `aarch64` 版本的。

``` bash
# 查看系统内核信息
[root@ecs-kunpeng-0005 ~]# uname -a
Linux ecs-kunpeng-0005 4.19.90-2003.4.0.0036.oe1.aarch64 #1 SMP Mon Mar 23 19:06:43 UTC 2020 aarch64 aarch64 aarch64 GNU/Linux

# 查看系统版本信息
[root@ecs-kunpeng-0005 ~]# cat /etc/os-release
NAME="openEuler"
VERSION="20.03 (LTS)"
ID="openEuler"
VERSION_ID="20.03"
PRETTY_NAME="openEuler 20.03 (LTS)"
ANSI_COLOR="0;31"
```

### 检查环境

`ElasticSearch` 使用 `Java` 实现，因此首先需要有 `Java` 环境，而 `openEuler 20.03 64bit with ARM` 这个系统默认已经预装了 `Java8` 。

``` bash
[root@ecs-kunpeng-0005 ~]# java -version
openjdk version "1.8.0_242"
OpenJDK Runtime Environment (build 1.8.0_242-b08)
OpenJDK 64-Bit Server VM (build 25.242-b08, mixed mode)
```

### 安装ElasticSearch

* 下载安装

这里下载最新版的 `ElasticSearch` ，支持 `aarch64` （我们实际线上使用的是旧版本 `7.3.0` ， 但是 `ElasticSearch` 官网上发现没有对应 `aarch64` 架构的版本）。

``` bash
# 下载elasticsearch-7.12.1-linux-aarch64.tar.gz
[root@ecs-kunpeng-0005 elasticsearch]# wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-7.12.1-linux-aarch64.tar.gz

# 解压
[root@ecs-kunpeng-0005 elasticsearch]# tar -xvf elasticsearch-7.12.1-linux-aarch64.tar.gz

# 重命名目录
[root@ecs-kunpeng-0005 local]# mv elasticsearch-7.12.1 elasticsearch
[root@ecs-kunpeng-0005 local]# cd elasticsearch

# 尝试启动
[root@ecs-kunpeng-0005 elasticsearch]# ./bin/elasticsearch
```

---

* 问题1：org.elasticsearch.bootstrap. StartupException: java.lang. RuntimeException: can not run elasticsearch as root

* 解决方法：

``` bash
# 创建ES用户
[root@ecs-kunpeng-0005 elasticsearch]# useradd es-admin
# 赋予其elasticsearch目录的权限
[root@ecs-kunpeng-0005 elasticsearch]# chown -R es-admin:es-admin /usr/local/elasticsearch
# 切换到新创建的用户
[root@ecs-kunpeng-0005 elasticsearch]# su es-admin

# 尝试启动
[es-admin@ecs-kunpeng-0005 elasticsearch]$ ./bin/elasticsearch
```

---

* 问题2：安全组开放`9200`后，无法在浏览器通过公网访问：http://公网IP:9200/

Note：**由于 `Elasticsearch` 本身没有任何内置的安全防御机制，因此在生产环境中不建议直接开放在公网上。否则，就是在网络上裸奔。。**

* 解决方法：

``` bash
# 编辑vi config/elasticsearch.yml，添加：
[es-admin@ecs-kunpeng-0005 elasticsearch]$ vi config/elasticsearch.yml 
network.host: 0.0.0.0

# 尝试启动
[es-admin@ecs-kunpeng-0005 elasticsearch]$ ./bin/elasticsearch
```

---

* 问题3：

    ERROR: [2] bootstrap checks failed. You must address the points described in the following [2] lines before starting Elasticsearch.
    bootstrap check failure [1] of [2]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
    bootstrap check failure [2] of [2]: the default discovery settings are unsuitable for production use; at least one of [discovery.seed_hosts, discovery.seed_providers, cluster.initial_master_nodes] must be configured

* 解决方法：

``` bash
# 编辑vi config/elasticsearch.yml，添加：
[es-admin@ecs-kunpeng-0005 elasticsearch]$ vi config/elasticsearch.yml 
node.name: es-node0
cluster.initial_master_nodes: ["es-node0"]

# 尝试启动
[es-admin@ecs-kunpeng-0005 elasticsearch]$ ./bin/elasticsearch
```

---

* 问题4：

    ERROR: [1] bootstrap checks failed. You must address the points described in the following [1] lines before starting Elasticsearch.
    bootstrap check failure [1] of [1]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]

* 解决方法：

``` bash
# 切换至root
[es-admin@ecs-kunpeng-0005 elasticsearch]$ exit
exit

# 编辑vi /etc/sysctl.conf，添加：
[root@ecs-kunpeng-0005 elasticsearch]# vi /etc/sysctl.conf
vm.max_map_count=262144

# 记得使用sysctl -p刷新配置文件
[root@ecs-kunpeng-0005 elasticsearch]# sysctl -p

# 切换到es-admin用户
[root@ecs-kunpeng-0005 elasticsearch]# su es-admin

# 尝试启动
[es-admin@ecs-kunpeng-0005 elasticsearch]$ ./bin/elasticsearch

# 查看是否有Elasticsearch进程
[root@ecs-kunpeng-0005 ~]# jps
1956797 Jps
338557 Elasticsearch
```

这时，访问 `http://公网IP:9200/` 可看到 `ElasticSearch` 成功启动๑乛◡乛๑

![2021-05-17-ES9200.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-05-17-ES9200.png)

---

### 扩展

> 需要注意的是，以上述方式启动 `ElasticSearch` 后，会发现它占用的内存很大。

* 解决方法：

在目录 `jvm.options.d` 下新建一个 `jvm.options` 文件（不要直接修改 `/config/jvm.options` ，这在 `config/jvm.options` 本身里面也有说明），手动配置堆内存大小。

``` bash
[es-admin@ecs-kunpeng-0005 elasticsearch]$ vi config/jvm.options.d/jvm.options
-Xms1g
-Xmx1g
```

这样启动后，观察 `ElasticSearch` 占用的内存，会发现少了很多。这里参数的含义如下：

* `JVM` 初始分配的内存由 `-Xms` 指定，默认是物理内存的 `1/64`
* `JVM` 最大分配的内存由 `-Xmx` 指定，默认是物理内存的 `1/4`

---

这里有个小插曲，导致又出现一个错误；由于粗心(╥╯^╰╥)，上一步里面的配置写成了

``` bash
-Xms1g
-Xms1g
```

报错如下：

    bootstrap check failure [1] of [1]: initial heap size [1073741824] not equal to maximum heap size [1811939328]; this can cause resize pauses

对于如何使用 `ElasticSearch` ，可参考以下系列入门教程：

1. [ElasticSearch入门（一）单节点初体验](https://heartsuit.blog.csdn.net/article/details/104418727)；
2. [ElasticSearch入门（二）批量导入数据（Postman与Kibana）](https://heartsuit.blog.csdn.net/article/details/104465210)；
3. [ElasticSearch入门（三）Logstash实现MySQL数据同步至ElasticSearch](https://heartsuit.blog.csdn.net/article/details/105564688)；
4. [ ElasticSearch入门（四）常用插件：Head插件与ik分词器](https://heartsuit.blog.csdn.net/article/details/105586117)；
5. [ ElasticSearch入门（五）SpringBoot2.3.0集成ElasticSearch7.5.2-HighLevelClient](https://heartsuit.blog.csdn.net/article/details/107008689)；
6. [ElasticSearch入门（六）SpringBoot2.3.0集成ElasticSearch7.5.2-SpringData](https://heartsuit.blog.csdn.net/article/details/107029008)；
7. [ElasticSearch入门（七）搭建ElasticSearch集群](https://heartsuit.blog.csdn.net/article/details/107032707)；

### Reference

* [华为官方镜像](https://mirrors.huaweicloud.com/)
* [华为官方镜像rpm](https://mirrors.huaweicloud.com/openeuler/openEuler-20.03-LTS/everything/aarch64/Packages/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
