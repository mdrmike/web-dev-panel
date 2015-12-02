
// extension root object
const Me = imports.misc.extensionUtils.getCurrentExtension();

// import internal modules
const _config = Me.imports._config;

// aliases for used modules
const St = imports.gi.St;
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const GLib = imports.gi.GLib;
const Util = imports.misc.util;

let numbersOfTryToActivateMysql = 0;
let numbersOfTryToDesactivateMysql = 0;

let numbersOfTryToActivateApache = 0;
let numbersOfTryToDesactivateApache = 0;

let numbersOfPkexecProcess = 0;

let maxNumbersOfTry = 8;

// StatusIcon manager
let statusIcon;
let lampNoServices      = 'lamp-no-services';
let lampApacheServices  = 'lamp-apache-services';
let lampMysqlServices   = 'lamp-mysql-services';
let lampAllServices     = 'lamp-all-services';
let lampLoading         = 'lamp-loading';

// My PopupSwitchMenu
let menuItemApache;
let menuItemMysql;



/*
 * Indicator class.
 *
 * Creates an actor in the StatusArea panel. Provides menu for manipulating
 * visiblity of other icons.
 */
const Indicator = new Lang.Class({
    Name: 'Indicator',
    Extends: PanelMenu.Button,

    /**
     * Creates an actor object, which can be added to the status area,
     *
     * @constructor
     * @this {Indicator}
     * @param {string} icon an icon name
     */
    _init: function(icon) {
        let icon_classname = lampNoServices;

        if (isApacheActive() && isMysqlActive()) {
            icon_classname = lampAllServices;
        } else if (isApacheActive()) {
            icon_classname = lampApacheServices;
        } else if (isMysqlActive()) {
            icon_classname = lampMysqlServices;
        }

        this.parent(0.0, _config.EXTENSION_NAME);

        statusIcon = new St.Icon({
            icon_name: icon,
            style_class: icon_classname
        });

        this.actor.add_actor(statusIcon);

        //this._settings = Convenience.getSettings();
        this._createMenu();
    },

    /**
     * Creates menu for the Indicator. It will be popuped on RMB click.
     *
     * @private
     * @this {Indicator}
     */
    _createMenu: function() {
        menuItemApache = new PopupMenu.PopupSwitchMenuItem("Apache", isApacheActive());
        this.menu.addMenuItem(menuItemApache);
        menuItemApache.statusAreaKey = "Apache";

        menuItemApache.connect('toggled', toggleApacheService);

        menuItemMysql = new PopupMenu.PopupSwitchMenuItem("MySQL", isMysqlActive());
        this.menu.addMenuItem(menuItemMysql);
        menuItemMysql.statusAreaKey = "MySQL";

        menuItemMysql.connect('toggled', toggleMysqlService);
    },

});


/*
 * Extension definition.
 */

function Extension() {
    this._init();
}

Extension.prototype = {
    _init: function() {
        this._indicator = null;
    },

    enable: function() {
        this._indicator = new Indicator('');
        Main.panel.addToStatusArea(_config.EXTENSION_NAME, this._indicator);
    },



    disable: function() {
        this._indicator.destroy();
        this._indicator = null;
    }

};


/**
 * Entry point.
 *
 * Should return an object with callable `enable` and `disable` properties.
 */

// A JSON Object that keeps strings -
//Useful for creating settings


function init() {
    return new Extension();
}



function isApacheActive() {
    // Get current status of apache service
    let [resApache, outApache] = GLib.spawn_command_line_sync("systemctl is-active "+_config.SERVICENAME_APACHE);
    let outApacheString = outApache.toString().replace(/(\r\n|\n|\r)/gm,"");
    return outApacheString == "active";
}

function isMysqlActive() {
    // Get current status of mysql service
    let [resMysql, outMysql] = GLib.spawn_command_line_sync("systemctl is-active "+_config.SERVICENAME_MYSQL);
    let outMysqlString = outMysql.toString().replace(/(\r\n|\n|\r)/gm,"");
    return outMysqlString == "active";
}

function toggleApacheService() {
    let action = "start";
    if (isApacheActive()) {
        action = "stop";
    }
    numbersOfPkexecProcess = getNumbersOfPkexecProcess();

    let cmd = _config.PKEXEC_PATH + ' systemctl '+action+' '+_config.SERVICENAME_APACHE;
    if (numbersOfTryToActivateApache == 0 && numbersOfTryToDesactivateApache == 0) {
	    try {
            Util.trySpawnCommandLine(cmd);
            statusIcon.set_property("style_class", lampLoading);
            if (action == "start") {
                GLib.timeout_add(0,300,tryActivateApacheService);
            } else {
                GLib.timeout_add(0,300,tryDesactivateApacheService);
            } 
	    } catch(Exception) {
		  Main.notify("Crash !"+Exception);
	    }
	}
}

