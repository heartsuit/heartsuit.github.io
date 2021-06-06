---
layout: post
title: 在华为鲲鹏openEuler20.03系统上安装MySQL8
tags: Server, MySQL
---

### 背景

这里实验用的华为云鲲鹏服务器配置如下：

    Huawei Kunpeng 920 2.6GHz
    4vCPUs | 8GB
    openEuler 20.03 64bit with ARM

连接机器后，先查看系统相关信息，注意这里是 `aarch64` 的，后续软件包也需要是 `aarch64` 版本的。

```bash
# 查看系统内核信息
[root@ecs-kunpeng-0005 ~]# uname -a
Linux ecs-kunpeng-0005 4.19.90-2003.4.0.0036.oe1.aarch64 #1 SMP Mon Mar 23 19:06:43 UTC 2020 aarch64 aarch64 aarch64 GNU/Linux

# 查看系统版本信息
[root@ecs-kunpeng-0005 ~]# cat /etc/os-release
NAME="openEuler"
VERSION="20.03 (LTS)"
ID="openEuler"
VERSION_ID="20.03"
PRETTY_NAME="openEuler 20.03 (LTS)"
ANSI_COLOR="0;31"
```

### 下载MySQL8

```bash
wget http://repo.mysql.com/yum/mysql-8.0-community/el/8/aarch64/mysql-community-common-8.0.19-1.el8.aarch64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/8/aarch64/mysql-community-libs-8.0.19-1.el8.aarch64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/8/aarch64/mysql-community-client-8.0.19-1.el8.aarch64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/8/aarch64/mysql-community-server-8.0.19-1.el8.aarch64.rpm
```

### 安装MySQL8

```bash
yum localinstall mysql-community-common-8.0.19-1.el8.aarch64.rpm
yum localinstall mysql-community-libs-8.0.19-1.el8.aarch64.rpm
yum localinstall mysql-community-client-8.0.19-1.el8.aarch64.rpm
yum localinstall mysql-community-server-8.0.19-1.el8.aarch64.rpm
```

```bash
# 查看MySQL状态
[root@ecs-kunpeng-0001 mysql8]# service mysqld status
Redirecting to /bin/systemctl status mysqld.service
● mysqld.service - MySQL Server
   Loaded: loaded (/usr/lib/systemd/system/mysqld.service; enabled; vendor preset: disabled)
   Active: inactive (dead)
     Docs: man:mysqld(8)
           http://dev.mysql.com/doc/refman/en/using-systemd.html
[root@ecs-kunpeng-0001 mysql8]# service mysqld start
Redirecting to /bin/systemctl start mysqld.service
[root@ecs-kunpeng-0001 mysql8]# service mysqld status
Redirecting to /bin/systemctl status mysqld.service
● mysqld.service - MySQL Server
   Loaded: loaded (/usr/lib/systemd/system/mysqld.service; enabled; vendor preset: disabled)
   Active: active (running) since Sat 2021-05-29 17:49:49 CST; 8s ago
     Docs: man:mysqld(8)
           http://dev.mysql.com/doc/refman/en/using-systemd.html
  Process: 1121485 ExecStartPre=/usr/bin/mysqld_pre_systemd (code=exited, status=0/SUCCESS)
 Main PID: 1122635 (mysqld)
   Status: "Server is operational"
    Tasks: 39
   Memory: 550.8M
   CGroup: /system.slice/mysqld.service
           └─1122635 /usr/sbin/mysqld

5月 29 17:49:42 ecs-kunpeng-0001 systemd[1]: Starting MySQL Server...
5月 29 17:49:49 ecs-kunpeng-0001 systemd[1]: Started MySQL Server.
```

### 修改默认密码

```bash
# 获取初始化生成的数据库密码
[root@ecs-kunpeng-0001 mysql8]# cat /var/log/mysqld.log | grep password
2021-05-29T09:49:46.015915Z 5 [Note] [MY-010454] [Server] A temporary password is generated for root@localhost: iwjjwe,qd2.Y

i# 使用刚安装的mysql客户端，并用原始密码连接数据库，登录之后必须先修改密码。。
[root@ecs-kunpeng-0001 mysql8]# mysql -uroot -p

# 选择mysql数据库，修改默认密码（密码格式有要求，具备一定强度，包含大写字母，数字以及特殊字符等）
mysql> select  User,authentication_string,Host from user;
ERROR 1046 (3D000): No database selected
mysql> use mysql;
ERROR 1820 (HY000): You must reset your password using ALTER USER statement before executing this statement.
mysql> ALTER USER root@localhost IDENTIFIED BY 'Kunpeng0001.';
Query OK, 0 rows affected (0.00 sec)

mysql> use mysql;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A
Database changed

# 查看已有用户
mysql> select  User,authentication_string,Host from user;
+------------------+------------------------------------------------------------------------+-----------+
| User             | authentication_string                                                  | Host      |
+------------------+------------------------------------------------------------------------+-----------+
| mysql.infoschema | $A$005$THISISACOMBINATIONOFINVALIDSALTANDPASSWORDTHATMUSTNEVERBRBEUSED | localhost |
| mysql.session    | $A$005$THISISACOMBINATIONOFINVALIDSALTANDPASSWORDTHATMUSTNEVERBRBEUSED | localhost |
| mysql.sys        | $A$005$THISISACOMBINATIONOFINVALIDSALTANDPASSWORDTHATMUSTNEVERBRBEUSED | localhost |
{Sl3h/p7doZnmVf67O/qH3bYjNe2QqgxhAubVkHtOhc8 | localhost |
+------------------+------------------------------------------------------------------------+-----------+
4 rows in set (0.00 sec)
```

