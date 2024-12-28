---
layout: post
title: 实际部署Dify可能遇到的问题：忘记密码、开启HTTPS、知识库文档上传的大小限制和数量限制
tags: AI, LLM
---

## 背景

前面我们以 `docker compose` 容器化的方式本地部署了 `Dify` 社区版，并快速体验了其聊天助手、工作量编排以及智能体（Agent）功能。不过后续实际生产环境使用时遇到了**忘记密码**、**如何开启SSL以支持HTTPS**、**如何突破知识库文档上传的大小限制和数量限制**等问题。

![2024-12-28-DifyArchitecture.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-28-DifyArchitecture.jpg)

## 遇到的问题

### 本地部署初始化后，忘记密码、密码错误如何重置？

这个问题官方文档里有写，在服务器上执行以下命令进行密码重置。

```
docker exec -it docker-api-1 flask reset-password
```

输入账户 `email` 以及两次新密码即可。

Note：一开始我并不知道官方文档提供了密码重置的方案，当时的第一想法是使用测试环境的密码覆盖生产环境的密码即可，便有了以下操作。
通过 `docker-compose.yaml` 以及 `docker ps` ，我们知道 `Dify` 用的是 `PostgreSQL` 数据库，不过默认没有开启远程访问，下面通过命令行来操作 `PostgreSQL` 数据库。

