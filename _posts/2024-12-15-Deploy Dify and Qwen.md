---
layout: post
title: LLM大语言模型私有化部署-OpenEuler22.03SP3上容器化部署Dify与Qwen2.5
tags: AI, LLM
---

## 背景

`Dify` 是一款开源的大语言模型(LLM) 应用开发平台。其直观的界面结合了 `AI` 工作流、 `RAG` 管道、 `Agent` 、模型管理、可观测性功能等，让您可以快速从原型到生产。相比 `LangChain` 这类有着锤子、钉子的工具箱开发库， `Dify` 提供了更接近生产需要的完整方案，而且，可以作为 `Coze` 的开源平替。

> Dify一词源自Define + Modify，意指定义并且持续的改进你的AI应用，它是为你而做的（Do it for you）。

上一篇我们使用 `Ollama` 私有化部署了一个2G大小的模型： `llama3.2` （3B），本篇文章先用 `Ollama` 私有化部署 `Qwen2.5` （7B）模型，方便后续使用 `Dify` 进行中文知识库的理解；接着进行私有化部署 `Dify` 社区版，快速搭建一个聊天助手；最后结合本地知识库作为 `Dify` 上下文实现真正的个人助手。

## 虚机资源

共用到了1台虚机，纯CPU运行，较慢😢

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| llm  | 192.168.44.170 | llm节点 |

基本选用当前最新版本：
* Ollama版本：v0.4.7
* Qwen版本：2.5

## 系统环境

```bash
[root@llm ~]# uname -a
Linux llm 5.10.0-182.0.0.95.oe2203sp3.x86_64 #1 SMP Sat Dec 30 13:10:36 CST 2023 x86_64 x86_64 x86_64 GNU/Linux
[root@llm ~]# cat /proc/version
Linux version 5.10.0-182.0.0.95.oe2203sp3.x86_64 (root@dc-64g.compass-ci) (gcc_old (GCC) 10.3.1, GNU ld (GNU Binutils) 2.37) #1 SMP Sat Dec 30 13:10:36 CST 2023
```

## Docker镜像加速

为了确保可以成功下载到镜像，以下配置了国内目前可以使用的 `Docker` 镜像源地址： `vi /etc/docker/daemon.json` 。

```json
{
    "registry-mirrors": [
        "https://docker.hpcloud.cloud",
        "https://docker.m.daocloud.io",
        "https://docker.unsee.tech",
        "https://docker.1panel.live",
        "http://mirrors.ustc.edu.cn",
        "https://docker.chenby.cn",
        "http://mirror.azure.cn",
        "https://dockerpull.org",
        "https://dockerhub.icu",
        "https://hub.rat.dev",
        "https://dockerpull.com",
        "https://docker.hpcloud.cloud",
        "https://docker.m.daocloud.io"
    ]
}
```

修改保存之后，记得重启 `docker` 服务。

```bash
systemctl daemon-reload
systemctl restart docker
```

## 私有化部署Qwen2.5模型

通过 `Ollama` 直接拉取部署 `Qwen2.5` （7B）模型。

### 容器化部署Qwen2.5

```bash
# 拉取qwen2.5:7b
[root@llm ~]# docker exec -it ollama ollama run qwen2.5:7b
pulling manifest 
pulling 2bada8a74506... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏ 4.7 GB
pulling 66b9ea09bd5b... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏   68 B
pulling eb4402837c78... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏ 1.5 KB
pulling 832dd9e00a68... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏  11 KB
pulling 2f15b3218f05... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏  487 B
verifying sha256 digest 
writing manifest 
success 
>>> who r u?
I\'m Qwen, an AI assistant created by Alibaba Cloud. I exist to provide information, answer questions, and assist with various tasks. How can I help 
you today?
[root@llm ollama]# docker exec -it ollama ollama list
NAME               ID              SIZE      MODIFIED       
qwen2.5:7b         845dbda0ea48    4.7 GB    16 minutes ago    
llama3.2:latest    a80c4f17acd5    2.0 GB    8 days ago    
```

