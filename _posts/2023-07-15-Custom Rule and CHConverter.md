---
layout: post
title: 基于ETLCloud的自定义规则调用第三方jar包实现繁体中文转为简体中文
tags: BigData, Tools, DataBase
---

## 背景

前面曾体验过通过零代码、可视化、拖拉拽的方式快速完成了从 `MySQL` 到 `ClickHouse` 的数据迁移，但是在实际生产环境，我们在迁移到目标库之前还需要做一些过滤和转换工作；比如，在诗词数据迁移后，发现原来 `MySQL` 中的诗词数据都是繁体字，这就导致在直接迁移到 `ClickHouse` 做统计分析时生成的图表展示也是繁体中文的，对于不熟悉繁体中文的用户来说影响体验。

今天就借助 `ETLCloud` 提供的自定义规则能力，同时调用第三方 `jar` 包 `opencc4j` ，完成繁体中文到简体中文的转换；具体来说，将诗词数据库从 `MySQL` 迁移到 `ClickHouse` ，并在入库之前完成数据清洗转换工作，完成数据表中标题、作者与内容等字段的繁体中文到简体中文的转换。

## 数据集说明

`MySQL` 数据库中的库表 `poetry` 结构如下，数据量： `311828` 。

```sql
CREATE TABLE `poetry` (
	`id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`title` VARCHAR(150) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`yunlv_rule` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`author_id` INT(10) UNSIGNED NOT NULL,
	`content` TEXT NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`dynasty` VARCHAR(10) NOT NULL COMMENT '诗所属朝代（S-宋代, T-唐代）' COLLATE 'utf8mb4_unicode_ci',
	`author` VARCHAR(150) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb4_unicode_ci'
ENGINE=InnoDB
AUTO_INCREMENT=311829;
```

`ClickHouse` 中的建表语句：

```sql
CREATE TABLE poetry.poetry (`id` Int32, `title` String, `yunlv_rule` String, `author_id` Int32, `content` String, `dynasty` String, `author` String) ENGINE = MergeTree() PRIMARY KEY id ORDER BY id SETTINGS index_granularity = 8192
```

## 工具选型

* ClickHouse数据库
* Docker部署ETLCloudV2.2
* ETLCloud的库表输入组件、数据清洗转换组件、钉钉消息组件

Note：这里选择的是社区版，采用 `Docker` 部署的方式轻量、快速启动： `docker pull ccr.ccs.tencentyun.com/restcloud/restcloud-etl:V2.2` 。

## 创建应用与流程

先创建应用（因为后面的规则是跟着应用走的），填写基本的应用配置信息。

![2023-07-15-1-CreateApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-1-CreateApp.jpg)

接着，创建数据流程，填写信息即可。

![2023-07-15-2-CreateApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-2-CreateApp.jpg)

## 自定义规则

在真正开始数据迁移前，先准备好清洗转换规则，到迁移入库时直接配置选择定义好的规则即可。

![2023-07-15-3-RuleCategory.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-3-RuleCategory.jpg)

进入应用配置——>新增规则分类——>新增自定义规则

![2023-07-15-4-RuleContent.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-4-RuleContent.jpg)

编写从繁体中文到简体中文的规则代码，其中，类名是自动生成的，先是引入了转换的工具类： `ZhConverterUtil` ，然后调用其静态方法即可；编写完毕后，点击“编译并保存”，正常的话会提示编译成功~。

![2023-07-15-5-RuleCode.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-5-RuleCode.jpg)

```java
package cn.restcloud.etl.rule.ext;

import org.apache.commons.lang3.StringUtils;
import org.bson.Document;
import java.sql.Connection;
import cn.restcloud.framework.core.context.*;
import cn.restcloud.etl.base.IETLBaseEvent;
import cn.restcloud.etl.base.IETLBaseProcessEngine;
import cn.restcloud.framework.core.util.*;
import cn.restcloud.framework.core.util.db.rdb.*;
import cn.restcloud.etl.rule.service.ETLProcessRuleUtil;
import java.util.*;
import com.github.houbb.opencc4j.util.ZhConverterUtil;

