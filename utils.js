const intl = require('intl')

class Deferred {
    constructor() {
      this.promise = new Promise((resolve, reject) => {
            this.reject = reject
            this.resolve = resolve
        })
    }
}

module.exports = {
    /**
     * @description Will resolve after ms
     * @param {Number} ms 
     */
    wait: (ms = 1000) => {
        const defP = new Deferred()
        setTimeout(()=> {
            defP.resolve()
        }, ms)
        return defP.promise
    },

    /**
     * @param {Number} ms Une durée en millisecondes
     * @param {Boolean} includeSec Un booléen indiquant s'il faut inclure les secondes
     * @returns {String} La durée formatée (YY?, MoMo?, DD?, HH?, MiMi?, SS? )
     */
    duration: (ms, includeSec = true, short = false) => {

        const positive = ms < 0 ? "- " : ""
        ms = Math.sqrt(ms**2) //ensure positive value

        let y = Math.floor(ms / 31556952000)
        ms-=y*31556952000
        let sy = y > 1 ? 's' : ''
        let mo = Math.floor(ms / 2629746000)
        ms-=mo*2629746000
        let d = Math.floor(ms / (3600000*24));
        ms-=d*3600000*24
        let sd = d > 1 ? 's' : ''
        let h = Math.floor(ms / 3600000);
        ms-=h*3600000
        let sh = h > 1 ? 's' : ''
        let mi = Math.floor(ms / 60000);
        ms-=mi*60000
        let smi = mi > 1 ? 's' : ''
        let s = Math.round(ms / 1000)
        let ss = s > 1 ? 's' : ''

        const r = `${positive}${y>0 && y < Infinity ? `${y}${short ? 'a' : ` an${sy}`} ` : ''}${mo>0 ? `${mo}${short ? 'mo' : ` mois`} ` : ''}${d>0 ? `${d}${short ? 'j' : ` jour${sd}`} ` : ''}${h>0 ? `${h}${short ? 'h' : ` heure${sh}`} ` : ''}${mi>0 ? `${mi}${short ? 'm' : ` minute${smi}`} ` : ''}${s>0 && includeSec ? `${s}${short ? 's' : ` seconde${ss}`} ` : ''}`.replace(/ $/g, '')

        return r ? r : 'ø'

    },

    /**
     * @returns {string} Une date au format "DD/MoMo/YY, HH:MiMi:SS"
     * @param {Number} date
     */
    datetocompact: (date) => {
        if (!(date instanceof Date)) date = new Date(date)
        try {
            var d = date.getDate()
            var mo = date.getMonth()+1
            var y = date.getFullYear().toString().substring(2, 4)
            var h = date.getHours()
            var mi = date.getMinutes()
            var s = date.getSeconds()
        } catch(e) {return '?'}
    
        if (d < 10) d = "0"+d
        if (mo < 10) mo = "0"+mo
        if (y < 10) y = "0"+y
        if (h < 10) h = "0"+h
        if (mi < 10) mi = "0"+mi
        if (s < 10) s = "0"+s
        return d+'/'+mo+'/'+y+', '+h+':'+mi+':'+s;
    },

    /**
     * @description Génère un flottant aléatoire entre min et max, inclus
     * @param {Number} min 
     * @param {Number} max 
     */
    rand: (min, max) => {
        return Math.round((Math.random() * (max - min + 1) + min)*100)/100
    },

    numberFormat: new intl.NumberFormat('fr-FR').format
}

Array.from([["fBlack", "\x1b[30m"], //Coloration methods
["fR", "\x1b[31m"],
["fG", "\x1b[32m"],
["fY", "\x1b[33m"],
["fB", "\x1b[34m"],
["fM", "\x1b[35m"],
["fC", "\x1b[36m"],
["fW", "\x1b[37m"],
["bBlack", "\x1b[40m"],
["bR", "\x1b[41m"],
["bG", "\x1b[42m"],
["bY", "\x1b[43m"],
["bB", "\x1b[44m"],
["bM", "\x1b[45m"],
["bC", "\x1b[46m"],
["bW", "\x1b[47m"],
["reset", "\x1b[0m"],
["bright", "\x1b[1m"],
["dim", "\x1b[2m"],
["underscore", "\x1b[4m"],
["blink", "\x1b[5m"],
["reverse", "\x1b[7m"],
["hidden", "\x1b[8m"]]).forEach(color => {
    module.exports[color[0]] = (s) => {
        return `${color[1]}${String(s).replace(/(\\x1b|)\[0m/g, "")}\x1b[0m`
    }
})