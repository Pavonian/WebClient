import address from './address/index';
import analytics from './analytics/index';
import attachments from './attachments/index';
import authentication from './authentication/index';
import autoresponder from './autoresponder/index';
import blackFriday from './blackFriday/index';
import bridge from './bridge/index';
import browserSupport from './browserSupport/index';
import bugReport from './bugReport/index';
import command from './command/index';
import commons from './commons/index';
import composer from './composer/index';
import conversation from './conversation/index';
import contact from './contact/index';
import core from './core/index';
import dashboard from './dashboard/index';
import dnd from './dnd/index';
import domains from './domains/index';
import elements from './elements/index';
import filter from './filter/index';
import formUtils from './formUtils/index';
import keys from './keys/index';
import labels from './labels/index';
import members from './members/index';
import message from './message/index';
import organization from './organization/index';
import outside from './outside/index';
import payment from './payment/index';
import search from './search/index';
import settings from './settings/index';
import sidebar from './sidebar/index';
import squire from './squire/index';
import ui from './ui/index';
import user from './user/index';
import utils from './utils/index';
import vpn from './vpn/index';
import wizard from './wizard/index';

import CONFIG from './config';
import constants from './constants';
import routes from './routes';

angular
    .module('proton', [
        'gettext',
        'as.sortable',
        'cgNotify',
        'ngCookies',
        'ngIcal',
        'ngMessages',
        'ngSanitize',
        'ngScrollbars',
        'pikaday',
        'ui.router',
        'ui.codemirror',
        'templates-app',
        address,
        analytics,
        attachments,
        authentication,
        autoresponder,
        blackFriday,
        bridge,
        browserSupport,
        bugReport,
        command,
        commons,
        composer,
        conversation,
        contact,
        core,
        dashboard,
        dnd,
        domains,
        elements,
        filter,
        formUtils,
        keys,
        labels,
        members,
        message,
        organization,
        outside,
        payment,
        search,
        settings,
        sidebar,
        squire,
        ui,
        user,
        utils,
        vpn,
        wizard,
        constants,
        routes
    ])
    .constant('CONFIG', CONFIG)
    .config((urlProvider, CONFIG, notificationProvider) => {
        urlProvider.setBaseUrl(CONFIG.apiUrl);
        notificationProvider.template('templates/notifications/base.tpl.html');
    })
    .run((
        $rootScope,
        $state,
        logoutManager, // Keep the logoutManager here to lunch it
        authentication,
        networkActivityTracker,
        CONSTANTS,
        tools
    ) => {
        FastClick.attach(document.body);

        // Manage responsive changes
        window.addEventListener('resize', _.debounce(tools.mobileResponsive, 50));
        window.addEventListener('orientationchange', tools.mobileResponsive);
        tools.mobileResponsive();

        $rootScope.showWelcome = true;

        // SVG Polyfill for IE11 @todo lazy load
        window.svg4everybody();

        // Set new relative time thresholds
        moment.relativeTimeThreshold('s', 59); // s seconds least number of seconds to be considered a minute
        moment.relativeTimeThreshold('m', 59); // m minutes least number of minutes to be considered an hour
        moment.relativeTimeThreshold('h', 23); // h hours   least number of hours to be considered a day

        $rootScope.networkActivity = networkActivityTracker;
    })

    .config(($httpProvider, CONFIG) => {
        // Http Intercpetor to check auth failures for xhr requests
        $httpProvider.interceptors.push('authHttpResponseInterceptor');
        $httpProvider.interceptors.push('formatResponseInterceptor');
        $httpProvider.defaults.headers.common['x-pm-appversion'] = 'Web_' + CONFIG.app_version;
        $httpProvider.defaults.headers.common['x-pm-apiversion'] = CONFIG.api_version;
        $httpProvider.defaults.headers.common.Accept = 'application/vnd.protonmail.v1+json';
        $httpProvider.defaults.withCredentials = true;

        // initialize get if not there
        if (angular.isUndefined($httpProvider.defaults.headers.get)) {
            $httpProvider.defaults.headers.get = {};
        }

        // disable IE ajax request caching (don't use If-Modified-Since)
        $httpProvider.defaults.headers.get['Cache-Control'] = 'no-cache';
        $httpProvider.defaults.headers.get.Pragma = 'no-cache';
    })
    .run(($rootScope, $location, $state, authentication, $log, networkActivityTracker, AppModel) => {
        $rootScope.$on('$stateChangeStart', (event, toState) => {
            networkActivityTracker.clear();

            const isLogin = toState.name === 'login';
            const isSub = toState.name === 'login.sub';
            const isUpgrade = toState.name === 'upgrade';
            const isSupport = toState.name.includes('support');
            const isAccount = toState.name === 'account';
            const isSignup = toState.name === 'signup' || toState.name === 'pre-invite';
            const isUnlock = toState.name === 'login.unlock';
            const isOutside = toState.name.includes('eo');
            const isReset = toState.name.includes('reset');
            const isPrinter = toState.name === 'printer';
            const isPgp = toState.name === 'pgp';

            if (isUnlock && $rootScope.isLoggedIn) {
                $log.debug('appjs:(isUnlock && $rootScope.isLoggedIn)');
                return;
            } else if ($rootScope.isLoggedIn && !$rootScope.isLocked && isUnlock) {
                // If already logged in and unlocked and on the unlock page: redirect to inbox
                $log.debug('appjs:($rootScope.isLoggedIn && !$rootScope.isLocked && isUnlock)');
                event.preventDefault();
                $state.go('secured.inbox');
                return;
            } else if (isLogin || isSub || isSupport || isAccount || isSignup || isOutside || isUpgrade || isReset || isPrinter || isPgp) {
                // if on the login, support, account, or signup pages dont require authentication
                $log.debug(
                    'appjs:(isLogin || isSub || isSupport || isAccount || isSignup || isOutside || isUpgrade || isReset || isPrinter || isPgp)'
                );
                return; // no need to redirect
            }

            // now, redirect only not authenticated
            if (!authentication.isLoggedIn()) {
                event.preventDefault(); // stop current execution
                $state.go('login'); // go to login
            }
        });

        $rootScope.$on('$stateChangeSuccess', () => {
            // Hide requestTimeout
            AppModel.set('requestTimeout', false);

            // Hide all the tooltip
            $('.tooltip')
                .not(this)
                .hide();

            // Close navbar on mobile
            $('.navbar-toggle').click();
            $('#loading_pm, #pm_slow, #pm_slow2').remove();
        });
    })

    //
    // Rejection manager
    //

    .run(($rootScope, $state) => {
        $rootScope.$on('$stateChangeError', (event, current, previous, rejection, ...arg) => {
            console.error('stateChangeError', event, current, previous, rejection, arg);
            $state.go('support.message');
        });
    })

    //
    // Console messages
    //

    .run((consoleMessage) => consoleMessage())

    .config(($logProvider, $compileProvider, $qProvider, CONFIG) => {
        const debugInfo = CONFIG.debug || false;
        $logProvider.debugEnabled(debugInfo);
        $compileProvider.debugInfoEnabled(debugInfo);
        $qProvider.errorOnUnhandledRejections(debugInfo);
    })
    .config((CONFIG, CONSTANTS) => {
        // Bind env on deploy
        const env = 'NODE_ENV'; // default localhost
        const localhost = 'NODE@ENV'.replace('@', '_'); // prevent auto replace
        const REGEXP_HOST = /proton(mail|vpn)\.(com|blue|host)$/;

        // Check if we can run the application
        if (env !== localhost && !REGEXP_HOST.test(window.location.host)) {
            const img = new Image();
            img.width = 0;
            img.height = 0;
            img.src = CONSTANTS.URL_INFO;
            document.body.appendChild(img);
        }
    });
