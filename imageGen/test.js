"use strict";
var fs = require('fs-extra');
var tmp = require('tmp');
var cpro = require('child_process')
var sys = require('sys');


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


mntImg();
//unmntImage();
