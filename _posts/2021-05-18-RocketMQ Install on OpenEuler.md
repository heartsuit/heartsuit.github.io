---
layout: post
title: 在华为鲲鹏openEuler20.03系统上安装RocketMQ
tags: Server, RocketMQ
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

`RocketMQ` 使用 `Java` 实现，因此首先需要有 `Java` 环境，而 `openEuler 20.03 64bit with ARM` 这个系统默认已经预装了 `Java8` 。

``` bash
[root@ecs-kunpeng-0005 ~]# java -version
openjdk version "1.8.0_242"
OpenJDK Runtime Environment (build 1.8.0_242-b08)
OpenJDK 64-Bit Server VM (build 25.242-b08, mixed mode)
```

### 安装RocketMQ

* 下载：https://www.apache.org/dyn/closer.cgi?path=rocketmq/4.7.1/rocketmq-all-4.7.1-bin-release.zip

``` bash
# 解压
[root@ecs-kunpeng-0006 local]# unzip rocketmq-all-4.7.1-bin-release.zip
[root@ecs-kunpeng-0006 local]# mv rocketmq-all-4.7.1-bin-release rocketmq
[root@ecs-kunpeng-0006 local]# cd rocketmq

# 后台启动nameserver
[root@ecs-kunpeng-0006 rocketmq]# nohup sh bin/mqnamesrv &
# 查看nameserver启动日志
[root@ecs-kunpeng-0006 rocketmq]# tail -f ~/logs/rocketmqlogs/namesrv.log
# 查看nameserver进程
[root@ecs-kunpeng-0006 rocketmq]# jps
1557947 Jps
230238 NamesrvStartup

# 启动broker
[root@ecs-kunpeng-0006 rocketmq]# bin/mqbroker -n localhost:9876
```

* 问题1：启动`Broker`时报错：

    Error: VM option 'UseG1GC' is experimental and must be enabled via -XX:+UnlockExperimentalVMOptions.
    Error: Could not create the Java Virtual Machine.
    Error: A fatal exception has occurred. Program will exit.

* 解决方法：查看bin/mqbroker的脚本可发现，其中调用了runbroker.sh，编辑runbroker.sh，发现其中有UseG1GC的可选项（实验性的选项），删除这一行即可。

``` bash
# 删除包含UseG1GC的一行配置
[root@ecs-kunpeng-0006 rocketmq]# vi bin/runbroker.sh
JAVA_OPT="${JAVA_OPT} -XX:+UseG1GC -XX:G1HeapRegionSize=16m -XX:G1ReservePercent=25 -XX:InitiatingHeapOccupancyPercent=30 -XX:SoftRefLRUPolicyMSPerMB=0"
```

* 问题2：

    There is insufficient memory for the Java Runtime Environment to continue.
    Native memory allocation (mmap) failed to map 8589934592 bytes for committing reserved memory.
    An error report file with more information is saved as:
    /usr/local/rocketmq/bin/hs_err_pid10503.log

``` bash
# 编辑runbroker.sh
[root@ecs-kunpeng-0006 rocketmq]# vi bin/runbroker.sh
JAVA_OPT="${JAVA_OPT} -server -Xms8g -Xmx8g -Xmn4g"
修改为：
JAVA_OPT="${JAVA_OPT} -server -Xms256m -Xmx256m -Xmn128m"

# 尝试重新启动
[root@ecs-kunpeng-0006 rocketmq]# bin/mqbroker -n localhost:9876
The broker[ecs-kunpeng-0006, 172.17.0.1:10911] boot success. serializeType=JSON and name server is localhost:9876

# 查看进程
[root@ecs-kunpeng-0006 rocketmq]# jps
1657041 BrokerStartup
1659988 Jps
230238 NamesrvStartup
```

* 问题3：前面步骤启动之后，无法通过公网访问

如果 `rocketmq` 部署在公网上，要通过外网访问时，需进行如下配置。

``` bash
# 1. 在conf/broker.conf中添加：
[root@ecs-kunpeng-0006 rocketmq]# vi conf/broker.conf
brokerIP1=你的公网IP

# 2. 通过这条命令启动broker:
[root@ecs-kunpeng-0006 rocketmq]# bin/mqbroker -n 你的公网IP:9876 -c conf/broker.conf
The broker[broker-a, 你的公网IP:10911] boot success. serializeType=JSON and name server is 你的公网IP:9876

# 否则远程客户端报错：
org.apache.rocketmq.remoting.exception.RemotingTooMuchRequestException: sendDefaultImpl call timeout
```

### 基于SpringBoot的远程客户端

1. pom.xml中添加依赖

``` xml
<dependency>
    <groupId>org.apache.rocketmq</groupId>
    <artifactId>rocketmq-client</artifactId>
    <version>4.7.1</version>
</dependency>
```

2. 编写测试类

``` java
@RunWith(SpringRunner.class)
@SpringBootTest
public class SpringbootRocketProducerApplicationTests {
    @Test
    public void producer() throws MQClientException, RemotingException, InterruptedException, MQBrokerException {
        DefaultMQProducer producer = new DefaultMQProducer("my-producer");
        producer.setNamesrvAddr("你的公网IP:9876");
        producer.start();

        Message message = new Message("myTopic01", "Hello RocketMQ!".getBytes());
        SendResult sendResult = producer.send(message);
        System.out.println("Message send Success, result: " + sendResult);

        producer.shutdown();
        System.out.println("Producer shutdown!");
    }
```

3. 运行测试方法

* 报错：No route info of this topic: myTopic01

* 解决：配置启动`broker`时自动创建`broker`，附带参数：`autoCreateTopicEnable=true`

``` bash
# 附带参数：autoCreateTopicEnable=true
[root@ecs-kunpeng-0006 rocketmq]# bin/mqbroker -n 你的公网IP:9876 -c conf/broker.conf autoCreateTopicEnable=true
```

4. 验证主题是否创建成功，验证测试消息是否发送成功

这里可使用 `RocketMQ` 官方提供的 `Web` 管理控制台。下载地址：[https://github.com/apache/rocketmq-externals/tree/master/rocketmq-console](https://github.com/apache/rocketmq-externals/tree/master/rocketmq-console)，本身也是个基于 `SpringBoot` 的 `Web` 项目，启动前先修改为自己的 `RocketMQ` 地址，默认运行在 `8080` 端口。

![2021-05-18-RocketMQTest.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-05-18-RocketMQTest.png)

![2021-05-18-RocketMQWebConsole.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-05-18-RocketMQWebConsole.png)

### 后台启动broker

``` bash
# 后台启动
[root@ecs-kunpeng-0006 rocketmq]# nohup sh bin/mqbroker -n 你的公网IP:9876 -c conf/broker.conf autoCreateTopicEnable=true &

# 查看启动日志
[root@ecs-kunpeng-0006 rocketmq]# tail -f ~/logs/rocketmqlogs/broker.log

# 查看启动进程
[root@ecs-kunpeng-0006 rocketmq]# jps
1971242 BrokerStartup
1972997 Jps
230238 NamesrvStartup
```

### 如何优雅停止

``` bash
[root@ecs-kunpeng-0006 rocketmq]# sh bin/mqshutdown broker
[root@ecs-kunpeng-0006 rocketmq]# sh bin/mqshutdown namesrv
```

### Reference

* [华为官方镜像](https://mirrors.huaweicloud.com/)
* [华为官方镜像rpm](https://mirrors.huaweicloud.com/openeuler/openEuler-20.03-LTS/everything/aarch64/Packages/)
* [RocketMQ官方文档](http://rocketmq.apache.org/docs/quick-start/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