```bash
# 命令行连接PostgreSQL
[root@dify ~]# docker exec -it docker_db_1 /bin/bash
c84995ae10f8:/# psql -U postgres
psql (15.10)
Type "help" for help.

# 列出所有数据库
postgres=# \l
                                                List of databases
   Name    |  Owner   | Encoding |  Collate   |   Ctype    | ICU Locale | Locale Provider |   Access privileges   
-----------+----------+----------+------------+------------+------------+-----------------+-----------------------
 dify      | postgres | UTF8     | en_US.utf8 | en_US.utf8 |            | libc            | 
 postgres  | postgres | UTF8     | en_US.utf8 | en_US.utf8 |            | libc            | 
 template0 | postgres | UTF8     | en_US.utf8 | en_US.utf8 |            | libc            | =c/postgres          +
           |          |          |            |            |            |                 | postgres=CTc/postgres
 template1 | postgres | UTF8     | en_US.utf8 | en_US.utf8 |            | libc            | =c/postgres          +
           |          |          |            |            |            |                 | postgres=CTc/postgres
(4 rows)

# 切换到dify数据库
postgres=# \c dify
You are now connected to database "dify" as user "postgres".

# 查看所有数据表
dify=# \d
                        List of relations
 Schema |               Name                |   Type   |  Owner   
--------+-----------------------------------+----------+----------
 public | account_integrates                | table    | postgres
 public | accounts                          | table    | postgres
 public | alembic_version                   | table    | postgres
 public | api_based_extensions              | table    | postgres
 public | api_requests                      | table    | postgres
 public | api_tokens                        | table    | postgres
 public | app_annotation_hit_histories      | table    | postgres
 public | app_annotation_settings           | table    | postgres
 public | app_dataset_joins                 | table    | postgres
 public | app_model_configs                 | table    | postgres
 public | apps                              | table    | postgres
 public | celery_taskmeta                   | table    | postgres
 public | celery_tasksetmeta                | table    | postgres
 public | conversations                     | table    | postgres
 public | data_source_api_key_auth_bindings | table    | postgres
 public | data_source_oauth_bindings        | table    | postgres
 public | dataset_collection_bindings       | table    | postgres
 public | dataset_keyword_tables            | table    | postgres
 public | dataset_permissions               | table    | postgres
 public | dataset_process_rules             | table    | postgres
 public | dataset_queries                   | table    | postgres
 public | dataset_retriever_resources       | table    | postgres
 public | datasets                          | table    | postgres
 public | dify_setups                       | table    | postgres
 public | document_segments                 | table    | postgres
 public | documents                         | table    | postgres
 public | embeddings                        | table    | postgres
 public | end_users                         | table    | postgres
 public | external_knowledge_apis           | table    | postgres
 public | external_knowledge_bindings       | table    | postgres
 public | installed_apps                    | table    | postgres
 public | invitation_codes                  | table    | postgres
 public | invitation_codes_id_seq           | sequence | postgres
 public | load_balancing_model_configs      | table    | postgres
 public | message_agent_thoughts            | table    | postgres
 public | message_annotations               | table    | postgres
 public | message_chains                    | table    | postgres
 public | message_feedbacks                 | table    | postgres
 public | message_files                     | table    | postgres
 public | messages                          | table    | postgres
 public | operation_logs                    | table    | postgres
 public | pinned_conversations              | table    | postgres
 public | provider_model_settings           | table    | postgres
 public | provider_models                   | table    | postgres
 public | provider_orders                   | table    | postgres
 public | providers                         | table    | postgres
 public | recommended_apps                  | table    | postgres
 public | saved_messages                    | table    | postgres
 public | sites                             | table    | postgres
 public | tag_bindings                      | table    | postgres
 public | tags                              | table    | postgres
 public | task_id_sequence                  | sequence | postgres
 public | taskset_id_sequence               | sequence | postgres
 public | tenant_account_joins              | table    | postgres
 public | tenant_default_models             | table    | postgres
 public | tenant_preferred_model_providers  | table    | postgres
 public | tenants                           | table    | postgres
 public | tidb_auth_bindings                | table    | postgres
 public | tool_api_providers                | table    | postgres
 public | tool_builtin_providers            | table    | postgres
 public | tool_conversation_variables       | table    | postgres
 public | tool_files                        | table    | postgres
 public | tool_label_bindings               | table    | postgres
 public | tool_model_invokes                | table    | postgres
 public | tool_providers                    | table    | postgres
 public | tool_published_apps               | table    | postgres
 public | tool_workflow_providers           | table    | postgres
 public | trace_app_config                  | table    | postgres
 public | upload_files                      | table    | postgres
 public | whitelists                        | table    | postgres
 public | workflow_app_logs                 | table    | postgres
 public | workflow_conversation_variables   | table    | postgres
 public | workflow_node_executions          | table    | postgres
 public | workflow_runs                     | table    | postgres
 public | workflows                         | table    | postgres
(75 rows)

# 查看账户表
dify=# \d accounts
                                        Table "public.accounts"
       Column       |            Type             | Collation | Nullable |           Default           
--------------------+-----------------------------+-----------+----------+-----------------------------
 id                 | uuid                        |           | not null | uuid_generate_v4()
 name               | character varying(255)      |           | not null | 
 email              | character varying(255)      |           | not null | 
 password           | character varying(255)      |           |          | 
 password_salt      | character varying(255)      |           |          | 
 avatar             | character varying(255)      |           |          | 
 interface_language | character varying(255)      |           |          | 
 interface_theme    | character varying(255)      |           |          | 
 timezone           | character varying(255)      |           |          | 
 last_login_at      | timestamp without time zone |           |          | 
 last_login_ip      | character varying(255)      |           |          | 
 status             | character varying(16)       |           | not null | 'active'::character varying
 initialized_at     | timestamp without time zone |           |          | 
 created_at         | timestamp without time zone |           | not null | CURRENT_TIMESTAMP(0)
 updated_at         | timestamp without time zone |           | not null | CURRENT_TIMESTAMP(0)
 last_active_at     | timestamp without time zone |           | not null | CURRENT_TIMESTAMP(0)
Indexes:
    "account_pkey" PRIMARY KEY, btree (id)
    "account_email_idx" btree (email)

# 查询所有用户记录
dify=# select * from accounts;
                  id                  | name  |       email       |                                         password                                         |      password_salt       | avatar | interface_language | interface_theme |     timezone     |       last_login_at        | last_login_ip  | status |       initialized_at       |     created_at      |     updated_at      |      last_active_at      
--------------------------------------+-------+-------------------+------------------------------------------------------------------------------------------+--------------------------+--------+--------------------+-----------------+------------------+----------------------------+----------------+--------+----------------------------+---------------------+---------------------+--------------------------
 78837d37-83d0-4e21-88c0-25de52df8ee0 | Admin | you-guess@qq.com | OTYyYjZmNWFlMWI2MzIyZTU3ZWMyMjNmOGEzY2E0OTkwYmYxMzNmN2MzMTM2M2IyMzZlM2M0MDQyOTAyM2E1MQ== | 4bGygMJ7I7w6CLVXpEeRrA== |        | en-US              | light           | America/New_York | 2024-12-07 08:24:27.715579 | 192.168.27.200 | active | 2024-12-07 08:24:06.685263 | 2024-12-07 08:24:07 | 2024-12-07 08:24:07 | 2024-12-22 08:00:40.2632
(1 row)
```

可以看到**密码密文**和**盐值**信息。接着使用一个已知密码的密文和盐值更新到 `accounts` 表；

从测试环境服务器上导出了 `SQL` 的 `Insert` 语句。

> pg_dump -d dify -U postgres --column-inserts -t accounts -f /opt/accounts.sql

