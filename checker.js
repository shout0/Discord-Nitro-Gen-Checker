const fetch = require('node-fetch');
const fs = require('fs')
const { performance } = require('perf_hooks')
const { wait, duration, datetocompact, numberFormat, fY, fG, fR, bright } = require('./utils.js')

const bURL = 'https://discordapp.com/api/v8/entitlements/gift-codes/'
const params = '?with_application=false&with_subscription_plan=true'
const interval = 5000 // 5req/min
const debug = true
const codesfile = 'codes.txt'

const codes = fs.readFileSync(codesfile, { encoding: 'utf-8' }).split('\n')
const valids = []
let max = codes.length
let c = 0

process.on("SIGINT", async () => {
    end(performance.now())

    await wait(5000)

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
    if (debug) console.log(`${fY('[DBUG]')} ${str}`)
}

async function main() {

    dbug(fG(`Lauching ${codes.length} checks, estimated time : ${duration(codes.length/5*60000, true, true)} | ${datetocompact(codes.length/5*60000+Date.now())}`))
    
    while (codes.length > 0) {

        let code = codes[0]

        let matches = code.match(/[0-z]+/g)
        if (!matches) continue //ensure for matching nitro code
        code = matches[matches.length-1] //remove any previous '...discord.gift/' or trailing sh*t

        let fullURL = `${bURL}${code}${params}`
        dbug(fY(`Checking ${code}...`))

        const r = await check(fullURL)
        if (r) codes.shift(), c++
        dbug(`Checked ${numberFormat(c)}/${numberFormat(max)}, ${numberFormat(codes.length)} code(s) remaining (≈ ${duration(codes.length/5*60000, true, true)}).`)

        await wait(interval)

    }

    end(performance.now())
}

function end(end) {

    let validsTxt = ''
    if (fs.existsSync('./valids.txt')) {
        validsTxt = fs.readFileSync('./valids.txt', { encoding: 'utf-8' })
        fs.unlinkSync('./valids.txt')
    }
    let writeStream = fs.createWriteStream('./valids.txt', { encoding: 'utf-8' })
    writeStream.write(validsTxt+valids.join('\n'))
    writeStream.close()

    if (fs.existsSync(codesfile)) fs.unlinkSync(codesfile) //overwrite codes
    writeStream = fs.createWriteStream(codesfile, { encoding: 'utf-8' })
    writeStream.write(codes.join('\n'))
    writeStream.close()

    dbug(fG(`End of check, ${numberFormat(c)} checked, ${numberFormat(valids.length)} valid ; took ${duration(end-start, true, true)}.`))

}

async function check(url) {

    try {
        const body = await (await fetch(url)).json()
        if (body?.redeemed == false && new Date(body?.expires_at) > Date.now()) {
            valids.push(code)
            dbug(fG(`Check succeed, code : ${code}.`))
            return true
        } else {
            if (body.message == 'Unknown Gift Code') {
                dbug(fR(`Check failed (404)`))
                return true
            }
            else if (body.message == 'You are being rate limited.') {
                dbug(fR(`Check failed (429), waiting ${numberFormat(body.retry_after*1000)}ms.`))
                await wait(body.retry_after*1000)
                return false
            } else {
                dbug(fR(bright(`Unknow message (${body})`)))
                return false
            }
        } 
    } catch(e) {
        dbug(fR(`Fetch failed (${e})`))
        return false
    }
    
}

const start = performance.now()
main()