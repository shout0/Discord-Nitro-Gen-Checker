const fs = require('fs')
const { performance } = require('perf_hooks')
const { rand, duration, numberFormat } = require('./utils.js')
const { prefix, suffix, length, random, amount, debug, outfile } = require('./config.json').generator

const E = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' //62
const max = E.length-1

const codes = []

if (outfile) if (fs.existsSync(outfile)) fs.unlinkSync(outfile)

const main = async () => {

    const start = performance.now()
    if (debug) console.log(`[DEBUG] Starting generation...`)

    if (random) {
        
        if (debug) console.log(`[DEBUG] Generating ${amount} codes of length ${length}.`)

        for (let n = 0; n < amount; n++) {
            let str = ''
            for (let i = 0; i < length; i++) {
                str += E[Math.floor(rand(0, E.length-1))]
            }
            codes.push(prefix+str+suffix)
        }

    } else {

        const nmax = E.length**length

        if (debug) console.log(`[DEBUG] Generating ${numberFormat(nmax)} codes of length ${length}.`)

        let state = Array(length).fill(0)

        while (true) {

            str = ''
            for (let i = 0; i < length; i ++) {
                str += E[state[i]]
            }
            codes.push(prefix+str+suffix)
            if (debug) console.log(`[DEBUG] Generated ${numberFormat(codes.length)}/${numberFormat(nmax)} codes.`)

            let c = false
            for (let i = 0; i < length; i++) {
                if (state[i] < max) {
                    state[i]++
                    c = true
                    for (let i2 = 0; i2 < i; i2++) { //reset previous
                        state[i2] = 0
                    }
                    break
                } else if (state[i] == max) continue
            }
            if (!c) break

        }
    }
    
    const end = performance.now()

    if (outfile) {
        const writeStream = fs.createWriteStream(outfile, { encoding: 'utf-8' })
        writeStream.write(codes.join('\n'))
        writeStream.close()
    }
    if (debug) console.info(`[DEBUG] End of generation, ${codes.length} code(s) created ; took ${duration(end-start, true, true)}.`)

}

main()