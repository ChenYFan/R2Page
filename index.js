import request from 'request';
import fs from 'fs';

//创建dist目录
if (!fs.existsSync('dist')) fs.mkdirSync('dist');
//创建dist/1目录
if (!fs.existsSync('dist/1')) fs.mkdirSync('dist/1');
//下载文件到dist/1目录
request('https://sgp-ping.vultr.com/vultr.com.1000MB.bin').pipe(fs.createWriteStream('dist/1/1.dd'));