---
layout: post
title: 全栈开发之Quartz分布式定时任务调度集群
tags: SpringBoot, Quartz
---

### 背景

我们一个单体项目中有个定时任务，每隔一个小时会从各业务表中查询并计算不同用户的得分、排名，是使用 `Quartz` 实现的；这在后来进行横向扩展为多实例集群部署时，遇到了问题：定时任务在多个应用实例中**重复执行**了，显然这不是我们期望的结果，同时对计算资源来说也是一种浪费，更为严重的是会导致一段时间内数据的不一致问题，这时便涉及到集群环境下定时任务的**幂等性**问题。

### 定时任务

关于定时任务的实现，可通过 `Spring` 的 `@EnableScheduling` ， `quartz` ， `xxl-job` , `elastic-job` 等各种方案实现。我们一开始选了 `Quartz` 来实现定时任务，下面主要介绍下 `Quartz` 定时任务分布式集群服务的搭建。

### 分布式集群任务调度

如何解决分布式任务调度幂等性问题？一般有以下方案可以选：

1. 配置文件，开关标识，flag；单点
2. 分布式锁，ZooKeeper，Redis；复杂
3. 定时任务解耦，独立部署；单点，应以负载均衡的方式执行

此时，我们需要一种简单、直接、有效的方式，可以通过 `Quartz` 的集群解决，**使得无论集群中有多少应用实例，定时任务只会触发一次**。

虽然单个 `Quartz` 实例已经具备很好的任务调度能力，但它不能满足典型的企业需求，如可伸缩性、高可用性。如果你需要故障转移的能力并能运行日益增多的任务， `Quartz` 集群势必成为你应用的一部分了。

使用 `Quartz` 的集群能力可以更好的支持你的业务需求，并且即使是其中一台机器在最糟的时间崩溃了也能确保所有的任务得到执行。

Note：***不像许多应用服务的集群，独立的 `Quartz` 节点并不与另一其的节点或是管理节点通信。 `Quartz` 应用是通过数据库表来感知到另一应用的。***

### 数据表

`Quartz` 官方提供了11张数据表（我们这里使用innodb的SQL文件），表结构信息可在IDEA里的外部依赖中找到（Tip：也可在IDEA中直接双击Shift，输入tables_mysql_innodb即可快速定位到这个SQL文件；也可直接从文章末尾复制SQL）：

> .m2\repository\org\quartz-scheduler\quartz\2.3.2\quartz-2.3.2.jar!\org\quartz\impl\jdbcjobstore\tables_mysql_innodb.sql

* 11张表名

```sql
DROP TABLE IF EXISTS QRTZ_FIRED_TRIGGERS; 
DROP TABLE IF EXISTS QRTZ_PAUSED_TRIGGER_GRPS; 
DROP TABLE IF EXISTS QRTZ_SCHEDULER_STATE; 
DROP TABLE IF EXISTS QRTZ_LOCKS; 
DROP TABLE IF EXISTS QRTZ_SIMPLE_TRIGGERS; 
DROP TABLE IF EXISTS QRTZ_SIMPROP_TRIGGERS; 
DROP TABLE IF EXISTS QRTZ_CRON_TRIGGERS; 
DROP TABLE IF EXISTS QRTZ_BLOB_TRIGGERS; 
DROP TABLE IF EXISTS QRTZ_TRIGGERS; 
DROP TABLE IF EXISTS QRTZ_JOB_DETAILS; 
DROP TABLE IF EXISTS QRTZ_CALENDARS; 
```

* 11张表说明
```
序号   | 表名                   | 说明                             |
-------| -----------------------| ---------------------------------|
1      |QRTZ_CALENDARS    |存储Quartz日历信息|
2      |QRTZ_CRON_TRIGGERS      |存放Cron类型的Trigger，包括Cron表达式和时区信息|
3      |QRTZ_FIRED_TRIGGERS      |存储与已触发的Trigger相关的状态信息，以及相联Job的执行信息|
4      |QRTZ_PAUSED_TRIGGER_GRPS    |存储已暂停的Trigger组的信息|
5      |QRTZ_SCHEDULER_STATE    |存储少量的Scheduler相关的状态信息|
6      |QRTZ_LOCKS      |存储锁信息，为多个节点调度提供分布式锁，实现分布式调度，默认有2个锁: STATE_ACCESS, TRIGGER_ACCESS|
7      |QRTZ_JOB_DETAILS      |存储每一个已配置的JobDetail信息|
8      |QRTZ_SIMPLE_TRIGGERS    |存储Simple类型的Trigger，包括重复次数、间隔、以及已触的次数|
9      |QRTZ_BLOG_TRIGGERS    |以Blob类型存储的Trigger|
10      |QRTZ_TRIGGERS      |存储已配置的Trigger的基本信息|
11      |QRTZ_SIMPROP_TRIGGERS      |存储CalendarIntervalTrigger和DailyTimeIntervalTrigger两种类型的触发器|
```
11张表的详细信息，参考：https://blog.csdn.net/xiaoniu_888/article/details/83181078

