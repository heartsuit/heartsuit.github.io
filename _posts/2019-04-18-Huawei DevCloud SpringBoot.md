---
layout: post
title: 上手华为软开云DevOps前后端分离实践之-后端SpringBoot
tags: Java
---

### 简介

    华为软开云主要目的是为企业提供一套`DevOps`（即开发运维）的云端解决方案，包括项目管理、代码仓库、编译构建、部署发布、流水线，甚至`CloudIDE`，实现云端的开发与维护。
    这里我们先忽略华为软开云的项目管理功能（`Scrum`，看板里的需求规划、任务指派、工时分配），测试功能，文档管理功能，CloudIDE等；重点关注`项目创建、代码托管、编译构建、部署、发布以及流水线功能`；同时代码仅供示例，重在熟悉软开云的流程。

### 创建项目

主要有两种模板，选择感兴趣的模板，便于项目管理。

- Scrum

增量迭代式开发过程，敏捷开发方法。

- 看板

轻量、灵活和简单的团队协作方法。

![2019-04-18-CreateProject.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-CreateProject.png)

### 代码托管

- 创建仓库

三种方式：普通新建（From Scratch），模板新建，导入仓库（从 Git、SVN 等导入）
这里选择普通新建，建一个空库。

![2019-04-18-CreateRepository.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-CreateRepository.png)

- 选择模板、语言

![2019-04-18-CreateRepositoryTemplate.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-CreateRepositoryTemplate.png)

- 创建 SSH 并上传公钥

![2019-04-18-CreateSSH.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-CreateSSH.png)

![2019-04-18-SSHHelp.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-SSHHelp.png)

![2019-04-18-SSHPublic.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-SSHPublic.png)

通过`git clone repo_url`下载到本地。

- 创建 SpringBoot 模板项目

![2019-04-18-CreateSpringootMaven.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-CreateSpringootMaven.png)

- 后端代码示例

![2019-04-18-BackendCode.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-BackendCode.png)

- push 代码到华为云

![2019-04-18-HuaweiCodehub.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-HuaweiCodehub.png)

### 编译构建

可实时查看构建全量日志

![2019-04-18-BuildBackend1.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-BuildBackend1.png)

![2019-04-18-BuildBackend2.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-BuildBackend2.png)

### 发布包

这里的发布包可以在部署时进行选择

![2019-04-18-ReleasePackage.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-ReleasePackage.png)

### 部署

可实时查看部署全量日志

![2019-04-18-DeployIndex.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-DeployIndex.png)

部署时，因为我们的项目要部署到一个公网可访问的服务器上，需要一个具有公网 IP 的主机组。点击上图中的`创建主机组`，完成主机组的创建后，需要往里添加主机，这时需要一个具有公网 IP 的主机，可以是华为的云主机，也可以是阿里云、腾讯云的主机，只要有公网 IP 即可。这里以华为云的主机为例：

![2019-04-18-ECSInstance.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-ECSInstance.png)

![2019-04-18-IPs.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-IPs.png)

将上述公网 IP 之一与一个主机实例绑定即可。

![2019-04-18-HostGroup.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-HostGroup.png)

部署步骤配置

![2019-04-18-Deploy.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-Deploy.gif)

Note:
其中`选择部署来源`这一步，有两种选择：`软件包`，`构建任务`。前者可选定某一次的发布包，后者可配置总是以最新的(Latest)发布包进行部署。

部署结果
![2019-04-18-DeployResult.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-DeployResult.png)

### 流水线

流水线功能可以由我们自定义一套自动执行流程，将前面的：构建、代码检查、部署添加到流水线，可实现一键部署。尤其是在移动端 APP `DevCloud`中，实现远程一键部署功能。

![2019-04-18-BackendPipeLine.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-BackendPipeLine.png)

![2019-04-18-AppPipeline.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-AppPipeline.jpg)

至此，借助流水线，我们实现了在华为软开云上基于`SpringBoot`的后端项目的一键检查、编译、部署。后续会实现基于`Vue`的前端项目一键部署，敬请期待~

### 效果
![2019-04-18-Appearance.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2019-04-18-Appearance.gif)

### Source Code: [Github](https://github.com/heartsuit/devcloud-springboot)

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**
