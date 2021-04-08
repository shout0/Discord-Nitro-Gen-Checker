const ws = new WebSocket("wss://catadev.ga/wss")

const lines = []
ws.addEventListener('message', (event) => {
    const o = JSON.parse(event.data)
    switch (o.type) {
        case 'log':
            const logs = document.getElementById('logs')
            const max = Math.floor(logs.clientHeight/getLineHeight(logs))
            lines.push(o.message)
            if (lines.length > max) lines.shift()
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

function getLineHeight(el) {
    let temp = document.createElement(el.nodeName), ret;
    temp.setAttribute("style", "margin:0; padding:0; "
        + "font-family:" + (el.style.fontFamily || "inherit") + "; "
        + "font-size:" + (el.style.fontSize || "inherit"));
    temp.innerHTML = "A";

    el.parentNode.appendChild(temp);
    ret = temp.clientHeight;
    temp.parentNode.removeChild(temp);

    return ret;
}