const ipc = require('electron').ipcRenderer;
const shell = require('electron').shell;
const remote = require('electron').remote;
const fs = require('fs');
const process = require('child_process');
const server = require('./server');
const package = require('./package');
const install = require('./install');
const path = require('path');

const playBtn = document.getElementById('play');
//const profcalcBtn = document.getElementById('profcalc');

const folderBox = document.getElementById('folder');
const browseBtn = document.getElementById('browse');
const installBtn = document.getElementById('install');
const fullscanBtn = document.getElementById('fullscan');

const cancelBtn = document.getElementById('cancel');
const modListBox = document.getElementById('modlist');

const progressBox = document.getElementById('progressbox');
const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progresstext');

const minBtn = document.getElementById('minimize');
const closeBtn = document.getElementById('close');

const ramSel = document.getElementById('ram');
const fpsSel = document.getElementById('fps');
const zoomSel = document.getElementById('zoom');

const swgOptionsBtn = document.getElementById('swgOptionsBtn');
const gameConfigBtn = document.getElementById('gameConfigBtn');
const gameConfigSection = document.getElementById('configSection');

// External Links
const headerLinks = document.getElementById("headerLinks");
const mainButtonLinks = document.getElementById('mainButtonLinks');

const versionDiv = document.getElementById('version');
versionDiv.innerHTML = package.version;

const configFile = require('os').homedir() + '/Documents/My Games/SWG - Sentinels Republic/SR-Launcher-config.json';
var config = {folder: 'C:\\SREmu'};

if (fs.existsSync(configFile))
    config = JSON.parse(fs.readFileSync(configFile));
folderBox.value = config.folder;
var needSave = false;
if (!config.mods) {
    config.mods = [];
    needSave = true;
}
if (!config.fps) {
    config.fps = 60;
    needSave = true;
}
fpsSel.value = config.fps;
if (!config.ram) {
    config.ram = 2048;
    needSave = true;
}
ramSel.value = config.ram;
if (!config.zoom) {
    config.zoom = 1;
    needSave = true;
}
zoomSel.value = config.zoom;
if (needSave) saveConfig();

minBtn.addEventListener('click', event => remote.getCurrentWindow().minimize());
closeBtn.addEventListener('click', event => remote.getCurrentWindow().close());

playBtn.addEventListener('click', event => {
    if (playBtn.disabled) return;
    if (playBtn.classList.contains("game-setup")) {
        ipc.send('setup-game');
    } else {
        var fd = fs.openSync(path.join(config.folder, "SWGEmu.exe"), "r");
        var buf = new Buffer(7);
        var bytes = fs.readSync(fd, buf, 0, 7, 0x1153);
        fs.closeSync(fd);
        fd = null;
        if (bytes == 7 && buf.readUInt8(0) == 0xc7 && buf.readUInt8(1) == 0x45 && buf.readUInt8(2) == 0x94 && buf.readFloatLE(3) != config.fps) {
            var file = require('random-access-file')(path.join(config.folder, "SWGEmu.exe"));
            buf = new Buffer(4);
            buf.writeFloatLE(config.fps);
            file.write(0x1156, buf, err => {
                if (err) alert("Could not modify FPS. Close all instances of the game to update FPS.\n" + ex.toString());
                file.close(play);
            })
        } else {
            play();
        }
    }
});

ipc.on('setup-begin-install', function (event, swgdir) {
    playBtn.innerHTML = "Play";
    playBtn.className = "button";
    disableAll();
    resetProgress();
    if (fs.existsSync(configFile)) {
        config = JSON.parse(fs.readFileSync(configFile));
        folderBox.value = config.folder;
    }
    if (swgdir !== '') {
        console.log('Copying over files.');
        install.install(swgdir, config.folder, config.mods);
    }
    else {
        install.install(config.folder, config.folder, config.mods, true);
    }
});

/*profcalcBtn.addEventListener('click', function (event) {
    ipc.send('open-profcalc');
});*/

function play() {
    fs.writeFileSync(path.join(config.folder, "swgemu_login.cfg"), `[ClientGame]\r\nloginServerAddress0=${server.address}\r\nloginServerPort0=${server.port}\r\nfreeChaseCameraMaximumZoom=${config.zoom}`);
    var args = ["--",
        "-s", "ClientGame", "loginServerAddress0=" + server.address, "loginServerPort0=" + server.port,
        "-s", "Station", "gameFeatures=34929",
        "-s", "SwgClient", "allowMultipleInstances=true"];
    var env = Object.create(require('process').env);
    env.SWGCLIENT_MEMORY_SIZE_MB = config.ram;
    const child = process.spawn("SWGEmu.exe", args, {cwd: config.folder, env: env, detached: true, stdio: 'ignore'});
    child.unref();
}

swgOptionsBtn.addEventListener('click', event => {
    const child = process.spawn("cmd", ["/c", path.join(config.folder, "SWGEmu_Setup.exe")], {cwd: config.folder, detached: true, stdio: 'ignore'});
    child.unref();
})

gameConfigBtn.addEventListener('click', event => {
    if (gameConfigSection.style.display == 'none') {
        gameConfigSection.style.display = 'block';
        gameConfigBtn.className = "option-button icon-game-config active";
    } else {
        gameConfigSection.style.display = 'none';
        gameConfigBtn.className = "option-button icon-game-config";
    }
});

