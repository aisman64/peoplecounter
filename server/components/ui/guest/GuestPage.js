/**
 * This component takes care of rendering things for users who are not logged in.
 */
"use strict";

var NoGapDef = require('nogap').Def;

module.exports = NoGapDef.component({
    /**
     * Everything defined in `Host` lives only on the host side (Node).
     * 
     */
    Host: NoGapDef.defHost(function(SharedTools, Shared, SharedContext) {

    	return {
	        Assets: {
	            Files: {
	                string: {
	                    template: 'GuestPage.html'
	                }
	            },
	            AutoIncludes: {
	            }
	        },

	        __ctor: function() {
 
	        },
	           

	        Private: {
	            onClientBootstrap: function() {
	            },
	        },

	        Public: {

	            /**
	             * User clicked on `Login` button.
	             */
	            tryLogin: function(userName, sharedSecretV1, preferredLocale) {
                    var authData = {
                        userName: userName,
                        sharedSecretV1: sharedSecretV1,
                        preferredLocale: preferredLocale
                    };
	                return this.Instance.User.tryLogin(authData);
	            }
	        },
	    };
	}),
    
    
    /**
     * Everything defined in `Client` lives only in the client.
     *
     */
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var localizer;
        var scope;
        var ThisComponent;

        return {
            initClient: function() {
                // get some default utilities
                ThisComponent = this;
                localizer = Instance.Localizer.Default;
            },

            /**
             * Called by `UIMgr`
             */
            setupUI: function(UIMgr, app) {
                // create login controller
                // see: http://stackoverflow.com/questions/22589324/angular-js-basic-controller-return-error
                // see: http://scotch.io/tutorials/javascript/submitting-ajax-forms-the-angularjs-way
                app.lazyController('guestCtrl', ['$scope', function($scope) {
                    UIMgr.registerPageScope(ThisComponent, $scope);
                    scope = $scope;

                    // data to populate the login form
                    $scope.loginData = {
                        userName: ''
                    };

                    // only show "name only" login form, if this is a local client
                    $scope.isRegistrationLocked = Instance.User.isRegistrationLocked();
                    $scope.isLoginLocked = Instance.User.isLoginLocked();
                    $scope.showDevLoginForm = Context.clientIsLocal || Instance.AppConfig.getValue('dev');

                    $scope.busy = false;
                    $scope.errorMessage = null;

                    // 
                    $scope.clickFacebookLogin = function() {
                        $scope.busy = true;
                        //window.location.assign("/auth/facebook");
                    };
                   
                    // the function to be called when `login` is clicked
                    $scope.clickLogin = function() {
                        if ($scope.nameInvalid) return;

                        // send login request to host
                        $scope.errorMessage = null;
                        $scope.busy = true;

                        var passphrase = $scope.loginData.passphrase;
                        $scope.loginData.passphrase = null;

                        return (!passphrase && Promise.resolve() ||
                        Instance.User.hashPassphrase($scope.loginData.userName, passphrase))
                        .then(function(sharedSecretV1) {
                            return ThisComponent.host.tryLogin($scope.loginData.userName, sharedSecretV1, Instance.User.getCurrentLocale());
                        })
                        .finally(function() {
                            $scope.busy = false;
                        })
                        .then(function() {
                            // success!
                            $scope.$apply();
                        })
                        .catch($scope.handleError.bind($scope));
                    };

                    // auto login as 'SomeUser'
                    // setTimeout(function() {
                    //     $scope.loginData.userName = 'SomeUser';
                    //     $scope.nameInvalid = false;
                    //     $scope.clickLogin();
                    // }, 500);
                }]);

                // register page
                Instance.UIMgr.registerPage(this, 'Guest', this.assets.template, {
                    iconClasses: 'fa fa-mail-forward'
                });
            },
            
            
            /**
             * Client commands can be directly called by the host with this = owning LoginComponent.client instance.
             */
            Public: {
                onLoginSuccess: function() {
                    scope.safeDigest();
                }
            }
        };
    })
});