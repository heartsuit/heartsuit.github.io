---
layout: post
title: 明明用rpm成功安装了软件，在卸载时却提示未安装
tags: 运维
---

## 背景

在 `openEuler` 上明明用 `rpm` 成功安装了 `JDK11` ，在通过安装包名称卸载时却提示未安装。。

> 错误：未安装软件包 jdk-11.0.10_linux-aarch64_bin.rpm

## 环境信息

这里实验用的华为云鲲鹏服务器配置如下：

    Huawei Kunpeng 920 2.6GHz
    4vCPUs | 8GB
    openEuler 20.03 64bit with ARM

连接机器后，先查看系统相关信息，注意这里是 `aarch64` 的，后面配置源时一定要匹配。

```bash
# 查看系统内核信息
[root@ecs-kunpeng-0001 ~]# uname -a
Linux ecs-kunpeng-0001 4.19.90-2003.4.0.0036.oe1.aarch64 #1 SMP Mon Mar 23 19:06:43 UTC 2020 aarch64 aarch64 aarch64 GNU/Linux

# 查看系统版本信息
[root@ecs-kunpeng-0001 ~]# cat /etc/os-release
NAME="openEuler"
VERSION="20.03 (LTS)"
ID="openEuler"
VERSION_ID="20.03"
PRETTY_NAME="openEuler 20.03 (LTS)"
ANSI_COLOR="0;31"
```

## 错误复现

1. 起因是我想部署下开源的物联网系统 `thingsboard` ，其要求JDK版本为11。
2. 先是安装了 `JDK11` ；
3. 后来发现这在在 `openEuler` 上有些问题，想卸载掉 `JDK11` ，竟然卸载不掉；
4. 仔细检查后发现在查找已安装的软件包名称时有问题，即不应该查 `java` ，而是 `jdk` ；
5. 找见问题后，直接卸载即可。

```bash
# 安装JDK11
[root@ecs-kunpeng-0001 software]# rpm -ivh jdk-11.0.10_linux-aarch64_bin.rpm
```

```bash
# 后来想卸载掉，通过安装包名称
[root@ecs-kunpeng-0001 ~]# rpm -e jdk-11.0.10_linux-aarch64_bin.rpm
错误：未安装软件包 jdk-11.0.10_linux-aarch64_bin.rpm 
```

```bash
# 查找下已安装的java相关的包
[root@ecs-kunpeng-0001 ~]# rpm -qa | grep java
java-1.8.0-openjdk-devel-1.8.0.242.b08-1.h5.oe1.aarch64
javapackages-filesystem-5.3.0-2.oe1.noarch
java-1.8.0-openjdk-headless-1.8.0.242.b08-1.h5.oe1.aarch64
java-1.8.0-openjdk-1.8.0.242.b08-1.h5.oe1.aarch64
```

```bash
# [root@ecs-kunpeng-0001 software]# rpm -ivh jdk-11.0.10_linux-aarch64_bin.rpm
警告：jdk-11.0.10_linux-aarch64_bin.rpm: 头V3 RSA/SHA256 Signature, 密钥 ID ec551f03: NOKEY
Verifying...                          ################################# [100%]
准备中...                          ################################# [100%]
        软件包 jdk-11.0.10-2000:11.0.10-ga.aarch64 已经安装
```

```bash
# 意识到错误了，应该查找已安装的jdk相关的包，可以看到查出了jdk11相关的已安装的软件包
[root@ecs-kunpeng-0001 software]# rpm -qa | grep jdk
java-1.8.0-openjdk-devel-1.8.0.242.b08-1.h5.oe1.aarch64
copy-jdk-configs-3.7-3.oe1.noarch
java-1.8.0-openjdk-headless-1.8.0.242.b08-1.h5.oe1.aarch64
java-1.8.0-openjdk-1.8.0.242.b08-1.h5.oe1.aarch64
jdk-11.0.10-11.0.10-ga.aarch64
```

```bash
# 卸载jdk11
[root@ecs-kunpeng-0001 software]# rpm -e jdk-11.0.10-11.0.10-ga.aarch64
```

### 小总结

出现以上问题的原因主要是自己对 `rpm` 命令的掌握没到位，同时想当然地认为 `jdk11` 安装包名称包含 `java` ，导致检索关键词错误。

附： `rpm` 常用命令。

```bash
# 列出已安装的所有软件包
rpm -qa

# 查找指定的软件包
rpm -qa httpd

# 查找包含Java的软件包
rpm -qa | grep java

# 安装并显示安装进度：thingsboard
rpm -ivh thingsboard-3.2.2.rpm

# 升级安装并显示安装进度：thingsboard
rpm -Uvh thingsboard-3.2.2.rpm

# 升级安装并显示安装进度：jdk11
rpm -Uvh jdk-11.0.10_linux-aarch64_bin.rpm

# 卸载软件包：jdk11
rpm -e jdk-11.0.10-11.0.10-ga.aarch64
```

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