function toggleMysqlService() {
    let action = "start";
    if (isMysqlActive()) {
        action = "stop";
    }
    numbersOfPkexecProcess = getNumbersOfPkexecProcess();

    let cmd = _config.PKEXEC_PATH + ' systemctl '+action+' '+_config.SERVICENAME_MYSQL;
    if (numbersOfTryToActivateMysql == 0 && numbersOfTryToDesactivateMysql == 0) {
        try {
            Util.trySpawnCommandLine(cmd);
            statusIcon.set_property("style_class", lampLoading);
            if (action == "start") {
                GLib.timeout_add(0,300,tryActivateMysqlService);
            } else {
                GLib.timeout_add(0,300,tryDesactivateMysqlService);
            }
        } catch(Exception) {
            Main.notify("Big problem :/"+Exception);
        }
    }
}


function tryActivateApacheService() {
    let serviceWaiting = true;
    // We want to activate Apache
    if (numbersOfTryToActivateApache >= maxNumbersOfTry || isApacheActive()) {
        numbersOfTryToActivateApache = 0;
        if (!isPkExecThreadActive()){
            // PkExec is open ! don't do anything stupid
            if (isApacheActive()) {
                Main.notify("Apache is now on");
            } else {
                Main.notify("We couldn't managed to activate apache");
            }
            // No need to go to that loop again
            refreshUI();
            serviceWaiting = false;
        }
    } else {
        //it's not over !
        numbersOfTryToActivateApache++;
    }
    return serviceWaiting;
}


function tryDesactivateApacheService() {
    let serviceWaiting = true;
    // We want to desactivate Apache
    if (numbersOfTryToDesactivateApache >= maxNumbersOfTry || !isApacheActive()) {
        numbersOfTryToDesactivateApache = 0;
        if (!isPkExecThreadActive()){
            // PkExec is closed open ! don't do anything stupid
            if (!isApacheActive()) {
                Main.notify("Apache is now off");
            } else {
                Main.notify("We couldn't managed to desactivate apache");
            }
            // No need to go to that loop again
            refreshUI();
            serviceWaiting = false;
        }
    } else {
        //it's not over !
        numbersOfTryToDesactivateApache++;
    }
    return serviceWaiting;
}


function tryActivateMysqlService() {
    let serviceWaiting = true;
    // We want to activate Mysql
    if (numbersOfTryToActivateMysql >= maxNumbersOfTry || isMysqlActive()) {
        numbersOfTryToActivateMysql = 0;
        if (!isPkExecThreadActive()){
            // PkExec is closed open ! don't do anything stupid
            if (isMysqlActive()) {
                Main.notify("Mysql is now on");
            } else {
                Main.notify("We couldn't managed to activate MySQL");
            }
            // No need to go to that loop again
            refreshUI();
            serviceWaiting = false;
        }
    } else {
        //it's not over !
        numbersOfTryToActivateMysql++;
    }
    return serviceWaiting;
}


function tryDesactivateMysqlService() {
    let serviceWaiting = true;
    // We want to desactivate Mysql
    if (numbersOfTryToDesactivateMysql >= maxNumbersOfTry || !isMysqlActive()) {
        numbersOfTryToDesactivateMysql = 0;
        if (!isPkExecThreadActive()){
            // PkExec is closed open ! don't do anything stupid
            if (!isMysqlActive()) {
                Main.notify("Mysql is now off");
            } else {
                Main.notify("We couldn't managed to desactivate MySQL");
            }
            // No need to go to that loop again
            refreshUI();
            serviceWaiting = false;
        }
    } else {
        //it's not over !
        numbersOfTryToDesactivateMysql++;
    }
    return serviceWaiting;
}


function getNumbersOfPkexecProcess() {
    // Get current status of mysql service
    let [resPkExec, outPkExec] = GLib.spawn_command_line_sync("pgrep pkexec -c");
    let outPkExecString = outPkExec.toString().replace(/(\r\n|\n|\r)/gm,"").trim();
    return outPkExecString;
}

function isPkExecThreadActive() {
    res = true;
    if (numbersOfPkexecProcess == getNumbersOfPkexecProcess()) {
        // The PkExec asking for passowrd is no longer active
        res = false;
    }
    return res;

}


function refreshUI() {
    refreshStatusIcon();
    refreshSwitchButton();
}

function refreshStatusIcon() {
    let icon_classname = lampNoServices;

    if (isApacheActive() && isMysqlActive()) {
        icon_classname = lampAllServices;
    } else if (isApacheActive()) {
        icon_classname = lampApacheServices;
    } else if (isMysqlActive()) {
        icon_classname = lampMysqlServices;
    } else {
        icon_classname = lampNoServices;
    }

    statusIcon.set_property("style_class", icon_classname);
}

function refreshSwitchButton() {
    menuItemApache.setToggleState(isApacheActive());
    menuItemMysql.setToggleState(isMysqlActive());
}

