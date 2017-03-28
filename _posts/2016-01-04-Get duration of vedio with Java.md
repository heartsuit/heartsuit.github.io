---
layout: post
title: Java获取视频的时长——日期时间处理
tags: Java
---
## Java获取视频的时长——日期时间处理
###Problem：

>如何通过Java获取视频的时长？

**想通过Java来获取某文件夹（或多个文件夹）下的视频的总时长**

经过查询资料，发现可以通过JAVE实现：The JAVE (Java Audio Video Encoder) library is Java wrapper on the ffmpeg project。
<a href="http://www.sauronsoftware.it/projects/jave/download.php" target="blank"> JAVE下载地址


###Solution：
>以单个目录下的视频为例，通过JAVE实现，并采用不同的日期时间处理方式转换为时-分-秒格式，顺便熟悉了一下Java 中的日期处理。

- Note：当然，需要导入下载的JAVE的jar文件。。

###eg：

``` java
import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.TimeZone;

import it.sauronsoftware.jave.Encoder;
import it.sauronsoftware.jave.EncoderException;
import it.sauronsoftware.jave.MultimediaInfo;

public class VideoDuration {
	public void getVideoDuration(String path) {
		// get all files in specified "path"
		File[] files = new File(path).listFiles();
		
		Encoder encoder = new Encoder();
		MultimediaInfo multimediaInfo;
		
		long totalTime = 0L;
		long duration = 0L;
		
		for (int i = 0; i < files.length; i++) {
			// here, the format of video can be changed, JAVE upports dozens of formats
			if (!files[i].isDirectory() && files[i].toString().endsWith(".avi")) {
				try {
					multimediaInfo = encoder.getInfo(files[i]);
					duration = multimediaInfo.getDuration();
					totalTime += duration;
				} catch (EncoderException e) {
					e.printStackTrace();
				}
			}
		}
		
		// long --> hh:mm: calculate the time manually
		System.out.print(totalTime/(3600*1000) + ":" + totalTime%(3600*1000)/(60*1000) + ":" + totalTime%(3600*1000)%(60*1000)/1000);
		System.out.println("==>Manually");
		
		// set a default TimeZone before using Date, Calendar and SimpleDateFormat 	
		TimeZone.setDefault(TimeZone.getTimeZone("GMT+00:00")); // January 1, 1970, 00:00:00 GMT(can be found in Date.class)
		
		// long --> hh:mm:ss by means of java.util.Date
		Date date = new Date(totalTime);		
		System.out.print(date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
		System.out.println("==>By Date");
		
		// long --> hh:mm:ss by means of java.util.Calendar, Date
		Calendar calendar = Calendar.getInstance();
		calendar.setTime(date);
		System.out.print(calendar.get(Calendar.HOUR_OF_DAY) + ":" + calendar.get(Calendar.MINUTE) + ":" + calendar.get(Calendar.SECOND));
		System.out.println("==>By Calendar");
		
		// long --> hh:mm:ss by means of java.text.SimpleDateFormat, java.util.Date
		SimpleDateFormat simpleDateFormat = new SimpleDateFormat("HH:mm:ss");
		System.out.print(simpleDateFormat.format(date));
		System.out.println("==>By SimpleDateFormat");
	}
	public static void main(String[] args) {
		String filePath	= "E:\\BaiduYunDownload\\MySQL";
		
		VideoDuration videoDuration = new VideoDuration();		
		videoDuration.getVideoDuration(filePath);
	}
}
```

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
