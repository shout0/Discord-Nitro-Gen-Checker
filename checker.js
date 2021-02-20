const fetch = require('node-fetch');
const ProxyAgent = require('proxy-agent');
const fs = require('fs')
const { performance } = require('perf_hooks')
const { wait, duration, datetocompact, numberFormat, fY, fG, fR, bright } = require('./utils.js')

const interval = 100 // 5req/min
const proxy = true
const proxiesType = 'http' // http, https, socks4, socks5
const proxiesfile = './proxies/proxies.txt'
const debug = true
const codesfile = './codes/codes.txt'

const bURL = 'https://discordapp.com/api/v8/entitlements/gift-codes/'
const params = '?with_application=false&with_subscription_plan=true'
const codes = fs.readFileSync(codesfile, { encoding: 'utf-8' }).split('\n').filter(c => c)
const failed = []
const valids = []
let max = codes.length
let c = 0
let pauseMs = interval
let pause = false
let pauseDBUG = 0

process.on("SIGINT", async () => {
    end(performance.now())

    await wait(3000)

    process.exit();
});

console.log(`                                            @@@@@@@@@                      
                      /#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#(   
            *@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@% .#        
       @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@.        &@@@@                   
   #@@@@@@@@@@@@@@@@@@@@@@@@@@@@    @@@@@@@       ,@@@@@,                  
   *@@@@@@@@@&#  @@@@@@@@@@@&       @@@@@@@/     .@@@@@@                   
 #@@@@         @@@@@@@@@@@          @@@@@@@/    &@@@@@@/                   
             /@@@@@@@@@,            @@@@@@@/  (@@@@@@@@                    
           .@@@@@@@@@               @@@@@@@#@@@@@@@@@&                     
          #@@@@@@@@*                @@@@@@@@@@@@@@@@                       
          @@@@@@@@                  @@@@@@@@@@@@@*                         
         @@@@@@@&                   @@@@@@@@@@&                            
        @@@@@@@@                    @@@@@@@@@@@@@                          
        @@@@@@@                     @@@@@@@@@@@@@@@                        
        @@@@@@@                      @@@@@@@@@@@@@@@@                      
        @@@@@@@                      @@@@@@  &@@@@@@@@@                    
         @@@@@@@                     @@@@@@     @@@@@@@&                   
          @@@@@@@                    (@@@@@      *@@@@@@&                  
           @@@@@@@@                   @@@@@        @@@@@@                  
            *@@@@@@@@#               *@@@@@         @@@@@.                 
              ,@@@@@@@@@@@,,     ,%@@@@@@@@          .@@@.                 
                  @@@@@@@@@@@@@@@@@@@   @@@            (@                  
                       **@@@@@@#,        @@            **                  
                                         ,@         
            

            Made by Catatomik
            
            `)

function dbug(str) {
    if (debug) {
        if (pauseDBUG) setTimeout(() => {
            pauseDBUG = 0
            dbug(str)
        }, pauseDBUG);
        else console.log(`${fY('[DBUG]')} ${str}`)
    }
}

if (debug) setInterval(() => {
    dbug(fY(`\n\nProxies up : ${numberFormat(proxies.filter(p => p.working && p.readyAt <= Date.now()).length)}\nProxies alive : ${numberFormat(proxies.filter(p => p.working).length)}\n\n`))
    pauseDBUG = 3000
}, 10000);

class Proxy {
    /**
     * Define new proxy, 5req/min per proxy.
     * @param {String} proxy ip:port of the proxy
     */
    constructor(proxy, id) {
        this.proxy = proxy
        this.URI = `${proxiesType}://${this.proxy}`
        this.id = id == undefined ? this.proxy.split('').reduce((acc, v) => acc+v.charCodeAt(0), 0) : id
        this.ready = true
        this.readyAt = Date.now()
        this.uses = 0
        this.working = true
    }

    /**
     * Checks for an URL of Nitro Gift Code, using proxy.
     * @param {String} url URL to check
     */
    async check(url, code) {

        if (!this.ready) return null

        this.used(1)
        this.debug(fY(`Checking ${code}...`))

        try {

            if (!this.proxy) return await check(url)

            const body = await (await fetch(url, { agent: new ProxyAgent(this.URI), headers: { 'User-Agent': 'unknown' } })).json()

            if (body?.redeemed == false && new Date(body?.expires_at) > Date.now()) {
                valids.push(code)
                this.debug(fG(`{${this.id}} Check succeed, code : ${code}.`))
                return {
                    checked: true,
                    valid: true
                }
            } else {
                if (body.message == 'Unknown Gift Code') {
                    this.debug(fR(`Check failed (404)`))
                    return {
                        checked: true,
                        valid: false
                    }
                } else if (body.message == 'You are being rate limited.') {
                    let int = body.retry_after*1000
                    this.debug(fR(`Check failed (429), waiting ${numberFormat(int)}ms.`))
                    this.used(5, int)
                    return {
                        checked: false,
                        valid: null
                    }
                } else {
                    this.debug(fR(bright(`Unknow message (${body})`)))
                    return {
                        checked: null,
                        valid: null
                    }
                }
            } 
        } catch(e) {
            this.debug(fR(`Fetch failed (${e})`))
            if (!e.toString().includes('timed out')) this.working = false
            return {
                checked: false,
                valid: null
            }
        }

    }

    /**
     * Add uses to the proxy.
     * @param {Number} n Number of uses to add
     */
    used(n = 1, time = 60000) {
        this.uses += n
        if (this.uses >= 5) {
            this.ready = false
            this.readyAt = Date.now()+time
            this.rateLimited(time)
        }
    }

