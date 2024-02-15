# R2Page - 利用Page来分发R2的数据

> Because CloudFlare Page does not have a limit on operands - **while R2 has**

## 部署

1. fork本仓库
2. 在CloudFlare Page中导入仓库
3. 部署框架选无，部署命令填入`npm run download`，输出目录为`/dist`
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
