odoo.define('website.accorderie_canada_ddb.participer.instance', function (require) {
    'use strict';

    require('web_editor.ready');
    let ParticiperForm = require('website.accorderie_canada_ddb.participer');

    let $form = $('#participer_form');
    if (_.isEmpty($form)) {
        return null;
    }

    let instance = new ParticiperForm();
    return instance.appendTo($form).then(function () {
        return instance;
    });
});

odoo.define("accorderie.website.date_and_time", function (require) {
    "use strict";

    require("web.dom_ready");
    let ajax = require("web.ajax");
    let base = require("web_editor.base");
    let context = require("web_editor.context");

    function load_locale() {
        let url = "/web/webclient/locale/" + context.get().lang || "en_US";
        return ajax.loadJS(url);
    }

    $.when(base.ready(), load_locale());
});

class DefaultDict {
    constructor(defaultInit) {
        return new Proxy({}, {
            get: (target, name) => name in target ?
                target[name] :
                (target[name] = typeof defaultInit === 'function' ?
                    new defaultInit().valueOf() :
                    defaultInit)
        })
    }
}

// function compileAngularElement(elSelector) {
//
//     var elSelector = (typeof elSelector == 'string') ? elSelector : null;
//     // The new element to be added
//     if (elSelector != null) {
//         var $div = $(elSelector);
//
//         // The parent of the new element
//         var $target = $("[ng-app]");
//
//         angular.element($target).injector().invoke(['$compile', function ($compile) {
//             var $scope = angular.element($target).scope();
//             $compile($div)($scope);
//             // Finally, refresh the watch expressions in the new element
//             $scope.$apply();
//         }]);
//     }
//
// }

//==============================================================================

