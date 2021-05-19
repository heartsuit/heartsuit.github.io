---
layout: post
title: 在华为鲲鹏openEuler20.03系统上安装Redis, Zookeeper, Nginx
tags: Server, Redis, Zookeeper, Nginx
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

### 安装Redis

* 下载安装

1. 下载：`https://redis.io/download`
2. 上传：`redis-6.2.3.tar.gz`到服务器

``` bash
# 解压
[root@ecs-kunpeng-0006 local]# tar -xvf redis-6.2.3.tar.gz
[root@ecs-kunpeng-0006 local]# mv redis-6.2.3 redis
[root@ecs-kunpeng-0006 local]# cd redis

# 编译
[root@ecs-kunpeng-0006 redis]# make

# 安装
[root@ecs-kunpeng-0006 redis]# make PREFIX=/usr/local/redis install

# 指定配置文件自动，这里配置了端口号为6380
[root@ecs-kunpeng-0006 redis]# bin/redis-server ./redis.conf
612260:C 17 May 2021 14:36:19.264 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
612260:C 17 May 2021 14:36:19.264 # Redis version=6.2.3, bits=64, commit=00000000, modified=0, pid=612260, just started
612260:C 17 May 2021 14:36:19.264 # Configuration loaded
612260:M 17 May 2021 14:36:19.264 * monotonic clock: POSIX clock_gettime
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis 6.2.3 (00000000/0) 64 bit
  .-`` .-```.  ```\/    _.,_ ''-._                                  
 (    '      ,       .-`  | `,    )     Running in standalone mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 6380
 |    `-._   `._    /     _.-'    |     PID: 612260
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           https://redis.io       
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                                               

612260:M 17 May 2021 14:36:19.265 # Server initialized
612260:M 17 May 2021 14:36:19.265 # WARNING Your kernel has a bug that could lead to data corruption during background save. Please upgrade to the latest stable kernel.
612260:M 17 May 2021 14:36:19.265 # Redis will now exit to prevent data corruption. Note that it is possible to suppress this warning by setting the following config: ignore-warnings ARM64-COW-BUG
```

上面 `Redis Server` 启动后又停止了，并且报了一个警告： `Your kernel has a bug that could lead to data corruption during background save. Please upgrade to the latest stable kernel.` 并且，给了解决的建议，即在 `redis.conf` 中取消这最后一条注释： `ignore-warnings ARM64-COW-BUG` 。

``` bash
# 编辑vi redis.conf ，取消最后一行相关注释
[root@ecs-kunpeng-0006 redis]# vi redis.conf 
ignore-warnings ARM64-COW-BUG

# 尝试启动
[root@ecs-kunpeng-0006 redis]# bin/redis-server ./redis.conf
615117:C 17 May 2021 14:36:47.889 # oO0OoO0OoO0Oo Redis is starting oO0OoO0OoO0Oo
615117:C 17 May 2021 14:36:47.889 # Redis version=6.2.3, bits=64, commit=00000000, modified=0, pid=615117, just started
615117:C 17 May 2021 14:36:47.889 # Configuration loaded
615117:M 17 May 2021 14:36:47.890 * monotonic clock: POSIX clock_gettime
                _._                                                  
           _.-``__ ''-._                                             
      _.-``    `.  `_.  ''-._           Redis 6.2.3 (00000000/0) 64 bit
  .-`` .-```.  ```\/    _.,_ ''-._                                  
 (    '      ,       .-`  | `,    )     Running in standalone mode
 |`-._`-...-` __...-.``-._|'` _.-'|     Port: 6380
 |    `-._   `._    /     _.-'    |     PID: 615117
  `-._    `-._  `-./  _.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |           https://redis.io       
  `-._    `-._`-.__.-'_.-'    _.-'                                   
 |`-._`-._    `-.__.-'    _.-'_.-'|                                  
 |    `-._`-._        _.-'_.-'    |                                  
  `-._    `-._`-.__.-'_.-'    _.-'                                   
      `-._    `-.__.-'    _.-'                                       
          `-._        _.-'                                           
              `-.__.-'                                               

