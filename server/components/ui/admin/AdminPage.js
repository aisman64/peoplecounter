/**
 * 
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) { 
        return {
            Assets: {
                Files: {
                    string: {
                        template: 'AdminPage.html'
                    }
                },
                AutoIncludes: {
                }
            },
                    
            /**
             * 
             */
            initHost: function() {
                
            },
            
            /**
             * Host commands can be directly called by the client
             */
            Public: {
                /**
                 * Change a given user's role
                 */
                setUserRole: function(uid, newRole) {
                    var user = this.Instance.User.currentUser;

                    if (!this.Instance.User.isStaff() ||
                        isNaNOrNull(uid) || 
                        isNaNOrNull(newRole) ||
                        newRole > user.displayRole) {
                        return Promise.reject(makeError('error.invalid.request'));
                    }

                    var UserRole = Shared.User.UserRole;

                    return this.Instance.User.users.getObject({uid: uid})
                    .bind(this)
                    .then(function(otherUser) {
                        // update roles
                        return this.Instance.User.updateUserValues(otherUser, {
                            role: newRole,
                            displayRole: newRole
                        });
                    });
                },

                fetchUserLogData: function() {
                    var tableName = Shared.UIActivityLogEntry.Model.tableName;

                    // var query = 'SELECT * FROM ' + tableName + ' WHERE `createdAt` IN (' +
                    //     'SELECT MAX(`createdAt`) FROM ' + tableName + ' GROUP BY uid' +
                    // ')';

                    // use JOIN instead
                    // see: http://stackoverflow.com/questions/29368129/mysql-query-on-medium-sized-table-fast-on-one-system-slow-on-another
                    var query = 'SELECT * FROM ' + tableName + ' a ' +
                        'INNER JOIN (' +
                        '(SELECT MAX(`createdAt`) createdAt FROM ' + tableName + ' GROUP BY uid) tmp' +
                        ') ON (a.createdAt = tmp.createdAt);';

                    return sequelize.query(query, {
                        type: sequelize.QueryTypes.SELECT
                    })
                    .then(function(results) {
                        return results;
                    });
                },

                updatePassphrase: function(uid, sharedSecretV1) {
                    // TODO: Allow any user to change their own password as they like.
                    //      But that requires more credential checking.
                    if (!this.Instance.User.isStaff()) return Promise.reject(makeError('error.invalid.permissions'));

                    return this.Instance.User.generateNewUserCredentials(sharedSecretV1)
                    .bind(this)
                    .then(function(result) {
                        result.uid = uid;

                        return this.Instance.User.users.updateObject(result);
                    });
                }
            },      // Public:
        };
    }),
    
    
    /**
     * Everything defined in `Client` lives only in the client (browser).
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var UserRole;

        var ThisComponent;
        return {
            __ctor: function() {
                ThisComponent = this;

                ThisComponent.userSelection = new Instance.UIMain.SelectionState('uid');
            },

            // ################################################################################################
            // Setup

            initClient: function() {
                UserRole = Instance.User.UserRole;
            },

            /**
             *
             */
            setupUI: function(UIMgr, app) {
                this.UsersView = {
                    loading: true,
                    users: Instance.User.users
                };

                this.changeSortBy('role');

                // create Settings controller
                app.lazyController('adminCtrl', 
                    ['$scope', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);

                    $scope.UsersView = ThisComponent.UsersView;

                    $scope.userRoleToString = function(userRole) {
                        return Instance.User.UserRole.getName(userRole);
                    };
                }]);

                this._setupUserUI(app);


                // register page
                Instance.UIMgr.registerPage(this, 'Admin', this.assets.template, {
                    iconClasses: 'fa fa-gavel'
                });
            },

            onPageActivate: function() {
                // (re-)fetch all users, activities and schedules
                Promise.join(
                    this.fetchUserData()
                )
                .bind(this)
                .finally(function() {
                    this.page.invalidateView();
                })
                .catch(this.page.handleError.bind(this.page));
            },

            // ################################################################################################
            // Users

            // ###################################################################
            // Data queries

            fetchUserData: function() {
                this.UsersView.loading = true;
                return Instance.User.users.readObjects()
                .bind(this)
                .finally(function() {
                    // TODO: Move this to a cache event handler
                    this.UsersView.loading = false;
                });
            },


            // ###################################################################
            // User UI

            _setupUserUI: function(app) {
                app.lazyController('adminUsersCtrl', ['$scope', function($scope) {
                    AngularUtil.decorateScope($scope);
                    $scope.UserRole = UserRole;

                    $scope.changeUserRole = function(user, newRole) {
                        ThisComponent.host.setUserRole(user.uid, newRole)
                        .then(function() {
                            $scope.$apply();    // this might trigger global changes
                        })
                        .catch($scope.handleError.bind($scope));
                    };
                }]);
            },

            toggleUserPanel: function() {
                this.UsersView.showPanel = !this.UsersView.showPanel;
                if (this.UsersView.showPanel) {
                    this.fetchUserData();
                }
            },


            // ####################################################################################
            // Sorting

            SortSettings: {
                name: function(user) {
                    return user.userName;
                },
                role: function(user) {
                    return user.role;
                },
            },

            changeSortBy: function(orderByName) {
                // determine new "orderBy" function or attribute
                var orderBy = this.SortSettings[orderByName];
                if (!orderBy) {
                    console.error('Invalid sort column: ' + orderByName);
                    return;
                }

                if (orderByName === this.UsersView.orderByName) {
                    // tri-toggle "orderReversed"
                    var orderReversed = this.UsersView.orderReversed;
                    if (orderReversed === null) {
                        orderReversed = true;
                    }
                    else if (orderReversed === true) {
                        orderReversed = false;
                    }
                    else {
                        // no order
                        orderBy = null;
                        orderByName = null;
                        orderReversed = null;
                    }
                }
                else {
                    orderReversed = true;
                }

                // write new values back to view
                this.UsersView.orderBy = orderBy;
                this.UsersView.orderByName = orderByName;
                this.UsersView.orderReversed = orderReversed;
            },


            // #########################################################################
            // Account management

            createNewAccount: function() {
                var email = this.UsersView.newUserEmail;
                if (!email || !email.length) return;

                this.UsersView.busy = true;

                return Instance.User.host.createNewUserPublic(email)
                .bind(this)
                .finally(function() {
                    this.UsersView.busy = false;
                })
                .then(function() {
                    this.UsersView.newUserEmail = null;
                    this.page.scope.infoMessage = "Added user successfully!";
                    this.page.invalidateView();

                })
                .catch(function(err) {
                    this.page.handleError(err);

                    this.page.scope.errorMessage = "Could not create user. Make sure, the email is valid and not registered yet!";
                    this.page.invalidateView();
                });
            },

            updatePassphrase: function(user) {
                var $scope = this.page.scope;

                // send login request to host
                $scope.errorMessage = null;
                ThisComponent.UsersView.busy = true;

                // get and remove passphrase
                var passphrase = this.UsersView.newPassphrase;
                ThisComponent.UsersView.newPassphrase = null;

                return (!passphrase && Promise.resolve(null) ||
                Instance.User.hashPassphrase(user.userName, passphrase))
                .then(function(sharedSecretV1) {
                    return ThisComponent.host.updatePassphrase(user.uid, sharedSecretV1);
                })
                .finally(function() {
                    ThisComponent.UsersView.busy = false;
                })
                .then(function() {
                    // success!
                    ThisComponent.UsersView.passwordSavedFor = user.uid;
                    $scope.safeDigest();
                })
                .catch($scope.handleError.bind($scope));
            },
            
            /**
             * Client commands can be directly called by the host
             */
            Public: {
                
            }
        };
    })
});