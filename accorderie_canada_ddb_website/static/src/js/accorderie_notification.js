odoo.define('website.accorderie_notification', function (require) {
    "use strict";

    require('bus.BusService');
    let core = require('web.core');
    let session = require('web.session');
    let Widget = require('web.Widget');
    let QWeb = core.qweb;

    let AccorderieNotification = Widget.extend({
        init: function (parent) {
            this._super(parent);
            this._global_scope = angular.element($("[ng-app]")).scope();
        },
        willStart: function () {
            return this._loadQWebTemplate();
        },
        start: function () {
            // this.call('bus_service', 'addChannel', "accorderie.notification.favorite");
            // TODO a bug can occur if the scope not exist or dbname is not sync fast, block in willStart with angular watch
            this._canal_membre_update = JSON.stringify([this._global_scope.global.dbname, "accorderie.membre", this._global_scope.personal.id]);
            console.warn(this._canal_membre_update);
            this.call('bus_service', 'addChannel', this._canal_membre_update);
            this.call('bus_service', 'startPolling');
            this.call('bus_service', 'onNotification', this, this._onNotification);
            return this._super();
        },
        /**
         * @private
         */
        _loadQWebTemplate: function () {
            let xml_files = [];
            // This is not useful, only need to return an empty apply
            let defs = _.map(xml_files, function (tmpl) {
                return session.rpc('/web/proxy/load', {path: tmpl}).then(function (xml) {
                    QWeb.add_template(xml);
                });
            });
            return $.when.apply($, defs);
        },
        /**
         * @private
         * @param {Array[]} notifications
         */
        _onNotification: function (notifications) {
            let self = this;
            let has_update = false;
            // Recreate it solves a strange bug
            let canal_membre_update = JSON.stringify([this._global_scope.global.dbname, "accorderie.membre", this._global_scope.personal.id]);
            console.debug(notifications);
            _.each(notifications, function (notification) {
                let channel = notification[0];
                let message = notification[1];
                if (channel === canal_membre_update && !_.isEmpty(message)) {
                    let data = message.data;
                    for (const [key, value] of Object.entries(data)) {
                        if (key === "membre_favoris_ids") {
                            console.debug("action to do " + String(value));
                            if (value[0] === 4) {
                                self._global_scope.personal.dct_membre_favoris[value[1]].is_favorite = true;
                                has_update = true;
                            } else {
                                self._global_scope.personal.dct_membre_favoris[value[1]].is_favorite = false;
                                has_update = true;
                            }
                        }
                    }
                }
            });

            if (has_update) {
                this._global_scope.$digest();
            }
        },
    });

    return {
        AccorderieNotification: AccorderieNotification,
    };

});
