---
layout: post
title: 突然停电导致Nacos坏了。。
tags: SpringCloudAlibaba
---

### 背景

夏天来了，又到了开空调的季节。。

然而，在一间小屋子里，几十台电脑附加空调，导致超负荷运转，突然跳闸断电了。。

等来电后，发现 `Nacos` 坏了，启动失败。

环境：Windows 7 下 Nacos 1.4.0

### 问题排查

这时最直接有效的办法应该是，重新解压，使用崭新的 `nacos` 即可; 

可是，目前 `nacos` 里已经有不少配置数据了，为了不丢弃这部分数据，便决定尽力挽救下，那就先看控制台报错信息吧。

```log
E:\nacos\bin>startup.cmd -m standalone
...
Caused by: org.springframework.beans.BeanInstantiationException: Failed to instantiate [org.springfr
amework.boot.web.servlet.FilterRegistrationBean]: Factory method 'trafficReviseFilterRegistration' t
hrew exception; nested exception is org.springframework.beans.factory.UnsatisfiedDependencyException
: Error creating bean with name 'trafficReviseFilter': Unsatisfied dependency expressed through fiel
d 'serverStatusManager'; nested exception is org.springframework.beans.factory.BeanCreationException
: Error creating bean with name 'serverStatusManager': Injection of resource dependencies failed; ne
sted exception is org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating b
ean with name 'consistencyDelegate' defined in URL [jar:file:/E:/nacos/target/nacos-server.jar!/BOOT
-INF/lib/nacos-naming-1.4.0.jar!/com/alibaba/nacos/naming/consistency/DelegateConsistencyServiceImpl
.class]: Unsatisfied dependency expressed through constructor parameter 0; nested exception is org.s
pringframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'persiste
ntConsistencyServiceDelegate' defined in URL [jar:file:/E:/nacos/target/nacos-server.jar!/BOOT-INF/l
ib/nacos-naming-1.4.0.jar!/com/alibaba/nacos/naming/consistency/persistent/PersistentConsistencyServ
iceDelegateImpl.class]: Unsatisfied dependency expressed through constructor parameter 2; nested exc
eption is org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'pe
rsistentServiceProcessor' defined in URL [jar:file:/E:/nacos/target/nacos-server.jar!/BOOT-INF/lib/n
acos-naming-1.4.0.jar!/com/alibaba/nacos/naming/consistency/persistent/impl/PersistentServiceProcess
or.class]: Bean instantiation via constructor failed; nested exception is org.springframework.beans.
BeanInstantiationException: Failed to instantiate [com.alibaba.nacos.naming.consistency.persistent.i
mpl.PersistentServiceProcessor]: Constructor threw exception; nested exception is java.lang.IllegalS
tateException: Fail to init node, please see the logs to find the reason.
...
```

这满屏的错误日志，让人着实摸不着头脑，好在最后一句提示我们查看下日志。。

先是看了下 `E:\nacos\logs\nacos.log` ，里面就是完整的控制台报错日志，好像说明不了啥问题，日志比较长，总共700+行，截取最开始出错的一部分：

