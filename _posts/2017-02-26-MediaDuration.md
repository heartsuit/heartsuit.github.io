---
layout: post
title: 获取音、视频时长（NAudio，Shell32，FFmpeg） 
tags: C#
---

# 获取音、视频时长（NAudio，Shell32，FFmpeg） 
> 需要用到第三方组件获取多种`格式`的音视频时长，现分别采用NAudio.dll，Shell32.dll，FFmpeg.exe获取音视频的时长，并对比三者对不同格式文件的支持程度；

以下为本次测试用到的音、视频格式：

- `audio` ：".wav;.mp3;.wma;.ra;.mid;.ogg;.ape;.au;.aac;";

- `vedio` ：".mp4;.mpg;.mpeg;.avi;.rm;.rmvb;.wmv;.3gp;.flv;.mkv;.swf;.asf;";

**Note：**
1. 测试音、视频均为对应格式的有效文件（下载自[地址：](https://samples.mplayerhq.hu/)包含了各种可供测试音视频格式，且不断更新中。。）；
2. 若某音/视频时长为0，表示对应库、组件无法解码文件，即不支持该格式；
3. 类之间的关系：定义了Duration父类，三个测试方案均继承自Duration，并重写父类GetDuration方法。

## 获取时长父类

``` csharp
public abstract class Duration
{
    /// <summary>
    /// Abstract method of getting duration(ms) of audio or vedio
    /// </summary>
    /// <param name="filePath">audio/vedio's path</param>
    /// <returns>Duration in original format, duration in milliseconds</returns>
    public abstract Tuple<string, long> GetDuration(string filePath);

    /// <summary>
    /// Convert format of "00:10:16" and "00:00:19.82" into milliseconds
    /// </summary>
    /// <param name="formatTime"></param>
    /// <returns>Time in milliseconds</returns>
    public long GetTimeInMillisecond(string formatTime)
    {
        double totalMilliSecends = 0;

        if (!string.IsNullOrEmpty(formatTime))
        {
            string[] timeParts = formatTime.Split(':');
            totalMilliSecends = Convert.ToInt16(timeParts[0]) * 60 * 60 * 1000
                + Convert.ToInt16(timeParts[1]) * 60 * 1000
                + Math.Round(double.Parse(timeParts[2]) * 1000);
        }

        return (long)totalMilliSecends;
    }
}
```

### 使用NAudio.dll
- 下载、引用NAudio.dll；
    - 由于NAudio本身主要用于处理音频，用其获取视频时长并不合理（仅作统一测试），所以多数格式不支持，不足为奇；
    
``` csharp
public class ByNAudio : Duration
{
    /// <summary>
    /// Get duration(ms) of audio or vedio by NAudio.dll
    /// </summary>
    /// <param name="filePath">audio/vedio's path</param>
    /// <returns>Duration in original format, duration in milliseconds</returns>
    /// <remarks>return value from NAudio.dll is in format of: "00:00:19.820"</remarks>
    public override Tuple<string, long> GetDuration(string filePath)
    {
        TimeSpan ts;
        try
        {
            using (AudioFileReader audioFileReader = new AudioFileReader(filePath))
            {
                ts = audioFileReader.TotalTime;
            }
        }
        catch (Exception)
        {
            /* As NAudio is mainly used for processing audio, so some formats may not surport,
                * just use 00:00:00 instead for these cases.
                */
            ts = new TimeSpan();
            //throw ex;
        }

        return Tuple.Create(ts.ToString(), GetTimeInMillisecond(ts.ToString()));
    }
}
```

**NAudio结果：**

![NAudio](http://img.blog.csdn.net/20170226210354114?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvdTAxMzgxMDIzNA==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)

### 使用Shell32.dll
- 引用Shell32.dll，在COM里；
    - Windows自带的组件，仅支持常见的音视频格式；

``` csharp
public class ByShell32 : Duration
{
    /// <summary>
    /// Get duration(ms) of audio or vedio by Shell32.dll
    /// </summary>
    /// <param name="filePath">audio/vedio's path</param>
    /// <returns>Duration in original format, duration in milliseconds</returns>
    /// <remarks>return value from Shell32.dll is in format of: "00:10:16"</remarks>
    public override Tuple<string, long> GetDuration(string filePath)
    {
        try
        {
            string dir = Path.GetDirectoryName(filePath);

            // From Add Reference --> COM 
            Shell32.Shell shell = new Shell32.Shell();
            Shell32.Folder folder = shell.NameSpace(dir);
            Shell32.FolderItem folderitem = folder.ParseName(Path.GetFileName(filePath));

            string duration = null;

            // Deal with different versions of OS
            if (Environment.OSVersion.Version.Major >= 6)
            {
                duration = folder.GetDetailsOf(folderitem, 27);
            }
            else
            {
                duration = folder.GetDetailsOf(folderitem, 21);
            }

            duration = string.IsNullOrEmpty(duration) ? "00:00:00" : duration;
            return Tuple.Create(duration, GetTimeInMillisecond(duration));
        }
        catch (Exception ex)
        {
            throw ex;
        }
    }
}
```
**Shell32结果：**

![Shell32](http://img.blog.csdn.net/20170226210528933?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvdTAxMzgxMDIzNA==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)

### 使用FFmpeg.exe
- 下载FFmpeg.exe；
    - 异步调用“ffmpeg -i 文件路径”命令，获取返回文本，并解析出Duration部分；
    - FFmpeg是对音视频进行各种处理的一套完整解决方案，包含了非常先进的音频/视频编解码库，因此可处理多种格式（本次测试的音、视频格式均可以进行有效解码）。

``` csharp
public class ByFFmpeg : Duration
    {
        private StringBuilder result = new StringBuilder(); // Store output text of ffmpeg

        /// <summary>
        /// Get duration(ms) of audio or vedio by FFmpeg.exe
        /// </summary>
        /// <param name="filePath">audio/vedio's path</param>
        /// <returns>Duration in original format, duration in milliseconds</returns>
        /// <remarks>return value from FFmpeg.exe is in format of: "00:00:19.82"</remarks>
        public override Tuple<string, long> GetDuration(string filePath)
        {
            GetMediaInfo(filePath);
            string duration = MatchDuration(result.ToString());

            return Tuple.Create(duration, GetTimeInMillisecond(duration));
        }

        // Call exe async
        private void GetMediaInfo(string filePath)
        {
            result.Clear(); // Clear result to avoid previous value's interference

            Process p = new Process();
            p.StartInfo.FileName = "ffmpeg.exe";
            p.StartInfo.RedirectStandardError = true;
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.Arguments = string.Concat("-i ", filePath);
            p.ErrorDataReceived += new DataReceivedEventHandler(OutputCallback);

            p.Start();
            p.BeginErrorReadLine();

            p.WaitForExit();
            p.Close();
            p.Dispose();
        }

        // Callback funciton of output stream
        private void OutputCallback(object sender, DataReceivedEventArgs e)
        {
            if (!string.IsNullOrEmpty(e.Data))
            {
                result.Append(e.Data);
            }
        }

        // Match the 'Duration' section in "ffmpeg -i filepath" output text
        private string MatchDuration(string text)
        {
            string pattern = @"Duration:\s(\d{2}:\d{2}:\d{2}.\d+)";
            Match m = Regex.Match(text, pattern);

            return m.Groups.Count == 2 ? m.Groups[1].ToString() : string.Empty;
        }
    }
```
> **ffmpeg -i filePath**
> ……[mp3 @ 0233ca60] Estimating duration from bitrate, this may be inaccurate
Input #0, mp3, from '2012.mp3':
  Duration: 00:22:47.07, start: 0.000000, bitrate: 127 kb/s
    Stream #0:0: Audio: mp3, 44100 Hz, stereo, s16p, 128 kb/s
At least one output file must be specified

**Note:**以上为ffmpeg -i 命令的输出值，需要匹配到Duration的时长部分。

**FFmpeg结果：**

![FFmpeg](http://img.blog.csdn.net/20170226212622178?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvdTAxMzgxMDIzNA==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)


### Source Code（含测试音、视频文件）: <a href="https://github.com/heartsuit/MediaDuration">Github

---
***If you have any questions or any bugs are found, please feel free to contact me.***

***Your comments and suggestions are welcome!***
