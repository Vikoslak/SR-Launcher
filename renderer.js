const ipc = require('electron').ipcRenderer;
const shell = require('electron').shell;
const remote = require('electron').remote;
const fs = require('fs');
const request = require('request');
const process = require('child_process');
const server = require('./json/server');
const cleanup = require('./json/cleanup');
const package = require('./package');
const install = require('./install');
const path = require('path');
const os = require('os');

const playBtn = document.getElementById('play');
//const profcalcBtn = document.getElementById('profcalc');

const setupBox = document.getElementById('setup');
const setupBtn = document.getElementById('setupBtn');
const verifyBtn = document.getElementById('verifyBtn');

const cancelBtn = document.getElementById('cancelBtn');

const progressBar = document.getElementById('progress');
const progressText = document.getElementById('progresstext');

const minBtn = document.getElementById('minimize');
const closeBtn = document.getElementById('close');

const ramSel = document.getElementById('ram');
const fpsSel = document.getElementById('fps');
const zoomSel = document.getElementById('zoom');

const loginServerSel = document.getElementById('loginServerSelect');

const swgOptionsBtn = document.getElementById('swgOptionsBtn');
const gameConfigBtn = document.getElementById('gameConfigBtn');
const gameConfigSection = document.getElementById('configSection');

// External Links
const headerLinks = document.getElementById("headerLinks");
const mainButtonLinks = document.getElementById('mainButtonLinks');
const patchNotesView = document.getElementById('patchNotesView');

const serverStatus = document.getElementById('serverStatus');
const activeServer = document.getElementById('activeServer');
const versionDiv = document.getElementById('version');
versionDiv.innerHTML = package.version;

const configFile = os.homedir() + '/Documents/My Games/SWG - Sentinels Republic/SR-Launcher-config.json';
var config = {folder: 'C:\\SREmu'};

if (fs.existsSync(configFile))
    config = JSON.parse(fs.readFileSync(configFile));
setupBox.value = config.folder;
var needSave = false;
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
if (!config.login) {
    config.login = "live";
    needSave = true;
}
loginServerSel.value = config.login;
if (needSave) saveConfig();

getServerStatus(config.login);
activeServer.innerHTML = server[config.login][0].address;

function getServerStatus(serverStatusLogin) {
    request({url:server[serverStatusLogin][0].statusUrl, json:true}, function(err, response, body) {
        if (err) return console.error(err);
        if (body.status != undefined) {
            serverStatus.innerHTML = body.status;
        }
    });
}

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

ipc.on('setup-begin-install', function (event, args) {
    playBtn.innerHTML = "Play";
    playBtn.className = "button";
    swgOptionsBtn.disabled = false;
    disableAll(false);
    resetProgress();
    if (fs.existsSync(configFile)) {
        config = JSON.parse(fs.readFileSync(configFile));
        setupBox.value = config.folder;
    }
    // Cleanup
    if (args.cleanup == true) {
        var cleanUpFile;
        for (let file of cleanup) {
            if (fs.existsSync(cleanUpFile = path.join(config.folder, file.name))) {
                fs.unlink(cleanUpFile, (err) => {
                    if (err) {
                        console.log("Could not Delete: " + file.name);
                        return;
                    }
                });
            }
        }
    }
    if (args.swgdir !== '') {
        console.log('Copying over files.');
        install.install(args.swgdir, config.folder);
    }
    else {
        install.install(config.folder, config.folder, true);
    }
});

/*profcalcBtn.addEventListener('click', function (event) {
    ipc.send('open-profcalc');
});*/

function play() {
    fs.writeFileSync(path.join(config.folder, "swgemu_login.cfg"), `[ClientGame]\r\nloginServerAddress0=${server[config.login][0].address}\r\nloginServerPort0=${server[config.login][0].port}\r\nfreeChaseCameraMaximumZoom=${config.zoom}`);
    var args = ["--",
        "-s", "ClientGame", "loginServerAddress0=" + server[config.login][0].address, "loginServerPort0=" + server[config.login][0].port,
        "-s", "Station", "gameFeatures=34929",
        "-s", "SwgClient", "allowMultipleInstances=true"];
    var env = Object.create(require('process').env);
    env.SWGCLIENT_MEMORY_SIZE_MB = config.ram;
    if (os.platform() === 'win32') {
      const child = process.spawn("SWGEmu.exe", args, {cwd: config.folder, env: env, detached: true, stdio: 'ignore'});
      child.unref();
    } else {
      const child = process.exec('wine SWGEmu.exe', {cwd: config.folder, env: env, detached: true, stdio: 'ignore'}, function(error, stdout, stderr){});
      child.unref();
    }
}

