---
layout: post
title: Python爬取上市公司利润表数据：数据抓取、数据入库与数据可视化一气呵成
tags: Python, Spider, MySQL
---

## 背景

爬虫小练习：从新浪财经网站上爬取上市公司海螺水泥的利润表数据，以 `JSON` 文件与 `MySQL` 作为两种持久化方式，并实现对公司近10年的营业总收入和营业总成本的数据可视化。

eg: https://money.finance.sina.com.cn/corp/go.php/vFD_ProfitStatement/stockid/600585/ctrl/2013/displaytype/4.phtml

![2023-08-12-Table.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-Table.png)

`Python` 在爬虫和数据可视化领域有很多优势，这些优势使得它成为了首选的编程语言之一。

在爬虫方面， `Python` 具有以下优点：
1. 简单易学：`Python`语法简洁清晰，易于理解和学习，即使是初学者也能快速上手。
2. 强大的库和框架支持：`Python`拥有丰富的第三方库和框架，如`BeautifulSoup`、`Scrapy`等，这些库和框架提供了丰富的功能和工具，使得爬虫开发更加高效和便捷。
3. 多线程和异步支持：`Python`支持多线程和异步编程，这使得爬虫可以同时处理多个任务，提高了爬取效率。
4. 数据处理能力强：`Python`拥有强大的数据处理和分析库，如Pandas和NumPy，可以方便地对爬取的数据进行清洗、分析和处理。

在数据可视化方面， `Python` 也有以下优势：
1. 丰富的可视化库：`Python`拥有多个强大的可视化库，如`Matplotlib`、`Seaborn`和`Plotly`等，这些库提供了丰富的图表类型和定制选项，可以满足各种数据可视化需求。
2. 灵活性和可扩展性：`Python`的可视化库具有很高的灵活性和可扩展性，可以根据需求进行定制和扩展，满足个性化的可视化需求。
3. 与数据处理的无缝集成：`Python`的数据处理和可视化库可以无缝集成，使得数据从处理到可视化的过程更加流畅和高效。

这次实践用到的 `Python` 库如下：

* requests
* BeautifulSoup4
* json
* matplotlib
* pandas
* pymysql

## 与GPT协作编码

作为 `Python` 入门级选手，爬虫程序不太会写，就让 `GPT` 先帮我生成一个脚手架吧。

> Prompt: 爬虫获取https://money.finance.sina.com.cn/corp/go.php/vFD_ProfitStatement/stockid/600585/ctrl/2013/displaytype/4.phtml这个网页中的表格数据，保存到json文件，注意文件编码格式

![2023-08-12-GPT.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-GPT.png)

`GPT` 怕我看不懂，对于关键的代码，还贴心地加了注释。。

## 爬虫、保存为JSON、作图

为简化问题的难度，分步来处理：

1. 数据抓取：爬取原始数据，保存为JSON；
2. 数据预处理：将每一个元素的第一个值作为属性名，剩余元素作为值（便于下一步的JSON合并）；
3. 数据合并：将10年的数据合并为一个JSON。
4. 数据可视化：使用

### 数据抓取

先爬取1年的数据。

```python
import requests
from bs4 import BeautifulSoup
import json

# 发送HTTP请求获取网页内容
url = "https://money.finance.sina.com.cn/corp/go.php/vFD_ProfitStatement/stockid/600585/ctrl/2013/displaytype/4.phtml"
response = requests.get(url)
html_content = response.text

# 使用BeautifulSoup解析HTML内容
soup = BeautifulSoup(html_content, "html.parser")

# 找到表格元素
table = soup.find("table", {"id": "ProfitStatementNewTable0"})

# 提取表格数据
data = []
for row in table.find_all("tr"):
    row_data = []
    for cell in row.find_all("td"):
        row_data.append(cell.text.strip())
    # 过滤掉空行
    if len(row_data) != 0:
        data.append(row_data)
    print(data)

# 将JSON数据保存到文件
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
```

![2023-08-12-DataRaw.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-DataRaw.jpg)

10年的数据，无非就是外层来个循环。

