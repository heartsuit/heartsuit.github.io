---
layout: post
title: 在华为鲲鹏openEuler20.03系统上安装Ansible
tags: Server, Linux
---

### 背景

这里实验用的华为云鲲鹏服务器配置如下：

    Huawei Kunpeng 920 2.6GHz
    4vCPUs | 8GB
    openEuler 20.03 64bit with ARM

连接机器后，先查看系统相关信息，注意这里是 `aarch64` 的，后面配置源时一定要匹配。

``` bash
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

就是不知道为什么，与别的云主机（阿里云、腾讯云以及华为云其他操作系统的机器）不同的是，经常性的（在刚连接时、在上传、下载文件时）报出下面的提示：

> Authorized users only. All activities may be monitored and reported.

### 检查环境

安装 `Ansible` 要求系统已安装 `Python` 。 `openEuler 20.03 64bit with ARM` 这个系统默认已经预装了 `Python2.7` , `Python3.7` 甚至 `Java8` 。

``` bash
[root@ecs-kunpeng-0001 ~]# python -V
Python 2.7.16

[root@ecs-kunpeng-0001 ~]# python3 -V
Python 3.7.4

[root@ecs-kunpeng-0001 ~]# java -version
openjdk version "1.8.0_242"
OpenJDK Runtime Environment (build 1.8.0_242-b08)
OpenJDK 64-Bit Server VM (build 25.242-b08, mixed mode)
```

### 安装Ansible

![2021-4-12-OpenEulerOfficial.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-4-12-OpenEulerOfficial.png)

由于 `Ansible` 软件包在发行版官方仓库中不可用（官方搜索Ansible，空空如也~），直接安装时 `yum install ansible` 报错。

``` bash
# 安装报错
[root@ecs-kunpeng-0001 ~]# yum install ansible
Last metadata expiration check: 2:01:21 ago on 2021年03月25日 星期四 10时56分40秒.
No match for argument: ansible

# 编辑源
[root@ecs-kunpeng-0001 ~]# cd /etc/yum.repos.d
[root@ecs-kunpeng-0001 yum.repos.d]# vi openEuler_aarch64.repo 

最后追加以下信息，使用了清华大学的镜像（注意这里的版本aarch64）
[ansible]
name=ansible
baseurl=https://mirror.tuna.tsinghua.edu.cn/epel/7/aarch64/
gpgcheck=0
```

再次安装，成功，并查看 `Ansible` 版本信息。

``` bash
[root@ecs-kunpeng-0001 ~]# yum install ansible

[root@ecs-kunpeng-0001 yum.repos.d]# ansible --version
ansible 2.9.7
  config file = /etc/ansible/ansible.cfg
  configured module search path = ['/root/.ansible/plugins/modules', '/usr/share/ansible/plugins/modules']
  ansible python module location = /usr/local/lib/python3.7/site-packages/ansible-2.9.7-py3.7.egg/ansible
  executable location = /usr/local/bin/ansible
  python version = 3.7.4 (default, Mar 23 2020, 19:08:45) [GCC 7.3.0]
```

这样，便在华为鲲鹏 `openEuler20.03` 操作系统上成功安装了 `2.9.7` 版本的 `Ansible` ，接下来，可将安装了 `Ansible` 的这台机器（具备公网IP）作为控制端，远程管理其他内网集群。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
