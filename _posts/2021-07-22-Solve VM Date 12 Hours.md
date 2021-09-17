---
layout: post
title: Linux执行date命令发现差了12小时，格式是EDT
tags: Server
---

### 背景

新建了个虚拟机， `CentOS7` 操作系统，执行 `date` 命令发现日期不正确，与当前时间差了12小时，格式是 `EDT` 。

使用 `NTP` （Network Time Protocol）同步后，依然不正确。

```bash
# 实际时间 2021年7月26日12:50:38
[root@hadoop2 ~]# date
2021年 07月 26日 星期一 00:50:47 EDT

# NTP时钟同步
[root@hadoop2 ~]# ntpdate ntp1.aliyun.com
26 Jul 00:51:16 ntpdate[67431]: step time server 120.25.115.20 offset -2.724103 sec

# NTP时钟同步后，依然不正确
[root@hadoop2 ~]# date
2021年 07月 26日 星期一 00:51:20 EDT
```

### 方法一

修改时区： `timedatectl set-timezone Asia/Shanghai`

```bash
# 原来，时区设置指向了美国纽约
[root@hadoop2 ~]# ll /etc/localtime
lrwxrwxrwx. 1 root root 38 7月  30 2020 /etc/localtime -> ../usr/share/zoneinfo/America/New_York

# 修改时区
[root@hadoop2 ~]# timedatectl set-timezone Asia/Shanghai

[root@hadoop2 ~]# date
2021年 07月 26日 星期一 12:56:13 CST

# 查看新的软链接
[root@hadoop2 ~]# ll /etc/localtime
lrwxrwxrwx. 1 root root 35 7月  26 12:56 /etc/localtime -> ../usr/share/zoneinfo/Asia/Shanghai
```

### 方法二

创建软链接： `ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime`

```bash
# 备份
[root@hadoop2 ~]# mv /etc/localtime /etc/localtime.bak

# 创建软链接
[root@hadoop2 ~]# ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
```

### 方法三

直接覆写： `cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime`

```bash
# 备份
[root@hadoop2 ~]# mv /etc/localtime /etc/localtime.bak

# 使用新时区覆盖
[root@hadoop2 ~]# cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime
```

Note：NTP时钟同步可实现服务器时间校准：

* yum install ntpdate
* ntpdate ntp1.aliyun.com 或者 ntpdate cn.pool.ntp.org 或者ntp[1-7].aliyun.com

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
