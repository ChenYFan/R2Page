# R2Page - 利用Page来分发R2的数据

> Why? Because CloudFlare Page does not have a limit on operands - **while R2 has**

## 部署

1. fork本仓库
2. 在CloudFlare Page中导入仓库
3. 部署框架选`Astro`
4. 配置环境变量：
   
   
> AWS_ACCESS_KEY_ID R2的访问ID
> 
> AWS_SECRET_ACCESS_KEY R2的访问机密
> 
> AWS_ENDPOINT_URL R2的URL，格式应该类似于https://xx.r2.cloudflarestorage.com
> 
> PAGE_URL CloudFlare的Page url，以便于程序在检查到无文件发生变化时从旧Page拉取信息，减少对R2的操作次数
> 
> DECRYPT_KEY （可选）fileMaps的加密密钥，随意，若不填写fileMaps将不加密直接存储在`/fileMaps.json`文件中
> 

![image](https://github.com/ChenYFan/R2Page/assets/53730587/dc512eb9-de6f-410f-8166-c17da3f2976b)


## Notes

每次同步文件后会生成PageMap，并包含文件的路径和修改日期。在下一次触发时脚本会尝试查询S3中的修改日期，如果不匹配，则视为发生文件更新。若文件更新，脚本则直接向R2发送S3下载请求并覆盖本地文件。

当文件未发生更新时，脚本会伪装为Astro程序以享受CloudFlarePage的构建输出缓存（但目前为止仍存在问题，无法同步），脚本优先尝试从已有的构建缓存中获取文件，若失败，则会从上一次Page发起request下载文件，而非从S3中请求。

除非文件发生更新，脚本不会从S3下载文件。