```python
import requests
from bs4 import BeautifulSoup
import json

# 近10年的利润表
years = 10
for i in range(years):
    # 发送HTTP请求获取网页内容
    url = "https://money.finance.sina.com.cn/corp/go.php/vFD_ProfitStatement/stockid/600585/ctrl/{}/displaytype/4.phtml".format(2013 + i)
    response = requests.get(url)
    html_content = response.text

    # 使用BeautifulSoup解析HTML内容
    soup = BeautifulSoup(html_content, "html.parser")

    # 找到表格元素
    table = soup.find("table", {"id": "ProfitStatementNewTable0"})

    # 提取表格数据
    data = []
    for row in table.find_all("tr"):
        row_data = []
        for cell in row.find_all("td"):
            row_data.append(cell.text.strip())
        # 过滤掉空行与不完整的数据行
        if len(row_data) > 1:
            data.append(row_data)
        print(data)

    # 将JSON数据保存到文件
    with open("data-{}.json".format(2013 + i), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
```

### 数据预处理

将每一年的数据，转换为 `JSON` 格式的 `key:value` 形式，方便后续的合并操作。

```python
import json

# 循环读取JSON文件
years = 10
for i in range(years):
    with open('data-{}.json'.format(2013+i), 'r', encoding="utf-8") as f:
        first_data = json.load(f)

    result = {}
    for item in first_data:
        # 转换：将每一个元素的第一个值作为属性名，剩余元素作为值
        result.update([(item[0], item[1:])])

        # 将数据保存为JSON格式
        json_data = json.dumps(result)

        # 将JSON数据保存到文件
        with open("data-transform-{}.json".format(2013 + i), "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False)
```

![2023-08-12-DataTransformed.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-DataTransformed.jpg)

### 数据合并

将预处理后10年的数据合并为一个大的 `JSON` 文件。

```python
import json

# 循环读取合并JSON文件
years = 10
merged_data = {}
transformed = {}
for i in range(years):
    with open('data-transform-{}.json'.format(2013+i), 'r', encoding="utf-8") as f:
        first_data = json.load(f)
        transformed[2013 + i] = first_data
        merged_data = {**merged_data, **transformed}
        
# 将合并后的JSON文件写入磁盘
with open('data-merged.json', 'w', encoding="utf-8") as f:
    json.dump(merged_data, f, indent=4, ensure_ascii=False)
```

### 数据可视化