```sql
UPDATE public.accounts SET password='YmFjYWMwYWFkNTU2MDlmMmViNTZhNTc3N2JjZDBjMDk4ZWVmNjRjYjA2MGU4MzQ0YTZjNzViNjVhYzAyMzZhYg==', password_salt='j13XCIHXI4N2AK4yIJuggQ==' WHERE id='78837d37-83d0-4e21-88c0-25de52df8ee0';
```

### 改了密码密文和盐值后，依然登不上？

经过上述**密码密文**和**盐值**信息的替换后，还是没登上，不过错误信息是密码错误次数超限（默认锁定24小时）。这是因为当时忘记密码后，尝试了多次导致密码锁定。考虑到 `Dify` 用了 `Redis` ，而且一版这种密码次数错误限制我们也是通过 `Redis` 来实现，这里推测是 `Redis` 中有个用户被锁定的待超时时间的 `Key` 。直接打开 `Dify` 源码查看，果然~

![2024-12-28-RedisKey.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-28-RedisKey.jpg)

找见了原因，直接连上 `Redis` ，删除这个 `Key` 即可。

```bash
[root@dify opt]# docker exec -it docker_redis_1 sh
/data # redis-cli
127.0.0.1:6379> keys *
1) "refresh_token:7d177d5971609013a2c8a5634ce49de1d488332bb5961d8d69ce1a371a3abdeac65d9010df7a6f1e7c73508cbd6733e0c27e2235999ca593192919678ab688b4"
2) "reset_password:account:78837d37-83d0-4e21-88c0-25de52df8ee0"
3) "account_refresh_token:78837d37-83d0-4e21-88c0-25de52df8ee0"
4) "login_error_rate_limit:you-guess@qq.com"

# 查看过期时间，大概还剩23个多小时。。
127.0.0.1:6379> ttl login_error_rate_limit:you-guess@qq.com
(integer) 85202

# 删除这个Key
127.0.0.1:6379> del login_error_rate_limit:you-guess@qq.com
(integer) 1
```

之后即可成功登录~~

### 本地部署80端口被占用应该如何解决？

一般的服务器上会有其他服务占用 `80` 端口，这时需要修改 `.env` 文件，指定 `Nginx` 暴露的端口。

```
# 编辑.env文件
EXPOSE_NGINX_PORT=9080
EXPOSE_NGINX_SSL_PORT=9443
```

### 如何开启SSL以支持HTTPS？

* 同样是编辑 `.env` 文件，配置 `NGINX_HTTPS_ENABLED=true` 开启 `HTTPS` ；
* 此外，还需要将证书文件放到 `dify-main/docker/nginx/ssl` 目录下，记得命名为 `dify.crt` 与 `dify.key` ；
* 然后 `docker-compose down` 停止服务，最后启动服务 `docker-compose up -d` 生效。

```
NGINX_HTTPS_ENABLED=true
```

![2024-12-28-SSL.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2024-12-28-SSL.jpg)

Note：
1. 具体SSL的配置是参考docker-compose.yaml里面的环境变量得到的；
2. 关于如何自签证书，参考：[自签SSL证书配置Nginx代理Vue+SpringBoot前后端分离服务](https://heartsuit.blog.csdn.net/article/details/127585848)。

### 如何解决知识库文档上传的大小限制和数量限制？

同样是编辑 `.env` 文件， `Dify` 知识库文档上传单个文档最大是 `15MB` ，总文档数量限制 `100` 个。本地部署的社区版本可根据需要调整修改该限制。

```
# 上传文件大小限制，默认15M。
UPLOAD_FILE_SIZE_LIMIT=50M

# 每次上传文件数上限，默认5个。
UPLOAD_FILE_BATCH_LIMIT=10
```

## 小总结

本文主要介绍了 `Dify` 本地部署后遇到的几个常见问题及其解决方案：首先是忘记密码的处理，可以通过官方提供的 `flask reset-password` 命令重置，或者直接操作 `PostgreSQL` 数据库修改密码信息；其次是密码错误次数超限导致账户锁定的问题，可以通过删除 `Redis` 中对应的限制 `Key` 来解决；再次是端口占用和 `HTTPS` 配置问题，可以通过修改 `.env` 文件中的 `EXPOSE_NGINX_PORT` 和 `NGINX_HTTPS_ENABLED` 等配置来解决；最后介绍了如何通过调整 `.env` 文件中的 `UPLOAD_FILE_SIZE_LIMIT` 和 `UPLOAD_FILE_BATCH_LIMIT` 参数来突破知识库文档上传的大小限制和数量限制。

## Reference

* [https://docs.dify.ai/zh-hans](https://docs.dify.ai/zh-hans)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