615117:M 17 May 2021 14:36:47.890 # Server initialized
615117:M 17 May 2021 14:36:47.891 # WARNING Your kernel has a bug that could lead to data corruption during background save. Please upgrade to the latest stable kernel.
615117:M 17 May 2021 14:36:47.891 * Ready to accept connections
```

启动成功๑乛◡乛๑

* 远程访问

``` bash
# 注释第75行的bind，同时将94行的protected-mode由yes改为no
[root@ecs-kunpeng-0006 redis]# vi redis.conf
75 #bind 127.0.0.1 -::1
94 protected-mode no
```

* 后台启动

``` bash
# 将257行的daemonize由no改为yes
[root@ecs-kunpeng-0006 redis]# vi redis.conf
257 daemonize yes
```

* 开启认证

``` bash
# 将901行的requirepass开启，改为自己的密码
[root@ecs-kunpeng-0006 redis]# vi redis.conf
901 requirepass your-guess
```

* 停止服务

``` bash
# 无密码停止服务
[root@ecs-kunpeng-0006 redis]# bin/redis-cli -h 127.0.0.1 -p 6380 shutdown

# 带密码停止服务
[root@ecs-kunpeng-0006 redis]# bin/redis-cli -a 密码 -h 127.0.0.1 -p 6380 shutdown
```

* 配置日志

以后台方式启动后，发现 `Redis` 的日志完全没了。。所以需要配置下日志路径。

``` bash
[root@ecs-kunpeng-0006 redis]# vi redis.conf
# Specify the log file name. Also the empty string can be used to force
# Redis to log on the standard output. Note that if you use standard
# output for logging but daemonize, logs will be sent to /dev/null
logfile ""
改为：
logfile "/usr/local/redis/log/redis.log"

# 需要手动创建目录，redis.log文件在下次启动时则会自动创建
[root@ecs-kunpeng-0006 redis]# mkdir log

# 启动即可
[root@ecs-kunpeng-0006 redis]# bin/redis-server ./redis.conf
```

Note: `Redis` 默认端口为 `6379` ，我这里改了端口为 `6380` 。

### 安装Zookeeper

``` bash
# 下载
[root@ecs-kunpeng-0001 local]# wget https://mirrors.bfsu.edu.cn/apache/zookeeper/zookeeper-3.6.3/apache-zookeeper-3.6.3-bin.tar.gz

# 解压
[root@ecs-kunpeng-0001 local]# tar -xvf apache-zookeeper-3.6.3-bin.tar.gz
[root@ecs-kunpeng-0001 local]# mv apache-zookeeper-3.6.3-bin zookeeper

[root@ecs-kunpeng-0001 zookeeper]# cp conf/zoo_sample.cfg conf/zoo.cfg
# 配置数据与日志目录，zk在第一次启动时会自动创建
[root@ecs-kunpeng-0001 zookeeper]# vi conf/zoo.cfg 
dataDir=/usr/local/zookeeper/data
dataLogDir=/usr/local/zookeeper/log

# 尝试启动
[root@ecs-kunpeng-0001 zookeeper]# bin/zkServer.sh start
/usr/bin/java
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Starting zookeeper ... STARTED

# 查看状态
[root@ecs-kunpeng-0001 zookeeper]# bin/zkServer.sh status
/usr/bin/java
ZooKeeper JMX enabled by default
Using config: /usr/local/zookeeper/bin/../conf/zoo.cfg
Client port found: 2181. Client address: localhost. Client SSL: false.
Mode: standalone
```

### 安装Nginx

配置好源后，这里使用 `yum` 或者 `dnf` 来安装 `Nginx` 。

``` bash
# yum安装nginx
[root@ecs-kunpeng-0001 ~]# yum install nginx
[root@ecs-kunpeng-0001 ~]# nginx -v
nginx version: nginx/1.16.1

# 配置服务
[root@ecs-kunpeng-0001 ~]# vi /etc/nginx/nginx.conf

# 加载配置
[root@ecs-kunpeng-0001 ~]# nginx -s reload
nginx: [warn] could not build optimal types_hash, you should increase either types_hash_max_size: 2048 or types_hash_bucket_size: 64; ignoring types_hash_bucket_size
```

在重新加载配置时有个警告：

    nginx: [warn] could not build optimal types_hash, you should increase either types_hash_max_size: 2048 or types_hash_bucket_size: 64; ignoring types_hash_bucket_size

``` bash
# 编辑vi /etc/nginx/nginx.conf，在http下增加配置：types_hash_bucket_size 1024;
[root@ecs-kunpeng-0001 ~]# vi /etc/nginx/nginx.conf
types_hash_bucket_size 1024

# 测试配置
[root@ecs-kunpeng-0001 ~]# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful

# 查看Nginx状态，active
[root@ecs-kunpeng-0001 ~]# service nginx status
```

![2021-05-19-NginxStatus.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-05-19-NginxStatus.png)

### Reference

* [华为官方镜像](https://mirrors.huaweicloud.com/)
* [华为官方镜像rpm](https://mirrors.huaweicloud.com/openeuler/openEuler-20.03-LTS/everything/aarch64/Packages/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
