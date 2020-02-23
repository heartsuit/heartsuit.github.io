---
layout: post
title: ElasticSearch入门（二）批量导入数据（Postman与Kibana）
tags: ElasticSearch
---

### 背景

前面安装运行了`ElasticSearch`，在实际操作之前，先准备好数据，实际中一般是通过`Logstash`等插件实现其他数据库到`ElasticSearch`的同步，这里的演示采用直接导入的方式。

ElasticSearch官方有个[数据集](https://raw.githubusercontent.com/elastic/elasticsearch/master/docs/src/test/resources/accounts.json)，文件内容的格式以行分隔：

> 每两行为一组，第一行指定索引id（也可为空），第二行为实际的数据体。

```json
{"index":{"_id":"1"}}
{"account_number":1,"balance":39225,"firstname":"Amber","lastname":"Duke","age":32,"gender":"M","address":"880 Holmes Lane","employer":"Pyrami","email":"amberduke@pyrami.com","city":"Brogan","state":"IL"}
...省略
```

以下提供两种方法批量导入数据到ES的`bank`索引：`Postman`与`Kibana`。通过ES提供的`_bulk` API完成批量导入。

### 1. 通过Postman完成数据批量导入

首先在`Postman`中新建 `POST` 请求：`localhost:9200/bank/_bulk`, 请求体Body下选择`binary`二进制, 然后`Select File`选择对应的`json`文件, 最后点击Send发送请求即可，见下图。

![2020-02-23-ES-Bulk-Postman.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-23-ES-Bulk-Postman.jpg)

### 2. 通过Kibana完成数据批量导入

依次启动ElasticSearch、Kibana，`Kibana`默认启动在`5601`端口，打开（Dev Tools）开发工具。

![2020-02-23-ES-Kibana-DevTool.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-23-ES-Kibana-DevTool.jpg)

左侧为请求编辑区，右侧为对应的响应。在左侧输入：

```bash
POST bank/_bulk
{"index":{"_id":"1"}}
{"account_number":1,"balance":39225,"firstname":"Amber","lastname":"Duke","age":32,"gender":"M","address":"880 Holmes Lane","employer":"Pyrami","email":"amberduke@pyrami.com","city":"Brogan","state":"IL"}
{"index":{"_id":"6"}}
{"account_number":6,"balance":5686,"firstname":"Hattie","lastname":"Bond","age":36,"gender":"M","address":"671 Bristol Street","employer":"Netagy","email":"hattiebond@netagy.com","city":"Dante","state":"TN"}
...省略
```

点击运行，`Kibana`中的执行结果为：

![2020-02-23-ES-Bulk-Kibana.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-23-ES-Bulk-Kibana.jpg)

### 验证：查询索引中所有数据

在`Postman`中发送`Post`请求：localhost:9200/bank/_search，请求体：
```json
{
	"query":{
		"match_all": {}
	}
}
```

得到bank索引中所有数据，表明批量操作成功：

![2020-02-23-ES-Bulk-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2020-02-23-ES-Bulk-Result.jpg)


### 批量删除

有时候会有批量删除的需求，尤其是在测试或演示时。

- 清空索引

仅删除数据，保留索引以及映射。
在`Postman`中发送`Post`请求：localhost:9200/bank/_delete_by_query，请求体：

```json
{
	"query":{
		"match_all": {}
	}
}
```

- 删除索引

在`Postman`中发送`Delete`请求：localhost:9200/bank，无参数。

Notes: **删除索引为高危操作，谨慎使用！！😎**

---

**_If you have any questions or any bugs are found, please feel free to contact me._**

**_Your comments and suggestions are welcome!_**

