---
layout: post
title: 问题排查：线上环境CPU飙到300%多。。
tags: Server
---

### 背景

线上一台后端服务所在机器`CPU`飙到300%多。。这个过程并不是一下子就完成的，而是过几个小时就来一次，奇了怪了。

### 解决思路

0. 保护现场；
1. 查看日志；
2. 查看进程：`top -c`
3. 查看Java线程栈：`jstack -l 32508 > jstack.32508.log`
4. 查看Java堆内存：`jmap -dump:live,format=b,file=32508-1.bin 32508`
5. 工具分析：`MAT：https://www.eclipse.org/mat/downloads.php`
6. 解决问题

以下进行一一说明：

- 保护现场；

如果条件允许，要保留一个服务进行问题分析。

- 查看日志；

肯定要看日志的，有没有报错信息等。

- 查看进程：`top -c`

查看对资源消耗严重的进程列表。

- 查看Java线程栈：`jstack -l 32508 > jstack.32508.log`

![2020-05-08-CPU-Stack.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-Stack.jpg)

可以看到解密相关线程阻塞。。

- 查看Java堆内存：`jmap -dump:live,format=b,file=32508-1.bin 32508`

![2020-05-08-CPU-Map.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-Map.jpg)

对线上环境，间隔时间，连续三次dump出堆内存信息。从这几个文件大小也可以看出，随着时间推移，内存占用越来越大，请看下一步。

- 工具分析：`MAT：https://www.eclipse.org/mat/downloads.php`

依次打开上一步导出的三个`bin`文件：

![2020-05-08-CPU-A1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-A1.jpg)


![2020-05-08-CPU-A2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-A2.jpg)


![2020-05-08-CPU-A3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-A3.jpg)

可以发现，类`javax.crypto.JceSecurity`的实例占据的堆内存持续增加，最终导致`OOM`，线程阻塞，`CPU`飙升。。

- 解决问题

`JceSecurity`类中有个Map，`verificationResults`是一个静态对象，无法被JVM回收。

![2020-05-08-CPU-Jce1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-Jce1.jpg)

![2020-05-08-CPU-Jce2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-Jce2.jpg)

问题代码：

```java
Provider provider = new org.bouncycastle.jce.provider.BouncyCastleProvider();
Security.addProvider(provider);
Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding", provider);
```

    原来是每次用户登录，都有一个`BouncyCastleProvider`对象被放到`IdentityHashMap`中，而这个Map（static）又无法被回收。。
    解决方法就是将`BouncyCastleProvider`作为单例，而不是每次解密时都new一个新对象。

```java
private static org.bouncycastle.jce.provider.BouncyCastleProvider bouncyCastleProvider = null;
public static synchronized org.bouncycastle.jce.provider.BouncyCastleProvider getInstance() {
    if (bouncyCastleProvider == null) {
        bouncyCastleProvider = new org.bouncycastle.jce.provider.BouncyCastleProvider();
    }
    return bouncyCastleProvider;
}

Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding", getInstance());
```

### 本地环境，问题复现

进行本地测试，用到的工具：

- Java虚拟机可视化监控：`JConsole`, `JavaVisualVM`(JDK自带)
- 压力测试：`JMeter`(http://jmeter.apache.org/download_jmeter.cgi)

测试步骤如下：

    1. 本地启动后的服务；
    2. `JavaVisualVM` 监听服务的进程；
    3. `JMeter`压测解密相关接口；

![2020-05-08-CPU-VM.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-VM.jpg)

内存从开始的几百M到多线程压测时的1G+，然后有一部分内存`GC`无法回收，最终堆内存占用保持在1G左右。。

将`jmap -dump:live,format=b,file=11428.bin 11428`导出的`bin`文件，加载至`MAT`进行分析。

![2020-05-08-CPU-Leak.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-Leak.jpg)

![2020-05-08-CPU-OOM.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-05-08-CPU-OOM.jpg)

可以看到与线上环境的问题一样，问题复现完成。问题不重要，这里仅提供解决问题的一个思路。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***