### ollama常用命令

```bash
[root@llm docker]# docker exec -it ollama ollama -h
Large language model runner

Usage:
  ollama [flags]
  ollama [command]

Available Commands:
  serve       Start ollama
  create      Create a model from a Modelfile
  show        Show information for a model
  run         Run a model
  stop        Stop a running model
  pull        Pull a model from a registry
  push        Push a model to a registry
  list        List models
  ps          List running models
  cp          Copy a model
  rm          Remove a model
  help        Help about any command

Flags:
  -h, --help      help for ollama
  -v, --version   Show version information

Use "ollama [command] --help" for more information about a command.
```

## 部署Dify

`Dify` 官方的体验地址提供了一定的免费额度，知识库支持上传50个文档， `RAG` 向量空间只有5MB。不过还是建议稍微折腾一下，进行本地部署，一方面不用付费，另外数据安全也有保障。

### 容器化部署Dify

从GitHub上 `https://github.com/langgenius/dify` 下载 `Dify` 社区版源码。进入 `./dify-main/docker` 目录，直接执行 `docker-compose up -d` 命令一键启动 `Dify` 用到的所有容器。

Note：
1. Dify默认要用到80和443端口，我这里是一台干净的新虚机，没有启动其他服务，所以直接启动了，如果你的80或者其他端口被占用，可通过.env环境变量进行更改。
2. 如果没有镜像，第一次启动过程会很慢，因为要到远程拉取镜像，等等吧，实际共下载了8个镜像，9个容器。

```bash
# 启动服务
[root@llm docker]# docker-compose up -d
...
Creating docker_redis_1      ... done
Creating docker_ssrf_proxy_1 ... done
Creating docker_sandbox_1    ... done
Creating docker_web_1        ... done
Creating docker_db_1         ... done
Creating docker_weaviate_1   ... done
Creating docker_worker_1     ... done
Creating docker_api_1        ... done
Creating docker_nginx_1      ... done

# 查看镜像
[root@llm docker]# docker images
REPOSITORY                                           TAG         IMAGE ID       CREATED         SIZE
ghcr.io/open-webui/open-webui                        main        065a36698c69   12 days ago     4.22GB
ollama/ollama                                        latest      a8316b7b7fcd   13 days ago     4.65GB
nginx                                                latest      66f8bdd3810c   2 weeks ago     192MB
postgres                                             15-alpine   933581caa3e7   3 weeks ago     248MB
langgenius/dify-web                                  0.11.2      c26e830052b6   3 weeks ago     348MB
langgenius/dify-api                                  0.11.2      de697455d474   3 weeks ago     2.93GB
langgenius/dify-sandbox                              0.2.10      4328059557e8   8 weeks ago     567MB
redis                                                6-alpine    4100b5bd1743   2 months ago    35.5MB
ubuntu/squid                                         latest      87507c4542d0   3 months ago    242MB
semitechnologies/weaviate                            1.19.0      8ec9f084ab23   19 months ago   52.5MB
```

### 验证Dify安装

浏览器访问： `http://192.168.44.170` 打开 `Dify` 页面。

* 首先需要设置用户账号信息创建管理员账号

![2024-12-15-1-DifyAdmin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-1-DifyAdmin.jpg)

* 登录成功后，进入首页

![2024-12-15-3-Home.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-3-Home.jpg)

## 构建聊天助手

* 创建应用

类型选择最简单的聊天助手，基础编排。

![2024-12-15-4-CreateApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-4-CreateApp.jpg)

* 添加大模型

支持主流的模型托管服务商，OpenAI、Anthropic以及Ollama等；这里选择我们刚下载的Qwen2.5模型。

![2024-12-15-5-AddModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-5-AddModel.jpg)

Note：在输入模型名称，点击保存时，会有一个调用远程模型API是否可用的校验过程，稍微会卡顿一下；如果添加失败，说明无法访问到模型的API。

* 选择模型

