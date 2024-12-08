---
layout: post
title: LLM大语言模型私有化部署-OpenEuler22.03SP3上容器化部署Ollama与OpenWebUI
tags: AI, LLM
---

## 背景

你是不是也有私有化部署大模型的需求？如今有了 `Ollama` ， `HuggingFace` ， `ModelScope` 等开源平台，我们可以非常方便地搭建一个属于自己的大模型，如果网速给力，真是分分钟~~。简单起见，这篇文章仅用到了 `Ollama` 官方提供的一个2G大小的模型： `llama3.2` （3B），后续还可以私有化部署通义千问（Qwen）、智谱AI（glm）等知名大模型。

![2024-12-08-1-OllamaVersion.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-08-1-OllamaVersion.jpg)

`Ollama` 是一个开源的人工智能平台，旨在提供高效的多模态人工智能应用体验，尤其是在自然语言处理（NLP）和生成型 `AI` 领域。 `Ollama` 的设计初衷是简化 `AI` 模型的部署和使用，尤其是在资源限制的环境下，使得开发者和普通用户能够方便地与先进的 `AI` 模型进行交互。

`Open WebUI` 是一个开源项目，旨在为用户提供一个简洁易用的 `Web` 界面，以便更方便地访问和管理基于人工智能模型（如语言模型、图像生成模型等）的应用，可用于简化和增强 `AI` 模型的使用体验，使非技术用户也能通过浏览器访问 `AI` 的功能。

## 虚机资源

共用到了1台虚机，纯CPU运行，较慢😢

| 主机名      | IP      | 说明 |
| ---------- | ------- | ------- |
| llm  | 192.168.44.170 | llm节点 |

基本选用当前最新版本（只是更新实在太快，我看官方在本周又更新了两版，到了v0.5.1了），下面我们即将安装的 `Ollama` 和 `Open WebUI` 版本信息如下：
* Ollama版本：v0.4.7
* Open WebUI版本：v0.4.7

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

## 部署ollama

### 容器化部署ollama

```bash
# 拉取最新版镜像
[root@llm ollama]# docker pull ollama/ollama
Using default tag: latest
latest: Pulling from ollama/ollama
latest: Pulling from ollama/ollama
6414378b6477: Waiting 
6414378b6477: Pull complete 
df76d75f4799: Pull complete 
6762aa72c60e: Pull complete 
baf3ada369b3: Pull complete 
Digest: sha256:55977eb618082df0f81ea197a75dc1710e54524f2ef71fa1a8b83cc0148b6e2f
Status: Downloaded newer image for ollama/ollama:latest
docker.io/ollama/ollama:latest

# 查看拉取成功的镜像
[root@llm ollama]# docker images
REPOSITORY                                           TAG         IMAGE ID       CREATED         SIZE
ollama/ollama                                        latest      a8316b7b7fcd   35 hours ago    4.65GB

# 挂载目录、指定端口启动
[root@llm ollama]# docker run -d -v /opt/ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### 验证ollama安装

通过 `ollama run` 命令运行模型后，我们可以通过命令行交互的方式来跟模型进行交互，我这里问了几个简单问题。

```
# 一开始，还没有模型
[root@llm ollama]# docker exec -it ollama ollama list
NAME    ID    SIZE    MODIFIED 

[root@llm ollama]# docker exec -it ollama ollama run llama3.2
pulling manifest 
pulling dde5aa3fc5ff... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏ 2.0 GB
pulling 966de95ca8a6... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏ 1.4 KB
pulling fcc5a6bec9da... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏ 7.7 KB
pulling a70ff7e570d9... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏ 6.0 KB
pulling 56bb8bd477a5... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏   96 B
pulling 34bb5ab01051... 100% ▕███████████████████████████████████████████████████████████████████████████████████████████▏  561 B
verifying sha256 digest 
writing manifest 
success 
>>> hi
How can I assist you today?

>>> who are you?
I'm an AI assistant, which means I'm a computer program designed to simulate human-like conversations and answer questions to the best of my 
knowledge. My purpose is to provide information, help with tasks, and engage in discussions.

I don't have a personal identity or emotions like humans do, but I'm here to assist you and make your interactions more enjoyable and informative. 
What would you like to talk about?

>>> who r u?
I'm an artificial intelligence model known as Llama. Llama stands for "Large Language Model Meta AI."

>>> 你会说中文吗？
是的，我可以说一些中文。虽然我不是出生在中国，我的Training数据包含了大量的中文文本，从而使我能够理解和生成中文。 however，我的中文能力可能不如native 
chinese speaker，这样我可能会犯些错误或者无法完全准确地表达某些概念。

