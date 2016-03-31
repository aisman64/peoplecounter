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

"use strict";
var fs = require('fs-extra');
var tmp = require('tmp');
var cpro = require('child_process')
var sys = require('sys');
var express = require('express');
var app = express();

function mntImg()
	{
	var offset = 100017152;
	var tmpfile = tmp.tmpNameSync({ template: '/tmp/debianImg-XXXXXXXX' });
	var tmpdir = tmp.dirSync({ mode: '0750', template: '/tmp/debian-XXXXXXXX' });
	fs.copySync('defaultImg/debian.img', tmpfile);
	cpro.exec('losetup -o ' + offset + ' /dev/loop0 '+tmpfile);
	console.log('Device Mounted');
	cpro.exec('mount /dev/loop0 '+tmpdir.name);
	var Img = {
		tmpfile: tmpfile,
		tmpdir: tmpdir.name
		};
	return Img;
	}

function umntImg(tmpdir, tmpfile)
	{
	cpro.exec('umount '+tmpdir.name);
	cpro.exec('losetup -d /dev/loop0');
	cpro.exec('gzip '+tmpdir.name); 
	console.log('Device Unmounted');
	}

function serveImage()
	{
	app.get('/', function(req, res) { res.download('images/debian_v0.02.img.gz', 'galileo.img.gz') });
	app.listen(3000);
	}

serveImage();

//mntImg();
//unmntImage();
