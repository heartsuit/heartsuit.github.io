---
layout: post
title: Docker化koa2 vue OCR Web应用
tags: Docker
---
### 首先要有一个应用
当然，随便一个Node app即可。
按照Node官网提供的[例子](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)，可以顺利对Node App构建镜像、运行容器，每一步都写得清楚明了。
这里采用前面做的一个[基于koa2, vue的一个小型应用](https://github.com/heartsuit/koa2-ocr-on-docker)来实现Docker化。

### 第二步编写Dockerfile
- Dockerfile

``` bash
# On the shoulder of giant
FROM daocloud.io/library/node:latest

MAINTAINER Heartsuit

RUN \
 DEBIAN_FRONTEND=noninteractive apt-get update && \
 DEBIAN_FRONTEND=noninteractive apt-get -y install tesseract-ocr && \

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json .
# For npm@5 or later, copy package-lock.json as well
COPY package.json package-lock.json ./

RUN npm install --only=production
# If you are building your code for production
# RUN npm install --registry=https://registry.npm.taobao.org

# Bundle app source
COPY . .

# Bind port and start
EXPOSE 8888
CMD [ "npm", "start" ]
```

与Node 官网例子的区别主要是增加了安装程序(RUN)这一步，因为ocr调用的还是宿主机器的可执行程序。
新增的命令（在Linux宿主机下安装软件）如下：

``` bash
RUN \
 DEBIAN_FRONTEND=noninteractive apt-get update && \
 DEBIAN_FRONTEND=noninteractive apt-get -y install tesseract-ocr && \
```

- .dockerignore

与.gitignore类似，用以忽略不进行构建的资源文件/目录。

> node_modules

### 构建、运行（Build --> Ship --> Run）
容器可以理解为镜像的一个实例。

### 可能用到的命令

``` bash
# 从Dockerfile构建一个镜像
docker build -t <name:version> <Dockerfile directory>
# 查看新构建的镜像
docker images
# 以后台模式从镜像启动容器，并将映射端口：本地端口:容器内端口
docker run -p 8888:8888 -d <name:version>
# 查看正在运行的容器
docker ps
# 查看本地端口与容器端口的映射
docker port <container id>
# 查看容器中应用控制台打印出的日志
docker logs <container id>
# 查看docker默认ip
docker-machine ip default
# 测试Web应用是否可用（这里采用默认的docker-machine地址，怎样才能使用localhost访问，还没找到方法？？）
curl http://$(docker-machine ip default):port
# Copy容器内的文件到宿主本地
docker cp <container id>:/usr/src/app/log.txt '本地磁盘路径'
# 进入容器
docker exec -it <container id> /bin/bash
```

Note：
1. boot2docker中docker用户的初始密码为：`tcuser`；root用户没有密码，在docker用户下使用`sudo su - root`切换到root；
2. 要运行容器，不必每次都执行docker run，这样每次都会生成新的容器，可以通过`docker start <container id>`启动之前被关闭的容器；

``` bash
# 查看docker容器中Linux系统版本信息
cat /proc/version
# 删除当前目录下所有内容(比如清除某文件夹下的临时文件)
rm -rf * 
# 退出容器，返回docker
exit
```

### 推送本地镜像至云端
- 可采用一些服务商提供的镜像服务进行云端存储，这里用了网易蜂巢的163（私有镜像库😐）：

``` bash
# Upload image to private repository on hub.c.163.com
docker login -u username -p password hub.c.163.com
docker tag <tag> hub.c.163.com/<user id>/tag
docker push hub.c.163.com/<user id>/tag
```

### 遇到的问题/疑问
1. 将Web app构建镜像，运行容器后，通过什么地址访问？
- `curl http://$(docker-machine ip default):port`
2. 如何从容器中Copy文件到宿主机器？
- `docker cp <container id>:/usr/src/app/log.txt '本地磁盘路径'`
3. 如何在Linux（Debian）上安装tesseract-ocr软件？
- 构建后安装：首先`docker exec -it <container id> /bin/bash`进入容器，然后执行`apt-get update`, `apt-get install tesseract-ocr`;*这种方式仅会在当前的容器实例中安装，下次run镜像的时候，需重新安装；*
- 构建前安装：修改Dockerfile，将安装软件的命令写入其中，这样就将安装命令构建到镜像中，以后每次run镜像都会具有相应的软件环境；

> 上述几个问题都可以从[可能用到的命令](#whoru3)中找到解决方法。

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***