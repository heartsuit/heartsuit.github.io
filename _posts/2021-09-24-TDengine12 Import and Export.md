---
layout: post
title: 12-TDengine数据迁移：导入与导出
tags: TDengine
---

## 背景

对于数据库的运维，免不了数据迁移，对数据库表进行导入与导出； `TDengine` 官方提供了各类数据导入、导出方式。

下面就体验下不同的导入、导出方法。

* 数据导出：
    - taosdump
    - csv

* 数据导入：
    - source
    - csv
    - taosdump

## 数据导出

### 数据导出：taosdump

* taosdump主要参数含义：
    -o：指定输出文件的路径。文件会自动生成。

    -u：用户名。

    -p：密码。

    -A：指示导出所有数据库的数据。

    -D：表示指定数据库。

    -i：表示输入目录。

    -s：表示导出schema。

    -t：指定导入到一个文件的表的个数。该参数可以控制输出文件的大小。

    -B：指定一条import语句中包含记录的条数。注意：不要让sql语句超过64k，否则后续导入会出错。该参数为了后续导入时，提高导入速率。

    -T： 指定导出数据时，启动的线程数。建议设置成机器上core的2倍。 

* 实际中一般不会导出所有库，就不测试这种方式了。

```
./bin/taosdump -o ./dump -A -t 500 -B 100 -T 8
```

* 导出指定数据库的数据，可指定多个库，以空格分隔

```bash
# 不指定输出目录
./bin/taosdump -D ok -t 500 -B 100 -T 8

# 指定输出目录
./bin/taosdump -o ./dump -D ok -t 500 -B 100 -T 8

# 导出结果
[root@hadoop1 dump]# tree
.
├── dbs.sql
├── ok.tables.0.sql
└── ok.tables.1.sql
```

Notes: 
* 若不指定输出路径，则默认导出至当前目录；
* 若指定了输出目录，则目录需要提前创建好；

导出的文件包括：
1. 一个dbs.sql文件，内容为导出的数据库、超级表创建语句；
2. 若干个XXX_tables.N.sql文件，文件名的规则：XXX是数据库名称，N是数字，从0开始递增，内容为数据表建表语句、插入语句；

![2021-09-24-AllContent.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-24-AllContent.jpg)

* 导出指定数据库中指定表的数据，可指定多个表，以空格分隔

```
./bin/taosdump -o ./dump ok device2 -t 500 -B 100 -T 8
```

![2021-09-24-TableContent.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-24-TableContent.jpg)

* 导出指定数据库的schema

```
./bin/taosdump -o ./dump -D ok -t 500 -s -T 8
```

![2021-09-24-Schema.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-24-Schema.jpg)

* 导出所有数据库的schema

```
./bin/taosdump -o ./dump -A -t 500 -s -T 8
```

### 数据导出：导出CSV

```
select * from ok.power >> data.csv
```

Note：
1. 以上是导出所有子表数据到一个csv文件，如果后续需要通过csv文件导入，应按照子表进行查询导出，然后再导入；或者采用taosdump导出。
2. 未指定路径的导出，默认在当前目录下；下载到本地后，是`Windows`操作系统，`csv`格式的文件默认关联`Excel`打开，打开之后，中文乱码。

![2021-09-24-Charset.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-24-Charset.jpg)

这个不是 `TDengine` 的 `bug` ，因为通过文本文件打开是正常的，另存为 `ANSI` 编码后，在 `Excel` 中打开中文正常显示。

![2021-09-24-Excel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-24-Excel.jpg)

## 数据导入

### 数据导入：source

这种方式类似于批量执行 `SQL` 语句，比如以下 `SQL` 语句构成的文件：data.sql

```sql
create database if not exists ok;

USE ok;

create stable if not exists power(ts timestamp, voltage int, current float, temperature float) tags(sn int, city nchar(64), groupid int);

create table if not exists device1 using power tags(1, "太原", 1);
create table if not exists device2 using power tags(2, "西安", 2);

insert into device1 values("2021-09-04 21:03:38.734", 1, 1.0, 1.0);
insert into device2 values("2021-09-04 21:03:40.734", 2, 2.0, 2.0);
```

```
taos> source "/usr/local/taos/data.sql";
```

![2021-09-24-Source.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-09-24-Source.jpg)

### 数据导入：导入CSV

当导入单个子表数据时可采用这种方式， `data.csv` 文件内容如下：

```csv
'2021-09-04 21:03:38.734',1,1.00000,1.00000,1,'太原',1
'2021-09-05 23:05:11.138',225,9.47500,13.52135,1,'太原',1
'2021-09-05 23:05:41.138',208,6.44464,0.99233,1,'太原',1
```

