---
layout: post
title: 信创环境下分布式文件存储MinIO集群部署
tags: 国产化, 微服务
---

## 背景

本次项目涉及20+台服务器的部署，技术包括 `Nacos` 注册中心集群、 `GateWay` 网关服务集群、 `达梦8` 关系型数据库服务集群、 `MinIO` 分布式文件存储服务集群、 `Redis` 缓存服务集群、 `WebSocket` 服务端消息推送集群、 `Quartz` 定时任务服务集群、 `Nginx+KeepAlived` 反向代理高可用集群、监控服务集群等。这里主要记录下分布式文件存储服务集群以及缓存服务集群的搭建过程。

* [x] `Nginx+KeepAlived` 反向代理高可用集群，这个跟之前华为云上的集群搭建类似，参考：[Nginx高可用极速实战：通过KeepAlived与华为云虚拟IP实现](https://blog.csdn.net/u013810234/article/details/124569480?spm=1001.2014.3001.5501)
* [x] `MinIO` 分布式文件存储服务集群
* [ ] `Redis` 缓存服务集群

## 云服务资源

* 172.27.204.115
* 172.27.204.101
* 172.27.204.110
* 172.27.204.151

## 系统信息

```bash
# 查看系统内核信息
[root@sx-std-oss-220420-0001 opt]# uname -a
Linux sx-std-oss-220420-0001.novalocal 4.19.90-17.ky10.aarch64 #1 SMP Sun Jun 28 14:27:40 CST 2020 aarch64 aarch64 aarch64 GNU/Linux

# 查看系统版本信息
[root@sx-std-oss-220420-0001 opt]# cat /etc/os-release
NAME="Kylin Linux Advanced Server"
VERSION="V10 (Tercel)"
ID="kylin"
VERSION_ID="V10"
PRETTY_NAME="Kylin Linux Advanced Server V10 (Tercel)"
ANSI_COLOR="0;31"
```

Note：以下所有操作分别在4台主机上操作，文件传输： `scp minio root@172.27.204.151:/opt/`

## 挂载

在4台主机上创建目录并挂载。

```bash
mkdir -p /data/minio
mount /dev/vda1 /data/minio
```

## 编写启动脚本

* 新建脚本

```bash
cd /opt
vi start-minio.sh

#!/bin/bash
export MINIO_ACCESS_KEY=Hello
export MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE
 
/opt/minio server \
http://172.27.204.115/data/minio http://172.27.204.101/data/minio \
http://172.27.204.110/data/minio http://172.27.204.151/data/minio
```

* 赋予执行权限

```bash
chmod +x start-minio.sh

chmod +x minio
```

## 编写服务脚本

* 新建脚本

```
vi /lib/systemd/system/minio.service
 
[Unit]
Description=Minio service
Documentation=https://docs.minio.io/
 
[Service]
WorkingDirectory=/opt/
ExecStart=/opt/start-minio.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

* 验证系统服务

```bash
systemctl list-unit-files | grep minio
systemctl enable minio
systemctl list-unit-files | grep minio

systemctl status minio
systemctl start minio
```

## 关闭防火墙

由于四台主机之间需要进行通信，这里直接关掉了防火墙。

```bash
systemctl status firewalld
systemctl stop firewalld
```

## 配置桶权限

可以直接登录 `MinIO` 提供的控制台进行可视化的配置，不过由于我们在信创环境下没有申请开放对应端口，所有通过 `mc` 命令行客户端进行配置。

> 这里记录一个实际中因开放了匿名下载文件权限之后，可以遍历所有对象存储目录的问题的解决方法。

* 可下载

![2022-06-18-Download.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-18-Download.jpg)

* 可遍历整个桶

![2022-06-18-ListBucket.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-18-ListBucket.jpg)

* MinIO权限

`MinIO` 的权限其实就是关于文件、桶的 `CRUD` 的配置，基于AWS的对象存储规则，配置文件为 `JSON` 格式。

```bash
# 开放匿名下载权限
[root@sx-std-oss-220420-0001 opt]# mc policy set download name-it/local

# 查看下默认的下载权限的JSON文件
[root@sx-std-oss-220420-0001 minio_policy]# mc policy get-json name-it/local
{
 "Statement": [
  {
   "Action": [
    "s3:ListBucket",
    "s3:GetBucketLocation"
   ],
   "Effect": "Allow",
   "Principal": {
    "AWS": [
     "*"
    ]
   },
   "Resource": [
    "arn:aws:s3:::local"
   ]
  },
  {
   "Action": [
    "s3:GetObject"
   ],
   "Effect": "Allow",
   "Principal": {
    "AWS": [
     "*"
    ]
   },
   "Resource": [
    "arn:aws:s3:::local/*"
   ]
  }
 ],
 "Version": "2012-10-17"
}
```

可以看到，默认的 `download` 可以列出桶里的文件列表： `GetBucketLocation` ，我们把这个权限去掉。

新建一个 `custom-local.json` ，写入以下内容（与默认生成的配置相比，仅去掉了 `GetBucketLocation` ）。

```json
{
 "Statement": [
  {
   "Action": [
    "s3:GetBucketLocation"
   ],
   "Effect": "Allow",
   "Principal": {
    "AWS": [
     "*"
    ]
   },
   "Resource": [
    "arn:aws:s3:::local"
   ]
  },
  {
   "Action": [
    "s3:GetObject"
   ],
   "Effect": "Allow",
   "Principal": {
    "AWS": [
     "*"
    ]
   },
   "Resource": [
    "arn:aws:s3:::local/*"
   ]
  }
 ],
 "Version": "2012-10-17"
}
```

使用我们自定义的权限 `JSON` 文件。

```bash
[root@sx-std-oss-220420-0001 minio_policy]# mc policy set-json custom-local.json name-it/local
```

* 可下载，但不可遍历桶下的文件目录

![2022-06-18-AccessDenied.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-06-18-AccessDenied.jpg)

## mc常用命令

`mc` 命令行客户端的使用可参考官方文档，这里附上之前华为云上操作 `MinIO` 时 `mc` 客户端常用的命令。

### mc常用命令清单

```bash
[root@ecs-c8ee-0011  ~]# cd /opt/minio 
[root@ecs-c8ee-0011  minio]# wget https://dl.min.io/client/mc/release/linux-amd64/mc
[root@ecs-c8ee-0011  minio]# mv ./mc /usr/local/bin/ 
[root@ecs-c8ee-0011  minio]# mc config host ls 
-bash: /usr/local/bin/mc: 权限不够
[root@ecs-c8ee-0011  minio]# cd /usr/local/bin 
[root@ecs-c8ee-0011  bin]# chmod +x mc 

# 查看服务列表
mc config host ls
# 新增服务
mc config host add name-it http://localhost:9000 HelloWorld wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE
Added name-it successfully.
# 密码要求至少八位。
mc config host add name-it http://localhost:9000 HelloWorld

# 删除服务
mc config host remove name-it

# 查看服务信息
mc admin info name-it

# 查看服务下的桶以及桶下的文件
mc ls name-it
mc ls name-it/bucketname

# 下载文件
mc cp name-it/bucketname/filename /tmp

# 删除文件
mc rm name-it/bucketname/filename

# 上传文件
mc cp test.txt name-it/bucketname
mc ls name-it/bucketname

# 创建桶
mc mb name-it/new-bucketname
mc ls name-it

# 删除桶
mc rb name-it/new-bucketname
mc ls name-it

# 强制删除（当桶中有文件，而且想删除）
mc rb --force name-it/new-bucketname
mc ls name-it

# 查看服务下桶的容量
mc du name-it

mc du name-it/bucketname

# 添加用户
mc admin user add name-it user1
mc admin user add name-it user2 12345678

# 列出用户
mc admin user list name-it

# 禁用用户
mc admin user disable name-it user2
mc admin user list name-it

# 启用用户
mc admin user enable name-it user2
mc admin user list name-it

mc admin user info name-it user2

# 删除用户
mc admin user remove name-it user2

# 策略管理
mc admin policy list name-it

mc admin policy info name-it readonly

mc admin policy info name-it writeonly

mc admin policy info name-it readwrite

# 写策略配置文件
# 应用文件
mc admin policy add name-it bucket2-admin-role your-config.json

mc admin policy list name-it

mc admin user info name-it user2

# 关联策略到用户
mc admin policy set name-it bucket2-admin-role user=user2

mc admin user info name-it user2

# 通过Web Console验证user2的权限

# 解绑权限
mc admin policy unset name-it bucket2-admin-role user=user2

mc admin user info name-it user2
```

### 帮助

关于 `mc` 客户端的使用，当遇到不会用的命令时，可通过 `--help` 参数，查看帮助文档。

## Reference

[https://docs.min.io/minio/baremetal/reference/minio-mc.html](https://docs.min.io/minio/baremetal/reference/minio-mc.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
