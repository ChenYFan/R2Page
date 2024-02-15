import request from 'request';
import fs from 'fs';
import AWS from 'aws-sdk';
if (!fs.existsSync('dist')) fs.mkdirSync('dist');
const PageUrl = process.env.PAGE_URL
//登录AWS，并列出所有的bucket
const s3 = new AWS.S3({
    region: 'auto',
    endpoint: process.env.AWS_ENDPOINT_URL,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})


const mkDir = (path) => {
    path = path.split('/');
    for (let i = 0; i < path.length - 1; i++) {
        let dir = path.slice(0, i + 1).join('/');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    }
}

!!(async () => {
    console.log(`部分配置信息配置如下：\nPAGE_URL: ${PageUrl}\nAWS_ENDPOINT_URL: ${process.env.AWS_ENDPOINT_URL}`);
    console.log('开始从R2获取文件列表...');

    const buckets = (await s3.listBuckets().promise()).Buckets.map(bucket => bucket.Name);


    for (let bucket of buckets) {
        if (!fs.existsSync(`dist/${bucket}`)) fs.mkdirSync(`dist/${bucket}`);
        const fileMaps = []
        let { Contents, IsTruncated, NextContinuationToken } = await s3.listObjectsV2({ Bucket: bucket }).promise();
        do {
            Contents.map(content => {
                fileMaps.push({
                    "filename": content.Key.split('/').pop(),
                    "path": content.Key,
                    "fullpath": `${bucket}/${content.Key}`,
                    "time": new Date(content.LastModified).getTime(),
                    "size": content.Size
                })
            })
            if (IsTruncated) ({ Contents, IsTruncated, NextContinuationToken } = await s3.listObjectsV2({ Bucket: bucket, ContinuationToken: NextContinuationToken }).promise());

        } while (IsTruncated)
        console.log(`获取${bucket}文件列表完成，共${fileMaps.length}个文件`);
        fileMaps.forEach(fileMap => {
            const path = `dist/${fileMap.fullpath}`;
            mkDir(path);
        })
        console.log('保存文件列表...');
        fs.writeFileSync(`dist/fileMaps.json`, JSON.stringify(fileMaps, null, 2));
        console.log('尝试从先前的Page文件列表中获取文件...');
        const oldFileMaps = JSON.parse(request(PageUrl + '/fileMaps.json').body || "[]")
        console.log(`先前的Page文件列表中共有${oldFileMaps.length}个文件`);
        fileMaps.forEach(fileMap => {
            const path = `dist/${fileMap.fullpath}`;
            if (oldFileMaps.find(oldFileMap => oldFileMap.fullpath === fileMap.fullpath && oldFileMap.time === fileMap.time)) {
                console.log(`文件${fileMap.path}未发生变化，将从先前的Page文件列表中获取`);
                request(PageUrl + '/' + fileMap.fullpath).pipe(fs.createWriteStream(path));
                console.log(`文件${fileMap.fullpath}下载完成`);
                return;
            }
            console.log(`文件${fileMap.fullpath}发生变化，开始下载...`);
            s3.getObject({ Bucket: bucket, Key: fileMap.path }).createReadStream().pipe(fs.createWriteStream(path));
            console.log(`文件${fileMap.fullpath}下载完成`);
        })
        console.log(`文件列表${bucket}同步完成`);
    }
    console.log('文件同步完成，PageCI将在稍后自动上传文件列表');
})()