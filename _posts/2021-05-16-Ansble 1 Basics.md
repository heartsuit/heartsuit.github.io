---
layout: post
title: Ansible纸上谈兵01：认识一下Ansible
tags: Ansible, Server
---

### Why：为什么要使用Ansible

> 当给你6台云主机，你应该怎么去使用，或者计划如何进行统一管理，完成微服务的自动化部署？

作为一个未接触过服务集群部署的小白，第一次拿到鲲鹏的6台云主机（操作系统：OpenEuler20.03，各项软、硬件配置信息完全一致），其实是有点手足无措的。。难道还是像我们以前那样一台一台进行远程连接、配置、部署？如果只有两三台或者十来台机器，这样操作起来虽然比较繁琐但毕竟还可以接受，可以在预计的时间内完成配置与部署；可是如果集群扩大到数百台、数千台呢，若还是使用传统的运维方式就不现实了，不仅耗时费力，还容易出错。。

这里实验用的华为云鲲鹏服务器配置如下：

    Huawei Kunpeng 920 2.6GHz
    4vCPUs | 8GB
    openEuler 20.03 64bit with ARM

共6台主机，位于北京四-鲲鹏，内网IP如下：

    192.168.0.6
    192.168.0.53
    192.168.0.39
    192.168.0.46
    192.168.0.235
    192.168.0.166

6台机器的分布：

![2021-05-16-KunpengECSLocation.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-05-16-KunpengECSLocation.png)

市面上关于自动化的工具有不少，这里计划用几篇文章介绍下其中相对较有优势又容易上手的 `Ansible` 。

这篇文章先看下 `Ansible` 中的核心基础概念以及指令。

Note: 其实，很多云服务提供商的自动化部署工具、流水线等服务都是基于Ansible进行封装而开发出来的，比如我们使用的华为软开云的流水线功能，从其执行的日志的可看出，就是通过执行 `Playbook` 的 `Task` 一步步完成的。

![2021-05-16-DevCloud.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-05-16-DevCloud.png)

### What：什么是Ansible

`Ansible` 基于 `Python` 构建，是一种无需代理的自动化工具，控制端与被控端通过 `SSH` 协议通信完成任务执行。 `Ansible` 的强大之处在于它有大量的现成模块可以辅助我们实现各类简单或者复杂的操作。

