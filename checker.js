const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const mkdirp = require('mkdirp')
const ProxyAgent = require('proxy-agent');
const fs = require('fs')
const { performance } = require('perf_hooks')
const { wait, duration, datetocompact, numberFormat, fY, fG, fR, bright } = require('./utils/')
const { interval, proxy, proxiesType, proxiesfile, debug, codesfile, bURL, params } = require('./config.json').checker
const { prefix, suffix, length, random } = require('./config.json').generator
let { enabled, port, updateRate, privkey, fullchain } = require('./config.json').client
let wss
if (enabled) {
    try {
        const WebSocket = require('ws');
        const https = require('https');
        privkey = fs.readFileSync(privkey, 'utf8');
        fullchain = fs.readFileSync(fullchain, 'utf8');
        const httpsServer = https.createServer({ key: privkey, cert: fullchain });
        httpsServer.listen(port);
        wss = new WebSocket.Server( { server: httpsServer } )
    } catch (e) {}
}
const generator = require('./generator.js');

mkdirp.sync(codesfile.match(/.*(\/|\\)/g)[0])
if (!fs.existsSync(codesfile)) fs.writeFileSync(codesfile, "")
let codes = fs.readFileSync(codesfile, { encoding: 'utf-8' }).split('\n').filter(c => c).map(c => formatCode(c))
/** @type {WebSocket[]} */
const clients = []
const codesMaxSize = 10000
const valids = []
let c = 0
const max = Number(process.argv?.[2] || codes.length)
let pauseMs = interval
let pause = false
let pauseLog = 0
let lastGrab = 0

process.on("SIGINT", () => end(performance.now()) );

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

if (wss) wss.on("connection", (ws) => {
    clients.push(ws)
    dbug(`New ws connection : ${ws.id}`)
    ws.on("disconnect", () => {
        clients.splice(clients.indexOf(ws), 1)
        dbug(`ws connection closed : ${ws.id}`)
    })
})
if (wss) setInterval(() => {
    dbug(`Sockets actualization`)
    const up = proxies.filter(p => p.working && p.readyAt <= Date.now()).length
    const alive = proxies.filter(p => p.working).length
    const dead = proxies.filter(p => !p.working).length
    clients.forEach(ws => {
        ws.send(JSON.stringify({
            type: 'codes',
            toCheck: max,
            checked: c,
            valids: valids.length,
        }))
        ws.send(JSON.stringify({
            type: 'proxies',
            up,
            alive,
            dead,
        }))
    })
}, updateRate);

