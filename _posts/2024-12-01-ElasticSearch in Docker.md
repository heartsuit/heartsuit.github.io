---
layout: post
title: 使用docker-compose部署搜索引擎ElasticSearch6.8.10
tags: Docker, ElasticSearch
---

## 背景

`Elasticsearch` 是一个开源的分布式搜索和分析引擎，基于 `Apache Lucene` 构建。它被广泛用于实时数据搜索、日志分析、全文检索等应用场景。 `Elasticsearch` 支持高效的全文搜索，并提供了强大的聚合功能，可以处理大规模的数据集并进行快速搜索和分析。 `Elasticsearch` 可用于构建各种类型的应用程序，例如电商网站的商品搜索、新闻网站的文章搜索、企业内部的日志分析和监控等。

本文通过 `Docker` 容器化方式并基于一个 `Elasticsearch` 旧版本 `6.8.10` 来安装，新版的 `ElasticSearch` 8.0的安装操作可参考：[将最新版的ElasticSearch8与Kibana8在CentOS7上跑起来](https://heartsuit.blog.csdn.net/article/details/123028697)。另外，2024年11月的软考**系统架构设计师**考试在案例题中考察了 `ElasticSearch` 分布式全文搜索中间件，这个考察相对有深度，不仅仅是简单的使用，而是与分词相关的内容。

## 系统环境

```bash
[root@ops ~]# uname -a
Linux ops 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@ops ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## 配置服务

* docker-compose.yml

```yaml
  my-elasticsearch:
    image: elasticsearch:6.8.10
    container_name: my-elasticsearch
    environment:
      ES_JAVA_OPTS: -Djava.net.preferIPv4Stack=true -Xms1g -Xmx1g
      transport.host: 0.0.0.0
      discovery.zen.minimum_master_nodes: 1
      discovery.zen.ping.unicast.hosts: elasticsearch
      TZ: Asia/Shanghai
    volumes:
      - ./elasticsearch/config/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
      - ./elasticsearch/data:/usr/share/elasticsearch/data
      - ./elasticsearch/logs:/usr/share/elasticsearch/logs
      - ./elasticsearch/plugins:/usr/share/elasticsearch/plugins
    ports:
      - "9200:9200"
      - "9300:9300"
```

* elasticsearch.yml

```yaml
# 设置Elasticsearch节点的发现类型为单节点
discovery.type: "single-node"
# 尝试锁定内存，以防止被交换到磁盘
bootstrap.memory_lock: true
# Elasticsearch在所有可用网络接口上侦听，可以从任何地址访问
network.host: 0.0.0.0
# Elasticsearch HTTP API的监听端口
http.port: 9200
# Elasticsearch节点之间通信的TCP端口
transport.tcp.port: 9300
# Elasticsearch日志文件的输出路径
path.logs: /usr/share/elasticsearch/logs
# 启用跨域资源共享（CORS）支持
http.cors.enabled: true
# 允许来自任何源的跨域请求
http.cors.allow-origin: "*"
# 启用Elasticsearch安全性功能
xpack.security.enabled: true
# 允许包含 Authorization 头的跨域请求
http.cors.allow-headers: Authorization
# 启用节点之间传输层安全性（TLS/SSL）
xpack.security.transport.ssl.enabled: true
# 启用监控收集
xpack.monitoring.collection.enabled: true
```

## 部署服务

在启动之前，先创建好对应的目录，并给予执行权限

```bash
mkdir -p /opt/docker/elasticsearch/config
mkdir -p /opt/docker/elasticsearch/data
mkdir -p /opt/docker/elasticsearch/logs
mkdir -p /opt/docker/elasticsearch/plugins

chown -R root:root elasticsearch
chmod 777 -R elasticsearch
```

> docker-compose -f docker-compose.yml up -d my-elasticsearch

## 修改密码

安全起见，所有的基础服务都开启认证并配置密码，进入容器，通过以下命令设置密码。

```bash
# 进入容器
docker exec -it my-elasticsearch /bin/bash
# 设置密码
elasticsearch-setup-passwords interactive
```

交互式设置密码，具体执行结果如下。

```bash
[root@svc docker]# docker exec -it my-elasticsearch /bin/bash
[root@0a204f9b5762 elasticsearch]# elasticsearch-setup-passwords interactive
Initiating the setup of passwords for reserved users elastic,apm_system,kibana,logstash_system,beats_system,remote_monitoring_user.
You will be prompted to enter passwords as the process progresses.
Please confirm that you would like to continue [y/N]y

Enter password for [elastic]: 
Reenter password for [elastic]: 
Enter password for [apm_system]: 
Reenter password for [apm_system]: 
Enter password for [kibana]: 
Reenter password for [kibana]: 
Enter password for [logstash_system]: 
Reenter password for [logstash_system]: 
Enter password for [beats_system]: 
Reenter password for [beats_system]: 
Enter password for [remote_monitoring_user]: 
Reenter password for [remote_monitoring_user]: 
Changed password for user [apm_system]
Changed password for user [kibana]
Changed password for user [logstash_system]
Changed password for user [beats_system]
Changed password for user [remote_monitoring_user]
Changed password for user [elastic]
```

## 验证服务

在浏览器中验证 `Elasticsearch 6.8.10` 的安装情况，由于前面我们开启了 `Elasticsearch` 的认证，因此首先需要在浏览器弹窗框（ `HTTPBasic` ）里输入认证信息。

![2024-12-01-ElasticSearch.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-01-ElasticSearch.jpg)

* 查看节点健康状态：http://192.168.44.168:9200/_cat/health?v
* 查看节点索引：http://192.168.44.168:9200/_cat/indices?v
* 查看索引内容：http://192.168.44.168:9200/索引名称/_search?pretty

## 离线操作

如果是离线环境部署，则需要先在有网络的环境下拉取镜像，然后通过 `docker save elasticsearch:6.8.10 -o elasticsearch.tar` 完成镜像导出，最后在目标主机上离线加载上一步导出的镜像。

```bash
# 离线导入镜像
[root@svc opt]# docker load -i elasticsearch.tar 
edf3aa290fb3: Loading layer [==================================================>]  211.1MB/211.1MB
066109abe451: Loading layer [==================================================>]  359.6MB/359.6MB
83b86c34afe7: Loading layer [==================================================>]  73.86MB/73.86MB
6e851073edad: Loading layer [==================================================>]  379.4kB/379.4kB
cb11836a653d: Loading layer [==================================================>]  241.1MB/241.1MB
d40f4cc2180f: Loading layer [==================================================>]   7.68kB/7.68kB
5e35467de158: Loading layer [==================================================>]  9.728kB/9.728kB
Loaded image: elasticsearch:6.8.10

# 查看已有镜像
[root@svc opt]# docker images
REPOSITORY             TAG         IMAGE ID       CREATED         SIZE
redis                  6-alpine    4100b5bd1743   7 weeks ago     35.5MB
nginx                  1.25.3      a8758716bb6a   13 months ago   187MB
openjdk                8-jre       0c14a0e20aa3   2 years ago     274MB
elasticsearch          6.8.10      ffa00077159c   4 years ago     877MB
```

如果需要重新构建、更新服务，可通过以下命令实现。

```bash
docker stop my-elasticsearch
docker rm my-elasticsearch
docker-compose -f docker-compose.yml up -d my-elasticsearch
```

## 小总结

上述内容介绍了如何在 `OpenEuler` 系统上使用 `Docker` 容器化方式部署 `ElasticSearch 6.8.10` 版本。文章涵盖了完整的部署流程，包括环境配置、 `docker-compose` 与 `elasticsearch` 的配置文件编写、目录权限设置、密码安全配置、服务验证方法以及离线部署操作等内容。同时，还附上了之前撰写的一系列从入门到集群部署的 `ElasticSearch` 相关文章链接，为大家提供一个完整的学习路径。

附：以前写的关于 `ElasticSearch` 的内容，包含 `ElasticSearch8.0` 分布式搜索引擎集群及其高可用测试。

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

* [https://www.cnblogs.com/handsometaoa/p/17988216](https://www.cnblogs.com/handsometaoa/p/17988216)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