Note：cron方式需要用到的4张数据表：QRTZ_TRIGGERS，QRTZ_CRON_TRIGGERS，QRTZ_FIRED_TRIGGERS，QRTZ_JOB_DETAILS。

### 配置文件

```yaml
spring:
  datasource:
    type: com.alibaba.druid.pool.DruidDataSource
    driverClassName: com.mysql.cj.jdbc.Driver
    druid:
      url: jdbc:mysql://192.168.100.114:3306/quartz_task?serverTimezone=Asia/Shanghai&characterEncoding=UTF-8&useSSL=false
      username: root
      password: root
  quartz:
    job-store-type: jdbc
    properties:
      org:
        quartz:
          jobStore:
            class: org.quartz.impl.jdbcjobstore.JobStoreTX
            clusterCheckinInterval: 10000
            driverDelegateClass: org.quartz.impl.jdbcjobstore.StdJDBCDelegate
            isClustered: true
            tablePrefix: QRTZ_
            useProperties: false
          scheduler:
            instanceId: AUTO
            instanceName: clusteredScheduler
          threadPool:
            class: org.quartz.simpl.SimpleThreadPool
            threadCount: 10
            threadPriority: 5
            threadsInheritContextClassLoaderOfInitializingThread: true
```

主要配置项说明：

* org.quartz.scheduler.instanceName属性可为任何值，用在JDBC JobStore中来唯一标识实例，但是所有集群节点中必须相同。
* org.quartz.scheduler.instanceId属性为AUTO即可，基于主机名和时间戳来产生实例ID。
* org.quartz.jobStore.class属性为JobStoreTX，将任务持久化到数据中。因为集群中节点依赖于数据库来传播 Scheduler 实例的状态，你只能在使用 JDBC JobStore 时应用 `Quartz` 集群。这意味着你必须使用JobStoreTX或是JobStoreCMT作为Job存储；你不能在集群中使用RAMJobStore。
* org.quartz.jobStore.isClustered属性为true，你就告诉了Scheduler实例要它参与到一个集群当中。这一属性会贯穿于调度框架的始终，用于修改集群环境中操作的默认行为。
* org.quartz.jobStore.clusterCheckinInterval属性定义了Scheduler实例检入到数据库中的频率(单位：毫秒)。Scheduler检查是否其他的实例到了它们应当检入的时候未检入；这能指出一个失败的Scheduler实例，且当前Scheduler会以此来接管任何执行失败并可恢复的Job。通过检入操作，Scheduler也会更新自身的状态记录。clusterCheckinInterval越小，Scheduler节点检查失败的Scheduler实例就越频繁。默认值是15000(即15秒)。

### 任务管理

要实现 `Quartz` 定时任务分布式集群服务，核心的数据表以及配置文件便足够了；此外，为方便任务管理，我们在项目中还实现了 `RESTful` 风格的任务管理接口：

![2022-02-12-QuartzPostMan.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-QuartzPostMan.jpg)

* 添加任务：http://localhost:8080/job/create
* 修改任务：http://localhost:8080/job/update
* 暂停任务：http://localhost:8080/job/pause
* 恢复任务：http://localhost:8080/job/resume
* 删除任务：http://localhost:8080/job/delete
* 获取任务列表：http://localhost:8080/job/list

### 服务层核心代码

* 添加任务