>>> 你了解ElasticSearch的分词器吗？
当然！（I know！）ElasticSearch使用的默认分词器是Nutch的分词器，后来被改为SIEGE和Moses。然而，用户可以根据自己的需要选择不同的分词器。

在ElasticSearch 7.x及以上版本中，可以使用以下几种分词器：

1. `ik`: Chinese分词器，适用于中文文档。
2. `spanish`: Spanish分词器，适用于西班牙语文档。
3. `english`: English分词器，适用于英文文档（Nutch的默认分词器）。
4. `german`: German分词器，适用于德语文档。
5. `danish`: Danish分词器，适用于丹麦语文档。
6. `portuguese`: Portuguese分词器，适用于葡萄牙语文档。

用户可以在ElasticSearch的`analysis`中指定使用哪种分词器：

{
  "analysis": {
    "analyzer": {
      "my_analyzer": {
        "type": "custom",
        "tokenizer": "ik",
        "filter": ["lowercase", "asciifolding"]
      }
    },
    "tokenizer": {
      "my_tokenizer": {
        "type": "ik"
      }
    },
    "filter": {
      "my_filter": {
        "type": "asciifolding"
      }
    }
  }
}
在这种设置中，`my_analyzer`使用 `ik` 分词器，结合 `lowercase` 和 `asciifolding` 过滤器。
```

Note: Ctrl+D退出命令行交互聊天。。

### ollama常用命令

```bash
# 查看ollama版本信息
[root@llm ollama]# docker exec -it ollama ollama -v
ollama version is 0.4.7

# 查看已下载的大模型
[root@llm ollama]# docker exec -it ollama ollama list
NAME               ID              SIZE      MODIFIED      
llama3.2:latest    a80c4f17acd5    2.0 GB    6 minutes ago 

# 查看正在运行的模型
[root@llm ollama]# docker exec -it ollama ollama ps
NAME               ID              SIZE      PROCESSOR    UNTIL              
llama3.2:latest    a80c4f17acd5    3.5 GB    100% CPU     4 minutes from now

# 查看指定的模型信息
[root@llm ollama]# docker exec -it ollama ollama show llama3.2:latest
  Model
    architecture        llama     
    parameters          3.2B      
    context length      131072    
    embedding length    3072      
    quantization        Q4_K_M    

  Parameters
    stop    "<|start_header_id|>"    
    stop    "<|end_header_id|>"      
    stop    "<|eot_id|>"             

  License
    LLAMA 3.2 COMMUNITY LICENSE AGREEMENT                 
    Llama 3.2 Version Release Date: September 25, 2024
```

## 部署OpenWebUI

### 容器化部署OpenWebUI

```bash
[root@llm ollama]# docker run -d -e HF_ENDPOINT=https://hf-mirror.com -p 8080:8080 --add-host=host.docker.internal:host-gateway -v /opt/open-webui:/app/backend/data --name open-webui --restart always ghcr.io/open-webui/open-webui:main
```

Note：如果遇到了连接超时问题，可以添加镜像 `HuggingFace` 端点环境变量。

### 验证OpenWebUI安装

浏览器访问：http://192.168.44.170:8080打开 `Open WebUI` 页面。

* 首先需要设置用户账号信息创建管理员账号

![2024-12-08-2-WebUIAdmin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-08-2-WebUIAdmin.jpg)

* 登录成功后，进入首页

![2024-12-08-3-WebUIHome.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-08-3-WebUIHome.jpg)

* 选择大模型

![2024-12-08-4-WebUIModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-08-4-WebUIModel.jpg)

* 对话交互

![2024-12-08-5-WebUIChat1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-08-5-WebUIChat1.jpg)

![2024-12-08-6-WebUIChat2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-08-6-WebUIChat2.jpg)

## 小总结

上述内容介绍了如何使用 `Ollama` 和 `Open WebUI` 搭建私有化大模型部署环境。文章首先介绍了在一台纯 `CPU` 的虚拟机上（IP：192.168.44.170）部署 `Ollama v0.4.7` ，通过 `Docker` 容器化部署并配置国内镜像源加速。部署完成后，使用 `llama3.2` （3B）模型进行了命令行交互测试，验证了包括中文在内的基本对话功能。接着部署了 `Open WebUI v0.4.7` 作为 `Web` 交互界面，通过浏览器访问 `8080` 端口，创建管理员账号后即可进行可视化的模型对话。整个部署过程简单直观，为用户提供了一个便捷的私有化大模型解决方案。

## Reference

* [https://ollama.com/](https://ollama.com/)
* [https://github.com/ollama/ollama/releases](https://github.com/ollama/ollama/releases)
* [https://github.com/ollama/ollama/blob/main/docs/docker.md](https://github.com/ollama/ollama/blob/main/docs/docker.md)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