获取 `JSON` 数据中海螺水泥公司近10年的营业收入与营业成本数据，使用 `matplotlib` 绘制折线图与柱状图。如果需要做大屏可视化，可以使用[AJ-Report开源数据可视化引擎入门实践](https://blog.csdn.net/u013810234/article/details/131993889)。

```python
import json
import matplotlib.pyplot as plt

with open('data-merged.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
x_data = []
y1_data = []
y2_data = []
for key,value in data.items():
    # print(key)
    print(float(data[key]['营业收入'][0].replace(',', '')))
    print()
    print(float(data[key]['营业成本'][0].replace(',', '')))

    x_data.append(key)
    y1_data.append(float(data[key]['营业收入'][0].replace(',', '')))
    y2_data.append(float(data[key]['营业成本'][0].replace(',', '')))

plt.rcParams['font.sans-serif']=['SimHei']
plt.rcParams['axes.unicode_minus']=False

plt.bar(x_data,y1_data, label='营业收入')
plt.plot(x_data,y2_data, label='营业成本', color='cyan', linestyle='--')
plt.title('海螺水泥近10年营业收入与营业成本')
plt.xlabel('年份')
plt.ylabel('营业收入与营业成本/万元')

# 关闭纵轴的科学计数法
axis_y = plt.gca()
axis_y.ticklabel_format(axis='y', style='plain')

# 图例
plt.legend()

# 显示图表
plt.show()
```

![2023-08-12-Chart.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-Chart.jpg)

## 爬虫、写库

### 数据表设计（仅部分字段）

根据我们看到网页中的实际表格进行数据表设计。

![2023-08-12-MySQLTable.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-MySQLTable.jpg)

```sql
CREATE TABLE `b_profit_test` (
	`id` BIGINT(20) NOT NULL AUTO_INCREMENT COMMENT '主键',
	`company_id` BIGINT(20) NOT NULL DEFAULT '0' COMMENT '公司ID',
	`total_operating_income` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '一、营业总收入',
	`operating_income` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '营业收入',
	`total_operating_cost` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '二、营业总成本',
	`operating_cost` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '营业成本',
	`taxes_and_surcharges` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '营业税金及附加',
	`sales_expense` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '销售费用',
	`management_costs` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '管理费用',
	`financial_expenses` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '财务费用',
	`rd_expenses` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '研发费用',
	`operating_profit` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '三、营业利润',
	`net_profit` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '五、净利润',
	`basic_earnings_per_share` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '基本每股收益',
	`diluted_earnings_per_share` DECIMAL(15,2) NOT NULL DEFAULT '0.00' COMMENT '稀释每股收益',
	`report_period` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '报告期' COLLATE 'utf8_general_ci',
	`date` DATE NULL DEFAULT NULL COMMENT '日期',
	PRIMARY KEY (`id`) USING BTREE
)
COMMENT='利润表测试'
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;
```

### 数据爬取与数据存储

与上面爬虫的方式不同，这里使用 `pandas` 的 `read_html` 方法直接获取网页中的表格数据，这里注意目标表格的编号，需要到浏览器做检查与定位。

以单个链接为例，爬虫的结果为一个二维表格，通过转置、将第一行设置为 `header` 、替换列名（方便与数据表字段对应）、删除整行都为 `NaN` 的行、单个 `NaN` 替换为0等一系列的数据预处理操作后，直接连接 `MySQL` 数据库完成数据落库。

![2023-08-12-Notebook.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-Notebook.png)

```python
import pandas as pd
import pymysql

# 爬虫获取网页中的表格，注意这里的参数13，与实际的网页中表格有关
df=pd.read_html('https://money.finance.sina.com.cn/corp/go.php/vFD_ProfitStatement/stockid/600585/ctrl/2013/displaytype/4.phtml')[13]

# 可在Jupyter Notebook中直接查看整个表格
df.head(32)

# 预处理
df = df.transpose() # 转置，方便处理
df = df.rename(columns=df.iloc[0]).drop(df.index[0]) # 将第一行设置为header
df.rename(columns={'报表日期': 'report_period', '一、营业总收入': 'total_operating_income','营业收入': 'operating_income','二、营业总成本': 'total_operating_cost','营业成本': 'operating_cost','营业税金及附加': 'taxes_and_surcharges','销售费用': 'sales_expense','管理费用': 'management_costs','财务费用': 'financial_expenses','三、营业利润': 'operating_profit','五、净利润': 'net_profit','基本每股收益(元/股)': 'basic_earnings_per_share','稀释每股收益(元/股)': 'diluted_earnings_per_share'},inplace=True)
df.dropna(axis=0, how='all', inplace=True) # 删除整行都为NaN的行
df.fillna(0, inplace=True) # 单个NaN替换为0

# 写库
conn = pymysql.connect(
    user = 'root',
    host = 'localhost',
    password= 'root',
    db = 'financial-statement',
    port = 3306,
)

cur = conn.cursor()
for index, row in df.iterrows():
    # print(index) # 输出每行的索引值
    # print(row) # 输出每行的索引值

    sql = "insert into b_profit_test(report_period, total_operating_income, operating_income, total_operating_cost, operating_cost, taxes_and_surcharges, sales_expense, management_costs, financial_expenses, operating_profit, net_profit, basic_earnings_per_share, diluted_earnings_per_share) values ('" + str(row['report_period']) + "'," + str(row['total_operating_income']) + ',' + str(row['operating_income']) + ',' + str(row['total_operating_cost']) + ',' + str(row['operating_cost']) + ',' + str(row['taxes_and_surcharges']) + ',' + str(row['sales_expense']) + ',' + str(row['management_costs']) + ',' + str(row['financial_expenses']) + ',' + str(row['operating_profit']) + ','  + str(row['net_profit']) + ',' + str(row['basic_earnings_per_share']) + ',' + str(row['diluted_earnings_per_share']) + ');'
    print(sql)
    cur.execute(sql)
conn.commit()
cur.close()
conn.close()
```

![2023-08-12-MySQLData.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2023-08-12-MySQLData.jpg)

完成了数据的落库，后续就任由我们发挥了：数据建模、数据分析、数据可视化。。

## 小总结

综上，我们通过 `Python` 爬取上市公司利润表数据：数据抓取、数据入库与数据可视化一气呵成，体验了 `Python` 在爬虫和数据可视化方面具有简单易学、强大的库和框架支持、多线程和异步支持、数据处理能力强等优势。

---

**If you have any questions or any bugs are found, please feel free to contact me.**
**Your comments and suggestions are welcome!**
