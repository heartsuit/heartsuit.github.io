---
layout: post
title: CentOS7上报错：telnet：未找到命令；telnet可以做什么？
tags: 运维
---

## 背景

当我使用 `telnet localhost 2181` 命令在虚拟机上测试 `ZooKeeper` 可用性时，报错：

> -bash: telnet: 未找到命令

## 系统环境

在 `CentOS7` 上进行安装，虚拟主机信息如下：

```bash
[root@hadoop1 local]# uname -a
Linux hadoop1 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
[root@hadoop1 local]# cat /proc/version
Linux version 3.10.0-1127.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 31 23:36:51 UTC 2020
[root@hadoop1 local]# cat /etc/redhat-release
CentOS Linux release 7.8.2003 (Core)
```

## 安装telnet命令

```bash
# 报错
[root@hadoop6 hbase]# telnet localhost 2181
-bash: telnet: 未找到命令

# 查看是否安装了telnet-server服务
[root@hadoop6 hbase]# rpm -qa telnet-server

# 若没有安装，则先安装telnet-server服务
[root@hadoop6 hbase]# yum install telnet-server

# 再安装telnet
[root@hadoop6 hbase]# yum install telnet

# 再次测试连接ZooKeeper，成功
[root@hadoop6 hbase]# telnet localhost 2181
Trying ::1%1...
Connected to localhost.
Escape character is '^]'.
Connection closed by foreign host.
```

## telnet能做什么？

其实， `Telnet` 可以做很多事情，我们常用的便是：
* 检查服务是否可以访问
* 检查域名是否可以解析
* 检查端口是否开放

## 扩展1：telnet连接远程Redis服务

![2022-03-05-LocalIP.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-05-LocalIP.jpg)

我虚拟机所在的宿主机IP为 `10.1.1.30` ，虚拟机与宿主机之间的连接方式为 `NAT` （Network Address Translation，网络地址转换），顺便插播一道面试题，问：桥接模式与 `NAT` 模式有何区别？

接下来，我们使用虚拟机中刚安装的 `telnet` 连接宿主机上运行的一个 `Redis` 服务（其实，连接其他的任何TCP服务都可以的，比如前面的 `ZooKeeper` ）。

Note：前提是 `Redis` 允许远程访问，并假设没有密码。

```bash
# Redis允许远程访问
#  编辑配置文件：vi redis.conf，注释掉bind，同时将protected-mode由yes改为no
#bind 127.0.0.1 -::1
protected-mode no
```

![2022-03-05-TelnetRedis.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-05-TelnetRedis.jpg)

## 扩展2：telnet连接远程自定义的TCP服务

接下来，我们使用虚拟机中刚安装的 `telnet` 连接宿主机上运行的一个自己编写的基于 `Node.js` 的极简 `TCP` 服务： `EchoServer` ，即客户端发来什么消息， `TCP` 服务端便将消息回复回去，这一般在我们学习网络编程时（Java的Socket通信，Mina，Netty以及WebSocket）的入门示例。

![2022-03-05-TelnetNode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-05-TelnetNode.jpg)

```javascript
let net = require('net');

let HOST = 'localhost';
let PORT = 8081;

net.createServer(function(socket) {
    console.log('Connected client: ' +
        socket.remoteAddress + ':' + socket.remotePort);
    // const password = Buffer.from('10', 'hex'); // 发送时以16进制编码
    const password = Buffer.from('hi', 'ascii');
    socket.write(password);

    socket.on('data', function(data) {
        console.log('客户端：' + socket.remoteAddress);
        console.log(data.toString());
        const reply = Buffer.from(data);
        socket.write(reply);
        console.log('Reply sended!')
    });
    socket.on('close', function(data) {
        console.log('CLOSED: ' +
            socket.remoteAddress + ' ' + socket.remotePort);
    });
}).listen(PORT);
console.log('Server listening on ' + HOST + ':' + PORT);
```

通过一张动图来感受下这个 `EchoServer` ，你发什么它便回复什么。。

![2022-03-05-TelnetNode.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-03-05-TelnetNode.gif)

## 疑问：我要如何退出telnet

如何退出 `Vim` ？这是每一个第一次误入 `vi` 后的灵魂之问。在 `StackOverflow` 上的一个回答曾帮助上百万开发者退出Vim编辑器：[https://stackoverflow.blog/2017/05/23/stack-overflow-helping-one-million-developers-exit-vim/](https://stackoverflow.blog/2017/05/23/stack-overflow-helping-one-million-developers-exit-vim/)

那么如何退出 `Telnet` ？我在一开始想通过 `CTRL+C` 退出，但并不可行。其实在 `Telnet` 客户端连接成功后，有如下一行提示：

> Escape character is '^]'.

什么意思呢，就是需要通过 `^]` （ `Windows` 用户请按键： `CTRL + ]` ）来退出，然后再键入 `quit` 指令退出 `Telnet` 。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
