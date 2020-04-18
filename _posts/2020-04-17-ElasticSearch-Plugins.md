---
layout: post
title: ElasticSearch入门（四）常用插件：Head插件与ik分词器
tags: ElasticSearch
---

### 背景

简单介绍两个常用插件：
1. ES可视化的Web插件：`elasticsearch-head`
2. 中文分词友好的分词器：`elasticsearch-analysis-ik`

先跑起来再说。

### elasticsearch-head

1. 在`Github`上搜索下载安装`elasticsearch-head`，并解压；
2. 安装依赖：`npm install`；
3. 启动：`npm run start`，访问 http://localhost:9100。

- Problem:
若未配置ElasticSearch的跨域，此时访问`http://localhost:9100`报错：

> 已拦截跨源请求：同源策略禁止读取位于 http://localhost:9200/_all 的远程资源。（原因：CORS 头缺少 'Access-Control-Allow-Origin'）。

- Solution:
开启ES跨域：编辑配置文件`config/elasticsearch.yml`，在最后添加

```yml
http.cors.enabled: true
http.cors.allow-origin: "*"
```

重新启动ES，再次访问`http://localhost:9100`，点击连接，结果如下图所示，可以看到当前有两个索引。

![2020-04-17-ES-Head.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-Head.png)

`elasticsearch-head`，作为ES的数据可视化客户端，主要的几个菜单包括：概览、索引、数据浏览、基本查询、符合查询等。在上一篇文章中，我们用到了数据浏览下的索引查看功能。

### elasticsearch-analysis-ik

- ES自带的分词器

ES内置的分词器有：standard, simple, whitespace, stop, language等，这种外国人搞的，对英文的支持自不必说，看个例子吧：

![2020-04-17-ES-English.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-English.png)

但是，当遇到中文时，懵逼了。。

![2020-04-17-ES-Chinese.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-Chinese.png)

- 第三方：ik分词器

1. 下载

在`Github`上搜索中文分词器：`elasticsearch-analysis-ik`，这里用的版本与ES版本一致：7.5.2。

https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.5.2/elasticsearch-analysis-ik-7.5.2.zip

2. 安装

解压至`elasticsearch-7.5.2\plugins\ik`目录，`ik`这个目录可以自定义名称，不用配置其他的文件，**重启ES**。

记得重启ES，如果没有重启，则会报错：

![2020-04-17-ES-Error.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-Error.png)

下图为重启后，控制台的输出，可以看到加载了ik分词器：

![2020-04-17-ES-Restart.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-Restart.png)

3. 测试

- 中文

![2020-04-17-ES-Chinese-ik.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-Chinese-ik.png)

- 中英文

![2020-04-17-ES-Ch-En-ik.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-Ch-En-ik.png)

4. 分词模式

ik 提供了两种分词模式：`ik_smart`, `ik_max_word`，前面例子用的都是`ik_smart`。

- ik_smart：最小切分

![2020-04-17-ES-ik-smart.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-ik-smart.png)

- ik_max_word：最细切分

![2020-04-17-ES-ik-max-word.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-ik-max-word.png)

**显然**，可看到两种方式的区别。

5. 自定义分词

以“新冠病毒肺炎”为例，我想让分词器将`新冠`作为一个词，由于ik分词器本身的词库中未录入这个词，我们在前面也看到了，ik分词器会将`新冠`作为两个字来处理；那么，这里手动录入这个词条。

添加词条（elasticsearch-7.5.2\plugins\ik\config）：这里直接写在了main.dic中。

![2020-04-17-ES-ik-Dic.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-ik-Dic.png)

看下加入自定义词条后的分词效果：

![2020-04-17-ES-ik-Custom.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-04-17-ES-ik-Custom.png)

`新冠`成功分为一个词，而不是前面`新`，`冠`两个字。

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***