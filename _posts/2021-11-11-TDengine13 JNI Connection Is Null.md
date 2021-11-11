---
layout: post
title: 13-TDengine使用JDBC-JNI连接报错：JNI connection is NULL
tags: TDengine
---

### 背景

中午睡了一觉，起来发现连不上我的 `TDengine` 服务了。。

最近刚换了电脑，没错，这次的事故又是换电脑引发的。。

### 服务报错

SpringBoot项目的控制台错误信息： `java.sql.SQLException: JNI ERROR (2354): JNI connection is NULL`

![2021-11-11-Exception.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-11-Exception.jpg)

这个问题我曾经在这篇文章[2-TDengine客户端连接，RESTful，JDBC](https://heartsuit.blog.csdn.net/article/details/119146497)里也遇到过， 当时是因为我没有开放 `6030` 的 `UDP` 端口，可是现在我连整个防火墙都关了。无奈之下，又到官网重温下客户端连接失败的解决方法。

### 问题排查

官方建议：客户端遇到连接故障，请按照下面的步骤进行检查：

    检查网络环境
        云服务器：检查云服务器的安全组是否打开TCP/UDP 端口6030-6042的访问权限
        本地虚拟机：检查网络能否ping通，尽量避免使用localhost 作为hostname
        公司服务器：如果为NAT网络环境，请务必检查服务器能否将消息返回值客户端

    确保客户端与服务端版本号是完全一致的，开源社区版和企业版也不能混用

    在服务器，执行 systemctl status taosd 检查taosd运行状态。如果没有运行，启动taosd

    确认客户端连接时指定了正确的服务器FQDN (Fully Qualified Domain Name —— 可在服务器上执行Linux命令hostname -f获得），FQDN配置参考：一篇文章说清楚TDengine的FQDN。

    ping服务器FQDN，如果没有反应，请检查你的网络，DNS设置，或客户端所在计算机的系统hosts文件。如果部署的是TDengine集群，客户端需要能ping通所有集群节点的FQDN。

    检查防火墙设置（Ubuntu 使用 ufw status，CentOS 使用 firewall-cmd --list-port），确认TCP/UDP 端口6030-6042 是打开的

    对于Linux上的JDBC（ODBC, Python, Go等接口类似）连接, 确保libtaos.so在目录/usr/local/taos/driver里, 并且/usr/local/taos/driver在系统库函数搜索路径LD_LIBRARY_PATH里

    对于Windows上的JDBC, ODBC, Python, Go等连接，确保C:\TDengine\driver\taos.dll在你的系统库函数搜索目录里 (建议taos.dll放在目录 C:\Windows\System32)

    如果仍不能排除连接故障

        Linux 系统请使用命令行工具nc来分别判断指定端口的TCP和UDP连接是否通畅 检查UDP端口连接是否工作：nc -vuz {hostIP} {port} 检查服务器侧TCP端口连接是否工作：nc -l {port} 检查客户端侧TCP端口连接是否工作：nc {hostIP} {port}

        Windows 系统请使用 PowerShell 命令 Net-TestConnection -ComputerName {fqdn} -Port {port} 检测服务段端口是否访问

    也可以使用taos程序内嵌的网络连通检测功能，来验证服务器和客户端之间指定的端口连接是否通畅（包括TCP和UDP）：TDengine 内嵌网络检测工具使用指南。

### 问题解决

其实，以上很多原因都是可以排除的，比如我的网络是不是能 `ping` 通，是不是防火墙问题， `maven` 依赖里的 `taos-jdbcdriver` 版本是不是兼容， `JNI` 方式的客户端是否安装 `taos.dll` ，服务端 `taosd` 是否运行等等。

然后，鬼使神差地，我就想用 `IDEA` 的数据库插件连接 `TDengine` 试一下，输入连接信息，用户密码信息，配置下 `driver` ，测试连接……一气呵成~~

这时，问题暴露了： `JNI ERROR(2345): Client and server's time is not synchronized.`

![2021-11-11-IDEATip.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-11-IDEATip.jpg)

竟然是因为客户端与服务端的时间不一致导致的，我瞬间反应过来，中午睡觉时，电脑休眠了，虚拟机也休眠了，最后的最后，就是虚拟机的时间滞后了。。

顺便来看下虚拟机的时间验证下：（接着，我使用阿里云提供的的网络时钟同步服务 `NTP` 校准了服务器时间）

![2021-11-11-DateNotSync.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-11-11-DateNotSync.jpg)

### 问题总结

一般我都会把电脑的休眠时间设为2小时，这样我在短时间离开后不用重新唤醒主机。

而昨天换电脑后还没来得及进行设置，默认10分钟后就休眠了，然而我去睡觉了(￣o￣) . z Z，便酿成了今日的一幕惨剧，耗费了半个小时。

同时，也期待 `TDengine` 的客户端依赖在实际开发时，尽量将错误信息提示清楚，不然，总会让人手足无措，摸不着头脑。。

### Reference

* [https://www.taosdata.com/cn/documentation/faq](https://www.taosdata.com/cn/documentation/faq)
* [2-TDengine客户端连接，RESTful，JDBC](https://heartsuit.blog.csdn.net/article/details/119146497)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
