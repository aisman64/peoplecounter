
/**
 * All utilities required to verify and manage users.
 * TODO: Separate Account + User management
 */
"use strict";

var NoGapDef = require('nogap').Def;


module.exports = NoGapDef.component({
    Base: NoGapDef.defBase(function(SharedTools, Shared, SharedContext) {
        return {
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
                return role && role > this.UserRole.StandardUser;
            },

            isStandardUser: function(roleOrUser) {
                roleOrUser = roleOrUser || this.currentUser;
                if (!roleOrUser) return false;
                
                var role = roleOrUser.displayRole || roleOrUser;
                return role && role >= this.UserRole.StandardUser;
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

            Private: {
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

        var componentsRoot = '../../';
        var libRoot = componentsRoot + '../lib/';
        var SequelizeUtil;

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

                    authSecret: Sequelize.STRING(256),
                    authToken: Sequelize.STRING(256),       // a transformation of the user's password

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

            Private: {
                Caches: {
                    users: {
                        members: {
                            onWrapObject: function(user) {
                            },

                            /**
                             * 
                             */
                            compileReadObjectQuery: function(queryInput, ignoreAccessCheck, sendToClient) {
                                // Possible input: uid, userName, facebookID
                                if (!queryInput) {
                                    return Promise.reject(makeError('error.invalid.request'));
                                }
                                if (!ignoreAccessCheck && !this.Instance.User.isStaff()) {
                                    // currently, this query cannot be remotely called by client
                                    return Promise.reject('error.invalid.permissions');
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
                                    console.error(queryInput);
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

                verifyCredentials: function(authData, userData) {
                    // TODO: Use crypto and SHA1
                    return true;                    
                },

                /**
                 * Query DB to validate user-provided credentials.
                 */
                tryLogin: function(authData) {
                    // query user from DB
                    var queryInput;
                    var hasSpecialPermission = this.Context.clientIsLocal || Shared.AppConfig.getValue('dev');
                    var isFacebookLogin = !!authData.facebookID;
                    var hasAlreadyProvenCredentials = isFacebookLogin;
                    if (isFacebookLogin) {
                        // login using FB
                        queryInput = { facebookID: authData.facebookID };
                    }
                    else if (!!authData.uid) {
                        queryInput = { uid: authData.uid };
                    }
                    else if (hasSpecialPermission) {
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
                                authData.role = UserRole.Admin;
                                return this.createAndLogin(authData);
                            }
                            else {
                                // check if this is the first User
                                return UserModel.count()
                                .bind(this)
                                .then(function(count) {
                                    if (count == 0)  {
                                        // this is the first user: Create & login as Admin
                                        authData.role = UserRole.Admin;
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
                            // invalid user credentials
                            return Promise.reject('error.login.auth');
                        }
                        else {
                            if (this.isLoginLocked(user)) {
                                return Promise.reject('error.login.locked');
                            }

                            if (!hasAlreadyProvenCredentials) {
                                // verify credentials
                                if (!this.verifyCredentials(authData, user)) {
                                    // invalid user credentials
                                    return Promise.reject('error.login.auth');
                                }
                            }
                            
                            // set current user data
                            this.setCurrentUser(user);

                            // fire login event
                            return this.onLogin(user, true)
                            .return(user);
                        }
                    })

                    // log LoginAttempt
                    .then(function(user) {
                        return logLoginAttempt(user);
                    })
                    .catch(function(err) {
                        return logLoginAttempt(null)
                        .then(function() {
                            // propagate original error
                            return Promise.reject(err); 
                        });
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

                        //locale: Shared.AppConfig.getValue('defaultLocale') || 'en'
                        locale: preferredLocale,

                        facebookID: authData.facebookID,
                        facebookToken: authData.facebookToken
                    };

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
                resumeSession: function() {
                    // log into account of given uid
                    var sess = this.Context.session;
                    var uid = sess.uid;

                    var loginAs = function(user) {
                        if (this.isLoginLocked(user)) {
                            // if we reject the request, bootstrapping won't succeed
                            //return Promise.reject('error.login.locked');
                            user = null;
                        }
                        this.setCurrentUser(user);
                    }.bind(this);

                    if (uid) {
                        // resume session
                        var queryInput = {uid: uid};
                        return this.findUser(queryInput)
                        .bind(this)
                        .then(function(user) {
                            if (!user) {
                                //console.error('hasdasdi');
                                // could not login -> Invalid session (or rather, User could not be found)
                                this.Tools.warn('Unable to login user from session -- invalid or expired session');
                                delete sess.uid;    // delete uid from session

                                return loginAs(null) || null;
                            }
                            else {
                                // do the login game
                                var rejection = loginAs(user);
                                if (rejection) {
                                    return rejection;
                                }

                                // NOTE: We don't want to wait for all login events to finish here, since that can potentially take a while
                                //      If it finishes a bit later, things will (usually) work just fine.
                                this.onLogin(user, false);
                                return user;
                            }
                        })
                        .catch(function(err) {
                            this.Tools.handleError(err);
                            return loginAs(null) || null;
                        });
                    }
                    else {
                        // no session to resume:
                        // login as guest
                        return loginAs(null) || null;
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
                }
            }
        };
    })
});