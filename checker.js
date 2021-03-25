const fetch = require('node-fetch');
const mkdirp = require('mkdirp')
const ProxyAgent = require('proxy-agent');
const fs = require('fs')
const { performance } = require('perf_hooks')
const { wait, duration, datetocompact, numberFormat, fY, fG, fR, bright } = require('./utils.js')
const { interval, proxy, proxiesType, proxiesfile, debug, codesfile, bURL, params } = require('./config.json').checker

const codes = fs.readFileSync(__dirname+codesfile, { encoding: 'utf-8' }).split('\n').filter(c => c)
const failed = []
const valids = []
let max = codes.length
let c = 0
let pauseMs = interval
let pause = false
let pauseLog = 0

process.on("SIGINT", async () => {
    end(performance.now())

    await wait(3000)

    process.exit();
});

log(`                                            @@@@@@@@@                      
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

function log(str) {
    if (pauseLog) setTimeout(() => {
        pauseLog = 0
        console.log(str)
    }, pauseLog);
    else console.log(str)
}

function dbug(str) {
    if (debug) log(`${fY('[DBUG]')} ${str}`)
}

if (proxy) setInterval(() => {
    log(fY(`\n\nProxies up : ${numberFormat(proxies.filter(p => p.working && p.readyAt <= Date.now()).length)}\nProxies alive : ${numberFormat(proxies.filter(p => p.working).length)}\nProxies dead : ${numberFormat(proxies.filter(p => !p.working).length)}\n\n`))
    pauseLog = 3000
}, 10000);

class Proxy {
    /**
     * Define new proxy, 5req/min per proxy.
     * @param {String} proxy ip:port of the proxy
     */
    constructor(proxy, id) {
        if (proxy) {
            this.proxy = proxy
            this.URI = `${proxiesType}://${this.proxy}`
            this.id = id == undefined ? this.proxy.split('').reduce((acc, v) => acc+v.charCodeAt(0), 0) : id
            this.ready = true
            this.readyAt = Date.now()
            this.uses = 0
            this.working = true
        } else if (proxy == null) {
            this.proxy = null
            this.id = id || -1
            this.ready = true
            this.readyAt = Date.now()
            this.uses = 0
            this.working = true
        }
    }

    /**
     * Checks for an URL of Nitro Gift Code, using proxy.
     * @param {String} url URL to check
     */
    async check(url, code) {

        if (!this.ready) return {
            checked: null,
            valid: null
        }

        this.used(1)
        this.debug(fY(`Checking ${code}...`))

        try {

            const body = await (await fetch(url, this.proxy ? { agent: new ProxyAgent(this.URI), headers: { 'User-Agent': 'unknown' } } : {} )).json()

            if (body?.redeemed == false && new Date(body?.expires_at) > Date.now()) {
                valids.push(code)
                log(fG(`{${this.id}} Check succeed, code : ${code}.`))
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
if (proxy) {
    mkdirp.sync(__dirname+proxiesfile.match(/.*\//g)[0])
    fs.closeSync(fs.openSync(__dirname+proxiesfile, 'w'))
}
const proxies = proxy ? fs.readFileSync(__dirname+proxiesfile, { encoding: 'utf-8' }).split('\n').filter(p => p).map((proxy, i) => new Proxy(proxy, i)) : []

async function grabProxies() {

    await fetch("https://api.proxyscrape.com/?request=displayproxies&proxytype=http&timeout=10000&country=all&anonymity=all&ssl=yes").then(async (res) => {
        const body = await res.text()
        for (let line of body.split('\n')) {
            proxies.push(new Proxy(line, (proxies[proxies.length-1]?.id || 0)+1))
        }
    });

}

async function main() {
    
    const dura = () => proxies.length ? codes.length/interval : codes.length/5*60000
    console.info(fG(`Lauching ${codes.length} checks, estimated time : ${duration(dura(), true, true)} | ${datetocompact(dura()+Date.now())}`))

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

        log(`Checked ${fG(`${numberFormat(c)}/${numberFormat(max)}`)} (${fG(valids.length)}), ${numberFormat(codes.length+failed.length)} code(s) remaining (≈ ${duration(codes.length/5*60000, true, true)}).`)
        
        await wait(pause ? pauseMs : interval)
    }

    end(performance.now())

}

const localProxy = new Proxy(null)

async function tryCode() {

    let code = codes.shift()
    if (!code) return

    let matches = code.match(/[0-z]+/g)
    if (!matches) return //ensure for matching nitro code
    let codeOK = matches[matches.length-1] //remove any previous '...discord.gift/' or trailing sh*t

    let fullURL = `${bURL}${codeOK}${params}`

    if (!proxies.length || proxies.filter(p => p.working).length < 30) await grabProxies()

    const prox = proxies.sort((a,b) => a.uses-b.uses).filter(p => p.working && p.ready)[0]
    if (proxy && !prox) {
        failed.push(code)
        let next = proxies.sort((a,b) => a.readyAt-b.readyAt).filter(p => p.working)[0]
        dbug(fR(`No more proxy available | Next ready in ${duration(next.readyAt-Date.now(), true, true)}.`))
        grabProxies()
        return next.readyAt
    }
    if (!proxy && !localProxy.ready) {
        failed.push(code)
        dbug(fR(`Rate-limited | Ready in ${duration(localProxy.readyAt-Date.now(), true, true)}.`))
        return localProxy.readyAt
    }

    const r = proxy ? await prox.check(fullURL, codeOK) : await localProxy.check(fullURL, codeOK)

    if (!r.checked) failed.push(code)
    else {
        c++
        if (r.valid) valids.push(codeOK)
    }
    return true

}

function end(end) {

    pauseMs = 60000
    pause = true

    let validsTxt = ''
    let validsFile = __dirname+'./codes/valids.txt'
    mkdirp.sync(validsFile.match(/.*\//g)[0])
    if (fs.existsSync(validsFile)) {
        validsTxt = fs.readFileSync(validsFile, { encoding: 'utf-8' })
        fs.unlinkSync(validsFile)
    }
    let writeStream = fs.createWriteStream(validsFile, { encoding: 'utf-8' })
    writeStream.write(validsTxt+valids.join('\n'))
    writeStream.close()

    let codesFile = __dirname+codesfile
    mkdirp.sync(codesFile.match(/.*\//g)[0])
    if (fs.existsSync(codesFile)) fs.unlinkSync(codesFile) //overwrite codes
    writeStream = fs.createWriteStream(codesFile, { encoding: 'utf-8' })
    if (failed.length) codes.push(...failed)
    writeStream.write(codes.join('\n'))
    writeStream.close()

    let proxiesFile = __dirname+proxiesfile
    mkdirp.sync(proxiesFile.match(/.*\//g)[0])
    if (fs.existsSync()) fs.unlinkSync(proxiesFile) //overwrite codes
    writeStream = fs.createWriteStream(proxiesFile, { encoding: 'utf-8' })
    writeStream.write(proxies.filter(p => p.working).map(p => p.proxy).join('\n'))
    writeStream.close()

    console.info(fG(`End of check, ${numberFormat(c)} checked, ${numberFormat(valids.length)} valid ; took ${duration(end-start, true, true)}.`))
    pauseLog = 60000

}

const start = performance.now()
main()