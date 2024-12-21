---
layout: post
title: LLM大语言模型私有化部署-使用Dify的Agent与Flux.1打造专属文生图智能体
tags: AI, LLM
---

## 背景

上一篇文章介绍了使用 `Dify` 提供的**工作流编排**以及 `Dify` 自带的 `Tavily Search` 搜索工具、 `LLM` 模型 `Qwen2.5 (7B)` 模型实现自己专属的**AI搜索引擎**。

今天我们来体验下 `Dify` 提供的**Agent智能体**功能，结合 `LLM` 模型 `Qwen2.5 (7B)`，同时利用外部工具 `Flux.1` （文生图的“新王”）实现自己专属的**文生图智能体**，其中， `LLM` 充当了 `智能体（Agent）` 的大脑。先看生图效果：

<div align="center">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-1.png" alt="Flux1" width="230" style="margin-right: 10px;">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-2.png" alt="Flux2" width="230" style="margin-right: 10px;">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-3.png" alt="Flux3" width="230" style="margin-right: 10px;">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-4.png" alt="Flux4" width="230">
</div>

* 什么是智能体？

> 智能体（Agent）是一种自动推理和决策引擎。智能体（Agent） = 大语言模型的推理能力 + 使用工具行动的能力。

* 智能体有哪些优势？

`智能体（Agent）` 利用大语言模型的推理能力，能够自主对复杂的人类任务进行目标规划、任务拆解、工具调用、过程迭代，并在没有人类干预的情况下完成任务。 `智能体（Agent）` 的优势在于其能自动执行复杂任务，大幅提升自动化和智能决策的效率； `智能体（Agent）` 工作原理主要是四个步骤：包括感知、记忆、规划与决策、行动/使用工具。

下面要实现的**文生图智能体**，便是用到了以下两个核心要素：
1. LLM大语言模型：Qwen2.5 (7B)
2. 文生图工具：SiliconFlow的FLUX.1-schnell

作为体验，本次的智能体仅仅用到了一个文生图工具、一个 `LLM` 模型以及一段提示词，便可以完成复杂的推理、翻译、转换、工具使用、模型选择、指令遵循以及响应生成的完整过程。

<div align="center">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-a.png" alt="Flux1" width="230" style="margin-right: 10px;">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-b.png" alt="Flux2" width="230" style="margin-right: 10px;">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-c.png" alt="Flux3" width="230" style="margin-right: 10px;">
    <img src="https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-d.png" alt="Flux4" width="230">
</div>

## 打造自己专属的文生图智能体

### 新建Agent类型的应用

在 `Dify` 的工作室中，新建一个“Agent”类型的应用。

![2024-12-22-4-CreateAgentApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-4-CreateAgentApp.jpg)

### 添加Flux工具

在工具处，点击添加，在右侧弹框中选择图片中的 `SiliconFlow` 硅基流动下的 `Flux` 工具（授权后使用）。

![2024-12-22-5-AddFlux.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-5-AddFlux.jpg)

### 注册获取SiliconFlow授权

* API Key
`SiliconFlow` 需要授权后才能使用，通过“如何获取”超链接跳转到 `SiliconFlow` 官方进行注册登录，我这里使用手机号注册登录，之后可以获取到一个 `API Key` 。

![2024-12-22-1-SiliconFlowKey.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-1-SiliconFlowKey.jpg)

* 模型广场

左侧选择“生图”过滤选项，里面有个 `black-forest-labs/FLUX.1-schnell` ，即： `FLUX.1` ，这是由黑森林（Black Forest Labs）实验室发布的**文生图**模型，包含三个不同的版本，分别是 `Pro` （专业版）、 `Dev` （开发版）、 `Schnell` （本地个人使用版，免费）。我们选择 `Schnell` 这个免费版， `Schnell` 在德语里意为“快速”，是个蒸馏过的四步生成模型，也是迄今为止最先进的少步生成模型，专为本地开发和个人使用量身定制。 `FLUX.1-schnell` 在 `Apache2.0` 许可下公开使用。

![2024-12-22-2-SiliconFlowFlux.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-2-SiliconFlowFlux.jpg)

* 在线体验

可以直接在硅基流动官网上进行在线体验，生成效率2-3秒。

![2024-12-22-3-Try.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-3-Try.jpg)

上图的提示词如下：

> In a vast, boundless desert, a female warrior stands at the center of the composition. Her figure contrasts sharply with the endless sand dunes, dressed in futuristic, post-apocalyptic armor adorned with sci-fi elements. She turns her head towards the camera, her gaze deep and mysterious, as if concealing a secret. The style of the artwork is inspired by the film Dune, evoking a sense of desolation and future aesthetics. The desert sky is painted in soft hues, with the distant dunes glistening in golden light. The overall tone of the piece is composed and powerful.

### 编写Agent提示词

* 使用官方的提示词

