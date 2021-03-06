/* Copyright (c) 2015-2016, <Christopher Chin>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. */

// TODO: Separate between user-dependent and default config
"use strict";

module.exports = {

    // ########################################################################################################################
    // Device config

    'deviceConfigDefaults': {
        'CookiesFile': './data/cookies.json',
        'HostIdentityTokenFile': './data/hostIdentityToken',
        'DeviceClientCacheFile': './data/deviceClientCache.min.js',
        'DeviceEntryCacheFile': './data/deviceEntryCache.json',
        'ReconnectDelay': '5000'           // a few seconds
    },

    'deviceDefaultResetTimeout': 60 * 1000,// a few minutes

    'deviceImage': {
        'downloadPath': '/Download/DeviceImage',

        // absolute file path
        'filePath': __dirname + '/data/DeviceImage.img'
    },

    'deviceHostNamePrefix': 'dv-one-dev-',


    // ########################################################################################################################
    // Frontend options

    /**
     * How often to refetch data from server by default
     */
    'defaultPageRefreshDelay': 10000,

    'scannerTimeFrameSeconds': 90,



    // ########################################################################################################################
    // User feature locks

    /**
     * Whether new users may still register
     */
    'registrationLocked': 0,

    /**
     * Whether non-priviliged users can currently login
     */
    'loginLocked': 0,



    // ########################################################################################################################
    // Developer feature locks

    /**
     * Whether developer options are enabled
     */
    'dev': 0,

    // ########################################################################################################################
    // Host + networking settings

    /**
     * Host name or IP that external clients can connect to
     */
    'externalHost': 'localhost',

    'hosts': ['0.0.0.0'],


    // ########################################################################################################################
    // Other misc settings

    /**
     * Use this locale on the server and for new clients who did not submit a preference
     */
    'defaultLocale': 'en',

    // ########################################################################################################################
    // Facebook settings

    // Test FB App settings
    'facebookAppID': '392918107554514',
    'facebookAppSecret': '4ecaef98a8828386f5e2260e03f4a685',
    

    // ########################################################################################################################
    // Developer options

    /**
     * Whether to open the command line
     */
    'console': 0,

    /**
     * Whether to trace RPC calls on Host side
     */
    'traceHost': {
        'enabled': 1,
        'blackList': {
            'functions': {
                'DeviceCommunications.checkIn': 1,
                'LivePage.getMostRecentPackets': 1,
                'DeviceCapture.storePacket': 1, 
                'DeviceStatus.getDeviceLastActiveTimes': 1,
                'CommonDBQueries.executeQuery': 1,
                'DeviceLog.logDeviceErrors': 1,
                'DeviceCapture.storePacket2': 1
            },
            'components': {

            }
        }
    },

    /**
     * Whether to trace RPC calls on Client side
     */
    'traceClient': {
        'enabled': 1,
        'blackList': {
            'functions': {
                'DeviceCommunications.host.checkIn': 1,
                'LivePage.host.getMostRecentPackets': 1,
                'DeviceCapture.storePacket': 1,
                'RawPage.host.getMostRecentPackets': 1,
                'DeviceStatus.host.getDeviceLastActiveTimes': 1,
                'CommonDBQueries.host.executeQuery': 1,
                'DeviceLog.host.logDeviceErrors': 1
            },
            'components': {
                
            }
        }
    },


    // ########################################################################################################################
    // Mostly constant options

    'title': 'People Counter',

    // folder containing files, accessible by clients
    'uploadFolder': 'uploads/',

    // Connection & transport parameters
    'httpd': {
        /**
         * The port of the application
         */
        'port'     : '9123'
    },

    // these are the login details to connect to your MySQL DB
    'db' : {
        'host'     : 'localhost',
        'user'     : 'root',
        'password' : 'r00t',
        'port'     : '3306',
        'database' : 'peoplecounter',
        'reconnectDelay':   '5'
    },

    // logging configuration
    'logging' : {
        'defaultFile' : '_log/app.log',
        'dbFile' : '_log/db.log',
        'userFile': '_log/user.log',
    },

    // session configuration
    'session' : {
        // For more information, read: http://blog.teamtreehouse.com/how-to-create-totally-secure-cookies
        // session persists for 1 month:
        'lifetime' : 1000 * 60 * 60 * 24 * 30 * 1,
        
        // make sure to set the domain to disable sub-domains from getting your cookies!
        // domain can include the port
        // TODO: Support multiple domains
        'domain'   : undefined,
        
        // If there are multiple websites on the same domain, specify which part of the path is dedicated for this application
        'path'     : '/',

        // Max age in milliseconds. This tells the browser to keep the cookie.
        'maxAge'   : 1000 * 60 * 60 * 24 * 30 * 1
    },

    // NoGap component and application configuration
    'nogap': {
        'maxCommandsPerRequest': 0,
        
        'logging'      : {
            'verbose'   : 1
        },
        'longstacktraces': true,
        'lazyLoad'     : true,
        'baseFolder'   : 'components',

        // localizer and language parameters
        'localizer': {
            'folder': 'lang',
            'defaultLang' : 'en'
        },

        /**
         * WARNING: Do not randomly change the order of these files.
         *      Some components do not gracefully resolve dependencies (yet).
         */
        'files'        : [
            // core utilities (need to initialize first, for now)
            'util/RuntimeError',
            'util/CacheUtil',

            // core components
            'models/core/AppConfig',
            'models/core/User',

            // all kinds of model components
            'models/wifi/MACAddress',
            'models/wifi/OUI',
            'models/wifi/SSID',
            'models/wifi/MAC_SSID_Relation',
            'models/wifi/WifiScannerHistory',
            'models/wifi/WifiScannerIgnoreList',
            'models/devices/WifiSnifferDevice',
            'models/devices/WifiDataset',
            'models/devices/WifiDatasetSnifferRelation',
            'models/devices/DeviceStatus',
            'models/wifi/WifiSSIDPacket',
            'models/wifi/WifiActivityPacket',
            'models/CommonDBQueries',

            // misc utilities
            'util/Auth',
            'util/MiscUtil',
            'util/Localizer',
            'util/Log',
            'util/ValidationUtil',
            'util/FacebookApi',
            'util/SMTP',
            
            // this one kicks off Instance code
            'Main',

            // core UI components:
            'ui/UIMgr',
            'ui/UIMain',

            // core device components:
            'device/DeviceMain',
            'device/DeviceCapture',

            // guest + unregistered pages:
            'ui/login/LoginPage',
            'ui/vis/VisPage',

            // user pages:
            'ui/home/HomePage',
            'ui/live/LivePage',
            'ui/scanner/ScannerPage',
            'ui/raw/RawPage',
            'ui/device/DevicePage',
            'ui/account/AccountPage',
            'ui/map/MapPage',
            // superuser pages:

            'ui/map/MapPage',

            'ui/admin/AdminPage'
        ]
    },
};
