---
layout: post
title: 使用docker-compose部署时序数据库InfluxDB1.8.4
tags: Docker, InfluxDB
---

## 背景

如今 `InfluxDB` 已经更新到了 `2.x` ， `InfluxDB 1.x` 和 `2.x` 版本之间有几个主要的区别：

1. 数据模型：
1.x：使用数据库和保留策略来组织数据。
2.x：引入了组织（organizations）和存储桶（buckets）的概念，存储桶同时包含了数据的时间范围和保留策略。
2. 查询语言：
1.x：使用 `InfluxQL` ，这是一种类似于 `SQL` 的查询语言。
2.x：引入了 `Flux` ，这是一种更强大的数据脚本和查询语言，支持更复杂的数据处理和转换功能。
3. 用户界面：
1.x：主要通过命令行界面进行交互。
2.x：提供了一个全新的用户界面，支持仪表板、数据可视化和任务管理。
4. API 和客户端库：
1.x：主要通过 `InfluxDB HTTP API` 进行数据写入、查询等操作。
2.x： `API` 更加标准化，并且提供了更多语言的客户端库支持。
5. 任务和数据处理：
1.x：较为有限，主要依赖外部工具。
2.x：内置了任务管理功能，可以直接在 `InfluxDB` 中创建和管理定时任务，例如数据转换、降采样等。
6. 安全性：
1.x：基本的认证和授权功能。
2.x：增强了安全性，包括内置的用户管理、令牌（tokens）和更细粒度的权限控制。
7. 集成和扩展性：
1.x：支持一些插件和集成。
2.x：通过支持更多的数据源和外部服务的集成，以及对 `Telegraf` 的内置支持，提高了扩展性。
总的来说， `2.x` 版本在功能、灵活性和用户体验方面都有显著的提升，特别是引入了 `Flux` 语言和新的组织结构，使得数据管理和处理更加高效和灵活。

但是考虑团队成员对 `2.x` 熟悉程度与学习成本，保守选择了 `1.8.4` 版本；以下主要记录了使用 `Docker` 安装 `InfluxDB` 遇到的问题与解决方法。

## 配置

```yaml
  my-influxdb:
    container_name: my-influxdb
    image: influxdb:1.8.4
    restart: always
    environment:
      - INFLUXDB_DB=test
      - INFLUXDB_ADMIN_USER=admin
      - INFLUXDB_ADMIN_PASSWORD=you-guess
	  - TZ=Asia/Shanghai
    ports:
      - "8086:8086"
    volumes:
      - ./influxdb/data:/var/lib/influxdb
```

## 部署

docker-compose -f docker-compose.yml up -d my-influxdb

## 验证

