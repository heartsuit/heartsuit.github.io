---
layout: post
title: SpringBoot集成MinIO实践
tags: SpringBoot, MinIO
---

## 背景

`MinIO` 是全球领先的对象存储先锋，在标准硬件上，读/写速度上高达183 GB/秒和171 GB/秒。MinIO用作云原生应用程序的主要存储，与传统对象存储相比，云原生应用程序需要更高的吞吐量和更低的延迟。通过添加更多集群可以扩展名称空间，更多机架，直到实现目标。同时，符合一切原生云计算的架构和构建过程，并且包含最新的云计算的全新的技术和概念。

关于对象存储，使用起来无非就是文件上传、下载与删除，再加上桶的操作而已。这里使用 `SpringBoot` 集成 `MinIO` 单实例实战，关于 `MinIO` 分布式集群的高可用性、可扩展性测试，可参考文章：[全栈开发之MinIO分布式文件存储集群高可用测试](https://blog.csdn.net/u013810234/article/details/122905283?spm=1001.2014.3001.5501)

1. 桶管理；
2. 对象管理（上传、下载、删除）；
3. 对象预签名；
4. 桶策略管理；

![2022-02-13-MinIOIndex.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-MinIOIndex.jpg)

## 依赖

Note: 我这里使用 `7.x` 的版本进行实验与演示，最新版的 `8.x` 的 `MinIO` 后台管理界面有所不同，但是经过我们实际生产的测试，接口都是兼容的。

```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>7.1.4</version>
</dependency>
```

## MinIO在Docker下单实例运行

```bash
docker run -p 9000:9000 \
  --name minio1 \
  -v /opt/minio/data-single \
  -e "MINIO_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE" \
  -e "MINIO_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  minio/minio server /data
```

![2022-02-13-MinIOLogin.jpg](https://github.com/heartsuit/heartsuit.github.io/raw/master/pictures/2022-02-13-MinIOLogin.jpg)

## 接口测试

基于 `MinIO` 客户端，主要实现了桶管理，对象管理，对象预签名等服务接口。

以 `RESTful API` 对外提供文件上传、下载、删除操作接口；

使用 `PostMan` 测试文件上传、下载、删除接口：头信息： `Content-Type:multipart/form-data`

```bash
# 上传
curl --location --request POST 'localhost:8090/minio/uploadFile' \
--header 'Content-Type: multipart/form-data' \
--form 'file=@"/C:/Users/nxq01/Downloads/springboot-minio-master.zip"'

# 下载
curl --location --request POST 'localhost:8090/minio/downloadFile' \
--form 'bucketName="heartsuit"' \
--form 'originalName="springboot-minio-master.zip"' \
--form 'filePath="2021-11-23/92cf3f69-501b-41de-83ae-f67e5a57f35f.zip"'

# 删除
curl --location --request POST 'localhost:8090/minio/deleteFile' \
--header 'Content-Type: multipart/form-data' \
--form 'bucketName="heartsuit"' \
--form 'filePath="2021-11-23/92cf3f69-501b-41de-83ae-f67e5a57f35f.zip"'
```

## 核心接口

* Controller

```java
@RequestMapping("/minio")
@RestController
@Slf4j
public class MinIOController {
    @Autowired
    private MinIOService minIOService;

    @Autowired
    private MinIOConfig minioConfig;

    @PostMapping("/uploadFile")
    public Result<String> uploadFile(MultipartFile file, String bucketName) {
        try {
            bucketName = !StringUtils.isEmpty(bucketName) ? bucketName : minioConfig.getBucketName();
            if (!minIOService.bucketExists(bucketName)) {
                minIOService.makeBucket(bucketName);
            }
            String fileName = file.getOriginalFilename();
            assert fileName != null;

            // 根据业务设计，设置存储路径：按天创建目录
            String objectName = new SimpleDateFormat("yyyy-MM-dd/").format(new Date())
                    + UUID.randomUUID().toString()
                    + fileName.substring(fileName.lastIndexOf("."));

            minIOService.putObject(bucketName, file, objectName);
            log.info("文件格式为:{}", file.getContentType());
            log.info("文件原名称为:{}", fileName);
            log.info("文件存储的桶为:{}", bucketName);
            log.info("文件对象路径为:{}", objectName);
            return Result.success(minIOService.getObjectUrl(bucketName, objectName));
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("上传失败");
        }
    }

    @PostMapping("/deleteFile")
    public Result<String> deleteFile(String bucketName, String filePath) throws Exception {
        if (!minIOService.bucketExists(bucketName)) {
            throw new Exception("不存在该桶");
        }
        boolean status = minIOService.removeObject(bucketName, filePath);
        return status ? Result.success("删除成功") : Result.success("删除失败");
    }

    @PostMapping("/downloadFile")
    public Result<String> downloadFile(String bucketName, String filePath, String originalName, HttpServletResponse response) throws Exception {
        if (!minIOService.bucketExists(bucketName)) {
            throw new Exception("不存在该桶");
        }
        boolean status = minIOService.downloadFile(bucketName, filePath, originalName, response);
        return status ? Result.success("下载成功") : Result.success("下载失败");
    }
}
```

* Service

```java
@Service
public class MinIOServiceImpl  implements MinIOService {
    @Autowired
    private MinIOUtils minIOUtils;

    /**
     * 判断 bucket是否存在
     *
     * @param bucketName
     * @return
     */
    @Override
    public boolean bucketExists(String bucketName) {
        return minIOUtils.bucketExists(bucketName);
    }

    /**
     * 创建 bucket
     *
     * @param bucketName
     */
    @Override
    public void makeBucket(String bucketName) {
        minIOUtils.makeBucket(bucketName);
    }

    /**
     * 文件上传
     *
     * @param bucketName
     * @param objectName
     * @param filename
     */
    @Override
    public void putObject(String bucketName, String objectName, String filename) {
        minIOUtils.putObject(bucketName, objectName, filename);
    }

    @Override
    public void putObject(String bucketName, String objectName, InputStream stream, String contentType) {
        minIOUtils.putObject(bucketName, objectName, stream, contentType);
    }

    /**
     * 文件上传
     *
     * @param bucketName
     * @param multipartFile
     */
    @Override
    public void putObject(String bucketName, MultipartFile multipartFile, String filename) {
        minIOUtils.putObject(bucketName, multipartFile, filename);
    }

    /**
     * 删除文件
     * @param bucketName
     * @param filePath
     */
    @Override
    public boolean removeObject(String bucketName,String filePath) {
        return minIOUtils.removeObject(bucketName,filePath);
    }

    /**
     * 下载文件
     * @param bucketName
     * @param filePath
     * @param originalName
     * @param response
     * @return
     */
    @Override
    public boolean downloadFile(String bucketName, String filePath, String originalName, HttpServletResponse response) {
        return minIOUtils.downloadFile(bucketName,filePath, originalName, response);
    }

    /**
     * 获取文件路径
     * @param bucketName
     * @param objectName
     * @return
     */
    @Override
    public String getObjectUrl(String bucketName,String objectName) {
        return minIOUtils.getObjectUrl(bucketName,objectName);
    }
}
```

`minIOUtils` 工具类省略，可参考文末的项目源码。

## 可能遇到的问题

* SpringBoot上传文件报错：org.springframework.web.multipart. MaxUploadSizeExceededException: Maximum upload size exceeded; nested exception is java.lang. IllegalStateException: org.apache.tomcat.util.http.fileupload.impl. FileSizeLimitExceededException: The field file exceeds its maximum permitted size of 1048576 bytes.

这是因为 `SpringBoot` 项目限制了上传文件的大小，默认为1M，当用户上传了超过1M大小的文件时，就会抛出上述错误，可通过以下配置修改。

```yaml
spring:
  servlet:
    multipart:
      maxFileSize: 10MB
      maxRequestSize: 30MB
```

* 通过`docker exec -it cd34c345960c /bin/bash`无法进入容器，报错：OCI runtime exec failed: exec failed: container_linux.go:349: starting container process caused "exec: \"/\": permission denied": unknown

解决： `docker exec -it cd34c345960c /bin/bash` 改为： `docker exec -it cd34c345960c sh` 或者： `docker exec -it cd34c345960c /bin/sh`

## Source Code

完整源码见 `GitHub` ：[https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-minio](https://github.com/heartsuit/demo-spring-boot/tree/master/springboot-minio)

## Reference

* [https://docs.min.io/docs/minio-quickstart-guide.html](https://docs.min.io/docs/minio-quickstart-guide.html)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
