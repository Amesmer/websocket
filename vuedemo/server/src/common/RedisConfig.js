/**
 * @Author ike
 * @description redis4.0+数据库模块
 */
const redis = require('redis')
const redis_config = {
    host: '127.0.0.1',
    port: '11050',
    password: '',
    number: 0,
}

const url = `redis://:${redis_config.password}@${redis_config.host}:${redis_config.port}/${redis_config.number}`

class Redis {
    constructor() {
        this.redisClient = redis.createClient({ 'url': url })
        this.redisClient.on('ready', () => {
            console.log('redis is ready...')
        })
        this.redisClient.on('error', err => {
            console.err('err', err)
        })
        this.redisClient.connect() // 连接

        this.fun = async(callback, key, value) => {
            return new Promise(async(res, rej) => {
                // await this.redisClient.connect() // 连接
                let ok = callback(key, value) // 成功ok
                    // await this.redisClient.quit() // 关闭
                res(ok)
            })
        }
    }


    async set(key, value) {
        return this.fun(async() => {
            return await this.redisClient.set(key, value)
        }, key, value)
    }
    async get(key) {
        return this.fun(async() => {
            return await this.redisClient.get(key)
        }, key)
    }
    async del(key) {
        return this.fun(async() => {
            return await this.redisClient.del(key)
        }, key)
    }

    async increase(key) {
        return this.fun(async() => {
            return await this.redisClient.incr(key)

        }, key)

    }
    async decrease(key) {
        return this.fun(async() => {
            return await this.redisClient.decr(key)

        }, key)

    }

    async getkeys(reg) {
        return this.fun(async() => {
            return await this.redisClient.keys(reg + '*')
        }, reg)

    }
    async existKey(key) {
        return this.fun(async() => {
            return await this.redisClient.exists(key)
        }, key)

    }
    quit() {
        this.redisClient.quit()
    }
}




/*
 * 运行实例
 */
// async function runRedis() {
//     await db.set("key", "value")
//     console.log(await db.get("key"))
// }
// runRedis()


module.exports = new Redis()