    /**
     * Make this proxy rate-limited and not ready for a given time.
     * @param {Number} ms Number of ms to wait
     */
    rateLimited(ms) {
        const p = this
        setTimeout(() => {
            p.uses = 0
            p.ready = true
        }, ms)
    }

    /**
     * Debug proxy
     * @param {String} str 
     */
    debug(str) {
        if (this.working) dbug(`${fY(`{${this.id}}`)} ${str}`)
    }
}
const proxies = proxy ? fs.readFileSync(proxiesfile, { encoding: 'utf-8' }).split('\n').filter(p => p).map((proxy, i) => new Proxy(proxy, i)) : null

async function main() {
    
    const dura = () => proxies.length ? codes.length/interval : codes.length/5*60000
    dbug(fG(`Lauching ${codes.length} checks, estimated time : ${duration(dura(), true, true)} | ${datetocompact(dura()+Date.now())}`))

    while (c < max) {

        if (codes.length == 0 && failed.length > 0) failed.forEach(_ => codes.push(failed.pop()))
        else if (codes.length == 0) {
            await wait(1000)
            continue
        }

        if (!proxy) {

            let r = await tryCode()
            if (typeof(r) == 'number') pauseMs = r-Date.now(), pause = true, setTimeout(() => {
                pause = false
            }, r-Date.now());

        } else tryCode().then(r => {

            if (typeof(r) == 'number') pauseMs = r-Date.now(), pause = true, setTimeout(() => {
                pause = false
            }, r-Date.now());

        })

        dbug(`Checked ${fG(`${numberFormat(c)}/${numberFormat(max)}`)} (${fG(valids.length)}), ${numberFormat(codes.length)} code(s) remaining (≈ ${duration(codes.length/5*60000, true, true)}).`)
        
        pause ? await wait(pauseMs) : await wait(interval)
    }

    end(performance.now())

}

async function tryCode() {

    let code = codes.shift()
    if (!code) return

    let matches = code.match(/[0-z]+/g)
    if (!matches) return //ensure for matching nitro code
    let codeOK = matches[matches.length-1] //remove any previous '...discord.gift/' or trailing sh*t

    let fullURL = `${bURL}${codeOK}${params}`

    const prox = proxies.sort((a,b) => a.uses-b.uses).filter(p => p.working && p.ready)[0]
    if (proxy && !prox) {
        failed.push(code)
        let next = proxies.sort((a,b) => a.readyAt-b.readyAt).filter(p => p.working)[0]
        dbug(fR(`No more proxy available | Nex ready in ${duration(next.readyAt-Date.now(), true, true)}.`))
        return next.readyAt
    }

    const r = proxy ? await prox.check(fullURL, codeOK) : await check(fullURL, codeOK)

    if (!r.checked) failed.push(code)
    else {
        c++
        if (r.valid) valids.push(codeOK)
    }
    return true

}

/**
 * Checks for an URL of Nitro Gift Code, no proxy.
 * @param {String} url 
 */
async function check(url, code) {

    dbug(fY(`Checking ${code}...`))

    try {
        const body = await (await fetch(url)).json()
        if (body?.redeemed == false && new Date(body?.expires_at) > Date.now()) {
            dbug(fG(`Check succeed, code : ${code}.`))
            return {
                checked: true,
                valid: true
            }
        } else {
            if (body.message == 'Unknown Gift Code') {
                dbug(fR(`Check failed (404)`))
                return {
                    checked: true,
                    valid: false
                }
            } else if (body.message == 'You are being rate limited.') {
                dbug(fR(`Check failed (429), waiting ${numberFormat(body.retry_after*1000)}ms.`))
                await wait(body.retry_after*1000)
                return {
                    checked: false,
                    valid: null
                }
            } else {
                dbug(fR(bright(`Unknow message (${body})`)))
                return {
                    checked: null,
                    valid: null
                }
            }
        } 
    } catch(e) {
        dbug(fR(`Fetch failed (${e})`))
        return {
            checked: false,
            valid: null
        }
    }
    
}

function end(end) {

    pauseMs = 60000
    pause = true

    let validsTxt = ''
    if (fs.existsSync('./codes/valids.txt')) {
        validsTxt = fs.readFileSync('./codes/valids.txt', { encoding: 'utf-8' })
        fs.unlinkSync('./codes/valids.txt')
    }
    let writeStream = fs.createWriteStream('./codes/valids.txt', { encoding: 'utf-8' })
    writeStream.write(validsTxt+valids.join('\n'))
    writeStream.close()

    if (fs.existsSync(codesfile)) fs.unlinkSync(codesfile) //overwrite codes
    writeStream = fs.createWriteStream(codesfile, { encoding: 'utf-8' })
    if (failed.length) codes.push(...failed)
    writeStream.write(codes.join('\n'))
    writeStream.close()

    if (fs.existsSync(proxiesfile)) fs.unlinkSync(proxiesfile) //overwrite codes
    writeStream = fs.createWriteStream(proxiesfile, { encoding: 'utf-8' })
    writeStream.write(proxies.filter(p => p.working).map(p => p.proxy).join('\n'))
    writeStream.close()

    dbug(fG(`End of check, ${numberFormat(c)} checked, ${numberFormat(valids.length)} valid ; took ${duration(end-start, true, true)}.`))
    pauseDBUG = 60000

}

const start = performance.now()
main()