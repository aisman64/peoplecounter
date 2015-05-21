/**
 * The UI Manager component:
 *  - Takes care of `Page` and `UIComponent` registration
 *  - Keeps the address bar up to date
 *  - Handles all kinds of other aspects of navigation and the app frontend skeleton
 */
"use strict";

var NoGapDef = require('nogap').Def;



module.exports = NoGapDef.component({
    Namespace: 'bjt',
    
    Host: NoGapDef.defHost(function(Shared, Context) {
        return {
            Assets: {
                AutoIncludes: {
                    js: [
                        // jQuery
                        'lib/jquery/jquery-2.1.0.min.js',
                        'lib/jquery-ui/jquery-ui.min.js',

                        // Angular JS
                        // 'lib/angular/angular.min.js',
                        // 'lib/angular/angular-sanitize.min.js',
                        'lib/angular/angular.js',
                        'lib/angular/angular-sanitize.js',
                    ]
                },

                Files: {
                    string: {
                        // ui mgr template
                        template: 'UIMgr.html'
                    }
                }
            },

            Private: {
                onClientBootstrap: function() {
                    
                },
            }
        };
    }),
    

    
    Client: NoGapDef.defClient(function(Tools, Instance, Context) {
        var ThisComponent;

        // ####################################################################################################################
        // misc variables

        var scope, menuScope;

        // buttons in the main menu
        var navButtons = {
            left: [],
            right: []
        };

        // current state info
        var activePage, activeButton;

        // page containers
        var pages = [];
        var pagesByPageName = {};
        var pagesByComponentName = {};

        // page group containers
        var pageGroups = [];
        var pageGroupsByComponentName = {};

        // non-page UI elements
        var uiElementComponents = [];

        // fixed (in-viewport floating) elements
        var fixedElements = [];

        // misc vars
        var templateCache;
        var clientInitialized;

        // during initialization or other critical operations, the pendingPromise
        //      provides a command queue to keep things in sync
        var pendingPromise;

        /**
         * The main Angular module
         */
        var app;

    
        /**
         * Tell Angular to re-render dirty variables inside the main view.
         * @see http://stackoverflow.com/a/23769600/2228771
         */
        var invalidateView = function() {
            scope.safeDigest();
        };

        /**
         * Re-render menu.
         */
        var invalidateMenuView = function() {
            menuScope.safeDigest();
        };

        return {

            // ################################################################################################################
            // UIMgr initialization

            __ctor: function() {
                ThisComponent = this;

                // create events
                this.events = {
                    pageActivated: squishy.createEvent(this)
                };
            },

            /**
             * Create and register UIMgr's own directives
             */
            _addDirectives: function(app) {
                app.lazyDirective('navButton', function() {
                    var linkFun = function() {

                    }.bind(this);

                    return {
                        restrict: 'E',
                        link: linkFun,
                        replace: true,
                        templateUrl: 'UIMgr/navButton'
                    };
                });
            },

            /**
             *
             */
            _onInit: function() {
                // register modal to be shown when a refresh is requested
                Instance.Libs.ComponentCommunications.events.refreshRequested.addListener(function() {
                    return new Promise(function(resolve, reject) {
                        var title = 'WARNING - ' + this.appName + ' requested a refresh.';
                        var body = 'You must refresh to continue working! Do you want to refresh now? ' +
                            'Make sure to COPY all your unsaved progress first!!!';

                        scope.okCancelModal('', title, body, resolve, reject);
                    }.bind(this));
                }.bind(this));


                // update current page view in regular intervals
                var updateDelayMillis = 60 * 1000; // every minute
                this.pageUpdateTimer = setInterval(function() {
                    if (activePage) {
                        activePage.scope.safeDigest();
                    }
                }, updateDelayMillis);
            },
            
            /**
             * This is called by the outside to kickstart this whole thing.
             */
            initUIMgr: function(appName, _app) {
                console.assert(!clientInitialized, 'Tried to initialize UIMgr more than once.');
                clientInitialized = true;

                app = _app;
                this.appName = appName;

                // define lazy version as non-lazy version first.
                // Once ready + bootstrapped, they will be overridden with the actual lazy version of things.
                // This way, we can always use these, no matter Angular's state.
                app.lazyController = app.controller.bind(app);
                app.lazyDirective = app.directive.bind(app);

                app.
                config(['$controllerProvider', '$compileProvider', 
                    function($controllerProvider, $compileProvider) {

                    // we need this for lazy registration of new controllers after Angular's bootstrap
                    // Example - see: http://jsfiddle.net/8Bf8m/33/
                    // API - see: https://docs.angularjs.org/api/ng/provider/$controllerProvider
                    //app.lazyController = $controllerProvider.register;
                    app.lazyController = function(name) {
                        //console.log('Creating controller: ' + name);
                        $controllerProvider.register.apply($controllerProvider, arguments);
                    };

                    // we need this for lazy registration of new directives after Angular's bootstrap
                    // see: http://stackoverflow.com/a/24228135/2228771
                    app.lazyDirective = $compileProvider.directive;
                }]).
                config( ['$provide', function ($provide){
                    $provide.decorator('$browser', ['$delegate', function ($delegate) {
                        // Turn off the awful location service...
                        // This awfully badly written piece of software makes it impossible to use the standard browsing features and introduces random bugs...
                        // see: http://stackoverflow.com/questions/18611214/turn-off-url-manipulation-in-angularjs
                        $delegate.onUrlChange = function () {};
                        $delegate.url = function () { return ""; };
                        return $delegate;
                    }]);
                }]);

                // add custom directives
                this._addDirectives(app);

                // other initialization stuff
                this._onInit();
                    
                var This = this;
                return pendingPromise = new Promise(function(resolve, reject) {
                    // define root controller
                    app.controller('uimgrCtrl',
                      ['$scope', '$templateCache', '$injector',  '$modal', '$rootScope',
                      function($scope, $templateCache, $injector, $modal, $rootScope) {
                        AngularUtil.decorateScope($scope);

                        // add pages to main scope
                        $scope.pages = pages;

                        // add fixed elements
                        $scope.fixedElements = fixedElements;

                        // add some useful functions to everyone's scope:
                        $scope.gotoPage = This.gotoPage.bind(This);

                        // remember $scope & $templateCache so we can lazily add partials
                        scope = This.scope = $scope;
                        templateCache = $templateCache;

                        // add some general UI tools to the UIMgr scope
                        // see: http://stackoverflow.com/questions/13845409/angularjs-default-text-for-empty-ng-repeat-on-javascript-object
                        $scope.isEmptyObject = function (obj) {
                            return angular.equals({},obj); 
                        };

                        // prepare OK<->Cancel Modal
                        // see: http://angular-ui.github.io/bootstrap/#modal
                        $scope.okCancelModal = function (size, title, body, onOk, onDismiss) {
                            var modalInstance = $modal.open({
                                templateUrl: 'UIMgr/okCancelModal',
                                size: size,
                                resolve: {
                                    items: function () {
                                    }
                                },
                                controller: function ($scope, $modalInstance, items) {
                                    $scope.okCancelModalData = {
                                        title: title,
                                        body: body
                                    };
                                    $scope.ok = function () {
                                        $modalInstance.close('ok');
                                    };

                                    $scope.cancel = function () {
                                        $modalInstance.dismiss('cancel');
                                    };
                                }
                            });

                            modalInstance.result.then(onOk, onDismiss);
                        };

                        $injector.invoke(function() {
                            // basic skeleton initialized
                            // return app object
                            resolve(app);
                        });
                    }]);

                    app.controller('uiMenuCtrl', 
                        ['$scope', '$templateCache', '$injector',  '$modal', '$rootScope',
                        function($scope) {
                            AngularUtil.decorateScope($scope);
                            menuScope = This.menuScope = $scope;
                            $scope.navButtons = navButtons;
                        }]);

                    // handle back button and manual browsing:
                    window.onpopstate = function() {
                        // go given address
                        if (!this.addedHistoryEntry) return;

                        // TODO: This still doesn't work right
                        this.lastAddress = history.state;
                        this.gotoAddressBarAddress();
                    }.bind(this);

                    // add the view to the body
                    // this will also bootstrap our angular app
                    document.body.innerHTML += this.assets.template;
                }.bind(this));
            },


            // ################################################################################################################
            // Manage UIMgr ready state

            /**
             * Append given code to pendingPromise (e.g. for initialization)
             */
            enqueueTask: function(cb) {
                return pendingPromise = pendingPromise
                .then(cb);
            },

            /**
             * Calls the given cb either after the UI is ready, 
             * or right away if it is already ready.
             */
            ready: function(cb) {
                return pendingPromise
                .then(cb);
            },


            // ################################################################################################################
            // Add page groups, pages, buttons, templates etc.

            addPageGroup: function(group) {
                console.assert(group.mayActivate, 'Page group must define a `mayActivate` method.');
                console.assert(group.pageComponents, 'Page group must define a `pageComponents` array.');

                // merge `pageComponents` and `otherComponents` into `allComponents`
                // start with `otherComponents` (non-UI components), so they are loaded first
                group.allComponents = group.otherComponents ? group.otherComponents.concat(group.pageComponents) : group.pageComponents;

                group.pages = [];
                pageGroups.push(group);
                group.pageComponents.forEach(function(componentName) {
                    pageGroupsByComponentName[componentName] = group;
                }.bind(this));
            },

            /**
             * Add new content to the main container on the page
             */
            registerPage: function(component, pageName, content, buttonData, parentPageName) {
                var This = this;

                console.assert(!pagesByPageName[pageName], pageName + ' - page name registered more than once. Currently, page names must be unique');

                var componentName = component.Def.FullName;
                var group = pageGroupsByComponentName[componentName];

                console.assert(group, 'Page was not in any group - We need groups to determine what to load and when: ' + pageName);

                // define page object
                var page = {
                    name: pageName,
                    templateName: 'page/' + pageName,
                    content: content,
                    component: component,
                    group: group,
                    parentPageName: parentPageName,
                    active: false,
                    scope: scope,

                    toString: function() { return this.name; },
                    invalidateView: function() {
                        if (this.scope) this.scope.safeDigest();
                    },

                    handleError: function(err) {
                        if (this.scope) this.scope.handleError(err);
                    },

                    clearError: function() {
                        if (this.scope) this.scope.clearError();
                    }
                };

                if (!component.getPageArgs) {
                    // make sure, getPageArgs function exists
                    component.getPageArgs = function() {
                        return '';
                    };
                }
                this.Tools.bindAllMethodsToObject(page);

                // add parent<->child Association
                if (parentPageName) {
                    var parentPage = pagesByPageName[parentPageName];
                    if (!parentPage) {
                        throw new Error('Could not find parent page `' + parentPageName + '` for page `' + pageName + 
                            '`. Make sure that the parent page exists and that it is loaded before the child page (order matters!).');
                    }
                    page.parent = parentPage;
                    parentPage.children = parentPage.children || {};
                    parentPage.children[pageName] = page;
                }

                // patch component page object:
                // add `page` property
                component.page = page;

                // add `activatePage` method
                Object.defineProperty(component, 'activatePage', {
                    enumerable: true,

                    value: function(args, force) {
                        return This._setActivePage(page, args, force);
                    }
                });


                // add page to all containers and to group
                pages.push(page);
                pagesByPageName[pageName] = page;
                pagesByComponentName[componentName] = page;
                group.pages.push(page);

                // TODO: Justified nav
                //          (http://stackoverflow.com/questions/14601425/bootstrap-navbar-justify-span-menu-items-occupying-full-width)
                //          (http://getbootstrap.com/examples/justified-nav/)

                // handle button
                if (buttonData) {
                    // create button
                    page.navButton = this.registerNavButton(buttonData, page);
                }

                // add page template so it can be rendered
                this.addTemplate(page.templateName, content);
            },

            registerNavButton: function(buttonData, page) {
                /**
                 * Default values for nav buttons
                 */
                var buttonDefaults = {
                    page: page,
                    show: true,

                    right: false,

                    getText: function() {
                        return (this.text !== undefined || !page) ? this.text :
                            Instance.Localizer.Default.lookUp('page.' + page.name);
                    },

                    //tabindex: navButtons.length+1,

                    // urgent marker
                    urgentMarker: false,
                    setUrgentMarker: function(enabled) {
                        this.urgentMarker = enabled;

                        // refresh menu
                        invalidateMenuView();
                        //invalidateView();
                    },

                    // badge value
                    badgeText: null,
                    badgeType: 'danger',
                    setBadge: function(badgeText, badgeType) {
                        this.badgeText = badgeText;
                        this.badgeType = badgeType || this.badgeType;
                    }
                };

                // add default `onClick` function: gotoPage
                if (page) {
                    buttonDefaults.onClick = function() {
                        ThisComponent.gotoPage(this.page.name);
                    };
                }

                // merge defaults into buttonData
                var button = squishy.mergeWithoutOverride(buttonData, buttonDefaults);

                // add button template if any
                if (button.template) {
                    button.templateName = button.templateName || (!!page && ('nav/' + page.name));
                    this.addTemplate(button.templateName, button.template);
                }

                var buttons = button.right ? navButtons.right : navButtons.left;
                buttons.push(button);

                return button;
            },


            /**
             * Call this when creating the root scope of a page
             */
            registerPageScope: function(component, scope) {
                console.assert(component && component.page, 'Called `registerPageScope` on non-Page component: ' + component);
                console.assert(scope, 'Missing argument `scope` when calling `UIMgr.registerPageScope`');

                // decorate scope
                AngularUtil.decorateScope(scope);

                var page = component.page;

                // remember page.scope and scope.page
                page.scope = scope;
                scope.page = page;
                scope.PC = component;

                scope.$on('$destroy', function() {
                    // un-register scope
                    page.scope = null;
                });
            },

            _registerElementComponentBase: function(component) {
                var uiControl = {
                    component: component,
                    scopes: [],

                    invalidateView: function() {
                        // invalidate all scopes (is this necessary?)
                        for (var i = 0; i < this.scopes.length; ++i) {
                            this.scopes[i].safeDigest();
                        };
                    },

                    handleError: function(err) {
                        // propagate error to all scopes
                        for (var i = 0; i < this.scopes.length; ++i) {
                            this.scopes[i].handleError(err);
                        };
                    },

                    clearError: function() {
                        for (var i = 0; i < this.scopes.length; ++i) {
                            this.scopes[i].clearError();
                        };
                    }
                };
                this.Tools.bindAllMethodsToObject(uiControl);

                component.ui = uiControl; 
                return uiControl;
            },

            registerElementComponent: function(component) {
                this._registerElementComponentBase(component);

                uiElementComponents.push(component);
            },

            registerElementScope: function(component, scope) {
                console.assert(component && component.ui,
                    'Given component is not a UI component. You probably forgot ' +
                    'to call `registerElementComponent` on it in `setupUI`: ' + component);

                // decorate scope
                AngularUtil.decorateScope(scope);

                // manage scopes array
                component.ui.scopes.push(scope);
                scope.$on('$destroy', function() {
                    _.remove(component.ui.scopes, scope);
                });
                
                // add component to scope
                scope[component.Def.FullName] = component;
            },

            /**
             * Partial templates allow us to lazy-load templates in string form.
             * @see http://jsfiddle.net/8Bf8m/33/
             */
            addTemplate: function(templateName, content) {
                if (!templateName || !content) {
                    throw new Error('Invalid template data');
                }
                templateCache.put(templateName, content);
            },

            /**
             *
             */
            registerFixedElementComponent: function(component, template) {
                var ui = this._registerElementComponentBase(component);

                // add templateName, and register component and template
                ui.templateName = 'fixed/' + component.Def.FullName;
                this.addTemplate(ui.templateName, template);
                fixedElements.push(ui);
            },

            registerFixedElementScope: function(component, $scope) {
                AngularUtil.decorateScope($scope);
                component.ui.scope = $scope;

                $scope.$on('$destroy', function() {
                    component.ui.scope = null;
                });

                // add component to scope
                $scope[component.Def.FullName] = component;
            },

            // ################################################################################################################
            // Events triggered directly by the server (or by client)

            /**
             * Current user changed changed ->
             * Re-validate which buttons and pages to show, and refresh entire app.
             */
            onCurrentUserChanged: function(privsChanged) {
                if (!clientInitialized) return;

                // Revalidate whether user is still allowed to see the current page or buttons
                if (privsChanged) {
                    for (var i = 0; i < pageGroups.length; ++i) {
                        var group = pageGroups[i];
                        for (var j = 0; j < group.pages.length; ++j) {
                            var page = group.pages[j];
                            if (page.navButton) {
                                page.navButton.show = group.mayActivate();
                            }
                        }
                    }
                }

                // navigate to where user wants to go
                this.gotoAddressBarAddress();
            },


            // ####################################################################################################################
            // Navigation and page activation

            /**
             * We leave the current page because we are not supposed to be on it.
             * In that case, we want to go back to the last page and remove the current page from the history.
             * However it is not possible to rewrite browser history (yet).
             * So we have to track everything ourselves.
             */
            leaveCurrentPage: function() {
                if (!activePage) return;

                // TODO: Track all history and enable deleting of entries and smarter navigation

                // for now, we just settle with the fact that the page is still in the history and go back
                //gotoPage('Home');
                history.back();
            },

            getActivePage: function() {
                return activePage;
            },

            getActivePageArgs: function() {
                return activePage && activePage.component.getPageArgs() || '';
            },

            refreshActivePage: function() {
                activePage && activePage.component.activatePage(null, true);
            },

            /**
             * Use a stupid heuristic to get component name from page name
             */
            getComponentNameFromPageName: function(pageName) {
                return pageName + 'Page';
            },

            /**
             * Recursively get full path of page in page tree.
             */
            getPageBasePath: function(currentPage) {
                currentPage = currentPage || activePage;
                if (!currentPage) {
                    return '/';
                }

                var parentPage = currentPage.parent;
                var path = '/' + currentPage.name;
                if (parentPage) {
                    // recurse
                    path = this.getPageBasePath(parentPage) + path;
                }
                return path;
            },


            /**
             * Go to the state encoded in the current path of the address bar
             */
            gotoAddressBarAddress: function() {
                // get path
                //var path = window.location.href.substring(origin.length);
                var path = window.location.pathname + window.location.search
                     + window.location.hash;
                if (path.length > 0) {
                    path = path.substring(1);
                }
                return this.gotoPath(path);
            },

            gotoPath: function(path) {
                if (path.length == 0) {
                    // go to default page
                    return this.gotoDefaultPage();
                }
                else {
                    // decompose the location's `path` and go to the page
                    var pathObj = path.split('/');
                    var pageName;
                    var argsIdx = 0;
                    for (var i = 0; i < pathObj.length; ++i) {
                        var _pageName = pathObj[i];
                        while (_pageName.endsWith('#')) {
                            // sometimes, a hash steals itself into the name
                            _pageName = _pageName.substring(0, _pageName.length-1);
                        }
                        var componentName = this.getComponentNameFromPageName(_pageName);
                        if (!pageGroupsByComponentName[componentName]) {
                            // this is not a valid page name -> Probably an argument
                            break;
                        }
                        pageName = _pageName;
                        argsIdx += pageName.length + 1;
                    }

                    // get page args
                    var pageArgs = path.length > argsIdx ? path.substring(argsIdx) : null;

                    return this.gotoPage(pageName, pageArgs);
                }
            },

            /**
             * Fallback page when user-selection is not valid.
             * WARNING: This code is fragile.
             *      If there is a small error in the routing logic, this call can easily cause an infinite loop.
             */
            gotoDefaultPage: function(lastTriedGroup) {
                // go to first page of first allowed group
                for (var i = 0; i < pageGroups.length; ++i) {
                    var group = pageGroups[i];
                    if (group.mayActivate()) {
                        if (group == lastTriedGroup) {
                            // failed to go to this page before
                            break;
                        }
                        return this.gotoComponent(group.pageComponents[0]);
                    }
                };

                return Promise.reject('Could not go to default page.');
            },

            /**
             * Go to the page of the given name.
             */
            gotoPage: function(pageName, pageArgs) {
                return this.gotoComponent(this.getComponentNameFromPageName(pageName), pageArgs);
            },
            
            /**
             * Prepare going to the page that is represented by the component of the given name.
             */
            gotoComponent: function(componentName, pageArgs) {
                // get all components of the same group
                var pageGroup = pageGroupsByComponentName[componentName];

                // check if component is page and whether user has required access rights
                if (!pageGroup || !pageGroup.mayActivate()) {
                    // cannot access -> go to fallback page
                    return this.gotoDefaultPage();
                }

                // Start by getting the set of all allowed pageGroups' components.
                var groupComponents = [];
                pageGroups.forEach(function(pageGroup) {
                    if (pageGroup.mayActivate()) {
                        groupComponents.push.apply(groupComponents, pageGroup.allComponents);
                    }
                });

                // Then request all currently allowed components from server (if not present yet).
                return Tools.requestClientComponents(groupComponents)
                .then(function() {
                    console.assert(pages.length, 
                        'Tried to goto page `' + componentName + '` when there was no page registered.');

                    //var comp = this.Instance[componentName];

                    // now check if it's actually a page (component must be present for this check)
                    if (pagesByComponentName[componentName]) {
                        // activate it
                        return this._setActivePage(pagesByComponentName[componentName], pageArgs, true);
                    }
                    else {
                        // fall back to default
                        console.error('Tried to navigate to non-page component: ' + componentName);
                        return this.gotoDefaultPage(pageGroup);
                    }
                //}.bind(this));}.bind(this));
                }.bind(this));
                //}.bind(this));
            },

            /**
             * Display current page location in address bar (and add history entry).
             * Does not do anything if the given component is not the active page and `force` is `false`.
             */
            updateAddressBar: function(component, force) {
                if (force || (activePage && activePage.component == component)) {
                    // build base path from path in page tree
                    var pagePath = this.getPageBasePath(activePage);

                    // get pageArgs
                    var pageArgs = component.getPageArgs() || '';
                    if (pageArgs) {
                        pagePath += '/' + pageArgs;
                    }

                    var lowerCasePagePath = pagePath.toLowerCase();

                    if (!history.state) {
                        // first entry
                        history.replaceState(pagePath, null, pagePath);
                    }
                    else if (history.state.toLowerCase() !== lowerCasePagePath &&
                        this.lastAddress !== lowerCasePagePath) {
                        // only add history entry if it's different from the last one (case-insensitively)
                        history.pushState(pagePath, null, pagePath);
                    }
                    this.addedHistoryEntry = true;
                }
            },

            arePageArgsEqual: function(args1, args2) {
                if (args1 === null || args1 === undefined) args1 = '';
                if (args2 === null || args2 === undefined) args2 = '';
                return args1 === args2;
            },

            /**
             * Recursively call `onPageDeactivate` on component and all children.
             */
            _callOnPageDeactivateOnComponent: function(component, newPage) {
                var onPageDeactivateCb = component.onPageDeactivate;
                if (onPageDeactivateCb instanceof Function) {
                    onPageDeactivateCb(newPage);
                }
                else if (onPageDeactivateCb && onPageDeactivateCb.pre) {
                    // `onPageDeactivate` is an object with optional `pre` and `post` properties
                    onPageDeactivateCb.pre.call(component, newPage);
                }

                // recursively call `onPageDeactivate` on children
                component.forEachPageChild(function(childComponent) {
                    this._callOnPageDeactivateOnComponent(childComponent, newPage);
                }.bind(this));

                if (onPageDeactivateCb && onPageDeactivateCb.post) {
                    // `onPageDeactivate` is an object with optional `pre` and `post` properties
                    onPageDeactivateCb.post.call(component, newPage);
                }
            },

            _onPageDeactivate: function(page, newPage) {
                // disable running timer(s)
                if (page.component._refreshTimer) {
                    clearInterval(page.component._refreshTimer);
                    page.component._refreshTimer = null;
                }

                // fire event
                this._callOnPageDeactivateOnComponent(page.component, newPage);

                page.active = false;
                if (page.navButton) {
                    page.navButton.active = false;
                }
            },

            /**
             * Recursively call `onPageActivate` on component and all children.
             */
            _callOnPageActivateOnComponent: function(component, pageArgs) {
                var onPageActivateCb = component.onPageActivate;
                var promise = Promise.resolve();
                if (onPageActivateCb instanceof Function) {
                    promise = promise.then(function() {
                        return onPageActivateCb.call(component, pageArgs);
                    });
                }
                else if (onPageActivateCb && onPageActivateCb.pre) {
                    // `onPageActivate` is an object with optional `pre` and `post` properties
                    promise = promise.then(function() {
                        return onPageActivateCb.pre.call(component, pageArgs);
                    });
                }

                // TODO: Also work with prmoises on the child components

                // recursively call `onPageActivate` on children
                component.forEachPageChild(function(childComponent) {
                    this._callOnPageActivateOnComponent(childComponent, pageArgs);
                }.bind(this));

                if (onPageActivateCb && onPageActivateCb.post) {
                    // `onPageActivate` is an object with optional `pre` and `post` properties
                    promise = promise.then(function() {
                        return onPageActivateCb.post.call(component, pageArgs);
                    });
                }
                return promise;
            },
            
            _onPageActivate: function(page, pageArgs) {
                // set activePage
                activePage = page;

                // update title
                var pageTitle = page.getTitle ? page.getTitle() : page.name;
                document.title =  pageTitle + ' - ' + Instance.UIMgr.appName;

                // set active button:
                if (activeButton) {
                    // only one active button in the main menu (for now)
                    activeButton.active = false;
                }

                // throw new Error('went to page: ' + page.name);

                page.active = true;
                if (page.navButton) {
                    page.navButton.active = true;
                    activeButton = page.navButton;
                }
                else if (page.parentPageName) {
                    // TODO: Make this more consistent
                    var parentPage = pagesByPageName[page.parentPageName];
                    parentPage.navButton.active = true;
                    activeButton = parentPage.navButton;
                }

                var component = page.component;
                
                // re-compute arguments
                pageArgs = pageArgs || component.getPageArgs();

                // this creates the page scope
                invalidateView();

                // start timer to call `refreshData`
                if (component.refreshData) {
                    var minRefreshDelay = 300;
                    var delay = component.refreshDelay || Instance.AppConfig.getValue('defaultPageRefreshDelay');
                    if (isNaN(delay) || delay < minRefreshDelay) {
                        // sanity check
                        console.error('refreshDelay too fast for page: ' + page.name);
                        delay = minRefreshDelay;
                    }
                    component._refreshTimer = setInterval(function() {
                        if (component.refreshPaused) return;
                        component.refreshData();
                    }, delay);
                }

                // call `onPageActivate`
                return this._callOnPageActivateOnComponent(component, pageArgs)
                .bind(this)
                .then(function() {
                    // add history entry
                    Instance.UIMgr.updateAddressBar(component, true);
                });
            },
                    
            /**
             * Deactivate current and activate new page.
             */
            _setActivePage: function(newPage, pageArgs, force) {
                var This = Instance.UIMgr;

                if (Instance.Libs.ComponentCommunications.hasRefreshBeenRequested()) {
                    // server has already requested a refresh -> ask user again
                    Instance.Libs.ComponentCommunications.requestRefresh();
                }

                return This.ready(function() {
                    // we need to defer setup because Angular might not be ready yet
                    if (!force && activePage == newPage && (!pageArgs || this.arePageArgsEqual(activePage.component.getPageArgs(), pageArgs))) {
                        // same page -> Don't do anything

                        // same page -> Only update address arguments
                        //Instance.UIMgr.updateAddressBar(newPage.component, true);
                        
                        // invalidate view
                        invalidateView();
                    }
                    else {
                        if (activePage && activePage !== newPage) {
                            // deactivate current page
                            var result = this._onPageDeactivate(activePage, newPage);
                            // if (result === false) {
                            //     // page change was cancelled
                            //     return;
                            // }
                        }
                        if (!newPage) {
                            // nothing happens (should probably never happen)
                            activePage = null;
                        }
                        else {
                            // activate new page
                            this._onPageActivate(newPage, pageArgs)
                            .bind(this)
                            .then(function() {
                                // invalidate view
                                invalidateView();

                                // fire event
                                This.events.pageActivated.fire(newPage);
                            })
                        }
                    }
                }.bind(this));
            },


            // ################################################################################################################
            // Component Events
            
            /**
             * Called after the given component has been freshly loaded to the client.
             */
            onNewComponent: function(newComponent) {
                // call `setupUI` on ui components
                //console.log('comp ' + newComponent.Def.FullName + ' ' + !!newComponent.setupUI);
                if (newComponent.setupUI) {
                    newComponent.setupUI(this, app);

                    // flag as UI newComponent
                    newComponent.isUI = true;
                }

                // hook-up all component events
                if (newComponent.componentEventHandlers) {
                    // iterate over all component event handlers
                    for (var componentName in newComponent.componentEventHandlers) {
                        var dependency = newComponent.componentEventHandlers[componentName];
                        var otherComponent = Instance[componentName];
                        console.assert(otherComponent, 'Invalid entry in `' + newComponent.Def.FullName + 
                            '.componentEventHandlers`: Component `' + componentName + '` does not exist.');


                        var events = otherComponent.events;
                        console.assert(events, 'Invalid entry in `' + newComponent.Def.FullName + 
                            '.componentEventHandlers`: Component `' + componentName + '` does not define any events.');


                        for (var eventName in dependency) {
                            // get callback function
                            var callback = dependency[eventName];
                            console.assert(callback instanceof Function, 'Invalid entry in `' + newComponent.Def.FullName + 
                                '.componentEventHandlers`: Entry `' + eventName + '` is not a function.');

                            // get event
                            var evt = events[eventName];
                            console.assert(evt, 'Invalid entry in `' + newComponent.Def.FullName + 
                                '.componentEventHandlers`: Component `' + componentName + '` does not define `events.' + eventName + '` property.');

                            // hook up callback function to the event
                            evt.addListener(callback);
                        }
                    }
                }
            },

            /** 
             * Tie in new components after they have all been initialized.
             */
            onNewComponents: function(newComponents) {
                // Tie in UI components with their child UI components

                // iterate over all new components
                for (var i = 0; i < newComponents.length; i++) {
                    var component = newComponents[i];

                    // convinient page child iteration method
                    component.forEachPageChild = function(fn) {
                        if (!this.PageChildren) return;

                        for (var i = 0; i < this.PageChildren.length; ++i) {
                            var childName = this.PageChildren[i];
                            var childComponent = Instance[childName];
                            if (!childComponent) {
                                throw new Error('Invalid entry "' + childName + 
                                    '" in `PageChildren` of component "' + component + '". ' +
                                    "Child component does not exist or has not been loaded yet.");
                            }

                            fn(childComponent);
                        };
                    };

                    // initialize Page child <-> parent relation
                    component.forEachPageChild(function(childComponent) {
                        // Don't do this, since a child might have multiple parents
                        //// set parent
                        //childComponent.parentComponent = component;

                        // mark as UI component
                        childComponent.isUI = 1;
                    });
                };

                if (scope) {
                    invalidateView();
                }
            },


            // ################################################################################################################
            // UI helpers
            
            invalidateView: invalidateView,


            Public: {
            }
        };
    })
});