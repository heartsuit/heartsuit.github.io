---
layout: post
title: There is insufficient memory for the Java Runtime Environment to continue.
tags: Server
---

### Problem

环境：Linux VM_43_129_centos 3.10.0-123.el7.x86_64 #1 SMP Mon Jun 30 12:09:22 UTC 2014 x86_64 x86_64 x86_64 GNU/Linux

``` 
Architecture:          x86_64
CPU op-mode(s):        32-bit, 64-bit
Byte Order:            Little Endian
CPU(s):                2
On-line CPU(s) list:   0,1
Thread(s) per core:    1
Core(s) per socket:    2
Socket(s):             1
NUMA node(s):          1
Vendor ID:             GenuineIntel
CPU family:            6
Model:                 63
Model name:            Intel(R) Xeon(R) CPU E5-26xx v3
Stepping:              2
CPU MHz:               2294.686
BogoMIPS:              4589.37
Hypervisor vendor:     KVM
Virtualization type:   full
L1d cache:             32K
L1i cache:             32K
L2 cache:              4096K
NUMA node0 CPU(s):     0,1

```
- Tomcat 启动报错，查看日志：

> There is insufficient memory for the Java Runtime Environment to continue.

![2018-07-17-InsufficientMemory.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-07-17-InsufficientMemory.png)

内存不够用了！。？，可是，那可是8个G呀~

- `free -h` 查看内存使用情况：

![2018-07-17-FreeBefore.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-07-17-FreeBefore.png)

### Analysis

因为服务器上除了`Java`环境，`MQ`、`MySQL`服务外，基本没其他的主要服务了，怀疑是`Tomcat`没有关闭导致；

- `ps -ef |grep tomcat` 查看Tomcat相关进程：

![2018-07-17-Tomcat.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-07-17-Tomcat.png)

可以看到，Tomcat仍有多个进程在运行。

### Solution

手动kill对应的pid，再次 `free -h` 查看内存使用情况：

![2018-07-17-FreeAfter.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2018-07-17-FreeAfter.png)

可用内存瞬间恢复，尝试启动Tomcat，成功~

至于为何Tomcat在shutdown后依然有进程在运行，这个还需进一步探讨。

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***