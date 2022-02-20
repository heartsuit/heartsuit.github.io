---
layout: post
title: 将最新版的ElasticSearch8与Kibana8在CentOS7上跑起来
tags: SpringBoot, ElasticSearch
---

## 背景

以前也搭建体验过基于 `ElasticSearch` 7.x的服务及集群，不过当时一直在内网环境下运行，也没有进行其认证相关的配置 `xpack` ，我记得当时写的建议：由于 `Elasticsearch` 默认未启用内置的安全防御机制，因此在生产环境中不建议直接开放在公网上。否则，就是在网络上裸奔。。。这不， `ElasticSearch` 8.0来了，**默认开启安全防护**便是其中一个新特性，根据官方介绍， `ElasticSearch` 8.0带来的[主要特性](https://www.elastic.co/guide/en/elasticsearch/reference/current/release-highlights.html)包括：

![2022-02-19-ElasticSearch8Feature.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-19-ElasticSearch8Feature.jpg)

1. 7.x REST API compatibility（通过头信息配置可兼容7.x REST API）
2. Security features are enabled and configured by default（默认启用安全相关的配置：认证、授权、节点间以及与Kibana间的TLS传输）
3. Better protection for system indices（更好地保护系统索引）
4. New kNN search API（新增kNN搜索API）
5. Storage savings for keyword, match_only_text, and text fields（升级的倒排索引，节约存储空间）
6. Faster indexing of geo_point, geo_shape, and range fields（对地理信息相关数据更快地索引效率）
7. PyTorch model support for natural language processing (NLP)（支持上传训练好的PyTorch模型至ElasticSearch进行自然语言处理）

## 系统环境

在 `CentOS7` 上进行安装，虚拟主机信息如下：

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

## 下载、安装并启动ElasticSearch8

```bash
[root@hadoop1 ~]# cd /usr/local/
[root@hadoop1 local]# wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.0.0-linux-x86_64.tar.gz
[root@hadoop1 local]# tar -xvf elasticsearch-8.0.0-linux-x86_64.tar.gz
[root@hadoop1 local]# mv elasticsearch-8.0.0 elasticsearch
[root@hadoop1 local]# cd elasticsearch
[root@hadoop1 elasticsearch]# ./bin/elasticsearch
```

### 问题1：不可使用root用户直接启动elasticsearch

> org.elasticsearch.bootstrap. StartupException: java.lang. RuntimeException: can not run elasticsearch as root

解决方法：添加用户，并赋予对 `elasticsearch` 目录的权限

```bash
# 添加用户es-admin
[root@hadoop1 elasticsearch]# useradd es-admin
# 赋予对elasticsearch目录的权限
[root@hadoop1 elasticsearch]# chown -R es-admin:es-admin /usr/local/elasticsearch
# 切换至es-admin
[root@hadoop1 elasticsearch]# su es-admin
# 尝试启动ElasticSearch
[es-admin@hadoop1 elasticsearch]$ ./bin/elasticsearch
```

### 问题2：操作系统的默认配置不满足elasticsearch要求

```
ERROR: [2] bootstrap checks failed. You must address the points described in the following [2] lines before starting Elasticsearch.
bootstrap check failure [1] of [2]: max file descriptors [4096] for elasticsearch process is too low, increase to at least [65535]
bootstrap check failure [2] of [2]: max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
```

解决方法：

* 解决“max file descriptors [4096] for elasticsearch process is too low”问题：

```bash
# 先查看系统的默认配置
[es-admin@hadoop1 elasticsearch]$ ulimit -Hn
4096
[es-admin@hadoop1 elasticsearch]$ ulimit -Sn
1024

# 切换至root
[es-admin@hadoop1 elasticsearch]$ exit
exit

# 编辑vi /etc/security/limits.conf，在最后添加以下内容，注意要退出root用户重新登录后才会生效
[root@hadoop1 elasticsearch]# vi /etc/security/limits.conf
*               soft    nofile          65536
*               hard    nofile          65536

# 验证我们的操作是否生效
[root@hadoop1 elasticsearch]# ulimit -Hn
65536
[root@hadoop1 elasticsearch]# ulimit -Sn
65536
```

* 解决“max virtual memory areas vm.max_map_count [65530] is too low”问题：

```bash
# 编辑vi /etc/sysctl.conf，在最后添加：
[es-admin@hadoop1 elasticsearch]$ vi /etc/sysctl.conf
vm.max_map_count = 262144

# 记得使用sysctl -p刷新配置文件
[root@hadoop1 elasticsearch]# sysctl -p

# 切换到es-admin用户
[root@hadoop1 elasticsearch]# su es-admin

# 尝试启动
[es-admin@hadoop1 elasticsearch]$ ./bin/elasticsearch
```

不出意外，可正常启动 `ElasticSearch` 8.0服务，同时注意控制台打印的这段日志，其中包含了4部分重要信息：
1. `elastic`用户的密码（登录ElasticSearch与Kibana的Web界面时需要~）；
2. HTTP `CA`证书`SHA-256`指纹；
3. 用于Kibana连接当前`ElasticSearch`服务的`enrollment token`（注意有效期为30分钟！！）；
4. 说明了如何让其他`ElasticSearch`节点加入当前集群的操作步骤（我会在下一篇介绍`ElasticSearch8.0`分布式搜索引擎集群及其高可用测试）。

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

上述问题解决后，在浏览器访问"https://localhost:9200"，注意这里使用 `HTTPS` 协议访问。

![2022-02-19-ElasticSearchHTTPS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-19-ElasticSearchHTTPS.jpg)

输入用户名： `elastic` ，密码： `9SWTTFDuibtaS2*L0NRv` 。登录成功后，经典的启动信息页面：“You Know, for Search”。

![2022-02-19-ElasticSearchHTTPS.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-19-ElasticSearchHTTPS.jpg)

## 下载、安装并启动Kibana8

```bash
[root@hadoop1 ~]# cd /usr/local/
[root@hadoop1 local]# wget https://artifacts.elastic.co/downloads/kibana/kibana-8.0.0-linux-x86_64.tar.gz
[root@hadoop1 local]# tar -xvf kibana-8.0.0-linux-x86_64.tar.gz
[root@hadoop1 local]# mv kibana-8.0.0 kibana
[root@hadoop1 local]# cd kibana
[root@hadoop1 kibana]# ./bin/kibana
```

### 问题1：不可使用root用户直接启动kibana

> Error: Unable to write to UUID file at /usr/local/kibana/data/uuid. Ensure Kibana has sufficient permissions to read / write to this file.  Error was: EACCES

解决方法：使用 `es-admin` 用户（这个是前面新增的，名字可以自己起），赋予对 `kibana` 目录的权限。

```bash
# 赋予对kibana目录的权限
[root@hadoop1 kibana]# chown -R es-admin:es-admin /usr/local/kibana
# 切换至es-admin
[root@hadoop1 kibana]# su es-admin
# 尝试启动Kibana
[es-admin@hadoop1 kibana]$ ./bin/kibana
```

### 问题2：默认仅能本地访问kibana服务

解决了前一个问题后， `Kibana` 成功启动，并在控制台打印出如下内容，仅能本地访问，可我的是 `CentOS` 系统，没法打开浏览器进行本机访问。

> Go to http://localhost:5601/?code=194486 to get started.

解决方法：修改配置，让其他机器也可访问 `Kibana` 。

![2022-02-19-KibanaHost.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-19-KibanaHost.jpg)

```bash
# 编辑配置文件，修改server.host: "0.0.0.0"
[es-admin@hadoop1 kibana]$ vi ./config/kibana.yml
server.host: "0.0.0.0"

# 尝试启动Kibana
[es-admin@hadoop1 kibana]$ ./bin/kibana
```

`Kibana` 成功启动后，使用控制台生成的附加随机码的连接在远程的浏览器上打开，输入第一次启动 `ElasticSearch` 时，默认生成的 `enrollment token` 。

### 问题3：Kibana连接ElasticSearch的enrollment token过期

> [2022-02-19T22:16:24.366+08:00][ERROR][plugins.interactiveSetup.elasticsearch] Failed to enroll with host "https://192.168.44.127:9200": {"error":{"root_cause":[{"type":"security_exception", "reason":"unable to authenticate with provided credentials and anonymous access is not allowed for this request", "additional_unsuccessful_credentials":"API key: api key is expired", "header":{"WWW-Authenticate":["Basic realm=\"security\" charset=\"UTF-8\"", "Bearer realm=\"security\"", "ApiKey"]}}], "type":"security_exception", "reason":"unable to authenticate with provided credentials and anonymous access is not allowed for this request", "additional_unsuccessful_credentials":"API key: api key is expired", "header":{"WWW-Authenticate":["Basic realm=\"security\" charset=\"UTF-8\"", "Bearer realm=\"security\"", "ApiKey"]}}, "status":401}

前面提到，第一次启动 `ElasticSearch` 时，默认生成的 `enrollment token` 在30分钟内有效，但是如果从第一次启动 `ElasticSearch` 服务，到 `Kibana` 服务启动连接 `ElasticSearch` 时超过了30分钟，该怎么办呢？（感觉像是断了线的风筝，失去了与组织的单线联系，好慌。。）

这时需要使用E `lasticSearch` 自带的工具： `/bin/elasticsearch-create-enrollment-token` ，重新手动生成 `Kibana` 连接 `ElasticSearch` 的 `enrollment token` 。

```bash
# 使用ElasticSearch自带的工具：/bin/elasticsearch-create-enrollment-token，后续添加节点到集群内时，同样要用到这个工具~~
[root@hadoop1 elasticsearch]# ./bin/elasticsearch-create-enrollment-token  -s kibana
warning: ignoring JAVA_HOME=/usr/local/jdk; using bundled JDK
eyJ2ZXIiOiI4LjAuMCIsImFkciI6WyIxOTIuMTY4LjQ0LjEyNzo5MjAwIl0sImZnciI6Ijc1NDgwYTlmYzkzNjQ5ZTJlYmQ4ZGQwYTlmMDcyMTI0N2U4Y2ZmMzJmZGJjNzhhYmYwYjMwZDdhYzljOGU4YmQiLCJrZXkiOiJWcjlhRW44QnVQdHBqaU9BQjMwTDpCNHlYclhweFNzNmRtWWJaaFBKOWhRIn0=
```

接着要输入用户名与密码后登录 `Kibana` （这里的用户名与密码跟 `ElasticSearch` 用到的一致），打完收工~

![2022-02-19-KibanaHome.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-19-KibanaHome.jpg)

## 小总结

之所以要实践最新版的 `ElasticSearch` 8.0，主要还是奔着**默认启用安全功能**这一新特性来的，毕竟以前关于 `ElasticSearch` ， `Redis` 甚至 `MongoDB` 的勒索事件层出不穷，主要原因还是人们安全意识淡薄或者偷懒没有配置认证功能，然后使用这些服务的默认配置（没有启用最基本的认证功能，更不用说强密码了。。）直接在公网环境运行（裸奔）。。

预告：后面体验下 `ElasticSearch8.0` 分布式搜索引擎集群及其高可用测试。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