```java
    /**
     * 添加cron表达式任务
     *
     * @param info
     */
    public void addCronJob(TaskInfo info) {
        String jobName = info.getJobName();
        String jobClassName = info.getJobClassName();
        String jobGroupName = info.getJobGroupName();
        String jobDescription = info.getJobDescription();
        String cronExpression = info.getCronExpression();
        Date createTime = new Date();
        JobDataMap dataMap = new JobDataMap();
        if (info.getData() != null) {
            dataMap.putAll(info.getData());
        }
        dataMap.put("createTime", createTime);
        try {
            if (checkExists(jobName, jobGroupName)) {
                throw new CustomException(String.format("任务已存在, jobName:[%s],jobGroup:[%s]", jobName, jobGroupName));
            }
            TriggerKey triggerKey = TriggerKey.triggerKey(jobName, jobGroupName);
            JobKey jobKey = JobKey.jobKey(jobName, jobGroupName);
            CronScheduleBuilder schedBuilder = CronScheduleBuilder
                    .cronSchedule(cronExpression)
                    .withMisfireHandlingInstructionDoNothing();
            CronTrigger trigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .withSchedule(schedBuilder).build();

            Class<? extends Job> clazz = (Class<? extends Job>) Class
                    .forName(jobClassName);
            JobDetail jobDetail = JobBuilder.newJob(clazz).withIdentity(jobKey)
                    .withDescription(jobDescription).usingJobData(dataMap).build();
            scheduler.scheduleJob(jobDetail, trigger);
            log.info("任务: {} 添加成功", jobName);
        } catch (SchedulerException | ClassNotFoundException e) {
            throw new CustomException("任务添加失败");
        }
    }
```

* 修改任务

```java
    /**
     * 修改定时任务
     *
     * @param info
     */
    public void editCronJob(TaskInfo info) {
        String jobName = info.getJobName();
        String jobGroupName = info.getJobGroupName();
        String jobDescription = info.getJobDescription();
        String cronExpression = info.getCronExpression();
        JobDataMap dataMap = new JobDataMap();
        if (info.getData() != null) {
            dataMap.putAll(info.getData());
        }
        try {
            if (!checkExists(jobName, jobGroupName)) {
                throw new CustomException(
                        String.format("Job不存在, jobName:{%s},jobGroup:{%s}", jobName, jobGroupName));
            }
            TriggerKey triggerKey = TriggerKey.triggerKey(jobName, jobGroupName);
            JobKey jobKey = new JobKey(jobName, jobGroupName);
            CronScheduleBuilder cronScheduleBuilder = CronScheduleBuilder
                    .cronSchedule(cronExpression)
                    .withMisfireHandlingInstructionDoNothing();
            CronTrigger cronTrigger = TriggerBuilder.newTrigger()
                    .withIdentity(triggerKey)
                    .withSchedule(cronScheduleBuilder).build();
            JobDetail jobDetail = scheduler.getJobDetail(jobKey);
            jobDetail = jobDetail.getJobBuilder().withDescription(jobDescription).usingJobData(dataMap).build();
            HashSet<Trigger> triggerSet = new HashSet<>();
            triggerSet.add(cronTrigger);
            scheduler.scheduleJob(jobDetail, triggerSet, true);
        } catch (SchedulerException e) {
            throw new CustomException("类名不存在或执行表达式错误");
        }
    }
```

* 暂停任务

```java
    /**
     * 暂停定时任务
     *
     * @param jobName
     * @param jobGroup
     */
    public void pauseJob(String jobName, String jobGroup) {
        TriggerKey triggerKey = TriggerKey.triggerKey(jobName, jobGroup);
        try {
            if (checkExists(jobName, jobGroup)) {
                scheduler.pauseTrigger(triggerKey);
                log.info("任务: {} 暂停成功", jobName);
            } else {
                log.warn("未找到任务：{}", jobName);
            }
        } catch (SchedulerException e) {
            throw new CustomException(e.getMessage());
        }
    }
```

* 恢复任务

```java
    /**
     * 恢复暂停任务
     *
     * @param jobName
     * @param jobGroup
     */
    public void resumeJob(String jobName, String jobGroup) {
        TriggerKey triggerKey = TriggerKey.triggerKey(jobName, jobGroup);
        try {
            if (checkExists(jobName, jobGroup)) {
                scheduler.resumeTrigger(triggerKey);
                log.info("任务: {} 恢复成功", jobName);
            } else {
                log.warn("未找到任务：{}", jobName);
            }
        } catch (SchedulerException e) {
            throw new CustomException(e.getMessage());
        }
    }
```

