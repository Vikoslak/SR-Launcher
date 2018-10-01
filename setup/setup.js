const ipc = require('electron').ipcRenderer;
const shell = require('electron').shell;
const remote = require('electron').remote;
const fs = require('fs');
const process = require('child_process');
//const server = require('../server');
//const package = require('../package');
const install = require('../install');
const path = require('path');

const folderBox = document.getElementById('folder'); // SR Folder Location
const browseBtn = document.getElementById('browse'); // Set Installation Location Button
const installBtn = document.getElementById('install'); // SWG Installation Button
const swgFolderBox = document.getElementById('swgFolder'); // SR Folder Location

const cancelBtn = document.getElementById('cancel');

const minBtn = document.getElementById('minimize');
const closeBtn = document.getElementById('close');

const setupPrev = document.getElementById('setupPrev');
const setupNext = document.getElementById('setupNext');
const setupCancel = document.getElementById('setupCancel');

const agreeRules = document.getElementById('agreeRules');
const agreeOwner = document.getElementById('agreeOwner');

const swgDirSection = document.getElementById('swgDirSection');
const swgInstallMessageSuccess = document.getElementById('swgInstallMessageSuccess');
const swgInstallMessageFail = document.getElementById('swgInstallMessageFail');

const configFile = require('os').homedir() + '/Documents/My Games/SWG - Sentinels Republic/SR-Launcher-config.json';
var config = {folder: 'C:\\SREmu'};
if (fs.existsSync(configFile))
    config = JSON.parse(fs.readFileSync(configFile));
folderBox.value = config.folder;

minBtn.addEventListener('click', event => remote.getCurrentWindow().minimize());
closeBtn.addEventListener('click', event => remote.getCurrentWindow().close());

setupCancel.addEventListener('click', function (event) {
    remote.getCurrentWindow().close();
});


agreeRules.addEventListener('click', function (event) {
    if (agreeRules.checked)
        setupNext.disabled = false;
    else
        setupNext.disabled = true;
});

agreeOwner.addEventListener('click', function (event) {
    if (agreeOwner.checked) {
        swgDirSection.style.visibility = 'visible';
        swgDirSection.style.opacity = '1';
        setupNext.disabled = false;
    } else {
        swgDirSection.style.visibility = 'hidden';
        swgDirSection.style.opacity = '0';
        setupNext.disabled = true;
    }
});

setupNext.addEventListener('click', function (event) {
    changeActiveScreen(this);
});

setupPrev.addEventListener('click', function (event) {
    changeActiveScreen(this);
});

function changeActiveScreen(button) {
    var i, screens, activeScreen;
    screens = document.getElementsByClassName("setup-tab");
    for (i = 0; i < screens.length; i++) {
        if (screens[i].classList.contains("active"))
            activeScreen = screens[i];
        screens[i].className = screens[i].className.replace(" active", "");
    }
    switch (activeScreen.id) {
        case "rulesAgree":
            if (navButtonNext(button.id)) {
                document.getElementById("installDir").classList.add("active");
                setupPrev.style.display = 'block';
            }
        break;
        case "installDir":
            if (navButtonNext(button.id)) {
                document.getElementById("swgInstall").classList.add("active");
                setupNext.disabled = true;
                setupNext.innerHTML = "Finish";
            } else {
                document.getElementById("rulesAgree").classList.add("active");
                agreeRules.checked = false;
                agreeOwner.checked = false;
                setupNext.disabled = true;
                setupPrev.style.display = 'none';
            }
        break;
        case "swgInstall":
            if (navButtonNext(button.id)) {
                ipc.send('setup-complete', swgFolder.value);
                remote.getCurrentWindow().close();
            } else {
                setupNext.innerHTML = "Next";
                agreeOwner.checked = false;
                swgDirSection.style.visibility = 'hidden';
                swgDirSection.style.opacity = '0';
                document.getElementById("installDir").classList.add("active");
            }
        break;
        default:
            remote.getCurrentWindow().close();
    }
}

function navButtonNext(button) {
    if (button == "setupNext")
        return true;
    else
        return false;
}


/*headerLinks.addEventListener('click', function(e) {
    e.preventDefault();
    if(e.target.classList.contains("header-link"))
        shell.openExternal(e.target.href);
});

mainButtonLinks.addEventListener('click', function(e) {
    e.preventDefault();
    if(e.target.classList.contains("button-link"))
        shell.openExternal(e.target.href);
});*/


/*testBtn.addEventListener('click', function (event) {
    ipc.send('setup-complete', 'complete');
});*/

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

cancelBtn.addEventListener('click', function(event) {
    install.cancel();
    enableAll();
    progressBox.style.display = 'none';
})

installBtn.addEventListener('click', function(event) {
    if (installBtn.disabled = false) return;
    installBtn.disabled = true;
    ipc.send('open-directory-dialog', 'install-selected');
});

ipc.on('install-selected', function (event, dir) {
    disableAll();
    resetProgress();
    if (fs.existsSync(path.join(dir, 'bottom.tre'))) {
        swgFolderBox.value = dir;
        swgInstallMessageSuccess.style.display = 'block';
        swgInstallMessageFail.style.display = 'none';
    } else {
        swgFolderBox.value = '';
        swgInstallMessageFail.style.display = 'block';
        swgInstallMessageSuccess.style.display = 'none';
    }
    enableAll();
});


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

/*fullscanBtn.addEventListener('click', function(event) {
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
    //playBtn.disabled = true;
    fullscanBtn.disabled = true;
    //install.getManifest();
}*/

function disableAll() {
    folderBox.disabled = true;
    installBtn.disabled = true;
    browseBtn.disabled = true;  
}

function enableAll() {
    folderBox.disabled = false;
    installBtn.disabled = false;
    browseBtn.disabled = false;
}

function saveConfig() {
    fs.writeFileSync(configFile, JSON.stringify(config));
}