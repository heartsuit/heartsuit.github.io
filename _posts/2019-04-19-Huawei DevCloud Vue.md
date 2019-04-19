---
layout: post
title: 上手华为软开云DevOps前后端分离实践之-前端Vue
tags: Vue
---

### 简介

    前面实现了SpringBoot项目华为软开云的一键操作。这次来搞Vue，实现前后端完全分离。
    这里我们仍然是先忽略华为软开云的项目管理功能（`Scrum`，看板里的需求规划、任务指派、工时分配），测试功能，文档管理功能，CloudIDE等；重点关注`项目创建、代码托管、编译构建、部署、发布以及流水线功能`；同时代码仅供示例，重在熟悉软开云的流程。

### 效果

![2019-04-18-Appearance.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-Appearance.gif)

Note: 以下步骤中有些与上一篇后端项目的搭建一致，所以这里做了省略，如有疑问，可以查看 [后端 SpringBoot](https://blog.csdn.net/u013810234/article/details/89376466)

### 创建项目

略

### 代码托管

- 创建仓库

略

- 选择模板、语言

略

- 创建 SSH 并上传公钥

略（这一步一台机器操作一次即可）

通过`git clone repo_url`下载到本地。

- 创建 Vue 脚手架项目

![2019-04-19-CreateVueProject.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-CreateVueProject.png)

- 前端代码示例

![2019-04-19-FrontCode.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-FrontCode.png)

- push 代码到华为云

![2019-04-19-FrontRepo.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-FrontRepo.png)

Note: 开发环境跨域

![2019-04-19-DevCors.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DevCors.png)

### 编译构建

可实时查看构建全量日志

- 构建步骤

![2019-04-19-BuildVue1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-BuildVue1.png)

![2019-04-19-BuildVue2.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-BuildVue2.png)

Note: 深坑：默认仅将`inidex.html`传至发布包，竟然忽略了`static`目录！

这是实际构建应该生成的目录：

![2019-04-19-ReleaseDir.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-ReleaseDir.png)

- 官方文档

![2019-04-19-ReleaseDoc.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-ReleaseDoc.png)

So，也可以理解，服务器从安全的角度考虑，不支持自动创建文件夹。以下是解决方法：传到发布仓库时，先进行压缩，部署到服务器上再进行加压缩。

- 添加`执行Shell命令`的构建步骤

![2019-04-19-BuildVue3.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-BuildVue3.png)

![2019-04-19-BuildVue4.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-BuildVue4.png)

Note: 先添加压缩脚本，然后注意`上传到软件发布库`的构建包路径也做了修改。

### 发布包

这里的发布包可以在部署时进行选择

![2019-04-19-ReleasePackage.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-ReleasePackage.png)

### 部署

可实时查看部署全量日志

- 主机组，公网 IP

部署时，因为我们的项目要部署到一个公网可访问的服务器上，需要一个具有公网 IP 的主机组。点击上图中的`创建主机组`，完成主机组的创建后，需要往里添加主机，这时需要一个具有公网 IP 的主机，可以是华为的云主机，也可以是阿里云、腾讯云的主机，只要有公网 IP 即可。这里以华为云的主机为例：

![2019-04-18-ECSInstance.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-ECSInstance.png)

![2019-04-18-IPs.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-IPs.png)

将上述公网 IP 之一与一个主机实例绑定即可。

![2019-04-18-HostGroup.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-HostGroup.png)

- 部署步骤配置

由于华为软开云没有对Vue项目的官方部署模板，下述步骤为自定义部署步骤：

![2019-04-19-DeployVue1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DeployVue1.png)

![2019-04-19-DeployVue2.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DeployVue2.png)

![2019-04-19-DeployVue3.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DeployVue3.png)

![2019-04-19-DeployVue4.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DeployVue4.png)

Note:
1. 其中`选择部署来源`这一步，有两种选择：`软件包`，`构建任务`。前者可选定某一次的发布包，后者可配置总是以最新的(Latest)发布包进行部署；
2. `执行Shell命令`的第一步是先将我们之前发布包进行解压，得到Vue生产环境下所有的静态资源；
3. `执行Shell命令`的第二步是安装依赖：首先配置全局npm包安装路径，接着全局安装`nrm`（注意软连接，这是Linux下全局安装npm包的一个坑），全局安装`pm2`；然后`进入项目目录`，安装依赖，最后由pm2守护启动。

PS: 
`nrm` 全局安装后，可切换npm包的镜像源地址；
`pm2` 全局安装后，可切换npm包的镜像源地址；
`进入项目目录` 指的是一个node.js后端服务项目，实现了静态资源服务器，以及Vue打包项目在生产环境下的跨域，将在下一篇文章中作详细介绍。

部署结果

![2019-04-19-DeployVueResult.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-DeployVueResult.png)

### 流水线

流水线功能可以由我们自定义一套自动执行流程，将前面的：构建、代码检查、部署添加到流水线，可实现一键部署。尤其是在移动端 APP `DevCloud`中，实现远程一键部署功能。

![2019-04-19-PipelineVue.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-PipelineVue.png)

![2019-04-19-AppPipeline.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-19-AppPipeline.jpg)

至此，借助流水线，我们实现了在华为软开云上基于`Vue`的前端项目的一键检查、编译、部署。后续会实现基于`Node.js`的静态资源服务器（生产环境下 Vue 的跨域），敬请期待~


### 后记

- 一点思考

    虽然软开云的思想是希望提升开发、运维的效率，尤其是将运维人员将各类Bash命令、Shell脚本中解放出来，但这其实是对运维人员在Linux应用方面提出了更高的要求。

### Source Code: [Github](https://github.com/heartsuit/devcloud-vue)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