* 删除任务

```java
    /**
     * 删除定时任务
     *
     * @param jobName
     * @param jobGroup
     */
    public void deleteJob(String jobName, String jobGroup) {
        TriggerKey triggerKey = TriggerKey.triggerKey(jobName, jobGroup);
        try {
            if (checkExists(jobName, jobGroup)) {
                scheduler.pauseTrigger(triggerKey);
                scheduler.unscheduleJob(triggerKey);
                log.info("任务: {} 删除成功", jobName);
            } else {
                log.warn("未找到任务：{}", jobName);
            }
        } catch (SchedulerException e) {
            throw new CustomException(e.getMessage());
        }
    }
```

* 获取任务列表

```java
    /**
     * 获取任务列表
     *
     * @return
     */
    public List<TaskInfo> getJobList() {
        List<TaskInfo> list = new ArrayList<>();
        try {
            for (String groupJob : getJobGroupNames()) {
                for (JobKey jobKey : scheduler.getJobKeys(GroupMatcher.<JobKey>groupEquals(groupJob))) {
                    List<? extends Trigger> triggers = scheduler.getTriggersOfJob(jobKey);
                    for (Trigger trigger : triggers) {
                        Trigger.TriggerState triggerState = scheduler.getTriggerState(trigger.getKey());
                        JobDetail jobDetail = scheduler.getJobDetail(jobKey);
                        String cronExpression = "";
                        Date createTime = null;
                        long repeatInterval = 0L;
                        int repeatCount = 0;
                        Date startDate = null;
                        Date endDate = null;
                        if (trigger instanceof CronTrigger) {
                            CronTrigger cronTrigger = (CronTrigger) trigger;
                            cronExpression = cronTrigger.getCronExpression();
                        } else if (trigger instanceof SimpleTrigger) {
                            SimpleTrigger simpleTrigger = (SimpleTrigger) trigger;
                            repeatInterval = simpleTrigger.getRepeatInterval();
                            repeatCount = simpleTrigger.getRepeatCount();
                            startDate = simpleTrigger.getStartTime();
                            endDate = simpleTrigger.getEndTime();
                        }
                        TaskInfo info = new TaskInfo();
                        info.setData(jobDetail.getJobDataMap());
                        info.setJobName(jobKey.getName());
                        info.setJobTrigger(trigger.getClass().getName());
                        info.setJobGroupName(jobKey.getGroup());
                        info.setJobClassName(jobDetail.getJobClass().getName());
                        info.setJobDescription(jobDetail.getDescription());
                        info.setJobStatus(triggerState.name());
                        info.setCronExpression(cronExpression);
                        info.setCreateTime(createTime);
                        info.setRepeatInterval(repeatInterval);
                        info.setRepeatCount(repeatCount);
                        info.setStartDate(startDate);
                        info.setEndDate(endDate);
                        list.add(info);
                    }
                }
            }
        } catch (SchedulerException e) {
            e.printStackTrace();
        }
        return list;
    }
```

### 测试Job

这里以一个测试任务为例，定时（每隔30s）向一个开放的接口请求诗句来演示定时任务执行情况。

![2022-02-12-TestJob.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-TestJob.jpg)

### 非业务处理

以下非业务功能：统一响应封装，全局异常拦截，分页查询， `Swagger3` 接口文档。

![2022-02-12-QuartzSwagger3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-QuartzSwagger3.jpg)

### 任务调度效果展示

实现了 `Quartz` 定时任务集群服务后，我们要进行验证其是否能够达到：**使得无论集群中有多少应用实例，定时任务只会触发一次**这一效果。

我这里采用三个服务实例（本地开发环境1个服务编号A，虚拟机上两个服务器上各1个服务，分别编号B、C）进行验证。

* 编译打包：mvn clean package
* 将编译好的jar包上传到虚拟机
* 分别启动这3个实例：java -jar springboot-quartz-0.0.1-SNAPSHOT.jar

3个实例都启动后，关于数据库表中数据的变化主要是 `qrtz_scheduler_state` 这个表：有了3个在运行的服务实例，其他表可自行观察，就不放图了。。

![2022-02-12-QuartzMySQL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-QuartzMySQL.jpg)

* 启动3个实例

