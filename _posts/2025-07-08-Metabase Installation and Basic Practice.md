---
layout: post
title: 开源BI工具Metabase极简实践：30分钟实现诗词数据分析看板
tags: BI, BigData
---

## 背景

`Metabase` 是一个**开源**的**商业智能（BI）** 和**数据分析**工具，它的核心目标是让公司内部的所有人（不仅仅是数据分析师或工程师）能够轻松地访问、探索、可视化和共享来自数据库的数据，从而做出数据驱动的决策。它支持多种数据库，包括 `MySQL` 、 `PostgreSQL` 、 `MongoDB` 等，并且具有简单易用的界面，适合企业、团队甚至个人开发者使用；**支持拖拽查询**与**原生SQL查询**两种方式，借助低代码数据处理与拖拽式可视化降低了技术门槛，使业务人员也能自主分析。

`Metabase` 的技术栈相对独特且高效，核心围绕 `Java` 虚拟机 (JVM) 生态构建，并大量使用了 函数式编程语言 `Clojure` ，当前**Github星标42.7K**。

| 层面       | 核心技术                                                     | 特点/优势                                                    |
| :--------- | :----------------------------------------------------------- | :----------------------------------------------------------- |
| **后端**   | **Clojure (主) + Java**                                      | 函数式、高并发、JVM 生态强大、开发效率高 (Lisp 宏)           |
|            | **Ring + Compojure**                                         | 轻量级、简洁的 Web 框架                                      |
|            | **应用 DB: H2 (默认) / PG/MySQL (推荐)**                     | 生产必用 PG/MySQL                                           |
|            | **缓存: Redis / Memcached**                                  | 提升性能必备                                                 |
|            | **查询引擎 (自研)**                                          | 支持多数据源、翻译查询、优化                                 |
| **前端**   | **React + Redux**                                            | 主流、组件化、状态管理清晰                                   |
|            | **JavaScript/TypeScript**                                    |                                                              |
|            | **D3.js + 自研图表组件**                                     | 灵活可视化 + 开箱即用体验                                    |
|            | **自研 UI 组件库 ( `metabase/ui` )**                           | 保证一致性和品牌风格                                         |

## 先上效果图

![2025-07-08-01-Dashboard.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-07-08-01-Dashboard.png)

## 数据库表结构

### 1. poetry（唐诗宋诗表）; 

```
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
```

### 2. poetry_author（唐诗宋诗作者表）; 

```
+---------+--------------+------+-----+---------+----------------+
| Field   | Type         | Null | Key | Default | Extra          |
+---------+--------------+------+-----+---------+----------------+
| id      | int(11)      | NO   | PRI | NULL    | auto_increment |
| name    | varchar(255) | NO   |     | NULL    |                |
| intro   | text         | YES  |     | NULL    |                |
| dynasty | char(1)      | NO   |     | NULL    |                |
+---------+--------------+------+-----+---------+----------------+
```

### 3. poems（宋词表）; 

```
+-----------+--------------+------+-----+---------+----------------+
| Field     | Type         | Null | Key | Default | Extra          |
+-----------+--------------+------+-----+---------+----------------+
| id        | int(11)      | NO   | PRI | NULL    | auto_increment |
| author_id | int(11)      | YES  |     | 0       |                |
| title     | varchar(255) | NO   |     | NULL    |                |
| content   | text         | NO   |     | NULL    |                |
| author    | varchar(255) | NO   |     | NULL    |                |
+-----------+--------------+------+-----+---------+----------------+
```

### 4. poems_author（宋词作者表）; 

```
+---------+--------------+------+-----+---------+----------------+
| Field   | Type         | Null | Key | Default | Extra          |
+---------+--------------+------+-----+---------+----------------+
| id      | int(11)      | NO   | PRI | NULL    | auto_increment |
| name    | varchar(255) | NO   |     | NULL    |                |
| intro_l | text         | YES  |     | NULL    |                |
| intro_s | text         | YES  |     | NULL    |                |
+---------+--------------+------+-----+---------+----------------+
```

注意：dynasty字段存储的是缩写：S代表宋，T代表唐

### 5. 诗经表；

```
+---------+--------------+------+-----+---------+----------------+
| Field   | Type         | Null | Key | Default | Extra          |
+---------+--------------+------+-----+---------+----------------+
| id      | int          | NO   | PRI | NULL    | auto_increment |
| title   | varchar(255) | NO   |     | NULL    |                |
| chapter | varchar(255) | NO   |     | NULL    |                |
| section | varchar(255) | NO   |     | NULL    |                |
| content | text         | NO   |     | NULL    |                |
+---------+--------------+------+-----+---------+----------------+
```

## 安装Metabase

使用最简单的 `Docker` 容器化部署方式，快速拉起一个 `Metabase` 服务。

```bash
[root@bi docker]# docker run -d -p 3000:3000 --name metabase metabase/metabase

[root@bi docker]# docker ps
CONTAINER ID   IMAGE                                         COMMAND                  CREATED          STATUS                 PORTS                                                                             NAMES
2da1fe942273   metabase/metabase                             "/app/run_metabase.sh"   26 seconds ago   Up 24 seconds          0.0.0.0:3000->3000/tcp, :::3000->3000/tcp                                         metabase
```

## Metabase操作步骤

