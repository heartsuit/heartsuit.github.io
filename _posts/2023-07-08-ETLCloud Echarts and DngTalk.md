---
layout: post
title: 使用ETLCloud将ClickHouse中的统计数据转换为Echarts图表并发送至钉钉
tags: BigData, Tools, DataBase
---

## 背景

日常工作中，有时候领导对某些数据统计感兴趣，会要求分析人员定期取数报送，面对这种需求，我们可以设计一个大屏，将领导关注的数据以可视化的方式展示；如今，借助 `ETLCloud` 的“生成Echarts图表H5页面”组件，可以将数据库表中的数据执行一个统计 `SQL` 然后把数据展示成可视化的图表通过邮件、企业微信、钉钉等直接发送给业务用户，实现报表统计、发送的全自动化。

## 工具选型

* ClickHouse数据库
* Docker部署ETLCloudV2.2
* ETLCloud的库表输入组件、生成Echarts图表H5页面组件、钉钉消息组件

Note：这里选择的是社区版，采用 `Docker` 部署的方式轻量、快速启动： `docker pull ccr.ccs.tencentyun.com/restcloud/restcloud-etl:V2.2` 。

## 购买组件

![2023-07-08-1-Buy1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-1-Buy1.jpg)

![2023-07-08-1-Buy2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-1-Buy2.jpg)

因为“生成Echarts图表H5页面”组件未包含在 `ETLCloud` 社区版中，所以先到官方的组件库中选择购买（生成 `Echarts` 图表 `H5` 页面的组件是免费的）。在官方的组件库中选择图表统计分析-生成Echarts图表H5页面-点击购买，之后可以在我购买的组件页面查看（需要先登录）。

![2023-07-08-1-Buy3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-1-Buy3.jpg)

## 安装组件

“生成Echarts图表H5页面”组件购买成功后，可以在 `ETLCloud` 的管理后台的“数据处理组件”页面进行安装，选择远程安装，会出现购买的组件列表；这里选择安装到通用组件分类下，安装完成后刷新页面。

![2023-07-08-2-Install.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-2-Install.jpg)

## 实践：数据统计-可视化-钉钉发送

接下来，进入我们的迁移实践：全程零代码、可视化、拖拉拽，鼠标点一点即可完成数据统计、图表可视化、推送的全流程。

### 数据源

数据源选择之前文章迁移的 `ClickHouse` 诗词数据库。

```sql
-- 柱状图-查询唐诗宋词所有作者的作品数量并排序（仅列出作品数量超过1000的作者）
SELECT author, count(*) AS count FROM poetry.poetry GROUP BY author HAVING count >=1000 ORDER BY count DESC;
```

### 创建应用与流程

创建应用，填写基本的应用配置信息。接着，创建数据流程，填写信息即可。
创建好流程后，可以通过点击“流程设计”按钮，进入流程可视化的配置页面。

### 可视化配置流程

在配置流程前，简单介绍下这个配置页面的各个区：左侧是组件区，中间顶部是功能区，中间的大部分为流程绘制区，双击绘制区的组件，可以看到以抽屉风格弹出的组件详细配置项区。

1. 库表批量输入：ClickHouse

在左侧的输入组件中，选择“库表输入”，拖至中央的流程绘制区，双击进入配置阶段。

第一步：选择我们配置好的 `ClickHouse` 数据源，选择 `poetry` 数据库。

![2023-07-08-3-CK1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-3-CK1.jpg)

第二步：配置统计数据的SQL语句。

![2023-07-08-3-CK2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-3-CK2.jpg)

第三步：选择最终输出的字段。

![2023-07-08-3-CK3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-3-CK3.jpg)

第四步：数据预览，确认 `SQL` 语句及查询的结果信息是否符合预期。

![2023-07-08-3-CK4.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-3-CK4.jpg)

2. 生成Echarts图表H5页面

在左侧的通用组件中，选择“生成Echarts图表H5页面”，拖至中央的流程绘制区，双击进入配置阶段。

![2023-07-08-4-Echarts.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-4-Echarts.jpg)

在H5页面代码处填写生成Echarts图表的代码，可参考 `Echarts` 官方实例，完成图表展示；此外要注意上一步统计结果中的字段，这里是 `author` 和 `count` ，在代码中通过 `${}` 获取变量值。