启动3个实例后，我们发现， `Quartz` 集群的执行并不像其他中间件一样进行集群中不同实例之间的负载均衡，而是在其中一台(实例A)上面持续执行。那么当一台服务挂了，如何实现故障转移呢？别急，下面就人为挂掉一个服务试试看。

![2022-02-12-Cluster1.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-Cluster1.jpg)

* 关闭执行任务的那个服务实例

关闭执行任务的那个服务实例（这里是开发环境下的实例A）之后，通过 `Quartz` 集群调度，我们发现剩余的两个实例中有一个(实例C)检测到挂掉的实例，日志如下，接着任务便切换到了实例C上继续执行。

```log
2022-02-12 11:19:54.322  INFO 6645 --- [_ClusterManager] o.s.s.quartz.LocalDataSourceJobStore     : ClusterManager: detected 1 failed or restarted instances.
2022-02-12 11:19:54.322  INFO 6645 --- [_ClusterManager] o.s.s.quartz.LocalDataSourceJobStore     : ClusterManager: Scanning for instance "LAPTOP-R62OPABO1644635550243"'s failed in-progress jobs.
```

![2022-02-12-Cluster2.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-Cluster2.jpg)

* 再次关闭执行任务的那个服务实例

我们再次关闭执行任务的那个服务实例（这里是实例C）之后，通过 `Quartz` 集群调度，我们发现任务会自动切换到剩余的1个实例B上继续执行。

![2022-02-12-Cluster3.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-12-Cluster3.jpg)

至此，我们可以得出结论：

1. `Quartz` 定时任务集群服务调度，并不像其他中间件一样进行集群中不同实例之间的负载均衡，而是在其中一台上面持续执行；
2. 一旦监测到有服务实例停止运行后，任务会切换至正常运行的服务实例上继续执行，这就实现了**使得无论集群中有多少应用实例，定时任务只会触发一次**这一效果，同时我们拥有了一个具备**故障转移**的分布式任务调度集群。

### 附官方的数据表结构

