odoo.define('website.accorderie_canada_ddb.navbar_tabs.instance', function (require) {
    'use strict';

    require('web_editor.ready');
    let PublierForm = require('website.accorderie_canada_ddb.navbar_tabs');

    let $nav = $('.dropdown-nav');
    if (!$nav.length) {
        return null;
    }

    let instance = new PublierForm();
    return instance.appendTo($nav).then(function () {
        return instance;
    });
});

//==============================================================================

odoo.define("website.accorderie_canada_ddb.navbar_tabs", function (require) {

    let ajax = require('web.ajax');
    let Widget = require('web.Widget');

    // Catch registration form event, because of JS for attendee details
    let PublierForm = Widget.extend({
        start: function () {
            let self = this;
            this._super.apply(this.arguments).then(function () {
                $('#BtnTabOffres')
                    .off('click')
                    .click(function (ev) {
                        self.on_click(ev);
                        self.showTab("tabOffres");
                    });
            });
            this._super.apply(this.arguments).then(function () {
                $('#BtnTabDemandes')
                    .off('click')
                    .click(function (ev) {
                        self.on_click(ev);
                        self.showTab("tabDemandes");
                    });
            });
            this._super.apply(this.arguments).then(function () {
                $('#BtnTabMembres')
                    .off('click')
                    .click(function (ev) {
                        self.on_click(ev);
                        self.showTab("tabMembres");
                    });
            });
            this._super.apply(this.arguments).then(function () {
                $('#BtnTabMessages')
                    .off('click')
                    .click(function (ev) {
                        self.on_click(ev);
                        self.showTab("tabMessages");
                    });
            });
            this._super.apply(this.arguments).then(function () {
                $('#BtnTabNotifications')
                    .off('click')
                    .click(function (ev) {
                        self.on_click(ev);
                        self.showTab("tabNotifications");
                    });
            });
        },
        on_click: function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
        },

        showTab: function (tab) {
            // let x = $('#' + tab).siblings();
            //
            // for (let i = 0; i < x.length; i++) {
            //     x[i].style.display = "none";
            // }
            let $scope = angular.element($("[ng-app]")).scope();
            $scope.navigation.navbar_tab.name = tab;
            console.debug(tab);
            // document.getElementById(tab).style.display = "block";
        },
    });

    return PublierForm;
});