/**
indoc是一个map的包装对像内部结构为key-value
被流程的Java规则节点调用时,返回0表示终止流程,返回1表示成功,其中indoc为流数据,fieldId为空值
当被字段绑定运行时fieldId为绑定的字段Id,流入数据的每一行作为indoc对像传入本方法执行一次
params为绑定规则时填写的传入的参数格式为JSON字符串
繁体中文转为简体中文
2023-07-07 10:58:21
admin
*/
public class ETL_64a77f4d955fc70345c4041a implements IETLBaseEvent {

	@Override
	public String execute(IETLBaseProcessEngine engine, Document modelNodeDoc, Document indoc,String fieldId,String params) throws Exception {
	    //List<Document> dataDocs=engine.getData(indoc); //上一节点传入的数据流(仅作为Java规则节点运行可用)
	    Document paramsDoc=ETLProcessRuleUtil.paramsToDocument(params);//规则参数转为一个map包装对像key-value
	    String paramsValue=DocumentUtil.getString(paramsDoc,"参数id"); //读取规则选中时输入的自定义参数值
		String fieldValue=indoc.getString(fieldId); //获取规规绑定的字段Id获取字段值
		PrintUtil.o(fieldId+"取到的值为=>"+fieldValue); //PrintUtil.o();可以打印变量到控制以日志中
		//TODO 对fieldValue进行自定义处理
		String result = ZhConverterUtil.toSimple(fieldValue);
		PrintUtil.o("转换后的值为=>"+result); 
		indoc.put(fieldId,result); //把新的值覆盖旧字段的值
		return "1";
	}
}
```

Note：这里需要注意的是，我们用到了第三方的 `Jar` 包 `opencc4j` 来完成这一工作，那么 `ETLCloud` 如何知道要怎样调用自定义的工具类的方法呢？这就需要我们将第三方的 `jar` 放到 `ETLCloud` 的部署目录下： `/usr/tomcat/webapps/ROOT/WEB-INF/lib` 。

```bash
[root@etl ~]# docker cp /opt/opencc4j-1.8.1.jar de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/lib
                                             Successfully copied 513kB to de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/lib
```

然后点击版本更新，平台提示以下内容：

> 平台配置(Successfully registered (0) java bean, update (2) java bean information!, API升级结果: 从Jar文件中更新或注册(0)个服务、(0)个输入参数、(0)个输出编码! ), ETL配置(Successfully registered (0) java bean, update (0) java bean information!, API升级结果: 从Jar文件中更新或注册(2)个服务、(0)个输入参数、(0)个输出编码! )

## 迁移实践

接下来通过可视化的配置与操作完成从 `MySQL` 到 `ClickHouse` 的诗词数据快速转换与迁移操作。

### 数据源配置

1. 配置Source：MySQL

选择 `MySQL` ，填写IP: 端口以及用户密码信息。

![2023-07-01-2-SourceMySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-01-2-SourceMySQL.jpg)

测试连接成功~

2. 配置Sink：ClickHouse

数据源选择之前文章迁移的 `ClickHouse` 诗词数据库。

### 可视化配置流程

创建好流程后，可以通过点击“流程设计”按钮，进入流程可视化的配置页面。

1. 库表输入：MySQL

在左侧的输入组件中，选择“库表输入”，拖至中央的流程绘制区，双击进入配置阶段。

第一步：选择我们配置好的 `MySQL` 数据源，可以载入 `MySQL` 中已有的表。

![2023-07-15-6-Source1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-6-Source1.jpg)

第二步：可以根据选择的表，生成 `SQL` 语句。

![2023-07-15-7-Source2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-7-Source2.jpg)

第三步：可从表中读取到各个字段的定义，支持添加、删除字段。

![2023-07-15-8-Source3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-8-Source3.jpg)

第四步：根据 `SQL` 语句自动进行了数据预览，这样的一个检查操作，保证了后续操作的正常执行。

![2023-07-15-9-Source4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-9-Source4.jpg)

2. 数据清洗转换：opencc4j实现繁体中文转简体中文

在对字段配置规则前，先熟悉下 `opencc4j` 在后端开发中的用法。

* 引入依赖

```xml
        <!-- Opencc4j 支持中文繁简体转换 -->
        <dependency>
            <groupId>com.github.houbb</groupId>
            <artifactId>opencc4j</artifactId>
            <version>1.8.1</version>
        </dependency>
