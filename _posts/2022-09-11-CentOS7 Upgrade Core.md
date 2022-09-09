---
layout: post
title: 云原生之容器编排实践-CentOS7升级内核版本
tags: CloudNative, Kubernetes, CentOS7
---

## 背景

一开始安装启动 `minikube` 时报错，原因之一是说操作系统的内核版本不支持。。其实，后来我指定了 `Kubernetes` 的版本就可以了，也就没有用到升级后的内核： `minikube start --force --kubernetes-version=v1.23.1` 。这里记录下 `CentOS7` 升级内核版本的操作。

升级前的 `CentOS7` 升级内核版本信息如下：

```bash
# 系统版本信息
[root@k8s1 local]# uname -a
Linux k8s1 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux

# 内核版本信息
[root@k8s0 ~]# uname -r
3.10.0-1127.el7.x86_64
```

## 升级内核版本

```bash
[root@k8s1 local]# rpm -Uvh http://www.elrepo.org/elrepo-release-7.0-3.el7.elrepo.noarch.rpm
获取http://www.elrepo.org/elrepo-release-7.0-3.el7.elrepo.noarch.rpm
警告：/var/tmp/rpm-tmp.wEC7Ex: 头V4 DSA/SHA1 Signature, 密钥 ID baadae52: NOKEY
准备中...                          ################################# [100%]
正在升级/安装...
   1:elrepo-release-7.0-3.el7.elrepo  ################################# [100%]

[root@k8s1 local]# yum --enablerepo=elrepo-kernel install -y kernel-lt
已加载插件：fastestmirror
Loading mirror speeds from cached hostfile
 * base: mirrors.aliyun.com
 * elrepo: mirrors.tuna.tsinghua.edu.cn
 * elrepo-kernel: mirrors.tuna.tsinghua.edu.cn
 * extras: mirrors.aliyun.com
 * updates: mirrors.aliyun.com
elrepo                                                                                                                              | 3.0 kB  00:00:00     
elrepo-kernel                                                                                                                       | 3.0 kB  00:00:00     
(1/2): elrepo/primary_db                                                                                                            | 388 kB  00:00:00     
(2/2): elrepo-kernel/primary_db                                                                                                     | 2.1 MB  00:00:01     
正在解决依赖关系
--> 正在检查事务
---> 软件包 kernel-lt.x86_64.0.5.4.207-1.el7.elrepo 将被 安装
--> 解决依赖关系完成

依赖关系解决

=============================================================================================================================
 Package                           架构                           版本                                         源                                     大小
=============================================================================================================================
正在安装:
 kernel-lt                         x86_64                         5.4.207-1.el7.elrepo                         elrepo-kernel                          50 M

事务概要
=============================================================================================================================
安装  1 软件包

总下载量：50 M
安装大小：227 M
Downloading packages:
警告：/var/cache/yum/x86_64/7/elrepo-kernel/packages/kernel-lt-5.4.207-1.el7.elrepo.x86_64.rpm: 头V4 DSA/SHA256 Signature, 密钥 ID baadae52: NOKEY0:00 ETA 
kernel-lt-5.4.207-1.el7.elrepo.x86_64.rpm 的公钥尚未安装
kernel-lt-5.4.207-1.el7.elrepo.x86_64.rpm                                                                                           |  50 MB  00:00:11     
从 file:///etc/pki/rpm-gpg/RPM-GPG-KEY-elrepo.org 检索密钥
导入 GPG key 0xBAADAE52:
 用户ID     : "elrepo.org (RPM Signing Key for elrepo.org) <secure@elrepo.org>"
 指纹       : 96c0 104f 6315 4731 1e0b b1ae 309b c305 baad ae52
 软件包     : elrepo-release-7.0-3.el7.elrepo.noarch (installed)
 来自       : /etc/pki/rpm-gpg/RPM-GPG-KEY-elrepo.org
Running transaction check
Running transaction test
Transaction test succeeded
Running transaction
警告：RPM 数据库已被非 yum 程序修改。
  正在安装    : kernel-lt-5.4.207-1.el7.elrepo.x86_64                                                                                                  1/1 
  验证中      : kernel-lt-5.4.207-1.el7.elrepo.x86_64                                                                                                  1/1 

已安装:
  kernel-lt.x86_64 0:5.4.207-1.el7.elrepo                                                                                                                  

完毕！
```

## 设置默认内核

先查看内核默认启动顺序，然后设置默认内核。

```bash
# 查看内核默认启动顺序
[root@k8s1 local]# awk -F\' '$1=="menuentry " {print $2}' /etc/grub2.cfg 
CentOS Linux (5.4.207-1.el7.elrepo.x86_64) 7 (Core)
CentOS Linux (3.10.0-1127.el7.x86_64) 7 (Core)
CentOS Linux (0-rescue-37761db4ce554629afd046b89323275e) 7 (Core)

# 默认启动的顺序是从0开始，新内核是从头插入（而5.4.207的位置是在0），所以需要选择0
[root@k8s1 local]# grub2-set-default 0
```

## 验证内核版本

Note：需要reboot重启生效。

```bash
# 重启前
[root@k8s1 local]# uname -r
3.10.0-1127.el7.x86_64

# 需要reboot重启生效
[root@k8s1 local]# reboot

# 重启后
[root@k8s1 ~]# uname -r
5.4.207-1.el7.elrepo.x86_64
```

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
