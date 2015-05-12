
/**
 * All utilities required to verify and manage users.
 * TODO: Separate Account + User management
 */
"use strict";

var NoGapDef = require('nogap').Def;


var componentsRoot = '../../';
var libRoot = componentsRoot + '../lib/';
var bcrypt = require(libRoot + 'bcrypt');


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
            CryptWorkFactorClient: 8,

            /**
             * @const
             */
            UserRole: squishy.makeEnum({
                "Guest": 0,

                /**
                 * Normal user who did not finish registration yet
                 */
                "Unregistered": 1,
                "StandardUser": 2,
                "Device": 3,

                "Admin": 4,
                
                /**
                 * This role is used for maintenance operations that may have severe consequences 
                 * and thus should not be executed by someone without understanding of how things work.
                 * However, by default, TAs and Instructors have this privilege level anyway because 
                 * there is no one else to help take care of things.
                 */
                "Developer": 5
            }),

            isStaff: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return false;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return role && role > this.UserRole.Device;
            },

            isDevice: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return false;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return role && role == this.UserRole.Device;
            },

            isStandardUser: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return false;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return role && role >= this.UserRole.Device;
            },

            isGuest: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return true;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return !role || role <= this.UserRole.Guest;
            },

            hasRole: function(otherRole, roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return !otherRole || otherRole == this.UserRole.Guest;
                
                var userRole = roleOrUser.displayRole || roleOrUser;
                return userRole && userRole >= otherRole;
            },

            /**
             * We never want to send passphrase as-is.
             * Instead, we mix things up and one-time-hash them to create an even safer password.
             *
             * @see https://github.com/dcodeIO/bcrypt.js
             * @param pepper Usually the user name or some other user-dependent information that is thrown into the mix to avoid equality of passwords of different users.
             *
             * @return A hashed version of the given passphrase
             */
            hashPassphrase: function(pepper, passphrase, salt) {
                var sharedSecretRaw = pepper + ':' + passphrase;
                bcrypt = typeof(bcrypt) !== undefined ? bcrypt : Shared.Main.assets.bcrypt;

                // create a hash asynchronously, so the actual password is never seen by anyone
                return new Promise(function(resolve, reject) {
                    salt = salt || Shared.AppConfig.getValue('userPasswordFirstSalt');
                    bcrypt.hash(sharedSecretRaw, salt, function(err, sharedSecretV1) {
                        if (err) {
                            return reject(err);
                        }

                        resolve(sharedSecretV1);
                    });
                }.bind(this));
            },

            // Caches (static member)
            Caches: {
                users: {
                    idProperty: 'uid',

                    hasHostMemorySet: 1,

                    indices: [
                        {
                            unique: true,
                            key: ['userName']
                        },
                        {
                            unique: true,
                            key: ['facebookID']
                        },
                    ],

                    InstanceProto: {
                        initialize: function(users) {
                            // add Instance object to new User instance
                            Object.defineProperty(this, 'Instance', {
                                enumerable: false,
                                value: users.Instance
                            });
                        }
                    },

                    members: {
                        getObjectNow: function(queryInput, ignoreAccessCheck) {
                            if (!this.hasMemorySet()) return null;

                            if (!queryInput) return null;
                            if (!ignoreAccessCheck && !this.Instance.User.isStaff()) {
                                // currently, this query cannot be remotely called by client
                                return null;
                            }

                            if (queryInput.uid) {
                                return this.byId[queryInput.uid];
                            }
                            else if (queryInput.facebookID) {
                                return this.indices.facebookID.get(queryInput.facebookID);
                            }
                            else if (queryInput.userName) {
                                return this.indices.userName.get(queryInput.userName);
                            }
                            return null;
                        },

                        getObjectsNow: function(queryInput) {
                            if (!this.hasMemorySet()) return null;
                            if (queryInput && queryInput.uid instanceof Array) {
                                var result = [];
                                for (var i = 0; i < queryInput.uid.length; ++i) {
                                    var uid = queryInput.uid[i];
                                    var user = this.byId[uid];
                                    if (user) {
                                        result.push(user);
                                    }
                                };
                                return result
                            }
                            return this.list;
                        },
                    }
                }
            },

            Private: {


                // #################################################################################
                // Getters

                getCurrentUser: function() {
                    return this.currentUser;
                },

                getCurrentUserName: function() {
                    return this.currentUser ? this.currentUser.userName : null;
                },

                /**
                 * Check if given user or user-role may currently login.
                 */
                isLoginLocked: function(userOrRole) {
                    var locked = !this.Context.clientIsLocal && Shared.AppConfig.getValue('loginLocked');
                    if (!userOrRole) {
                        return locked;
                    }

                    var role = userOrRole.role || userOrRole;
                    return locked && role <= this.Shared.UserRole.StandardUser;
                },

                isRegistrationLocked: function(userOrRole) {
                    var locked = !this.Context.clientIsLocal && Shared.AppConfig.getValue('registrationLocked');
                    if (!userOrRole) {
                        return locked;
                    }

                    var role = userOrRole.role || userOrRole;
                    return locked && role <= this.Shared.UserRole.StandardUser;
                },
            }
        };
    }),

    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {
        var UserModel;
        var UserRole;

        var SequelizeUtil;

        var CryptWorkFactor = 8;

        // TODO: Updates
        // see: http://stackoverflow.com/a/8158485/2228771

        return {
            __ctor: function () {
                SequelizeUtil = require(libRoot + 'SequelizeUtil');
            },

            initModel: function() {
                var This = this;
                UserRole = this.UserRole;

                /**
                 * User object definition.
                 */
                return UserModel = sequelize.define('User', {
                    uid: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true},
                    role: {
                        type: Sequelize.INTEGER.UNSIGNED,
                        allowNull: false
                    },
                    displayRole: {
                        type: Sequelize.INTEGER.UNSIGNED,
                        allowNull: false
                    },
                    // debugMode: {type: Sequelize.INTEGER.UNSIGNED},
                    userName: {
                        type: Sequelize.STRING(100),
                        allowNull: false
                    },

                    // a transformation of the user's password (which is unknown to the server)
                    secretSalt: Sequelize.STRING(256),
                    sharedSecret: Sequelize.STRING(256),

                    realName: Sequelize.STRING(100),
                    email: Sequelize.STRING(100),
                    locale: Sequelize.STRING(20),

                    facebookID: Sequelize.STRING(100),
                    facebookToken: Sequelize.STRING(100)
                },{
                    freezeTableName: true,
                    classMethods: {
                        onBeforeSync: function(models) {
                        },

                        onAfterSync: function(models) {
                            var tableName = this.getTableName();
                            return Promise.join(
                                // create indices
                                SequelizeUtil.createIndexIfNotExists(tableName, ['role']),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['userName'], { indexOptions: 'UNIQUE'}),
                                SequelizeUtil.createIndexIfNotExists(tableName, ['facebookID'], { indexOptions: 'UNIQUE'})
                            );
                        }
                    }
                });
            },

            
            Caches: {
                users: {
                    members: {
                        filterClientObject: function(user) {
                            // remove sensitive information before sending to client
                            delete user.secretSalt;
                            delete user.sharedSecret;
                            delete user.facebookToken;

                            return user;
                        },

                        onRemovedObject: function(user) {
                            // due to a foreign key, devices of user account will also be deleted
                            // so we will need to update the device cache manually
                            var devices = this.Instance.WifiSnifferDevice.wifiSnifferDevices;
                            var device = devices.indices.uid.get(user.uid);
                            if (device) {
                                devices.applyRemove(device);
                            }
                        },

                        /**
                         * 
                         */
                        compileReadObjectQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                            // Possible input: uid, userName, facebookID
                            if (!queryInput) {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            var queryData = {
                                include: Shared.User.userAssociations,
                                where: {},

                                // ignore sensitive attributes
                                attributes: Shared.User.visibleUserAttributes
                            };

                            if (queryInput.uid) {
                                queryData.where.uid = queryInput.uid;
                            }
                            else if (queryInput.facebookID) {
                                queryData.where.facebookID = queryInput.facebookID;
                            }
                            else if (queryInput.userName) {
                                queryData.where.userName = queryInput.userName;
                            }
                            else {
                                return Promise.reject(makeError('error.invalid.request'));
                            }

                            return queryData;
                        },

                        compileReadObjectsQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                            var queryData = {
                                //include: Shared.User.userAssociations,

                                // ignore sensitive attributes
                                attributes: Shared.User.visibleUserAttributes
                            };
                            if (queryInput && queryInput.uid instanceof Array) {
                                queryData.where = {
                                    uid: queryInput.uid
                                };
                            }
                            return queryData;
                        }
                    }
                }
            },

            Private: {
                __ctor: function () {
                    this.events = {
                        create: new squishy.createEvent(),
                        profileUpdated: new squishy.createEvent(),
                        login: new squishy.createEvent(),
                        logout: new squishy.createEvent(),
                    };
                },

                // #################################################################################
                // Basic getters

                /**
                 * 
                 */
                isStaff: function() {
                    return this.Shared.isStaff(this.currentUser);
                },

                isDevice: function() {
                    return this.Shared.isDevice(this.currentUser);
                },

                /**
                 * 
                 */
                isStandardUser: function() {
                    return this.Shared.isStandardUser(this.currentUser);
                },

                /**
                 * 
                 */
                isGuest: function() {
                    return this.Shared.isGuest(this.currentUser);
                },

                /**
                 * 
                 */
                hasRole: function(role) {
                    return this.Shared.hasRole(role, this.currentUser);
                },


                // #################################################################################
                // Internal login/logout management

                /**
                 * Called right after a user logged in.
                 */
                onLogin: function(user, isLogin) {
                    // TODO: re-generate session id to prevent repeat attack
                    var sess = this.Context.session;
                    //sess.regenerate(function() {
                        // fire login event
                    return this.events.login.fire()
                    .bind(this)
                    .then(function() {
                        if (isLogin) {
                            this.Tools.log('has logged in.');
                        }
                        else {
                            this.Tools.log('has come back (resumed session).');
                        }
                    });
                    //}.bind(this));
                },

                /**
                 * Called right before a user logs out.
                 */
                onLogout: function(){
                    // fire logout event
                    var userName = this.currentUser && this.currentUser.userName;
                    return this.events.logout.fire()
                    .bind(this)
                    .then(function() {
                        console.log('User `' + userName + '` logged out.');
                    });
                },

                generateNewUserCredentials: function(sharedSecretV1, result) {
                    result = result || {};
                    return new Promise(function(resolve, reject) {
                        bcrypt.genSalt(CryptWorkFactor, function(err, secretSalt) {
                            if (err) {
                                // never share this error with the outside world
                                this.Tools.handleError(err);
                                return reject('error.login.auth');
                            }

                            this._bcryptHash(sharedSecretV1, secretSalt)
                            .then(function(sharedSecretV2) {
                                result.sharedSecret = sharedSecretV2;
                                result.secretSalt = secretSalt;
                                resolve(result);
                            })
                            .catch(reject);
                        }.bind(this));
                    }.bind(this));
                },

                _bcryptHash: function(secret, secretSalt) {
                    return new Promise(function(resolve, reject) {
                        bcrypt.hash(secret || '', secretSalt, function(err, sharedSecretV2) {
                            if (err) {
                                // never share this error with the outside world
                                this.Tools.handleError(err);
                                return reject('error.login.auth');
                            }

                            resolve(sharedSecretV2);
                        }.bind(this));
                    }.bind(this));
                },

                _doesUserHavePasswordCredentials: function(user) {
                    return !!user.secretSalt && !!user.sharedSecret;
                },

                verifyCredentials: function(user, authData) {
                    if (!this._doesUserHavePasswordCredentials(user)) {
                        // never allow password-based authentication for an account without password
                        this.Tools.handleError('User without password tried to use password authentication');

                        return Promise.reject('error.login.auth');
                    }

                    return this._bcryptHash(authData.sharedSecretV1, user.secretSalt || '')
                    .then(function(sharedSecret) {
                        if (user.sharedSecret !== sharedSecret) {
                            // invalid user credentials
                            return Promise.reject('error.login.auth');
                        }
                        else {
                            // all good!
                            return Promise.resolve();
                        }
                    });
                },

                /**
                 * Query DB to validate user-provided credentials.
                 */
                tryLogin: function(authData) {
                    if (!authData) {
                        return Promise.reject(makeError('error.invalid.request'));
                    }

                    // query user from DB
                    var queryInput;
                    var hasSpecialPermission = this.Context.clientIsLocal;
                    var isFacebookLogin = !!authData.facebookID;
                    var hasAlreadyProvenCredentials = isFacebookLogin;

                    if (isFacebookLogin) {
                        // login using FB
                        queryInput = { facebookID: authData.facebookID };
                    }
                    else if (!!authData.uid) {
                        queryInput = { uid: authData.uid };
                    }
                    else if (!!authData.userName) {
                        // login using userName
                        queryInput = { userName: authData.userName };
                    }
                    else {
                        // invalid user credentials
                        return Promise.reject('error.login.auth');
                    }

                    var logLoginAttempt = function(user, result) {
                        // TODO: Need string for IP address due to the diversity in types (at the very least: IPv4, IPv6)
                        // return this.Instance.LoginAttempt.Model.create({
                        //     user_id: user && user.id,
                        //     result: !!user,
                        //     ip: 
                        // })
                        // .return(user);
                        return Promise.resolve(user);
                    };

                    return this.findUser(queryInput)
                    .bind(this)
                    .then(function(user) {
                        if (!user && authData.userName) {
                            // user does not exist: Check for special cases
                            if (hasSpecialPermission) {
                                // dev mode and localhost always allow admin accounts
                                authData.role = UserRole.Developer;

                                var promise = (!authData.sharedSecretV1 && Promise.resolve() ||
                                    this.generateNewUserCredentials(authData.sharedSecretV1, authData));

                                return promise.then(this.createAndLogin.bind(this, authData));
                            }
                            else {
                                // check if this is the first User
                                return UserModel.count()
                                .bind(this)
                                .then(function(count) {
                                    if (count == 0)  {
                                        // this is the first user: Create & login with highest privs
                                        authData.role = UserRole.Developer;
                                        return this.createAndLogin(authData);
                                    }
                                    else if (isFacebookLogin) {
                                        // standard user
                                        authData.role = UserRole.Unregistered;
                                        return this.createAndLogin(authData);
                                    }
                                    else {
                                        // invalid user credentials
                                        return Promise.reject('error.login.auth');
                                    }
                                });
                            }
                        }
                        else if (!user) {
                            // invalid user information
                            return Promise.reject('error.login.auth');
                        }
                        else {
                            if (this.isLoginLocked(user)) {
                                // "normals" cannot login when server is locked
                                return Promise.reject('error.login.locked');
                            }

                            var promise;
                            if (!hasAlreadyProvenCredentials && !hasSpecialPermission) {
                                // verify credentials
                                promise = this.verifyCredentials(user, authData);
                            }
                            else {
                                // this client is (hopefully) trustworthy!
                                promise = Promise.resolve();
                            }

                            // setCurrentUser, then run onLogin logic
                            return promise.then(this.setCurrentUser.bind(this, user))
                            .then(this.onLogin.bind(this, user, true))
                            .return(user);
                        }
                    })

                    // log LoginAttempt
                    .then(function(user) {
                        return logLoginAttempt(user);
                    })
                    .catch(function(err) {
                        return logLoginAttempt(null)
                        .delay(1000)
                        .then(function() {
                            // propagate original error
                            return Promise.reject(err); 
                        });
                    });
                },

                updateUserCredentials: function(userOrUid, sharedSecretV1) {
                    console.assert(!!userOrUid, 'Invalid arguments for `updateUserCredentials`');

                    return this.generateNewUserCredentials(sharedSecretV1)
                    .bind(this)
                    .then(function(update) {
                        update.uid = userOrUid.uid || userOrUid;
                        return this.users.updateObject(update, true);
                    });
                },

                /**
                 * Create new account and login right away
                 */
                createAndLogin: function(authData) {
                    var preferredLocale = authData.preferredLocale;
                    var role = authData.role || UserRole.StandardUser;

                    if (this.isRegistrationLocked(role)) {
                        return Promise.reject('error.login.registrationLocked');
                    }
                    if (this.isLoginLocked(role)) {
                        return Promise.reject('error.login.locked');
                    }
                    
                    if (!preferredLocale || !Shared.Localizer.Default.localeExists(preferredLocale)) {
                        // fall back to system default locale
                        preferredLocale = Shared.AppConfig.getValue('defaultLocale') || 'en';
                    }

                    var queryData = {
                        userName: authData.userName, 
                        role: role, 
                        displayRole: role,

                        locale: preferredLocale,

                        sharedSecret: authData.sharedSecret,
                        secretSalt: authData.secretSalt,

                        facebookID: authData.facebookID,
                        facebookToken: authData.facebookToken
                    };

                    this.Tools.logWarn('Creating new user account: ' + authData.userName);

                    return this.users.createObject(queryData, true)
                    .bind(this)
                    .then(function(user) {
                        // set current user data
                        this.setCurrentUser(user);

                        // fire creation and login events
                        return this.events.create.fire(user)
                        .bind(this)
                        .then(function() {
                            if (role >= UserRole.StandardUser) {
                                return this.events.profileUpdated.fire(user, null);
                            }
                        })
                        .then(function() {
                            return this.onLogin(user, true);
                        })
                        .return(user);
                    });
                },

                updateProfile: function(user, newUserData, isRegistering) {
                    var oldUserData = {};
                    for (var prop in newUserData) {
                        oldUserData[prop] = user[prop];
                    }

                    return this.updateUserValues(user, newUserData)
                    .bind(this)
                    .then(function() {
                        return this.events.profileUpdated.fire(user, oldUserData);
                    });
                },

                /**
                 * This method is called upon bootstrap for user's with an established session.
                 */
                resumeSession: function(filter) {
                    // log into account of given uid
                    var sess = this.Context.session;
                    var uid = sess.uid;

                    var loginAs = function(user) {
                        if (this.isLoginLocked(user)) {
                            // if we reject the request, bootstrapping won't succeed
                            //return Promise.reject('error.login.locked');
                            user = null;
                        }

                        var promise = Promise.resolve(user);
                        if (user && filter) {
                        	// check if user is ok
                        	promise = promise.then(filter);
                        }

                        return promise
                        .bind(this)
                        .then(function(user) {
                        	this.setCurrentUser(user);
                        	return user;
                    	});
                    }.bind(this);

                    if (uid) {
                        // resume session
                        var queryInput = {uid: uid};
                        return this.findUser(queryInput)
                        .bind(this)
                        .then(function(user) {
                            if (!user) {
                                // could not login -> Invalid session (or User could not be found)
                                this.Tools.logWarn('Unable to login user from session -- invalid or expired session');
                                delete sess.uid;    // delete uid from session

                                return loginAs(null);
                            }
                            else {
                                // do the login game
                                return loginAs(user)
                                .bind(this)
                                .then(function(user) {
                                	return this.onLogin(user, false);
                                })
                                .return(user);
                            }
                        })
                        .catch(function(err) {
                            this.Tools.handleError(err);
                            return loginAs(null);
                        });
                    }
                    else {
                        // no session to resume:
                        // login as guest
                        return loginAs(null);
                    }
                },


                // #################################################################################
                // Misc getters & setters

                /**
                 * TODO: Go through cache instead
                 */
                findUser: function(where) {
                    // query user from DB
                    return this.users.getObject(where, true, false, true)
                    .bind(this)
                    .then(function(user) {
                        console.assert(!user || user === this.users.getObjectNowById(user.uid), 'INTERNAL ERROR - users cache inconsistent');
                        return user;
                    });
                },


                /**
                 * Change current user values.
                 */
                updateUserValues: function(user, values) {
                    if (!user) {
                        return Promise.reject(makeError('error.invalid.request'));
                    }

                    // update DB
                    values.uid = user.uid;
                    return this.users.updateObject(values, true);
                },

                /**
                 * Only override current in-memory user context, don't do anything else
                 */
                setCurrentUserContext: function(user) {
                    this.currentUser = user;
                },


                /**
                 * This method is called when starting and upon successful login.
                 */
                setCurrentUser: function(user) {
                    console.assert(!user || user.uid, 'INTERNAL ERROR: Invalid user object has no `uid`');

                    var sess = this.Context.session;

                    // update currentUser and session data
                    var uid = sess.uid = user && user.uid;
                    this.currentUser = user;

                    if (user) {
                        // send user object to client
                        this.users.applyChanges([user]);
                        if (this.users.getObjectNowById(uid) !== this.currentUser) {
                            this.Tools.handleError(new Error('Cache error'));
                        };
                    }
                    
                    this.client.setCurrentUser(uid);
                },
            },


            Public: {

                /**
                 * Properly logout the current user
                 */
                logout: function() {
                    var sess = this.Context.session;

                    // delete session info & cached user
                    console.assert(sess.destroy, 'Unable to logout user: Session object is missing a `destroy` method. ' +
                        'Express sessions have this functionality for example.');

                    this.onLogout();

                    sess.destroy();
                    delete this.currentUser;

                    // refresh client
                    this.Tools.refresh();
                },
            },
        };
    }),


    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var UserRole;
        var ThisComponent;

        return {
            __ctor: function () {
                UserRole = this.UserRole;
                ThisComponent = this;
            },

            initClient: function() {
            },

            logout: function() {
                return this.host.logout();
            },

            getCurrentLocale: function() {
                var locale;
                var localizer = Instance.Localizer.Default;

                if (this.currentUser) {
                    // get user preference
                    locale = this.currentUser.locale;
                }

                if (!localizer.localeExists(locale)) {
                    locale = Instance.MiscUtil.guessClientLanguage();

                    if (!localizer.localeExists(locale)) {
                        // check if region-independent locale exists
                        // e.g. `de-CH` might not exist, but `de` might!
                        if (locale.indexOf('-') !== -1)
                            locale = locale.split('-')[0];

                        if (locale.indexOf('_') !== -1)
                            locale = locale.split('_')[0];

                        if (!localizer.localeExists(locale)) {
                            // unknown locale -> fall back to system default
                            locale = Instance.AppConfig.getValue('defaultLocale');
                        }
                    }
                }
                return locale;
            },


            // ################################################################################################################
            // Client-side cache

            /**
             * Events for changes in user data.
             */
            events: {
                /**
                 * Called when data of `currentUser` changed.
                 */
                updatedCurrentUser: squishy.createEvent(/* currentUser */)
            },

            cacheEventHandlers: {
                users: {
                    updated: function(newValues) {
                        if (ThisComponent.currentUser) {
                            // check if currentUser has changed
                            for (var i = 0; i < newValues.length; ++i) {
                                var userDelta = newValues[i];
                                var orig = ThisComponent.currentUser;
                                if (userDelta.uid == ThisComponent.currentUser.uid) {
                                    var copy = ThisComponent._currentUserCopy;
                                    var userChanged = !angular.equals(orig, copy);
                                    if (userChanged) {
                                        var privsChanged = !copy || copy.gid != orig.gid || 
                                            copy.displayRole != orig.displayRole;

                                        // currentUser actually changed
                                        ThisComponent.onCurrentUserChanged(privsChanged);
                                        break;
                                    }
                                }
                            };
                        }
                    }
                }
            },

            /**
             * Called when currentUser or values of currentUser changed.
             */
            onCurrentUserChanged: function(privsChanged) {
                // create new copy
                ThisComponent._currentUserCopy = _.clone(ThisComponent.currentUser);
                
                // notify main
                this.Instance.Main.onCurrentUserChanged(privsChanged);

                // raise event
                return this.events.updatedCurrentUser.fire(this.currentUser, privsChanged);
            },

            Public: {
                setCurrentUser: function(uid) {
                    this.currentUser = uid && this.users.getObjectNowById(uid);
                    if (uid && !this.currentUser) {
                        console.error('Cache `users` failed: Could not look up currentUser!');
                        debugger;
                    }

                    this.onCurrentUserChanged(true);
                },
            }
        };
    })
});