```sql
#
# In your Quartz properties file, you'll need to set
# org.quartz.jobStore.driverDelegateClass = org.quartz.impl.jdbcjobstore.StdJDBCDelegate
#
#
# By: Ron Cordell - roncordell
#  I didn't see this anywhere, so I thought I'd post it here. This is the script from Quartz to create the tables in a MySQL database, modified to use INNODB instead of MYISAM.

DROP TABLE IF EXISTS QRTZ_FIRED_TRIGGERS;
DROP TABLE IF EXISTS QRTZ_PAUSED_TRIGGER_GRPS;
DROP TABLE IF EXISTS QRTZ_SCHEDULER_STATE;
DROP TABLE IF EXISTS QRTZ_LOCKS;
DROP TABLE IF EXISTS QRTZ_SIMPLE_TRIGGERS;
DROP TABLE IF EXISTS QRTZ_SIMPROP_TRIGGERS;
DROP TABLE IF EXISTS QRTZ_CRON_TRIGGERS;
DROP TABLE IF EXISTS QRTZ_BLOB_TRIGGERS;
DROP TABLE IF EXISTS QRTZ_TRIGGERS;
DROP TABLE IF EXISTS QRTZ_JOB_DETAILS;
DROP TABLE IF EXISTS QRTZ_CALENDARS;

CREATE TABLE QRTZ_JOB_DETAILS(
SCHED_NAME VARCHAR(120) NOT NULL,
JOB_NAME VARCHAR(190) NOT NULL,
JOB_GROUP VARCHAR(190) NOT NULL,
DESCRIPTION VARCHAR(250) NULL,
JOB_CLASS_NAME VARCHAR(250) NOT NULL,
IS_DURABLE VARCHAR(1) NOT NULL,
IS_NONCONCURRENT VARCHAR(1) NOT NULL,
IS_UPDATE_DATA VARCHAR(1) NOT NULL,
REQUESTS_RECOVERY VARCHAR(1) NOT NULL,
JOB_DATA BLOB NULL,
PRIMARY KEY (SCHED_NAME,JOB_NAME,JOB_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_TRIGGERS (
SCHED_NAME VARCHAR(120) NOT NULL,
TRIGGER_NAME VARCHAR(190) NOT NULL,
TRIGGER_GROUP VARCHAR(190) NOT NULL,
JOB_NAME VARCHAR(190) NOT NULL,
JOB_GROUP VARCHAR(190) NOT NULL,
DESCRIPTION VARCHAR(250) NULL,
NEXT_FIRE_TIME BIGINT(13) NULL,
PREV_FIRE_TIME BIGINT(13) NULL,
PRIORITY INTEGER NULL,
TRIGGER_STATE VARCHAR(16) NOT NULL,
TRIGGER_TYPE VARCHAR(8) NOT NULL,
START_TIME BIGINT(13) NOT NULL,
END_TIME BIGINT(13) NULL,
CALENDAR_NAME VARCHAR(190) NULL,
MISFIRE_INSTR SMALLINT(2) NULL,
JOB_DATA BLOB NULL,
PRIMARY KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP),
FOREIGN KEY (SCHED_NAME,JOB_NAME,JOB_GROUP)
REFERENCES QRTZ_JOB_DETAILS(SCHED_NAME,JOB_NAME,JOB_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_SIMPLE_TRIGGERS (
SCHED_NAME VARCHAR(120) NOT NULL,
TRIGGER_NAME VARCHAR(190) NOT NULL,
TRIGGER_GROUP VARCHAR(190) NOT NULL,
REPEAT_COUNT BIGINT(7) NOT NULL,
REPEAT_INTERVAL BIGINT(12) NOT NULL,
TIMES_TRIGGERED BIGINT(10) NOT NULL,
PRIMARY KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP),
FOREIGN KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP)
REFERENCES QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_CRON_TRIGGERS (
SCHED_NAME VARCHAR(120) NOT NULL,
TRIGGER_NAME VARCHAR(190) NOT NULL,
TRIGGER_GROUP VARCHAR(190) NOT NULL,
CRON_EXPRESSION VARCHAR(120) NOT NULL,
TIME_ZONE_ID VARCHAR(80),
PRIMARY KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP),
FOREIGN KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP)
REFERENCES QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_SIMPROP_TRIGGERS
  (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_NAME VARCHAR(190) NOT NULL,
    TRIGGER_GROUP VARCHAR(190) NOT NULL,
    STR_PROP_1 VARCHAR(512) NULL,
    STR_PROP_2 VARCHAR(512) NULL,
    STR_PROP_3 VARCHAR(512) NULL,
    INT_PROP_1 INT NULL,
    INT_PROP_2 INT NULL,
    LONG_PROP_1 BIGINT NULL,
    LONG_PROP_2 BIGINT NULL,
    DEC_PROP_1 NUMERIC(13,4) NULL,
    DEC_PROP_2 NUMERIC(13,4) NULL,
    BOOL_PROP_1 VARCHAR(1) NULL,
    BOOL_PROP_2 VARCHAR(1) NULL,
    PRIMARY KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP),
    FOREIGN KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP)
    REFERENCES QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_BLOB_TRIGGERS (
SCHED_NAME VARCHAR(120) NOT NULL,
TRIGGER_NAME VARCHAR(190) NOT NULL,
TRIGGER_GROUP VARCHAR(190) NOT NULL,
BLOB_DATA BLOB NULL,
PRIMARY KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP),
INDEX (SCHED_NAME,TRIGGER_NAME, TRIGGER_GROUP),
FOREIGN KEY (SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP)
REFERENCES QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_CALENDARS (
SCHED_NAME VARCHAR(120) NOT NULL,
CALENDAR_NAME VARCHAR(190) NOT NULL,
CALENDAR BLOB NOT NULL,
PRIMARY KEY (SCHED_NAME,CALENDAR_NAME))
ENGINE=InnoDB;

CREATE TABLE QRTZ_PAUSED_TRIGGER_GRPS (
SCHED_NAME VARCHAR(120) NOT NULL,
TRIGGER_GROUP VARCHAR(190) NOT NULL,
PRIMARY KEY (SCHED_NAME,TRIGGER_GROUP))
ENGINE=InnoDB;

CREATE TABLE QRTZ_FIRED_TRIGGERS (
SCHED_NAME VARCHAR(120) NOT NULL,
ENTRY_ID VARCHAR(95) NOT NULL,
TRIGGER_NAME VARCHAR(190) NOT NULL,
TRIGGER_GROUP VARCHAR(190) NOT NULL,
INSTANCE_NAME VARCHAR(190) NOT NULL,
FIRED_TIME BIGINT(13) NOT NULL,
SCHED_TIME BIGINT(13) NOT NULL,
PRIORITY INTEGER NOT NULL,
STATE VARCHAR(16) NOT NULL,
JOB_NAME VARCHAR(190) NULL,
JOB_GROUP VARCHAR(190) NULL,
IS_NONCONCURRENT VARCHAR(1) NULL,
REQUESTS_RECOVERY VARCHAR(1) NULL,
PRIMARY KEY (SCHED_NAME,ENTRY_ID))
ENGINE=InnoDB;

CREATE TABLE QRTZ_SCHEDULER_STATE (
SCHED_NAME VARCHAR(120) NOT NULL,
INSTANCE_NAME VARCHAR(190) NOT NULL,
LAST_CHECKIN_TIME BIGINT(13) NOT NULL,
CHECKIN_INTERVAL BIGINT(13) NOT NULL,
PRIMARY KEY (SCHED_NAME,INSTANCE_NAME))
ENGINE=InnoDB;

CREATE TABLE QRTZ_LOCKS (
SCHED_NAME VARCHAR(120) NOT NULL,
LOCK_NAME VARCHAR(40) NOT NULL,
PRIMARY KEY (SCHED_NAME,LOCK_NAME))
ENGINE=InnoDB;

CREATE INDEX IDX_QRTZ_J_REQ_RECOVERY ON QRTZ_JOB_DETAILS(SCHED_NAME,REQUESTS_RECOVERY);
CREATE INDEX IDX_QRTZ_J_GRP ON QRTZ_JOB_DETAILS(SCHED_NAME,JOB_GROUP);

CREATE INDEX IDX_QRTZ_T_J ON QRTZ_TRIGGERS(SCHED_NAME,JOB_NAME,JOB_GROUP);
CREATE INDEX IDX_QRTZ_T_JG ON QRTZ_TRIGGERS(SCHED_NAME,JOB_GROUP);
CREATE INDEX IDX_QRTZ_T_C ON QRTZ_TRIGGERS(SCHED_NAME,CALENDAR_NAME);
CREATE INDEX IDX_QRTZ_T_G ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_GROUP);
CREATE INDEX IDX_QRTZ_T_STATE ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_T_N_STATE ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP,TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_T_N_G_STATE ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_GROUP,TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_T_NEXT_FIRE_TIME ON QRTZ_TRIGGERS(SCHED_NAME,NEXT_FIRE_TIME);
CREATE INDEX IDX_QRTZ_T_NFT_ST ON QRTZ_TRIGGERS(SCHED_NAME,TRIGGER_STATE,NEXT_FIRE_TIME);
CREATE INDEX IDX_QRTZ_T_NFT_MISFIRE ON QRTZ_TRIGGERS(SCHED_NAME,MISFIRE_INSTR,NEXT_FIRE_TIME);
CREATE INDEX IDX_QRTZ_T_NFT_ST_MISFIRE ON QRTZ_TRIGGERS(SCHED_NAME,MISFIRE_INSTR,NEXT_FIRE_TIME,TRIGGER_STATE);
CREATE INDEX IDX_QRTZ_T_NFT_ST_MISFIRE_GRP ON QRTZ_TRIGGERS(SCHED_NAME,MISFIRE_INSTR,NEXT_FIRE_TIME,TRIGGER_GROUP,TRIGGER_STATE);

CREATE INDEX IDX_QRTZ_FT_TRIG_INST_NAME ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,INSTANCE_NAME);
CREATE INDEX IDX_QRTZ_FT_INST_JOB_REQ_RCVRY ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,INSTANCE_NAME,REQUESTS_RECOVERY);
CREATE INDEX IDX_QRTZ_FT_J_G ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,JOB_NAME,JOB_GROUP);
CREATE INDEX IDX_QRTZ_FT_JG ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,JOB_GROUP);
CREATE INDEX IDX_QRTZ_FT_T_G ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,TRIGGER_NAME,TRIGGER_GROUP);
CREATE INDEX IDX_QRTZ_FT_TG ON QRTZ_FIRED_TRIGGERS(SCHED_NAME,TRIGGER_GROUP);

commit;
```

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