### 开启远程访问

```bash
# 创建一个可供其他主机远程访问的用户名与密码
mysql> CREATE user root@'%' IDENTIFIED by 'Kunpeng0001.';
Query OK, 0 rows affected (0.01 sec)

# 授权
mysql> GRANT ALL ON *.* TO 'root'@'%';
Query OK, 0 rows affected (0.01 sec)

# 刷新配置
mysql> flush privileges;
Query OK, 0 rows affected (0.01 sec)

# 再次查看已有用户，多了host为%的root用户
mysql> SELECT user, authentication_string, host from user;
+------------------+------------------------------------------------------------------------+-----------+
| user             | authentication_string                                                  | host      |
+------------------+------------------------------------------------------------------------+-----------+
| root             | $A$005$mvUu,Q/I2   pL5Lx5k3MvTSYrsMRN0rBYIgcSHgPTvUHE12G1W6EJNYp0 | %         |
| mysql.infoschema | $A$005$THISISACOMBINATIONOFINVALIDSALTANDPASSWORDTHATMUSTNEVERBRBEUSED | localhost |
| mysql.session    | $A$005$THISISACOMBINATIONOFINVALIDSALTANDPASSWORDTHATMUSTNEVERBRBEUSED | localhost |
| mysql.sys        | $A$005$THISISACOMBINATIONOFINVALIDSALTANDPASSWORDTHATMUSTNEVERBRBEUSED | localhost |
{Sl3h/p7doZnmVf67O/qH3bYjNe2QqgxhAubVkHtOhc8 | localhost |
+------------------+------------------------------------------------------------------------+-----------+
5 rows in set (0.01 sec)

# 退出
mysql> exit
Bye
```

### 说明

其实一开始安装的是 `el7` 下的软件，然后在安装 `mysql-community-libs-8.0.19-1.el7.aarch64.rpm` 时报错了。

```bash
wget http://repo.mysql.com/yum/mysql-8.0-community/el/7/aarch64/mysql-community-common-8.0.19-1.el7.aarch64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/7/aarch64/mysql-community-libs-8.0.19-1.el7.aarch64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/7/aarch64/mysql-community-client-8.0.19-1.el7.aarch64.rpm
wget http://repo.mysql.com/yum/mysql-8.0-community/el/7/aarch64/mysql-community-server-8.0.19-1.el7.aarch64.rpm
```

```bash
yum localinstall mysql-community-common-8.0.19-1.el7.aarch64.rpm
yum localinstall mysql-community-libs-8.0.19-1.el7.aarch64.rpm
```

    Error: 
    Problem: conflicting requests

      + nothing provides libcrypto.so.10()(64bit) needed by mysql-community-libs-8.0.19-1.el7.aarch64
      + nothing provides libssl.so.10()(64bit) needed by mysql-community-libs-8.0.19-1.el7.aarch64
      + nothing provides libcrypto.so.10(libcrypto.so.10)(64bit) needed by mysql-community-libs-8.0.19-1.el7.aarch64
      + nothing provides libssl.so.10(libssl.so.10)(64bit) needed by mysql-community-libs-8.0.19-1.el7.aarch64
    (try to add '--skip-broken' to skip uninstallable packages or '--nobest' to use not only best candidate packages)

试了网上一些方法，没效果，就想着换个 `CentOS8` 版本的 `MySQL8` 安装吧，然后就可以了。

### Reference

* [华为官方镜像](https://mirrors.huaweicloud.com/)
* [华为官方镜像rpm](https://mirrors.huaweicloud.com/openeuler/openEuler-20.03-LTS/everything/aarch64/Packages/)
* [MySQL官方软件仓库](http://repo.mysql.com/yum/mysql-8.0-community/el/8/aarch64/)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
