Simple web application built with [Node](http://nodejs.org/), [MySQL](http://www.mysql.com/), [NoGap](https://github.com/Domiii/NoGap) and [Angular](https://angularjs.org/) and [Bootstrap](http://getbootstrap.com/).

# Installation
1. Install [MySQL](http://www.mysql.com/) or [XAMPP](https://www.apachefriends.org/)
2. Install a MySQL database manager, such as [MySQL Workbench](http://www.mysql.com/products/workbench/) or [SQLyog](http://www.softpedia.com/get/Internet/Servers/Database-Utils/SQLyog-Community-Edition.shtml)
3. Install [Node](http://nodejs.org/)
    1. [Add `Node` to your global PATH](http://www.c-sharpcorner.com/UploadFile/cb6e16/introduction-to-node-js-and-its-installation-on-windows/Images/image3.gif)
4. Install a Git client, such as [MSysgit](https://msysgit.github.io/) [Windows] or [others](http://git-scm.com/downloads)
    1. [Add `git` (and, on Windows, include UNIX TOOLS) to your global PATH](http://www.jinweijie.com/wp-content/uploads/2011/12/image1.png)
5. Open a command line, aka shell, aka terminal [e.g. `cmd` on Windows]
6. Go to your code folder, using `cd`
7. Run: `git clone https://github.com/Domiii/node-sample-app.git` [to download this code]
8. Run: `cd node-sample-app`
9. Run: `npm install` [to download and install all necessary libraries and other dependencies of this code]
10. Configure your application: Create a new file `appConfig.user.js` and add:
    
    ```js
    "use strict";
    
    module.exports = {
        // my custom configuration here
    };
    ```
    
    1. Add your DB configuration. For example:
        ```js
        "use strict";
        
        module.exports = {
            // my custom configuration here
            'db' : {
                'host'     : 'localhost',
                'user'     : 'root',
                'password' : '',            // no password
                'database' : 'my_db'
            },
        };
        ```
    
    2. Make sure that the database exists (i.e. `my_db` in this example): You can create a new DB [with MySQL Workbench](http://stackoverflow.com/a/22164216/2228771) or [with SQLyog](http://sqlyogkb.webyog.com/article/230-create-database).
    
    3. You can make more customizations by copying and overriding any values from [appConfig.js](https://github.com/Domiii/node-sample-app/blob/master/appConfig.js).
    
11. Run: `node app.js`
12. Open your browser and go to: `localhost:9132`

Done!

# Other Tools
* [Sublime Text](http://www.sublimetext.com/) [for editing and writing code]
    * Tools -> Open Project -> `app.sublime-project`
