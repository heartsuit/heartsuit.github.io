---
layout: post
title: LLM大语言模型私有化部署-使用Dify的工作流编排打造专属AI诗词数据分析师
tags: AI, LLM
---

## 背景

前面的文章通过 `Ollama` 私有化部署了 `Qwen2.5 (7B)` 模型，然后使用 `Docker Compose` 一键部署了 `Dify` 社区版平台。

1. [LLM大语言模型私有化部署-使用Dify与Qwen2.5打造专属知识库](https://blog.csdn.net/u013810234/article/details/144473522)：在 `Dify` 平台上，通过**普通编排**的方式，创建了基于 `Qwen2.5` 模型的聊天助手，并添加了个人知识库作为上下文，实现了真正的**个人助手**功能。

2. [LLM大语言模型私有化部署-使用Dify的工作流编排打造专属AI搜索引擎](https://heartsuit.blog.csdn.net/article/details/144631387)：介绍了使用 `Dify` 提供的**工作流编排**以及 `Dify` 自带的 `Tavily Search` 搜索工具、 `LLM` 模型 `Qwen2.5 (7B)` 模型实现自己专属的**AI搜索引擎**。

3. [LLM大语言模型私有化部署-使用Dify的Agent与Flux.1打造专属文生图智能体](https://heartsuit.blog.csdn.net/article/details/144631816)：使用 `Dify` 提供的**Agent智能体**功能，结合 `LLM` 模型 `Qwen2.5 (7B)` ，同时利用外部工具 `Flux.1` （文生图的“新王”）实现自己专属的**文生图智能体**

今天我们使用 `Dify` 提供的**工作流编排**以及 `Dify` 自带的 `代码执行` 或者 `HTTP请求` 模块，依托阿里百炼的 `LLM` 模型 `qwen2.5-14b-instruct / qwen2.5-72b-instruct / qwen-plus-latest` 模型（低于14B的模型效果一般。。）实现对 `MySQL` 中的诗词数据库进行分析，实现自己的**AI数据分析师**。

Note：阿里百炼平台对新用户每个模型免费调用1000000次，测试够用了。。

## 先上效果图

![2025-02-23-1-SongTop10.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-1-SongTop10.gif)

对应生成的 `SQL` 如下，是个单表聚合查询语句，可以看出大模型可以完全遵循自然语言指令生成 `SQL` 语句，并绘制合适的ECharts图表，Nice~

```sql
-- 看下宋词相同词牌名的Top10，从多到少排序
SELECT title, COUNT(*) AS COUNT
FROM poems
GROUP BY title
ORDER BY COUNT DESC
LIMIT 10
```

## 打造专属AI数据分析师

### 新建工作流编排聊天助手

新建一个“聊天助手”类型的应用，编排方法选择“工作流编排”。

![2025-02-23-2-NewApp.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-2-NewApp.jpg)

### 添加LLM-生成SQL节点

先选择一个合适的模型，这里经过测试，阿里百炼的 `LLM` 模型 `qwen2.5-14b-instruct / qwen2.5-72b-instruct / qwen-plus-latest` 模型（低于14B的模型效果一般。。也可以试试 `DeepSeek` ~~）均可实现稳定的输出。

![2025-02-23-4-LLMModel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-4-LLMModel.jpg)

具体内容看以下提示词内容，需要说明的是，这里的表结构我是直接通过 `MySQL` 的 `desc` 直接得到的。

![2025-02-23-3-TableDesc.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-3-TableDesc.jpg)

* SYSTEM提示词

![2025-02-23-5-PromptSystem.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-5-PromptSystem.jpg)

```markdown
# 你是数据分析专家，精通MySQL，能够根据用户的问题生成高效的SQL查询。

## 数据库表结构

### 1. poetry（唐诗宋诗表）;

+------------+--------------+------+-----+---------+----------------+
| Field      | Type         | Null | Key | Default | Extra          |
+------------+--------------+------+-----+---------+----------------+
| id         | int(11)      | NO   | PRI | NULL    | auto_increment |
| author_id  | int(11)      | YES  |     | 0       |                |
| title      | varchar(255) | NO   |     | NULL    |                |
| content    | text         | NO   |     | NULL    |                |
| yunlv_rule | text         | YES  |     | NULL    |                |
| author     | varchar(255) | NO   |     | NULL    |                |
| dynasty    | char(1)      | NO   |     | NULL    |                |
+------------+--------------+------+-----+---------+----------------+

### 2. poetry_author（唐诗宋诗作者表）;

+---------+--------------+------+-----+---------+----------------+
| Field   | Type         | Null | Key | Default | Extra          |
+---------+--------------+------+-----+---------+----------------+
| id      | int(11)      | NO   | PRI | NULL    | auto_increment |
| name    | varchar(255) | NO   |     | NULL    |                |
| intro   | text         | YES  |     | NULL    |                |
| dynasty | char(1)      | NO   |     | NULL    |                |
+---------+--------------+------+-----+---------+----------------+

### 3. poems（宋词表）;

+-----------+--------------+------+-----+---------+----------------+
| Field     | Type         | Null | Key | Default | Extra          |
+-----------+--------------+------+-----+---------+----------------+
| id        | int(11)      | NO   | PRI | NULL    | auto_increment |
| author_id | int(11)      | YES  |     | 0       |                |
| title     | varchar(255) | NO   |     | NULL    |                |
| content   | text         | NO   |     | NULL    |                |
| author    | varchar(255) | NO   |     | NULL    |                |
+-----------+--------------+------+-----+---------+----------------+

### 4. poems_author（宋词作者表）;

+---------+--------------+------+-----+---------+----------------+
| Field   | Type         | Null | Key | Default | Extra          |
+---------+--------------+------+-----+---------+----------------+
| id      | int(11)      | NO   | PRI | NULL    | auto_increment |
| name    | varchar(255) | NO   |     | NULL    |                |
| intro_l | text         | YES  |     | NULL    |                |
| intro_s | text         | YES  |     | NULL    |                |
+---------+--------------+------+-----+---------+----------------+

注意：dynasty字段存储的是缩写：S代表宋，T代表唐
```

* USER提示词

![2025-02-23-6-PromptUser.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-6-PromptUser.jpg)

```markdown
问题：{{#sys.query#}}
请严格按照以下要求回答：
1. 仅使用提供的表和字段
2. 输出内容直接给完整SQL，不要任何Markdown格式，不要有注释，不要有换行
```

### 添加HTTP请求执行SQL查询节点

在 `Dify` 中执行 `SQL` 查询可以有两种方式：
1. 通过**代码执行节点**的方式，直接完成从数据库中查询工作（由于`Docker`部署方式的`Dify`里的`Sandbox`沙箱安全机制，导致无法连接外部的`MySQL`数据库，这种方式没有成功，下一篇专门来介绍下如何在`Sandbox`沙箱中安装`Python`依赖以及如何配置`Sandbox`沙箱网络）；
2. 通过**HTTP请求**的方式，请求一个部署好的`API`服务，本文采用这种方式。

#### 执行SQL查询的API

先介绍下这个执行 `SQL` 查询的 `API` 服务，代码格式如下，核心是 `execute_query.py` 文件，并将其构建为一个 `Docker` 镜像进行容器化部署。

```bash
└── fastapi/
    ├── execute_query.py
    ├── requirements.txt
    ├── Dockerfile
    └── README.md
```

* execute_query.py

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pymysql
import uvicorn
from contextlib import contextmanager

app = FastAPI()

class SQLQuery(BaseModel):
    sql_query: str

@contextmanager
def get_db_connection(config):
    # 数据库连接的上下文管理器
    conn = None
    try:
        conn = pymysql.connect(**config)
        yield conn
    finally:
        if conn:
            conn.close()

@app.post("/execute_query")
async def execute_query(
    query: SQLQuery
):
    # 处理POST请求以执行SQL查询
    try:
        sql_queries = query.sql_query.strip()

        if not sql_queries:
            raise HTTPException(status_code=400, detail="Missing sql_query parameter")

        with get_db_connection(app.db_config) as conn:
            results = []
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                for sql_query in sql_queries.split(';'):
                    if sql_query.strip():
                        cursor.execute(sql_query)
                        result = cursor.fetchall()
                        if result:
                            results.extend(result)
                conn.commit()
        return results
    except pymysql.Error as e:
        raise HTTPException(status_code=500, detail=f"数据库错误: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务器错误: {str(e)}")

if __name__ == '__main__':
    # 数据库配置
    app.db_config = {
        "host": "192.168.44.171",
        "user": "root",
        "password": "root",
        "database": "poetry",
        "port": 3306,
        "charset": 'utf8mb4'
    }
    uvicorn.run(app, host='0.0.0.0', port=35005)
```

* requirements.txt

```
fastapi==0.115.8
pydantic==2.10.6
pymysql==1.1.1
uvicorn==0.34.0
```

* Dockerfile

```dockerfile
# 使用官方的 Python 基础镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 复制 requirements.txt 文件并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用程序代码
COPY . .

# 暴露应用程序的端口（如果需要）
EXPOSE 35005

# 定义启动命令
CMD ["python", "execute_query.py"]
```

* README.md

```markdown
1. 使用pipreqs第三方库生成requirements.txt

pip install pipreqs
pipreqs ./ --encoding=utf8 --force

2. 安装依赖

pip install -r requirements.txt

3. 构建镜像

docker build -t poetry-image .

4. 运行容器

docker run -p 35005:35005 -d --name poetry poetry-image

5. 验证接口

curl -X POST http://192.168.44.171:35005/execute_query      -H "Content-Type: application/json"      -d '{"sql_query":"select * from poetry limit 1;"}'
```

#### 配置HTTP请求节点-执行SQL查询

配置 `POST` 接口的API地址、Headers信息与参数信息。

Note：参数可以通过输入 `/` 进行快捷选择。

![2025-02-23-7-HTTPAPI.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-7-HTTPAPI.jpg)

### 添加LLM-数据分析节点

在**LLM-数据分析**节点，编辑SYSTEM系统提示词如下 ：

```
# 数据分析专家工作指南

## 角色定位

专业的SQL数据分析专家，负责解读MySQL poetry数据库的查询结果：{{#1740285905752.body#}}

## 核心规则

1. 直接分析已提供数据，默认数据已满足查询条件

2. 接受数据原貌，不质疑数据有效性

3. 无需二次筛选或验证数据范围

4. 空数据集统一回复"没有查询到相关数据"

5. 避免使用提示性语言

6. 分析结果以markdown格式输出

7. 整理sql查询结果，以markdown表格格式输出放置输出开头

8. 整理sql查询结果， 以echarts图表格式输出放最后，图表配置需要尽量简洁，不要有太多冗余的配置项输出格式如下：

``echarts
{
  "title": {
    "text": "示例图表",
    "subtext": "ECharts 示例"
  },
  "tooltip": {
    "trigger": "item",
    "formatter": "{a} <br/>{b}: {c} ({d}%)"
  },
  "legend": {
    "orient": "vertical",
    "left": "left",
    "data": ["A", "B", "C", "D"]
  },
  "series": [
    {
      "name": "示例数据",
      "type": "pie",
      "radius": "50%",
      "data": [
        { "value": 335, "name": "A" },
        { "value": 310, "name": "B" },
        { "value": 234, "name": "C" },
        { "value": 135, "name": "D" }
      ],
      "emphasis": {
        "itemStyle": {
          "shadowBlur": 10,
          "shadowOffsetX": 0,
          "shadowColor": "rgba(0, 0, 0, 0.5)"
        }
      }
    }
  ]
}
``

9. 注意：如果sql查询结果为标量或者仅有一个结果，就取消Echarts图表。另外，根据结果自行决定使用不同的ECharts类型，eg: 柱状图、饼图、折线图、雷达图等。

## 分析报告规范

### 数据处理原则

1. 严格基于JSON数据集

2. 数据已预筛选，直接进行统计分析

3. 不进行数据条件的二次确认

### 报告结构要求

1. 数据概览

2. 详细分析

3. 结论部分
```

Note: 上述 `ECharts` 格式的代码应该用**三个反引号**，我这里是因为跟文章里的代码片段格式冲突改成了两个反引号。。

![2025-02-23-8-PromptAnalysis.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-8-PromptAnalysis.jpg)

### 测试预览试一下

![2025-02-23-9-Test.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-9-Test.jpg)

## 数据分析结果

随便运行几个分析查询试下：

1. 单表聚合查询

```sql
-- 统计创作唐诗最多的作者的Top10，仅列出超过500首的作者，从多到少排序
SELECT p.author, COUNT(*) AS poem_count
FROM poetry p
WHERE p.dynasty = 'T'
GROUP BY p.author
HAVING poem_count > 500
ORDER BY poem_count DESC
LIMIT 10
```

![2025-02-23-10-Test1.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-10-Test1.gif)

2. 单表条件查询

```sql
-- 统计分别包含风、花、雪、月、山、水的唐诗数量
SELECT SUM(CASE WHEN content LIKE '%风%' THEN 1 ELSE 0 END) AS wind_count, SUM(CASE WHEN content LIKE '%花%' THEN 1 ELSE 0 END) AS flower_count, SUM(CASE WHEN content LIKE '%雪%' THEN 1 ELSE 0 END) AS snow_count, SUM(CASE WHEN content LIKE '%月%' THEN 1 ELSE 0 END) AS moon_count, SUM(CASE WHEN content LIKE '%山%' THEN 1 ELSE 0 END) AS mountain_count, SUM(CASE WHEN content LIKE '%水%' THEN 1 ELSE 0 END) AS water_count
FROM poetry
WHERE dynasty = 'T'
```

![2025-02-23-10-Test2.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-10-Test2.gif)

3. 多表联合查询

```sql
-- 谁写的唐诗最多，给出作者详细信息
SELECT pa.name, pa.intro, COUNT(p.id) AS poem_count
FROM poetry p
JOIN poetry_author pa ON p.author_id = pa.id
WHERE p.dynasty = 'T'
GROUP BY p.author_id
ORDER BY poem_count DESC
LIMIT 1
```

![2025-02-23-10-Test3.gif](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-02-23-10-Test3.gif)

## 小总结

本文通过使用 `Dify` 平台的工作流编排功能，结合阿里百炼的大型语言模型（如 `qwen2.5-14b-instruct` 等），成功打造了一个专属的AI数据分析师。能够根据用户提供的自然语言问题生成对应的 `SQL` 查询语句，并通过部署好的 `API` 服务执行这些查询，最终由另一个 `LLM` 节点对查询结果进行专业的数据分析和可视化展示。

整个过程不仅展示了大模型在理解和生成 `SQL` 方面的能力，还体现了通过集成不同工具和服务来构建复杂应用的可能性。例如，可以统计创作唐诗最多的作者、分析唐诗中特定元素的出现频率，以及联合查询作者信息与作品数量等，今后面对领导的取数需求，你可以直接替换数据源，轻松实现各种数据分析和可视化需求。

## Reference

* [http://difyai.com/](http://difyai.com/)
* [https://github.com/langgenius/dify](https://github.com/langgenius/dify)
* [https://docs.dify.ai/zh-hans](https://docs.dify.ai/zh-hans)
* [https://docs.dify.ai/v/zh-hans/guides/workflow/node/http-request](https://docs.dify.ai/v/zh-hans/guides/workflow/node/http-request)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
