---
layout: post
title: 全栈开发之MinIO分布式文件存储集群
tags: SpringBoot, MinIO
---

## 背景

你们项目中关于上传的文件是存储在什么地方的？

我们的项目关于文件存储经过了这么一个演进过程：
1. 静态资源目录；当时前后端不分离，直接在项目的静态资源目录，每次部署前，先备份资源目录，否则就会丢失掉这些文件；
2. 服务器上一个单独的文件存储目录；对于没多少文件可存的小项目一般这种方式就够了，这一阶段持续了一两年时间，直到单机硬盘空间不足，显然，这种方式不支持横向扩展；
3. 分布式文件存储；当时遇到多实例集群、保证高可用的需求，关于分布式文件存储，我们调研了`FastDFS`与`MinIO`以及云服务（七牛云、阿里云等的对象存储），鉴于`FastDFS`配置较为复杂，最终决定使用`MinIO`，易上手，可扩展。

## 基本操作

![2022-02-13-MinIOIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-MinIOIndex.jpg)

`MinIO` 是全球领先的对象存储先锋，在标准硬件上，读/写速度上高达183 GB / 秒 和 171 GB / 秒。MinIO用作云原生应用程序的主要存储，与传统对象存储相比，云原生应用程序需要更高的吞吐量和更低的延迟。通过添加更多集群可以扩展名称空间，更多机架，直到实现目标。同时，符合一切原生云计算的架构和构建过程，并且包含最新的云计算的全新的技术和概念。

关于对象存储，使用起来无非就是文件上传、下载与删除，再加上桶的操作而已。这里仅关注 `MinIO` 分布式集群的高可用性、可扩展性。

1. 桶管理；
2. 对象管理（上传、下载、删除）；
3. 对象预签名；
4. 桶策略管理；

Note: 我这里使用 `7.x` 的版本进行实验与演示，最新版的 `8.x` 的 `MinIO` 后台管理界面有所不同，但是经过我们实际生产的测试，接口都是兼容的。

```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>7.1.4</version>
</dependency>
```

## MinIO在Docker下单实例运行

```bash
docker run -p 9000:9000 \
  --name minio1 \
  -v /opt/minio/data-single \
  -e "MINIO_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE" \
  -e "MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  minio/minio server /data
```

![2022-02-13-MinIOLogin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-MinIOLogin.jpg)

## MinIO在Docker Compose下集群（4实例）配置

 
* 参考

官方文档：https://docs.min.io/docs/deploy-minio-on-docker-compose.html

* 配置

通过 `docker-compose` 在一台主机上，运行四个 `MinIO` 实例，并由 `Nginx` 进行反向代理，负载均衡对外统一提供服务。

涉及的两个配置：
1. docker-compose.yaml
2. nginx.conf

* docker-compose.yaml

```yaml
version: '3.7'

# starts 4 docker containers running minio server instances.
# using nginx reverse proxy, load balancing, you can access
# it through port 9000.
services:
  minio1:
    image: minio/minio:RELEASE.2020-11-10T21-02-24Z
    volumes:
      - data1-1:/data1
      - data1-2:/data2
    expose:
      - "9000"
    environment:
      MINIO_ACCESS_KEY: minio
      MINIO_SECRET_KEY: minio123
    command: server http://minio{1...4}/data{1...2}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio2:
    image: minio/minio:RELEASE.2020-11-10T21-02-24Z
    volumes:
      - data2-1:/data1
      - data2-2:/data2
    expose:
      - "9000"
    environment:
      MINIO_ACCESS_KEY: minio
      MINIO_SECRET_KEY: minio123
    command: server http://minio{1...4}/data{1...2}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio3:
    image: minio/minio:RELEASE.2020-11-10T21-02-24Z
    volumes:
      - data3-1:/data1
      - data3-2:/data2
    expose:
      - "9000"
    environment:
      MINIO_ACCESS_KEY: minio
      MINIO_SECRET_KEY: minio123
    command: server http://minio{1...4}/data{1...2}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  minio4:
    image: minio/minio:RELEASE.2020-11-10T21-02-24Z
    volumes:
      - data4-1:/data1
      - data4-2:/data2
    expose:
      - "9000"
    environment:
      MINIO_ACCESS_KEY: minio
      MINIO_SECRET_KEY: minio123
    command: server http://minio{1...4}/data{1...2}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  nginx:
    image: nginx:1.19.2-alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "9000:9000"
    depends_on:
      - minio1
      - minio2
      - minio3
      - minio4

## By default this config uses default local driver,

## For custom volumes replace with volume driver configuration.

volumes:
  data1-1:
  data1-2:
  data2-1:
  data2-2:
  data3-1:
  data3-2:
  data4-1:
  data4-2:
```

