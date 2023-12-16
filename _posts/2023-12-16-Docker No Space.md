---
layout: post
title: Docker构建镜像时空间不足：/var/lib/docker，no space left on device
tags: Docker
---

## 背景

在一次更新业务服务功能后，重新在服务器上构建微服务镜像，在构建镜像时报错空间不足：

> /var/lib/docker, no space left on device

赶紧用 `df -h` 看了下磁盘使用情况，果然， `devicemapper` 已经满了。。由于需要紧急上线，没有采用迁移 `Docker` 工作目录的方式；而是想办法删除一些没用的文件，空出本次镜像构建、容器运行的空间。

## devicemapper

在处理问题前，先来了解下什么是 `docker/devicemapper` ，这个目录存储了 `Docker` 使用 `devicemapper` 存储驱动时的相关数据。这包括镜像、容器和卷的数据。 `Devicemapper` 是 `Docker` 的一种存储驱动程序，它使用块设备来存储 `Docker` 容器的数据。在 `docker/devicemapper` 目录中，我们可以看到 `metadata`、`snapshots` 和 `thinpool` 等文件和目录，用于存储 `devicemapper` 驱动所需的数据。

## 腾出空间

你可以删除 `docker/devicemapper` 目录下的内容，但请注意，这将导致丢失所有存储在其中的镜像、容器和卷的数据。如果想要清理这些数据，最好使用 `Docker` 提供的命令来进行清理，以确保数据被正确地清理并且不会导致系统不稳定。为了给本次镜像构建、容器运行腾出空间，我主要采用了以下命令。

* 检查Docker数据目录的大小

> du -sh /var/lib/docker

* 查找并删除一些过旧或者不再需要的日志文件

> find /var/lib/docker/devicemapper/mnt -name "*.log" -type f -exec rm {} \; 

* 查找并删除一些过旧或者不再需要的临时文件

> find /var/lib/docker/devicemapper/mnt -name "*.tmp" -type f -exec rm {} \; 

* 删除无用卷

> docker volume rm $(docker volume ls -qf dangling=true)

* 清理dangling image

> docker rmi $(docker images --filter "dangling=true" -q --no-trunc)

* 清理无用的镜像和容器

> docker system prune -a

* 调整Docker的数据目录
如果你的Docker数据目录（通常是/var/lib/docker）所在的分区空间不足，也可以考虑将其迁移到空间更大的分区。具体的迁移方式网上教程很多，由于我这次
没有亲身实践，就省略这部分了。

![2023-12-16-DFSnap.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-12-16-DFSnap.png)

最终，通过删除无用卷 `docker volume rm $(docker volume ls -qf dangling=true)` 这条命令，成功空出了2G+的磁盘空间。

## 小总结

解决问题的方法有很多种，因为每个问题都有其独特的特点和背景。在选择解决方案时，需要考虑问题的性质、规模和环境。有时候，简单的问题可能需要简单的解决方案，而复杂的问题可能需要更加深入的分析和综合的解决方案。因此，对于不同的场景，我们需要灵活运用各种工具、技术和方法来解决问题，以达到最佳的效果。

比如这次遇到的问题，你可以尝试清理不必要的镜像和容器来释放空间。另外，也可以考虑调整devicemapper的配置，比如增加数据卷的大小或者切换到其他存储驱动。但是最重要的是：记得在操作之前备份数据。

## Reference

* [https://blog.51cto.com/u_16175464/7097163](https://blog.51cto.com/u_16175464/7097163)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
