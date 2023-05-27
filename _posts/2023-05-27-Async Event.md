---
layout: post
title: 使用SpringBoot发送异步事件的方式解决前端接口调用超时问题
tags: SpringBoot
---

## 背景

一个内部使用的系统，要求实现功能：管理员后台一键操作，不定期（举办活动时）批量更新并导出所有普通用户的用户与密码信息为 `Excel` 表格文件。

目的是防止时间长了，如果密码不变的话，容易被别人冒用，所以每次不定期的活动开始前，要求重新生成密码。

密码在数据库中是密文存储，加密算法为 `BCrypt` ，在 `SpringBoot` 中借助 `BCryptPasswordEncoder` 类实现加密。

实际场景中操作如下：

1. 前端页面放一个按钮，用户点击后；
2. 后端接口先从数据库中查询所有用户；
3. 排除掉管理员用户；
4. 循环所有普通用户，生成满足要求的密码，执行加密操作，执行更新数据表操作；
5. 生成Excel并返回。

一开始在测试环境下，就十来个用户，这个过程一切正常。导入了实际生产的500+用户数据后，由于前端请求设置的超时时间为10秒，导出用户与密码信息的Excel文件过程超时导致断开连接了，即：这个接口在用户数量稍微多的时候就超过10s了。。

那么来分析上面的过程，导致效率低的原因可能有：
1. 在循环中逐个用户去更新密码信息，需要频繁写数据库。
2. 随机生成8位密码过程可能比较耗时：8至20位，包含大、小写字母、数字、特殊字符_@#$%&*组合。
3. 对用户密码加密可能比较耗时：BCryptPasswordEncoder。

```java
  @PostMapping("/updatePasswordAndDownload")
    public void updatePasswordAndDownload(HttpServletResponse response,SysUser user){

        List<SysUser> list = userService.selectUserList(user);
        List<SysUserExport> userExports = new ArrayList<>();
        String password = null;
        for (SysUser newuser:list){
            //去除超级管理员和系统管理员、审计管理员
            if(!newuser.isAdmin() && !newuser.isSystem() && !newuser.isAudit()) {
                userService.checkUserAllowed(newuser);
                userService.checkUserDataScope(newuser.getUserId());
                //设置8位随机密码并重置存储密码
                password = PasswordUtil2.getPsw(UserConstants.PASSWORD_MIN_LENGTH); // 导致接口超时，可能的原因2
                newuser.setPassword(SecurityUtils.encryptPassword(password)); // 导致接口超时，可能的原因3
                newuser.setUpdateBy(getUsername());
                userService.resetPwd(newuser); // 导致接口超时，可能的原因1
                //更新导出用户实体
                SysUserExport sysUserExport = new SysUserExport();
                sysUserExport.setPassword(password);
                sysUserExport.setUserId(newuser.getUserId());
                sysUserExport.setUserName(newuser.getUserName());
                sysUserExport.setDept(newuser.getDept().getDeptName());
                userExports.add(sysUserExport);
            }
        }
        //根据部门排序
        List<SysUserExport> userExportsSorts = userExports.stream().sorted(Comparator.comparing(SysUserExport::getDept).reversed()).collect(Collectors.toList());
        //导出Excel
        ExcelUtil<SysUserExport> util = new ExcelUtil<SysUserExport>(SysUserExport.class);
        util.exportExcel(response, userExportsSorts, "用户数据", "账号密码");
    }
```

## 针对性解决

### 原因1：在循环中逐个用户去更新密码信息，需要频繁写数据库。

> 针对这个问题，我们能不能**不要在循环中每次都去操作数据库**，只为更新用户的密码字段；而是用一条 `SQL` 直接批量更新所有的用户密码呢？

我们知道在 `SQL` 中，可以通过 `Case When` 语句来实现这一需求。那么现在，借助 `MyBatis` ，我们可以通过以下方法实现对不同用户密码的批量更新：

```xml
	<update id="updatePasswordBatch" parameterType="java.util.List">
		update sys_user
		<trim prefix="set" suffixOverrides=",">
			<trim prefix="password=case" suffix="end,">
				<foreach collection="list" item="item" index="index">
					<if test="item.password!=null">
						when user_id=#{item.userId} then #{item.password}
					</if>
				</foreach>
			</trim>
		</trim>
		where user_id in
		<foreach collection="list" index="index" item="item" separator="," open="(" close=")">
			#{item.userId, jdbcType=BIGINT}
		</foreach>
	</update>
```

之后便可以在 `for` 循环外调用上面这个批量更新用户密码的接口；然而，即使是在循环外调用上面的方法，接口依然超时。。所以，问题不在这个循环更新上。

### 原因2：随机生成8位密码过程可能比较耗时：8至20位，包含大、小写字母、数字、特殊字符_@#$%&*组合。

由于随机生成密码是一个工具方法，我直接单独测试该方法，批量生成500个密码后发现耗时非常短，可以忽略不计，因此，问题也不在这里。。

### 原因3：对用户密码加密可能比较耗时：BCryptPasswordEncoder。

