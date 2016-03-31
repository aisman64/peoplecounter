
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
/**
 * Since SSIDs in most of our use-cases are only used for grouping,
 * replacing SSID strings with numbers can significantly speed up queries and reduce the packet table's size.
 */
"use strict";


var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
    	return {
            Caches: {
                ssids: {
                    idProperty: 'ssidId'
                }
            },
                
            Private: {
            },
	    };
	}),


    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
            },

            initModel: function() {
                var This = this;

                /**
                 * 
                 */
                return sequelize.define('SSID', {
                    /**
                     * The ssidId is a number, uniquely identifying the given ssid (which is actually a name string)
                     */
                    ssidId: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    ssidName: { type: Sequelize.STRING(32), unique: true },

                    lat: Sequelize.DECIMAL,
                    
                    lng: Sequelize.DECIMAL
                }, {
                    freezeTableName: true,
                    tableName: 'SSID',
                });
            }
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        return {

        };
    })
});
