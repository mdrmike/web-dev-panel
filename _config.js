/*
 * lamp-status@thomasmorice.fr
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 */

// extension name
// used as identifier when adding to status area
const GLib = imports.gi.GLib;

const EXTENSION_NAME = 'Lamp Status';


// keys for access to gsettings
const GSETTINGS_KNOWN = 'known';
const GSETTINGS_HIDDEN = 'hidden';
const GSETTINGS_ISINDICATORSHOWN = 'is-indicator-shown';

// Services
const SERVICENAME_APACHE    = 'httpd';
const SERVICENAME_MYSQL     = 'mysqld';
const PKEXEC_PATH           =  GLib.find_program_in_path('pkexec');