1. **连接到数据库**（如PostgreSQL, MySQL, BigQuery, Snowflake, Redshift, SQL Server, MongoDB等）。
2. **用简单的界面提问问题**（无需编写复杂的SQL，当然也支持SQL）。
3. **将答案转化为图表和仪表盘**（如折线图、柱状图、饼图、表格等）。
4. **保存、共享和定时发送这些图表和仪表盘**给团队成员。

### 连接到数据库

![2025-07-08-02-DataSource.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-07-08-02-DataSource.jpg)

Note： `Metabase` 支持多种数据源，包括 `MySQL` 、 `PostgreSQL` 、 `Oracle` 、 `SQL Server` 、 `SQLite` 、 `MongoDB` 、 `Presto` 、 `Snowflake` 、 `Databricks` 、 `Apache Spark` 、 `BigQuery` 、 `Clickhouse` 等，也可直接连接 `CSV` 、 `Excel` 文件。

### 用简单的界面提问问题

![2025-07-08-03-Question.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-07-08-03-Question.jpg)

Note：支持选择字段、过滤、聚合、排序、函数等；可以将问题转换为 `SQL` 查询。

![2025-07-08-04-SQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-07-08-04-SQL.jpg)

Note：支持写原生 `SQL` ，自由发挥吧~

### 将答案转化为图表和仪表盘

![2025-07-08-05-Chart.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-07-08-05-Chart.jpg)

Note：
1. 支持常用的图表类型（线图、柱状图、条形图、饼图、散点图、漏斗图、地图、仪表盘、表格、透视表等）；
2. 支持将问题转换为图表，这样每一个单独的图表可以在仪表盘中自由组合布局。

### 保存、共享和定时发送这些图表和仪表盘

![2025-07-08-06-Share.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2025-07-08-06-Share.jpg)

Note：可以下载每个图表数据为 `.csv` ， `.xlsx` ， `.json` ， `.png` 格式，可以下载整张看板为 `pdf` 。

## 小总结

`Metabase` 因其设计理念和功能特性而广受欢迎，其核心优势包括：

1.  **极致的易用性（面向非技术人员）：**
    -   **直观的点击式查询构建器：** 用户无需编写任何SQL代码，即可通过简单的下拉菜单和筛选条件构建查询、过滤数据、进行分组聚合等操作。这大大降低了非技术用户（如产品经理、市场人员、运营人员、销售人员、客服等）进行数据分析的门槛。
    -   **简单明了的界面：** UI设计简洁友好，专注于核心功能，用户上手速度快。

2.  **开源与成本效益：**
    -   **免费开源版本：** Metabase 有一个功能非常强大的开源版本（Open Source Edition），可以免费下载、部署和使用，这对于预算有限或初创公司尤其有吸引力。
    -   **降低 BI 总拥有成本：** 开源版本避免了昂贵的商业BI许可费用。即使是付费的企业版，其定价通常也相对传统商业BI工具更具竞争力。

3.  **快速部署与设置：**
    -   **部署灵活：** 可以非常方便地部署在自有服务器（使用Docker、JAR文件）或云平台上。设置过程相对简单快捷。
    -   **连接数据源简单：** 添加新的数据库连接通常只需要填写连接字符串和凭证。

4.  **强大的自助服务分析：**
    -   **赋能业务用户：** 核心优势在于让业务用户能够自己探索数据、回答问题，而无需每次都向数据团队提交工单，显著提高了效率和数据的时效性。这有助于培养“数据驱动”的文化。
    -   **减少数据团队负担：** 解放数据工程师和数据分析师，让他们专注于更复杂的数据建模、ETL和深度分析工作，而不是处理大量临时的、简单的数据提取请求。

5.  **足够的可视化能力：**
    -   **丰富的图表类型：** 提供常用的图表类型（线图、柱状图、条形图、饼图、散点图、漏斗图、地图、仪表盘、表格、透视表等），足以满足日常大部分分析和报告需求。
    -   **交互式仪表盘：** 可以轻松创建包含多个图表的仪表盘，并添加筛选器供用户交互式探索。

6.  **提问与搜索式分析：**
    -   **自然语言探索（开源版/企业版）：** 企业版提供了更接近自然语言的提问功能，用户可以用更口语化的方式查询数据（例如，“上个月销售额最高的产品是什么？”）。
    -   **数据浏览：** 用户可以像浏览文件目录一样浏览数据库的表和字段结构，了解有哪些数据可用。

`Metabase` 最大的优势在于它**极大地简化了非技术用户访问和分析数据的过程**，通过开源免费降低了门槛，并快速实现自助服务 `BI` 。它非常适合需要快速搭建 `BI` 平台、希望让业务用户直接参与数据分析、并且对高级企业级功能（如极其复杂的语义层、极其精细的权限控制、海量数据性能优化等）要求不是顶级的团队和组织。

如果你需要一个让公司里更多人能方便、快捷地查看和理解数据的工具， `Metabase` 是一个非常值得考虑的优秀选择。它的核心价值在于**普及数据访问和提升数据驱动的决策速度**。

## Reference

* [https://www.metabase.com/learn/metabase-basics/getting-started/ask-a-question](https://www.metabase.com/learn/metabase-basics/getting-started/ask-a-question)
* [https://github.com/metabase/metabase](https://github.com/metabase/metabase)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
