---
layout: post
title: LLM大语言模型私有化部署-使用Dify的工作流编排打造专属AI搜索引擎
tags: AI, LLM
---

## 背景

上一篇文章介绍了如何使用 `Ollama` 和 `Dify` 搭建个人 `AI` 助手。首先通过 `Ollama` 私有化部署了 `Qwen2.5 (7B)` 模型，然后使用 `Docker Compose` 一键部署了 `Dify` 社区版平台。在 `Dify` 平台上，通过**普通编排**的方式，创建了基于 `Qwen2.5` 模型的聊天助手，并添加了个人知识库作为上下文，实现了真正的个人助手功能。

今天我们使用 `Dify` 提供的**工作流编排**以及 `Dify` 自带的 `Tavily Search` 搜索工具、 `LLM` 模型 `Qwen2.5 (7B)` 模型实现自己的**AI搜索引擎**。

## 打造自己专属的AI搜索引擎

### 新建工作流编排聊天助手

新建一个“聊天助手”类型的应用，编排方法选择“工作流编排”。

![2024-12-22-1-NewApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-1-NewApp.jpg)

### 生成默认布局

进入编排页面之后，默认生成了一个带有开始和介绍节点，中间有个 `LLM` 的节点（自动选择了我们的默认模型 `Qwen2.5` ）的默认布局，这就相当于工作流版的基础个人助手。

![2024-12-22-2-DefaultLayout.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-2-DefaultLayout.jpg)

### 添加Tavily Search搜索工具节点

在 `LLM` 节点前面，增加一个搜索工具节点（通过前一个节点的 `+` ，在弹窗里的“工具”Tab下找到搜索工具），这里选择 `Tavily Search` 。

![2024-12-22-3-TavilySearch.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-3-TavilySearch.jpg)

### 注册获取Tavily Search授权

`Tavily Search` 需要授权后才能使用，通过“如何获取”超链接跳转到 `Tavily Search` 官方进行注册登录，我这里使用 `GitHub` 账号直接登录，之后可以获取到一个 `API Key` ，一个月有1000的免费次数。

![2024-12-22-4-Login.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-4-Login.jpg)

![2024-12-22-5-TavilyKey.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-5-TavilyKey.jpg)

![2024-12-22-6-APIKey.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-6-APIKey.jpg)

### 配置Tavily Search搜索工具节点输入

作为搜索引擎， `Tavily Search` 需要接收用户的输入（sys.query）作为参数，最后将结果（text）返回。

Note：输入、输出参数可以通过输入 `/` 进行选择。

![2024-12-22-7-Input.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-7-Input.jpg)

### 配置LLM节点的系统提示词

在LLM节点，键入/选择 `Tavily Search` 的输出 `text` ，编辑系统提示词 `Prompt` ：

> 根据搜索引擎返回的结果：{{#1734574383345.text#}}，回答用户问题。

![2024-12-22-8-System.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-8-System.jpg)

![2024-12-22-9-Prompt.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-9-Prompt.jpg)

通过上述步骤，一个简版 `AI` 搜索引擎搭建完毕，我们进行**预览**测试：输入问题“看下Black Forest Labs的最新消息”。

![2024-12-22-10-Test.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-10-Test.jpg)

### 查看对话日志

在回答处有个“查看日志”按钮，点击查看详细的对话日志。

![2024-12-22-11-Log.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-11-Log.jpg)

而且可以对每个节点进行跟踪记录查看，包含了每一步的输入与输出，方便调试。

![2024-12-22-12-Trace.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-12-Trace.jpg)

### 问几个新闻问题试试

我问了近期发生的事情，可以看到这个 `AI` 助手基本都看可以正常回答。

1. 微信可以送礼物了？
2. 人贩子余华英重审二审什么结果？

![2024-12-22-16-News.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-16-News.jpg)

## 遇到的问题

### 大模型无法成功应用搜索引擎返回的信息

当我问了“今天太原天气怎样”的问题后，最后竟然返回：很抱歉，作为人工智能，我无法提供实时信息。。

![2024-12-22-13-WeatherProblem.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-13-WeatherProblem.jpg)

什么？我专门给你配了可以联网的搜索引擎，你跟我说**无法提供实时信息**？？

经过节点跟踪排查之后，我发现，其实 `Tavily Search` 搜索工具节点已经查到了相关信息，但是到了 `LLM` 节点，并没有真正使用到搜索引擎的返回信息。

经过分析之后，我尝试在 `LLM` 节点增加了上下文，并修改了系统提示词：

> 根据后面这部分内容：{{#context#}}，来回答用户问题

再次尝试相同的问题，看模型如何回答。这次成功回复了我们问题。

![2024-12-22-14-UpdatePrompt.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-14-UpdatePrompt.jpg)

### 大模型不能很好地理解相对时间，eg: 今天、昨天

上面对于天气情况的回答，看似没问题，其实多问几次就会发现，模型不能很好地理解相对时间，eg: 今天、昨天、去年。这个问题可以通过 `Dify` 提供的 `Time` 相关工具，再借助 `Dify` 的智能体 `Agent` 来解决，目前我还没有进行验证。

![2024-12-22-15-Today.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-15-Today.jpg)

### 其他功能

其他功能，诸如**对话开场白**、**下一步问题建议**以及**内容审查功能**可以根据自己的需求进行发挥。

![2024-12-22-17-Other.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-17-Other.jpg)

## 小总结

本文通过组合 `Dify` 的工作流编排、 `Tavily Search` 搜索引擎工具以及 `Qwen2.5` 模型，成功实现了一个能够回答实时问题的 `AI` 搜索引擎，步骤详细，极具可操作性。后续想办法解决模型对相对时间（今天、昨天、去年等）的理解存在局限性。这个 `AI` 搜索引擎能够回答一些实时新闻和事件相关的问题，展示了 `Dify` 工作流编排功能的便捷性、实用性。

## Reference

* [http://difyai.com/](http://difyai.com/)
* [https://github.com/langgenius/dify](https://github.com/langgenius/dify)
* [https://docs.dify.ai/zh-hans](https://docs.dify.ai/zh-hans)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
