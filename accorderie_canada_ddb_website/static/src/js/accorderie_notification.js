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
        },
        willStart: function () {
            return this._loadQWebTemplate();
        },
        start: function () {
            this.call('bus_service', 'addChannel', "accorderie.notification.favorite");
            // TODO a bug can occur if the scope not exist or dbname is not sync fast, block in willStart with angular watch
            // this._canal_membre_update = JSON.stringify([this._global_scope.global.dbname, "accorderie.membre", this._global_scope.personal.id]);
            // console.warn(this._canal_membre_update);
            // this.call('bus_service', 'addChannel', this._canal_membre_update);
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
            let $scope = angular.element($("[ng-app]")).scope();
            // Recreate it solves a strange bug
            let canal_membre_update = JSON.stringify([$scope.global.dbname, "accorderie.membre", $scope.personal.id]);
            let canal_offre_service_update = JSON.stringify([$scope.global.dbname, "accorderie.offre.service", $scope.personal.id]);
            let canal_demande_service_update = JSON.stringify([$scope.global.dbname, "accorderie.demande.service", $scope.personal.id]);
            console.debug(notifications);
            // Cannot use each, because need to update scope at the end for optimisation
            // _.each(notifications, function (notification) {
            for (let i = 0; i < notifications.length; i++) {
                let notification = notifications[i];
                // let channel = notification[0];
                let message = notification[1];
                let channel = message.canal;
                if (_.isEmpty(message)) {
                    continue;
                }
                // TODO can we merge it together?
                if (channel === canal_membre_update) {
                    let data = message.data;
                    for (const [key, value] of Object.entries(data)) {
                        if (key === "membre_favoris_ids") {
                            // Modified field is in update value
                            let field_id = value[0][1];
                            let membre = $scope.personal.dct_membre_favoris[field_id];
                            let membre2 = $scope.dct_membre[field_id];
                            // console.debug("action to do " + String(value));
                            if (value[0][0] === 4) {
                                if (!_.isUndefined(membre)) {
                                    membre.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(membre2)) {
                                    membre2.is_favorite = true;
                                    has_update = true;
                                }
                            } else if (value[0][0] === 3) {
                                if (!_.isUndefined(membre)) {
                                    membre.is_favorite = false;
                                    has_update = true;
                                }
                                if (!_.isUndefined(membre2)) {
                                    membre2.is_favorite = false;
                                    has_update = true;
                                }
                            } else {
                                console.error("Not support value '" + value + "' from membre_favoris_ids channel '" + channel + "' model 'accorderie.membre'");
                            }
                        }
                    }
                } else if (channel === canal_offre_service_update) {
                    let data = message.data;
                    let field_id = message.field_id;
                    // TODO Loop is not necessary, get the key directly
                    for (const [key, value] of Object.entries(data)) {
                        if (key === "membre_favoris_ids") {
                            let offreService = $scope.personal.dct_offre_service_favoris[field_id];
                            let offreService2 = $scope.personal.dct_offre_service[field_id];
                            let offreService3 = $scope.membre_info.dct_offre_service_favoris;
                            if (!_.isUndefined(offreService3)) {
                                offreService3 = offreService3[field_id];
                            }
                            let offreService4 = $scope.membre_info.dct_offre_service;
                            if (!_.isUndefined(offreService4)) {
                                offreService4 = offreService4[field_id];
                            }
                            let offreService5 = $scope.offre_service_info.id === field_id ? $scope.offre_service_info : undefined;
                            // console.debug("action to do " + String(value));
                            if (value[0][0] === 4) {
                                // let field_id = value[0][1];
                                if (_.isUndefined(offreService)) {
                                    offreService = $scope.getDatabaseInfo("accorderie.offre.service", field_id)
                                }
                                if (!_.isUndefined(offreService)) {
                                    offreService.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService2)) {
                                    offreService2.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService3)) {
                                    offreService3.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService4)) {
                                    offreService4.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService5)) {
                                    offreService5.is_favorite = true;
                                    has_update = true;
                                }
                            } else if (value[0][0] === 3) {
                                if (!_.isUndefined(offreService)) {
                                    offreService.is_favorite = false;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService2)) {
                                    offreService2.is_favorite = false;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService3)) {
                                    offreService3.is_favorite = false;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService4)) {
                                    offreService4.is_favorite = false;
                                    has_update = true;
                                }
                                if (!_.isUndefined(offreService5)) {
                                    offreService5.is_favorite = false;
                                    has_update = true;
                                }
                            } else {
                                console.error("Not support value '" + value + "' from membre_favoris_ids channel '" + channel + "' model 'accorderie.offre.service'");
                            }
                        }
                    }
                } else if (channel === canal_demande_service_update) {
                    let data = message.data;
                    let field_id = message.field_id;
                    for (const [key, value] of Object.entries(data)) {
                        if (key === "membre_favoris_ids") {
                            let demandeService = $scope.personal.dct_demande_service_favoris[field_id];
                            let demandeService2 = $scope.personal.dct_demande_service[field_id];
                            let demandeService3 = $scope.membre_info.dct_demande_service_favoris;
                            if (!_.isUndefined(demandeService3)) {
                                demandeService3 = demandeService3[field_id];
                            }
                            let demandeService4 = $scope.membre_info.dct_demande_service;
                            if (!_.isUndefined(demandeService4)) {
                                demandeService4 = demandeService4[field_id];
                            }
                            let demandeService5 = $scope.demande_service_info.id === field_id ? $scope.demande_service_info : undefined;
                            // console.debug("action to do " + String(value));
                            if (value[0][0] === 4) {
                                // let field_id = value[0][1];
                                if (_.isUndefined(demandeService)) {
                                    demandeService = $scope.getDatabaseInfo("accorderie.demande.service", field_id)
                                }
                                if (!_.isUndefined(demandeService)) {
                                    demandeService.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(demandeService2)) {
                                    demandeService2.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(demandeService3)) {
                                    demandeService3.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(demandeService4)) {
                                    demandeService4.is_favorite = true;
                                    has_update = true;
                                }
                                if (!_.isUndefined(demandeService5)) {
                                    demandeService5.is_favorite = true;
                                    has_update = true;
                                }
                            } else if (value[0][0] === 3) {
                                if (!_.isUndefined(demandeService)) {
                                    demandeService.is_favorite = false;
                                    has_update = true;
                                }
                                if (!_.isUndefined(demandeService2)) {
                                    demandeService2.is_favorite = false;
                                }
                                if (!_.isUndefined(demandeService3)) {
                                    demandeService3.is_favorite = false;
                                }
                                if (!_.isUndefined(demandeService4)) {
                                    demandeService4.is_favorite = false;
                                }
                                if (!_.isUndefined(demandeService5)) {
                                    demandeService5.is_favorite = false;
                                }
                            } else {
                                console.error("Not support value '" + value + "' from membre_favoris_ids channel '" + channel + "' model 'accorderie.demande.service'");
                            }
                        }
                    }
                }
            }
            // });

            if (has_update) {
                $scope.$digest();
            }
        },
    });

    return {
        AccorderieNotification: AccorderieNotification,
    };

});
