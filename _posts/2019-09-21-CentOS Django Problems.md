---
layout: post
title: Linux部署Django遇到的问题
tags: Django
---

### 安装Python3

Notes：操作系统：CentOS7

``` bash
wget https://www.python.org/ftp/python/3.6.3/Python-3.6.3.tar.xz
tar -xvf Python-3.6.3.tar.xz
cd Python-3.6.3
./configure
make && make install
```

然而，报错了！！

### 各种报错

* zipimport. ZipImportError: can't decompress data; zlib not available

Solution: 缺少包，下载安装
yum install zli*

--- 

* Error:  Multilib version problems found.

Solution: 发现了多个版本，忽略
yum install -y zlib zlib-devel --setopt=protected_multilib=false

``` bash
cd Python-3.6.3
./configure
make && make install
```

成功：
Collecting setuptools
Collecting pip
Installing collected packages: setuptools, pip
Successfully installed pip-9.0.1 setuptools-28.8.0

将原来 python 的软链接重命名：
mv /usr/bin/python /usr/bin/python.bak

将 python 链接至 python3：
ln -s /usr/local/bin/python3 /usr/bin/python

--- 

* pip is configured with locations that require TLS/SSL, however the ssl module in Python is not available.

该错误在执行 `pip install django` 时出现。

Solution: 不支持 SSL，安装 `openssl-devel` 
yum install openssl-devel

装完后，重新编译安装Python
cd Python-3.6.3
./configure --with-ssl
make && make install

--- 

* File "/usr/bin/yum", line 30 except KeyboardInterrupt, e:

该错误在执行 `yum install openssl-devel` 时出现。

cd /usr/bin/
ls -l python*

Solution: yum安装软件时，需要Python的支持，默认为Python2

``` bash
vim /usr/bin/yum
vim /usr/libexec/urlgrabber-ext-down
将#! /usr/bin/python 改为 #! /usr/bin/python2
``` 

--- 

* Found 1 pre-existing rpmdb problem(s), 'yum check' output follows:zlib-1.2.7-18.el7.x86_64 is a duplicate with zlib-1.2.7-13.el7.i686

该错误在执行 `yum install mysql-devel gcc gcc-devel python-devel --skip-broken` 时出现。

Solution: 版本冲突，列出所有的版本，移除没用的版本
``` bash
rpm -qa | grep zlib

    zlib-1.2.7-18.el7.x86_64
    zlib-devel-1.2.7-18.el7.x86_64
    zlib-1.2.7-13.el7.i686

yum remove zlib-1.2.7-13.el7.i686
``` 

--- 

* OSError: mysql_config not found

该错误在执行 `pip install mysqlclient` 时出现。

Solution: 主要是仓库里没有mysql的源。。先移除，再安装
``` bash
yum -y remove mysql57-community-release-el7-7.noarch
[root@rabbitmq yum.repos.d]# cd /etc/yum.repos.d/
[root@rabbitmq yum.repos.d]# ls
CentOS-Base.repo         CentOS-Debuginfo.repo  CentOS-Media.repo
CentOS-Base.repo.rpmnew  CentOS-Epel.repo       CentOS-Sources.repo
CentOS-CR.repo           CentOS-fasttrack.repo  CentOS-Vault.repo
[root@rabbitmq yum.repos.d]# rpm -ivh http://repo.mysql.com/mysql57-community-release-el7-7.noarch.rpm
Retrieving http://repo.mysql.com/mysql57-community-release-el7-7.noarch.rpm
Preparing...################################# [100%]
Updating / installing...
   1:mysql57-community-release-el7-7  ################################# [100%]
[root@rabbitmq yum.repos.d]# ls
CentOS-Base.repo         CentOS-Debuginfo.repo  CentOS-Media.repo    mysql-community.repo
CentOS-Base.repo.rpmnew  CentOS-Epel.repo       CentOS-Sources.repo  mysql-community-source.repo
CentOS-CR.repo           CentOS-fasttrack.repo  CentOS-Vault.repo
``` 

终于没有错误了，启动。。

```bash
pip install mysqlclient
python manage.py runserver
```

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**