headerLinks.addEventListener('click', function(e) {
    e.preventDefault();
    if(e.target.classList.contains("header-link"))
        shell.openExternal(e.target.href);
});

mainButtonLinks.addEventListener('click', function(e) {
    e.preventDefault();
    if(e.target.classList.contains("button-link"))
        shell.openExternal(e.target.href);
});


browseBtn.addEventListener('click', function (event) {
    ipc.send('open-directory-dialog', 'selected-directory');
});

folderBox.addEventListener('keyup', event => {
    config.folder = event.target.value;
    saveConfig();
});

ipc.on('selected-directory', function (event, path) {
    folderBox.value = path;
    config.folder = path;
    saveConfig();
});

fpsSel.addEventListener('change', event => {
    config.fps = event.target.value;
    saveConfig();
});
ramSel.addEventListener('change', event => {
    config.ram = event.target.value;
    saveConfig();
});
zoomSel.addEventListener('change', event => {
    config.zoom = event.target.value;
    saveConfig();
});

installBtn.addEventListener('click', function(event) {
    if (installBtn.disabled = false) return;
    installBtn.disabled = true;
    ipc.send('open-directory-dialog', 'install-selected');
});

cancelBtn.addEventListener('click', function(event) {
    install.cancel();
    enableAll();
    progressBox.style.display = 'none';
})

ipc.on('install-selected', function (event, dir) {
    disableAll();
    resetProgress();
    console.log(config);
    console.log(dir);
    if (fs.existsSync(path.join(dir, 'bottom.tre'))) {
        disableAll();
        resetProgress();
        install.install(config.folder, config.folder, config.mods);
    } else {
        alert("No Valid Star Wars Galaxies Installation Found.");
        playBtn.disabled = true;
        fullscanBtn.disabled = true;
    }
});

ipc.on('downloading-update', function (event, text) {
    versionDiv.innerHTML = text;
    disableAll();
});

ipc.on('download-progress', function(event, info) {
    install.progress(info.transferred, info.total);
})

var lastCompleted = 0;
var lastTime = new Date();
var rate = 0;
var units = " B/s";

function resetProgress() {
    lastCompleted = 0;
    lastTime = new Date();
    rate = 0;
}

install.progress = function(completed, total) {
    var time = new Date();
    var elapsed = (time - lastTime) / 1000;
    if (elapsed >= 1) {
        var bytes = completed - lastCompleted;
        units = " B/s";
        rate = bytes / elapsed;
        if (rate > 1024) {
            rate = rate / 1024;
            units = " KB/s";
        }
        if (rate > 1024) {
            rate = rate / 1024;
            units = " MB/s";
        }
        lastCompleted = completed;
        lastTime = time;
    }
    if (progressBox.style.display == 'none') progressBox.style.display = 'block';
        progressText.innerHTML = Math.trunc(completed * 100 / total) + '% (' + rate.toPrecision(3) + units + ')';
        progressBar.style.width = (completed * 100 / total) + '%';
    if (completed == total) {
        enableAll();
        progressBox.style.display = 'none';
    }
}

install.modList = function(mods) {
    modListBox.innerHTML = "";
    for (var mod of mods) {
        var checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.value = mod;
        checkbox.id = mod.replace(/[^a-zA-Z]/g, "");
        checkbox.checked = config.mods.includes(mod);
        checkbox.onchange = modListChanged;
        checkbox.disabled = true;
        var label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.appendChild(document.createTextNode(mod));
        var li = document.createElement('li');
        li.appendChild(checkbox);
        li.appendChild(label);
        modListBox.appendChild(li);
    }
}

function modListChanged() {
    config.mods = [];
    for (var child of modListBox.children) {
        if (child.children[0].checked) config.mods.push(child.children[0].value);
    }
    saveConfig();
    disableAll();
    resetProgress();
    install.install(config.folder, config.folder, config.mods);
}

fullscanBtn.addEventListener('click', function(event) {
    if (fullscanBtn.disabled) return;
    disableAll();
    resetProgress();
    install.install(config.folder, config.folder, config.mods, true);
});

if (fs.existsSync(path.join(config.folder, 'bottom.tre'))) {
    disableAll();
    resetProgress();
    install.install(config.folder, config.folder, config.mods);
} else {
    console.log("First Run");
    playBtn.innerHTML = "Setup";
    playBtn.disabled = false;
    playBtn.className = "button game-setup";
    swgOptionsBtn.disabled = true;
    //ipc.send('setup-game');
    //fullscanBtn.disabled = true;
    //install.getManifest();
}

function disableAll() {
    folderBox.disabled = true;
    fullscanBtn.disabled = true;
    installBtn.disabled = true;
    playBtn.disabled = true;
    browseBtn.disabled = true;
    for (var child of modListBox.children) {
        child.children[0].disabled = true;
    }    
}

function enableAll() {
    folderBox.disabled = false;
    fullscanBtn.disabled = false;
    installBtn.disabled = false;
    playBtn.disabled = false;
    browseBtn.disabled = false;
    swgOptionsBtn.disabled = false;
    for (var child of modListBox.children) {
        child.children[0].disabled = false;
    }    
}

function saveConfig() {
    fs.writeFileSync(configFile, JSON.stringify(config));
}

versionDiv.addEventListener('click', event => remote.getCurrentWebContents().openDevTools());