odoo.define("website.accorderie_canada_ddb.participer", function (require) {
    'use strict';

    // For compile angularjs
    // let sAnimation = require('website.content.snippets.animation');
    // require('website.content.menu');

    let ajax = require('web.ajax');
    let core = require('web.core');
    let session = require('web.session');
    let Widget = require('web.Widget');
    let _t = core._t;

    const INIT_STATE = "init";
    const PARAM_STATE_NAME = "state";

    let app = angular.module('AccorderieApp', []);
    app.filter('unsafe', function ($sce) {
        // This allows html generation in view
        return $sce.trustAsHtml;
    });
    app.filter('lengthKeys', function () {
        return function ($sce) {
            return Object.keys($sce).length;
        }
    });
    app.filter('toTitleCase', function () {
        return function ($sce) {
            return $sce.replace(
                /\w\S*/g,
                function (txt) {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                }
            );
        }
    });

    // sAnimation.registry.affixMenu.include({
    //     /**
    //      * @override
    //      */
    //     start: function () {
    //         var def = this._super.apply(this, arguments);
    //         return def;
    //     },
    //
    //     //--------------------------------------------------------------------------
    //     // Handlers
    //     //--------------------------------------------------------------------------
    //
    //     /**
    //      * @override
    //      */
    //     _onWindowUpdate: function () {
    //         this._super.apply(this, arguments);
    //         if (this.$headerClone) {
    //             // this.$headerClone.each(function () {
    //             // this.$headers.each(function () {
    //             //     let content = $(this);
    //             var content = this.$headerClone;
    //
    //             var content = $("#patate");
    //             var $target = $("[ng-app]");
    //
    //             angular.element($target).injector().invoke(['$compile', function ($compile) {
    //                 var $scope = angular.element($target).scope();
    //
    //                 // $scope.personal.actual_bank_hours += 1;
    //                 // $scope.update_personal_data();
    //
    //                 // let test = $("{{personal.actual_bank_hours}}")
    //                 // $compile(test)($scope);
    //
    //                 $compile(content)($scope);
    //                 // Finally, refresh the watch expressions in the new element
    //                 $scope.$apply();
    //                 console.debug(content);
    //                 // console.debug(test);
    //             }]);
    //
    //         }
    //     },
    // })

    app.controller('MainController', ['$scope', '$location', function ($scope, $location) {
        $scope._ = _;
        $scope.global = {
            dbname: undefined,
            database: {},
        }
        $scope.personal = {
            // static
            id: undefined,
            is_favorite: false,
            full_name: "-",
            actual_bank_hours: 0,
            actual_month_bank_hours: 0,
            introduction: "",
            diff_humain_creation_membre: "",
            antecedent_judiciaire_verifier: false,
            mon_accorderie: {
                name: "-",
                id: 0,
            },
            dct_offre_service: {},
            dct_demande_service: {},
            dct_offre_service_favoris: {},
            dct_demande_service_favoris: {},
            dct_membre_favoris: {},
            dct_echange: {},

            // calculate
            actual_bank_sign: true,
            actual_bank_time_diff: "00:00",
            actual_bank_time_human: "+ 0 heure",
            actual_bank_time_human_short: "0h",
            actual_bank_time_human_simplify: "0 heure",
            actual_month_bank_time_human_short: "0h",
            estPersonnel: true,
            dct_echange_mensuel: {},

            // is_in_offre_service_favoris: function () {
            //     return  $scope.offre_service_info.id in Objects.keys(offre_service_info);
            // },
            // is_in_demande_service_favoris: function () {
            //     return  $scope.demande_service_info.id in Objects.keys(demande_service_info);
            // },
        }
        $scope.membre_info = {}
        $scope.dct_membre = {}
        $scope.contact_info = {}
        $scope.offre_service_info = {}
        // $scope.lst_offre_service_id = []
        $scope.dct_offre_service_info = {}
        $scope.demande_service_info = {}
        $scope.echange_service_info = {}
        $scope.nb_offre_service = 0;
        $scope.generic_offre_service = {
            lst_offre_service_id: [],
            enable_href: true,
            enable_favorite: true,
        }

        $scope.add_to_my_favorite_field_id = function (model, record_id) {
            ajax.rpc("/accorderie/submit/my_favorite", {"model": model, "id_record": record_id}).then(function (data) {
                console.debug("AJAX receive add_to_my_favorite");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'add_to_my_favorite' data";
                    console.error($scope.error);
                } else {
                    // $scope.nb_offre_service = data.nb_offre_service;
                    // record_obj.is_favorite = data.is_favorite;
                    // if (model === "accorderie.membre" && data.is_favorite) {
                    //     // TODO validate not already in list
                    //     $scope.personal.lst_membre_favoris.push(record_obj);
                    // }
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.add_to_my_favorite = function (model, record_obj) {
            let id_record = record_obj.id;
            ajax.rpc("/accorderie/submit/my_favorite", {"model": model, "id_record": id_record}).then(function (data) {
                console.debug("AJAX receive add_to_my_favorite");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'add_to_my_favorite' data";
                    console.error($scope.error);
                } else {
                    // $scope.nb_offre_service = data.nb_offre_service;
                    record_obj.is_favorite = data.is_favorite;
                    // if (model === "accorderie.membre" && data.is_favorite) {
                    //     // TODO validate not already in list
                    //     $scope.personal.lst_membre_favoris.push(record_obj);
                    // }
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.update_db_my_personal_info = function () {
            ajax.rpc("/accorderie_canada_ddb/get_personal_information", {}).then(function (data) {
                console.debug("AJAX receive get_personal_information");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'get_personal_information' data";
                    console.error($scope.error);
                } else {
                    $scope.error = "";
                    $scope.global = data.global;
                    $scope.personal = data.personal;
                    $scope.update_personal_data();
                    console.debug($scope.personal);

                    $scope.update_db_list_membre($scope.personal.mon_accorderie.id);

                    // Special case, when need to get information of another member
                    let membre_id = $location.search()["membre_id"];
                    let membre_id_int = parseInt(membre_id);
                    if (window.location.pathname === "/monprofil/mapresentation" && !_.isUndefined(membre_id) && membre_id_int !== $scope.personal.id) {
                        // Force switch to another user
                        $scope.update_membre_info(membre_id_int, "membre_info");
                    } else {
                        console.debug("Setup membre personal.");
                        $scope.personal.estPersonnel = true;
                        $scope.membre_info = $scope.personal;
                    }
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.$watch('membre_info', function (newValue, oldValue, scope) {
            console.debug("mathben membre info watch");
        });

        $scope.update_db_my_personal_info();

        $scope.update_membre_info = function (membre_id, scope_var_name_to_update) {
            ajax.rpc("/accorderie_canada_ddb/get_membre_information/" + membre_id).then(function (data) {
                console.debug("AJAX receive get_membre_information");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'get_membre_information' data";
                    console.error($scope.error);
                } else {
                    $scope.error = "";
                    data.membre_info.estPersonnel = false;
                    data.membre_info.show_date_creation = moment(data.date_creation).format("MMMM YYYY");
                    data.membre_info.show_bank_max_service_offert = $scope.convertNumToTime(data.membre_info.bank_max_service_offert, 4);
                    $scope[scope_var_name_to_update] = data.membre_info;
                    console.debug(data.membre_info);
                }
                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.update_db_nb_offre_service = function () {
            ajax.rpc("/accorderie_canada_ddb/get_info/nb_offre_service", {}).then(function (data) {
                console.debug("AJAX receive get_nb_offre_service");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty 'get_nb_offre_service' data";
                    console.error($scope.error);
                } else {
                    $scope.nb_offre_service = data.nb_offre_service;
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.load_page_offre_demande_echange_service = function () {
            let key = "/accorderie_canada_ddb/accorderie_offre_service/";
            if (window.location.pathname.indexOf(key) === 0) {
                // params can be 6?debug=1 or 6#!?str=3, need to extract first int
                let params = window.location.pathname.substring(key.length);
                params = parseInt(params, 10);
                if (!Number.isNaN(params)) {
                    ajax.rpc("/accorderie_canada_ddb/get_info/get_offre_service/" + params).then(function (data) {
                        console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_offre_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_offre_service' data";
                            console.error($scope.error);
                        } else {
                            $scope.offre_service_info = data;
                            $scope.update_membre_info($scope.offre_service_info.membre_id, "contact_info");
                        }

                        // Process all the angularjs watchers
                        $scope.$digest();
                    })
                }
            }
            key = "/accorderie_canada_ddb/accorderie_demande_service/";
            if (window.location.pathname.indexOf(key) === 0) {
                // params can be 6?debug=1 or 6#!?str=3, need to extract first int
                let params = window.location.pathname.substring(key.length);
                params = parseInt(params, 10);
                if (!Number.isNaN(params)) {
                    ajax.rpc("/accorderie_canada_ddb/get_info/get_demande_service/" + params).then(function (data) {
                        console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_demande_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_demande_service' data";
                            console.error($scope.error);
                        } else {
                            $scope.demande_service_info = data;
                            $scope.update_membre_info($scope.demande_service_info.membre_id, "contact_info");
                        }

                        // Process all the angularjs watchers
                        $scope.$digest();
                    })
                }
            }

            let echange_id = $location.search()["echange"];
            if (!_.isEmpty(echange_id)) {
                echange_id = parseInt(echange_id, 10);
                if (!Number.isNaN(echange_id)) {
                    ajax.rpc("/accorderie_canada_ddb/get_info/get_echange_service/" + echange_id).then(function (data) {
                        console.debug("AJAX receive /accorderie_canada_ddb/get_info/get_echange_service");
                        if (data.error || !_.isUndefined(data.error)) {
                            $scope.error = data.error;
                            console.error($scope.error);
                        } else if (_.isEmpty(data)) {
                            $scope.error = "Empty '/accorderie_canada_ddb/get_info/get_echange_service' data";
                            console.error($scope.error);
                        } else {
                            $scope.echange_service_info = data;

                            let sign = data.estAcheteur ? -1 : 1;
                            $scope.echange_service_info.sign = sign;
                            $scope.echange_service_info.show_duree_estime = $scope.convertNumToTime(data.duree_estime * sign, 7);
                            $scope.echange_service_info.show_duree = $scope.convertNumToTime(data.duree * sign, 7);
                            $scope.echange_service_info.show_duree_trajet_estime = $scope.convertNumToTime(data.duree_trajet_estime * sign, 7);
                            $scope.echange_service_info.show_duree_trajet = $scope.convertNumToTime(data.duree_trajet * sign, 7);
                            $scope.echange_service_info.show_duree_estime_pos = $scope.convertNumToTime(data.duree_estime, 8);
                            $scope.echange_service_info.show_duree_pos = $scope.convertNumToTime(data.duree, 8);
                            $scope.echange_service_info.show_duree_trajet_estime_pos = $scope.convertNumToTime(data.duree_trajet_estime, 8);
                            $scope.echange_service_info.show_duree_trajet_pos = $scope.convertNumToTime(data.duree_trajet, 8);

                            $scope.echange_service_info.show_total_dure_estime_pos = $scope.convertNumToTime(data.duree_estime + data.duree_trajet_estime, 8);
                            $scope.echange_service_info.show_total_dure_pos = $scope.convertNumToTime(data.duree + data.duree_trajet, 8);

                            $scope.echange_service_info.show_date = moment(data.date).format("dddd D MMMM");
                            $scope.echange_service_info.show_start_time = moment(data.date).format("H") + "h" + moment(data.date).format("mm");
                            $scope.echange_service_info.show_end_time = moment(data.end_date).format("H") + "h" + moment(data.end_date).format("mm");

                            $scope.update_membre_info($scope.echange_service_info.membre_id, "contact_info");

                            console.debug($scope.echange_service_info);
                        }

                        // Process all the angularjs watchers
                        $scope.$digest();
                    })
                }
            }

        }

        $scope.load_page_offre_demande_echange_service();

        $scope.update_db_list_membre = function (accorderie_id) {
            ajax.rpc("/accorderie_canada_ddb/get_info/list_membre", {"accorderie_id": accorderie_id}).then(function (data) {
                console.debug("AJAX receive /accorderie_canada_ddb/get_info/list_membre");
                if (data.error || !_.isUndefined(data.error)) {
                    $scope.error = data.error;
                    console.error($scope.error);
                } else if (_.isEmpty(data)) {
                    $scope.error = "Empty '/accorderie_canada_ddb/get_info/list_membre' data";
                    console.error($scope.error);
                } else {
                    console.debug(data.dct_membre);
                    $scope.dct_membre = data.dct_membre;
                }

                // Process all the angularjs watchers
                $scope.$digest();
            })
        }

        $scope.update_db_nb_offre_service();

        $scope.getDatabaseInfo = function (model, field_id) {
            // TODO compete this, suppose to update database value and use cache
            console.warn("Not supported get database info");
            console.debug(model);
            console.debug(field_id);
        }

        // $scope.forceRefreshAngularJS = function () {
        //     // console.debug("Force refresh AngularJS");
        //     // $scope.$digest();
        //     compileAngularElement(".o_affix_enabled");
        // }

        $scope.convertNumToTime = function (number, format = 0) {
            // format 0 : 1.0 -> 1:00, 1.75 -> 1:45, -.75 -> -0:45
            // format 1 : 1.0 -> +1:00, 1.75 -> +1:45, -.75 -> -0:45
            // format 2 : 1.0 -> + 1:00, 1.75 -> + 1:45, -.75 -> - 0:45
            // format 3 : 1.0 -> + 1h, 1.75 -> + 1h45, -.75 -> - 0h45
            // format 4 : 1.0 -> 1h, 1.75 -> 1h45, -.75 -> -0h45
            // format 5 : 2.0 -> + 2 heures, 1.75 -> + 1 heure 45, -.75 -> - 0 heure 45
            // format 6 : 2.0 -> 2 heures, 1.75 -> 1 heure 45, -.75 -> - 0 heure 45
            // format 7 : 1.0 -> + 1h00, 1.75 -> + 1h45, -.75 -> - 0h45
            // format 8 : 1.0 -> 1h00, 1.75 -> + 1h45, -.75 -> - 0h45

            if (format > 8 || format < 0) {
                format = 0;
            }

            // Check sign of given number
            let sign = (number >= 0) ? 1 : -1;

            // Set positive value of number of sign negative
            number = number * sign;

            // Separate the int from the decimal part
            let hour = Math.floor(number);
            let decPart = number - hour;

            let min = 1 / 60;
            // Round to nearest minute
            decPart = min * Math.round(decPart / min);

            let minute = Math.floor(decPart * 60) + '';

            // Add padding if need
            if (minute.length < 2) {
                minute = '0' + minute;
            }

            // Add Sign in final result
            if (format === 0) {
                sign = sign === 1 ? '' : '-';
            } else {
                sign = sign === 1 ? '+' : '-';
            }

            // Concat hours and minutes
            let newTime;
            if (format === 0 || format === 1) {
                newTime = sign + hour + ':' + minute;
            } else if (format === 2) {
                newTime = sign + ' ' + hour + ':' + minute;
            } else if (format === 3 || format === 4 || format === 7 || format === 8) {
                if (minute > 0 || format === 7 || format === 8) {
                    if ((format === 4 || format === 8) && sign === "+") {
                        newTime = hour + 'h' + minute;
                    } else {
                        newTime = sign + ' ' + hour + 'h' + minute;
                    }
                } else {
                    if (format === 4 && sign === "+") {
                        newTime = hour + 'h';
                    } else {
                        newTime = sign + ' ' + hour + 'h';
                    }
                }
            } else if (format === 5 || format === 6) {
                let hour_str = _t("heure");
                if (hour > 1) {
                    hour_str += 's';
                }
                if (minute > 0) {
                    if (format === 6 && sign === "+") {
                        newTime = hour + ' ' + hour_str + ' ' + minute;
                    } else {
                        newTime = sign + ' ' + hour + ' ' + hour_str + ' ' + minute;
                    }
                } else {
                    if (format === 6 && sign === "+") {
                        newTime = hour + ' ' + hour_str;
                    } else {
                        newTime = sign + ' ' + hour + ' ' + hour_str;
                    }
                }
            }

            return newTime;
        }

        $scope.update_personal_data = function () {
            // Time management
            // + 15:30 // format 2
            // + 15h // format 3
            // 15h // format 4
            // + 15 heure 30 // format 5
            // 15 heure 30 // format 6
            let time_bank = $scope.personal.actual_bank_hours;
            $scope.personal.actual_bank_sign = (time_bank >= 0);
            $scope.personal.actual_bank_time_diff = $scope.convertNumToTime(time_bank, 2);
            $scope.personal.actual_bank_time_human_short = $scope.convertNumToTime(time_bank, 3);
            $scope.personal.actual_bank_time_human = $scope.convertNumToTime(time_bank, 5);
            $scope.personal.actual_bank_time_human_simplify = $scope.convertNumToTime(time_bank, 6);

            $scope.personal.actual_month_bank_time_human_short = $scope.convertNumToTime($scope.personal.actual_month_bank_hours, 4);

            let month_key = moment(Date.now()).format("MMMM YYYY");
            $scope.personal.dct_echange_mensuel = {};
            $scope.personal.dct_echange_mensuel[month_key] = {"lst_echange": [], "actualMonth": true};

            // Order list by month and year
            for (const [key, value] of Object.entries($scope.personal.dct_echange)) {
                let inner_obj;
                let month_key = moment(value.date).format("MMMM YYYY");
                if ($scope.personal.dct_echange_mensuel.hasOwnProperty(month_key)) {
                    inner_obj = $scope.personal.dct_echange_mensuel[month_key];
                } else {
                    inner_obj = {"lst_echange": [], "actualMonth": false};
                    $scope.personal.dct_echange_mensuel[month_key] = inner_obj;
                }
                value.show_date = moment(value.date).format("dddd D MMMM");
                value.show_start_time = moment(value.date).format("H") + "h" + moment(value.date).format("mm");
                value.show_end_time = moment(value.end_date).format("H") + "h" + moment(value.end_date).format("mm");

                let sign = value.estAcheteur ? -1 : 1;
                value.show_duree_estime = $scope.convertNumToTime(value.duree_estime * sign, 7);
                value.show_duree = $scope.convertNumToTime(value.duree * sign, 7);
                value.sign = sign;

                inner_obj.lst_echange.push(value);
            }
            for (const [key, value] of Object.entries($scope.personal.dct_echange_mensuel)) {
                // TODO detect if its this month
                value.sum_time = 0;
                for (let i = 0; i < value.lst_echange.length; i++) {
                    let i_echange = value.lst_echange[i];
                    let duration = i_echange.transaction_valide ? i_echange.duree : i_echange.duree_estime;
                    if (i_echange.estAcheteur) {
                        value.sum_time -= duration;
                    } else {
                        value.sum_time += duration;
                    }
                }
                value.show_sum_time = $scope.convertNumToTime(value.sum_time, 3);
            }
            console.debug($scope.personal.dct_echange_mensuel);
        }

        $scope.echange_click_redirect = function (echange) {
            // TODO no need this, use instead <a href and not ng-click
            window.location.href = '/monactivite/echange#!?echange=' + echange.id;
        }
    }])

    app.controller('OffreDemandeServiceController', ['$scope', '$location', function ($scope) {

    }])

    async function requestSpecialURL($scope, state, new_url) {
        let value = await ajax.rpc(new_url, {}).then(function (data) {
            console.debug("AJAX receive " + new_url);
            console.debug(data);

            if (data.error) {
                $scope.error = data.error;
            } else if (_.isEmpty(data)) {
                $scope.error = "Empty data - " + new_url;
            } else {
                return data.data;
            }
        });

        console.debug(value);
        // Synchronise database
        $scope.data[state.data_name] = value[state.data_name];
        state.data = value[state.data_name];
        $scope._update_state(state)
        // Process all the angularjs watchers and scope, need it for $location.search()
        $scope.$apply();
    }

    app.controller('ParticiperController', ['$scope', '$location', function ($scope, $location) {
        $scope._ = _;
        $scope.has_init = false;
        $scope.error = "";
        $scope.workflow = {};
        $scope.data = {};
        $scope.data_inner = {};
        $scope.state = {
            id: undefined,
            message: "",
            type: "",
            list: undefined,
            list_is_first_position: undefined,
            disable_question: false,
            next_id: undefined,
            next_id_data: undefined,
            show_breadcrumb: false,
            data: undefined,
            data_name: undefined,
            model_field_depend: undefined,
            data_url_field: undefined,
            data_update_url: undefined,
            force_update_data: undefined,
            dct_data: undefined,
            data_inner: undefined,
            dct_data_inner: undefined,
            breadcrumb_value: undefined,
            breadcrumb_show_only_last_item: false,
            breadcrumb_field_value: undefined,
            submit_button_text: undefined,
            submit_response_title: undefined,
            submit_response_description: undefined,
            selected_value: undefined,
            selected_obj_value: undefined,
            selected_id: undefined,
            selected_tree_id: undefined,
            model_field_name_alias: undefined,
            model_field_name: undefined,
        };
        $scope.stack_breadcrumb_state = [];
        $scope.stack_breadcrumb_inner_state = [];
        $scope.actual_inner_state_name = "";
        $scope.in_multiple_inner_state = false; // true when a state need multiple interaction before show next
        $scope.is_inner_state = false; // true when a state need multiple interaction
        $scope.is_next_wait_value = false;
        $scope.lst_label_breadcrumb = [];
        $scope.autoCompleteJS = undefined;
        $scope.originChooseMemberPlaceholder = "Nom de la personne";
        $scope.chooseMemberPlaceholder = $scope.originChooseMemberPlaceholder;
        $scope.form = {};
        $scope.show_submit_modal = false;
        $scope.submitted_url = "";

        let url = "/accorderie_canada_ddb/get_participer_workflow_data/";
        ajax.rpc(url, {}).then(function (data) {
            console.debug("AJAX receive get_participer_workflow_data");
            if (data.error) {
                $scope.error = data.error;
            } else if (_.isEmpty(data)) {
                $scope.error = "Empty data - " + url;
            } else if (!data.workflow.hasOwnProperty(INIT_STATE)) {
                let str_error = "Missing state '" + INIT_STATE + "'.";
                console.error(str_error);
                $scope.error = str_error;
                $scope.workflow = {};
                $scope.state = {};
                $scope.data = {};
                $scope.data_inner = {};
            } else {
                // Init controller or call change_state_name(name)
                $scope.error = "";
                $scope.workflow = data.workflow;
                $scope.data = data.data;
                $scope.data_inner = data.data_inner;

                // Update relation workflow with data, use by click_inner_state
                for (const [key, value] of Object.entries($scope.workflow)) {
                    if (!_.isEmpty(value.data_name)) {
                        let data_name = value.data_name;

                        // data
                        let lst_data = $scope.data[data_name]
                        if (_.isUndefined(lst_data)) {
                            console.warn("Cannot find database '" + data_name + "'.");
                            $scope.workflow[key].data = undefined;
                            continue;
                        }
                        $scope.workflow[key].data = lst_data;
                        let dct_data = {};
                        for (let i = 0; i < lst_data.length; i++) {
                            dct_data[lst_data[i].id] = lst_data[i];
                        }
                        $scope.workflow[key].dct_data = dct_data;

                        // data_inner
                        let dct_data_inner = $scope.data_inner[data_name];
                        if (!_.isUndefined(dct_data_inner)) {
                            $scope.workflow[key].dct_data_inner = dct_data_inner;
                        }
                    }
                }

                // fill $scope.state with change_from_url
                $scope.change_from_url($location.search());
            }

            // Process all the angularjs watchers
            $scope.$digest();
        })

        $scope.init_controller = function (state = INIT_STATE) {
            // $scope.has_init = true;
            $scope.stack_breadcrumb_state = [];
            if (state !== INIT_STATE) {
                let lstState = state.split('.');

                let stateName = "";
                for (let i = 0; i < lstState.length - 1; i++) {
                    // Ignore last state, will be added after when load
                    if (_.isEmpty(stateName)) {
                        stateName = lstState[i];
                    } else {
                        stateName += "." + lstState[i];
                    }
                    console.log("Load state '" + stateName + "'");
                    let searchedState = $scope.workflow[stateName];
                    if (!_.isUndefined(searchedState)) {
                        $scope.stack_breadcrumb_state.push(searchedState);
                        $scope.reinit_state_model_field(searchedState);
                        $scope.fill_model_form_from_state(searchedState);
                    } else {
                        console.error("Missing state " + stateName);
                    }
                }
            }
            $scope.change_state_name(state);
        }

        // Date
        $scope.load_date = function () {
            let time = require("web.time");
            // TODO not optimal how this is called, need only to be call 1 time when page is loaded (with date)
            console.debug("Call load_date");
            _.each($(".input-group.date"), function (date_field) {
                let minDate =
                    $(date_field).data("mindate") || moment({y: 1900});
                if ($(date_field).attr("date-min-today")) {
                    minDate = moment();
                }
                let maxDate =
                    $(date_field).data("maxdate") || moment().add(200, "y");
                if ($(date_field).attr("date-max-year")) {
                    maxDate = moment().add(1, "y").add(1, "d");
                }
                let inline =
                    $(date_field).attr("inline-date") && true || false;
                let sideBySide =
                    $(date_field).attr("side-by-side") && true || false;
                let calendarWeeks =
                    $(date_field).attr("calendar-weeks") && true || false;
                let dateFormatTool =
                    $(date_field).attr("date-format-tool") || false;

                let options = {
                    minDate: minDate,
                    maxDate: maxDate,
                    calendarWeeks: calendarWeeks,
                    icons: {
                        time: "fa fa-clock-o",
                        date: "fa fa-calendar",
                        next: "fa fa-chevron-right",
                        previous: "fa fa-chevron-left",
                        up: "fa fa-chevron-up",
                        down: "fa fa-chevron-down",
                    },
                    locale: moment.locale(),
                    allowInputToggle: true,
                    inline: inline,
                    sideBySide: sideBySide,
                    keyBinds: null,
                };
                if ($(date_field).find(".o_website_form_date").length > 0 || dateFormatTool === "date") {
                    options.format = time.getLangDateFormat();
                } else if (
                    $(date_field).find(".o_website_form_clock").length > 0 || dateFormatTool === "clock"
                ) {
                    // options.format = time.getLangTimeFormat();
                    options.format = "HH:mm";
                    options.defaultDate = moment("00:00", "HH:mm");
                } else {
                    options.format = time.getLangDatetimeFormat();
                }
                $("#" + date_field.id).datetimepicker(options);
            });
        }

        // Member
        $scope._load_member = function (data) {
            $scope.autoCompleteJS = new autoComplete(
                {
                    selector: "#chooseMember",
                    // placeHolder: "Nom de la personne",
                    data: {
                        src: data,
                        keys: ["title"],
                        cache: true,
                    },
                    resultItem: {
                        element: (element, data) => {
                            element.innerHTML = `<img style="width:50px; aspect-ratio: 1;" src="${data.value.img}" class="nav_pic rounded-circle"/>${data.match}`
                        },
                        highlight: true,
                    },
                    events: {
                        input: {
                            selection: (event) => {
                                let value = event.detail.selection.value.title;
                                // let index = event.detail.selection.index;
                                $scope.autoCompleteJS.input.value = value;
                                // $scope.state.selected_id = data_list[index].id;
                                $scope.state.selected_id = event.detail.selection.value.id;
                                $scope.state.selected_value = value;
                                $scope.state.selected_obj_value = event.detail.selection.value;
                                $scope.autoCompleteJS.unInit();
                                // Process all the angularjs watchers
                                $scope.$digest();
                            },
                            focus() {
                                const inputValue = $scope.autoCompleteJS.input.value;
                                if (inputValue.length) {
                                    $scope.autoCompleteJS.start();
                                }
                            },
                            open() {
                                const position =
                                    $scope.autoCompleteJS.input.getBoundingClientRect().bottom + $scope.autoCompleteJS.list.getBoundingClientRect().height >
                                    (window.innerHeight || document.documentElement.clientHeight);

                                if (position) {
                                    $scope.autoCompleteJS.list.style.bottom = $scope.autoCompleteJS.input.offsetHeight + 8 + "px";
                                } else {
                                    $scope.autoCompleteJS.list.style.bottom = -$scope.autoCompleteJS.list.offsetHeight - 8 + "px";
                                }
                            },
                        }
                    },
                    resultsList: {
                        element: (list, data) => {
                            const message = document.createElement("div");
                            if (!data.results.length) {
                                // Create "No Results" message list element
                                message.setAttribute("class", "no_result");
                                // Add message text content
                                message.innerHTML = `<span>Aucun résultat trouvé pour &nbsp;"${data.query}"</span>`;
                            } else {
                                message.innerHTML = `<strong>${data.results.length}</strong>&nbsp; sur &nbsp;<strong>${data.matches.length}</strong> &nbsp; résultats`;
                            }
                            // Add message list element to the list
                            list.prepend(message);
                        },
                        maxResults: 10,
                        noResults: true,
                        highlight: {
                            render: true,
                        },
                    },
                    // searchEngine: "loose",
                    searchEngine: "strict",
                },
            );
        }

        $scope.load_member = function () {
            // if (!_.isEmpty($scope.state.selected_value)) {
            //     document.getElementById("chooseMember").value = $scope.state.selected_value;
            //     return;
            // }
            // Need this function to detect state type is choix_membre and finish render before instance autoComplete
            if (_.isUndefined($scope.autoCompleteJS) && $scope.state.type === 'choix_membre' && $scope.chooseMemberPlaceholder !== "En attente...") {
                $scope.chooseMemberPlaceholder = "En attente..."
                $scope.chooseMemberPlaceholder = $scope.originChooseMemberPlaceholder;

                // detect parameters
                let param_name;
                if (!_.isUndefined($scope.state.model_field_name_alias)) {
                    param_name = $scope.state.model_field_name_alias;
                } else if (!_.isUndefined($scope.state.model_field_name)) {
                    param_name = $scope.state.model_field_name;
                }

                // fill value if params
                if (!_.isUndefined(param_name)) {
                    let obj_selected_value = parseInt($location.search()[param_name]);
                    if (Number.isInteger(obj_selected_value)) {
                        let dct_data = $scope.state.dct_data[obj_selected_value];
                        if (!_.isUndefined(dct_data)) {
                            $scope.state.selected_id = obj_selected_value;
                            $scope.state.selected_obj_value = dct_data;
                            $scope.state.selected_value = dct_data.title;
                        } else {
                            $scope.error = `Cannot find data 'membre' of ${obj_selected_value}`;
                            console.error($scope.error);
                        }
                    }
                }

                if (!_.isEmpty($scope.state.selected_value)) {
                    // autoCompleteJS is unInit
                    // $scope.autoCompleteJS.input.value = $scope.state.selected_value;
                    document.getElementById("chooseMember").value = $scope.state.selected_value;
                } else {
                    $scope._load_member($scope.state.data);
                }
            }
        }

        $scope.remove_member = function () {
            $scope.state.selected_id = undefined;
            if (!_.isUndefined($scope.autoCompleteJS)) {
                $scope.autoCompleteJS.init();
            } else {
                $scope._load_member($scope.state.data);
            }
            $scope.autoCompleteJS.input.value = ""
            $scope.state.selected_value = ""
            $scope.state.selected_obj_value = undefined
        }

        // History
        $scope.$on('$locationChangeSuccess', function (object, newLocation, previousLocation) {
            // Check this is not call before ajax to fill $scope.workflow
            // TODO has_init is always false
            // TODO optimization, each time click next, $locationChangeSuccess and init_controller is recall
            // TODO optimization, all variable is destroy and reconstruct with many loop
            if (!_.isEmpty($scope.workflow) && !$scope.has_init) {
                // Try to detect loop
                if ($location.search().state !== $scope.state.id) {
                    // This break previous button
                    console.debug("Call change_from_url " + $location.search());
                    $scope.change_from_url($location.search());
                } else {
                    console.debug("Block looping update location change");
                }
            }
        });

        $scope.change_from_url = function (search_params) {
            let paramSelectedModel = search_params[PARAM_STATE_NAME];
            if (_.isEmpty(paramSelectedModel)) {
                $scope.init_controller();
            } else {
                $scope.init_controller(paramSelectedModel);
            }
        }

        // Form
        $scope.change_state_to_field_id = function (field_id_name) {
            // TODO find in workflow the state of update this field and call $scope.change_state_name()
            console.debug("Change state to field name '" + field_id_name + "'");
            console.debug($scope.form);
        }

        $scope.form_is_nouveau_except_pos = function () {
            return [
                'init.saa.offrir.nouveau.categorie_service.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
                'init.va.non.offert.nouveau_formulaire',
                'init.va.non.recu.choix.nouveau.formulaire'
            ].includes($scope.state.id);
        }

        $scope.form_is_nouveau = function () {
            return [
                'init.pos.individuelle.formulaire',
                'init.pds.individuelle.formulaire',
                'init.saa.offrir.nouveau.categorie_service.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
                'init.va.non.offert.nouveau_formulaire',
                'init.va.non.recu.choix.nouveau.formulaire'
            ].includes($scope.state.id);
        }

        $scope.form_is_offre_demande_service = function () {
            return [
                'init.pos.individuelle.formulaire',
                'init.pds.individuelle.formulaire',
            ].includes($scope.state.id);
        }

        $scope.form_is_service = function () {
            return [
                'init.saa.offrir.existant.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
                'init.va.oui.formulaire',
                'init.va.non.offert.nouveau_formulaire',
                'init.va.non.offert.existant_formulaire',
                'init.va.non.recu.choix.nouveau.formulaire',
                'init.va.non.recu.choix.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_is_service_to_modify = function () {
            return [
                'init.saa.recevoir.choix.existant.time.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_is_service_and_service_prevu = function () {
            // TODO this is a hack because calling {{load_date()}} in page not working some time
            $scope.load_date();
            return [
                'init.saa.offrir.nouveau.categorie_service.formulaire',
                'init.saa.offrir.existant.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
                'init.saa.recevoir.choix.existant.time.formulaire',
                'init.va.oui.formulaire',
                'init.va.non.offert.nouveau_formulaire',
                'init.va.non.offert.existant_formulaire',
                'init.va.non.recu.choix.nouveau.formulaire',
                'init.va.non.recu.choix.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_is_service_prevu = function () {
            return [
                'init.saa.offrir.nouveau.categorie_service.formulaire',
                'init.saa.recevoir.choix.existant.time.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_frais_trajet_distance = function () {
            return [
                'init.saa.offrir.nouveau.categorie_service.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
                'init.saa.recevoir.choix.existant.time.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_frais_trajet_prix = function () {
            return [
                'init.saa.offrir.existant.formulaire',
                'init.va.oui.formulaire',
                'init.va.non.offert.nouveau_formulaire',
                'init.va.non.offert.existant_formulaire',
                'init.va.non.recu.choix.nouveau.formulaire',
                'init.va.non.recu.choix.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_is_commentaire = function () {
            return [
                'init.saa.offrir.existant.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
                'init.va.oui.formulaire',
                'init.va.non.offert.nouveau_formulaire',
                'init.va.non.offert.existant_formulaire',
                'init.va.non.recu.choix.nouveau.formulaire',
                'init.va.non.recu.choix.formulaire'
            ].includes($scope.state.id)
        }

        $scope.form_frais_import_list_without_modify = function () {
            return [
                'init.saa.offrir.nouveau.categorie_service.formulaire',
                'init.saa.recevoir.choix.nouveau.formulaire',
            ].includes($scope.state.id)
        }

        $scope.parseFloatTime = function (value) {
            let factor = 1;
            if (value[0] === '-') {
                value = value.slice(1);
                factor = -1;
            }
            let float_time_pair = value.split(":");
            if (float_time_pair.length !== 2)
                return factor * parseFloat(value);
            let hours = $scope.parseInteger(float_time_pair[0]);
            let minutes = $scope.parseInteger(float_time_pair[1]);
            return factor * (hours + (minutes / 60));
        }

        $scope.parseInteger = function (value) {
            let parsed = $scope.parseNumber(value);
            // do not accept not numbers or float values
            if (isNaN(parsed) || parsed % 1 || parsed < -2147483648 || parsed > 2147483647) {
                throw new Error(_.str.sprintf(core._t("'%s' is not a correct integer"), value));
            }
            return parsed;
        }

        $scope.parseNumber = function (value) {
            if (core._t.database.parameters.thousands_sep) {
                let escapedSep = _.str.escapeRegExp(core._t.database.parameters.thousands_sep);
                value = value.replace(new RegExp(escapedSep, 'g'), '');
            }
            if (core._t.database.parameters.decimal_point) {
                value = value.replace(core._t.database.parameters.decimal_point, '.');
            }
            return Number(value);
        }

        $scope.show_sum_total_time_echange = function () {
            let sum_total = 0;
            if (!_.isUndefined($scope.form.time_realisation_service)) {
                sum_total += $scope.parseFloatTime($scope.form.time_realisation_service);
            }
            if (!_.isUndefined($scope.form.time_dure_trajet)) {
                sum_total += $scope.parseFloatTime($scope.form.time_dure_trajet);
            }
            if (!_.isUndefined($scope.form.time_service_estimated)) {
                sum_total += $scope.parseFloatTime($scope.form.time_service_estimated);
            }
            if (!_.isUndefined($scope.form.time_drive_estimated)) {
                sum_total += $scope.parseFloatTime($scope.form.time_drive_estimated);
            }
            return $scope.convertNumToTime(sum_total, 8);
        }

        $scope.submit_form = function () {
            $scope.form.state_id = $scope.state.id;
            let copiedForm = JSON.parse(JSON.stringify($scope.form));
            // Transform all date
            // if (!_.isUndefined(copiedForm.time_service)) {
            //     copiedForm.time_service = $scope.parseFloatTime(copiedForm.time_service);
            // }
            if (!_.isUndefined(copiedForm.time_realisation_service)) {
                copiedForm.time_realisation_service = $scope.parseFloatTime(copiedForm.time_realisation_service);
            }
            if (!_.isUndefined(copiedForm.time_dure_trajet)) {
                copiedForm.time_dure_trajet = $scope.parseFloatTime(copiedForm.time_dure_trajet);
            }
            if (!_.isUndefined(copiedForm.time_service_estimated)) {
                copiedForm.time_service_estimated = $scope.parseFloatTime(copiedForm.time_service_estimated);
            }
            if (!_.isUndefined(copiedForm.time_drive_estimated)) {
                copiedForm.time_drive_estimated = $scope.parseFloatTime(copiedForm.time_drive_estimated);
            }

            console.log(copiedForm);
            let url = "/accorderie/participer/form/submit"
            ajax.rpc(url, copiedForm).then(function (data) {
                    console.debug("AJAX receive submit_form");
                    console.debug(data);

                    if (data.error) {
                        $scope.error = data.error;
                    } else if (_.isEmpty(data)) {
                        $scope.error = "Empty data - " + "/accorderie/participer/form/submit";
                    } else {
                        $scope.show_submit_modal = true;
                        // TODO when after server url redirection or create logic condition
                        if ('init.pos.individuelle.formulaire' === $scope.state.id) {
                            $scope.submitted_url = `accorderie_canada_ddb/accorderie_offre_service/${data.offre_service_id}`;
                        } else if ('init.pds.individuelle.formulaire' === $scope.state.id) {
                            $scope.submitted_url = `accorderie_canada_ddb/accorderie_demande_service/${data.demande_service_id}`;
                        } else if (['init.saa.offrir.existant.formulaire', 'init.saa.recevoir.choix.existant.time.formulaire', 'init.saa.offrir.nouveau.categorie_service.formulaire', 'init.saa.recevoir.choix.nouveau.formulaire'].includes($scope.state.id)) {
                            $scope.submitted_url = `monactivite/echange#!?echange=${data.echange_service_id}`;
                        } else if (['init.va.non.offert.nouveau_formulaire', 'init.va.oui.formulaire', 'init.va.non.recu.choix.formulaire', 'init.va.non.offert.existant_formulaire', 'init.va.non.recu.choix.nouveau.formulaire'].includes($scope.state.id)) {
                            $scope.submitted_url = `monactivite/echange#!?echange=${data.echange_service_id}`;
                        } else {
                            $scope.submitted_url = "";
                        }
                    }

                    // Process all the angularjs watchers
                    $scope.$digest();
                }
            )
        }

        $scope.reinit_state_model_field = function (state) {
            // Fill state model from parameters
            if (!_.isUndefined(state.model_field_name)) {
                // if (!_.isUndefined(state.model_field_name) && (!_.isUndefined(state.selected_id))) {
                let value;
                if (!_.isUndefined(state.model_field_name_alias)) {
                    value = $location.search()[state.model_field_name_alias];
                } else if (!_.isUndefined(state.model_field_name)) {
                    value = $location.search()[state.model_field_name];
                }
                if (jQuery.isNumeric(value)) {
                    value = parseInt(value);
                }
                if (!_.isUndefined(value)) {
                    if (!_.isUndefined(state.dct_data_inner)) {
                        let data = state.dct_data_inner[value];
                        if (_.isUndefined(data)) {
                            $scope.error = `Erreur avec la base de données 'data_inner' de  ${value}`;
                            console.error($scope.error);
                        } else {
                            $scope.form[state.model_field_name] = {"id": data.id, "value": data.title};
                            state.selected_id = data.id;
                            state.selected_value = data.title;
                        }
                    } else if (!_.isUndefined(state.dct_data)) {
                        let data = state.dct_data[value];
                        if (_.isUndefined(data)) {
                            $scope.error = `Erreur avec la base de données 'data' de ${value}`;
                            console.error($scope.error);
                        } else {
                            $scope.form[state.model_field_name] = {"id": data.id, "value": data.title};
                            state.selected_id = data.id;
                            state.selected_value = data.title;
                        }
                    } else {
                        if (state.model_field_name.endsWith("_id")) {
                            // TODO this is bad, need to update database to get value
                            $scope.form[state.model_field_name] = {"id": value};
                        } else {
                            $scope.form[state.model_field_name] = value;
                        }
                        console.warn("Model field name '" + state.model_field_name + "' got this value : " + value);
                        state.selected_value = value;
                    }
                }
            }
        }

        $scope.fill_model_form_from_state = function (state) {
            // Fill models form
            if (!_.isUndefined(state.model_field_name) && (!_.isUndefined(state.selected_id))) {
                $scope.form[state.model_field_name] = {
                    "id": state.selected_id,
                    "value": state.selected_value
                }
            }
        }

        $scope.is_show_submit = function () {
            return !$scope.error && $scope.state.type === "form";
        }

        // State
        $scope.is_show_previous = function () {
            return $scope.stack_breadcrumb_state.length > 1
        }

        $scope.is_show_next = function () {
            return !$scope.in_multiple_inner_state && !$scope.error && !["form", "null"].includes($scope.state.type);
        }

        $scope.is_disable_next = function () {
            // disable when not next_id, or when next_id but not selected_value from inner_state
            if (_.isEmpty($scope.workflow)) {
                return true;
            }
            if (_.isEmpty($scope.state.next_id)) {
                return true;
            }
            return !!($scope.is_next_wait_value && _.isEmpty($scope.state.selected_value));
        }

        $scope.change_state_name = function (stateName) {
            // console.debug("call change_state_name : " + stateName);
            let state = $scope.workflow[stateName];
            $scope.update_state(state, "change_state_name '" + stateName + "'");
        }

        $scope.change_state_index = function (idx) {
            // console.debug("Change state to index " + idx);
            let state = $scope.stack_breadcrumb_state.at(idx);
            $scope.update_state(state, "fct change_state_index stack_breadcrumb_state index '" + idx + "'");
        }

        $scope.next_btn = function () {
            console.debug($scope.form);
            if ($scope.is_disable_next()) return;
            // console.debug("call next_btn");
            if (_.isUndefined($scope.state.next_id) || _.isEmpty($scope.state.next_id)) {
                console.error("Cannot find next state, next_id variable is undefined or empty.");
                console.debug($scope.state);
            } else {
                // special case for date and time
                if ($scope.state.type === "calendrier" || $scope.state.type === "time" || $scope.state.type === "temps_duree") {
                    $scope.state.selected_value = $(`#${$scope.state.model_field_name}`).data().date;
                    $scope.form[$scope.state.model_field_name] = $scope.state.selected_value;
                }

                // Fill URL parameters
                if (!_.isUndefined($scope.state.model_field_name_alias) && (!_.isUndefined($scope.state.selected_id))) {
                    $location.search($scope.state.model_field_name_alias, $scope.state.selected_id);
                } else if (!_.isUndefined($scope.state.model_field_name) && (!_.isUndefined($scope.state.selected_id))) {
                    $location.search($scope.state.model_field_name, $scope.state.selected_id);
                } else if (!_.isUndefined($scope.state.model_field_name_alias) && (!_.isUndefined($scope.state.selected_value))) {
                    $location.search($scope.state.model_field_name_alias, $scope.state.selected_value);
                } else if (!_.isUndefined($scope.state.model_field_name) && (!_.isUndefined($scope.state.selected_value))) {
                    $location.search($scope.state.model_field_name, $scope.state.selected_value);
                }
                // TODO ordering function call is bad, not optimal... Need refactoring
                $scope.fill_model_form_from_state($scope.state);
                let state = $scope.workflow[$scope.state.next_id];
                $scope.update_state(state, "next_btn '" + $scope.state.next_id + "'");
            }
        }

        $scope.previous_btn = function () {
            // console.debug("call previous_btn");
            $scope.error = "";
            if (!_.isEmpty($scope.stack_breadcrumb_state)) {
                $scope.change_breadcrumb_index($scope.stack_breadcrumb_state.length - 1);
                // $scope.stack_breadcrumb_state.pop();
                // if (_.isEmpty($scope.stack_breadcrumb_state)) {
                //     // Force return to init
                //     $scope.change_state_name(INIT_STATE);
                // } else {
                //     $scope.change_state_index(-1);
                // }
            } else {
                // Not suppose to call here, internal bug
                console.error("Bug, the user can press previous button when the stack_breadcrumb_state is not empty.");
                $scope.change_state_name(INIT_STATE);
            }
        }

        $scope.state_get_data = function () {
            // console.debug("call state_get_data");
            if (!_.isEmpty($scope.stack_breadcrumb_inner_state)) {
                // Show data from inner workflow
                let option = $scope.stack_breadcrumb_inner_state.at(-1);
                // $scope.update_inner_state(option);
                return option.sub_list;
            } else {
                return $scope.state.data;
            }
        }

        $scope.update_data_url = function (state) {
            // return true if need to stop execution
            let status = false;
            // Update data if need it
            if (_.isString(state.data) || state.force_update_data) {
                // If data is string, data is not initialize
                if (_.isEmpty(state.data_update_url)) {
                    $scope.error = "Cannot update database, missing state variable 'data_update_url'";
                    console.error($scope.error);
                } else {
                    let new_url = state.data_update_url;
                    if (!_.isEmpty(state.data_url_field)) {
                        // Search all variable from $scope.form to create new url for request
                        let array_param = [];
                        let str_array = state.data_url_field.split(";");
                        for (let i = 0; i < str_array.length; i++) {
                            let form_value = $scope.form[str_array[i]];
                            if (_.isUndefined(form_value)) {
                                $scope.error = "Cannot find form value of '" + str_array[i] + "'";
                                console.error($scope.error);
                            } else {
                                if (_.isObject(form_value)) {
                                    array_param.push(form_value.id)
                                } else {
                                    array_param.push(form_value);
                                }
                            }
                        }
                        if (_.isEmpty($scope.error)) {
                            // Replace all %s by array value
                            new_url = _.str.vsprintf(new_url, array_param);
                        }
                    }
                    // Send request
                    if (_.isEmpty($scope.error)) {
                        status = true;
                        requestSpecialURL($scope, state, new_url);
                    }
                }
            }
            return status;
        }

        $scope.update_state = function (state, debugFromInfo) {
            if (_.isUndefined(state)) {
                $scope.error = "Cannot find state from " + debugFromInfo;
                console.error($scope.error);
            } else {
                let status = $scope.update_data_url(state);
                if (!status) {
                    $scope._update_state(state);
                }
            }
        }

        $scope._update_state = function (state) {
            console.debug("call update_state");
            console.debug(state);
            $scope.error = "";
            // Update URL parameters
            if (state.id === INIT_STATE) {
                console.debug("Change URL " + PARAM_STATE_NAME + " to init.");
                $location.search(PARAM_STATE_NAME, null);
            } else {
                console.debug("Change URL " + PARAM_STATE_NAME + " to value " + state.id);
                $location.search(PARAM_STATE_NAME, state.id);
            }
            // Fill models form
            $scope.fill_model_form_from_state(state);
            if (!_.isUndefined($scope.autoCompleteJS)) {
                // Clean autoCompleteJS when change state
                try {
                    $scope.autoCompleteJS.unInit();
                } catch (e) {
                    // ignore, unInit already called
                }
                $scope.autoCompleteJS = undefined;
            }
            $scope.state = state;
            $scope.stack_breadcrumb_state.push(state);
            $scope.update_breadcrumb();
            $scope.in_multiple_inner_state = state.type === "choix_categorie_de_service" && !_.isUndefined(state.data);
            $scope.is_inner_state = state.type === "choix_categorie_de_service";
            $scope.is_next_wait_value = $scope.is_inner_state || state.type === "choix_membre"
            // Force delete stack inner state
            $scope.stack_breadcrumb_inner_state = [];
            $scope.actual_inner_state_name = "";
        }

        // Dynamique list
        $scope.click_statique = function (option) {
            console.debug("call click_statique");
            console.debug(option);

            $scope.state.next_id = option.id;

            // clean dynamique option
            $scope.state.selected_id = undefined;
            $scope.state.selected_obj_value = undefined;
            $scope.state.selected_value = undefined;

            // This is change by ng-model
            // $scope.state.next_id = $scope.state.next_id_data;
        }

        $scope.click_dynamique = function (option) {
            console.debug("call click_dynamique");
            console.debug(option);
            $scope.state.selected_id = option.id;
            $scope.state.selected_obj_value = option;
            $scope.state.selected_value = option.id;
            $scope.state.next_id = $scope.state.next_id_data;
        }

        // Inner state, temporary internal state
        $scope.click_inner_state_option = function (option) {
            console.debug("call click_inner_state_option");
            console.debug(option);
            if ($scope.is_inner_state) {
                if ($scope.in_multiple_inner_state) {
                    $scope.stack_breadcrumb_inner_state.push(option);
                    $scope.actual_inner_state_name = option.title;
                    $scope.update_inner_state(option);
                } else {
                    $scope.state.selected_value = option.title;
                    $scope.state.selected_id = option.id;
                    $scope.state.selected_tree_id = option.tree_id;
                }
            }
        }

        $scope.is_not_implemented = function (option) {
            return !Object.keys($scope.workflow).includes(option.id);
        }

        $scope.previous_inner_state_btn = function () {
            // console.debug("call previous_inner_state_btn");
            $scope.error = "";
            $scope.actual_inner_state_name = "";
            if (!_.isEmpty($scope.stack_breadcrumb_inner_state)) {
                $scope.stack_breadcrumb_inner_state.pop();
                if (!_.isEmpty($scope.stack_breadcrumb_inner_state)) {
                    let option = $scope.stack_breadcrumb_inner_state.at(-1);
                    if (!_.isUndefined(option)) {
                        $scope.actual_inner_state_name = option.title;
                        $scope.update_inner_state(option);
                    }
                }
            } else {
                console.error("Cannot previous inner state.");
            }
        }

        $scope.update_inner_state = function (option) {
            // console.debug("call update_inner_state");
            // validate if inner workflow continue, check if contains sub_list
            $scope.in_multiple_inner_state = !_.isUndefined(option.sub_list) && !_.isUndefined(option.sub_list.at(-1).sub_list);
        }

        // Breadcrumb
        $scope.change_breadcrumb_index = function (idx) {
            // console.debug("Change state to index " + idx);
            if (idx === 0) {
                // TODO maybe not, need to delete some variable
                $scope.init_controller();
            } else {
                let reverse_index = $scope.stack_breadcrumb_state.length - idx;
                for (let i = 0; i < reverse_index; i++) {
                    // Remove variable from inner state
                    let state = $scope.stack_breadcrumb_state.pop();
                    // if (!_.isUndefined(state.selected_id)) {
                    //     state.selected_id = undefined;
                    //     state.selected_value = undefined;
                    // }
                    // Remove parameters
                    if (!_.isUndefined(state.model_field_name_alias)) {
                        $location.search(state.model_field_name_alias, null);
                    } else if (!_.isUndefined(state.model_field_name)) {
                        $location.search(state.model_field_name, null);
                    }
                    // Remove form model
                    if (!_.isUndefined(state.model_field_name) && $scope.form.hasOwnProperty(state.model_field_name)) {
                        delete $scope.form[state.model_field_name];
                    }
                }
                // Remove variable from actual state
                // let state = $scope.stack_breadcrumb_state.at(-1);
                // if (!_.isUndefined(state) && !_.isUndefined(state.selected_id)) {
                //         state.selected_id = undefined;
                //         state.selected_value = undefined;
                //     }
                // - 1 to reverse 1 step
                $scope.change_state_index(idx - 1);
            }
        }

        $scope.update_breadcrumb = function () {
            console.debug("call update_breadcrumb");
            let lst_label = [];
            let global_label = "";
            for (let i = 0; i < $scope.stack_breadcrumb_state.length; i++) {
                let state = $scope.stack_breadcrumb_state[i];
                let lastState = $scope.stack_breadcrumb_state[i - 1];
                if (!_.isUndefined(state.breadcrumb_value) && !_.isEmpty(state.breadcrumb_value)) {
                    let lst_breadcrumb = state.breadcrumb_value.split(".");
                    let label = "";
                    let html_label = "";
                    for (let j = 0; j < lst_breadcrumb.length; j++) {
                        if (!$scope.state.breadcrumb_show_only_last_item && (!_.isEmpty(global_label) || !_.isEmpty(label))) {
                            label += " > "
                            html_label += " <i class='fa fa-chevron-right'/> "
                        }
                        let str_bread = lst_breadcrumb[j];
                        // Dynamique update string
                        if (!_.isEmpty(state.breadcrumb_field_value)) {
                            let array_param = [];
                            let str_array = state.breadcrumb_field_value.split(";");
                            for (let i = 0; i < str_array.length; i++) {
                                let form_value = $scope.form[str_array[i]];
                                if (_.isUndefined(form_value)) {
                                    $scope.error = "Cannot find form value of '" + str_array[i] + "'";
                                    console.error($scope.error);
                                } else {
                                    if (_.isObject(form_value)) {
                                        array_param.push(form_value.value)
                                    } else {
                                        array_param.push(form_value);
                                    }
                                }
                            }
                            if (_.isEmpty($scope.error)) {
                                // Replace all %s by array value
                                str_bread = _.str.vsprintf(str_bread, array_param);
                            }
                        }

                        label += str_bread;
                        html_label += str_bread;
                    }
                    global_label += label;
                    lst_label.push({"index": i, "text": label, "html": html_label})
                } else if (state.breadcrumb_show_only_last_item && !_.isUndefined(lastState) && !_.isUndefined(lastState.selected_value) && !_.isEmpty(lastState.selected_value)) {
                    let label = lastState.selected_value;
                    global_label += label;
                    lst_label.push({"index": i, "text": label, "html": label})
                }
            }
            // Special decoration
            if (!$scope.state.breadcrumb_show_only_last_item && !_.isEmpty(lst_label) && global_label.indexOf(" > ") === -1) {
                lst_label.at(-1).text += " > ..."
            }
            if ($scope.state.breadcrumb_show_only_last_item) {
                $scope.lst_label_breadcrumb = [lst_label.at(-1)];
            } else {
                $scope.lst_label_breadcrumb = lst_label;
            }
        }
    }
    ])

    let ParticiperForm = Widget.extend({
        start: function () {
        },
    });

    return ParticiperForm;
});