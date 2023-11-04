---
layout: post
title: GraphQL入门与开源的GraphQL引擎Hasura体验
tags: GraphQL, Hasura
---

## 背景

`Hasura` 是一个开源的 `GraphQL` 引擎，它可以帮助开发人员快速构建和部署现代应用程序的后端。它提供了一个自动化的 `GraphQL API` ，可以直接连接到现有的数据库，并提供实时数据推送和订阅功能。 `Hasura` 团队总部位于印度。

## 下载安装

脚本地址：[https://raw.githubusercontent.com/hasura/graphql-engine/stable/install-manifests/docker-compose/docker-compose.yaml](https://raw.githubusercontent.com/hasura/graphql-engine/stable/install-manifests/docker-compose/docker-compose.yaml)

```bash
[root@graphql ~]# cd /opt/hasura/

# 下载docker-compose.yml的编排脚本
[root@graphql hasura]# curl https://raw.githubusercontent.com/hasura/graphql-engine/stable/install-manifests/docker-compose/docker-compose.yaml -o docker-compose.yml

# 启动容器
[root@graphql hasura]# docker compose up -d
[+] Running 3/3
 ✘ Container hasura-data-connector-agent-1  Error                                                                     0.1s 
 ✔ Container hasura-postgres-1              Running                                                                   0.0s 
 ✔ Container hasura-graphql-engine-1        Created                                                                   0.1s 
dependency failed to start: container hasura-data-connector-agent-1 is unhealthy
```

## 遇到的问题：CPU does not support x86-64-v2

正常情况下，经过上述的安装之后就可以正常使用Hasura了，但是显然， `docker compose` 启动容器后显示了一条错误信息：

> dependency failed to start: container hasura-data-connector-agent-1 is unhealthy

```bash
# 查看进程
[root@graphql hasura]# docker ps
CONTAINER ID   IMAGE                                   COMMAND                   CREATED          STATUS                            PORTS      NAMES
48055c1c2732   hasura/graphql-data-connector:v2.33.0   "/app/run-java.sh"        29 seconds ago   Restarting (127) 13 seconds ago              hasura-data-connector-agent-1
8e5e0f4d8cd5   postgres:15                             "docker-entrypoint.s…"   13 hours ago     Up 13 hours                       5432/tcp   hasura-postgres-1

# 查看报错容器的日志信息
[root@graphql hasura]# docker logs 48055c1c2732
Fatal glibc error: CPU does not support x86-64-v2
Fatal glibc error: CPU does not support x86-64-v2
Fatal glibc error: CPU does not support x86-64-v2
```

* 原因分析
日志里说明了错误的原因，由于 `CPU` 架构问题。。

* 解决方法
那么，就换个不同的版本吧，但是从官方的发布日志里并没有找到需要的版本；换个思路， `data-connector-agent` 似乎是新版本才加入的，核心的 `graphql-engine` 能用就行，就从网络博客中找到了以下 `docker-compose.yml` 的编排脚本：

```yaml
version: '3.6'
services:
  postgres:
    image: postgres:15
    restart: always
    volumes:
    - db_data:/var/lib/postgresql/data
    ports:
    - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgrespassword
  graphql-engine:
    image: hasura/graphql-engine:v2.24.0
    ports:
    - "8080:8080"
    depends_on:
    - "postgres"
    restart: always
    environment:
      ## postgres database to store Hasura metadata
      HASURA_GRAPHQL_METADATA_DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/postgres
      ## this env var can be used to add the above postgres database to Hasura as a data source. this can be removed/updated based on your needs
      PG_DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/postgres
      ## enable the console served by server
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true" # set to "false" to disable console
      ## enable debugging mode. It is recommended to disable this in production
      HASURA_GRAPHQL_DEV_MODE: "true"
      HASURA_GRAPHQL_ENABLED_LOG_TYPES: startup, http-log, webhook-log, websocket-log, query-log
      ## uncomment next line to run console offline (i.e load console assets from server instead of CDN)
      # HASURA_GRAPHQL_CONSOLE_ASSETS_DIR: /srv/console-assets
      ## uncomment next line to set an admin secret
      # HASURA_GRAPHQL_ADMIN_SECRET: myadminsecretkey
volumes:
  db_data:
```

## 遇到的问题：不同版本的PostgreSQL数据目录不兼容

如果一开始用的是 `PostgreSQL 15` ，而重新换新的 `docker-compose.yml` 的编排脚本（里面是 `PostgreSQL 14.X` ）执行时，便会报出以下错误。

> The data directory was initialized by PostgreSQL version 15, which is not compatible with this version 14.9 (Debian 14.9-1.pgdg120+1).

* 原因分析
`docker compose` 会按名称重用卷（这样就不会丢失数据）。在更换 `PostgreSQL` 大版本时，必须将数据迁移到新卷，如果没有任何有用的数据，则删除旧的卷。

* 解决方法
先删除容器，再删除未被任何容器使用的本地卷
docker volume ls # 查看本地所有的卷
docker volume prune # 删除未被任何容器使用的本地卷

```bash
[root@graphql hasura]# docker volume ls
DRIVER    VOLUME NAME
local     hasura_db_data

# 这条命令并没有删除卷，接着就用下一条语句直接删除
[root@graphql hasura]# docker volume prune
WARNING! This will remove anonymous local volumes not used by at least one container.
Are you sure you want to continue? [y/N] y
Total reclaimed space: 0B

[root@graphql hasura]# docker volume rm hasura_db_data
hasura_db_data
/var/lib/docker/volumes

# 再次尝试启动
[root@graphql hasura]# docker compose up -d

# 启动成功
[root@graphql hasura]# docker ps
CONTAINER ID   IMAGE                           COMMAND                    CREATED              STATUS                        PORTS                                       NAMES
5709437e2127   hasura/graphql-engine:v2.24.0   "/bin/sh -c '\"${HGE_…"   About a minute ago   Up About a minute (healthy)   0.0.0.0:8080->8080/tcp, :::8080->8080/tcp   hasura-graphql-engine-1
a41ec5127932   postgres:15                     "docker-entrypoint.s…"    About a minute ago   Up About a minute             0.0.0.0:5432->5432/tcp, :::5432->5432/tcp   hasura-postgres-1
```

## 连接数据源

安装启动成功后，可以打开浏览器访问控制台：http://your-host:8080/console。

可以直接使用 `Hasura` 自带的 `PostgreSQL` 作为数据源进行操作。

![2023-11-04-Hasura.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-11-04-Hasura.jpg)

`Hasura` 本身就是基于 `PostgreSQL` 进行开发的，目前对其他的数据库也在做适配中，不过如果要连接 `MySQL` ，则需要使用其企业版。。

![2023-11-04-MySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-11-04-MySQL.jpg)

因此如果确实有连接 `MySQL` 的强需求，则可以尝试下国产版的 `Hasura` ：[飞布](https://www.fireboom.io/)。

![2023-11-04-Fireboom.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-11-04-Fireboom.jpg)

## GraphQL基本操作

关于 `GraphQL` 可以结合以下两个网址极速入门~~

* [GraphQL入门](https://graphql.cn/learn/)
* [Countries GraphQL API](https://countries.trevorblades.com/)

![2023-11-04-Country.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-11-04-Country.jpg)

### 基本查询

```
query {
  countries{
    name,
    code
    phones
  }
}
```

### 嵌套查询

```
query {
  countries{
    name,
    code
    phone,
    languages{
      code,
      name,
      native,
      rtl
    }
  }
}
```

### 条件查询

```
{
  countries(filter : {code:{eq: "AU"} }) {
    name
    code
    phone
    languages {
      code
      name
      native
      rtl
    }
  }
}

query getCountry {
  country(code: "CN"){
    name,
    code
    phones
  }
}
```

### 别名

```
{
  countries(filter : {code:{eq: "AU"} }) {
    name
    code
    phone
    lan: languages {
      code
      name
      native
      rtl
    }
  }
}
```

### 片段

```
{
  conflictOne: countries(filter: {code: {eq: "PS"}}) {
    ...sameField
  }
  conflictTwo: countries(filter: {code: {eq: "IL"}}) {
    ...sameField
  }
}

fragment sameField on Country {
  code
  name
  native
  lan: languages {
    code
    name
    native
  }
}
```

### 操作名称query

```
query getCounty {
  countries(filter : {code:{eq: "CN"} }) {
    name
    code
    phone
    languages {
      code
      name
      native
      rtl
    }
  }
}
```

### 变量

```
query getCounty($code: String) {
  countries(filter: {code: {eq: $code}}) {
    name
    code
    phone
    languages {
      code
      name
      native
      rtl
    }
  }
}

{
  "code": "AU"
}
```

### 默认变量

```
query getCounty($code: String = "CN") {
  countries(filter: {code: {eq: $code}}) {
    name
    code
    phone
    languages {
      code
      name
      native
      rtl
    }
  }
}
```

### 指令：include，skip

```
query getCounty($code: String, $withLanguages: Boolean!) {
  countries(filter: {code: {eq: $code}}) {
    name
    code
    phone
    languages @include(if: $withLanguages){
      code
      name
      native
      rtl
    }
    states @skip(if: $withLanguages){
      code
      name
    }
  }
}

{
  "code": "CN",
  "withLanguages": false
}
```

## 小总结

`Hasura` 是一个强大的工具，可以帮助开发人员快速构建现代应用程序的后端，并提供实时数据推送和安全性，其特性如下：

1. 快速开发：`Hasura`提供了一个简单易用的界面，可以快速定义和管理数据模型，并自动生成`GraphQL API`。这样可以大大减少开发时间和工作量。
2. 实时数据推送：`Hasura`支持实时数据推送和订阅功能，可以实时更新客户端应用程序的数据。这对于需要实时更新的应用程序非常有用，如聊天应用、实时博客等。
3. 安全性：`Hasura`提供了强大的身份验证和授权功能，可以轻松管理用户权限和访问控制。这样可以确保数据的安全性和保护用户隐私。
4. 扩展性：`Hasura`可以轻松扩展以处理高负载和大规模应用程序。它支持水平扩展和负载均衡，可以根据需要增加或减少资源。

当然，作为一款后端低代码平台，也推荐使用对标 `Hasura` 的国产替代产品：**飞布**：

> 飞布是可视化API开发平台，对标 `hasura` ，灵活开放、多语言兼容、简单易学，能构建生产级 `WEB API` ，让前端变全栈，让后端不搬砖。 

## Reference

* [Hasura官方文档](https://hasura.io/docs/latest/getting-started/docker-simple/)
* [Hasura安装脚本](https://github.com/hasura/graphql-engine/blob/master/install-manifests/docker-compose/docker-compose.yaml])
* [Countries GraphQL API 源码](https://github.com/trevorblades/countries)
* [Countries 数据集](https://annexare.github.io/Countries/)