同样，对用户密码加密的方法也是一个工具方法，批量加密500个密码后发现，耗时绝对超过10s，直接不可接受。 `BCrypt` 加密过程确实慢，但是实际一般都是对一个用户的密码进行加密，不会像我们现在遇到的批量操作。终于，问题找见啦~~

```java
    /**
     * 生成BCryptPasswordEncoder密码
     *
     * @param password 密码
     * @return 加密字符串
     */
    public static String encryptPassword(String password)
    {
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        return passwordEncoder.encode(password);
    }
```

关于 `Bcrypt` 加密速度慢的问题，我看了 `SegmentFault` 的一个帖子上有详细说明：[Bcrypt加密速度慢是否是鸡肋？](https://segmentfault.com/q/1010000003054250)。

## 异步解决方案

用户密码进行加密肯定是要做的，可是导致接口超时了怎么办？接下来，有请本文的主角闪亮登场，异步事件。

为减少接口响应时间，在用户点击导出并更新用户密码的按钮后，先设置密码原文，写入到导出的 `Excel` 文件中响应给前端用户；然后使用 `Spring` 自带的 `ApplicationEventPublisher` 发送异步事件，在异步事件监听方法中进行耗时的密码加密与数据表更新操作（这里还考虑到一个前提：用户导出用户名与密码后，这些用户并不会立即使用生成的新密码进行登录，因此异步更新数据表需要花费1-2分钟应该没有大的问题）。

```java
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;

    @PostMapping("/updatePasswordAndDownload")
    public void updatePasswordAndDownload(HttpServletResponse response,SysUser user){

        List<SysUser> list = userService.selectUserList(user);
        List<SysUserExport> userExports = new ArrayList<>();

        //去除超级管理员和系统管理员、审计管理员
        List<SysUser> collected = list.stream().filter(x -> !x.isAdmin() && !x.isSystem() && !x.isAudit()).collect(Collectors.toList());

        for (SysUser newuser : collected){
            userService.checkUserAllowed(newuser);
            userService.checkUserDataScope(newuser.getUserId());
            //设置8位随机密码并重置存储密码
            String password = PasswordUtil2.getPsw(UserConstants.PASSWORD_MIN_LENGTH);

            // 为减少接口响应时间，这里先设置密码原文，在异步事件中进行耗时的密码加密与更新操作
            newuser.setPassword(password);

            newuser.setUpdateBy(getUsername());
//                userService.resetPwd(newuser);

            //更新导出用户实体
            SysUserExport sysUserExport = new SysUserExport();
            sysUserExport.setPassword(password);
            sysUserExport.setUserId(newuser.getUserId());
            sysUserExport.setUserName(newuser.getUserName());
            sysUserExport.setDept(newuser.getDept().getDeptName());
            userExports.add(sysUserExport);
        }

        // 发送事件
        PasswordEvent passwordEvent = new PasswordEvent(this, collected);
        applicationEventPublisher.publishEvent(passwordEvent);

        //根据部门排序
        List<SysUserExport> userExportsSorts = userExports.stream().sorted(Comparator.comparing(SysUserExport::getDept).reversed()).collect(Collectors.toList());
        //导出Excel
        ExcelUtil<SysUserExport> util = new ExcelUtil<SysUserExport>(SysUserExport.class);
        util.exportExcel(response, userExportsSorts, "用户数据","投票系统账号密码");
    }
```

在事件监听端，通过 `@EnableAsync` 与 `@EventListener` 注解实现对异步事件的监听，然后在事件监听器中处理耗时的操作。

因为实际中的最终用户也就几百个，可直接采用循环逐个更新密码的方式。

```java
@Component
@EnableAsync
public class PasswordListener {
    @Autowired
    private ISysUserService userService;

    @EventListener
    @Async
    public void passwordEventHandler(PasswordEvent passwordEvent) {
        // 从事件中获取事件源
        List<SysUser> users = passwordEvent.getMsg();
        System.out.println("监听到PasswordEvent事件");

        for (SysUser user : users) {
            user.setPassword(SecurityUtils.encryptPassword(user.getPassword()));
            userService.resetPwd(user);
        }
    }
}
```

或者采用 `MyBatis` 的批量更新密码的方式也可以。

```java
@Component
@EnableAsync
public class PasswordListener {

    @Autowired
    private ISysUserService userService;

    @EventListener
    @Async
    public void passwordEventHandler(PasswordEvent passwordEvent) {
        // 从事件中获取事件源
        List<SysUser> users = passwordEvent.getMsg();
        System.out.println("监听到PasswordEvent事件");

        for (SysUser user : users) {
            user.setPassword(SecurityUtils.encryptPassword(user.getPassword()));
//            userService.resetPwd(user);
        }

        // 批量更新用户密码
        userService.updatePasswordBatch(users);
    }
}
```

## 小总结

以上便是因接口超时问题引发的原因分析和对应的解决方法，最终采用 `Spring` 自带的 `ApplicationEventPublisher` 异步方案解决因用户量增大导致生成密码、加密、导出的超时问题。

## Reference

[https://blog.csdn.net/weixin_44227650/article/details/126408514](https://blog.csdn.net/weixin_44227650/article/details/126408514)

---

***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***