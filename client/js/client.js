const ws = new WebSocket("wss://catadev.ga/wss")

let lines = []
ws.addEventListener('message', (event) => {
    const o = JSON.parse(event.data)
    switch (o.type) {
        case 'log':
            const logs = document.getElementById('logs')
            lines.push(o.message)
            if (lines.length > 16) lines.shift()
            logs.innerHTML = lines.join('<br>')
            logs.scrollTop = logs.scrollHeight;
            break
        case 'codes':
            document.getElementById('codesChecked').innerHTML = o.checked
            document.getElementById('codesRemaining').innerHTML = o.toCheck-o.checked
            document.getElementById('codesValids').innerHTML = o.valids
            break
        case 'proxies':
            document.getElementById('proxiesUp').innerHTML = o.up
            document.getElementById('proxiesAlive').innerHTML = o.alive
            document.getElementById('proxiesDead').innerHTML = o.dead
            break;
    }
})