参考[官方文档：SiliconFlow (支持Flux绘图)](https://docs.dify.ai/zh-hans/guides/tools/tool-configuration/siliconflow)中的提示词，对工具进行配置：

> 你是一个绘图提示词作家，用户给你想要的图片需求，请你补全提示词并使用flux绘图。

* 文生图体验

文生图需求：

> 一只狗看着镜子，发现镜子里的倒影是一匹狼，高分辨率摄影作品，高细节、逼真，场景温馨。

![2024-12-22-6-DefaultPrompt.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-6-DefaultPrompt.jpg)

Note：显然，上述结果不尽人意，稍微分析下得出了推论：像 `Flux.1` 这种长在国外的模型，对于中文的处理差强人意；因此，我们需要提示智能体将用户的中文输入转换为对应的英文。

### 重新编写Agent提示词

* 修改Agent提示词如下

```markdown
根据用户输入
- 生成给图像生成工具{{siliconflow flux}}的参数：提示词，对提示词的要求：从对话记录中找到和图片生成相关的词汇，生成给Stable Diffusion等图片生成模型的英文提示词；
- 获取生成图像的URL，直接展示图像。
```

使用与上次文生图相同的需求再次生成，效果还行。

![2024-12-22-7-FluxDemo1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-7-FluxDemo1.jpg)

### 换其他的文生图场景试试

* 一个6岁的中国小女孩和她3岁的妹妹，正在跟一只小猫在家里开心地玩耍。

![2024-12-22-7-FluxDemo2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-7-FluxDemo2.jpg)

* 武侠场景，一位风度翩翩的侠士，正与暴徒们飞逐与宝塔与寺庙之间，刀光剑影，大片级。

![2024-12-22-7-FluxDemo3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-7-FluxDemo3.jpg)

* 赛博朋克风格，两个年轻的计算机高手，成功攻破五角大楼的信息系统。

![2024-12-22-7-FluxDemo4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-7-FluxDemo4.jpg)

## Agent默认配置

### ReAct

这里使用默认的 `ReAct` 推理模式，`ReAct` 结合了推理和行动，旨在使 `LLM` 能够通过在一系列步骤（重复N次）之间交错来解决复杂的任务： `Thought` ， `Action` 和 `Observation` 。

> ReAct：Reasoning + Acting with LLMs

![2024-12-22-8-Agent.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-8-Agent.jpg)

### 提示词

直接采用 `Dify` 中 `Agent` 默认的提示词，完整内容如下：

```
Respond to the human as helpfully and accurately as possible.

  {{instruction}}

  You have access to the following tools:
  {{tools}}
  Use a json blob to specify a tool by providing an {{TOOL_NAME_KEY}} key (tool name) and an {{ACTION_INPUT_KEY}} key (tool input).
  Valid "{{TOOL_NAME_KEY}}" values: "Final Answer" or {{tool_names}}

  Provide only ONE action per $JSON_BLOB, as shown:

  ``
  {
    "{{TOOL_NAME_KEY}}": $TOOL_NAME,
    "{{ACTION_INPUT_KEY}}": $ACTION_INPUT
  }
  ``

  Follow this format:
  Question: input question to answer
  Thought: consider previous and subsequent steps
  Action:

  ``
  $JSON_BLOB
  ``
  
  Observation: action result
  ... (repeat Thought/Action/Observation N times)
  Thought: I know what to respond
  Action:

  ``
  {
    "{{TOOL_NAME_KEY}}": "Final Answer",
    "{{ACTION_INPUT_KEY}}": "Final response to human"
  }
  ``

  Begin! Reminder to ALWAYS respond with a valid json blob of a single action. Use tools if necessary. Respond directly if appropriate. Format is Action:` `  $JSON_BLOB  ` `then Observation:.
```

## 遇到的问题

### 文生图工具: SiliconFlow的FLUX.1-schnell无法准确识别中文内容

当我问了关于中文古诗相关内容的问题后，无法重复利用提供的**中文细节内容**来生成让人满意的图像。eg：

* 语文课堂上，黑板上写着： 春江潮水连海平，海上明月共潮生。语文老师正给同学们讲解号称“孤篇压全唐”的中国古诗：张若虚的《春江花月夜》。

![2024-12-22-9-Bad.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-22-9-Bad.jpg)

## 小总结

这篇文章主要介绍了如何使用 `Dify` 平台结合 `Qwen2.5(7B)` 模型和 `Flux.1` 文生图工具，打造一个专属的文生图智能体（Agent），实现了中文输入到高质量图片生成的功能。文章详细说明了从创建应用、配置工具、编写提示词到实际使用的完整流程，并展示了多个成功的文生图示例。
主要技术要点：
1. 使用Dify的Agent功能作为基础框架
2. 集成SiliconFlow的FLUX.1-schnell作为文生图工具
3. 使用Qwen2.5(7B)作为LLM模型

通过优化提示词实现中英文转换，提升生图质量，这个方案的特点是搭建简单，使用方便，能够将用户的中文描述准确转换为英文提示词，并生成高质量的图片。

## Reference

* [http://difyai.com/](http://difyai.com/)
* [https://github.com/langgenius/dify](https://github.com/langgenius/dify)
* [https://docs.dify.ai/zh-hans](https://docs.dify.ai/zh-hans)
* [https://docs.dify.ai/zh-hans/guides/tools/tool-configuration/siliconflow](https://docs.dify.ai/zh-hans/guides/tools/tool-configuration/siliconflow)
* [https://cloud.siliconflow.cn/account/ak](https://cloud.siliconflow.cn/account/ak)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
