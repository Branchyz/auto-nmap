const { exec } = require('child_process');

const { promisify } = require('util');
const execAsync = promisify(exec);

const ipInp = document.getElementById('ip');
const subnetInp = document.getElementById('subnet');
const intervalInp = document.getElementById('interval');

const startBtn = document.getElementById('start');
const updateBtn = document.getElementById('update');
const stopBtn = document.getElementById('stop');

const loadingSpinner = document.getElementById('loading');

const outputTable = document.getElementById('output');

let isRunning = false;

let interval;
let intervalArgs;

startBtn.addEventListener('click', async () => {
    if (isRunning) {
        return;
    }

    const ip = ipInp.value
    const subnet = subnetInp.value;
    let seconds = intervalInp.value;

    if (!ip || !subnet || !seconds) {
        alert('Please fill all fields');
        return;
    }

    if(!ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
        alert('Invalid IP address');
        return;
    }

    if(isNaN(parseInt(subnet))) {
        alert('Subnet should be a number');
        return;
    }

    seconds = parseInt(seconds);
    if(isNaN(seconds)) {
        alert('Interval should be a number');
        return;
    }


    if(seconds < 5) {
        alert('Interval should be at least 5 seconds');
        return;
    }

    isRunning = true;
    startBtn.disabled = true;
    updateBtn.disabled = false;
    stopBtn.disabled = false;

    startBtn.className = 'bg-gray-400 text-white font-bold py-2 px-4 rounded-full mr-2';
    updateBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full mr-2';
    stopBtn.className = 'bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full';

    intervalArgs = { ip, subnet }
    await intervalCallback(ip, subnet);
    interval = setInterval(intervalCallback, seconds * 1000, ip, subnet);
})

updateBtn.addEventListener('click', async () => {
    if(!isRunning) {
        alert('Please start the scan first');
        return;
    }

    const { ip, subnet } = intervalArgs;
    await intervalCallback(ip, subnet);
})

stopBtn.addEventListener('click', () => {
    if (!isRunning) {
        return;
    }

    isRunning = false;
    stopBtn.disabled = true;
    updateBtn.disabled = true;
    startBtn.disabled = false;

    stopBtn.className = 'bg-gray-400 text-white font-bold py-2 px-4 rounded-full';
    updateBtn.className = 'bg-gray-400 text-white font-bold py-2 px-4 rounded-full mr-2';
    startBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full mr-2';

    clearInterval(interval);

    clearTable();
    loadingSpinner.classList.add('hidden');
})

const execNmap = async (ip, subnet) => {
    const { stdout, stderr } = await execAsync(`nmap -sn ${ip}/${subnet}`);
    return stdout;
}

const parseNmap = (nmapOutput, subnet) => {
    const lines = nmapOutput.split('\n');
    lines.shift();
    lines.pop();
    lines.pop();

    const result = [];

    for (let i = 0; i < lines.length; i += 3) {
        if(i + 2 >= lines.length || lines[i + 2].startsWith('Nmap scan report for')) {
            for (let j = i; j < lines.length; j += 2) {
                const ip = lines[j].split(' ')[4];
                result.push({ ip, mac: 'N/A', vendor: 'N/A' });
            }

            i = lines.length;
        } else {
            const ip = lines[i].split(' ')[4];
            const mac = lines[i + 2].split(' ')[2];
            const vendor = lines[i + 2].substring(lines[i + 2].indexOf('(') + 1, lines[i + 2].lastIndexOf(')'));

            result.push({ ip, mac, vendor });
        }
    }

    return result;
}

const populateTable = (results) => {
    if(!isRunning) {
        return;
    }

    clearTable();

    for (const { ip, mac, vendor } of results) {
        const row = document.createElement('tr');
        row.classList.add('even:bg-gray-100', 'odd:bg-gray-200');

        const ipCell = document.createElement('td');
        const macCell = document.createElement('td');
        const vendorCell = document.createElement('td');

        ipCell.innerText = ip;
        macCell.innerText = mac;
        vendorCell.innerText = vendor;

        ipCell.className = 'border border-gray-300 py-2 px-4';
        macCell.className = 'border border-gray-300 py-2 px-4';
        vendorCell.className = 'border border-gray-300 py-2 px-4';

        row.appendChild(ipCell);
        row.appendChild(macCell);
        row.appendChild(vendorCell);

        outputTable.appendChild(row);
    }
}

const clearTable = () => {
    outputTable.innerHTML = '';

    const header = document.createElement('tr');
    const ipHeader = document.createElement('th');
    const macHeader = document.createElement('th');
    const vendorHeader = document.createElement('th');

    ipHeader.innerText = 'IP';
    macHeader.innerText = 'MAC';
    vendorHeader.innerText = 'Vendor';

    header.className = 'bg-gray-200';
    ipHeader.className = 'border border-gray-300 py-2 px-4';
    macHeader.className = 'border border-gray-300 py-2 px-4';
    vendorHeader.className = 'border border-gray-300 py-2 px-4';

    header.appendChild(ipHeader);
    header.appendChild(macHeader);
    header.appendChild(vendorHeader);

    outputTable.appendChild(header);
}

const intervalCallback = async (ip, subnet) => {
    loadingSpinner.classList.remove('hidden');

    const nmap = await execNmap(ip, subnet);
    const results = parseNmap(nmap);
    populateTable(results);

    loadingSpinner.classList.add('hidden');
}
