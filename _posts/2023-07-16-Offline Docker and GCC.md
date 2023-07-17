---
layout: post
title: CentOS7.8离线安装Docker24.0.2，离线安装gcc与g++环境
tags: Docker
---

## 背景

有时候运维时要求在内网环境下操作，即服务器无法连接互联网，那么就无法通过 `yum` 源在线安装。。这时，一般通过以下3种方式来安装需要的软件：
1. 下载源码包编译安装；
2. 下载对应平台编译好的安装包，解压即可；
3. 下载`rpm`包，本地安装。

## 系统环境

```bash
[root@etl opt]# uname -a
Linux etl 3.10.0-1127.el7.x86_64 #1 SMP Tue Mar 31 23:36:51 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux
[root@etl opt]# cat /proc/version
Linux version 3.10.0-1127.el7.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 4.8.5 20150623 (Red Hat 4.8.5-39) (GCC) ) #1 SMP Tue Mar 31 23:36:51 UTC 2020
[root@etl opt]# cat /etc/redhat-release 
CentOS Linux release 7.8.2003 (Core)
```

## 下载安装包

下载对应平台编译好的安装包，解压即可。

下载地址：[https://download.docker.com/linux/static/stable/x86_64/docker-24.0.2.tgz](https://download.docker.com/linux/static/stable/x86_64/docker-24.0.2.tgz)

## 安装Docker

```bash
# 解压
[root@etl opt]# tar -xvf docker-24.0.2.tgz 
docker/
docker/docker-proxy
docker/containerd-shim-runc-v2
docker/ctr
docker/docker
docker/docker-init
docker/runc
docker/dockerd
docker/containerd

[root@etl opt]# cp docker/* /usr/bin/
```

## 确认安装

查看 `Docker` 版本，确认已安装。

```bash
[root@etl opt]# docker info
Client:
 Version:    24.0.2
 Context:    default
 Debug Mode: false

Server:
ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
errors pretty printing info

[root@etl opt]# docker version
Client:
 Version:           24.0.2
 API version:       1.43
 Go version:        go1.20.4
 Git commit:        cb74dfc
 Built:             Thu May 25 21:50:49 2023
 OS/Arch:           linux/amd64
 Context:           default
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

## 配置Docker开机自启

编写服务脚本，用于管理 `Docker` 服务，并配置 `Docker` 开机自启。

```bash
[root@etl opt]# vi /etc/systemd/system/docker.service
[Unit]
Description=Docker Application Container Engine
Documentation=https://docs.docker.com
After=network-online.target firewalld.service
Wants=network-online.target
 
[Service]
Type=notify
# the default is not to use systemd for cgroups because the delegate issues still
# exists and systemd currently does not support the cgroup feature set required
# for containers run by docker
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
# Uncomment TasksMax if your systemd version supports it.
# Only systemd 226 and above support this version.
#TasksMax=infinity
TimeoutStartSec=0
# set delegate yes so that systemd does not reset the cgroups of docker containers
Delegate=yes
# kill only the docker process, not all processes in the cgroup
KillMode=process
# restart the docker process if it exits prematurely
Restart=on-failure
StartLimitBurst=3
StartLimitInterval=60s
 
[Install]
WantedBy=multi-user.target
```

## 常用的管理命令

包括启动、查看状态、停止、重启命令。启动之后就可以拉取镜像、运行容器啦。

```bash
[root@etl opt]# systemctl status docker
● docker.service - Docker Application Container Engine
   Loaded: loaded (/etc/systemd/system/docker.service; disabled; vendor preset: disabled)
   Active: inactive (dead)
     Docs: https://docs.docker.com

6月 19 04:25:55 etl systemd[1]: [/etc/systemd/system/docker.service:34] Invalid section header '[root@SXCTC-TYMH local]# sy... docker'
Hint: Some lines were ellipsized, use -l to show in full.

[root@etl opt]# systemctl enable docker
Created symlink from /etc/systemd/system/multi-user.target.wants/docker.service to /etc/systemd/system/docker.service.

[root@etl opt]# systemctl list-unit-files | grep docker
docker.service                                enabled 

[root@etl opt]# systemctl start docker

[root@etl opt]# systemctl status docker
● docker.service - Docker Application Container Engine
   Loaded: loaded (/etc/systemd/system/docker.service; enabled; vendor preset: disabled)
   Active: active (running) since 一 2023-06-19 04:27:52 EDT; 4s ago
     Docs: https://docs.docker.com
6月 19 04:27:52 etl systemd[1]: Started Docker Application Container Engine.
Hint: Some lines were ellipsized, use -l to show in full.

[root@etl opt]# docker ps
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES

[root@etl opt]# docker info
Client:
 Version:    24.0.2
 Context:    default
 Debug Mode: false

Server:
 Containers: 0
  Running: 0
  Paused: 0
  Stopped: 0
 Images: 0
 Server Version: 24.0.2
 Storage Driver: overlay2
  Backing Filesystem: xfs
  Supports d_type: true
  Using metacopy: false
  Native Overlay Diff: true
  userxattr: false
 Logging Driver: json-file
 Cgroup Driver: cgroupfs
 Cgroup Version: 1
 Plugins:
  Volume: local
  Network: bridge host ipvlan macvlan null overlay
  Log: awslogs fluentd gcplogs gelf journald json-file local logentries splunk syslog
 Swarm: inactive
 Runtimes: io.containerd.runc.v2 runc
 Default Runtime: runc
 Init Binary: docker-init
 containerd version: 1677a17964311325ed1c31e2c0a3589ce6d5c30d
 runc version: v1.1.7-0-g860f061
 init version: de40ad0
 Security Options:
  seccomp
   Profile: builtin
 Kernel Version: 3.10.0-1127.el7.x86_64
 Operating System: CentOS Linux 7 (Core)
 OSType: linux
 Architecture: x86_64
 CPUs: 4
 Total Memory: 3.682GiB
 Name: etl
 ID: 0eee62aa-0908-4f69-a442-6333e558b82b
 Docker Root Dir: /var/lib/docker
 Debug Mode: false
 Experimental: false
 Insecure Registries:
  127.0.0.0/8
 Live Restore Enabled: false
 Product License: Community Engine
```

## gcc与g++

```bash
[root@etl opt]# gcc -v
-bash: gcc: 未找到命令

[root@etl opt]# g++ -v
-bash: g++: 未找到命令
```

在离线环境下，如果需要进行源码编译安装，比如 `Nginx` 、 `Redis` 等，则要求具备 `gcc` 与 `g++` 这些基础环境。以下通过 `rpm` 包进行 `gcc` 与 `g++` 的离线安装。

`gcc` 与 `g++` 的 `rpm` 包下载链接: https://pan.baidu.com/s/1I4kn_vF9KX0dZF9cr4JFnw?pwd=ruks 提取码: ruks

### gcc

进入 `/opt/gcc` 目录，执行以下命令安装 `gcc` ：

> rpm -ivh *.rpm --nodeps --force

其中 `--nodeps` 表示忽略依赖检查， `--force` 表示强制安装。

```bash
[root@etl gcc]# rpm -ivh *.rpm --nodeps --force
准备中...                          ################################# [100%]
正在升级/安装...
   1:glibc-common-2.17-105.el7        ################################# [ 11%]
   2:glibc-2.17-105.el7               警告：/etc/nsswitch.conf 已建立为 /etc/nsswitch.conf.rpmnew 

################################# [ 22%]

   3:mpfr-3.1.1-4.el7                 ################################# [ 33%]
   4:libmpc-1.0.1-3.el7               ################################# [ 44%]
   5:cpp-4.8.5-4.el7                  ################################# [ 56%]
   6:kernel-headers-3.10.0-327.el7    ################################# [ 67%]
   7:glibc-headers-2.17-105.el7       ################################# [ 78%]
   8:glibc-devel-2.17-105.el7         ################################# [ 89%]
   9:gcc-4.8.5-4.el7                  ################################# [100%]

# 查看版本，确认已安装
[root@etl gcc]# gcc -v
使用内建 specs。
COLLECT_GCC=gcc
COLLECT_LTO_WRAPPER=/usr/libexec/gcc/x86_64-redhat-linux/4.8.5/lto-wrapper
目标：x86_64-redhat-linux
配置为：../configure --prefix=/usr --mandir=/usr/share/man --infodir=/usr/share/info --with-bugurl=http://bugzilla.redhat.com/bugzilla --enable-bootstrap --enable-shared --enable-threads=posix --enable-checking=release --with-system-zlib --enable-__cxa_atexit --disable-libunwind-exceptions --enable-gnu-unique-object --enable-linker-build-id --with-linker-hash-style=gnu --enable-languages=c,c++,objc,obj-c++,java,fortran,ada,go,lto --enable-plugin --enable-initfini-array --disable-libgcj --with-isl=/builddir/build/BUILD/gcc-4.8.5-20150702/obj-x86_64-redhat-linux/isl-install --with-cloog=/builddir/build/BUILD/gcc-4.8.5-20150702/obj-x86_64-redhat-linux/cloog-install --enable-gnu-indirect-function --with-tune=generic --with-arch_32=x86-64 --build=x86_64-redhat-linux
线程模型：posix
gcc 版本 4.8.5 20150623 (Red Hat 4.8.5-4) (GCC) 
```

### g++

进入 `/opt/g++` 目录，执行以下命令安装 `g++` ：

> rpm -ivh *.rpm --nodeps --force

其中 `--nodeps` 表示忽略依赖检查， `--force` 表示强制安装。

```bash
[root@etl g++]# rpm -ivh *.rpm --nodeps --force
准备中...                          ################################# [100%]
正在升级/安装...
   1:libstdc++-devel-4.8.5-4.el7      ################################# [ 50%]
   2:gcc-c++-4.8.5-4.el7              ################################# [100%]

# 查看版本，确认已安装
[root@etl g++]# g++ -v
使用内建 specs。
COLLECT_GCC=g++
COLLECT_LTO_WRAPPER=/usr/libexec/gcc/x86_64-redhat-linux/4.8.5/lto-wrapper
目标：x86_64-redhat-linux
配置为：../configure --prefix=/usr --mandir=/usr/share/man --infodir=/usr/share/info --with-bugurl=http://bugzilla.redhat.com/bugzilla --enable-bootstrap --enable-shared --enable-threads=posix --enable-checking=release --with-system-zlib --enable-__cxa_atexit --disable-libunwind-exceptions --enable-gnu-unique-object --enable-linker-build-id --with-linker-hash-style=gnu --enable-languages=c,c++,objc,obj-c++,java,fortran,ada,go,lto --enable-plugin --enable-initfini-array --disable-libgcj --with-isl=/builddir/build/BUILD/gcc-4.8.5-20150702/obj-x86_64-redhat-linux/isl-install --with-cloog=/builddir/build/BUILD/gcc-4.8.5-20150702/obj-x86_64-redhat-linux/cloog-install --enable-gnu-indirect-function --with-tune=generic --with-arch_32=x86-64 --build=x86_64-redhat-linux
线程模型：posix
gcc 版本 4.8.5 20150623 (Red Hat 4.8.5-4) (GCC) 
```

## 小总结

当你的服务器无法连接到互联网时。这可能是由于网络限制、安全策略或其他原因造成的。在这种情况下，就需要手动下载在可以访问互联网的机器上，下载 `Docker`  `24.0.2` 的离线安装包，并在目标服务器上进行安装。

另外，可能需要离线安装 `GCC` 和 `G++` 环境：

1. 当无法通过网络连接下载和安装`GCC`和`G++`时。
2. 当需要在没有网络连接的环境中进行编译和构建C或C++代码时。

要离线安装GCC和G++环境，除了上述的rpm，还可以按照以下步骤进行操作：

1. 在具有Internet连接的计算机上，下载GCC和G++的离线安装包（通常是tar.gz或tar.xz格式）。
2. 将离线安装包传输到目标计算机上。
3. 在目标计算机上解压离线安装包。
4. 进入解压后的目录，并运行以下命令进行配置和安装：

```bash
./configure
make
sudo make install
```

这将配置、编译和安装 `GCC` 和 `G++` 环境。安装完成后，您可以在目标计算机上使用 `GCC` 和 `G++` 编译和构建 `C` 或 `C++` 代码，比如我们经常以源码方式安装的 `Nginx` 、 `Redis` 。

## Reference

* [https://www.cnblogs.com/dandelion200/p/14577480.html](https://www.cnblogs.com/dandelion200/p/14577480.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
