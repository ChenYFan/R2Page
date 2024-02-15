import request from 'request';
import fs from 'fs';
import AWS from 'aws-sdk';
import crypto from 'crypto';
if (!fs.existsSync('dist')) fs.mkdirSync('dist');

const PageUrl = process.env.PAGE_URL
const decryptKey = process.env.DECRYPT_KEY
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

const downloadWithDecryptAsJson = (url, key) => {
    return new Promise((resolve, reject) => {
        request(url, (err, res, body) => {
            if (err) resolve([]);
            try {
                if (!body) {
                    console.log('下载失败，返回数据为空，视为无FileMap文件');
                    resolve([]);
                    return;
                }
                let data = body.toString();
                if (!key) {
                    console.log('未配置解密Key，将直接返回下载的数据');
                    resolve(JSON.parse(data));
                    return;
                }
                const decipher = crypto.createDecipher('aes192', key);
                let decrypted = decipher.update(data, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                resolve(JSON.parse(decrypted, null, 4));
            } catch (e) {
                console.log(`下载解密失败，错误信息：${e.message}`);
                resolve([]);
            }
        })
    })
}

const encryptAsJson = (data, key) => {
    if (!key) return JSON.stringify(data);
    const cipher = crypto.createCipher('aes192', key);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

const downloadAsFile = (url, path) => {
    return new Promise((resolve, reject) => {
        request(url).pipe(fs.createWriteStream(path)).on('close', () => resolve());
    })
}



!!(async () => {
    console.log(`部分配置信息配置如下：\nPAGE_URL: ${PageUrl}\nAWS_ENDPOINT_URL: ${process.env.AWS_ENDPOINT_URL}\n是否对FileMap进行解密: ${decryptKey ? '是' : '否'}`);
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
            console.log(`当前查询结果：IsTruncated: ${IsTruncated}, NextContinuationToken: ${NextContinuationToken}`)
            if (IsTruncated) ({ Contents, IsTruncated, NextContinuationToken } = await s3.listObjectsV2({ Bucket: bucket, ContinuationToken: NextContinuationToken }).promise());

        } while (IsTruncated)
        console.log(`获取${bucket}文件列表完成，共${fileMaps.length}个文件`);
        fileMaps.forEach(fileMap => {
            const path = `dist/${fileMap.fullpath}`;
            mkDir(path);
        })
        console.log('保存文件列表...');

        fs.writeFileSync(`dist/fileMaps.json`, encryptAsJson(fileMaps, decryptKey));
        console.log('尝试从先前的Page文件列表中获取文件...');

        const oldFileMaps = await downloadWithDecryptAsJson(`${PageUrl}/fileMaps.json`, decryptKey);
        console.log(`先前的Page文件列表中共有${oldFileMaps.length}个文件`);
        if (!fs.existsSync(`./node_modules/.astro`)) fs.mkdirSync(`./node_modules/.astro`);
        fs.cpSync(`./node_modules/.astro`, `./FakeAstroCache`, { recursive: true, force: true });
        fs.rmSync(`./node_modules/.astro`, { recursive: true, force: true });

        const astroFiles = fs.readdirSync(`./FakeAstroCache`).length;
        console.log(`伪装Astro缓存文件夹中共有${astroFiles}个文件`);

        for (let fileMap of fileMaps) {
            const path = `dist/${fileMap.fullpath}`;
            if (oldFileMaps.find(oldFileMap => oldFileMap.fullpath === fileMap.fullpath && oldFileMap.time === fileMap.time)) {
                console.log(`文件${fileMap.path}未发生变化，将尝试从Astro缓存中获取...`);
                if (fs.existsSync(`./FakeAstroCache/${fileMap.fullpath}`)) {
                    console.log(`文件${fileMap.fullpath}在Astro缓存中存在，将直接复制...`);
                    fs.copyFileSync(`./FakeAstroCache/${fileMap.fullpath}`, path);
                    console.log(`文件${fileMap.fullpath}复制完成`);
                    continue;
                } else {
                    console.log(`文件${fileMap.fullpath}在Astro缓存中不存在，将尝试下载...`);
                    await downloadAsFile(encodeURI(`${PageUrl}/${fileMap.fullpath}`), path);
                    console.log(`文件${fileMap.fullpath}下载完成`);
                    continue;   
                }
            }
            console.log(`文件${fileMap.fullpath}发生变化，开始下载...`);
            s3.getObject({ Bucket: bucket, Key: fileMap.path }).createReadStream().pipe(fs.createWriteStream(path));
            console.log(`文件${fileMap.fullpath}下载完成`);
        }
        console.log(`文件列表${bucket}同步完成`);
    }
    console.log('所有的文件同步完成，正在拷贝至Astro缓存...');
    await fs.cpSync(`./dist`, `./node_modules/.astro`, { recursive: true, force: true });
    console.log('拷贝完成，程序结束');
    process.exit(0);
})()