swgOptionsBtn.addEventListener('click', event => {
    if (os.platform() === 'win32') {
        const child = process.spawn("cmd", ["/c", path.join(config.folder, "SWGEmu_Setup.exe")], {cwd: config.folder, detached: true, stdio: 'ignore'});
        child.unref();
      } else {
        const child = process.exec('wine SWGEmu_Setup.exe', {cwd: config.folder, detached: true, stdio: 'ignore'}, function(error, stdout, stderr){});
        child.unref();
      }
})

gameConfigBtn.addEventListener('click', event => {
    if (gameConfigSection.style.display == 'none') {
        gameConfigSection.style.display = 'block';
        gameConfigBtn.className = "option-button sr-button sr-btn-icon sr-btn-icon-left active";
    } else {
        gameConfigSection.style.display = 'none';
        gameConfigBtn.className = "option-button sr-button sr-btn-icon sr-btn-icon-left";
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

patchNotesView.addEventListener('will-navigate', function(e) {
    const protocol = require('url').parse(e.url).protocol;
    if (protocol === 'http:' || protocol === 'https:')
        shell.openExternal(e.url);
    patchNotesView.stop();
});

// -----------------
//    Game Config
// -----------------

// "Change" button pressed
setupBtn.addEventListener('click', function (event) {
    ipc.send('setup-game');
});

// SWG Config
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

loginServerSel.addEventListener('change', event => {
    config.login = event.target.value;
    saveConfig();
    activeServer.className = "no-opacity";
    setTimeout(function(){activeServer.className = "fade-in";},200);
    activeServer.innerHTML = server[config.login][0].address;
    serverStatus.className = "no-opacity";
    setTimeout(function(){serverStatus.className = "fade-in";},200);
    getServerStatus(config.login);
    if(confirm("It is recommended to run a \"Full Scan\" to verify your game files after switching login servers.\n\nYou may ignore this message by selecting \"Cancel\" and restart the launcher to attempt to download any new patches, but existing files will not be patched and you may encounter issues.\n\nDo not change the login server for your primary installation, always have a back up!\n\nSelect \"OK\" to verify your game files.")) {
        verifyFiles();
    }
});


cancelBtn.addEventListener('click', function(event) {
    install.cancel();
    progressBar.style.width = '100%';
    progressText.className = 'complete';
    enableAll();
})

ipc.on('downloading-update', function (event, text) {
    versionDiv.innerHTML = text;
    disableAll(false);
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
    if (progressText.className == 'complete') progressText.className = 'active';
        progressText.innerHTML = Math.trunc(completed * 100 / total) + '% (' + rate.toPrecision(3) + units + ')';
        progressBar.style.width = (completed * 100 / total) + '%';
    if (completed == total) {
        enableAll();
        progressText.className = 'complete';
    }
}

verifyBtn.addEventListener('click', function(event) {
    verifyFiles();
});

function verifyFiles() {
    if (verifyBtn.disabled) return;
    disableAll(true);
    resetProgress();
    install.install(config.folder, config.folder, true);
}

if (fs.existsSync(path.join(config.folder, 'qt-mt305.dll'))) {
    disableAll(true);
    resetProgress();
    install.install(config.folder, config.folder);
} else {
    console.log("First Run");
    progressText.innerHTML = "Click the SETUP button to get started."
    playBtn.innerHTML = "Setup";
    playBtn.disabled = false;
    playBtn.className = "button game-setup";
    verifyBtn.disabled = true;
    setupBtn.disabled = true;
    loginServerSel.disabled = true;
    swgOptionsBtn.disabled = true;
    cancelBtn.disabled = true;
}

function disableAll(cancel) {
    verifyBtn.disabled = true;
    playBtn.disabled = true;
    setupBtn.disabled = true;
    loginServerSel.disabled = true;
    if (cancel == true)
        cancelBtn.disabled = false;
}

function enableAll() {
    verifyBtn.disabled = false;
    playBtn.disabled = false;
    setupBtn.disabled = false;
    swgOptionsBtn.disabled = false;
    cancelBtn.disabled = true;
    loginServerSel.disabled = false;
}

function saveConfig() {
    fs.writeFileSync(configFile, JSON.stringify(config));
}

versionDiv.addEventListener('click', event => remote.getCurrentWebContents().openDevTools());