采用上述配置启动容器后，发现通过 `InfluxDBStudio` [客户端工具](https://github.com/CymaticLabs/InfluxDBStudio/releases/download/v0.2.0-beta.1/InfluxDBStudio-0.2.0.zip)，不用密码也可以登录访问数据库，也就是说，我们配置的用户名和密码根本没生效。

## 修改配置

默认情况下， `InfluxDB` 的配置是禁用认证策略的，所以先编辑配置文件 `influxdb.conf` ，把 [http] 下的 `auth-enabled` 选项设置为 `true` ，具体如下：

```conf
[meta]
  dir = "/var/lib/influxdb/meta"

[data]
  dir = "/var/lib/influxdb/data"
  engine = "tsm1"
  wal-dir = "/var/lib/influxdb/wal"

[http]
  auth-enabled = true
```

然后把配置文件挂载到容器内部，再次运行，成功~

```yaml
  my-influxdb:
    container_name: my-influxdb
    image: influxdb:1.8.4
    restart: always
    environment:
      - INFLUXDB_DB=test
      - INFLUXDB_ADMIN_USER=admin
      - INFLUXDB_ADMIN_PASSWORD=you-guess
      - TZ=Asia/Shanghai
    ports:
      - "8086:8086"
    volumes:
      - ./influxdb/data:/var/lib/influxdb
      - ./influxdb/conf/influxdb.conf:/etc/influxdb/influxdb.conf
```

## 问题总结

运行 `InfluxDB` 的关键是那几个环境变量的配置，但是当前却没有一个可以查看文档的地方。。

一方面是因为国内无法访问 `Docker Hub` ，导致不能查阅镜像的文档；另一方面网上的关于 `Docker` 部署 `InfluxDB` 的文章很多的认证配置都是错误的，eg：有写 `INFLUXDB_INIT_ADMIN_USERNAME` 的， `INFLUXDB_ADMIN_USER` 的，还有写 `INFLUXDB_USER` 的，导致本来很简单的事情走了不少弯路，详细配置查看[官方文档](https://influxdb-v1-docs-cn.cnosdb.com/influxdb/v1.8/administration/authentication_and_authorization/)或者[GitHub](https://github.com/influxdata/influxdb)。

### 如何查看镜像的环境变量？

一般的镜像在 `Docker Hub` 的文档中都会列清楚核心的环境变量有哪些，以及如何进行配置的示例。但是 `Docker Hub` 访问不了。。

* 通过docker inspect查看指定镜像的环境变量，发现只有一个版本号。。

```bash
hi@hi-GeekPro:/home/hi# docker inspect --format='{{range $index, $value := .Config.Env}}{{$value}}{{println}}{{end}}' 8ffbb8ff883f
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
INFLUXDB_VERSION=1.8.4
```

在网上查了后，发现了以下查看容器环境变量的方法，虽然对于当前的问题并没有什么帮助，姑且记录下。

* 进入容器内部，通过env或者printenv可以查看当前容器的环境变量

```
hi@hi-GeekPro:/home/hi# docker exec -it my-influxdb /bin/bash
root@22d4f166ca85:/# env
INFLUXDB_DB=test
TZ=Asia/Shanghai
HOSTNAME=22d4f166ca85
INFLUXDB_ADMIN_USER=admin
PWD=/
HOME=/root
TERM=xterm
INFLUXDB_VERSION=1.8.4
SHLVL=1
INFLUXDB_ADMIN_PASSWORD=you-guess
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
_=/usr/bin/env
```

* 通过docker inspect查看指定容器的环境变量

```bash
hi@hi-GeekPro:/home/hi# docker inspect --format='{{range $index, $value := .Config.Env}}{{$value}}{{println}}{{end}}' my-influxdb
INFLUXDB_DB=test
INFLUXDB_ADMIN_USER=admin
INFLUXDB_ADMIN_PASSWORD=you-guess
TZ=Asia/Shanghai
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
INFLUXDB_VERSION=1.8.4
```

### 如何查看镜像的构建脚本dockerfile？

下面这条命令是从网上一篇文章中看到的，不明觉厉。。

> docker history --format {{. CreatedBy}} --no-trunc=true 镜像id |sed "s/\/bin\/sh\ -c\ \#(nop)\ //g"|sed "s/\/bin\/sh\ -c/RUN/g" | tac

```bash
hi@hi-GeekPro:/home/hi# docker images
REPOSITORY                        TAG               IMAGE ID       CREATED          SIZE
mysql                             8.0               7e6df4470869   3 months ago     603MB
redis                             7.2.3             e40e2763392d   5 months ago     138MB
apache/doris                      1.2.2-be-x86_64   742becf62011   15 months ago    4.22GB
apache/doris                      1.2.2-fe-x86_64   ebc68f40c5d6   15 months ago    1.06GB
influxdb                          1.8.4             8ffbb8ff883f   3 years ago      308MB
hi@hi-GeekPro:/home/hi# docker history --format {{.CreatedBy}} --no-trunc=true  8ffbb8ff883f  |sed "s/\/bin\/sh\ -c\ \#(nop)\ //g"|sed "s/\/bin\/sh\ -c/RUN/g" | tac
ADD file:e3d37689e896a83d39040f2c95091ff88f3899b5b410dbf76908dd6c938b8cb5 in / 
 CMD ["bash"]
RUN set -eux;  apt-get update;  apt-get install -y --no-install-recommends   apt-transport-https   ca-certificates   curl   netbase   wget  ;  rm -rf /var/lib/apt/lists/*
RUN set -ex;  if ! command -v gpg > /dev/null; then   apt-get update;   apt-get install -y --no-install-recommends    gnupg    dirmngr   ;   rm -rf /var/lib/apt/lists/*;  fi
RUN set -ex &&     mkdir ~/.gnupg;     echo "disable-ipv6" >> ~/.gnupg/dirmngr.conf;     for key in         05CE15085FC09D18E99EFB22684A14CF2582E0C5 ;     do         gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key" ||         gpg --keyserver pgp.mit.edu --recv-keys "$key" ||         gpg --keyserver keyserver.pgp.com --recv-keys "$key" ;     done
 ENV INFLUXDB_VERSION=1.8.4
RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" &&     case "${dpkgArch##*-}" in       amd64) ARCH='amd64';;       arm64) ARCH='arm64';;       armhf) ARCH='armhf';;       armel) ARCH='armel';;       *)     echo "Unsupported architecture: ${dpkgArch}"; exit 1;;     esac &&     wget --no-verbose https://dl.influxdata.com/influxdb/releases/influxdb_${INFLUXDB_VERSION}_${ARCH}.deb.asc &&     wget --no-verbose https://dl.influxdata.com/influxdb/releases/influxdb_${INFLUXDB_VERSION}_${ARCH}.deb &&     gpg --batch --verify influxdb_${INFLUXDB_VERSION}_${ARCH}.deb.asc influxdb_${INFLUXDB_VERSION}_${ARCH}.deb &&     dpkg -i influxdb_${INFLUXDB_VERSION}_${ARCH}.deb &&     rm -f influxdb_${INFLUXDB_VERSION}_${ARCH}.deb*
COPY file:3d8a606d61e1fc0042cf34d036eda4550a18d140c47376dacc02d96ee6f2dd8b in /etc/influxdb/influxdb.conf 
 EXPOSE 8086
 VOLUME [/var/lib/influxdb]
COPY file:61c4af7a0e637328374ec46266ed6dde40adf7d14ac6c5081100924991beb7f3 in /entrypoint.sh 
COPY file:e7af69cde81ffb6eddc175488941183d1244772c36c27b74751d54389fb71701 in /init-influxdb.sh 
 ENTRYPOINT ["/entrypoint.sh"]
 CMD ["influxd"]
```

### 如何在国内查看镜像的文档？

答案是：目前没有方法查看 `Docker Hub` 的镜像文档。

不过，虽然 `Docker Hub` 访问不了，但是我们使用的软件一般都是开源的，这样就可以到 `GitHub` 上查看其镜像构建文件。eg: 本次部署的 `InfluxDB` 单机版是开源的，可以在[init-influxdb.sh](https://github.com/influxdata/influxdb/blob/1.8.4/docker/init-influxdb.sh)看到只有当 `AUTH_ENABLED` 为 `true` ，并且配置了 `INFLUXDB_ADMIN_USER` 时，才会开启认证并创建对应的用户，否则即使配置了用户信息，其实还是可以匿名登录。。

![2024-05-25-InfluxDB.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-05-25-InfluxDB.jpg)

## 备份与恢复

对于一个数据库的基本操作，除了增删改查外，我们还经常需要进行数据的迁移与同步，这就涉及到数据的备份与恢复操作。

### 备份

```bash
docker exec -it my-influxdb /bin/bash
influxd backup -portable -database test -host 102.102.0.114:8086 /opt/influx
```

### 导出文件

```bash
docker cp my-influxdb:<path-to-backup> <path-to-restore>
```

### 恢复

```bash
influxd restore -portable <path-to-restore>
```

# Reference
* [https://influxdb-v1-docs-cn.cnosdb.com/influxdb/v1.8/administration/authentication_and_authorization/](https://influxdb-v1-docs-cn.cnosdb.com/influxdb/v1.8/administration/authentication_and_authorization/)

* [https://github.com/influxdata/influxdb](https://github.com/influxdata/influxdb)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