![2024-12-15-6-SelectModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-6-SelectModel.jpg)

* 测试模型

![2024-12-15-7-TestModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-7-TestModel.jpg)

* 对话交互

![2024-12-15-8-Chat.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-8-Chat.jpg)

## 构建个人知识库

大语言模型的训练数据一般基于公开的数据，且每一次训练需要消耗大量算力，这意味着模型的知识一般不会包含私有领域的知识，同时在公开知识领域存在一定的滞后性。为了解决这一问题，目前通用的方案是采用 `RAG` （检索增强生成）技术，使用用户问题来匹配最相关的外部数据，将检索到的相关内容召回后作为模型提示词的上下文来重新组织回复。

这里我选择之前写的关于数据集成工具 `ETLCloud` 的系列文章( `PDF` 格式)作为知识库素材。

Note: 当前 `Dify` 的知识库支持以下格式的文件：
1. 长文本内容（TXT、Markdown、DOCX、HTML、JSONL 甚至是 PDF 文件）
2. 结构化数据（CSV、Excel 等）

* 选择数据源

![2024-12-15-9-Knowledge1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-9-Knowledge1.jpg)

* 文本分段与清洗

![2024-12-15-9-Knowledge2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-9-Knowledge2.jpg)

* 处理并完成

![2024-12-15-9-Knowledge3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-9-Knowledge3.jpg)

* 添加知识库作为聊天助手的上下文

![2024-12-15-9-Knowledge4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-9-Knowledge4.jpg)

* 询问知识库相关内容

![2024-12-15-10-Knowlege.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-15-10-Knowlege.jpg)

Note: 
1. 打完收工，个人知识库小助手成功上线啦！
2. 每次的回答输出还提供了参考文档，贴心~

## 离线部署

实际生产环境，有时候没有互联网环境，需要进行离线部署。

### 导出/导入镜像tar包

先将前面在可以连接互联网的主机上下载的镜像保存导出为tar包。

```
docker save langgenius/dify-web:0.11.2 -o dify-web.tar
docker save langgenius/dify-api:0.11.2 -o dify-api.tar
docker save langgenius/dify-sandbox:0.2.10 -o dify-sandbox.tar
docker save nginx:latest -o nginx.tar
docker save postgres:15-alpine -o postgres.tar
docker save redis:6-alpine -o redis.tar
docker save ubuntu/squid:latest -o squid.tar
docker save semitechnologies/weaviate:1.19.0 -o weaviate.tar
```

然后在需要进行离线部署的主机上执行以下命令加载镜像。

```
docker load -i dify-web.tar
docker load -i dify-api.tar
docker load -i dify-sandbox.tar
docker load -i nginx.tar
docker load -i postgres.tar
docker load -i redis.tar
docker load -i squid.tar
docker load -i weaviate.tar
```

### 模型迁移

比如将我们已下载的 `llama3.2` 、 `Qwen2.5` 模型迁移到离线主机上：将模型文件目录 `models` （这里是 `/opt/ollama/models` ）拷贝到目标离线主机的对应目录即可。

## 小总结

文章主要介绍了如何使用 `Ollama` 和 `Dify` 搭建个人 `AI` 助手。首先通过 `Ollama` 私有化部署了 `Qwen2.5 (7B)` 模型，然后使用 `Docker Compose` 一键部署了 `Dify` 社区版平台。在 `Dify` 平台上，创建了基于 `Qwen2.5` 模型的聊天助手，并添加了个人知识库作为上下文，实现了真正的个人助手功能。文章最后还介绍了离线部署方案，包括如何导出/导入 `Docker` 镜像和迁移模型文件，方便在无互联网环境下部署使用。整个过程展示了从模型部署到应用构建的完整流程，为搭建私有化 `AI` 助手提供了实践指导。

## Reference

* [http://difyai.com/](http://difyai.com/)
* [https://github.com/langgenius/dify](https://github.com/langgenius/dify)
* [https://docs.dify.ai/zh-hans](https://docs.dify.ai/zh-hans)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
