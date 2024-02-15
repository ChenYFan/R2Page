import request from 'request';
import fs from 'fs';

//创建dist目录
if (!fs.existsSync('dist')) fs.mkdirSync('dist');
//创建dist/1目录
if (!fs.existsSync('dist/1')) fs.mkdirSync('dist/1');
//生成5个10M的文件
for (let i = 0; i < 5; i++) {
    fs.writeFileSync(`dist/1/${i}.txt`, new Buffer(1024 * 1024 * 10));
}