```

* 编码转换

```java
import com.github.houbb.opencc4j.util.ZhConverterUtil;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
@SpringBootTest
class SpringbootOpencc4jApplicationTests {
	// 繁体中文转简体中文
    @Test
    void toSimple(){
        String original = "李白乘舟將欲行，忽聞岸上踏歌聲。|桃花潭水深千尺，不及汪倫送我情。";
        String result = ZhConverterUtil.toSimple(original);
        System.out.println(result);
        Assertions.assertEquals("李白乘舟将欲行，忽闻岸上踏歌声。|桃花潭水深千尺，不及汪伦送我情。", result);
    }

	// 簡體中文轉繁體中文
    @Test
    void toTraditional(){
        String original = "李白乘舟将欲行，忽闻岸上踏歌声。|桃花潭水深千尺，不及汪伦送我情。";
        String result = ZhConverterUtil.toTraditional(original);
        Assertions.assertEquals("李白乘舟將欲行，忽聞岸上踏歌聲。|桃花潭水深千尺，不及汪倫送我情。", result);
    }
}
```

在左侧的数据转换组件中，选择“数据清洗转换”，拖至中央的流程绘制区，双击进入配置阶段。

![2023-07-15-10-Rule.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-10-Rule.jpg)

因为源数据表中的 `title` 、 `content` 以及 `author` 这三个字段值是繁体中文，所以针对这三个字段设置自定义的规则：**繁体中文转为简体中文**，下一步点击保存对所有数据记录进行转换即可。

3. 库表输出：ClickHouse

在左侧的输出组件中，选择“库表输出”，拖至中央的流程绘制区，双击进入配置阶段。

第一步：选择我们配置好的ClickHouse数据源。

![2023-07-15-11-CK1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-11-CK1.jpg)

第二步：可从表中读取到各个字段的定义，支持添加、删除字段、绑定规则。

![2023-07-15-12-CK2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-12-CK2.jpg)

最后通过 `流程线` 将**开始**、**库表输入**、**数据清洗转换**、**库表输出**、**结束**组件分别连接起来，数据通过自定义的规则转换与迁移的可视化配置便告完成，Done~

![2023-07-15-17-Flow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-17-Flow.jpg)

### 运行流程

保存流程，运行流程；之后可查看对应的流程日志与转换日志，并可视化监控迁移进度。

![2023-07-15-17-Result.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-17-Result.jpg)

## 问题记录

* 数据转换过程报错

问题描述： 在 `ETLCloud` 的日志中发现错误， `Caused by: java.lang.ClassNotFoundException: com.github.houbb.heaven.support.instance.impl.Instances`

问题分析：在 `SpringBoot` 结合 `IDEA` 与 `Maven` 中开发时，我们仅仅引入了一个依赖： `opencc4j` ，但是实际上观察外部依赖库时发现还有另外两个依赖： `heaven` 与 `nlp-common` 。

![2023-07-15-13-Jar.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-13-Jar.jpg)

解决方法：将 `opencc4j-1.8.1.jar` 、 `heaven-0.2.0.jar` 与 `nlp-common-0.0.5.jar` 这个三个 `jar` 包都上传到 `ETLCloud` 的 `/usr/tomcat/webapps/ROOT/WEB-INF/lib` 目录下，重新更新 `ETLCloud` 配置、重启 `ETLCloud` 服务。

![2023-07-15-14-Jar.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-14-Jar.jpg)

```bash
[root@etl ~]# docker cp /opt/heaven-0.2.0.jar de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/lib
                                             Successfully copied 304kB to de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/lib
[root@etl ~]# docker cp /opt/nlp-common-0.0.5.jar de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/lib
                                             Successfully copied 1.97MB to de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/lib
```

![2023-07-15-15-Update.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-15-15-Update.jpg)

Note： `Jar` 包可以从阿里云镜像仓库查找下载： `https://developer.aliyun.com/mvn/search` ，或者到本地开发环境的的 `.m2\repository\com\github\houbb` 目录下查找。

## 总结

以上介绍了如何通过 `ETLCloud` 强大的自定义规则功能完成对数据的清洗转换功能，实现了表字段值从繁体中文到简体中文的转换，以下两点要注意：
1. 自定义规则是附属于某个流程的；
2. 第三方的`Jar`包依赖在数量上要完整。

## Reference

* [ETLCloud官方文档](https://www.etlcloud.cn/restcloud/view/page/helpDocument.html)
* [ClickHouse官方文档](https://clickhouse.com/docs/en/intro)
* [opencc4j官方文档](https://github.com/houbb/opencc4j)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
