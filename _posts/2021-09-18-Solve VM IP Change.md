---
layout: post
title: 虚拟机的IP经常变化
tags: Server
---

### 背景

以前装了虚拟机后，一开始设置的是动态IP， `dhcp` 的，好长时间没用了；

最近重新开始使用虚拟机了，一开始IP是 `192.168.169.128` ，然后就三天两头的变化，每次变化都增加1，这过了大概一星期，IP已经变到了 `192.168.169.131` ，就想着看怎么把这个IP固定下来。

### 环境

```bash
[root@hadoop1 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)

[root@hadoop1 local]# uname -a
Linux hadoop1 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
```

### 动态IP

刚安装好虚拟机，CentOS7操作系统，通过 `ip a` 或者 `ifconfig` 未查看到IP地址；

```bash
# 配置动态IP
[root@hadoop1 ~]# vi /etc/sysconfig/network-scripts/ifcfg-ens33
bootproto=dhcp
onboot=yes

# 重启
[root@hadoop1 ~]# reboot
```

![2021-09-18-IPDHCP.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-18-IPDHCP.jpg)

这是一开始配置的动态IP，然后就出现了在几天时间内，IP地址莫名其妙地发生变化，接着便想办法把IP固定下来。

### 静态IP

```bash
# 配置静态IP
[root@hadoop1 ~]# vi /etc/sysconfig/network-scripts/ifcfg-ens33
BOOTPROTO=static
IPADDR=192.168.169.130

# 重启
[root@hadoop1 ~]# reboot
```

![2021-09-18-IPStatic.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-18-IPStatic.jpg)

Note：根据操作系统版本的不同，在 `/etc/sysconfig/network-scripts/` 目录下不一定有 `ifcfg-ens33` 这个文件，但应该有一个类似文件名的配置文件。

验证：通过 `ip a` 或者 `ifconfig` 可以看到配置的IP地址，并且之后IP地址固定不变。

![2021-09-18-IPa-ifconfig.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-18-IPa-ifconfig.png)

### 域名ping不通了

- 问题

采用上述方式配置了静态IP后，发现NTP服务无法正常同步，接着ping了下百度。

```bash
[root@hadoop1 ~]# ntpdate ntp1.aliyun.com
Error resolving ntp1.aliyun.com: Name or service not known (-2)
23 Jul 12:38:40 ntpdate[118769]: Can't find host ntp1.aliyun.com: Name or service not known (-2)
23 Jul 12:38:40 ntpdate[118769]: no servers can be used, exiting

[root@hadoop1 ~]# ping www.baidu.com
ping: www.baidu.com: 未知的名称或服务
```

- 解决方法

```bash
# 配置静态IP
[root@hadoop1 ~]# vi /etc/sysconfig/network-scripts/ifcfg-ens33
DNS1=192.168.169.2
GATEWAY=192.168.169.2

# 重启网络：
[root@hadoop1 ~]# service network restart
Restarting network (via systemctl):                        [  OK  ]
```
Note：GATEWAY与DNS1必须都配置了，否则还会报错：

```bash
# 不配GATEWAY
[root@hadoop1 ~]# ping www.baidu.com
connect: 网络不可达

# 不配DNS1
[root@hadoop1 ~]# ping www.baidu.com
ping: www.baidu.com: 未知的名称或服务
```

### 总结

最终的配置如下，以下配置解决了我的虚拟机IP三天两头变化的问题；

```conf
TYPE=Ethernet
PROXY_METHOD=none
BROWSER_ONLY=no
BOOTPROTO=static
DEFROUTE=yes
IPV4_FAILURE_FATAL=no
IPV6INIT=yes
IPV6_AUTOCONF=yes
IPV6_DEFROUTE=yes
IPV6_FAILURE_FATAL=no
IPV6_ADDR_GEN_MODE=stable-privacy
NAME=ens33
UUID=6663e0ef-a2c8-48c7-b982-0569ba0bad8f
DEVICE=ens33
ONBOOT=yes
IPADDR=192.168.169.130
DNS1=192.168.169.2
GATEWAY=192.168.169.2
```

![2021-09-18-FinalConifg.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-18-FinalConifg.jpg)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
