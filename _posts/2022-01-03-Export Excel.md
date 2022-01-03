---
layout: post
title: 导出文件：使用Hutool导出数据为Excel文件
tags: SpringBoot
---

### 背景

日常工作中，曾遇到过导出数据为 `Excel` 的需求，这里做个简单总结。

相对于导出文件为 `PDF` 或者 `Word` ，导出 `Excel` 相对更常用。

在实际中，遇到有的项目中使用前端插件导出 `Excel` 的方式，当数据量比较大时，对客户端要求比较高，导出很慢，影响用户体验。另外一种是今天这里介绍的后端直接查询、封装、导出为 `Excel` 文件。

涉及的技术有： `SpringBoot` 、 `MyBatis` 、 `hutool` ，使用 `hutool` 工具导出数据为 `Excel` 。

### 依赖

```xml
<dependency>
    <groupId>cn.hutool</groupId>
    <artifactId>hutool-all</artifactId>
    <version>5.5.6</version>
</dependency>

<!--Export as Excel-->
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>4.1.1</version>
</dependency>
```

### 核心导出接口

```java
/**
 * @Author Heartsuit
 * @Date 2021-08-09
 */
@RestController
@RequestMapping("employee")
public class EmployeeController {
    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    /**
     * 导出全量数据，实际一般为条件检索后导出
     * @param response
     * @throws IOException
     */
    @GetMapping("export-xls")
    public void exportExcel(HttpServletResponse response) throws IOException, ClassNotFoundException {
        ExcelWriter writer = ExcelUtil.getWriter();
        List<Employee> employees = employeeService.findAll();

        List<Map<String, Object>> rows = employees.stream().map(item -> {
            Map<String, Object> maps = new HashMap<>();
            maps.put("id", item.getId().toString());
            maps.put("name", item.getName());
            maps.put("age", item.getAge());
            maps.put("phone", item.getPhone());
            maps.put("createTime", item.getCreateTime().toString());
            return maps;
        }).collect(Collectors.toList());

        // Title
        int columns = Class.forName("com.heartsuit.springbootmybatis.oa.entity.Employee").getDeclaredFields().length;
        writer.merge(columns - 1, "员工信息");

        // Header
        writer.addHeaderAlias("id", "ID");
        writer.addHeaderAlias("name", "姓名");
        writer.addHeaderAlias("age", "年龄");
        writer.addHeaderAlias("phone", "电话");
        writer.addHeaderAlias("createTime", "时间");

        // Body
        writer.setColumnWidth(0, 30);
        writer.setColumnWidth(1, 30);
        writer.setColumnWidth(2, 30);
        writer.setColumnWidth(3, 30);
        writer.setColumnWidth(4, 30);
        writer.write(rows, true);

        response.setContentType("application/vnd.ms-excel;charset=utf-8");
        response.setHeader("Content-disposition", "attachment; filename=" + URLEncoder.encode("员工信息表-" + DateUtil.today() + ".xls", "utf-8"));

        ServletOutputStream out = response.getOutputStream();
        writer.flush(out, true);
        writer.close();
        IoUtil.close(out);
    }
}
```

### 测试接口：全量导出

GET http://localhost:8000/employee/export-xls

Note: 这里使用 `GET` 方式，方便测试，实际建议 `POST` 。

### 测试1万条数据导出效率

* 批量向数据表插入数万条数据，再次测试导出效率；
* 其实，导出时间取决于查效率以及查出的总数据量（涉及写入Excel以及Excel传输两部分时间）；

批量写入数据接口：

```java
@Test
void insertBatch() {
    SqlSessionFactory sqlSessionFactory = sqlSessionTemplate.getSqlSessionFactory();

    //可以执行批量操作的sqlSession, try...with...
    try (SqlSession openSession = sqlSessionFactory.openSession(ExecutorType.BATCH)) {
        long start = System.currentTimeMillis();
        EmployeeMapper mapper = openSession.getMapper(EmployeeMapper.class);
        for (int i = 0; i < 10000; i++) {
            Employee employee = new Employee();
            employee.setName(UUID.randomUUID().toString().substring(0, 6));
            employee.setAge(new Random().nextInt(100));
            employee.setPhone(MobileNumber.generate(0));
            mapper.save(employee);
        }
        openSession.commit();
        long end = System.currentTimeMillis();
        System.out.println("执行时长" + (end - start));
    }
}
```

从数万条记录中导出1万条数据，秒级。

### 导出效果

![2022-01-03-ExportExcel.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-01-03-ExportExcel.jpg)

### Source Code

完整源码见 `GitHub` ：[https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-mybatis](https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-mybatis)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