* nginx.conf

```conf
user  nginx;
worker_processes  auto;

error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile        on;
    #tcp_nopush     on;

    keepalive_timeout  65;

    #gzip  on;

    # include /etc/nginx/conf.d/*.conf;

    upstream minio {
        server minio1:9000;
        server minio2:9000;
        server minio3:9000;
        server minio4:9000;
    }

    server {
        listen       9000;
        listen  [::]:9000;
        server_name  localhost;

         # To allow special characters in headers
         ignore_invalid_headers off;
         # Allow any size file to be uploaded.
         # Set to a value such as 1000m; to restrict file size to a specific value
         client_max_body_size 0;
         # To disable buffering
         proxy_buffering off;

        location / {
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            proxy_connect_timeout 300;
            # Default is HTTP/1, keepalive is only enabled in HTTP/1.1
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            chunked_transfer_encoding off;

            proxy_pass http://minio;
        }
    }
}
```

## MinIO在Docker Compose下集群（4实例）运行

```
前台运行（可直观地查看日志）：docker-compose up
后台运行：docker-compose up -d
停止服务：docker-compose down
```

![2022-02-13-DockerCompose.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-DockerCompose.jpg)

## MinIO集群高可用性测试

集群运行后，可通过停止不同数量的实例观察可用性：可下载、可上传。

> A stand-alone MinIO server would go down if the server hosting the disks goes offline. In contrast, a distributed MinIO setup with m servers and n disks will have your data safe as long as m/2 servers or m*n/2 or more disks are online.

> For example, an 16-server distributed setup with 200 disks per node would continue serving files, up to 4 servers can be offline in default configuration i.e around 800 disks down MinIO would continue to read and write objects.

`MinIO` 官方建议起码要搭建一个四块盘的集群，具体配置几台机器看自己需求确定，比如：
* 一台机器四块硬盘
* 二台机器两块硬盘
* 四台机器一块硬盘

### 集群中4个实例在线

当有4个实例的集群中4个实例都在线时，**可上传、可下载**。

![2022-02-13-Cluster1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Cluster1.jpg)

![2022-02-13-Upload.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Upload.jpg)

![2022-02-13-Download.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Download.jpg)

### 集群中3个实例在线

当有4个实例的集群中3个实例都在线时，**可上传、可下载**（即虽然一个实例挂了，但是服务依然正常，高可用~~）。

![2022-02-13-Cluster2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Cluster2.jpg)

### 集群中2个实例在线

当有4个实例的集群中仅有2个实例在线时，**仅可下载，不可上传**。

![2022-02-13-Cluster4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Cluster4.jpg)

![2022-02-13-Cluster3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Cluster3.jpg)

### 集群中1个实例在线

此时，虽然仍有1个服务实例在线，但是已经无法提供正常的上传、下载服务，即**不可上传，不可下载**。

![2022-02-13-Cluster6.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Cluster6.jpg)

![2022-02-13-Cluster5.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-Cluster5.jpg)

我们可以得出结论：一个有4个实例运行的 `MinIO` 集群，有3个在线，读取写入都可以进行，有2个在线，可以保证能读取，但不能写入，若只剩下一个实例，则读写都不可进行。这与官方文档给出说明相一致（超过 `m/2` 个服务器在线，或者超过 `m*n/2` 个磁盘在线）。

Note: 在每停止一个服务后，可以查看 `MinIO` 后台的日志，观察各个服务实例的在线状态监测过程，方便理解。

* 查看服务日志

```
docker exec -it 12935e3c6264 bash
```

## 可能遇到的问题

* SpringBoot上传文件报错：org.springframework.web.multipart. MaxUploadSizeExceededException: Maximum upload size exceeded; nested exception is java.lang. IllegalStateException: org.apache.tomcat.util.http.fileupload.impl. FileSizeLimitExceededException: The field file exceeds its maximum permitted size of 1048576 bytes.

这是因为 `SpringBoot` 项目限制了上传文件的大小，默认为1M，当用户上传了超过1M大小的文件时，就会抛出上述错误，可通过以下配置修改。

```yaml
spring:
  servlet:
    multipart:
      maxFileSize: 10MB
      maxRequestSize: 30MB
```

* 通过`docker exec -it cd34c345960c /bin/bash`无法进入容器，报错：OCI runtime exec failed: exec failed: container_linux.go:349: starting container process caused "exec: \"/\": permission denied": unknown

解决： `docker exec -it cd34c345960c /bin/bash` 改为： `docker exec -it cd34c345960c sh` 或者： `docker exec -it cd34c345960c /bin/sh`

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
