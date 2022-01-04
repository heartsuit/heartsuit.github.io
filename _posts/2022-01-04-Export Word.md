---
layout: post
title: 导出文件：使用lowagie.itext导出数据为Word文件
tags: SpringBoot
---

### 背景

日常工作中，曾遇到过导出数据为 `Word` 的需求，这里做个简单总结。

前面分别总结了导出数据为 [PDF](https://blog.csdn.net/u013810234/article/details/122279213?spm=1001.2014.3001.5501) ， [Excel](https://blog.csdn.net/u013810234/article/details/122290545?spm=1001.2014.3001.5501) 的实现方式，有时候需要在导出文件后进行编辑，那么这时候仅仅导出 `PDF` 文件是不够的。

下面的实战是基于之前导出数据库表结构为 `Word` 用到的，后面有 [一键导出PostgreSQL数据库表设计为word文档](https://blog.csdn.net/u013810234/article/details/117751842?spm=1001.2014.3001.5501) 的实战代码链接。

涉及的技术有： `SpringBoot` 、 `MyBatis` 、 `lowagie.itext` 。

### 依赖

```xml
<!--输出word包start-->
<!-- https://mvnrepository.com/artifact/com.lowagie/itext -->
<dependency>
    <groupId>com.lowagie</groupId>
    <artifactId>itext</artifactId>
    <version>2.1.7</version>
</dependency>
<!-- https://mvnrepository.com/artifact/com.itextpdf/itext-asian -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext-asian</artifactId>
    <version>5.2.0</version>
</dependency>
<!-- https://mvnrepository.com/artifact/com.lowagie/itext-rtf -->
<dependency>
    <groupId>com.lowagie</groupId>
    <artifactId>itext-rtf</artifactId>
    <version>2.1.7</version>
</dependency>
<!--输出word包end-->
```

### 核心导出接口

```java
@Service
public class DataSourceDetailServiceImpl implements DataSourceDetailService {
    @Autowired
    private DataSourceMapper dataSourceMapper;

    @Override
    public List<Map<String, Object>> getDataSourceDetail(String tableName) {
        return dataSourceMapper.getDataDetail(tableName);
    }

    @Override
    public List<Map<String, Object>> getAllDataSourceName(String dbName) {
        return dataSourceMapper.getAllDataSourceName(dbName);
    }

    @Override
    public void toWord(List<Map<String, Object>> listAll) throws FileNotFoundException, DocumentException {
        // 创建word文档,并设置纸张的大小
        Document document = new Document(PageSize.A4);
        // 创建word文档
        RtfWriter2.getInstance(document, new FileOutputStream("D:/data/dbDetail.doc"));
        document.open();// 设置文档标题
        Paragraph ph = new Paragraph();
        Font f = new Font();
        Paragraph p = new Paragraph("数据库表设计文档", new Font(Font.NORMAL, 24, Font.BOLDITALIC, new Color(0, 0, 0)));
        p.setAlignment(1);
        document.add(p);
        ph.setFont(f);/* * 创建表格 通过查询出来的表遍历 */
        for (int i = 0; i < listAll.size(); i++) {
            // 表名
            String table_name = (String) listAll.get(i).get("table_name");
            // 表说明
            String table_comment = (String) listAll.get(i).get("table_comment");
            //获取某张表的所有字段说明
            List<Map<String, Object>> list = this.getDataSourceDetail(table_name);
            //构建表说明
            String all = "" + (i + 1) + " 表名：" + table_name + " " + table_comment + "";
//            String all = "" + " 表名：" + table_name + " " + table_comment + "";
            //创建有6列的表格
            Table table = new Table(6);
            document.add(new Paragraph(""));
            table.setBorderWidth(1);
            // table.setBorderColor(Color.BLACK);
            table.setPadding(0);
            table.setSpacing(0);
            /*
             * 添加表头的元素，并设置表头背景的颜色
             */
            Color chade = new Color(176, 196, 222);
            Cell cell = new Cell("序号");// 单元格
//            cell.setBackgroundColor(chade);
            cell.setHeader(true);
            // cell.setColspan(3);//设置表格为三列
            // cell.setRowspan(3);//设置表格为三行
            table.addCell(cell);
            cell = new Cell("字段名");// 单元格
//            cell.setBackgroundColor(chade);
            table.addCell(cell);
            cell = new Cell("类型");// 单元格
//            cell.setBackgroundColor(chade);
            table.addCell(cell);
            cell = new Cell("是否为空");// 单元格
//            cell.setBackgroundColor(chade);
            table.addCell(cell);
            cell = new Cell("主键");// 单元格
//            cell.setBackgroundColor(chade);
            table.addCell(cell);
            cell = new Cell("字段说明");// 单元格
//            cell.setBackgroundColor(chade);
            table.addCell(cell);
            table.endHeaders();// 表头结束
            // 表格的主体，
            for (int k = 0; k < list.size(); k++) {
                //获取某表每个字段的详细说明
                String Field = (String) list.get(k).get("Field");
                String Type = (String) list.get(k).get("Type");
                String Null = (String) list.get(k).get("Null");
                String Key = (String) list.get(k).get("Key");
                String Comment = (String) list.get(k).get("Comment");
                table.addCell((k + 1) + "");
                table.addCell(Field);
                table.addCell(Type);
                table.addCell(Null);
                table.addCell(Key);
                table.addCell(Comment);
            }
            Paragraph pheae = new Paragraph(all);
            //写入表说明
            document.add(pheae);
            //生成表格
            document.add(table);
        }
        document.close();
    }
}
```

### 导出效果

![2021-06-09-ExportPostgreSQL.png](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2021-06-09-ExportPostgreSQL.png)

### Source Code

完整源码见 `GitHub` ：[https://github.com/heartsuit/db2word](https://github.com/heartsuit/db2word)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