```log
2021-06-30 17:37:32,563 ERROR Error starting Tomcat context. Exception: org.springframework.beans.factory.BeanCreationException. Message: Error creating bean with name 'trafficReviseFilterRegistration' defined in class path resource [com/alibaba/nacos/naming/web/NamingConfig.class]: Bean instantiation via factory method failed; nested exception is org.springframework.beans.BeanInstantiationException: Failed to instantiate [org.springframework.boot.web.servlet.FilterRegistrationBean]: Factory method 'trafficReviseFilterRegistration' threw exception; nested exception is org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'trafficReviseFilter': Unsatisfied dependency expressed through field 'serverStatusManager'; nested exception is org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'serverStatusManager': Injection of resource dependencies failed; nested exception is org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'consistencyDelegate' defined in URL [jar:file:/E:/nacos/target/nacos-server.jar!/BOOT-INF/lib/nacos-naming-1.4.0.jar!/com/alibaba/nacos/naming/consistency/DelegateConsistencyServiceImpl.class]: Unsatisfied dependency expressed through constructor parameter 0; nested exception is org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean with name 'persistentConsistencyServiceDelegate' defined in URL [jar:file:/E:/nacos/target/nacos-server.jar!/BOOT-INF/lib/nacos-naming-1.4.0.jar!/com/alibaba/nacos/naming/consistency/persistent/PersistentConsistencyServiceDelegateImpl.class]: Unsatisfied dependency expressed through constructor parameter 2; nested exception is org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'persistentServiceProcessor' defined in URL [jar:file:/E:/nacos/target/nacos-server.jar!/BOOT-INF/lib/nacos-naming-1.4.0.jar!/com/alibaba/nacos/naming/consistency/persistent/impl/PersistentServiceProcessor.class]: Bean instantiation via constructor failed; nested exception is org.springframework.beans.BeanInstantiationException: Failed to instantiate [com.alibaba.nacos.naming.consistency.persistent.impl.PersistentServiceProcessor]: Constructor threw exception; nested exception is java.lang.IllegalStateException: Fail to init node, please see the logs to find the reason.

2021-06-30 17:37:32,623 INFO Stopping service [Tomcat]

2021-06-30 17:37:32,625 WARN The web application [nacos] appears to have started a thread named [HikariPool-1 housekeeper] but has failed to stop it. This is very likely to create a memory leak. Stack trace of thread:
 sun.misc.Unsafe.park(Native Method)
 java.util.concurrent.locks.LockSupport.parkNanos(LockSupport.java:215)
 java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject.awaitNanos(AbstractQueuedSynchronizer.java:2078)
 java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:1093)
 java.util.concurrent.ScheduledThreadPoolExecutor$DelayedWorkQueue.take(ScheduledThreadPoolExecutor.java:809)
 java.util.concurrent.ThreadPoolExecutor.getTask(ThreadPoolExecutor.java:1074)
 java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1134)
 java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624)
 java.lang.Thread.run(Thread.java:748)
```

继续看 `E:\nacos\logs\alipay-jraft.log` ，发现有以下信息：

```log
2021-06-30 17:37:32,559 ERROR Fail to load snapshot meta E:\nacos\data\protocol\raft\naming_persistent_service\snapshot\snapshot_199\__raft_snapshot_meta.

2021-06-30 17:37:32,561 ERROR Fail to init reader for path E:\nacos\data\protocol\raft\naming_persistent_service\snapshot\snapshot_199.

2021-06-30 17:37:32,561 ERROR Node <naming_persistent_service/10.16.1.110:7848> is initialized with inconsistent log, status=Status[EIO<1014>: Missing logs in (0, 196)].

2021-06-30 17:37:32,651 INFO ThreadPool is terminated: JRaft-RPC-Processor, com.alipay.sofa.jraft.util.MetricThreadPoolExecutor@22b53226[Shutting down, pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0].

2021-06-30 17:37:32,651 INFO ThreadPool is terminated: JRaft-RPC-Processor, com.alipay.sofa.jraft.util.MetricThreadPoolExecutor@1fcb4808[Shutting down, pool size = 0, active threads = 0, queued tasks = 0, completed tasks = 0].
```

接着便尝试先把这个 `E:\nacos\data\protocol\raft\naming_persistent_service` 目录移除（注意不是删除，万一无法解决问题，就再移回来），尝试重启，成功了（*/㉨＼*）

### 解决方案

* 删除目录：`E:\nacos\data\protocol\raft\naming_persistent_service`

* 重启`nacos`即可（会重新生成目录：`E:\nacos\data\protocol\raft\naming_persistent_service`，且已有的数据不会丢失）

### 总结

也没搞清楚具体原因，可能就是断电时， `nacos` 持久化失败了，导致再次启动时无法加载、初始化。。先不深究了，继续去搞配置中心啦~

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