[Ansible官网上的模块索引](https://docs.ansible.com/ansible/latest/collections/index_module.html)

``` bash
[root@ecs-kunpeng-0001 ~]# ansible-doc -l | wc -l
3681
```

* 运行原理

`Ansible` 通过在被控端推送模块（一般是用 `Python` 实现），然后在被控端解析、执行这些模块来工作，这些模块临时存储在客户端节点中； `Ansible` 通过 `SSH` 协议运行这些模块，并在完成后将其删除。

* 核心概念

001. 控制端（Control Node）：安装 `Ansible` 的主机称为控制端（本身也可以作为自己的被控端）；只需要在控制端安装 `Ansible` 即可。
002. 被控端（Managed Node）：具体执行任务的主机，可以有多个被控端。
003. 资源清单（Inventory）：控制端管理的一个主机列表，默认配置在 /etc/ansible/hosts 文件中。它包含每个节点的信息，比如 IP 地址或其主机名，可进行逻辑分组（单个主机、多个主机分组），对不同的主机和不同的主机组，做不同的操作。
004. 模块（Module）：真正用于执行特定任务的基础单元，可通过 `ansible-doc -l | wc -l` 查看 `Ansible` 生态现有模块的数量。
005. ad-hoc: 临时命令，单条指令执行，在被控端一次执行一条指令。
006. playbook: 以YAML格式组织的指令集合，类似 `Shell` 脚本，在被控端一次执行多个任务；可以将 `Playbook` 理解为一门编程语言。

### How：如何使用Ansible

* 前提条件

001. 在控制端与被控端都安装有Python环境；
002. 主控端与被控端开启免密远程登录；

``` bash
# 编辑/etc/hosts文件，添加集群中所有主机名
[root@ecs-kunpeng-0001 ~]# vim /etc/hosts
# 追加以下内容
192.168.0.6 control
192.168.0.53 node1
192.168.0.39 node2
192.168.0.46 node3
192.168.0.235 node4
192.168.0.166 node5

# 测试通过主机名在局域网内是否可以进行通信
[root@ecs-kunpeng-0001 ~]# ping node1

# 在控制端生成公钥与私钥
[root@ecs-kunpeng-0001 ~]# ssh-keygen -f /root/. ssh/id_rsa -N ''

# 将SSH密钥复制到局域网内的被控端主机
[root@ecs-kunpeng-0001 ~]# 
for i in node1 node2 node3 node4 node5
do
	ssh-copy-id   $i
done

# 测试是否可通过SSH免密登录
[root@ecs-kunpeng-0001 ~]# ssh node1
```

* 安装Ansible

参考[在华为鲲鹏openEuler20.03系统上安装Ansible](https://heartsuit.blog.csdn.net/article/details/115611251)

* 配置主机清单

配置主机清单，并对其进行分组（1个控制端，3个web服务，1个数据库服务，1个缓存服务）。

``` bash
# Ansible默认的配置文件位于/etc/ansible/hosts
[root@ecs-kunpeng-0001 ~]# vim /etc/ansible/hosts
# 在其中追加以下内容
[controller]
192.168.0.6
[web]
192.168.0.53
192.168.0.39
192.168.0.46
[db]
192.168.0.235
[cache]
192.168.0.166
```

* 常用指令

``` bash
# 列出所有主机，all是一个关键字，表示主机清单中的所有主机
[root@ecs-kunpeng-0001 ~]# ansible all --list-hosts
  hosts (6):
    192.168.0.6
    192.168.0.53
    192.168.0.39
    192.168.0.46
    192.168.0.235
    192.168.0.166

# 列出指定分组下的主机
[root@ecs-kunpeng-0001 ~]# ansible web --list-hosts
  hosts (3):
    192.168.0.53
    192.168.0.39
    192.168.0.46

# 对指定分组下的主机执行ping命令
[root@ecs-kunpeng-0001 ~]# ansible web -m ping
192.168.0.39 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
192.168.0.46 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
192.168.0.53 | SUCCESS => {
    "changed": false,
    "ping": "pong"
}

# 对所有主机执行uptime命令
[root@ecs-kunpeng-0001 ~]# ansible all -m command -a "uptime"
192.168.0.46 | CHANGED | rc=0 >>
 23:00:35 up 54 days,  7:25,  1 user,  load average: 0.00, 0.00, 0.00
192.168.0.53 | CHANGED | rc=0 >>
 23:00:35 up 54 days,  7:25,  1 user,  load average: 0.00, 0.00, 0.00
192.168.0.39 | CHANGED | rc=0 >>
 23:00:35 up 54 days,  7:25,  1 user,  load average: 0.00, 0.00, 0.00
192.168.0.6 | CHANGED | rc=0 >>
 23:00:35 up 51 days, 14:15,  5 users,  load average: 0.17, 0.17, 0.16
192.168.0.235 | CHANGED | rc=0 >>
 23:00:35 up 54 days,  7:25,  1 user,  load average: 0.00, 0.00, 0.00
192.168.0.166 | CHANGED | rc=0 >>
 23:00:36 up 54 days,  7:25,  1 user,  load average: 0.00, 0.00, 0.00

# 对指定分组下的主机执行hostname命令
[root@ecs-kunpeng-0001 ~]# ansible web -m command -a "hostname"
192.168.0.39 | CHANGED | rc=0 >>
ecs-kunpeng-0003
192.168.0.46 | CHANGED | rc=0 >>
ecs-kunpeng-0004
192.168.0.53 | CHANGED | rc=0 >>
ecs-kunpeng-0002
```

Note: ad-hoc命令返回信息的颜色不同，分别表示：

    绿色：表示被控端没有修改；
    黄色：表示被控端发生变更；
    红色：表示有错误，关注提示信息；

遇到的问题：在执行每条ad-hoc命令时，每个主机会有一个警告。

[WARNING]: Platform linux on host 192.168.0.46 is using the discovered Python interpreter at /usr/bin/python, but future installation of another Python interpreter could change this. See https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html for more information. 

解决方法：有多种方法可以处理这个警告，最简单的方式是采用命令后附加参数，如下

``` bash
# 附带ansible_python_interpreter参数，去掉警告信息
ansible web -m ping -e 'ansible_python_interpreter=/usr/bin/python3'
```

通过这篇文章，算是大概了解了 `Ansible` 及其特性，接下来便可以通过这个强大工具管理我们的服务集群了。

### Reference

* [https://docs.ansible.com/ansible/latest/index.html](https://docs.ansible.com/ansible/latest/index.html)

* [https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html](https://docs.ansible.com/ansible/2.9/reference_appendices/interpreter_discovery.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