```bash
taos> insert into ok.device1 file '/usr/local/taos/data.csv';
Query OK, 3 of 3 row(s) in database (0.002303s)
```

Note：

1. 此处应按照子表进行导入，即csv文件中的数据应只属于一张表，当然csv数据应与数据表结构一致；
2. csv文件中应仅包含数据（即要求去掉表头），如果CSV文件首行存在描述信息，请手动删除后再导入。如某列为空，填NULL，无引号。

### 数据导入：taosdump

实际中更多的采用这种方式完成数据迁移：先导出→压缩→传输至其他主机上→解压→导入→完成。

```bash
# -i 表示输入文件的目录
[root@hadoop1 taos]# ./bin/taosdump -i ./dump -T 8
====== arguments config ======
host: (null)
user: root
password: taosdata
port: 0
mysqlFlag: 0
outpath: 
inpath: ./dump
resultFile: ./dump_result.txt
encode: (null)
all_databases: false
databases: 0
schemaonly: false
with_property: true
avro format: false
start_time: -9223372036854775807
end_time: 9223372036854775807
precision: ms
data_batch: 1
max_sql_len: 65480
table_batch: 1
thread_num: 8
allow_sys: 0
abort: 0
isDumpIn: 1
arg_list_len: 0
debug_print: 0
==============================

start to dispose 3 files in ./dump
Success Open input file: ./dump/dbs.sql
, Success Open input file: ./dump/ok.tables.0.sql
, Success Open input file: ./dump/ok.tables.1.sql
```

导入完成。

### taosdump参数列表

可通过 `help` 参数，查看 `taosdump` 主要参数说明；

```bash
[root@hadoop1 taos]# ./bin/taosdump --help
Usage: taosdump [OPTION...] dbname [tbname ...]
  or:  taosdump [OPTION...] --databases dbname ...
  or:  taosdump [OPTION...] --all-databases
  or:  taosdump [OPTION...] -i inpath
  or:  taosdump [OPTION...] -o outpath

  -h, --host=HOST            Server host dumping data from. Default is
                             localhost.
  -p, --password             User password to connect to server. Default is
                             taosdata.
  -P, --port=PORT            Port to connect
  -q, --mysqlFlag=MYSQLFLAG  mysqlFlag, Default is 0
  -u, --user=USER            User name used to connect to server. Default is
                             root.
  -c, --config-dir=CONFIG_DIR   Configure directory. Default is
                             /etc/taos/taos.cfg.
  -e, --encode=ENCODE        Input file encoding.
  -i, --inpath=INPATH        Input file path.
  -o, --outpath=OUTPATH      Output file path.
  -r, --resultFile=RESULTFILE   DumpOut/In Result file path and name.
  -a, --allow-sys            Allow to dump sys database
  -A, --all-databases        Dump all databases.
  -D, --databases            Dump assigned databases
  -N, --without-property     Dump schema without properties.
  -s, --schemaonly           Only dump schema.
  -v, --avro                 Dump apache avro format data file. By default,
                             dump sql command sequence.
  -B, --data-batch=DATA_BATCH   Number of data point per insert statement. Max
                             value is 32766. Default is 1.
  -L, --max-sql-len=SQL_LEN  Max length of one sql. Default is 65480.
  -t, --table-batch=TABLE_BATCH   Number of table dumpout into one output file.
                             Default is 1.
  -T, --thread_num=THREAD_NUM   Number of thread for dump in file. Default is
                             5.
  -S, --start-time=START_TIME   Start time to dump. Either epoch or
                             ISO8601/RFC3339 format is acceptable. ISO8601
                             format example: 2017-10-01T00:00:00.000+0800 or
                             2017-10-0100:00:00:000+0800 or '2017-10-01
                             00:00:00.000+0800'
  -E, --end-time=END_TIME    End time to dump. Either epoch or ISO8601/RFC3339
                             format is acceptable. ISO8601 format example:
                             2017-10-01T00:00:00.000+0800 or
                             2017-10-0100:00:00.000+0800 or '2017-10-01
                             00:00:00.000+0800'
  -C, --precision=PRECISION  Specify precision for converting human-readable
                             time to epoch. Valid value is one of ms, us, and
                             ns. Default is ms.
  -g, --debug                Print debug info.
  -?, --help                 Give this help list
      --usage                Give a short usage message
  -V, --version              Print program version
```

### Reference

* [https://www.taosdata.com/cn/documentation/administrator#import](https://www.taosdata.com/cn/documentation/administrator#import)
* [https://www.taosdata.com/blog/2020/03/09/1334.html](https://www.taosdata.com/blog/2020/03/09/1334.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