```html
<!DOCTYPE html>
<html lang="zh-CN" style="height: 100%">

<head>
    <title>柱状图</title>
    <meta charset="utf-8">
</head>

<body>
    <center>需要修改item.age和item.total为api返回rows行中的字段id
        <div id="container" style="height: 500px;width:100%;"></div>
    </center>
    <script type="text/javascript" src="https://fastly.jsdelivr.net/npm/echarts@5.4.0/dist/echarts.min.js">
    </script>
    <script type="text/javascript">
        var dom = document.getElementById('container');
        var myChart = echarts.init(dom, null, {
            renderer: 'canvas',
            useDirtyRect: false
        });
        var app = {};
        var option;
        option = {
            xAxis: {
                type: 'category',
                data: [#foreach($item in $data)
                    '$!{item.author}', #end
                ]
            },
            yAxis: {
                type: 'value'
            },
            series: [{
                data: [#foreach($item in $data)
                    '$!{item.count}', #end
                ],
                type: 'bar',
                showBackground: true,
                backgroundStyle: {
                    color: 'rgba(180, 180, 180, 0.2)'
                }
            }]
        };
        if (option && typeof option === 'object') {
            myChart.setOption(option);
        }
        window.addEventListener('resize', myChart.resize);
    </script>
</body>

</html>
```

3. 钉钉消息

在左侧的通用组件中，选择“钉钉消息”，拖至中央的流程绘制区，双击进入配置阶段。关于钉钉如何开启并配置钉钉机器人，这里就不做介绍了。选择 `Text` 类型的消息，输入消息内容，这里通过 `${pageurl}` 获取上一步生成的图表页面的地址变量值。

![2023-07-08-5-DingTalk.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-5-DingTalk.jpg)

Note：钉钉群里的机器人配置时，要注意关键词和消息内容的匹配，我这里配置的关键词是：唐诗宋词。

4. 完善流程

最后通过 `流程线` 将**开始**、**库表输入**、**生成Echarts图表H5页面**、**钉钉消息**、**结束**组件分别连接起来，数据统计、图表可视化、推送的流程配置便告完成，Done~

![2023-07-08-6-Flow.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-6-Flow.jpg)

### 运行流程

保存流程，运行流程；之后可查看对应的流程日志，并可视化监控迁移进度。

![2023-07-08-8-FlowOK.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-8-FlowOK.jpg)

Note：通过机器人发送到钉钉群里后，链接的 `IP` 地址是 `Docker` 容器的地址，无法直接访问，这里将 `IP` 换为 `Docker` 宿主机的 `IP` 后，可以在浏览器中直接打开展示。

![2023-07-08-7-DingTalk.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-7-DingTalk.jpg)

为确认我们的图表是否正确，再从 `ClickHouse` 中查询下数据。

![2023-07-08-9-CK.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-9-CK.jpg)

## 问题记录

运行流程时，出现安装的组件报错问题：也就是说未找见我们自己安装的组件。之后联系了官方技术人员，给我发了一个 `ETLGenerateHtmlPage.class` 文件，放到了指定目录后 `cn.restcloud.etl.module.plugin.report` 成功运行。

* 错误信息： `java.lang.Class-java.lang.Exception`: 节点: `GenerateHtmlPage`不存在, 请在组件市场中下载或者自行定义它!

![2023-07-08-9-Error.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-9-Error.jpg)

* 解决方法：复制组件到容器的指定目录：`/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/etl/module/plugin/report`。

![2023-07-08-9-Docker.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-07-08-9-Docker.jpg)

```bash
# 进入容器
[root@etl ~]# docker exec -it de63b29c71d0 /bin/bash
root@de63b29c71d0:/usr# cd /usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/

# 这个目录一开始不存在，先在容器中创建目录
root@de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud# mkdir -p etl/module/plugin/report

# 从宿主机复制文件到容器的指定目录
[root@etl ~]# docker cp /opt/ETLGenerateHtmlPage.class de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/etl/module/plugin/report
                                             Successfully copied 6.14kB to de63b29c71d0:/usr/tomcat/webapps/ROOT/WEB-INF/classes/cn/restcloud/etl/module/plugin/report
# 重启ETLCloud服务
[root@etl ~]# docker restart de63b29c71d0
de63b29c71d0
```

## 总结

以上就是使用 `ETLCloud` 将 `ClickHouse` 中的统计数据转换为 `Echarts` 图表并发送至钉钉的全部过程，实现了报表统计、发送的全自动化；同时也体验了一下如何从官方的组件市场安装使用新组件。

## Reference

* [ETLCloud官方文档](https://www.etlcloud.cn/restcloud/view/page/helpDocument.html)
* [Echarts示例](https://echarts.apache.org/examples/zh/index.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