function log(str) {
    if (pauseLog) wait(pauseLog).then(() => {
        pauseLog = 0
        log(str)
    })
    else {
        console.log(str)
        if (wss) clients.forEach(ws => {
            ws.send(JSON.stringify({
                type: "log",
                message: str.replace(/\[\d{1,2}m/g, ''),
            }))
        })
    }
}

function dbug(str) {
    if (debug) log(`${fY('[DBUG]')} ${str}`)
}

function formatCode(c) {
    return {
        code: c,
        c: false,
        t: Infinity,
    }
}

async function actualizeCodes()  {

    dbug(`Purging codes...`)
    let newCodes = codes.filter(c => !c.c || c.c == 'ongoing').map(c => {
        if (Date.now()-c.t > 30000) c.c = false, c.t = Infinity
        return c
    })
    dbug(`${fY(codes.length-newCodes.length)} codes purged.`)
    
    const n = codesMaxSize-newCodes.length
    if (n > 0) {
        dbug(`Adding ${fY(n)} more codes...`)
        const r = await generator(prefix, suffix, length, random, n)
        newCodes.push(...r.codes.map(c => formatCode(c)))
        log(`Added ${fY(n)} more codes.`)
    }
    return newCodes
}

if (proxy) setInterval(() => {
    const up = numberFormat(proxies.filter(p => p.working && p.readyAt <= Date.now()).length)
    const alive = numberFormat(proxies.filter(p => p.working).length)
    const dead = numberFormat(proxies.filter(p => !p.working).length)
    log(`\n\nProxies up : ${fG(up)}\nProxies alive : ${fY(alive)}\nProxies dead : ${fR(dead)} (purging)\n\n`)
    pauseLog = 2500
    proxies = proxies.filter(p => p.working)
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
            c: null,
            v: null
        }

        this.used(1)
        this.debug(fY(`Checking ${code}...`))

        try {

            const body = await (await fetch(url, this.proxy ? { agent: new ProxyAgent(this.URI), headers: { 'User-Agent': 'unknown' } } : { headers: { 'User-Agent': 'unknown' } } )).json()

            if (body?.redeemed == false && new Date(body?.expires_at) > Date.now()) {
                log(fG(`[HIT] Check succeed, code : ${code}.`))
                return {
                    c: true,
                    v: true
                }
            } else {
                if (body.message == 'Unknown Gift Code') {
                    this.debug(fR(`Check failed (404)`))
                    return {
                        c: true,
                        v: false
                    }
                } else if (body.message == 'You are being rate limited.') {
                    let int = body.retry_after*1000
                    this.debug(fR(`Check missed (429), waiting ${numberFormat(int)}ms.`))
                    this.used(5, int)
                    return {
                        c: false,
                        v: null
                    }
                } else {
                    this.debug(fR(bright(`Unknow message (${body})`)))
                    return {
                        c: null,
                        v: null
                    }
                }
            } 
        } catch(e) {
            this.debug(fR(`Fetch missed (${e})`))
            if (!e.toString().toLowerCase().replace(/ +/g, '').includes('timedout')) this.working = false
            return {
                c: false,
                v: null
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
            if (time > 60000) this.working = false
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
/**
 * @type {Array<Proxy>}
 */
let proxies = []
const localProxy = new Proxy(null)
if (proxy) {
    mkdirp.sync(proxiesfile.match(/.*(\/|\\)/g)[0])
    if (!fs.existsSync(proxiesfile)) fs.closeSync(fs.openSync(proxiesfile, 'w')), grabProxies()
    proxies = fs.readFileSync(proxiesfile, { encoding: 'utf-8' }).split('\n').filter(p => p).map((proxy, i) => new Proxy(proxy, i))
    proxies.push(localProxy)
}

async function grabProxies() {

    if (Date.now()-lastGrab < 10000) {
        dbug(fR(`Codes actualization in cooldown, waiting ${duration(Date.now()-lastGrab, true, true)}.`))
        await wait(1000)
        return codes
    }

    lastGrab = Date.now()
    dbug("Autograbbing proxies...")
    await fetch("https://api.proxyscrape.com/?request=displayproxies&proxytype=http&timeout=10000&country=all&anonymity=all&ssl=yes").then(async (res) => {
        /**
         * @type {String}
         */
        const body = await res.text()
        const lines = body.split('\n').filter(line => !proxies.find(p => p.proxy == line))
        log(`Automatically grabbed ${fY(lines.length)} proxies.`)
        for (let line of lines) {
            proxies.push(new Proxy(line, (proxies[proxies.length-1]?.id || 0)+1))
        }
    });

}

async function main() {
    
    const dura = () => proxy ? (max-c)/(5*proxies.filter(p => p.working).length)*60000 : (max-c).length/5*60000
    console.info(fG(`Lauching ${max} checks, estimated time : ${duration(dura(), true, true)} | ${datetocompact(dura()+Date.now())}`))

    let d = 0
    let prevC = c

    while (c < max) {

        if (!pause && (c-d > Math.sqrt(codesMaxSize) || codes.filter(c => Date.now()-c.t > 30000).length > Math.sqrt(codesMaxSize) || !codes.find(c => !c.c && c.c != 'ongoing'))) {
            pauseMs = 1000
            pause = true
            codes = await actualizeCodes()
            d = c
            pause = false
            pauseMs = interval
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

        if (prevC != c) log(`Checked ${fG(`${numberFormat(c)}`)}/${fY(`${numberFormat(max)}`)} (${fG(valids.length)}), ${numberFormat(max-c)} code(s) remaining (≈ ${duration(dura(), true, true)}).`), prevC = c
        
        await wait(pause ? pauseMs : interval)
    }

    end(performance.now())

}

async function tryCode() {

    let code = codes.find(c => !c.c)
    if (!code) return

    code.c = "ongoing"
    code.t = Date.now()

    let matches = code.code.match(/[0-z]+/g)
    if (!matches) return //ensure for matching nitro code
    let codeOK = matches[matches.length-1] //remove any previous '...discord.gift/' or trailing sh*t

    let fullURL = `${bURL}${codeOK}${params}`

    if (!proxies.length || proxies.filter(p => p.working).length < 30) await grabProxies()

    const prox = proxies.sort((a,b) => a.uses-b.uses).filter(p => p.working && p.ready)[0]
    if (proxy && !prox) {
        let next = proxies.sort((a,b) => a.readyAt-b.readyAt).filter(p => p.working)[0]
        dbug(fR(`No more proxy available | Next ready in ${duration(next.readyAt-Date.now(), true, true)}.`))
        grabProxies()
        return next.readyAt
    }
    if (!proxy && !localProxy.ready) {
        dbug(fR(`Rate-limited | Ready in ${duration(localProxy.readyAt-Date.now(), true, true)}.`))
        return localProxy.readyAt
    }

    const r = proxy ? await prox.check(fullURL, codeOK) : await localProxy.check(fullURL, codeOK)

    code.c = r.c
    code.t = Infinity
    if (r.c) c++
    if (r.v) valids.push(codeOK)
    return true

}

function end(end) {

    pauseMs = 60000
    pause = true
    pauseLog = 60000

    let validsTxt = ''
    let validsFile = codesfile.match(/.*(\/|\\)/g)[0]+'valids.txt'
    mkdirp.sync(validsFile.match(/.*(\/|\\)/g)[0])
    if (fs.existsSync(validsFile)) {
        validsTxt = fs.readFileSync(validsFile, { encoding: 'utf-8' })
        fs.unlinkSync(validsFile)
    }
    let writeStream = fs.createWriteStream(validsFile, { encoding: 'utf-8' })
    writeStream.write(validsTxt+valids.join('\n'))
    writeStream.close()

    mkdirp.sync(codesfile.match(/.*(\/|\\)/g)[0])
    if (fs.existsSync(codesfile)) fs.unlinkSync(codesfile) //overwrite codes
    writeStream = fs.createWriteStream(codesfile, { encoding: 'utf-8' })
    writeStream.write(codes.filter(c => !c.c).map(c => c.code).join('\n'))
    writeStream.close()

    mkdirp.sync(proxiesfile.match(/.*(\/|\\)/g)[0])
    if (fs.existsSync()) fs.unlinkSync(proxiesfile) //overwrite codes
    writeStream = fs.createWriteStream(proxiesfile, { encoding: 'utf-8' })
    writeStream.write(proxies.filter(p => p.working).map(p => p.proxy).join('\n'))
    writeStream.close()

    console.info(fG(`End of check, ${numberFormat(c)} checked, ${numberFormat(valids.length)} valid ; took ${duration(end-start, true, true)}.`))

    wait(2000).then(() => process.exit())

}

const start = performance.now()
main()